import { NextResponse } from "next/server";
import { requireApiUser, sanitizeUser } from "@/lib/auth";

export async function GET(request) {
  const auth = await requireApiUser(request, { allowInactive: true });
  if (auth.error) return auth.error;
  return NextResponse.json({ user: sanitizeUser(auth.user) });
}
