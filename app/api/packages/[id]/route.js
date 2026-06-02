import { NextResponse } from "next/server";
import { hasPermission, isOwnerAdmin, requireApiUser } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import Package from "@/models/Package";

function normalizePackage(body) {
  return {
    ...body,
    monthlyPrice: Number(body.monthlyPrice || 0),
    postsPerMonth: Number(body.postsPerMonth || 0),
    reelsPerMonth: Number(body.reelsPerMonth || 0),
    storiesPerMonth: Number(body.storiesPerMonth || 0),
    adManagementIncluded: body.adManagementIncluded === true || body.adManagementIncluded === "on",
    reportIncluded: body.reportIncluded === true || body.reportIncluded === "on"
  };
}

export async function GET(request, context) {
  const auth = await requireApiUser(request);
  if (auth.error) return auth.error;
  if (!isOwnerAdmin(auth.user) && !hasPermission(auth.user, "manage_billing")) {
    return NextResponse.json({ error: "You do not have permission to view packages." }, { status: 403 });
  }
  const { id } = await context.params;
  const packageItem = await Package.findOne({ _id: id, userId: auth.user._id }).lean();
  if (!packageItem) return NextResponse.json({ error: "Package not found." }, { status: 404 });
  return NextResponse.json({ package: packageItem });
}

export async function PUT(request, context) {
  try {
    const auth = await requireApiUser(request);
    if (auth.error) return auth.error;
    if (!isOwnerAdmin(auth.user) && !hasPermission(auth.user, "manage_billing")) {
      return NextResponse.json({ error: "You do not have permission to manage packages." }, { status: 403 });
    }
    const { id } = await context.params;
    const body = await request.json();
    const packageItem = await Package.findOneAndUpdate({ _id: id, userId: auth.user._id }, normalizePackage(body), { new: true, runValidators: true });
    if (!packageItem) return NextResponse.json({ error: "Package not found." }, { status: 404 });
    return NextResponse.json({ package: packageItem });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Package update failed." }, { status: 500 });
  }
}

export async function DELETE(request, context) {
  const auth = await requireApiUser(request);
  if (auth.error) return auth.error;
  if (!isOwnerAdmin(auth.user)) {
    return NextResponse.json({ error: "Only Owner/Admin can permanently delete packages." }, { status: 403 });
  }
  const { id } = await context.params;
  const packageItem = await Package.findOneAndDelete({ _id: id, userId: auth.user._id });
  if (!packageItem) return NextResponse.json({ error: "Package not found." }, { status: 404 });
  await createAuditLog({ request, user: auth.user, action: "package_deleted", entityType: "Package", entityId: id, details: { name: packageItem.name } });
  return NextResponse.json({ success: true });
}
