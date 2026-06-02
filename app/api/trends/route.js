import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import Trend from "@/models/Trend";

export async function GET(request) {
  const auth = await requireApiUser(request);
  if (auth.error) return auth.error;
  const { searchParams } = new URL(request.url);
  const query = { userId: auth.user._id };
  if (searchParams.get("industry")) query.industry = searchParams.get("industry");
  if (searchParams.get("platform")) query.platform = searchParams.get("platform");
  const trends = await Trend.find(query).sort({ createdAt: -1 }).lean();
  return NextResponse.json({ trends });
}

export async function POST(request) {
  try {
    const auth = await requireApiUser(request);
    if (auth.error) return auth.error;
    const body = await request.json();
    const trend = await Trend.create({ ...body, userId: auth.user._id });
    return NextResponse.json({ trend }, { status: 201 });
    // Future integration: replace manual inserts with Instagram, TikTok, YouTube, or Meta trend API imports.
  } catch (error) {
    return NextResponse.json({ error: error.message || "Trend save failed." }, { status: 500 });
  }
}
