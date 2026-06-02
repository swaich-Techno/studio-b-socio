import { NextResponse } from "next/server";
import { hasPermission, isOwnerAdmin, requireApiUser } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import Task from "@/models/Task";

export async function PUT(request, context) {
  try {
    const auth = await requireApiUser(request);
    if (auth.error) return auth.error;
    const { id } = await context.params;
    const existing = await Task.findById(id);
    if (!existing) return NextResponse.json({ error: "Task not found." }, { status: 404 });
    const canUpdateAssignedTask = existing.assignedTo === auth.user.name;
    if (!isOwnerAdmin(auth.user) && !hasPermission(auth.user, "assign_tasks") && !canUpdateAssignedTask) {
      return NextResponse.json({ error: "You do not have permission to update tasks." }, { status: 403 });
    }
    const body = await request.json();
    if (body.dueDate) body.dueDate = new Date(body.dueDate);
    const update = canUpdateAssignedTask && !isOwnerAdmin(auth.user) && !hasPermission(auth.user, "assign_tasks")
      ? { status: body.status, revisionNotes: body.revisionNotes, notes: body.notes }
      : body;
    const task = await Task.findByIdAndUpdate(id, update, { new: true, runValidators: true });
    if (!task) return NextResponse.json({ error: "Task not found." }, { status: 404 });
    return NextResponse.json({ task });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Task update failed." }, { status: 500 });
  }
}

export async function DELETE(request, context) {
  const auth = await requireApiUser(request);
  if (auth.error) return auth.error;
  if (!isOwnerAdmin(auth.user)) {
    return NextResponse.json({ error: "Only Owner/Admin can permanently delete tasks." }, { status: 403 });
  }
  const { id } = await context.params;
  const task = await Task.findOneAndDelete({ _id: id, userId: auth.user._id });
  if (!task) return NextResponse.json({ error: "Task not found." }, { status: 404 });
  await createAuditLog({ request, user: auth.user, action: "task_deleted", entityType: "Task", entityId: id, details: { title: task.title } });
  return NextResponse.json({ success: true });
}
