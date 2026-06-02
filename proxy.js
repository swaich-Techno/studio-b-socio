import { NextResponse } from "next/server";

const AUTH_COOKIE = "b_socio_session";
const protectedRoutes = [
  "/dashboard",
  "/clients",
  "/catalogues",
  "/industries",
  "/team",
  "/content-generator",
  "/reels",
  "/image-prompts",
  "/ai-image-studio",
  "/reel-studio",
  "/calendar",
  "/tasks",
  "/analytics",
  "/trends",
  "/reports",
  "/packages",
  "/billing",
  "/financials",
  "/approvals",
  "/chat",
  "/search",
  "/notifications",
  "/audit-logs",
  "/files"
];

function readTokenPayload(token) {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "="));
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

function hasUsableSession(request) {
  const token = request.cookies.get(AUTH_COOKIE)?.value;
  if (!token) return false;

  const payload = readTokenPayload(token);
  if (!payload?.userId || !payload?.exp) return false;

  return payload.exp * 1000 > Date.now();
}

export function proxy(request) {
  const { pathname } = request.nextUrl;
  const hasSession = hasUsableSession(request);
  const isProtected = protectedRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`));

  if (isProtected && !hasSession) {
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.set(AUTH_COOKIE, "", { path: "/", maxAge: 0 });
    return response;
  }

  if ((pathname === "/login" || pathname === "/register") && hasSession) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"]
};
