import { NextResponse } from "next/server";
import { hasPermission, isOwnerAdmin, requireApiUser } from "@/lib/auth";
import { canAccessClient } from "@/lib/access";
import { generateImagePrompt } from "@/lib/contentRules";
import Catalogue from "@/models/Catalogue";
import Client from "@/models/Client";
import ImageAsset from "@/models/ImageAsset";

export async function POST(request) {
  try {
    const auth = await requireApiUser(request);
    if (auth.error) return auth.error;
    if (!isOwnerAdmin(auth.user) && !hasPermission(auth.user, "create_content")) {
      return NextResponse.json({ error: "You do not have permission to create image prompts." }, { status: 403 });
    }
    const body = await request.json();
    if (!(await canAccessClient(auth.user, body.clientId))) {
      return NextResponse.json({ error: "Client not accessible." }, { status: 403 });
    }
    const client = await Client.findById(body.clientId);
    if (!client) return NextResponse.json({ error: "Client not found." }, { status: 404 });

    const catalogues = await Catalogue.find({ clientId: client._id, status: { $ne: "Archived" } }).select("items").limit(2).lean();
    const clientContext = {
      ...client.toObject(),
      catalogueItems: catalogues.flatMap((catalogue) => catalogue.items || []).slice(0, 8)
    };
    const generated = generateImagePrompt(body, clientContext);
    const asset = await ImageAsset.create({
      userId: auth.user._id,
      clientId: client._id,
      productName: body.productName,
      platformSize: body.platformSize,
      style: body.style,
      prompt: generated.prompt,
      negativePrompt: generated.negativePrompt,
      notes: `${generated.designNotes}\nLayout: ${generated.suggestedLayout}\nCTA: ${generated.suggestedCTA}`,
      status: "Prompt Only"
    });

    return NextResponse.json({ asset, generated }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Image prompt generation failed." }, { status: 500 });
  }
}
