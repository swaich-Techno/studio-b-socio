import crypto from "crypto";
import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import ClientApproval from "@/models/ClientApproval";

export async function GET(request) {
  const auth = await requireApiUser(request);
  if (auth.error) return auth.error;
  const approvals = await ClientApproval.find({ userId: auth.user._id }).populate("clientId", "businessName").sort({ createdAt: -1 }).lean();
  return NextResponse.json({ approvals });
}

export async function POST(request) {
  try {
    const auth = await requireApiUser(request);
    if (auth.error) return auth.error;
    const body = await request.json();
    const approval = await ClientApproval.create({
      ...body,
      userId: auth.user._id,
      approvalToken: body.approvalToken || crypto.randomBytes(24).toString("hex")
    });
    return NextResponse.json({ approval }, { status: 201 });
    // Future client portal:
    // Send approvalToken in a secure approval link for client-only review without full login.
  } catch (error) {
    return NextResponse.json({ error: error.message || "Client approval creation failed." }, { status: 500 });
  }
}
