import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { accessibleClientIds } from "@/lib/access";
import Content from "@/models/Content";

export async function GET(request) {
  const auth = await requireApiUser(request);
  if (auth.error) return auth.error;
  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get("clientId");
  const clientIds = await accessibleClientIds(auth.user);
  const allowed = clientIds.map((id) => id.toString());
  const query = { clientId: { $in: clientIds } };
  if (clientId && allowed.includes(clientId)) query.clientId = clientId;
  if (clientId && !allowed.includes(clientId)) query.clientId = { $in: [] };
  const content = await Content.find(query).populate("clientId", "businessName industry").sort({ createdAt: -1 }).lean();
  return NextResponse.json({ content });
}
