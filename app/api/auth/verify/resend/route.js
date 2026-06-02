import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { sendVerificationEmail } from "@/lib/email";
import { createRawToken, hashToken, tokenExpiry } from "@/lib/tokens";
import User from "@/models/User";

export async function POST(request) {
  try {
    const auth = await requireApiUser(request, { allowInactive: true });
    if (auth.error) return auth.error;

    const user = await User.findById(auth.user._id);
    if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });
    if (user.emailVerified) return NextResponse.json({ sent: true, message: "Email is already verified." });

    const token = createRawToken();
    user.emailVerificationToken = hashToken(token);
    user.emailVerificationExpires = tokenExpiry(48);
    await user.save();

    const result = await sendVerificationEmail({ user, token });
    await createAuditLog({
      request,
      user,
      action: "verification_email_requested",
      entityType: "User",
      entityId: user._id,
      details: { email: user.email, sent: result.sent }
    });

    return NextResponse.json({
      sent: result.sent,
      message: result.sent ? "Verification email sent." : "Email provider is not configured. Add RESEND_API_KEY and EMAIL_FROM in Vercel.",
      verificationUrl: process.env.NODE_ENV !== "production" ? result.url : undefined
    });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Verification email could not be sent." }, { status: 500 });
  }
}
