import { NextResponse } from "next/server";
import { hasPermission, isOwnerAdmin, requireApiUser } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import Calendar from "@/models/Calendar";

export async function PUT(request, context) {
  try {
    const auth = await requireApiUser(request);
    if (auth.error) return auth.error;
    if (!isOwnerAdmin(auth.user) && !hasPermission(auth.user, "manage_calendar")) {
      return NextResponse.json({ error: "You do not have permission to manage calendar." }, { status: 403 });
    }
    const { id } = await context.params;
    const body = await request.json();
    if (body.postDate && !body.date) body.date = body.postDate;
    if (body.date) body.date = new Date(body.date);
    if (body.postDate) body.postDate = new Date(body.postDate);
    if (body.dueDate) body.dueDate = new Date(body.dueDate);
    const item = await Calendar.findOneAndUpdate({ _id: id, userId: auth.user._id }, body, { new: true, runValidators: true });
    if (!item) return NextResponse.json({ error: "Calendar item not found." }, { status: 404 });
    return NextResponse.json({ item });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Calendar update failed." }, { status: 500 });
  }
}

export async function DELETE(request, context) {
  const auth = await requireApiUser(request);
  if (auth.error) return auth.error;
  if (!isOwnerAdmin(auth.user)) {
    return NextResponse.json({ error: "Only Owner/Admin can permanently delete calendar items." }, { status: 403 });
  }
  const { id } = await context.params;
  const item = await Calendar.findOneAndDelete({ _id: id, userId: auth.user._id });
  if (!item) return NextResponse.json({ error: "Calendar item not found." }, { status: 404 });
  await createAuditLog({ request, user: auth.user, action: "calendar_item_deleted", entityType: "Calendar", entityId: id, details: { topic: item.topic } });
  return NextResponse.json({ success: true });
}
