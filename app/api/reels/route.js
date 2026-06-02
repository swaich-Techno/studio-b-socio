import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { accessibleClientIds } from "@/lib/access";
import Reel from "@/models/Reel";

export async function GET(request) {
  const auth = await requireApiUser(request);
  if (auth.error) return auth.error;
  const clientIds = await accessibleClientIds(auth.user);
  const reels = await Reel.find({ clientId: { $in: clientIds } }).populate("clientId", "businessName industry").sort({ createdAt: -1 }).lean();
  return NextResponse.json({ reels });
}
