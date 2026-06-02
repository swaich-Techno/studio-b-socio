import { NextResponse } from "next/server";
import { hasPermission, isOwnerAdmin, requireApiUser } from "@/lib/auth";
import { accessibleClientIds, canAccessClient } from "@/lib/access";
import { createNotification } from "@/lib/notifications";
import Task from "@/models/Task";
import User from "@/models/User";

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
  if (searchParams.get("assignedTo")) query.assignedTo = searchParams.get("assignedTo");
  if (searchParams.get("status")) query.status = searchParams.get("status");
  const tasks = await Task.find(query).populate("clientId", "businessName industry").sort({ dueDate: 1 }).lean();
  return NextResponse.json({ tasks, meta: { canDeleteTasks: isOwnerAdmin(auth.user), canAssignTasks: isOwnerAdmin(auth.user) || hasPermission(auth.user, "assign_tasks") } });
}

export async function POST(request) {
  try {
    const auth = await requireApiUser(request);
    if (auth.error) return auth.error;
    if (!isOwnerAdmin(auth.user) && !hasPermission(auth.user, "assign_tasks")) {
      return NextResponse.json({ error: "You do not have permission to assign tasks." }, { status: 403 });
    }
    const body = await request.json();
    if (!(await canAccessClient(auth.user, body.clientId))) {
      return NextResponse.json({ error: "Client not accessible." }, { status: 403 });
    }
    const task = await Task.create({ ...body, userId: auth.user._id, dueDate: new Date(body.dueDate) });
    if (body.assignedTo) {
      const assignedUser = await User.findOne({ agencyName: auth.user.agencyName, name: body.assignedTo, status: "approved" }).select("_id").lean();
      if (assignedUser) {
        await createNotification({
          agencyName: auth.user.agencyName,
          userId: assignedUser._id,
          title: "New task assigned",
          message: task.title,
          type: "task",
          href: "/tasks",
          createdBy: auth.user._id
        });
      }
    }
    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Task save failed." }, { status: 500 });
  }
}
