import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { defaultIndustries } from "@/lib/options";
import Industry from "@/models/Industry";

export async function GET(request) {
  const auth = await requireApiUser(request);
  if (auth.error) return auth.error;
  const custom = await Industry.find({ userId: auth.user._id }).sort({ category: 1, name: 1 }).lean();
  return NextResponse.json({
    industries: [
      ...defaultIndustries.map((industry) => ({ ...industry, _id: `default-${industry.name}`, isDefault: true })),
      ...custom.map((industry) => ({ ...industry, isDefault: false }))
    ]
  });
}

export async function POST(request) {
  try {
    const auth = await requireApiUser(request);
    if (auth.error) return auth.error;
    const body = await request.json();
    const industry = await Industry.create({
      ...body,
      userId: auth.user._id,
      defaultContentIdeas: String(body.defaultContentIdeas || "").split("\n").map((item) => item.trim()).filter(Boolean),
      defaultHashtags: String(body.defaultHashtags || "").split(/[\n,]/).map((item) => item.trim()).filter(Boolean),
      defaultPosterStyles: String(body.defaultPosterStyles || "").split(/[\n,]/).map((item) => item.trim()).filter(Boolean),
      defaultReelIdeas: String(body.defaultReelIdeas || "").split("\n").map((item) => item.trim()).filter(Boolean)
    });
    return NextResponse.json({ industry }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Industry save failed." }, { status: 500 });
  }
}
