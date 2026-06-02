import { NextResponse } from "next/server";
import { hasPermission, isOwnerAdmin, requireApiUser } from "@/lib/auth";
import { canAccessClient } from "@/lib/access";
import { generateContentPlan } from "@/lib/contentRules";
import Catalogue from "@/models/Catalogue";
import Client from "@/models/Client";
import Content from "@/models/Content";

export async function POST(request) {
  try {
    const auth = await requireApiUser(request);
    if (auth.error) return auth.error;
    if (!isOwnerAdmin(auth.user) && !hasPermission(auth.user, "create_content")) {
      return NextResponse.json({ error: "You do not have permission to create content." }, { status: 403 });
    }
    const body = await request.json();
    if (!body.clientId) {
      return NextResponse.json({ error: "Please select a client." }, { status: 400 });
    }
    if (!(await canAccessClient(auth.user, body.clientId))) {
      return NextResponse.json({ error: "Client not accessible." }, { status: 403 });
    }
    const client = await Client.findById(body.clientId);
    if (!client) return NextResponse.json({ error: "Client not found." }, { status: 404 });

    const catalogues = await Catalogue.find({ clientId: client._id, status: { $ne: "Archived" } })
      .select("items title type")
      .sort({ updatedAt: -1 })
      .limit(3)
      .lean();
    const clientContext = {
      ...client.toObject(),
      catalogueItems: catalogues.flatMap((catalogue) => catalogue.items || []).slice(0, 12)
    };
    const generated = generateContentPlan(body, clientContext);
    const content = await Content.create({
      userId: auth.user._id,
      clientId: client._id,
      platform: body.platform,
      contentType: body.contentType,
      goal: body.goal,
      tone: body.tone,
      language: body.language,
      productName: body.productName,
      offerDetails: body.offerDetails,
      ...generated
    });

    return NextResponse.json({ generated, content }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Content generation failed." }, { status: 500 });
  }
}
