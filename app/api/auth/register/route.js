import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { hashPassword, isAdminEmail, permissionsForRole, sanitizeUser, setAuthCookie, signToken } from "@/lib/auth";
import { createAuditLog } from "@/lib/audit";
import { sendVerificationEmail } from "@/lib/email";
import { notifyAdmins } from "@/lib/notifications";
import { createRawToken, hashToken, tokenExpiry } from "@/lib/tokens";
import User from "@/models/User";

export async function POST(request) {
  try {
    await connectDB();
    const body = await request.json();
    const { name, email, password, agencyName } = body;

    if (!name || !email || !password || !agencyName) {
      return NextResponse.json({ error: "Name, email, password, and agency name are required." }, { status: 400 });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    }

    const adminSignup = isAdminEmail(email);
    const role = adminSignup ? "Owner/Admin" : "Intern";
    const verificationToken = adminSignup ? "" : createRawToken();
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: await hashPassword(password),
      agencyName,
      ownerName: name,
      role,
      status: adminSignup ? "approved" : "pending",
      emailVerified: adminSignup,
      emailVerificationToken: verificationToken ? hashToken(verificationToken) : "",
      emailVerificationExpires: verificationToken ? tokenExpiry(48) : undefined,
      permissions: permissionsForRole(role)
    });

    let verification = null;
    if (!adminSignup) {
      verification = await sendVerificationEmail({ user, token: verificationToken });
      await notifyAdmins({
        agencyName: process.env.ADMIN_AGENCY_NAME || "B Socio Studio",
        title: "New account waiting for approval",
        message: `${user.name} signed up and must verify email before approval.`,
        type: "approval",
        href: "/approvals"
      });
    }

    await createAuditLog({
      request,
      user,
      action: adminSignup ? "admin_registered" : "user_registered",
      entityType: "User",
      entityId: user._id,
      details: { email: user.email, emailVerificationSent: verification?.sent || false }
    });

    const response = NextResponse.json({
      user: sanitizeUser(user),
      verificationSent: verification?.sent || adminSignup,
      verificationMessage: adminSignup ? "" : verification?.sent ? "Verification email sent." : "Email provider is not configured. Ask the owner to configure RESEND_API_KEY and EMAIL_FROM."
    }, { status: 201 });
    setAuthCookie(response, signToken(user));
    return response;
  } catch (error) {
    return NextResponse.json({ error: error.message || "Registration failed." }, { status: 500 });
  }
}
