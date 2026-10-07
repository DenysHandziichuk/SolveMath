import { NextRequest, NextResponse } from "next/server";
import { nvidia, NVIDIA_DEFAULT_MODEL, NVIDIA_FALLBACK_MODEL } from "@/lib/nvidia";
import { groq } from "@/lib/groq";
import { extractJson, generateCurriculumSolution, getQuestionPartLabels, isGeometryOrGraphingTask } from "@/lib/json-extractor";

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
    const partLabels = getQuestionPartLabels(questionText);
    const maxTokens = Math.min(12000, Math.max(3500, 2000 + partLabels.length * 1000));
    const partRequirement = partLabels.length > 1
      ? `Required subparts, in order: ${partLabels.join(", ")}. Include at least ${partLabels.length} Solution slides, one for EACH label, and include every final answer in the Conclusion.`
      : "Identify and solve every requested task, including any subparts in the question.";

    const systemPrompt = `You are an expert mathematics educator and presentation designer.
Generate an authentic, clear, mathematically rigorous, and student-friendly classroom presentation that solves this problem.
Topic: ${questionTopic}

SLIDE DESIGN & FIT RULES:
- SLIDE FIT CONSTRAINT:
  - All content on each slide MUST fit comfortably within a standard 16:9 presentation slide without overflowing or requiring vertical scrolling.
  - Limit content on each slide to 4-6 clean bullet points or derivations.

- NUMBER OF SLIDES:
  - STANDARD 1-PART PROBLEMS: Exactly 3 slides ("Problem", "Solution", "Conclusion").
  - MULTI-PART PROBLEMS: Create at least ONE Solution slide for EACH subpart, in its original order. Use as many slides as needed to solve ALL parts completely. For example, a question with a) through f) needs at least 8 slides: Problem, six Solution slides, Conclusion.
  - LENGTHY EXPLANATIONS: Add further Solution slides when needed to keep each slide readable. There is no fixed maximum slide count; NEVER shorten a deck by omitting a subpart.
  - ${partRequirement}

- SLIDE 1: "Problem" (type: "intro")
  - Title MUST be "Problem".
  - Subtitle: "${questionTopic}".
  - Content MUST ONLY state the COMPLETE exact problem statement, shared instructions, and EVERY subpart, with its original label. Put each subpart on a separate line.
  - NEVER include extraneous background lectures, "Key Definitions & Concepts", general formulas, "Given / Find", or "Identify given values".
  - Speaker notes ('notes'): Natural spoken teacher introduction framing the question.

- SOLUTION SLIDE(S): Title MUST be "Solution" (type: "solution")
  - For 1-part problems: 1 Solution slide (Subtitle: "Explanation" or "Step-by-Step Solution").
  - For multi-part problems: at least one Solution slide per subpart. Subtitle: "Part [original label]: [Topic]" (e.g., "Part a: Instantaneous Speed", "Part f: Temperature Change", or "Part ii: Explanation"). Include further slides for a part if necessary.
  - Content: Comprehensive, step-by-step mathematical explanation / derivation. Thorough, elegant, and 100% mathematically correct. Use $...$ for inline math and $$...$$ for display equations. Wrap only genuine math expressions in $...$ (e.g. $f(x) = x^2$); never put regular English words or full sentences inside $...$.
  - MULTI-PART PROBLEMS: You MUST thoroughly solve EVERY part, with its own answer and reasoning. Check all subpart labels against the original question before returning the deck.
  - Speaker notes ('notes'): Complete teacher script guiding students step-by-step through the derivation.

- FINAL SLIDE: "Conclusion" (type: "conclusion")
  - Title MUST be "Conclusion".
  - Subtitle: "Summary".
  - Content: Clear, concise summary of the solution, stating the core takeaway and final answers clearly for ALL subtasks (e.g. in \\boxed{...} or bold direct statements). Preserve the original labels so each final answer maps to its subpart.
  - Speaker notes ('notes'): Concluding spoken takeaway summarizing the lesson.

Return raw JSON matching this structure. The slides array below shows a single-part example; insert all required Solution slides before the Conclusion for multi-part problems:
{
  "explanation": "Brief summary of the solution",
  "slides": [
    {
      "title": "Problem",
      "subtitle": "${questionTopic}",
      "content": "...",
      "notes": "Natural spoken notes for slide 1",
      "type": "intro"
    },
    {
      "title": "Solution",
      "subtitle": "Part [label]: [Topic] or Explanation",
      "content": "...",
      "notes": "Natural spoken notes for solution slide",
      "type": "solution"
    },
    {
      "title": "Conclusion",
      "subtitle": "Summary",
      "content": "...",
      "notes": "Natural spoken notes for slide 3",
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
- 3 slides for short single-part problems. For multi-part or lengthy problems, include as many Solution slides as needed to cover every part and keep slides readable.
- Slide titles MUST be: "Problem", "Solution", and "Conclusion".
- Slide types MUST be: "intro", "solution", and "conclusion".
- Use $...$ for inline math, $$...$$ for display math in content strings. NEVER wrap regular English words or full sentences inside $...$.
- Respond with raw JSON only. No markdown fences, no conversational preamble.`;

    const userPrompt = `Solve this COMPLETE problem step-by-step and generate the presentation (Problem, one or more Solution slides for EVERY subpart, Conclusion). ${partRequirement}\n${questionText}`;

    const useNvidia = Boolean(process.env.NVIDIA_API_KEY || !process.env.GROQ_API_KEY);
    const primaryModel = process.env.NVIDIA_MODEL || NVIDIA_DEFAULT_MODEL;
    const fallbackModel = NVIDIA_FALLBACK_MODEL;

    let content: string | null = null;

    if (useNvidia) {
      // 1. Primary Model: Nemotron 3 Ultra 550B
      try {
        console.log(`[Solve] Calling primary model: ${primaryModel}`);
        const completion = await nvidia.chat.completions.create(
          {
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            model: primaryModel,
            max_tokens: maxTokens,
            temperature: 0.15,
          },
          { timeout: 60000 }
        );
        content = completion.choices[0]?.message?.content || null;
      } catch (primaryErr) {
        console.warn(`[Solve] Primary model ${primaryModel} failed:`, primaryErr);
      }

      // 2. Fallback Model: Kimi K3
      if (!content && fallbackModel && fallbackModel !== primaryModel) {
        try {
          console.log(`[Solve] Trying fallback model: ${fallbackModel}`);
          const fallbackCompletion = await nvidia.chat.completions.create(
            {
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
              ],
              model: fallbackModel,
              max_tokens: maxTokens,
              temperature: 0.15,
            },
            { timeout: 45000 }
          );
          content = fallbackCompletion.choices[0]?.message?.content || null;
        } catch (fbErr) {
          console.warn(`[Solve] Fallback model ${fallbackModel} failed:`, fbErr);
        }
      }

      // 3. Vision/Instruct Fallback: Llama 3.2 11B
      if (!content) {
        try {
          console.log("[Solve] Trying Llama 3.2 11B fallback");
          const visionCompletion = await nvidia.chat.completions.create(
            {
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
              ],
              model: "meta/llama-3.2-11b-vision-instruct",
              max_tokens: maxTokens,
              temperature: 0.15,
            },
            { timeout: 30000 }
          );
          content = visionCompletion.choices[0]?.message?.content || null;
        } catch (vErr) {
          console.warn("[Solve] Llama 3.2 11B fallback failed:", vErr);
        }
      }

      // 4. Groq Fallback if key available
      if (!content && process.env.GROQ_API_KEY) {
        try {
          console.log("[Solve] Trying Groq fallback");
          const groqFallback = await groq.chat.completions.create(
            {
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
              ],
              model: "llama-3.3-70b-versatile",
              response_format: { type: "json_object" },
              max_tokens: maxTokens,
              temperature: 0.15,
            },
            { timeout: 25000 }
          );
          content = groqFallback.choices[0]?.message?.content || null;
        } catch (groqErr) {
          console.warn("[Solve] Groq fallback failed:", groqErr);
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
        max_tokens: maxTokens,
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
