import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import ImageAsset from "@/models/ImageAsset";

export async function POST(request) {
  try {
    const auth = await requireApiUser(request);
    if (auth.error) return auth.error;
    const body = await request.json();

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "Image API not configured. Add OPENAI_API_KEY to enable real image generation." },
        { status: 400 }
      );
    }

    const asset = await ImageAsset.findOne({ _id: body.assetId, userId: auth.user._id });
    if (!asset) return NextResponse.json({ error: "Image prompt not found." }, { status: 404 });

    // Future OpenAI Image API integration:
    // 1. Import the official OpenAI SDK.
    // 2. Send asset.prompt and asset.negativePrompt to the image model.
    // 3. Upload the returned image to storage, then save the public URL in asset.imageUrl.
    // 4. Set status to "Generated".
    return NextResponse.json(
      { error: "Image generation backend is API-ready, but the OpenAI Image API call has not been enabled in code yet." },
      { status: 501 }
    );
  } catch (error) {
    return NextResponse.json({ error: error.message || "Image generation failed." }, { status: 500 });
  }
}
