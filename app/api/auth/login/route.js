import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { comparePassword, isAdminEmail, permissionsForRole, sanitizeUser, setAuthCookie, signToken } from "@/lib/auth";
import User from "@/models/User";

export async function POST(request) {
  try {
    await connectDB();
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !(await comparePassword(password, user.password))) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    if (isAdminEmail(user.email) && (user.status !== "approved" || user.role !== "Owner/Admin")) {
      user.status = "approved";
      user.role = "Owner/Admin";
      user.emailVerified = true;
      user.permissions = permissionsForRole("Owner/Admin");
      await user.save();
    }

    const response = NextResponse.json({ user: sanitizeUser(user) });
    setAuthCookie(response, signToken(user));
    return response;
  } catch (error) {
    return NextResponse.json({ error: error.message || "Login failed." }, { status: 500 });
  }
}
