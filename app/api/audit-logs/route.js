import { NextResponse } from "next/server";
import { isOwnerAdmin, requireApiUser } from "@/lib/auth";
import AuditLog from "@/models/AuditLog";

export async function GET(request) {
  const auth = await requireApiUser(request);
  if (auth.error) return auth.error;
  if (!isOwnerAdmin(auth.user)) {
    return NextResponse.json({ error: "Only Owner/Admin can view audit logs." }, { status: 403 });
  }

  const logs = await AuditLog.find({ agencyName: auth.user.agencyName }).populate("userId", "name role").sort({ createdAt: -1 }).limit(100).lean();
  return NextResponse.json({ logs });
}
