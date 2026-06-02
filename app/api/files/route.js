import { NextResponse } from "next/server";
import { isOwnerAdmin, requireApiUser } from "@/lib/auth";
import { canAccessClient } from "@/lib/access";
import { createAuditLog } from "@/lib/audit";
import FileAsset from "@/models/FileAsset";

const MAX_FILE_SIZE = 2 * 1024 * 1024;

export async function GET(request) {
  const auth = await requireApiUser(request);
  if (auth.error) return auth.error;

  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get("clientId");
  const fileModule = searchParams.get("module");
  const query = { agencyName: auth.user.agencyName };

  if (clientId) {
    if (!(await canAccessClient(auth.user, clientId))) {
      return NextResponse.json({ error: "Client not accessible." }, { status: 403 });
    }
    query.clientId = clientId;
  }

  if (fileModule) query.module = fileModule;

  const files = await FileAsset.find(query).select("-data").populate("clientId", "businessName").sort({ createdAt: -1 }).lean();
  return NextResponse.json({ files });
}

export async function POST(request) {
  try {
    const auth = await requireApiUser(request);
    if (auth.error) return auth.error;

    const body = await request.json();
    const data = String(body.data || "");
    const size = Number(body.size || 0);
    const clientId = body.clientId || undefined;

    if (!body.name || !data) return NextResponse.json({ error: "File name and data are required." }, { status: 400 });
    if (size > MAX_FILE_SIZE) return NextResponse.json({ error: "File must be 2MB or smaller." }, { status: 400 });
    if (clientId && !(await canAccessClient(auth.user, clientId))) {
      return NextResponse.json({ error: "Client not accessible." }, { status: 403 });
    }

    const file = await FileAsset.create({
      agencyName: auth.user.agencyName,
      userId: auth.user._id,
      clientId,
      module: body.module || "client",
      category: body.category || "",
      name: body.name,
      mimeType: body.mimeType || "",
      size,
      data,
      notes: body.notes || ""
    });

    await createAuditLog({ request, user: auth.user, action: "file_uploaded", entityType: "FileAsset", entityId: file._id, details: { name: file.name, module: file.module } });

    return NextResponse.json({ file: { ...file.toObject(), data: undefined } }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message || "File upload failed." }, { status: 500 });
  }
}

export async function DELETE(request) {
  const auth = await requireApiUser(request);
  if (auth.error) return auth.error;
  if (!isOwnerAdmin(auth.user)) {
    return NextResponse.json({ error: "Only Owner/Admin can permanently delete files." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "File id is required." }, { status: 400 });

  const file = await FileAsset.findOneAndDelete({ _id: id, agencyName: auth.user.agencyName });
  if (!file) return NextResponse.json({ error: "File not found." }, { status: 404 });

  await createAuditLog({ request, user: auth.user, action: "file_deleted", entityType: "FileAsset", entityId: id, details: { name: file.name } });
  return NextResponse.json({ success: true });
}
