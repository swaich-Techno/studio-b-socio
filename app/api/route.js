import { clearSessionCookie, ensureEnvSuperAdmin, hashPassword, setSessionCookie, signSession, verifyPassword } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { json, requireBusinessAccess, requireUser } from "@/lib/api";
import { writeAudit } from "@/lib/audit";
import { trackEvent } from "@/lib/analytics";
import { processContactRequest } from "@/lib/contactRequest";
import { uploadBuffer } from "@/lib/cloudinary";
import { campaignPublicUrl, cataloguePublicUrl, generateQrDataUrl, productPublicUrl, tablePublicUrl } from "@/lib/qr";
import { getPlanLimits, mb, planDefaults } from "@/lib/plans";
import { slugify, uniqueSlug } from "@/lib/slugify";
import { BUSINESS_LOGIN_ROLES, DEFAULT_STAFF_PERMISSIONS, STAFF_LOGIN_ROLES, TEAM_LOGIN_ROLES, ROLES, canApproveContent, canManageFinance, canStaff } from "@/lib/permissions";
import Analytics from "@/models/Analytics";
import AuditLog from "@/models/AuditLog";
import Business from "@/models/Business";
import Campaign from "@/models/Campaign";
import ChatMessage from "@/models/ChatMessage";
import Expense from "@/models/Expense";
import Payment from "@/models/Payment";
import Product from "@/models/Product";
import Salary from "@/models/Salary";
import SupportTicket from "@/models/SupportTicket";
import TableQR from "@/models/TableQR";
import User from "@/models/User";

export const dynamic = "force-dynamic";

const analyticsEvents = new Set([
  "catalogue_view",
  "product_view",
  "ar_view",
  "whatsapp_click",
  "call_click",
  "location_click",
  "share_click",
  "table_scan",
  "campaign_view"
]);

function pathParts(request) {
  const url = new URL(request.url);
  const path = url.searchParams.get("path") || url.pathname.replace(/^\/api\/?/, "");
  return path.split("/").map((part) => decodeURIComponent(part)).filter(Boolean);
}

function notFound() {
  return json({ error: "API route not found." }, 404);
}

function toList(value) {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  return String(value || "").split(",").map((item) => item.trim()).filter(Boolean);
}

function sanitizeProduct(body) {
  const hasARModel = Boolean(body.modelGlbUrl || body.modelUsdzUrl || body.hasARModel);
  return {
    name: body.name,
    category: body.category || "General",
    price: Number(body.price || 0),
    discountPrice: Number(body.discountPrice || 0),
    description: body.description || "",
    shortDescription: body.shortDescription || "",
    imageUrl: body.imageUrl || "",
    galleryImages: toList(body.galleryImages),
    fileSizeMB: mb(body.fileSizeMB || 0),
    productType: body.productType || "STANDARD",
    fabricImageUrl: body.fabricImageUrl || "",
    stitchedPreviewImageUrl: body.stitchedPreviewImageUrl || "",
    stitchedPreviewNotes: body.stitchedPreviewNotes || "",
    supportsRotation: Boolean(body.modelGlbUrl || body.modelUsdzUrl || body.supportsRotation),
    modelGlbUrl: body.modelGlbUrl || "",
    modelUsdzUrl: body.modelUsdzUrl || "",
    modelFileSizeMB: mb(body.modelFileSizeMB || 0),
    hasARModel,
    offerText: body.offerText || "",
    tags: toList(body.tags),
    isAvailable: body.isAvailable !== false,
    stockStatus: body.stockStatus || "IN_STOCK",
    stockQuantity: Number(body.stockQuantity || 0),
    showStockToCustomers: body.showStockToCustomers !== false,
    publicationStatus: body.publicationStatus || "PENDING_APPROVAL",
    approvalStatus: body.approvalStatus || "PENDING_APPROVAL",
    arModelStatus: hasARModel ? (body.arModelStatus || "NEEDS_REVIEW") : "NO_MODEL",
    isFeatured: Boolean(body.isFeatured)
  };
}

async function eventCount(query, eventType) {
  return Analytics.countDocuments({ ...query, eventType });
}

function internalRole(role) {
  return [ROLES.SUPER_ADMIN, ROLES.TEAM_ADMIN, ROLES.FINANCE_MANAGER, ROLES.AR_MANAGER, ROLES.SUPPORT_STAFF].includes(role);
}

function csvCell(value) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function analyticsQueryForUser(user) {
  return internalRole(user.role) ? {} : { businessId: user.businessId };
}

function analyticsCsv(events) {
  const header = ["Date", "Business", "Product", "Campaign", "Table", "Event", "Device", "Referrer"];
  const rows = events.map((event) => [
    event.createdAt ? new Date(event.createdAt).toISOString() : "",
    event.businessId?.businessName || "",
    event.productId?.name || "",
    event.campaignId?.title || "",
    event.tableId?.tableNumber || "",
    event.eventType || "",
    event.device || "",
    event.referrer || ""
  ]);
  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}

function monthRange(monthValue) {
  const now = new Date();
  const [year, month] = String(monthValue || "").split("-").map(Number);
  const start = Number(year) && Number(month) ? new Date(year, month - 1, 1) : new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
  return { start, end, label: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}` };
}

function reportCsv(report) {
  const rows = [
    ["Metric", "Value"],
    ["Month", report.month],
    ["Total events", report.stats.totalEvents],
    ["Scans", report.stats.scans],
    ["WhatsApp leads", report.stats.whatsapp],
    ["Calls", report.stats.calls],
    ["Shares", report.stats.shares],
    ["AR views", report.stats.arViews],
    ["Top products", ""],
    ...report.topProducts.map((product) => [product.name, `${product.views || 0} views / ${product.whatsappClicks || 0} WhatsApp / ${product.arViews || 0} AR`])
  ];
  return rows.map((row) => row.map(csvCell).join(",")).join("\n");
}

async function handleLogin(request) {
  try {
    const { email, password, role, allowedRoles } = await request.json();
    const normalized = String(email || "").toLowerCase().trim();
    if (!normalized || !password || !role) return json({ error: "Email, password, and role are required." }, 400);
    await connectDB();
    const user = role === ROLES.SUPER_ADMIN
      ? await ensureEnvSuperAdmin(normalized)
      : role === "TEAM"
        ? await User.findOne({ email: normalized, role: { $in: Array.isArray(allowedRoles) && allowedRoles.length ? allowedRoles : TEAM_LOGIN_ROLES } })
        : role === ROLES.BUSINESS_OWNER
          ? await User.findOne({ email: normalized, role: { $in: Array.isArray(allowedRoles) && allowedRoles.length ? allowedRoles : BUSINESS_LOGIN_ROLES } })
          : role === ROLES.STAFF
            ? await User.findOne({ email: normalized, role: { $in: Array.isArray(allowedRoles) && allowedRoles.length ? allowedRoles : STAFF_LOGIN_ROLES } })
            : await User.findOne({ email: normalized, role });
    if (!user || !user.isActive) return json({ error: "Invalid credentials." }, 401);
    if (!(await verifyPassword(password, user.passwordHash))) return json({ error: "Invalid credentials." }, 401);
    if (role !== "TEAM" && role !== ROLES.BUSINESS_OWNER && role !== ROLES.STAFF && user.role !== role) return json({ error: "Use the correct login page for this account." }, 403);
    user.lastLoginAt = new Date();
    await user.save();
    if (user.role === ROLES.SUPER_ADMIN) {
      await writeAudit({ actor: user, action: "login", targetType: "User", targetId: String(user._id), description: "Super Admin logged in", request });
    }
    return setSessionCookie(json({ ok: true, role: user.role }), signSession(user));
  } catch (error) {
    return json({ error: error.message || "Login failed." }, 500);
  }
}

async function handleRegister(request) {
  try {
    const body = await request.json();
    for (const key of ["businessName", "ownerName", "email", "password", "whatsapp"]) {
      if (!body[key]) return json({ error: `${key} is required.` }, 400);
    }
    await connectDB();
    const email = String(body.email).toLowerCase().trim();
    if (await User.findOne({ email })) return json({ error: "An account with this email already exists." }, 409);
    let slug = slugify(body.businessName);
    if (await Business.exists({ slug })) slug = uniqueSlug(body.businessName, Date.now().toString());
    const business = await Business.create({
      businessName: body.businessName,
      ownerName: body.ownerName,
      email,
      phone: body.phone || "",
      whatsapp: body.whatsapp || "",
      category: body.category || "Local shops",
      slug,
      ...planDefaults("Starter"),
      subscriptionStatus: "TRIAL",
      usedStorageMB: 0,
      isActive: true
    });
    const user = await User.create({
      name: body.ownerName,
      email,
      passwordHash: await hashPassword(body.password),
      role: ROLES.BUSINESS_OWNER,
      businessId: business._id,
      isActive: true
    });
    await generateQrDataUrl(cataloguePublicUrl(business.slug));
    return setSessionCookie(json({ ok: true, businessSlug: business.slug }), signSession(user));
  } catch (error) {
    return json({ error: error.message || "Registration failed." }, 500);
  }
}

async function handleForgotPassword(request) {
  const body = await request.json().catch(() => ({}));
  const email = String(body.email || "").toLowerCase().trim();
  const requestedFrom = String(body.role || "login").trim();
  const genericMessage = "If this email exists, a password reset request has been sent to admin/support.";

  if (!email || !email.includes("@")) {
    return json({ error: "Enter a valid account email address." }, 400);
  }

  try {
    await connectDB();
    const user = await User.findOne({ email }).lean();
    await SupportTicket.create({
      businessId: user?.businessId,
      title: "Password reset request",
      description: `Password reset requested for ${email} from ${requestedFrom}. Verify the person before changing the password.`,
      priority: "HIGH",
      status: "OPEN",
      notes: user ? `Matched user role: ${user.role}. User id: ${user._id}.` : "No matching user was found. Keep response generic."
    });
  } catch {
    return json({ ok: true, message: genericMessage });
  }

  return json({ ok: true, message: genericMessage });
}

async function handleContactRequest(request) {
  const result = await processContactRequest(request);
  return json(result.body, result.status);
}

async function handleTrack(request) {
  try {
    const body = await request.json();
    if (!analyticsEvents.has(body.eventType)) return json({ error: "Invalid event type." }, 400);
    await connectDB();
    const business = body.businessSlug ? await Business.findOne({ slug: body.businessSlug }).lean() : null;
    if (!business) return json({ ok: true });
    const product = body.productSlug ? await Product.findOne({ businessId: business._id, slug: body.productSlug }).lean() : null;
    const table = body.tableNumber ? await TableQR.findOne({ businessId: business._id, tableNumber: body.tableNumber }).lean() : null;
    const campaign = body.campaignSlug ? await Campaign.findOne({ businessId: business._id, slug: body.campaignSlug }).lean() : null;
    await trackEvent({ businessId: business._id, productId: product?._id, tableId: table?._id, campaignId: campaign?._id, eventType: body.eventType, request });
    return json({ ok: true });
  } catch {
    return json({ ok: true });
  }
}

async function handleAnalytics(request) {
  const { user, error } = await requireUser([
    ROLES.SUPER_ADMIN,
    ROLES.TEAM_ADMIN,
    ROLES.FINANCE_MANAGER,
    ROLES.AR_MANAGER,
    ROLES.SUPPORT_STAFF,
    ROLES.BUSINESS_OWNER,
    ROLES.BUSINESS_MANAGER,
    ROLES.BUSINESS_STAFF,
    ROLES.STAFF
  ]);
  if (error) return error;
  if ([ROLES.BUSINESS_STAFF, ROLES.STAFF].includes(user.role) && !canStaff(user, "canViewLeads")) {
    return json({ error: "Lead analytics access is disabled for this staff account." }, 403);
  }

  await connectDB();
  const url = new URL(request.url);
  const query = analyticsQueryForUser(user);
  const events = await Analytics.find(query)
    .populate("businessId", "businessName slug")
    .populate("productId", "name slug price discountPrice")
    .populate("tableId", "tableNumber tableName")
    .populate("campaignId", "title slug")
    .sort({ createdAt: -1 })
    .limit(500)
    .lean();

  if (url.searchParams.get("format") === "csv") {
    return new Response(analyticsCsv(events), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": "attachment; filename=ar-design-studio-leads.csv"
      }
    });
  }

  const counts = Object.fromEntries([...analyticsEvents].map((eventType) => [eventType, 0]));
  for (const event of events) counts[event.eventType] = (counts[event.eventType] || 0) + 1;
  const leadEvents = events.filter((event) => ["whatsapp_click", "call_click", "share_click"].includes(event.eventType));
  const topProducts = await Product.find(internalRole(user.role) ? {} : { businessId: user.businessId })
    .select("name slug views arViews whatsappClicks callClicks shareClicks")
    .sort({ whatsappClicks: -1, views: -1 })
    .limit(10)
    .lean();

  return json({
    counts,
    stats: {
      totalEvents: events.length,
      scans: counts.catalogue_view + counts.product_view + counts.table_scan + counts.campaign_view,
      leads: leadEvents.length,
      whatsapp: counts.whatsapp_click,
      calls: counts.call_click,
      shares: counts.share_click,
      arViews: counts.ar_view
    },
    leadEvents,
    events,
    topProducts
  });
}

async function handleReports(request) {
  const { user, error } = await requireUser([
    ROLES.SUPER_ADMIN,
    ROLES.TEAM_ADMIN,
    ROLES.FINANCE_MANAGER,
    ROLES.AR_MANAGER,
    ROLES.SUPPORT_STAFF,
    ROLES.BUSINESS_OWNER,
    ROLES.BUSINESS_MANAGER
  ]);
  if (error) return error;
  await connectDB();
  const url = new URL(request.url);
  const { start, end, label } = monthRange(url.searchParams.get("month"));
  const baseQuery = { ...analyticsQueryForUser(user), createdAt: { $gte: start, $lt: end } };
  const [events, topProducts, businesses] = await Promise.all([
    Analytics.find(baseQuery)
      .populate("businessId", "businessName slug")
      .populate("productId", "name slug")
      .populate("tableId", "tableNumber tableName")
      .populate("campaignId", "title slug")
      .sort({ createdAt: -1 })
      .limit(1000)
      .lean(),
    Product.find(internalRole(user.role) ? {} : { businessId: user.businessId })
      .select("name views arViews whatsappClicks callClicks shareClicks")
      .sort({ whatsappClicks: -1, views: -1 })
      .limit(10)
      .lean(),
    internalRole(user.role) ? Business.find().select("businessName subscriptionPlan paymentStatus usedStorageMB storageLimitMB productLimit arProductLimit").lean() : []
  ]);
  const counts = Object.fromEntries([...analyticsEvents].map((eventType) => [eventType, 0]));
  for (const event of events) counts[event.eventType] = (counts[event.eventType] || 0) + 1;
  const report = {
    month: label,
    stats: {
      totalEvents: events.length,
      scans: counts.catalogue_view + counts.product_view + counts.table_scan + counts.campaign_view,
      whatsapp: counts.whatsapp_click,
      calls: counts.call_click,
      shares: counts.share_click,
      arViews: counts.ar_view
    },
    counts,
    events,
    topProducts,
    businesses
  };
  if (url.searchParams.get("format") === "csv") {
    return new Response(reportCsv(report), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename=ar-design-studio-report-${label}.csv`
      }
    });
  }
  return json(report);
}

async function handleBilling() {
  const { user, error } = await requireUser([ROLES.BUSINESS_OWNER, ROLES.BUSINESS_MANAGER, ROLES.SUPER_ADMIN, ROLES.TEAM_ADMIN, ROLES.FINANCE_MANAGER]);
  if (error) return error;
  await connectDB();
  const query = internalRole(user.role) ? {} : { businessId: user.businessId };
  const [business, payments] = await Promise.all([
    user.businessId ? Business.findById(user.businessId).lean() : null,
    Payment.find(query).populate("businessId", "businessName slug subscriptionPlan").sort({ createdAt: -1 }).limit(100).lean()
  ]);
  return json({ business, payments });
}

function serializeChatMessage(message) {
  return {
    ...message,
    _id: String(message._id),
    businessId: String(message.businessId),
    senderUserId: String(message.senderUserId)
  };
}

async function handleChat(method, request) {
  const { user, error } = await requireUser([
    ROLES.SUPER_ADMIN,
    ROLES.TEAM_ADMIN,
    ROLES.FINANCE_MANAGER,
    ROLES.AR_MANAGER,
    ROLES.SUPPORT_STAFF,
    ROLES.BUSINESS_OWNER,
    ROLES.BUSINESS_MANAGER
  ]);
  if (error) return error;

  await connectDB();
  const isInternal = internalRole(user.role);
  const viewerType = isInternal ? "INTERNAL" : "CLIENT";
  const url = new URL(request.url);
  const body = method === "POST" ? await request.json().catch(() => ({})) : {};
  const requestedBusinessId = method === "POST" ? body.businessId : url.searchParams.get("businessId");
  const businesses = isInternal
    ? await Business.find().select("businessName slug logoUrl isActive subscriptionPlan").sort({ businessName: 1 }).lean()
    : [];
  const businessId = isInternal ? (requestedBusinessId || businesses[0]?._id) : user.businessId;

  if (!businessId) {
    return json({ viewerType, businesses, business: null, messages: [] });
  }

  const business = await Business.findById(businessId).select("businessName slug logoUrl isActive subscriptionPlan").lean();
  if (!business) return json({ error: "Client business not found." }, 404);
  if (!isInternal && String(business._id) !== String(user.businessId)) return json({ error: "Business chat access denied." }, 403);

  if (method === "GET") {
    await ChatMessage.updateMany(
      { businessId: business._id, senderType: { $ne: viewerType } },
      viewerType === "INTERNAL" ? { isReadByTeam: true } : { isReadByClient: true }
    );
    const messages = await ChatMessage.find({ businessId: business._id }).sort({ createdAt: 1 }).limit(200).lean();
    return json({
      viewerType,
      businesses: businesses.map((item) => ({ ...item, _id: String(item._id) })),
      business: { ...business, _id: String(business._id) },
      messages: messages.map(serializeChatMessage)
    });
  }

  if (method === "POST") {
    const messageText = String(body.message || "").trim();
    if (!messageText) return json({ error: "Message is required." }, 400);
    const message = await ChatMessage.create({
      businessId: business._id,
      senderUserId: user._id,
      senderName: user.name,
      senderRole: user.role,
      senderType: viewerType,
      message: messageText,
      isReadByClient: viewerType === "CLIENT",
      isReadByTeam: viewerType === "INTERNAL"
    });
    return json({ message: serializeChatMessage(message.toObject()) }, 201);
  }

  return notFound();
}

async function handlePublicBusiness(businessSlug) {
  await connectDB();
  const business = await Business.findOne({ slug: businessSlug }).lean();
  if (!business) return json({ error: "Business not found." }, 404);
  if (!business.isActive) return json({ business: { businessName: business.businessName, logoUrl: business.logoUrl, slug: business.slug, isActive: false }, products: [] });
  const products = await Product.find({ businessId: business._id, isAvailable: true, publicationStatus: { $in: ["APPROVED", "PUBLISHED"] } })
    .select("name slug category price discountPrice shortDescription imageUrl fabricImageUrl stitchedPreviewImageUrl offerText isFeatured modelGlbUrl hasARModel supportsRotation stockStatus stockQuantity showStockToCustomers tags productType")
    .sort({ isFeatured: -1, createdAt: -1 })
    .lean();
  return json({
    business: {
      businessName: business.businessName,
      logoUrl: business.logoUrl,
      coverImageUrl: business.coverImageUrl,
      phone: business.phone,
      whatsapp: business.whatsapp,
      address: business.address,
      mapLink: business.mapLink,
      instagram: business.instagram,
      category: business.category,
      brandColor: business.brandColor,
      catalogueTemplate: business.catalogueTemplate,
      slug: business.slug,
      isActive: business.isActive
    },
    products
  });
}

async function handlePublicProduct(businessSlug, productSlug) {
  await connectDB();
  const business = await Business.findOne({ slug: businessSlug }).lean();
  if (!business || !business.isActive) return json({ error: "Product unavailable." }, 404);
  const product = await Product.findOne({ businessId: business._id, slug: productSlug, isAvailable: true, publicationStatus: { $in: ["APPROVED", "PUBLISHED"] } })
    .select("name slug category price discountPrice description shortDescription imageUrl galleryImages fabricImageUrl stitchedPreviewImageUrl stitchedPreviewNotes modelGlbUrl modelUsdzUrl offerText tags isAvailable hasARModel supportsRotation stockStatus stockQuantity showStockToCustomers productType")
    .lean();
  if (!product) return json({ error: "Product not found." }, 404);
  return json({
    business: {
      businessName: business.businessName,
      logoUrl: business.logoUrl,
      phone: business.phone,
      whatsapp: business.whatsapp,
      address: business.address,
      mapLink: business.mapLink,
      slug: business.slug
    },
    product
  });
}

async function handleDashboard() {
  const { user, error } = await requireUser([ROLES.SUPER_ADMIN, ROLES.TEAM_ADMIN, ROLES.FINANCE_MANAGER, ROLES.AR_MANAGER, ROLES.SUPPORT_STAFF, ROLES.BUSINESS_OWNER, ROLES.BUSINESS_MANAGER, ROLES.BUSINESS_STAFF, ROLES.STAFF]);
  if (error) return error;
  await connectDB();
  if ([ROLES.SUPER_ADMIN, ROLES.TEAM_ADMIN, ROLES.FINANCE_MANAGER, ROLES.AR_MANAGER, ROLES.SUPPORT_STAFF].includes(user.role)) {
    const [businesses, products, users, scans, recentBusinesses, recentAudit] = await Promise.all([
      Business.countDocuments(),
      Product.countDocuments(),
      User.countDocuments(),
      Analytics.countDocuments(),
      Business.find().sort({ createdAt: -1 }).limit(6).lean(),
      AuditLog.find().sort({ createdAt: -1 }).limit(8).lean()
    ]);
    return json({ role: user.role, stats: { businesses, products, users, scans }, recentBusinesses, recentAudit });
  }
  const businessId = user.businessId;
  const [business, products, arProducts, tables, campaigns, scans, whatsapp, arViews, recentProducts, topProducts] = await Promise.all([
    Business.findById(businessId).lean(),
    Product.countDocuments({ businessId }),
    Product.countDocuments({ businessId, hasARModel: true }),
    TableQR.countDocuments({ businessId }),
    Campaign.countDocuments({ businessId }),
    Analytics.countDocuments({ businessId }),
    eventCount({ businessId }, "whatsapp_click"),
    eventCount({ businessId }, "ar_view"),
    Product.find({ businessId }).sort({ createdAt: -1 }).limit(5).lean(),
    Product.find({ businessId }).sort({ views: -1 }).limit(5).lean()
  ]);
  return json({
    role: user.role,
    business,
    stats: { products, arProducts, tables, campaigns, scans, whatsapp, arViews, usedStorageMB: business?.usedStorageMB || 0, storageLimitMB: business?.storageLimitMB || 0, arProductLimit: business?.arProductLimit || 0 },
    recentProducts,
    topProducts
  });
}

async function handleBusinessProfile(method, request) {
  const roles = method === "GET"
    ? [ROLES.BUSINESS_OWNER, ROLES.BUSINESS_MANAGER, ROLES.BUSINESS_STAFF, ROLES.STAFF]
    : [ROLES.BUSINESS_OWNER, ROLES.BUSINESS_MANAGER];
  const { user, error } = await requireUser(roles);
  if (error) return error;
  await connectDB();
  if (method === "GET") return json({ business: await Business.findById(user.businessId).lean() });
  const body = await request.json();
  const allowed = ["businessName", "ownerName", "phone", "whatsapp", "logoUrl", "coverImageUrl", "address", "mapLink", "instagram", "category", "brandColor", "catalogueTemplate", "googleAnalyticsId", "metaPixelId"];
  const update = {};
  for (const key of allowed) if (body[key] !== undefined) update[key] = body[key];
  if (body.businessName) update.slug = slugify(body.businessName);
  return json({ business: await Business.findByIdAndUpdate(user.businessId, update, { new: true }).lean() });
}

async function handleProductImport(request) {
  const { user, error } = await requireUser([ROLES.BUSINESS_OWNER, ROLES.BUSINESS_MANAGER]);
  if (error) return error;
  const body = await request.json();
  const csv = String(body.csv || "");
  if (!csv.trim()) return json({ error: "CSV content is required." }, 400);
  await connectDB();
  const business = await Business.findById(user.businessId);
  if (!business) return json({ error: "Business not found." }, 404);

  const lines = csv.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const rows = lines.slice(lines[0]?.toLowerCase().includes("name") ? 1 : 0);
  const remaining = Number(business.productLimit || 0) - await Product.countDocuments({ businessId: business._id });
  if (rows.length > remaining) return json({ error: `This import has ${rows.length} products, but only ${remaining} product slots are available on this plan.` }, 403);
  const modelRows = rows.filter((row) => Boolean(row.split(",")[5]?.trim())).length;
  const arRemaining = Number(business.arProductLimit || 0) - await Product.countDocuments({ businessId: business._id, hasARModel: true });
  if (modelRows > arRemaining) return json({ error: `This import includes ${modelRows} AR models, but only ${Math.max(0, arRemaining)} AR slots are available. Remove model URLs or upgrade/add AR hosting.` }, 403);

  const created = [];
  for (const row of rows) {
    const [name, category = "General", price = "0", description = "", imageUrl = "", modelGlbUrl = ""] = row.split(",").map((item) => item.trim());
    if (!name) continue;
    const baseSlug = slugify(name);
    const exists = await Product.exists({ businessId: business._id, slug: baseSlug });
    const product = await Product.create({
      businessId: business._id,
      name,
      slug: exists ? uniqueSlug(name, `${Date.now()}-${created.length}`) : baseSlug,
      category,
      price: Number(price || 0),
      shortDescription: description,
      imageUrl,
      modelGlbUrl,
      hasARModel: Boolean(modelGlbUrl),
      supportsRotation: Boolean(modelGlbUrl),
      publicationStatus: "PENDING_APPROVAL",
      approvalStatus: "PENDING_APPROVAL",
      arModelStatus: modelGlbUrl ? "NEEDS_REVIEW" : "NO_MODEL"
    });
    created.push(product);
  }
  return json({ imported: created.length, products: created }, 201);
}

async function handleProducts(method, request, id) {
  if (!id && method === "GET") {
    const { user, error } = await requireUser([ROLES.SUPER_ADMIN, ROLES.TEAM_ADMIN, ROLES.AR_MANAGER, ROLES.SUPPORT_STAFF, ROLES.BUSINESS_OWNER, ROLES.BUSINESS_MANAGER, ROLES.BUSINESS_STAFF, ROLES.STAFF]);
    if (error) return error;
    await connectDB();
    const query = [ROLES.SUPER_ADMIN, ROLES.TEAM_ADMIN, ROLES.AR_MANAGER, ROLES.SUPPORT_STAFF].includes(user.role) ? {} : { businessId: user.businessId };
    const products = await Product.find(query).sort({ createdAt: -1 }).lean();
    const business = user.businessId ? await Business.findById(user.businessId).lean() : null;
    return json({ products: products.map((product) => ({ ...product, _id: String(product._id), businessId: String(product.businessId), publicUrl: business ? productPublicUrl(business.slug, product.slug) : "" })) });
  }
  if (!id && method === "POST") {
    const { user, error } = await requireUser([ROLES.BUSINESS_OWNER, ROLES.BUSINESS_MANAGER, ROLES.BUSINESS_STAFF, ROLES.STAFF]);
    if (error) return error;
    if ([ROLES.BUSINESS_STAFF, ROLES.STAFF].includes(user.role) && !canStaff(user, "canEditProducts")) return json({ error: "Staff product editing is disabled." }, 403);
    const body = await request.json();
    if (!body.name) return json({ error: "Product name is required." }, 400);
    await connectDB();
    const business = await Business.findById(user.businessId);
    if (!business || !business.isActive) return json({ error: "Business unavailable." }, 403);
    if (await Product.countDocuments({ businessId: business._id }) >= business.productLimit) return json({ error: "Product limit reached for this plan." }, 403);
    const productData = sanitizeProduct(body);
    if (productData.hasARModel) {
      const arCount = await Product.countDocuments({ businessId: business._id, hasARModel: true });
      if (arCount >= Number(business.arProductLimit || 0)) return json({ error: `${business.subscriptionPlan} includes ${business.arProductLimit} AR/3D products. Upgrade or buy an AR add-on to add this model.` }, 403);
    }
    const baseSlug = slugify(body.name);
    const exists = await Product.exists({ businessId: business._id, slug: baseSlug });
    const product = await Product.create({ ...productData, businessId: business._id, slug: exists ? uniqueSlug(body.name, Date.now().toString()) : baseSlug });
    return json({ product: { ...product.toObject(), publicUrl: productPublicUrl(business.slug, product.slug) } }, 201);
  }
  if (id && method === "GET") {
    const { user, error } = await requireUser([ROLES.SUPER_ADMIN, ROLES.TEAM_ADMIN, ROLES.AR_MANAGER, ROLES.SUPPORT_STAFF, ROLES.BUSINESS_OWNER, ROLES.BUSINESS_MANAGER, ROLES.BUSINESS_STAFF, ROLES.STAFF]);
    if (error) return error;
    await connectDB();
    const product = await Product.findById(id).lean();
    if (!product) return json({ error: "Product not found." }, 404);
    const denied = requireBusinessAccess(user, product.businessId);
    return denied || json({ product });
  }
  if (id && method === "PATCH") {
    const { user, error } = await requireUser([ROLES.BUSINESS_OWNER, ROLES.BUSINESS_MANAGER, ROLES.BUSINESS_STAFF, ROLES.STAFF]);
    if (error) return error;
    const body = await request.json();
    await connectDB();
    const product = await Product.findById(id);
    if (!product) return json({ error: "Product not found." }, 404);
    const denied = requireBusinessAccess(user, product.businessId);
    if (denied) return denied;
    if ([ROLES.BUSINESS_STAFF, ROLES.STAFF].includes(user.role)) {
      if (body.isAvailable !== undefined && canStaff(user, "canEditAvailability")) product.isAvailable = Boolean(body.isAvailable);
      if (body.price !== undefined && canStaff(user, "canEditProducts")) product.price = Number(body.price || 0);
    } else {
      const wasARProduct = Boolean(product.hasARModel);
      const nextModelGlbUrl = body.modelGlbUrl !== undefined ? body.modelGlbUrl : product.modelGlbUrl;
      const nextModelUsdzUrl = body.modelUsdzUrl !== undefined ? body.modelUsdzUrl : product.modelUsdzUrl;
      const nextHasARModel = Boolean(nextModelGlbUrl || nextModelUsdzUrl || body.hasARModel);
      if (!wasARProduct && nextHasARModel) {
        const business = await Business.findById(product.businessId);
        const arCount = await Product.countDocuments({ businessId: product.businessId, hasARModel: true });
        if (arCount >= Number(business?.arProductLimit || 0)) return json({ error: `${business?.subscriptionPlan || "Starter"} includes ${business?.arProductLimit || 0} AR/3D products. Upgrade or buy an AR add-on to add this model.` }, 403);
      }
      for (const field of ["name", "category", "description", "shortDescription", "imageUrl", "fabricImageUrl", "stitchedPreviewImageUrl", "stitchedPreviewNotes", "productType", "modelGlbUrl", "modelUsdzUrl", "offerText", "stockStatus"]) if (body[field] !== undefined) product[field] = body[field];
      if (body.price !== undefined) product.price = Number(body.price || 0);
      if (body.discountPrice !== undefined) product.discountPrice = Number(body.discountPrice || 0);
      if (body.fileSizeMB !== undefined) product.fileSizeMB = mb(body.fileSizeMB || 0);
      if (body.modelFileSizeMB !== undefined) product.modelFileSizeMB = mb(body.modelFileSizeMB || 0);
      if (body.stockQuantity !== undefined) product.stockQuantity = Number(body.stockQuantity || 0);
      if (body.showStockToCustomers !== undefined) product.showStockToCustomers = Boolean(body.showStockToCustomers);
      if (body.supportsRotation !== undefined) product.supportsRotation = Boolean(body.supportsRotation);
      if (body.isAvailable !== undefined) product.isAvailable = Boolean(body.isAvailable);
      if (body.isFeatured !== undefined) product.isFeatured = Boolean(body.isFeatured);
      product.hasARModel = nextHasARModel;
      product.supportsRotation = Boolean(product.modelGlbUrl || product.modelUsdzUrl || product.supportsRotation);
      if (body.galleryImages !== undefined) product.galleryImages = toList(body.galleryImages);
      if (body.tags !== undefined) product.tags = toList(body.tags);
    }
    await product.save();
    return json({ product });
  }
  if (id && method === "DELETE") {
    const { user, error } = await requireUser([ROLES.SUPER_ADMIN, ROLES.TEAM_ADMIN, ROLES.BUSINESS_OWNER, ROLES.BUSINESS_MANAGER]);
    if (error) return error;
    await connectDB();
    const product = await Product.findById(id);
    if (!product) return json({ error: "Product not found." }, 404);
    const denied = requireBusinessAccess(user, product.businessId);
    if (denied) return denied;
    await product.deleteOne();
    if ([ROLES.SUPER_ADMIN, ROLES.TEAM_ADMIN].includes(user.role)) await writeAudit({ actor: user, action: "product deleted", targetType: "Product", targetId: id, description: product.name, request });
    return json({ ok: true });
  }
  return notFound();
}

async function handleTables(method, request, id) {
  if (!id && method === "GET") {
    const { user, error } = await requireUser([ROLES.BUSINESS_OWNER, ROLES.BUSINESS_MANAGER, ROLES.BUSINESS_STAFF, ROLES.STAFF]);
    if (error) return error;
    await connectDB();
    return json({ tables: await TableQR.find({ businessId: user.businessId }).sort({ tableNumber: 1 }).lean() });
  }
  if (!id && method === "POST") {
    const { user, error } = await requireUser([ROLES.BUSINESS_OWNER, ROLES.BUSINESS_MANAGER]);
    if (error) return error;
    const body = await request.json();
    if (!body.tableNumber) return json({ error: "Table number is required." }, 400);
    await connectDB();
    const business = await Business.findById(user.businessId);
    const publicUrl = tablePublicUrl(business.slug, body.tableNumber);
    const table = await TableQR.findOneAndUpdate(
      { businessId: business._id, tableNumber: String(body.tableNumber) },
      { tableName: body.tableName || "", publicUrl, qrCodeDataUrl: await generateQrDataUrl(publicUrl), isActive: body.isActive !== false },
      { upsert: true, new: true }
    );
    return json({ table }, 201);
  }
  if (id && (method === "PATCH" || method === "DELETE")) {
    const { user, error } = await requireUser([ROLES.BUSINESS_OWNER, ROLES.BUSINESS_MANAGER]);
    if (error) return error;
    await connectDB();
    const table = await TableQR.findById(id);
    if (!table) return json({ error: "Table QR not found." }, 404);
    const denied = requireBusinessAccess(user, table.businessId);
    if (denied) return denied;
    if (method === "DELETE") {
      await table.deleteOne();
      return json({ ok: true });
    }
    const body = await request.json();
    if (body.tableName !== undefined) table.tableName = body.tableName;
    if (body.isActive !== undefined) table.isActive = Boolean(body.isActive);
    await table.save();
    return json({ table });
  }
  return notFound();
}

async function handleCampaigns(method, request, id) {
  if (!id && method === "GET") {
    const { user, error } = await requireUser([ROLES.BUSINESS_OWNER, ROLES.BUSINESS_MANAGER, ROLES.BUSINESS_STAFF, ROLES.STAFF]);
    if (error) return error;
    await connectDB();
    const business = await Business.findById(user.businessId).lean();
    const campaigns = await Campaign.find({ businessId: user.businessId }).sort({ createdAt: -1 }).lean();
    return json({ campaigns: campaigns.map((campaign) => ({ ...campaign, publicUrl: business ? campaignPublicUrl(business.slug, campaign.slug) : "" })) });
  }
  if (!id && method === "POST") {
    const { user, error } = await requireUser([ROLES.BUSINESS_OWNER, ROLES.BUSINESS_MANAGER]);
    if (error) return error;
    const body = await request.json();
    if (!body.title) return json({ error: "Campaign title is required." }, 400);
    await connectDB();
    const business = await Business.findById(user.businessId);
    const baseSlug = slugify(body.title);
    const exists = await Campaign.exists({ businessId: business._id, slug: baseSlug });
    const slug = exists ? uniqueSlug(body.title, Date.now().toString()) : baseSlug;
    const publicUrl = campaignPublicUrl(business.slug, slug);
    const campaign = await Campaign.create({
      businessId: business._id,
      title: body.title,
      slug,
      description: body.description || "",
      offerText: body.offerText || "",
      bannerImageUrl: body.bannerImageUrl || "",
      selectedProductIds: body.selectedProductIds || [],
      startDate: body.startDate || undefined,
      endDate: body.endDate || undefined,
      qrCodeDataUrl: await generateQrDataUrl(publicUrl),
      isActive: body.isActive !== false
    });
    return json({ campaign, publicUrl }, 201);
  }
  if (id && (method === "PATCH" || method === "DELETE")) {
    const { user, error } = await requireUser([ROLES.BUSINESS_OWNER, ROLES.BUSINESS_MANAGER]);
    if (error) return error;
    await connectDB();
    const campaign = await Campaign.findById(id);
    if (!campaign) return json({ error: "Campaign not found." }, 404);
    const denied = requireBusinessAccess(user, campaign.businessId);
    if (denied) return denied;
    if (method === "DELETE") {
      await campaign.deleteOne();
      return json({ ok: true });
    }
    const body = await request.json();
    for (const field of ["title", "description", "offerText", "bannerImageUrl", "startDate", "endDate", "isActive"]) if (body[field] !== undefined) campaign[field] = body[field];
    if (body.selectedProductIds !== undefined) campaign.selectedProductIds = body.selectedProductIds;
    await campaign.save();
    return json({ campaign });
  }
  return notFound();
}

async function handleStaff(method, request, id) {
  if (!id && method === "GET") {
    const { user, error } = await requireUser([ROLES.SUPER_ADMIN, ROLES.BUSINESS_OWNER]);
    if (error) return error;
    await connectDB();
    const query = [ROLES.SUPER_ADMIN, ROLES.TEAM_ADMIN].includes(user.role) ? { role: { $in: [ROLES.BUSINESS_MANAGER, ROLES.BUSINESS_STAFF, ROLES.STAFF] } } : { role: { $in: [ROLES.BUSINESS_MANAGER, ROLES.BUSINESS_STAFF, ROLES.STAFF] }, businessId: user.businessId };
    return json({ staff: await User.find(query).select("-passwordHash").sort({ createdAt: -1 }).lean() });
  }
  if (!id && method === "POST") {
    const { user, error } = await requireUser([ROLES.SUPER_ADMIN, ROLES.TEAM_ADMIN, ROLES.BUSINESS_OWNER, ROLES.BUSINESS_MANAGER]);
    if (error) return error;
    const body = await request.json();
    if (!body.name || !body.email || !body.password) return json({ error: "Name, email, and password are required." }, 400);
    await connectDB();
    const businessId = [ROLES.SUPER_ADMIN, ROLES.TEAM_ADMIN].includes(user.role) ? body.businessId : user.businessId;
    if (!businessId) return json({ error: "Business is required." }, 400);
    const business = await Business.findById(businessId);
    if (!business) return json({ error: "Business not found." }, 404);
    const count = await User.countDocuments({ businessId, role: { $in: [ROLES.BUSINESS_MANAGER, ROLES.BUSINESS_STAFF, ROLES.STAFF] } });
    if (count >= business.staffLimit && ![ROLES.SUPER_ADMIN, ROLES.TEAM_ADMIN].includes(user.role)) return json({ error: "Staff limit reached for this plan." }, 403);
    const email = String(body.email).toLowerCase().trim();
    if (await User.exists({ email })) return json({ error: "Email already exists." }, 409);
    const staffRole = [ROLES.BUSINESS_MANAGER, ROLES.BUSINESS_STAFF, ROLES.STAFF].includes(body.role) ? body.role : ROLES.BUSINESS_STAFF;
    const staff = await User.create({ name: body.name, email, passwordHash: await hashPassword(body.password), role: staffRole, businessId, permissions: { ...DEFAULT_STAFF_PERMISSIONS, ...(body.permissions || {}) }, isActive: true });
    const safe = staff.toObject();
    delete safe.passwordHash;
    return json({ staff: safe }, 201);
  }
  if (id && method === "PATCH") {
    const { user, error } = await requireUser([ROLES.SUPER_ADMIN, ROLES.TEAM_ADMIN, ROLES.BUSINESS_OWNER, ROLES.BUSINESS_MANAGER]);
    if (error) return error;
    const body = await request.json();
    await connectDB();
    const staff = await User.findById(id);
    if (!staff || ![ROLES.BUSINESS_MANAGER, ROLES.BUSINESS_STAFF, ROLES.STAFF].includes(staff.role)) return json({ error: "Staff not found." }, 404);
    const denied = requireBusinessAccess(user, staff.businessId);
    if (denied) return denied;
    if (body.name !== undefined) staff.name = body.name;
    if (body.isActive !== undefined) staff.isActive = Boolean(body.isActive);
    if (body.permissions !== undefined) staff.permissions = { ...staff.permissions, ...body.permissions };
    await staff.save();
    const safe = staff.toObject();
    delete safe.passwordHash;
    return json({ staff: safe });
  }
  return notFound();
}

async function handleQrs() {
  const { user, error } = await requireUser([ROLES.BUSINESS_OWNER, ROLES.BUSINESS_MANAGER, ROLES.BUSINESS_STAFF, ROLES.STAFF]);
  if (error) return error;
  await connectDB();
  const business = await Business.findById(user.businessId).lean();
  const [products, tables, campaigns] = await Promise.all([
    Product.find({ businessId: user.businessId }).sort({ createdAt: -1 }).lean(),
    TableQR.find({ businessId: user.businessId }).sort({ tableNumber: 1 }).lean(),
    Campaign.find({ businessId: user.businessId }).sort({ createdAt: -1 }).lean()
  ]);
  const catalogueUrl = cataloguePublicUrl(business.slug);
  return json({
    catalogue: { label: `${business.businessName} catalogue`, publicUrl: catalogueUrl, qrCodeDataUrl: await generateQrDataUrl(catalogueUrl) },
    products: await Promise.all(products.map(async (product) => {
      const publicUrl = productPublicUrl(business.slug, product.slug);
      return { id: product._id, label: product.name, publicUrl, qrCodeDataUrl: await generateQrDataUrl(publicUrl) };
    })),
    tables: tables.map((table) => ({ id: table._id, label: table.tableName || `Table ${table.tableNumber}`, publicUrl: table.publicUrl || tablePublicUrl(business.slug, table.tableNumber), qrCodeDataUrl: table.qrCodeDataUrl })),
    campaigns: campaigns.map((campaign) => ({ id: campaign._id, label: campaign.title, publicUrl: campaignPublicUrl(business.slug, campaign.slug), qrCodeDataUrl: campaign.qrCodeDataUrl }))
  });
}

async function handleUpload(request) {
  const { user, error } = await requireUser([ROLES.SUPER_ADMIN, ROLES.TEAM_ADMIN, ROLES.AR_MANAGER, ROLES.SUPPORT_STAFF, ROLES.BUSINESS_OWNER, ROLES.BUSINESS_MANAGER, ROLES.BUSINESS_STAFF, ROLES.STAFF]);
  if (error) return error;
  const form = await request.formData();
  const file = form.get("file");
  const folder = form.get("folder") || "ar-design-studio";
  const uploadType = String(form.get("uploadType") || "image");
  const productId = form.get("productId");
  if (!file) return json({ error: "File is required." }, 400);
  await connectDB();
  const business = user.businessId ? await Business.findById(user.businessId) : null;
  const sizeMB = mb(Number(file.size || 0) / (1024 * 1024));
  const limits = getPlanLimits(business?.subscriptionPlan);
  if (business) {
    const remainingStorage = Math.max(0, Number(business.storageLimitMB || 0) - Number(business.usedStorageMB || 0));
    if (sizeMB > remainingStorage) return json({ error: `Storage limit reached. ${business.subscriptionPlan} has ${business.storageLimitMB} MB storage. Upgrade or add storage to upload more files.` }, 403);
  }
  if (uploadType === "image" && sizeMB > limits.imageMaxSizeMB) return json({ error: `${business?.subscriptionPlan || "Starter"} image upload limit is ${limits.imageMaxSizeMB} MB. Compress the image or upgrade the plan.` }, 413);
  if (uploadType === "model") {
    const lower = String(file.name || "").toLowerCase();
    if (!lower.endsWith(".glb") && !lower.endsWith(".usdz")) return json({ error: "Only .glb and .usdz model files are allowed." }, 400);
    if (!business) return json({ error: "Model uploads must be linked to a business plan." }, 403);
    const currentProduct = productId ? await Product.findOne({ _id: productId, businessId: business._id }).select("hasARModel") : null;
    const arCount = await Product.countDocuments({ businessId: business._id, hasARModel: true });
    if (arCount >= Number(business.arProductLimit || 0) && !currentProduct?.hasARModel) return json({ error: `${business.subscriptionPlan} includes ${business.arProductLimit} AR/3D products. Upgrade or buy an AR add-on to upload more models.` }, 403);
  }
  let result;
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    result = await uploadBuffer(buffer, { folder: String(folder), resourceType: uploadType === "model" ? "raw" : "image", fileName: String(file.name || "upload") });
  } catch (error) {
    return json({ error: error.message || "Upload failed." }, 500);
  }
  if (business) {
    business.usedStorageMB = mb(Number(business.usedStorageMB || 0) + sizeMB);
    await business.save();
  }
  return json({ url: result.secureUrl, publicId: result.publicId, fileSizeMB: sizeMB, uploadType });
}

async function handleFinance(method, request) {
  const { user, error } = await requireUser([ROLES.SUPER_ADMIN, ROLES.TEAM_ADMIN, ROLES.FINANCE_MANAGER]);
  if (error) return error;
  if (!canManageFinance(user)) return json({ error: "Finance access denied." }, 403);
  await connectDB();
  if (method === "GET") {
    const [payments, expenses, businesses] = await Promise.all([
      Payment.find().populate("businessId", "businessName slug subscriptionPlan").sort({ createdAt: -1 }).limit(100).lean(),
      Expense.find().populate("businessId", "businessName slug").sort({ expenseDate: -1 }).limit(100).lean(),
      Business.find().select("businessName subscriptionPlan monthlyFee setupFee outstandingAmount paymentStatus nextBillingDate").lean()
    ]);
    const paid = payments.filter((payment) => payment.status === "PAID").reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
    const outstanding = payments.filter((payment) => ["PENDING", "OVERDUE"].includes(payment.status)).reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
    const expensesTotal = expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
    const monthlyRecurringRevenue = businesses.reduce((sum, business) => sum + Number(business.monthlyFee || 0), 0);
    const setupFees = payments.filter((payment) => payment.type === "SETUP" && payment.status === "PAID").reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
    return json({
      payments,
      expenses,
      stats: {
        monthlyRecurringRevenue,
        setupFees,
        paymentsReceived: paid,
        outstanding,
        expensesTotal,
        netProfitEstimate: paid - expensesTotal,
        overdueClients: payments.filter((payment) => payment.status === "OVERDUE").length,
        upcomingRenewals: businesses.filter((business) => business.nextBillingDate).length
      }
    });
  }
  const body = await request.json();
  if (body.recordType === "expense") {
    const expense = await Expense.create({
      title: body.title,
      category: body.category || "OTHER",
      businessId: body.businessId || undefined,
      amount: Number(body.amount || 0),
      expenseDate: body.expenseDate || new Date(),
      notes: body.notes || "",
      createdBy: user._id
    });
    return json({ expense }, 201);
  }
  const payment = await Payment.create({
    businessId: body.businessId || undefined,
    invoiceNumber: body.invoiceNumber || `INV-${Date.now()}`,
    description: body.description || "",
    type: body.type || "MONTHLY",
    amount: Number(body.amount || 0),
    status: body.status || "PENDING",
    dueDate: body.dueDate || undefined,
    paidAt: body.status === "PAID" ? (body.paidAt || new Date()) : undefined,
    paymentMethod: body.paymentMethod || "",
    notes: body.notes || "",
    createdBy: user._id
  });
  if (payment.businessId) {
    await Business.findByIdAndUpdate(payment.businessId, {
      paymentStatus: payment.status,
      $inc: { outstandingAmount: payment.status === "PAID" ? 0 : payment.amount }
    });
  }
  return json({ payment }, 201);
}

async function handleSalaries(method, request) {
  const { user, error } = await requireUser([ROLES.SUPER_ADMIN, ROLES.TEAM_ADMIN, ROLES.FINANCE_MANAGER]);
  if (error) return error;
  await connectDB();
  if (method === "GET") {
    const [salaries, team] = await Promise.all([
      Salary.find().populate("userId", "name email role").sort({ createdAt: -1 }).limit(100).lean(),
      User.find({ role: { $in: [ROLES.TEAM_ADMIN, ROLES.FINANCE_MANAGER, ROLES.AR_MANAGER, ROLES.SUPPORT_STAFF] } }).select("-passwordHash").lean()
    ]);
    const pending = salaries.filter((item) => item.status !== "PAID").reduce((sum, item) => sum + Number(item.netSalary || 0), 0);
    const paid = salaries.filter((item) => item.status === "PAID").reduce((sum, item) => sum + Number(item.netSalary || 0), 0);
    return json({ salaries, team, stats: { pending, paid, count: salaries.length } });
  }
  const body = await request.json();
  const salary = await Salary.create({
    userId: body.userId || undefined,
    employeeName: body.employeeName,
    role: body.role || "",
    month: body.month,
    baseSalary: Number(body.baseSalary || 0),
    bonus: Number(body.bonus || 0),
    deductions: Number(body.deductions || 0),
    status: body.status || "PENDING",
    paymentDate: body.status === "PAID" ? (body.paymentDate || new Date()) : undefined,
    notes: body.notes || "",
    createdBy: user._id
  });
  return json({ salary }, 201);
}

async function handleTeam(method, request, id) {
  const { user, error } = await requireUser([ROLES.SUPER_ADMIN, ROLES.TEAM_ADMIN]);
  if (error) return error;
  await connectDB();
  if (method === "GET") {
    const team = await User.find({ role: { $in: [ROLES.TEAM_ADMIN, ROLES.FINANCE_MANAGER, ROLES.AR_MANAGER, ROLES.SUPPORT_STAFF] } }).select("-passwordHash").sort({ createdAt: -1 }).lean();
    return json({ team });
  }
  if (method === "POST") {
    const body = await request.json();
    const allowedRoles = [ROLES.TEAM_ADMIN, ROLES.FINANCE_MANAGER, ROLES.AR_MANAGER, ROLES.SUPPORT_STAFF];
    if (!body.name || !body.email || !body.password || !allowedRoles.includes(body.role)) return json({ error: "Name, email, password, and valid internal role are required." }, 400);
    const email = String(body.email).toLowerCase().trim();
    if (await User.exists({ email })) return json({ error: "Email already exists." }, 409);
    const member = await User.create({
      name: body.name,
      email,
      passwordHash: await hashPassword(body.password),
      role: body.role,
      department: body.department || "",
      salaryAmount: Number(body.salaryAmount || 0),
      joiningDate: body.joiningDate || undefined,
      isActive: true
    });
    await writeAudit({ actor: user, action: "team user created", targetType: "User", targetId: String(member._id), description: `${member.name} - ${member.role}`, request });
    const safe = member.toObject();
    delete safe.passwordHash;
    return json({ member: safe }, 201);
  }
  if (id && method === "PATCH") {
    const body = await request.json();
    const update = {};
    for (const field of ["name", "department", "role", "salaryAmount", "isActive"]) if (body[field] !== undefined) update[field] = body[field];
    const member = await User.findByIdAndUpdate(id, update, { new: true }).select("-passwordHash");
    return json({ member });
  }
  return notFound();
}

async function handleApprovals(method, request) {
  const { user, error } = await requireUser([ROLES.SUPER_ADMIN, ROLES.TEAM_ADMIN, ROLES.AR_MANAGER]);
  if (error) return error;
  if (!canApproveContent(user)) return json({ error: "Approval access denied." }, 403);
  await connectDB();
  if (method === "GET") {
    const [products, campaigns] = await Promise.all([
      Product.find({ $or: [{ publicationStatus: { $ne: "PUBLISHED" } }, { arModelStatus: { $in: ["NEEDS_REVIEW", "MODEL_UPLOADED", "OPTIMIZATION_REQUIRED"] } }] }).populate("businessId", "businessName slug").sort({ createdAt: -1 }).limit(100).lean(),
      Campaign.find({ status: { $in: ["DRAFT", "PENDING_APPROVAL", "APPROVED"] } }).populate("businessId", "businessName slug").sort({ createdAt: -1 }).limit(100).lean()
    ]);
    return json({ products, campaigns });
  }
  const body = await request.json();
  if (body.targetType === "Product") {
    const product = await Product.findById(body.targetId);
    if (!product) return json({ error: "Product not found." }, 404);
    if (body.action === "approve") {
      product.approvalStatus = "APPROVED";
      product.publicationStatus = "PUBLISHED";
      product.arModelStatus = product.hasARModel ? "APPROVED" : "NO_MODEL";
      product.approvedBy = user._id;
      product.approvedAt = new Date();
    } else if (body.action === "reject") {
      product.approvalStatus = "REJECTED";
      product.publicationStatus = "REJECTED";
      product.arModelStatus = product.hasARModel ? "REJECTED" : "NO_MODEL";
    } else if (body.action === "hide") {
      product.publicationStatus = "HIDDEN";
    } else if (body.action === "optimize") {
      product.arModelStatus = "OPTIMIZATION_REQUIRED";
    }
    product.approvalNotes = body.notes || product.approvalNotes;
    await product.save();
    return json({ product });
  }
  if (body.targetType === "Campaign") {
    const campaign = await Campaign.findById(body.targetId);
    if (!campaign) return json({ error: "Campaign not found." }, 404);
    if (body.action === "approve") {
      campaign.status = "LIVE";
      campaign.approvedBy = user._id;
      campaign.approvedAt = new Date();
    } else if (body.action === "reject") {
      campaign.status = "REJECTED";
    } else if (body.action === "expire") {
      campaign.status = "EXPIRED";
    }
    campaign.approvalNotes = body.notes || campaign.approvalNotes;
    await campaign.save();
    return json({ campaign });
  }
  return json({ error: "Unsupported approval target." }, 400);
}

async function handleSupport(method, request, id) {
  const { user, error } = await requireUser([ROLES.SUPER_ADMIN, ROLES.TEAM_ADMIN, ROLES.SUPPORT_STAFF, ROLES.AR_MANAGER, ROLES.BUSINESS_OWNER, ROLES.BUSINESS_MANAGER]);
  if (error) return error;
  await connectDB();
  if (method === "GET") {
    const query = [ROLES.BUSINESS_OWNER, ROLES.BUSINESS_MANAGER].includes(user.role) ? { businessId: user.businessId } : {};
    const tickets = await SupportTicket.find(query).populate("businessId", "businessName slug").populate("assignedTo", "name role").sort({ createdAt: -1 }).limit(100).lean();
    return json({ tickets });
  }
  if (method === "POST") {
    const body = await request.json();
    const ticket = await SupportTicket.create({
      businessId: body.businessId || user.businessId || undefined,
      title: body.title,
      description: body.description || "",
      priority: body.priority || "MEDIUM",
      status: body.status || "OPEN",
      assignedTo: body.assignedTo || undefined,
      createdBy: user._id,
      notes: body.notes || ""
    });
    return json({ ticket }, 201);
  }
  if (id && method === "PATCH") {
    const body = await request.json();
    const update = {};
    for (const field of ["status", "priority", "assignedTo", "notes"]) if (body[field] !== undefined) update[field] = body[field];
    const ticket = await SupportTicket.findByIdAndUpdate(id, update, { new: true });
    return json({ ticket });
  }
  return notFound();
}

async function handleAdminBusinesses(method, request, id) {
  if (!id && method === "GET") {
    const { error } = await requireUser([ROLES.SUPER_ADMIN]);
    if (error) return error;
    await connectDB();
    const businesses = await Business.find().sort({ createdAt: -1 }).lean();
    const usage = await Product.aggregate([{ $group: { _id: "$businessId", productCount: { $sum: 1 }, arProductCount: { $sum: { $cond: ["$hasARModel", 1, 0] } } } }]);
    const usageMap = new Map(usage.map((item) => [String(item._id), item]));
    return json({ businesses: businesses.map((business) => ({ ...business, productCount: usageMap.get(String(business._id))?.productCount || 0, arProductCount: usageMap.get(String(business._id))?.arProductCount || 0 })) });
  }
  if (!id && method === "POST") {
    const { user, error } = await requireUser([ROLES.SUPER_ADMIN]);
    if (error) return error;
    const body = await request.json();
    if (!body.businessName || !body.ownerName || !body.email || !body.password) return json({ error: "Business name, owner, email, and password are required." }, 400);
    await connectDB();
    const email = String(body.email).toLowerCase().trim();
    if (await User.exists({ email })) return json({ error: "Owner email already exists." }, 409);
    let slug = slugify(body.businessName);
    if (await Business.exists({ slug })) slug = uniqueSlug(body.businessName, Date.now().toString());
    const defaults = planDefaults(body.subscriptionPlan || "Starter");
    const business = await Business.create({
      businessName: body.businessName,
      ownerName: body.ownerName,
      email,
      phone: body.phone || "",
      whatsapp: body.whatsapp || "",
      category: body.category || "Local shops",
      slug,
      ...defaults,
      subscriptionStatus: body.subscriptionStatus || "ACTIVE",
      productLimit: Number(body.productLimit || defaults.productLimit),
      staffLimit: Number(body.staffLimit || defaults.staffLimit),
      storageLimitMB: Number(body.storageLimitMB || defaults.storageLimitMB),
      arProductLimit: Number(body.arProductLimit || defaults.arProductLimit),
      usedStorageMB: 0,
      isActive: true
    });
    await User.create({ name: body.ownerName, email, passwordHash: await hashPassword(body.password), role: ROLES.BUSINESS_OWNER, businessId: business._id, isActive: true });
    await writeAudit({ actor: user, action: "business created", targetType: "Business", targetId: String(business._id), description: business.businessName, request });
    return json({ business }, 201);
  }
  if (id && (method === "PATCH" || method === "DELETE")) {
    const { user, error } = await requireUser([ROLES.SUPER_ADMIN]);
    if (error) return error;
    await connectDB();
    if (method === "DELETE") {
      const business = await Business.findById(id);
      if (!business) return json({ error: "Business not found." }, 404);
      const userIds = await User.find({ businessId: id }).distinct("_id");
      await Promise.all([
        Product.deleteMany({ businessId: id }),
        TableQR.deleteMany({ businessId: id }),
        Campaign.deleteMany({ businessId: id }),
        Analytics.deleteMany({ businessId: id }),
        Payment.deleteMany({ businessId: id }),
        Expense.deleteMany({ businessId: id }),
        SupportTicket.deleteMany({ businessId: id }),
        User.deleteMany({ businessId: id }),
        Salary.deleteMany({ userId: { $in: userIds } })
      ]);
      await business.deleteOne();
      await writeAudit({ actor: user, action: "business deleted", targetType: "Business", targetId: id, description: business.businessName, request });
      return json({ ok: true });
    }
    const body = await request.json();
    const updates = {};
    for (const field of ["businessName", "ownerName", "email", "phone", "whatsapp", "category", "subscriptionStatus"]) if (body[field] !== undefined) updates[field] = body[field];
    if (body.isActive !== undefined) updates.isActive = Boolean(body.isActive);
    if (body.isFrozenForNonPayment !== undefined) updates.isFrozenForNonPayment = Boolean(body.isFrozenForNonPayment);
    if (body.subscriptionPlan !== undefined) Object.assign(updates, planDefaults(body.subscriptionPlan));
    for (const field of ["productLimit", "staffLimit", "storageLimitMB", "arProductLimit", "usedStorageMB"]) if (body[field] !== undefined) updates[field] = Number(body[field] || 0);
    const business = await Business.findByIdAndUpdate(id, updates, { new: true });
    if (!business) return json({ error: "Business not found." }, 404);
    await writeAudit({ actor: user, action: body.subscriptionPlan ? "subscription changed" : body.isActive === false ? "business deactivated" : "business updated", targetType: "Business", targetId: id, description: business.businessName, request });
    return json({ business });
  }
  return notFound();
}

async function dispatch(request, method) {
  const parts = pathParts(request);
  if (parts[0] === "contact" && method === "POST") return handleContactRequest(request);
  if (parts[0] === "auth" && parts[1] === "login" && method === "POST") return handleLogin(request);
  if (parts[0] === "auth" && parts[1] === "logout" && method === "POST") return clearSessionCookie();
  if (parts[0] === "auth" && parts[1] === "me" && method === "GET") {
    const { user, error } = await requireUser();
    if (error) return json({ user: null }, 401);
    return json({ user: { id: user._id, name: user.name, email: user.email, role: user.role, businessId: user.businessId, permissions: user.permissions } });
  }
  if (parts[0] === "auth" && parts[1] === "register" && method === "POST") return handleRegister(request);
  if (parts[0] === "auth" && parts[1] === "forgot-password" && method === "POST") return handleForgotPassword(request);
  if (parts[0] === "auth") return json({ ok: true });
  if (parts[0] === "analytics" && parts[1] === "track" && method === "POST") return handleTrack(request);
  if (parts[0] === "analytics" && method === "GET") return handleAnalytics(request);
  if (parts[0] === "reports" && method === "GET") return handleReports(request);
  if (parts[0] === "billing" && method === "GET") return handleBilling();
  if (parts[0] === "chat" && ["GET", "POST"].includes(method)) return handleChat(method, request);
  if (parts[0] === "public" && parts[1] === "business" && method === "GET") return handlePublicBusiness(parts[2]);
  if (parts[0] === "public" && parts[1] === "product" && method === "GET") return handlePublicProduct(parts[2], parts[3]);
  if (parts[0] === "dashboard" && method === "GET") return handleDashboard();
  if (parts[0] === "business" && parts[1] === "profile" && ["GET", "PATCH"].includes(method)) return handleBusinessProfile(method, request);
  if (parts[0] === "products" && parts[1] === "import" && method === "POST") return handleProductImport(request);
  if (parts[0] === "products") return handleProducts(method, request, parts[1]);
  if (parts[0] === "tables") return handleTables(method, request, parts[1]);
  if (parts[0] === "campaigns") return handleCampaigns(method, request, parts[1]);
  if (parts[0] === "staff") return handleStaff(method, request, parts[1]);
  if (parts[0] === "qrs" && method === "GET") return handleQrs();
  if (parts[0] === "upload" && method === "POST") return handleUpload(request);
  if (parts[0] === "finance") return handleFinance(method, request);
  if (parts[0] === "salaries") return handleSalaries(method, request);
  if (parts[0] === "team") return handleTeam(method, request, parts[1]);
  if (parts[0] === "approvals") return handleApprovals(method, request);
  if (parts[0] === "support") return handleSupport(method, request, parts[1]);
  if (parts[0] === "admin" && parts[1] === "businesses") return handleAdminBusinesses(method, request, parts[2]);
  return notFound();
}

export async function GET(request) {
  return dispatch(request, "GET");
}

export async function POST(request) {
  return dispatch(request, "POST");
}

export async function PATCH(request) {
  return dispatch(request, "PATCH");
}

export async function DELETE(request) {
  return dispatch(request, "DELETE");
}
