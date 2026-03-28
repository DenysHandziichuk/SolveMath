import { NextRequest, NextResponse } from "next/server";
import { groq } from "@/lib/groq";

export async function POST(req: NextRequest) {
  try {
    const { question } = await req.json();

    if (!question) {
      return NextResponse.json({ error: "No question provided" }, { status: 400 });
    }

    const systemPrompt = `You are a world-class math tutor. Provide a detailed, pedagogical solution to the math question provided. 

### SLIDE RULES (STRICT):
- Total slides: 4-6 ONLY.
- Each slide MUST contain 4-5 lines of content.
- Each line MUST be a complete, simple statement.
- CONCLUDING: You must only have ONE final/conclusion slide. Never use two summary or final slides.
- Formatting: Use '\n' between every statement so they appear on separate lines.
- Use simple English. NEVER use $ symbols or LaTeX.
- IMPORTANT: NEVER use \frac, curly braces {}, or LaTeX notation. 
- Math Formatting: Use plain readable math ONLY (e.g., 'y = 2^x', 'x/2 = 4'). 
- If you need to show division, use the forward slash (/). 
- NEVER wrap math in any special characters.

### SCRIPT RULES (STRICT):
- The 'notes' (script) MUST match the slide content but use DIFFERENT words.
- LENGTH: Each slide script MUST be between 20 and 30 words total.
- FORMATTING: Every slide script MUST be a SINGLE, continuous paragraph. 
- LANGUAGE: Use simple, clear English but keep essential mathematical terms.
- Keep it punchy and meaningful. Total presentation under 2 minutes.

### OUTPUT FORMAT (STRICT JSON):
{
  "explanation": "Simple overview",
  "slides": [
    {
      "title": "Title",
      "content": "Statement one.\\nStatement two.",
      "notes": "Talking point for statement one.\\nTalking point for statement two."
    }
  ],
  "graphData": { "type": "string", "equation": "string", "points": [{"x": number, "y": number}] }
}
For 'points', generate 30-50 coordinates for x between -10 and 10. Ensure it feels like a simple school talk.`;

    const userPrompt = `Please solve this question: ${question.text}`;

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: userPrompt,
        },
      ],
      model: "llama-3.3-70b-versatile",
      response_format: { type: "json_object" },
      temperature: 0.2,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Empty response from Groq");
    }

    const data = JSON.parse(content);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Groq solving error:", error);
    const message = error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
