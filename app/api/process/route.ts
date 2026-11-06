import { NextRequest, NextResponse } from "next/server";
import { nvidia, NVIDIA_VISION_MODEL, NVIDIA_VISION_FALLBACK_MODEL } from "@/lib/nvidia";
import { groq } from "@/lib/groq";
import { extractQuestionsFromImage } from "@/lib/question-extraction";
import sharp from "sharp";
import { VisionServiceUnavailableError } from "@/lib/vision-completion";
import { decodeProblemImage, InputError, MAX_IMAGE_REQUEST_BYTES, readJsonBody } from "@/lib/api-input";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await readJsonBody(req, MAX_IMAGE_REQUEST_BYTES);
    const input = decodeProblemImage(body.image);
    let preparedImage: Buffer;
    try {
      const source = sharp(input, { limitInputPixels: 40_000_000 });
      const { width, format } = await source.metadata();
      if (!width || !format || !["png", "jpeg", "webp"].includes(format)) throw new Error("Unsupported image");
      preparedImage = await source.rotate().resize({
        width: width < 1600 ? Math.min(width * 3, 1600) : 2400,
        height: 2400, fit: "inside",
      }).png().toBuffer();
    } catch { throw new InputError("This image couldn’t be opened. Try a different PNG, JPG, or WebP file."); }
    if (!process.env.NVIDIA_API_KEY && !process.env.GROQ_API_KEY) {
      return NextResponse.json({ error: "AI image reading isn’t configured here. You can still create a presentation manually." }, { status: 503 });
    }
    const data = await extractQuestionsFromImage({
      imageUrl: `data:image/png;base64,${preparedImage.toString("base64")}`,
      model: process.env.NVIDIA_VISION_MODEL || NVIDIA_VISION_MODEL,
      fallbackModel: process.env.NVIDIA_VISION_FALLBACK_MODEL || NVIDIA_VISION_FALLBACK_MODEL,
      signal: req.signal,
    }, {
      nvidia: process.env.NVIDIA_API_KEY ? nvidia : undefined,
      groq: process.env.GROQ_API_KEY ? groq : undefined,
    });
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof InputError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.warn("Image reading failed:", error instanceof Error ? error.name : "Unknown error");
    if (error instanceof VisionServiceUnavailableError) {
      return NextResponse.json({ error: error.message }, { status: error.status, headers: { "Retry-After": "5" } });
    }
    return NextResponse.json({ error: "The image couldn’t be processed right now. Try again, or create slides manually." }, { status: 503 });
  }
}
