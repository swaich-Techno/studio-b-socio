import { NextResponse } from "next/server";
import { isOwnerAdmin, requireApiUser } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import Trend from "@/models/Trend";

export async function PUT(request, context) {
  try {
    const auth = await requireApiUser(request);
    if (auth.error) return auth.error;
    const { id } = await context.params;
    const body = await request.json();
    const trend = await Trend.findOneAndUpdate({ _id: id, userId: auth.user._id }, body, { new: true, runValidators: true });
    if (!trend) return NextResponse.json({ error: "Trend not found." }, { status: 404 });
    return NextResponse.json({ trend });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Trend update failed." }, { status: 500 });
  }
}

export async function DELETE(request, context) {
  const auth = await requireApiUser(request);
  if (auth.error) return auth.error;
  if (!isOwnerAdmin(auth.user)) {
    return NextResponse.json({ error: "Only Owner/Admin can permanently delete trends." }, { status: 403 });
  }
  const { id } = await context.params;
  const trend = await Trend.findOneAndDelete({ _id: id, userId: auth.user._id });
  if (!trend) return NextResponse.json({ error: "Trend not found." }, { status: 404 });
  await createAuditLog({ request, user: auth.user, action: "trend_deleted", entityType: "Trend", entityId: id, details: { title: trend.title } });
  return NextResponse.json({ success: true });
}
