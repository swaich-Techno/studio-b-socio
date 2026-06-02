import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { hashPassword } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { hashToken } from "@/lib/tokens";
import User from "@/models/User";

export async function POST(request) {
  try {
    await connectDB();
    const { token, password } = await request.json();
    if (!token || !password) return NextResponse.json({ error: "Token and password are required." }, { status: 400 });
    if (password.length < 6) return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });

    const user = await User.findOne({
      passwordResetToken: hashToken(token),
      passwordResetExpires: { $gt: new Date() }
    });

    if (!user) return NextResponse.json({ error: "Reset link is invalid or expired." }, { status: 400 });

    user.password = await hashPassword(password);
    user.passwordResetToken = "";
    user.passwordResetExpires = undefined;
    await user.save();

    await createAuditLog({
      request,
      user,
      action: "password_reset_completed",
      entityType: "User",
      entityId: user._id
    });

    return NextResponse.json({ message: "Password updated. You can login now." });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Password reset failed." }, { status: 500 });
  }
}
