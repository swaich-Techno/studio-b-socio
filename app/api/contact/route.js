import { NextResponse } from "next/server";
import { processContactRequest } from "@/lib/contactRequest";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const result = await processContactRequest(request);
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Demo request could not be sent." },
      { status: 500 }
    );
  }
}
