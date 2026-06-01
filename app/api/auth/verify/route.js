import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { createAuditLog } from "@/lib/audit";
import { appUrl } from "@/lib/email";
import { hashToken } from "@/lib/tokens";
import User from "@/models/User";

export async function GET(request) {
  await connectDB();
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(`${appUrl()}/login?verified=missing`);
  }

  const user = await User.findOne({
    emailVerificationToken: hashToken(token),
    emailVerificationExpires: { $gt: new Date() }
  });

  if (!user) {
    return NextResponse.redirect(`${appUrl()}/login?verified=invalid`);
  }

  user.emailVerified = true;
  user.emailVerificationToken = "";
  user.emailVerificationExpires = undefined;
  await user.save();

  await createAuditLog({
    request,
    user,
    action: "email_verified",
    entityType: "User",
    entityId: user._id,
    details: { email: user.email }
  });

  return NextResponse.redirect(`${appUrl()}/pending?verified=1`);
}
