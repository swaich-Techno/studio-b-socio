import { NextResponse } from "next/server";
import { isOwnerAdmin, requireApiUser } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { defaultIndustries } from "@/lib/options";
import Industry from "@/models/Industry";

function findDefaultIndustry(id) {
  if (!id.startsWith("default-")) return null;
  const name = id.replace("default-", "");
  return defaultIndustries.find((industry) => industry.name === name);
}

export async function GET(request, context) {
  const auth = await requireApiUser(request);
  if (auth.error) return auth.error;
  const { id } = await context.params;
  const defaultIndustry = findDefaultIndustry(id);
  if (defaultIndustry) return NextResponse.json({ industry: { ...defaultIndustry, _id: id, isDefault: true } });
  const industry = await Industry.findOne({ _id: id, userId: auth.user._id }).lean();
  if (!industry) return NextResponse.json({ error: "Industry not found." }, { status: 404 });
  return NextResponse.json({ industry });
}

export async function PUT(request, context) {
  try {
    const auth = await requireApiUser(request);
    if (auth.error) return auth.error;
    const { id } = await context.params;
    if (id.startsWith("default-")) return NextResponse.json({ error: "Default industries cannot be edited. Create a custom industry instead." }, { status: 400 });
    const body = await request.json();
    const industry = await Industry.findOneAndUpdate(
      { _id: id, userId: auth.user._id },
      {
        ...body,
        defaultContentIdeas: String(body.defaultContentIdeas || "").split("\n").map((item) => item.trim()).filter(Boolean),
        defaultHashtags: String(body.defaultHashtags || "").split(/[\n,]/).map((item) => item.trim()).filter(Boolean),
        defaultPosterStyles: String(body.defaultPosterStyles || "").split(/[\n,]/).map((item) => item.trim()).filter(Boolean),
        defaultReelIdeas: String(body.defaultReelIdeas || "").split("\n").map((item) => item.trim()).filter(Boolean)
      },
      { new: true, runValidators: true }
    );
    if (!industry) return NextResponse.json({ error: "Industry not found." }, { status: 404 });
    return NextResponse.json({ industry });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Industry update failed." }, { status: 500 });
  }
}

export async function DELETE(request, context) {
  const auth = await requireApiUser(request);
  if (auth.error) return auth.error;
  if (!isOwnerAdmin(auth.user)) {
    return NextResponse.json({ error: "Only Owner/Admin can permanently delete industries." }, { status: 403 });
  }
  const { id } = await context.params;
  if (id.startsWith("default-")) return NextResponse.json({ error: "Default industries cannot be deleted." }, { status: 400 });
  const industry = await Industry.findOneAndDelete({ _id: id, userId: auth.user._id });
  if (!industry) return NextResponse.json({ error: "Industry not found." }, { status: 404 });
  await createAuditLog({ request, user: auth.user, action: "industry_deleted", entityType: "Industry", entityId: id, details: { name: industry.name } });
  return NextResponse.json({ success: true });
}
