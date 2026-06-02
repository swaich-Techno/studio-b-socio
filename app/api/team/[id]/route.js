import { NextResponse } from "next/server";
import { isOwnerAdmin, permissionsForRole, requireApiUser } from "@/lib/auth";
import { permissionKeys } from "@/lib/options";
import { publicTeamMember } from "@/lib/teamPrivacy";
import User from "@/models/User";

function normalizePermissions(body) {
  const base = permissionsForRole(body.role || "Intern");
  return Object.fromEntries(permissionKeys.map((key) => [key, Boolean(body.permissions?.[key] ?? body[key] ?? base[key] ?? false)]));
}

function normalizeSkills(skills) {
  if (Array.isArray(skills)) return skills;
  return String(skills || "").split(",").map((skill) => skill.trim()).filter(Boolean);
}

export async function GET(request, context) {
  const auth = await requireApiUser(request);
  if (auth.error) return auth.error;
  const { id } = await context.params;
  const owner = isOwnerAdmin(auth.user);
  const query = owner || auth.user._id.toString() === id
    ? { _id: id }
    : { _id: id, agencyName: auth.user.agencyName, status: "approved" };
  const member = await User.findOne(query).select("-password").populate("assignedClients", "businessName").lean();
  if (!member) return NextResponse.json({ error: "Team member not found." }, { status: 404 });
  return NextResponse.json({ member: publicTeamMember(member, auth.user), meta: { canManageTeam: owner } });
}

export async function PUT(request, context) {
  try {
    const auth = await requireApiUser(request);
    if (auth.error) return auth.error;
    if (!isOwnerAdmin(auth.user)) {
      return NextResponse.json({ error: "Only Owner/Admin can manage team." }, { status: 403 });
    }
    const { id } = await context.params;
    const body = await request.json();
    const update = {
      name: body.name,
      phone: body.phone,
      role: body.role,
      status: body.status,
      agencyName: auth.user.agencyName,
      permissions: normalizePermissions(body),
      skills: normalizeSkills(body.skills),
      assignedClients: body.assignedClients || []
    };
    if (body.chatStatus) update.chatStatus = body.chatStatus;
    const member = await User.findByIdAndUpdate(id, update, { new: true, runValidators: true }).select("-password");
    if (!member) return NextResponse.json({ error: "Team member not found." }, { status: 404 });
    return NextResponse.json({ member: publicTeamMember(member, auth.user) });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Team member update failed." }, { status: 500 });
  }
}

export async function DELETE(request, context) {
  const auth = await requireApiUser(request);
  if (auth.error) return auth.error;
  if (!isOwnerAdmin(auth.user)) {
    return NextResponse.json({ error: "Only Owner/Admin can remove team members." }, { status: 403 });
  }
  const { id } = await context.params;
  if (auth.user._id.toString() === id) {
    return NextResponse.json({ error: "You cannot delete your own admin account." }, { status: 400 });
  }
  const member = await User.findByIdAndDelete(id);
  if (!member) return NextResponse.json({ error: "Team member not found." }, { status: 404 });
  return NextResponse.json({ success: true });
}
