import { NextRequest, NextResponse } from "next/server";
import { groq } from "@/lib/groq";
import { requestSolutionCompletion } from "@/lib/solution-completion";
import { getQuestionPartLabels, isGeometryOrGraphingTask } from "@/lib/json-extractor";

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

LANGUAGE & TONE:
- Write the explanation, subtitles, slide content, and speaker notes in plain, modern English, like a teacher explaining the work out loud to a student.
- Use short, direct sentences and everyday connecting words: "so", "because", "then", and "this means".
- Do not use formal transitions such as "thus", "hence", "therefore", "consequently", "thereby", "furthermore", or "moreover". For example, write "So x = 4" instead of "Thus, x = 4".
- Keep precise mathematical terms and theorem names. Write "if and only if" instead of the abbreviation "iff" in explanations.
- Preserve the original problem statement exactly, even if it uses formal language. These language rules apply to the explanation you generate.

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
- JSON-escape every LaTeX backslash. For example, the JSON content string must contain "$x \\\\neq 0$" so parsing preserves the LaTeX command. Use JSON newline escapes between steps and keep each math delimiter pair on the same line.
- Use the correct named theorem and verify final answers by substitution or expansion when applicable. Show the actual calculation; avoid generic claims that a solution has been verified.
- Put detailed spoken explanations in notes. Keep slide content to short, complete mathematical steps with ordinary prose outside the math delimiters.
- Start EVERY labeled item (A:, B:, a), b), 1., 2., etc.) on its own new line. Keep each label and its first equation together. Never append the next item after a semicolon on the previous item's line.
- Respond with raw JSON only. No markdown fences, no conversational preamble.`;

    const userPrompt = `Solve this COMPLETE problem step-by-step and generate the presentation (Problem, one or more Solution slides for EVERY subpart, Conclusion). ${partRequirement}\n${questionText}`;

    const data = await requestSolutionCompletion(
      {
        questionText, questionTopic, systemPrompt, userPrompt, maxTokens,
      },
      {
        groq: process.env.GROQ_API_KEY ? groq : undefined,
      }
    );
    return NextResponse.json(data);
  } catch (error) {
    console.warn("Groq presentation generation failed:", error);
    return NextResponse.json(
      { error: "A complete solution could not be generated right now. Please try again shortly." },
      { status: 503, headers: { "Retry-After": "5" } }
    );
  }
}
