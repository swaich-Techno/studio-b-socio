import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import { permissionKeys, roleDefaultPermissions } from "@/lib/options";
import User from "@/models/User";

export const AUTH_COOKIE = "b_socio_session";

function getJwtSecret() {
  if (process.env.JWT_SECRET) {
    return process.env.JWT_SECRET;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("Missing JWT_SECRET environment variable.");
  }

  return "local-development-secret-change-before-deploy";
}

export async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

export async function comparePassword(password, hashedPassword) {
  return bcrypt.compare(password, hashedPassword);
}

export function signToken(user) {
  return jwt.sign(
    { userId: user._id.toString(), email: user.email, role: user.role, status: user.status },
    getJwtSecret(),
    { expiresIn: "7d" }
  );
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, getJwtSecret());
  } catch {
    return null;
  }
}

export function setAuthCookie(response, token) {
  response.cookies.set(AUTH_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7
  });
}

export function clearAuthCookie(response) {
  response.cookies.set(AUTH_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });
}

export async function getSessionUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE)?.value;
  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload?.userId) return null;

  await connectDB();
  let user = await User.findById(payload.userId).select("-password");
  user = await repairAdminAccess(user);
  return user ? JSON.parse(JSON.stringify(user)) : null;
}

export async function requireApiUser(request, options = {}) {
  const token = request.cookies.get(AUTH_COOKIE)?.value;
  if (!token) {
    return {
      error: NextResponse.json({ error: "Please login first." }, { status: 401 })
    };
  }

  const payload = verifyToken(token);
  if (!payload?.userId) {
    return {
      error: NextResponse.json({ error: "Session expired. Please login again." }, { status: 401 })
    };
  }

  await connectDB();
  let user = await User.findById(payload.userId).select("-password");
  user = await repairAdminAccess(user);
  if (!user) {
    return {
      error: NextResponse.json({ error: "User account not found." }, { status: 401 })
    };
  }

  if (!options.allowInactive && !isApprovedUser(user)) {
    return {
      error: NextResponse.json({ error: "Account is not approved." }, { status: 403 })
    };
  }

  if (options.permission && !hasPermission(user, options.permission)) {
    return {
      error: NextResponse.json({ error: "You do not have permission for this action." }, { status: 403 })
    };
  }

  return { user };
}

export function sanitizeUser(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    agencyName: user.agencyName,
    role: user.role,
    status: user.status || (isApprovedUser(user) ? "approved" : "pending"),
    emailVerified: Boolean(user.emailVerified || isAdminEmail(user.email)),
    permissions: user.permissions || permissionsForRole(user.role),
    skills: user.skills || [],
    assignedClients: user.assignedClients || [],
    chatStatus: user.chatStatus || "Available",
    logoUrl: user.logoUrl || "",
    ownerName: user.ownerName || "",
    phone: user.phone || "",
    defaultCurrency: user.defaultCurrency || "INR",
    defaultLanguage: user.defaultLanguage || "English",
    teamMembers: user.teamMembers || []
  };
}
export function isAdminEmail(email) {
  return Boolean(process.env.ADMIN_EMAIL && email?.toLowerCase() === process.env.ADMIN_EMAIL.toLowerCase());
}

export function permissionsForRole(role) {
  const allowed = roleDefaultPermissions[role] || [];
  return Object.fromEntries(permissionKeys.map((key) => [key, allowed.includes(key)]));
}

export function isApprovedUser(user) {
  if (!user) return false;
  if (isAdminEmail(user.email)) return true;
  if (!process.env.ADMIN_EMAIL && !user.status && (user.role === "Owner" || user.role === "Owner/Admin")) return true;
  return user.status === "approved";
}

export function isOwnerAdmin(user) {
  return isApprovedUser(user) && (isAdminEmail(user.email) || user.role === "Owner/Admin" || user.role === "Owner");
}

export function hasPermission(user, permission) {
  if (isOwnerAdmin(user)) return true;
  return Boolean(user?.permissions?.[permission]);
}

async function repairAdminAccess(user) {
  if (!user || !isAdminEmail(user.email)) return user;
  const needsUpdate = user.status !== "approved" || user.role !== "Owner/Admin" || permissionKeys.some((key) => !user.permissions?.[key]);
  if (!needsUpdate) return user;
  user.status = "approved";
  user.role = "Owner/Admin";
  user.emailVerified = true;
  user.permissions = permissionsForRole("Owner/Admin");
  await user.save();
  return user;
}
