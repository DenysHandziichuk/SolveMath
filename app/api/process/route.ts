import { NextRequest, NextResponse } from "next/server";
import { nvidia, NVIDIA_VISION_MODEL } from "@/lib/nvidia";
import { groq } from "@/lib/groq";
import { extractJson } from "@/lib/json-extractor";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {

  try {
    const { image } = await req.json();

    if (!image) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    // Extract base64 and mime type if available
    const base64Data = image.includes(",") ? image.split(",")[1] : image;
    const mimeMatch = image.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,/);
    const mimeType = mimeMatch ? mimeMatch[1] : "image/jpeg";

    const systemPrompt = `You are an expert mathematics educator and OCR transcription engine.
Carefully examine the provided screenshot and identify ALL distinct math questions, exercises, or exam problems.

CRITICAL INSTRUCTIONS:
1. Extract EVERY distinct problem separately into the 'questions' array. Never merge multiple distinct numbered/lettered questions into one problem.
2. Preserve original question labels/numbers exactly as shown in the image (e.g., "C1", "C2", "C3", "C4", "1a", "Question 1", "Exercise 2").
3. MULTI-PART QUESTIONS INTEGRITY: If a question has subparts like a), b), c) or i), ii) (e.g., "Sketch the graph of a quartic function that: a) has line symmetry, b) does not have line symmetry" or "Describe the similarities between: a) the lines y = x and y = -x... b) the parabolas y = x^2 and y = -x^2..."), you MUST transcribe ALL subparts completely in the 'text' field! NEVER truncate, summarize, or drop subparts a), b), etc.
4. Accurately transcribe all mathematical expressions and equations into standard LaTeX enclosed in $...$ (e.g. $\\frac{a}{b}$, $\\div$, $\\neq$, $\\sqrt{x}$, $y = x^4 - 4x^2$).
5. Categorize each problem into its curriculum topic (e.g., "Rational Functions & Expressions", "Polynomial Equations & Functions", "Trigonometric Functions", "Exponential & Logarithmic Functions", "Calculus & Rates of Change").
6. Assign a difficulty rating from 1 to 10.
7. IMMEDIATE JSON ONLY: Begin your response directly with {"questions": on the very first character. Do NOT output conversational preambles, introductory commentary, or conclusions.

Return strictly valid JSON matching this schema:
{
  "questions": [
    {
      "id": "C3",
      "text": "Sketch the graph of a quartic function that: a) has line symmetry, b) does not have line symmetry",
      "difficulty": 5,
      "type": "Polynomial Equations & Functions"
    }
  ]
}`;

    const userPrompt =
      "Analyze this screenshot and identify all distinct math questions and exercises (preserving labels like C1, C2, C3, C4 or 1a, 2b). Make sure all subparts (a, b, c) are completely included in each question. Return strictly valid JSON starting with { on the first character.";

    const useNvidia = Boolean(process.env.NVIDIA_API_KEY || !process.env.GROQ_API_KEY);
    const model = useNvidia
      ? (process.env.NVIDIA_VISION_MODEL || NVIDIA_VISION_MODEL)
      : "meta-llama/llama-4-scout-17b-16e-instruct";

    let content: string | null = null;

    if (useNvidia) {
      try {
        const completion = await nvidia.chat.completions.create(
          {
            messages: [
              { role: "system", content: systemPrompt },
              {
                role: "user",
                content: [
                  { type: "text", text: userPrompt },
                  {
                    type: "image_url",
                    image_url: {
                      url: `data:${mimeType};base64,${base64Data}`,
                    },
                  },
                ],
              },
            ],
            model,
            max_tokens: 2500,
            temperature: 0.1,
          },
          { timeout: 60000 }
        );
        content = completion.choices[0]?.message?.content || null;
      } catch (nvidiaErr) {
        if (process.env.GROQ_API_KEY) {
          console.warn("NVIDIA Vision failed, falling back to Groq Vision:", nvidiaErr);
          const fallback = await groq.chat.completions.create({
            messages: [
              { role: "system", content: systemPrompt },
              {
                role: "user",
                content: [
                  { type: "text", text: userPrompt },
                  {
                    type: "image_url",
                    image_url: {
                      url: `data:${mimeType};base64,${base64Data}`,
                    },
                  },
                ],
              },
            ],
            model: "meta-llama/llama-4-scout-17b-16e-instruct",
            response_format: { type: "json_object" },
            temperature: 0.1,
          });
          content = fallback.choices[0]?.message?.content || null;
        } else {
          throw nvidiaErr;
        }
      }
    } else {
      const completion = await groq.chat.completions.create({
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: userPrompt },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${base64Data}`,
                },
              },
            ],
          },
        ],
        model: "meta-llama/llama-4-scout-17b-16e-instruct",
        response_format: { type: "json_object" },
        temperature: 0.1,
      });
      content = completion.choices[0]?.message?.content || null;
    }

    if (!content) {
      throw new Error("Empty response from AI vision model");
    }

    console.log("AI vision raw response:", content);
    const data = extractJson<{ questions: unknown[] }>(content, "questions");
    return NextResponse.json(data);
  } catch (error) {
    console.error("AI vision processing error:", error);


    const message = error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

