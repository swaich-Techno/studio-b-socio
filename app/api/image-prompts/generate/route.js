import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { canAccessClient } from "@/lib/access";
import { generateImagePrompt } from "@/lib/contentRules";
import Catalogue from "@/models/Catalogue";
import Client from "@/models/Client";

export async function POST(request) {
  try {
    const auth = await requireApiUser(request);
    if (auth.error) return auth.error;
    const body = await request.json();
    let client = null;
    if (body.clientId) {
      if (!(await canAccessClient(auth.user, body.clientId))) {
        return NextResponse.json({ error: "Client not accessible." }, { status: 403 });
      }
      client = await Client.findById(body.clientId);
      if (client) {
        const catalogues = await Catalogue.find({ clientId: client._id, status: { $ne: "Archived" } }).select("items").limit(2).lean();
        client = { ...client.toObject(), catalogueItems: catalogues.flatMap((catalogue) => catalogue.items || []).slice(0, 8) };
      }
    }
    const prompt = generateImagePrompt(body, client || {});
    return NextResponse.json({ prompt });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Image prompt generation failed." }, { status: 500 });
  }
}
