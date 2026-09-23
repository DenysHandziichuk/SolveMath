import { NextRequest, NextResponse } from "next/server";
import { nvidia, NVIDIA_DEFAULT_MODEL, NVIDIA_FALLBACK_MODEL } from "@/lib/nvidia";
import { groq } from "@/lib/groq";
import { extractJson, generateCurriculumSolution, isGeometryOrGraphingTask } from "@/lib/json-extractor";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let questionText = "Simplify the expression and identify all variable restrictions.";
  let questionTopic = "Advanced Functions";

  try {
    const { question } = await req.json();

    if (!question) {
      return NextResponse.json({ error: "No question provided" }, { status: 400 });
    }

    questionText =
      typeof question === "string"
        ? question
        : question.text || question.prompt || JSON.stringify(question);

    questionTopic =
      typeof question === "object" && question?.type ? question.type : "Advanced Functions";

    const needsGraph = isGeometryOrGraphingTask(questionText, questionTopic);

    const systemPrompt = `You are an expert mathematics educator and presentation designer.
Generate an authentic, clear, and student-friendly classroom presentation that solves this problem.
Topic: ${questionTopic}
Problem Classification: ${needsGraph ? "Geometry / Graphing / Visual Representation" : "Pure Algebra / Symbolic Manipulation"}

TONE AND LANGUAGE GUIDELINES (MAKE IT SOUND HUMAN, NOT AI):
- Write like a real teacher speaking and writing on a whiteboard: clear, simple, and direct.
- Avoid robotic AI phrases and cliches. NEVER include headers or bullet points like "Key Takeaways", "Governing Conditions", "Governing Mathematical Conditions", "Formal Mathematical Justification", or "Problem Formulation".
- Do NOT invent extra problem instructions. Never say "State all governing mathematical conditions" unless the user's question explicitly asks for that.
- Keep the language simple and easy for students to read at a glance, but ALWAYS use correct mathematical terms naturally (e.g. domain, range, restrictions, reciprocal, factor, cancel, common factors, degree, leading coefficient, asymptote, intercept, evaluate).
- Speaker notes (notes): Write natural, conversational script that sounds like a friendly human teacher speaking to students.

SLIDE STRUCTURE (${needsGraph ? "EXACTLY 4 SLIDES — GRAPH HELPS SHOW SOLUTION" : "EXACTLY 3 SLIDES — NO GRAPH NEEDED, PURE ALGEBRA"}):
${
  needsGraph
    ? `1. Slide 1: "Problem Statement" (type: "intro")
   - State the problem clearly using $...$ and $$...$$.
   - List what is given and what we need to solve or graph.
   - Notes: Natural 1-2 sentence spoken intro framing the question.
2. Slide 2: "Solution of the Problem" (type: "solution")
   - Show the step-by-step mathematical work with clear steps.
   - Notes: Friendly teacher script guiding students through the derivation.
3. Slide 3: "Evidence" (type: "graph")
   - Visual evidence: Explain how the graph shows and verifies the solution (key points, intercepts, asymptotes, or turning points).
   - Notes: Spoken notes pointing students to what the graph reveals.
4. Slide 4: "Conclusion" (type: "conclusion")
   - State the final answer clearly in a \\boxed{...}.
   - Summarize the final result simply and cleanly (NO "Key Takeaways" header).
   - Notes: Short concluding spoken takeaway.`
    : `1. Slide 1: "Problem Statement" (type: "intro")
   - State the problem clearly using $...$ and $$...$$.
   - List what is given and what we need to find or simplify.
   - Notes: Natural 1-2 sentence spoken intro framing the problem.
2. Slide 2: "Solution of the Problem" (type: "solution")
   - Show the step-by-step algebraic steps cleanly and simply.
   - Use clear steps (e.g. Step 1, Step 2) with brief, direct explanations.
   - Notes: Friendly teacher script explaining the algebraic steps.
3. Slide 3: "Conclusion" (type: "conclusion")
   - State the final simplified answer in a \\boxed{...}.
   - State any restrictions or final values clearly (NO "Key Takeaways" header).
   - Notes: Short concluding sentence wrapping up the result.
   (IMPORTANT: Do NOT include an Evidence slide — evidence is only needed if a graph helps to show the solution).`
}

Return raw JSON matching this structure:
{
  "explanation": "Brief summary of the solution",
  "slides": [
    {
      "title": "Problem Statement",
      "subtitle": "${questionTopic}",
      "content": "Given: ...\\nFind: ...",
      "notes": "Natural spoken notes for slide 1",
      "type": "intro"
    },
    {
      "title": "Solution of the Problem",
      "subtitle": "Step-by-Step Solution",
      "content": "Step 1: ...\\nStep 2: ...",
      "notes": "Natural spoken notes for slide 2",
      "type": "solution"
    }${needsGraph ? `,
    {
      "title": "Evidence",
      "subtitle": "Visual Graph Verification",
      "content": "Points / intercepts / asymptotes shown on graph...",
      "notes": "Natural spoken notes for slide 3",
      "type": "graph"
    }` : ""},
    {
      "title": "Conclusion",
      "subtitle": "Final Answer",
      "content": "Final Answer: ...",
      "notes": "Natural spoken notes for final slide",
      "type": "conclusion"
    }
  ]${needsGraph ? `,
  "graphData": {
    "type": "function",
    "equation": "f(x) = ...",
    "isRadian": false,
    "functions": [{"equation": "...", "mathjs": "...", "color": "#38bdf8"}],
    "asymptotes": [],
    "holes": [],
    "properties": []
  }` : ""}
}

STRICT CONSTRAINTS:
- EXACTLY ${needsGraph ? "4 slides" : "3 slides"} in the slides array.
- Slide titles MUST be: ${needsGraph ? '"Problem Statement", "Solution of the Problem", "Evidence", and "Conclusion"' : '"Problem Statement", "Solution of the Problem", and "Conclusion"'}.
- Slide types MUST be: ${needsGraph ? '"intro", "solution", "graph", and "conclusion"' : '"intro", "solution", and "conclusion"'}.
- SOLVE the actual math problem directly. Never output generic placeholders.
- Use $...$ for inline math, $$...$$ for display math in content strings.
- Use \\n to separate lines in content strings.
- Respond with raw JSON only. No markdown fences, no conversational preamble.`;

    const userPrompt = needsGraph
      ? `Solve this step-by-step and generate the 4-slide presentation with graph evidence:\n${questionText}`
      : `Solve this step-by-step and generate the 3-slide presentation:\n${questionText}`;

    const useNvidia = Boolean(process.env.NVIDIA_API_KEY || !process.env.GROQ_API_KEY);
    const primaryModel = process.env.NVIDIA_MODEL || NVIDIA_DEFAULT_MODEL;

    let content: string | null = null;

    if (useNvidia) {
      try {
        const completion = await nvidia.chat.completions.create(
          {
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            model: primaryModel,
            max_tokens: 1500,
            temperature: 0.15,
          },
          { timeout: 45000 }
        );
        content = completion.choices[0]?.message?.content || null;
      } catch (nvidiaErr) {
        console.warn(`Primary model ${primaryModel} failed or timed out:`, nvidiaErr);
        if (process.env.GROQ_API_KEY) {
          try {
            const groqFallback = await groq.chat.completions.create(
              {
                messages: [
                  { role: "system", content: systemPrompt },
                  { role: "user", content: userPrompt },
                ],
                model: "llama-3.3-70b-versatile",
                response_format: { type: "json_object" },
                max_tokens: 1500,
                temperature: 0.15,
              },
              { timeout: 20000 }
            );
            content = groqFallback.choices[0]?.message?.content || null;
          } catch (groqErr) {
            console.warn("Groq fallback also failed:", groqErr);
          }
        }
      }
    } else {
      const completion = await groq.chat.completions.create({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        model: "llama-3.3-70b-versatile",
        response_format: { type: "json_object" },
        max_tokens: 3500,
        temperature: 0.15,
      });
      content = completion.choices[0]?.message?.content || null;
    }

    if (!content) {
      throw new Error("Empty response from language model");
    }

    const data = extractJson(content, "solution", questionText, questionTopic);
    return NextResponse.json(data);
  } catch (error) {
    console.warn("External model calls failed or timed out, generating curriculum solution fallback:", error);
    const fallbackData = generateCurriculumSolution(questionText, questionTopic);
    return NextResponse.json(fallbackData);
  }
}
