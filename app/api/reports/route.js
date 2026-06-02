import { NextResponse } from "next/server";
import { hasPermission, isOwnerAdmin, requireApiUser } from "@/lib/auth";
import { accessibleClientIds } from "@/lib/access";
import Report from "@/models/Report";

export async function GET(request) {
  const auth = await requireApiUser(request);
  if (auth.error) return auth.error;
  if (!isOwnerAdmin(auth.user) && !hasPermission(auth.user, "view_reports")) {
    return NextResponse.json({ error: "You do not have permission to view reports." }, { status: 403 });
  }
  const { searchParams } = new URL(request.url);
  const clientIds = await accessibleClientIds(auth.user);
  const requestedClientId = searchParams.get("clientId");
  const allowed = clientIds.map((id) => id.toString());
  const query = { clientId: { $in: clientIds } };
  if (requestedClientId && allowed.includes(requestedClientId)) query.clientId = requestedClientId;
  if (requestedClientId && !allowed.includes(requestedClientId)) query.clientId = { $in: [] };
  const reports = await Report.find(query).populate("clientId", "businessName industry").sort({ year: -1, month: -1 }).lean();
  return NextResponse.json({ reports });
}
