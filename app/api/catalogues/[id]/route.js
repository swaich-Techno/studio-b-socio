import { NextResponse } from "next/server";
import { canAccessClient } from "@/lib/access";
import { createAuditLog } from "@/lib/audit";
import { hasPermission, isOwnerAdmin, requireApiUser } from "@/lib/auth";
import Catalogue from "@/models/Catalogue";

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

async function findAccessibleCatalogue(user, id) {
  const catalogue = await Catalogue.findById(id).populate("clientId", "businessName industry").lean();
  if (!catalogue) return null;
  const canView = await canAccessClient(user, catalogue.clientId?._id || catalogue.clientId);
  return canView ? catalogue : null;
}

export async function GET(request, context) {
  const auth = await requireApiUser(request);
  if (auth.error) return auth.error;
  const { id } = await context.params;
  const catalogue = await findAccessibleCatalogue(auth.user, id);
  if (!catalogue) return NextResponse.json({ error: "Catalogue not found." }, { status: 404 });
  return NextResponse.json({ catalogue });
}

export async function PUT(request, context) {
  try {
    const auth = await requireApiUser(request);
    if (auth.error) return auth.error;

    if (!canManageCatalogues(auth.user)) {
      return NextResponse.json({ error: "You do not have permission to update catalogues." }, { status: 403 });
    }

    const { id } = await context.params;
    const existing = await Catalogue.findById(id).lean();
    if (!existing) return NextResponse.json({ error: "Catalogue not found." }, { status: 404 });
    if (!(await canAccessClient(auth.user, existing.clientId))) {
      return NextResponse.json({ error: "Client not accessible." }, { status: 403 });
    }

    const body = await request.json();
    const update = {
      type: body.type || existing.type,
      title: body.title || existing.title,
      description: body.description || "",
      currency: body.currency || "INR",
      status: body.status || existing.status,
      coverImageUrl: body.coverImageUrl || "",
      notes: body.notes || ""
    };

    if (Array.isArray(body.items)) update.items = normalizeItems(body.items);

    const catalogue = await Catalogue.findByIdAndUpdate(id, update, { new: true, runValidators: true })
      .populate("clientId", "businessName industry");

    await createAuditLog({
      request,
      user: auth.user,
      action: "catalogue_updated",
      entityType: "Catalogue",
      entityId: id,
      details: { title: catalogue.title }
    });

    return NextResponse.json({ catalogue });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Catalogue update failed." }, { status: 500 });
  }
}

export async function DELETE(request, context) {
  const auth = await requireApiUser(request);
  if (auth.error) return auth.error;

  if (!isOwnerAdmin(auth.user)) {
    return NextResponse.json({ error: "Only Owner/Admin can permanently delete catalogues." }, { status: 403 });
  }

  const { id } = await context.params;
  const catalogue = await Catalogue.findById(id).lean();
  if (!catalogue) return NextResponse.json({ error: "Catalogue not found." }, { status: 404 });
  if (!(await canAccessClient(auth.user, catalogue.clientId))) {
    return NextResponse.json({ error: "Client not accessible." }, { status: 403 });
  }

  await Catalogue.findByIdAndDelete(id);
  await createAuditLog({
    request,
    user: auth.user,
    action: "catalogue_deleted",
    entityType: "Catalogue",
    entityId: id,
    details: { title: catalogue.title }
  });

  return NextResponse.json({ success: true });
}
