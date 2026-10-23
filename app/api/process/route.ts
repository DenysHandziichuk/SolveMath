import { NextRequest, NextResponse } from "next/server";
import { nvidia, NVIDIA_VISION_MODEL, NVIDIA_VISION_FALLBACK_MODEL } from "@/lib/nvidia";
import { groq } from "@/lib/groq";
import { extractQuestionsFromImage } from "@/lib/question-extraction";
import sharp from "sharp";
import { VisionServiceUnavailableError } from "@/lib/vision-completion";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {

  try {
    const { image } = await req.json();

    if (!image) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    // Small screenshots need enough pixels for the vision encoder to retain
    // fraction bars, superscripts, and the vertical stroke in a plus sign.
    const base64Data = image.includes(",") ? image.split(",")[1] : image;
    const source = sharp(Buffer.from(base64Data, "base64"), { limitInputPixels: 40_000_000 });
    const { width } = await source.metadata();
    const preparedImage = await source
      .rotate()
      .resize({ width: width && width < 1600 ? Math.min(width * 3, 1600) : undefined })
      .png()
      .toBuffer();
    const imageUrl = `data:image/png;base64,${preparedImage.toString("base64")}`;

    const useNvidia = Boolean(process.env.NVIDIA_API_KEY || !process.env.GROQ_API_KEY);
    const data = await extractQuestionsFromImage(
      {
        imageUrl,
        model: process.env.NVIDIA_VISION_MODEL || NVIDIA_VISION_MODEL,
        fallbackModel: process.env.NVIDIA_VISION_FALLBACK_MODEL || NVIDIA_VISION_FALLBACK_MODEL,
      },
      {
        nvidia: useNvidia ? nvidia : undefined,
        groq: process.env.GROQ_API_KEY ? groq : undefined,
      }
    );

    return NextResponse.json(data);
  } catch (error) {
    console.error("AI vision processing error:", error);

    if (error instanceof VisionServiceUnavailableError) {
      return NextResponse.json({ error: error.message }, { status: error.status, headers: { "Retry-After": "5" } });
    }

    const message = error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

