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

    const systemPrompt = `You are an elite mathematics professor and presentation designer.
Generate an authentic 5-slide classroom presentation that SOLVES this problem step-by-step.
Topic: ${questionTopic}
Problem Classification: ${needsGraph ? "Geometry / Graphing / Visual Representation" : "Pure Algebra / Symbolic Manipulation"}

Return JSON with this structure:
{
  "explanation": "Brief summary",
  "slides": [
    {
      "title": "...",
      "subtitle": "${questionTopic}",
      "content": "Line 1\\nLine 2",
      "notes": "2-sentence speaker script",
      "type": "intro|concept|derivation|${needsGraph ? "graph" : "derivation"}|summary"
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

CRITICAL RULES:
- Exactly 5 slides:
  1: Problem Statement
  2: Setup & Restrictions / Governing Principles
  3: Step-by-Step Algebraic Derivation
  4: ${needsGraph ? "Graph & Visual Verification (include visual coordinate graph)" : "Algebraic Verification & Equivalence Check (DO NOT include graph, verify algebraically)"}
  5: Final Answer & Summary
- GRAPH RULE: ${needsGraph ? 'Include "graphData" because this is a geometry / curve sketching problem.' : 'DO NOT include "graphData" (set graphData to null or omit it) because this is a purely algebraic problem where a graph is unnecessary and irrelevant.'}
- SOLVE the problem with REAL math. Show actual expressions, actual values, and actual steps.
- Use $...$ for inline math, $$...$$ for display math in content strings.
- Use \\n to separate lines in content strings.
- Respond with raw JSON only. No markdown, no backticks.`;

    const userPrompt = `Solve this step-by-step and generate presentation slides:\n${questionText}`;

    const useNvidia = Boolean(process.env.NVIDIA_API_KEY || !process.env.GROQ_API_KEY);
    const primaryModel = process.env.NVIDIA_MODEL || NVIDIA_DEFAULT_MODEL;
    const fallbackModel = NVIDIA_FALLBACK_MODEL || "mistralai/mistral-large-2-instruct";

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
            max_tokens: 2200,
            temperature: 0.15,
          },
          { timeout: 15000 }
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
                max_tokens: 2200,
                temperature: 0.15,
              },
              { timeout: 10000 }
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
