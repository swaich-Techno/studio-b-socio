import { NextResponse } from "next/server";
import { hasPermission, isOwnerAdmin, requireApiUser } from "@/lib/auth";
import { accessibleClientIds, canAccessClient } from "@/lib/access";
import Analytics from "@/models/Analytics";

export async function GET(request) {
  const auth = await requireApiUser(request);
  if (auth.error) return auth.error;
  if (!isOwnerAdmin(auth.user) && !hasPermission(auth.user, "view_analytics")) {
    return NextResponse.json({ error: "You do not have permission to view analytics." }, { status: 403 });
  }
  const { searchParams } = new URL(request.url);
  const clientIds = await accessibleClientIds(auth.user);
  const requestedClientId = searchParams.get("clientId");
  const allowed = clientIds.map((id) => id.toString());
  const query = { clientId: { $in: clientIds } };
  if (requestedClientId && allowed.includes(requestedClientId)) query.clientId = requestedClientId;
  if (requestedClientId && !allowed.includes(requestedClientId)) query.clientId = { $in: [] };
  const analytics = await Analytics.find(query).populate("clientId", "businessName industry").sort({ date: -1 }).lean();
  return NextResponse.json({ analytics });
}

export async function POST(request) {
  try {
    const auth = await requireApiUser(request);
    if (auth.error) return auth.error;
    const body = await request.json();
    if (!(await canAccessClient(auth.user, body.clientId))) {
      return NextResponse.json({ error: "Client not accessible." }, { status: 403 });
    }
    const entry = await Analytics.create({ ...body, userId: auth.user._id, date: new Date(body.date) });
    return NextResponse.json({ entry }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Analytics save failed." }, { status: 500 });
  }
}
