import { NextResponse } from "next/server";
import { hasPermission, isOwnerAdmin, requireApiUser } from "@/lib/auth";
import { accessibleClientIds, canAccessClient } from "@/lib/access";
import Calendar from "@/models/Calendar";

export async function GET(request) {
  const auth = await requireApiUser(request);
  if (auth.error) return auth.error;
  const { searchParams } = new URL(request.url);
  const clientIds = await accessibleClientIds(auth.user);
  const requestedClientId = searchParams.get("clientId");
  const allowed = clientIds.map((id) => id.toString());
  const query = { clientId: { $in: clientIds } };
  if (requestedClientId && allowed.includes(requestedClientId)) query.clientId = requestedClientId;
  if (requestedClientId && !allowed.includes(requestedClientId)) query.clientId = { $in: [] };
  const calendar = await Calendar.find(query).populate("clientId", "businessName industry").sort({ date: 1 }).lean();
  return NextResponse.json({ calendar });
}

export async function POST(request) {
  try {
    const auth = await requireApiUser(request);
    if (auth.error) return auth.error;
    if (!isOwnerAdmin(auth.user) && !hasPermission(auth.user, "manage_calendar")) {
      return NextResponse.json({ error: "You do not have permission to manage calendar." }, { status: 403 });
    }
    const body = await request.json();
    if (!(await canAccessClient(auth.user, body.clientId))) {
      return NextResponse.json({ error: "Client not accessible." }, { status: 403 });
    }
    const postDate = body.postDate || body.date;
    const item = await Calendar.create({
      ...body,
      userId: auth.user._id,
      date: new Date(postDate),
      postDate: postDate ? new Date(postDate) : undefined,
      dueDate: body.dueDate ? new Date(body.dueDate) : undefined
    });
    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Calendar save failed." }, { status: 500 });
  }
}
