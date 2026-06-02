import AuditLog from "@/models/AuditLog";

export async function createAuditLog({ request, user, action, entityType = "", entityId = "", details = {} }) {
  try {
    const ipAddress = request?.headers?.get("x-forwarded-for")?.split(",")[0]?.trim() || "";
    await AuditLog.create({
      agencyName: user?.agencyName || "",
      userId: user?._id,
      action,
      entityType,
      entityId: String(entityId || ""),
      details,
      ipAddress
    });
  } catch {
    // Audit logging must never break the user-facing action.
  }
}
