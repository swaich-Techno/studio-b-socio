import { NextResponse } from "next/server";
import { hashPassword, isOwnerAdmin, permissionsForRole, requireApiUser } from "@/lib/auth";
import { permissionKeys } from "@/lib/options";
import { publicTeamMember } from "@/lib/teamPrivacy";
import User from "@/models/User";

function normalizePermissions(body) {
  const base = permissionsForRole(body.role || "Intern");
  return Object.fromEntries(permissionKeys.map((key) => [key, body.permissions?.[key] ?? body[key] ?? base[key] ?? false]));
}

function normalizeSkills(skills) {
  if (Array.isArray(skills)) return skills;
  return String(skills || "").split(",").map((skill) => skill.trim()).filter(Boolean);
}

export async function GET(request) {
  const auth = await requireApiUser(request);
  if (auth.error) return auth.error;
  const owner = isOwnerAdmin(auth.user);
  const query = owner ? {} : { agencyName: auth.user.agencyName, status: "approved" };
  const team = await User.find(query).select("-password").populate("assignedClients", "businessName").sort({ status: 1, createdAt: -1 }).lean();
  return NextResponse.json({
    team: team.map((member) => publicTeamMember(member, auth.user)),
    meta: {
      canManageTeam: owner,
      currentUserId: auth.user._id.toString()
    }
  });
}

export async function POST(request) {
  try {
    const auth = await requireApiUser(request);
    if (auth.error) return auth.error;
    if (!isOwnerAdmin(auth.user)) {
      return NextResponse.json({ error: "Only Owner/Admin can add team members." }, { status: 403 });
    }
    const body = await request.json();
    if (!body.name || !body.email) {
      return NextResponse.json({ error: "Name and email are required." }, { status: 400 });
    }
    const existing = await User.findOne({ email: body.email.toLowerCase() });
    if (existing) return NextResponse.json({ error: "User already exists." }, { status: 409 });
    const role = body.role || "Intern";
    const user = await User.create({
      name: body.name,
      email: body.email.toLowerCase(),
      password: await hashPassword(body.password || "ChangeMe123!"),
      agencyName: auth.user.agencyName,
      role,
      status: body.status || "pending",
      permissions: normalizePermissions({ ...body, role }),
      skills: normalizeSkills(body.skills),
      assignedClients: body.assignedClients || [],
      phone: body.phone || "",
      chatStatus: body.chatStatus || "Available"
    });
    return NextResponse.json({ member: publicTeamMember(user, auth.user) }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Team member save failed." }, { status: 500 });
  }
}
