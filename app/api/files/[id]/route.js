import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { canAccessClient } from "@/lib/access";
import FileAsset from "@/models/FileAsset";

export async function GET(request, context) {
  const auth = await requireApiUser(request);
  if (auth.error) return auth.error;

  const { id } = await context.params;
  const file = await FileAsset.findOne({ _id: id, agencyName: auth.user.agencyName }).lean();
  if (!file) return NextResponse.json({ error: "File not found." }, { status: 404 });
  if (file.clientId && !(await canAccessClient(auth.user, file.clientId))) {
    return NextResponse.json({ error: "File not accessible." }, { status: 403 });
  }

  return new NextResponse(Buffer.from(file.data, "base64"), {
    headers: {
      "Content-Type": file.mimeType || "application/octet-stream",
      "Content-Disposition": `inline; filename="${encodeURIComponent(file.name)}"`
    }
  });
}
