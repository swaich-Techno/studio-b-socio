import { NextResponse } from "next/server";
import { isOwnerAdmin, requireApiUser } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import ImageAsset from "@/models/ImageAsset";

export async function PUT(request, context) {
  try {
    const auth = await requireApiUser(request);
    if (auth.error) return auth.error;
    const { id } = await context.params;
    const body = await request.json();
    const asset = await ImageAsset.findOneAndUpdate({ _id: id, userId: auth.user._id }, body, { new: true, runValidators: true });
    if (!asset) return NextResponse.json({ error: "Image asset not found." }, { status: 404 });
    return NextResponse.json({ asset });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Image asset update failed." }, { status: 500 });
  }
}

export async function DELETE(request, context) {
  const auth = await requireApiUser(request);
  if (auth.error) return auth.error;
  if (!isOwnerAdmin(auth.user)) {
    return NextResponse.json({ error: "Only Owner/Admin can permanently delete image assets." }, { status: 403 });
  }
  const { id } = await context.params;
  const asset = await ImageAsset.findOneAndDelete({ _id: id, userId: auth.user._id });
  if (!asset) return NextResponse.json({ error: "Image asset not found." }, { status: 404 });
  await createAuditLog({ request, user: auth.user, action: "image_asset_deleted", entityType: "ImageAsset", entityId: id, details: { productName: asset.productName } });
  return NextResponse.json({ success: true });
}
