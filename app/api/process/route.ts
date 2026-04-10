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
          content: "You are a math expert who explains things simply. Analyze the screenshot provided. Identify all distinct math tasks/questions. Important: Each question in this specific format starts with a marker like 'A1', 'B1', 'C1', 'D1', etc. Treat everything following one marker as a single, complete question until the next marker appears. When describing the 'type', categorize them correctly based on the topic (e.g., Characteristics of Functions, Exponential Functions, Trigonometric Functions, Discrete Functions). Return ONLY a valid JSON object with a 'questions' array. Each question should have an 'id' (the marker, e.g., 'A1'), 'text' (the full content including the marker, but NEVER use $ symbols), 'difficulty' (1-10, where 1 is easiest), and 'type'. Example: { \"questions\": [{ \"id\": \"A1\", \"text\": \"A1 Solve x+2=4...\", \"difficulty\": 1, \"type\": \"Characteristics of Functions\" }] }"
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
