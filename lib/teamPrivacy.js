import { isOwnerAdmin } from "@/lib/auth";

export function publicTeamMember(member, viewer) {
  const id = member._id?.toString?.() || member.id?.toString?.() || "";
  const viewerId = viewer?._id?.toString?.() || viewer?.id?.toString?.() || "";
  const canSeePrivate = isOwnerAdmin(viewer) || id === viewerId;

  const safeMember = {
    _id: id,
    name: member.name || "Team member",
    role: member.role || "Team",
    status: member.status || "approved",
    skills: member.skills || [],
    assignedClients: member.assignedClients || [],
    chatStatus: member.chatStatus || "Available"
  };

  if (canSeePrivate) {
    safeMember.email = member.email || "";
    safeMember.phone = member.phone || "";
    safeMember.permissions = member.permissions || {};
    safeMember.agencyName = member.agencyName || "";
    safeMember.createdAt = member.createdAt;
    safeMember.updatedAt = member.updatedAt;
  }

  return safeMember;
}

export function publicChatSender(sender) {
  return {
    _id: sender?._id?.toString?.() || "",
    name: sender?.name || "Team member",
    role: sender?.role || "Team",
    chatStatus: sender?.chatStatus || "Available"
  };
}
