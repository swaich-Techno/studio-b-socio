import { NextResponse } from "next/server";
import { hasPermission, isOwnerAdmin, requireApiUser } from "@/lib/auth";
import { clientVisibilityFilter } from "@/lib/access";
import { createAuditLog } from "@/lib/audit";
import Client from "@/models/Client";

function normalizeClientBody(body, user) {
  const cleanId = (value) => value || undefined;
  return {
    ...body,
    userId: user._id,
    agencyName: user.agencyName,
    monthlyFee: Number(body.monthlyFee || 0),
    advancePaid: Number(body.advancePaid || 0),
    balancePending: Number(body.balancePending || 0),
    postsPerMonth: Number(body.postsPerMonth || 0),
    reelsPerMonth: Number(body.reelsPerMonth || 0),
    storiesPerMonth: Number(body.storiesPerMonth || 0),
    startDate: body.startDate ? new Date(body.startDate) : undefined,
    renewalDate: body.renewalDate ? new Date(body.renewalDate) : undefined,
    visibleToAllTeam: body.visibleToAllTeam === true || body.visibleToAllTeam === "on",
    assignedTeamMembers: Array.isArray(body.assignedTeamMembers) ? body.assignedTeamMembers.filter(Boolean) : [],
    assignedDesigner: cleanId(body.assignedDesigner),
    assignedReelEditor: cleanId(body.assignedReelEditor),
    assignedPhotographer: cleanId(body.assignedPhotographer),
    assignedAdsManager: cleanId(body.assignedAdsManager),
    assignedCoordinator: cleanId(body.assignedCoordinator),
    pipelineStatus: body.pipelineStatus || body.status || "Active",
    status: body.status || body.pipelineStatus || "Active"
  };
}

export async function GET(request) {
  const auth = await requireApiUser(request);
  if (auth.error) return auth.error;
  const clients = await Client.find(clientVisibilityFilter(auth.user)).populate("assignedTeamMembers assignedDesigner assignedReelEditor assignedPhotographer assignedAdsManager assignedCoordinator", "name email role").sort({ createdAt: -1 }).lean();
  return NextResponse.json({ clients, meta: { canDeleteClients: isOwnerAdmin(auth.user), canManageClients: isOwnerAdmin(auth.user) || hasPermission(auth.user, "manage_clients") } });
}

export async function POST(request) {
  try {
    const auth = await requireApiUser(request);
    if (auth.error) return auth.error;
    if (!isOwnerAdmin(auth.user) && !hasPermission(auth.user, "manage_clients")) {
      return NextResponse.json({ error: "You do not have permission to create clients." }, { status: 403 });
    }
    const body = await request.json();
    if (!body.businessName || !body.industry) {
      return NextResponse.json({ error: "Business name and industry are required." }, { status: 400 });
    }
    const client = await Client.create(normalizeClientBody(body, auth.user));
    await createAuditLog({ request, user: auth.user, action: "client_created", entityType: "Client", entityId: client._id, details: { businessName: client.businessName } });
    return NextResponse.json({ client }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Client save failed." }, { status: 500 });
  }
}
