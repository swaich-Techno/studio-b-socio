import { NextResponse } from "next/server";
import { hasPermission, isOwnerAdmin, requireApiUser } from "@/lib/auth";
import { clientVisibilityFilter } from "@/lib/access";
import { createAuditLog } from "@/lib/audit";
import Client from "@/models/Client";

function normalizeClientBody(body) {
  const cleanId = (value) => value || undefined;
  return {
    ...body,
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

export async function GET(request, context) {
  const auth = await requireApiUser(request);
  if (auth.error) return auth.error;
  const { id } = await context.params;
  const client = await Client.findOne({ ...clientVisibilityFilter(auth.user), _id: id }).populate("assignedTeamMembers assignedDesigner assignedReelEditor assignedPhotographer assignedAdsManager assignedCoordinator", "name email role").lean();
  if (!client) return NextResponse.json({ error: "Client not found." }, { status: 404 });
  return NextResponse.json({ client });
}

export async function PUT(request, context) {
  try {
    const auth = await requireApiUser(request);
    if (auth.error) return auth.error;
    if (!isOwnerAdmin(auth.user) && !hasPermission(auth.user, "manage_clients")) {
      return NextResponse.json({ error: "You do not have permission to edit clients." }, { status: 403 });
    }
    const { id } = await context.params;
    const body = await request.json();
    const client = await Client.findOneAndUpdate(
      { _id: id, userId: auth.user._id },
      normalizeClientBody(body),
      { new: true, runValidators: true }
    );
    if (!client) return NextResponse.json({ error: "Client not found." }, { status: 404 });
    return NextResponse.json({ client });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Client update failed." }, { status: 500 });
  }
}

export async function DELETE(request, context) {
  const auth = await requireApiUser(request);
  if (auth.error) return auth.error;
  if (!isOwnerAdmin(auth.user)) {
    return NextResponse.json({ error: "Only Owner/Admin can permanently delete clients." }, { status: 403 });
  }
  const { id } = await context.params;
  const client = await Client.findOneAndDelete({ _id: id, userId: auth.user._id });
  if (!client) return NextResponse.json({ error: "Client not found." }, { status: 404 });
  await createAuditLog({ request, user: auth.user, action: "client_deleted", entityType: "Client", entityId: id, details: { businessName: client.businessName } });
  return NextResponse.json({ success: true });
}
