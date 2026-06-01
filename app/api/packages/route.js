import { NextResponse } from "next/server";
import { hasPermission, isOwnerAdmin, requireApiUser } from "@/lib/auth";
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

export async function GET(request) {
  const auth = await requireApiUser(request);
  if (auth.error) return auth.error;
  if (!isOwnerAdmin(auth.user) && !hasPermission(auth.user, "manage_billing")) {
    return NextResponse.json({ error: "You do not have permission to view packages." }, { status: 403 });
  }
  const packages = await Package.find({ userId: auth.user._id }).sort({ monthlyPrice: 1 }).lean();
  return NextResponse.json({ packages });
}

export async function POST(request) {
  try {
    const auth = await requireApiUser(request);
    if (auth.error) return auth.error;
    if (!isOwnerAdmin(auth.user) && !hasPermission(auth.user, "manage_billing")) {
      return NextResponse.json({ error: "You do not have permission to manage packages." }, { status: 403 });
    }
    const body = await request.json();
    const packageItem = await Package.create({ ...normalizePackage(body), userId: auth.user._id });
    return NextResponse.json({ package: packageItem }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Package save failed." }, { status: 500 });
  }
}
