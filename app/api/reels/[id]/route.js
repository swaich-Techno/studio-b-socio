import { NextResponse } from "next/server";
import { isOwnerAdmin, requireApiUser } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import Reel from "@/models/Reel";

export async function PUT(request, context) {
  try {
    const auth = await requireApiUser(request);
    if (auth.error) return auth.error;
    const { id } = await context.params;
    const body = await request.json();
    const reel = await Reel.findOneAndUpdate({ _id: id, userId: auth.user._id }, body, { new: true, runValidators: true });
    if (!reel) return NextResponse.json({ error: "Reel not found." }, { status: 404 });
    return NextResponse.json({ reel });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Reel update failed." }, { status: 500 });
  }
}

export async function DELETE(request, context) {
  const auth = await requireApiUser(request);
  if (auth.error) return auth.error;
  if (!isOwnerAdmin(auth.user)) {
    return NextResponse.json({ error: "Only Owner/Admin can permanently delete reels." }, { status: 403 });
  }
  const { id } = await context.params;
  const reel = await Reel.findOneAndDelete({ _id: id, userId: auth.user._id });
  if (!reel) return NextResponse.json({ error: "Reel not found." }, { status: 404 });
  await createAuditLog({ request, user: auth.user, action: "reel_deleted", entityType: "Reel", entityId: id, details: { productName: reel.productName } });
  return NextResponse.json({ success: true });
}
