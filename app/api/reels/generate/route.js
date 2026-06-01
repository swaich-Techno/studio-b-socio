import { NextResponse } from "next/server";
import { hasPermission, isOwnerAdmin, requireApiUser } from "@/lib/auth";
import { canAccessClient } from "@/lib/access";
import { generateReelPlan } from "@/lib/contentRules";
import Catalogue from "@/models/Catalogue";
import Client from "@/models/Client";
import Reel from "@/models/Reel";

export async function POST(request) {
  try {
    const auth = await requireApiUser(request);
    if (auth.error) return auth.error;
    if (!isOwnerAdmin(auth.user) && !hasPermission(auth.user, "create_content")) {
      return NextResponse.json({ error: "You do not have permission to create reel plans." }, { status: 403 });
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
    const generated = generateReelPlan(body, clientContext);
    const reel = await Reel.create({
      userId: auth.user._id,
      clientId: client._id,
      productName: body.productName,
      goal: body.goal,
      duration: body.duration,
      tone: body.tone,
      language: body.language,
      hook: generated.hook,
      script: generated.script,
      scenes: generated.scenes,
      voiceover: generated.voiceover,
      caption: generated.caption,
      hashtags: generated.hashtags,
      editingInstructions: `${generated.editingInstructions}\nMusic/trend: ${generated.musicSuggestion}`,
      coverPrompt: generated.coverPrompt,
      status: "Script Ready",
      assignedTo: body.assignedTo || ""
    });
    return NextResponse.json({ reel, generated }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Reel generation failed." }, { status: 500 });
  }
}
