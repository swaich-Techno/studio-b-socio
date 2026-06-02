import { NextResponse } from "next/server";
import { accessibleClientIds, canAccessClient } from "@/lib/access";
import { createAuditLog } from "@/lib/audit";
import { hasPermission, isOwnerAdmin, requireApiUser } from "@/lib/auth";
import Catalogue from "@/models/Catalogue";
import Client from "@/models/Client";

function normalizeItems(items = []) {
  if (!Array.isArray(items)) return [];
  return items
    .filter((item) => item?.name)
    .map((item) => ({
      name: String(item.name || "").trim(),
      category: item.category || "",
      price: Number(item.price || 0),
      description: item.description || "",
      imageUrl: item.imageUrl || "",
      notes: item.notes || ""
    }));
}

function canManageCatalogues(user) {
  return isOwnerAdmin(user) || hasPermission(user, "manage_clients") || hasPermission(user, "create_content");
}

export async function GET(request) {
  const auth = await requireApiUser(request);
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const clientIds = await accessibleClientIds(auth.user);
  const requestedClientId = searchParams.get("clientId");
  const allowedClientIds = clientIds.map((id) => id.toString());
  const query = { clientId: { $in: clientIds } };

  if (requestedClientId && allowedClientIds.includes(requestedClientId)) {
    query.clientId = requestedClientId;
  }

  if (requestedClientId && !allowedClientIds.includes(requestedClientId)) {
    query.clientId = { $in: [] };
  }

  const catalogues = await Catalogue.find(query)
    .populate("clientId", "businessName industry")
    .sort({ updatedAt: -1 })
    .lean();

  return NextResponse.json({
    catalogues,
    meta: {
      canCreateCatalogues: canManageCatalogues(auth.user),
      canDeleteCatalogues: isOwnerAdmin(auth.user)
    }
  });
}

export async function POST(request) {
  try {
    const auth = await requireApiUser(request);
    if (auth.error) return auth.error;

    if (!canManageCatalogues(auth.user)) {
      return NextResponse.json({ error: "You do not have permission to create catalogues." }, { status: 403 });
    }

    const body = await request.json();
    if (!body.clientId || !body.title) {
      return NextResponse.json({ error: "Client and title are required." }, { status: 400 });
    }

    if (!(await canAccessClient(auth.user, body.clientId))) {
      return NextResponse.json({ error: "Client not accessible." }, { status: 403 });
    }

    const client = await Client.findById(body.clientId).select("userId").lean();
    const catalogue = await Catalogue.create({
      userId: client?.userId || auth.user._id,
      createdBy: auth.user._id,
      clientId: body.clientId,
      type: body.type || "Catalogue",
      title: body.title,
      description: body.description || "",
      currency: body.currency || "INR",
      status: body.status || "Draft",
      coverImageUrl: body.coverImageUrl || "",
      items: normalizeItems(body.items),
      notes: body.notes || ""
    });

    await createAuditLog({
      request,
      user: auth.user,
      action: "catalogue_created",
      entityType: "Catalogue",
      entityId: catalogue._id,
      details: { title: catalogue.title, clientId: body.clientId }
    });

    return NextResponse.json({ catalogue }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Catalogue save failed." }, { status: 500 });
  }
}
