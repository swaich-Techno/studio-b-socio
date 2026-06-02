import { NextResponse } from "next/server";
import { hasPermission, isOwnerAdmin, requireApiUser } from "@/lib/auth";
import { accessibleClientIds } from "@/lib/access";
import { createAuditLog } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import Calendar from "@/models/Calendar";
import ClientApproval from "@/models/ClientApproval";
import Content from "@/models/Content";
import Reel from "@/models/Reel";
import User from "@/models/User";

export async function GET(request) {
  const auth = await requireApiUser(request);
  if (auth.error) return auth.error;
  if (!isOwnerAdmin(auth.user) && !hasPermission(auth.user, "approve_posts")) {
    return NextResponse.json({ error: "You do not have permission to view approvals." }, { status: 403 });
  }

  const clientIds = await accessibleClientIds(auth.user);
  const [calendarApprovals, contentApprovals, reelApprovals, clientApprovals, pendingUsers] = await Promise.all([
    Calendar.find({ clientId: { $in: clientIds }, approvalStatus: { $in: ["Need Owner Approval", "Sent to Client", "Client Revision"] } }).populate("clientId", "businessName").sort({ postDate: 1 }).lean(),
    Content.find({ clientId: { $in: clientIds }, approvalStatus: { $in: ["Waiting Owner Approval", "Waiting Client Approval", "Revision Needed"] } }).populate("clientId", "businessName").sort({ createdAt: -1 }).lean(),
    Reel.find({ clientId: { $in: clientIds }, status: "Review" }).populate("clientId", "businessName").sort({ createdAt: -1 }).lean(),
    ClientApproval.find({ clientId: { $in: clientIds }, status: "Waiting Client Approval" }).populate("clientId", "businessName").sort({ createdAt: -1 }).lean(),
    isOwnerAdmin(auth.user) ? User.find({ status: "pending" }).select("-password").sort({ createdAt: -1 }).lean() : []
  ]);

  return NextResponse.json({ calendarApprovals, contentApprovals, reelApprovals, clientApprovals, pendingUsers });
}

export async function PUT(request) {
  try {
    const auth = await requireApiUser(request);
    if (auth.error) return auth.error;
    const body = await request.json();
    const { type, id, action } = body;
    const approve = action === "approve";

    if (type === "user") {
      if (!isOwnerAdmin(auth.user)) return NextResponse.json({ error: "Only Owner/Admin can approve users." }, { status: 403 });
      const target = await User.findById(id).select("-password");
      if (!target) return NextResponse.json({ error: "User not found." }, { status: 404 });
      if (approve && !target.emailVerified) {
        return NextResponse.json({ error: "This user must verify email before approval." }, { status: 400 });
      }
      const user = await User.findOneAndUpdate(
        { _id: id },
        { status: approve ? "approved" : "rejected", agencyName: auth.user.agencyName },
        { new: true }
      ).select("-password");
      await createAuditLog({ request, user: auth.user, action: approve ? "user_approved" : "user_rejected", entityType: "User", entityId: id, details: { email: user?.email } });
      if (user) {
        await createNotification({
          agencyName: auth.user.agencyName,
          userId: user._id,
          title: approve ? "Account approved" : "Account rejected",
          message: approve ? "You can now use B Socio Studio." : "Please contact the owner for account access.",
          type: "approval",
          href: approve ? "/dashboard" : "/inactive",
          createdBy: auth.user._id
        });
      }
      return NextResponse.json({ item: user });
    }

    if (!isOwnerAdmin(auth.user) && !hasPermission(auth.user, "approve_posts")) {
      return NextResponse.json({ error: "You do not have permission to approve content." }, { status: 403 });
    }

    if (type === "calendar") {
      const item = await Calendar.findByIdAndUpdate(id, { approvalStatus: approve ? "Approved" : "Client Revision", status: approve ? "Approved" : "Client Revision" }, { new: true });
      return NextResponse.json({ item });
    }

    if (type === "content") {
      const item = await Content.findByIdAndUpdate(id, { approvalStatus: approve ? "Approved" : "Revision Needed" }, { new: true });
      return NextResponse.json({ item });
    }

    if (type === "reel") {
      const item = await Reel.findByIdAndUpdate(id, { status: approve ? "Approved" : "Idea" }, { new: true });
      return NextResponse.json({ item });
    }

    if (type === "clientApproval") {
      const item = await ClientApproval.findByIdAndUpdate(id, { status: approve ? "Approved" : "Revision Needed", clientComments: body.clientComments || "" }, { new: true });
      return NextResponse.json({ item });
    }

    return NextResponse.json({ error: "Invalid approval type." }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Approval update failed." }, { status: 500 });
  }
}
