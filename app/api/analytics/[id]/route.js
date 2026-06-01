import { NextResponse } from "next/server";
import { isOwnerAdmin, requireApiUser } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import Analytics from "@/models/Analytics";

export async function PUT(request, context) {
  try {
    const auth = await requireApiUser(request);
    if (auth.error) return auth.error;
    const { id } = await context.params;
    const body = await request.json();
    if (body.date) body.date = new Date(body.date);
    const entry = await Analytics.findOneAndUpdate({ _id: id, userId: auth.user._id }, body, { new: true, runValidators: true });
    if (!entry) return NextResponse.json({ error: "Analytics entry not found." }, { status: 404 });
    return NextResponse.json({ entry });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Analytics update failed." }, { status: 500 });
  }
}

export async function DELETE(request, context) {
  const auth = await requireApiUser(request);
  if (auth.error) return auth.error;
  if (!isOwnerAdmin(auth.user)) {
    return NextResponse.json({ error: "Only Owner/Admin can permanently delete analytics entries." }, { status: 403 });
  }
  const { id } = await context.params;
  const entry = await Analytics.findOneAndDelete({ _id: id, userId: auth.user._id });
  if (!entry) return NextResponse.json({ error: "Analytics entry not found." }, { status: 404 });
  await createAuditLog({ request, user: auth.user, action: "analytics_deleted", entityType: "Analytics", entityId: id, details: { platform: entry.platform } });
  return NextResponse.json({ success: true });
}
