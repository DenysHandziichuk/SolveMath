import { NextRequest, NextResponse } from "next/server";
import { groq } from "@/lib/groq";

export async function POST(req: NextRequest) {
  try {
    const { image } = await req.json();

    if (!image) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    // Remove the data prefix (e.g., "data:image/png;base64,")
    const base64Data = image.split(",")[1];

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are a math expert who explains things simply. Analyze the screenshot provided. Identify all distinct math tasks/questions. Important: Each question in this specific format starts with a marker like 'C1', 'C2', 'C3', etc. Treat everything following one marker as a single, complete question until the next marker appears. When describing the 'type', use standard mathematical terms (e.g., Algebra, Geometry). Return ONLY a valid JSON object with a 'questions' array. Each question should have an 'id' (the marker, e.g., 'C1'), 'text' (the full content including the marker, but NEVER use $ symbols), 'difficulty' (1-10, where 1 is easiest), and 'type'. Example: { \"questions\": [{ \"id\": \"C1\", \"text\": \"C1 Solve x+2=4...\", \"difficulty\": 1, \"type\": \"Algebra\" }] }"
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Please extract the math questions from this image." },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Data}`,
              },
            },
          ],
        },
      ],
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      response_format: { type: "json_object" },
      temperature: 0.1,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Empty response from Groq");
    }

    const data = JSON.parse(content);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Groq processing error:", error);
    const message = error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
