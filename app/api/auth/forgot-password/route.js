import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { createAuditLog } from "@/lib/audit";
import { sendPasswordResetEmail } from "@/lib/email";
import { createRawToken, hashToken, tokenExpiry } from "@/lib/tokens";
import User from "@/models/User";

export async function POST(request) {
  try {
    await connectDB();
    const { email } = await request.json();
    if (!email) return NextResponse.json({ error: "Email is required." }, { status: 400 });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return NextResponse.json({ message: "If this email exists, a reset link will be sent." });
    }

    const token = createRawToken();
    user.passwordResetToken = hashToken(token);
    user.passwordResetExpires = tokenExpiry(1);
    await user.save();

    const result = await sendPasswordResetEmail({ user, token });
    await createAuditLog({
      request,
      user,
      action: "password_reset_requested",
      entityType: "User",
      entityId: user._id,
      details: { email: user.email, sent: result.sent }
    });

    return NextResponse.json({
      message: result.sent ? "Password reset link sent." : "Email provider is not configured. Add RESEND_API_KEY and EMAIL_FROM in Vercel.",
      resetUrl: process.env.NODE_ENV !== "production" ? result.url : undefined
    });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Password reset request failed." }, { status: 500 });
  }
}
