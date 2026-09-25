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

    const isComparison = /\b(compare|contrast|similarities|symmetry|versus|vs|cases?|a\).*b\))\b/i.test(questionText) ||
      /quartic.*symmetry/i.test(questionText);

    const systemPrompt = `You are an expert mathematics educator and presentation designer.
Generate an authentic, clear, and student-friendly classroom presentation that solves this problem.
Topic: ${questionTopic}
Problem Classification: ${needsGraph ? (isComparison ? "Comparative Graphing / Multi-Function Analysis" : "Geometry / Graphing / Visual Representation") : "Pure Algebra / Symbolic Manipulation"}

CRITICAL SLIDE DESIGN RULES (STRICTLY CONCISE SLIDES, NO TEXT CLUTTER, NO SCROLLBARS):
- SLIDE 1: "Problem Statement" (type: "intro")
  - MUST ONLY contain the exact problem statement chosen by the user!
  - NEVER include extraneous background lectures, "Key Definitions & Concepts", general formulas, or textbook definitions on Slide 1.
  - Keep it clean, direct, and concise so it fits beautifully without any vertical scrolling.
  - Put the spoken classroom introduction into the speaker notes ('notes').
- SLIDE 2: "Solution of the Problem" (type: "solution")
  - Keep the written text CONCISE ("a bit of wording").
  - Present the essential algebraic steps and formulas clearly (use $...$ and $$...$$).
  - DO NOT output giant walls of text, dense paragraphs, or repetitive bullet points.
  - Detailed teacher explanations and oral steps MUST go into the speaker notes ('notes'), NOT into the slide content!
- SLIDE 3: "Evidence" (type: "graph")
  - Focus is the visual graph evidence!
  - The written content must be 2-3 short bullet observations highlighting what the graph shows (e.g. axis of symmetry, turning points, roots).
- SLIDE 4: "Conclusion" (type: "conclusion")
  - Final answer clearly stated in \\boxed{...}.
  - 1 or 2 concise summary bullet points.
  - Concluding verbal takeaway in the speaker notes ('notes').

TONE AND RUBRIC GUIDELINES (MEET 5/5 EXCEED EXPECTATIONS):
- Oral Communication (notes): Write complete, concise, articulate speaker notes for every slide. Guide students naturally through the reasoning.
- Written Reasoning & Visuals: Clean mathematical expressions ($f(-x) = f(x)$, $x \\in \\mathbb{R}$, degree, line of symmetry $x = h$, turning points, end behavior).
- When a problem asks to sketch or compare two functions (e.g. C3 quartic with line symmetry vs without line symmetry, or C1 odd vs even functions):
  You MUST provide TWO separate graphs in the 'graphs' array on the Evidence slide or root so they can be compared side-by-side on the same slide!
  - Case (a) Quartic with line symmetry: Choose $f(x) = x^4 - 4x^2$ (only even powers, symmetric W-shape, axis of symmetry $x = 0$, symmetric minima at $(\\pm\\sqrt{2}, -4)$). Include "symmetryAxis": 0.
  - Case (b) Quartic WITHOUT line symmetry: Choose $g(x) = 0.5x^4 + x^3 - 2x^2 - x + 1$ (odd powers with unequal minima depths $y \\approx -2.71$ vs $y \\approx -0.44$, breaking symmetry). DO NOT choose an even polynomial like $x^4 - 2x^2 + 1$ which is symmetric!
- CRITICAL MATHJS FORMAT:
  - The "mathjs" field MUST be a clean mathjs formula like "x^4 - 4*x^2" or "0.5*x^4 + x^3 - 2*x^2 - x + 1".
  - NEVER put MathJax, JavaScript, LaTeX commands (\\frac, \\left), or HTML in mathjs.

SLIDE STRUCTURE (${needsGraph ? "EXACTLY 4 SLIDES — GRAPH EVIDENCE INCLUDED" : "EXACTLY 3 SLIDES — PURE ALGEBRA"}):
${
  needsGraph
    ? `1. Slide 1: "Problem Statement" (type: "intro")
   - State ONLY the problem that was chosen clearly using $...$ and $$...$$. No extraneous concepts or general formulas.
   - Notes: Natural 2-3 sentence spoken intro framing the question.
2. Slide 2: "Solution of the Problem" (type: "solution")
   - Show concise algebraic steps and equations ("a bit of wording").
   - For symmetry questions, test $f(-x) = f(x)$ vs $g(-x) \\neq g(x)$.
   - Notes: Complete teacher script guiding students through the derivation.
3. Slide 3: "Evidence" (type: "graph")
   - Visual graph comparison: 2-3 concise bullets on what the graphs show.
   - Notes: Spoken notes comparing the visual curves side-by-side.
4. Slide 4: "Conclusion" (type: "conclusion")
   - State final formulas clearly in \\boxed{...} with 1-2 core takeaways.
   - Notes: Short concluding spoken takeaway.`
    : `1. Slide 1: "Problem Statement" (type: "intro")
   - State ONLY the problem that was chosen clearly using $...$ and $$...$$.
   - Notes: Spoken intro framing the problem.
2. Slide 2: "Solution of the Problem" (type: "solution")
   - Show concise algebraic steps and equations ("a bit of wording").
   - Notes: Teacher script explaining the algebraic steps.
3. Slide 3: "Conclusion" (type: "conclusion")
   - State the final simplified answer in a \\boxed{...}.
   - Notes: Short concluding sentence wrapping up the result.`
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
      "subtitle": "Visual Graph Comparison",
      "content": "Key features shown on graphs...",
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
  ]${needsGraph ? (isComparison ? `,
  "graphs": [
    {
      "title": "Case (a): Line Symmetry (x = 0)",
      "equation": "f(x) = x^4 - 4x^2",
      "symmetryAxis": 0,
      "bounds": { "minX": -3.5, "maxX": 3.5, "minY": -5.5, "maxY": 6 },
      "functions": [{ "equation": "f(x) = x^4 - 4x^2", "mathjs": "x^4 - 4*x^2", "color": "#38bdf8" }],
      "properties": [{ "name": "Axis of Symmetry", "value": "x = 0" }, { "name": "Minima", "value": "(\\pm\\sqrt{2}, -4)" }]
    },
    {
      "title": "Case (b): No Line Symmetry",
      "equation": "g(x) = 0.5x^4 + x^3 - 2x^2 - x + 1",
      "bounds": { "minX": -3.5, "maxX": 2.5, "minY": -4, "maxY": 6 },
      "functions": [{ "equation": "g(x) = 0.5x^4 + x^3 - 2x^2 - x + 1", "mathjs": "0.5*x^4 + x^3 - 2*x^2 - x + 1", "color": "#10b981" }],
      "properties": [{ "name": "Axis of Symmetry", "value": "None" }, { "name": "Unequal Minima", "value": "y ≈ -2.71 vs -0.44" }]
    }
  ]` : `,
  "graphData": {
    "type": "function",
    "equation": "f(x) = ...",
    "isRadian": false,
    "functions": [{"equation": "...", "mathjs": "...", "color": "#38bdf8"}],
    "asymptotes": [],
    "holes": [],
    "properties": []
  }`) : ""}
}

STRICT CONSTRAINTS:
- EXACTLY ${needsGraph ? "4 slides" : "3 slides"} in the slides array.
- Slide titles MUST be: ${needsGraph ? '"Problem Statement", "Solution of the Problem", "Evidence", and "Conclusion"' : '"Problem Statement", "Solution of the Problem", and "Conclusion"'}.
- Slide types MUST be: ${needsGraph ? '"intro", "solution", "graph", and "conclusion"' : '"intro", "solution", and "conclusion"'}.
- Always provide valid pure mathematical formulas for "mathjs" (e.g. "x^4 - 4*x^2").
- Use $...$ for inline math, $$...$$ for display math in content strings.
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
