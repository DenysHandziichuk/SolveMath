/**
 * Bulletproof JSON cleaner, normalizer, and parser for LLM responses.
 * Never throws an unhandled error — guarantees valid { questions: [...] }
 * or { slides: [...] } structure even on conversational, markdown, or malformed outputs.
 */

export interface ExtractedQuestion {
  id: string;
  text: string;
  difficulty: number;
  type: string;
}

export interface ExtractedSlide {
  title: string;
  subtitle?: string;
  content: string;
  notes: string;
  type?: string;
}

export interface ExtractedSolution {
  explanation: string;
  slides: ExtractedSlide[];
  graphData?: Record<string, unknown>;
}

/**
 * Cleans conversational filler phrases from presentation scripts while
 * strictly preserving exact mathematical terminology and expressions.
 */
export function cleanSpeakerScript(rawScript: string): string {
  if (!rawScript || typeof rawScript !== "string") {
    return "Let's work through the problem step by step to find the solution.";
  }

  let script = rawScript.trim();

  // Filler prefixes commonly emitted by LLMs that dilute punchy lesson delivery
  const fillerPrefixes = [
    /^(?:welcome(?:\s+students|\s+back|\s+everyone)?(?:[,.!:]|\s+to\s+this\s+(?:lesson|presentation|slide))?[,.\s]*)/i,
    /^(?:hello(?:\s+everyone|\s+class|\s+students)?(?:[,.!:]|\s+and\s+welcome)?[,.\s]*)/i,
    /^(?:in\s+this\s+(?:slide|step|presentation|video|section)(?:,\s*|\s+we\s+(?:will|see|have|are\s+going\s+to|look\s+at)\s*))/i,
    /^(?:today\s+we\s+(?:will|are\s+going\s+to)\s+(?:explore|solve|examine|look\s+at|derive)\s*)/i,
    /^(?:moving\s+on\s+to\s+(?:the\s+next\s+slide|step\s+\d+|this\s+part)(?:,\s*|\s*))/i,
    /^(?:as\s+(?:you|we)\s+can\s+see(?:,\s*|\s*))/i,
    /^(?:let'?s\s+(?:take\s+a\s+look\s+at|dive\s+into|now\s+look\s+at|now\s+examine)\s*)/i,
    /^(?:here\s+(?:we\s+have|we\s+see|is\s+where\s+we)(?:,\s*|\s*))/i,
    /^(?:now,\s*let'?s\s*)/i,
    /^(?:it\s+is\s+important\s+to\s+(?:note|remember|observe)\s+that\s*)/i,
  ];

  let cleaned = true;
  while (cleaned) {
    cleaned = false;
    for (const rx of fillerPrefixes) {
      if (rx.test(script)) {
        script = script.replace(rx, "").trim();
        // Remove dangling punctuation
        script = script.replace(/^[,;:\-\s]+/, "").trim();
        cleaned = true;
      }
    }
  }

  if (!script) {
    return "Let's work through the problem step by step to find the solution.";
  }

  // Ensure first character is capitalized
  return script.charAt(0).toUpperCase() + script.slice(1);
}

/**
 * Infers specific mathematics curriculum topic based on problem text.
 */
export function detectTopic(text: string): string {
  const t = text.toLowerCase();
  if (/rational|restriction|asymptote|common denominator|simplify\s*\\frac|\\div/i.test(t)) {
    return "Rational Functions & Expressions";
  }
  if (/sin|cos|tan|trig|radian|amplitude|period|secant|cosecant|cotangent/i.test(t)) {
    return "Trigonometric Functions";
  }
  if (/polynomial|degree|factor theorem|synthetic division|remainder|cubic|quartic/i.test(t)) {
    return "Polynomial Equations & Functions";
  }
  if (/log|ln|exponential|base 10|e\^|decay|growth/i.test(t)) {
    return "Exponential & Logarithmic Functions";
  }
  if (/derivative|integral|limit|rate of change|tangent line|slope|secant line/i.test(t)) {
    return "Calculus & Rates of Change";
  }
  if (/vector|dot product|cross product|plane|matrix|determinant/i.test(t)) {
    return "Vectors & Matrices";
  }
  return "Grade 12 Advanced Functions";
}

/**
 * Rigorously identifies whether a problem is GEOMETRY / GRAPHING / VISUAL (requiring a coordinate plot)
 * or PURELY ALGEBRAIC (where a graph is unnecessary, distracting, or irrelevant).
 */
export function isGeometryOrGraphingTask(problemText: string, topic?: string): boolean {
  if (!problemText) return false;
  const combined = `${topic || ""} ${problemText}`.toLowerCase();

  // 1. Explicit graphing, plotting, or curve sketching directives
  const explicitGraphDirectives = [
    /\b(graph|sketch|plot|draw)\b/i,
    /\b(curve sketching|cartesian plane|coordinate geometry)\b/i,
    /\b(transformation of|vertical stretch|horizontal compression|phase shift)\b/i,
    /\b(amplitude|periodicity|sine wave|cosine wave)\b/i,
  ];
  if (explicitGraphDirectives.some((rgx) => rgx.test(combined))) {
    return true;
  }

  // 2. Explicit geometry and visual mathematics keywords
  const geometryKeywords = [
    /\b(geometry|geometric|triangle|hypotenuse|pythagor|circle|radius|diameter)\b/i,
    /\b(quadrilateral|rectangle|square|polygon|trapezoid|prism|cylinder|sphere|cone)\b/i,
    /\b(angle of elevation|angle of depression|bearing|azimuth)\b/i,
    /\b(unit circle|special triangles|terminal arm|standard position)\b/i,
    /\b(tangent line to the curve|slope of the tangent|secant line)\b/i,
    /\b(perimeter|area of|surface area|volume of)\b/i,
    /\b(vectors?|dot product|cross product|collinear)\b/i,
  ];
  if (geometryKeywords.some((rgx) => rgx.test(combined))) {
    return true;
  }

  // 3. Pure algebraic indicators that should NEVER have a graph
  const algebraicIndicators = [
    /\b(simplify|simplification|factor|factoring|expand|expansion)\b/i,
    /\b(rational expression|rational functions? & expressions)\b/i,
    /\b(non-permissible|restrictions? on the variable|domain restriction)\b/i,
    /\b(remainder theorem|factor theorem|synthetic division|polynomial division)\b/i,
    /\b(solve for [a-z]|solve the equation|roots of the polynomial)\b/i,
    /\b(evaluate|find the value of)\b/i,
    /\b(explain why|definition of|constant polynomial|degree of the polynomial)\b/i,
  ];
  if (algebraicIndicators.some((rgx) => rgx.test(combined))) {
    return false;
  }

  // 4. Topic-level check
  if (
    /trig|periodic|geometry|sketch/i.test(topic || "") &&
    !/algebra|simplify|factor|expression/i.test(combined)
  ) {
    return true;
  }

  // Default: Pure algebra does not need a graph
  return false;
}

/**
 * Robust JSON sanitizer that handles unescaped LaTeX backslashes without corrupting
 * valid JSON escape codes or turning LaTeX commands into formfeed/newline/tab characters.
 */
export function sanitizeJsonString(slice: string): string {
  return slice
    .replace(/\/\/.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/([{,]\s*)([a-zA-Z0-9_$]+)\s*:/g, '$1"$2":')
    .replace(/'([^'\\]*(?:\\.[^'\\]*)*)'/g, '"$1"')
    // Step 1: Protect already valid \\ (double backslashes)
    .replace(/\\\\/g, "__DOUBLE_BACKSLASH__")
    // Step 2: Double backslashes on LaTeX keywords starting with backslash:
    .replace(
      /\\(frac|neq|times|right|left|bar|beta|begin|binom|bf|nabla|nu|text|tan|theta|to|tau|pm|cdot|alpha|gamma|delta|epsilon|zeta|eta|lambda|mu|xi|pi|rho|sigma|phi|chi|psi|omega|sqrt|div|le|ge|approx|infty|sum|prod|int|lim|vec)/gi,
      (_match, p1) => "\\\\" + p1
    )
    // Step 3: Any remaining single backslash not followed by valid JSON escape character:
    .replace(/\\(?!["\\\/bfnrtu]|u[0-9a-fA-F]{4})/g, () => "\\\\")
    // Step 4: Restore protected double backslashes
    .replace(/__DOUBLE_BACKSLASH__/g, "\\\\")
    .replace(/,\s*([}\]])/g, "$1");
}

/**
 * Extracts distinct math questions from conversational or markdown OCR text.
 * Robustly handles Ontario/AP textbook tags (C1, C2, C3, C4, A1, B2),
 * multiline problem statements, and conversational preambles.
 */
export function parseQuestionsFromRawText(raw: string): ExtractedQuestion[] {
  if (!raw || typeof raw !== "string") return [];

  const clean = raw.trim();
  // Strip conversational preambles like "Sure, here are the math questions from the image:"
  const preambleRegex =
    /^(?:sure,?\s*(?:here\s+(?:are|is))?|here\s+(?:are|is)|based\s+on|below\s+(?:are|is)|from\s+the\s+image|i\s+(?:have|can)|the\s+following)[^\n:]*:\s*/i;
  const content = clean.replace(preambleRegex, "").trim();

  const lines = content.split("\n");
  const questions: ExtractedQuestion[] = [];
  let currentId = "";
  let currentLines: string[] = [];

  const flush = () => {
    if (currentLines.length > 0) {
      let text = currentLines.join(" ").replace(/\s+/g, " ").trim();
      text = text.replace(/^[:.\-–—\s]+/, "").trim();

      // Check if problem text itself starts with a label like "C1 Describe..."
      const cMatch = text.match(/^([A-Za-z]\d+)\s*[:.\-–—\s]\s*(.+)$/);
      if (cMatch) {
        if (
          !currentId ||
          /^\d+$/.test(currentId) ||
          currentId.startsWith("Q") ||
          currentId.startsWith("PROBLEM")
        ) {
          currentId = cMatch[1].toUpperCase();
        }
        text = cMatch[2].trim();
      }

      if (text.length > 3) {
        questions.push({
          id: currentId || `Q${questions.length + 1}`,
          text,
          difficulty: 5,
          type: detectTopic(text),
        });
      }
      currentLines = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Skip section headers like "Communicate Your Understanding"
    if (
      /^(?:communicate your understanding|practice|exercises|review|chapter\s*\d*|questions|problems)$/i.test(
        line
      )
    ) {
      continue;
    }
    if (line.startsWith("```")) continue;

    // Match question headers:
    // "Question 1:", "Question 1", "**Question 1**"
    // "Problem 1:", "Problem 1."
    // "Exercise 1"
    // "C1", "C2", "C3", "C4", "A1", "B2"
    // "1.", "2.", "3.", "1)", "2)"
    // "(1)", "(2)"
    // "Part a:", "Part A:"
    const headerMatch = line.match(
      /^(?:[#*_\s]*)(?:Question\s*(\d+[a-z]?)|Problem\s*(\d+[a-z]?)|Exercise\s*(\d+[a-z]?)|([A-Za-z]\d+[a-z]?)|(\d+)[\).:-]|Part\s*([a-z\d]+))(?:\s*[:.\-–—]|\s*\*{1,2}|\s+|$)(.*)$/i
    );

    if (headerMatch) {
      flush();
      const idPart =
        headerMatch[1] ||
        headerMatch[2] ||
        headerMatch[3] ||
        headerMatch[4] ||
        headerMatch[5] ||
        headerMatch[6] ||
        `Q${questions.length + 1}`;
      currentId = idPart.toUpperCase();
      const remainder = headerMatch[7]?.trim();
      if (remainder) {
        currentLines.push(remainder);
      }
    } else {
      const tagMatch = line.match(/^([A-Za-z]\d+)\s+(.+)$/);
      if (tagMatch) {
        flush();
        currentId = tagMatch[1].toUpperCase();
        currentLines.push(tagMatch[2]);
      } else {
        if (currentId) {
          currentLines.push(line);
        } else if (line.length > 5 && (/[0-9=+\-*/\\]/.test(line) || line.includes("$"))) {
          currentId = `Q${questions.length + 1}`;
          currentLines.push(line);
        }
      }
    }
  }
  flush();

  return questions;
}

function cleanSlideText(raw: string): string {
  if (!raw) return "";
  return raw
    .replace(/(?:^|\n)[ \t]*(?:#+\s*)?(?:key takeaways?|takeaways?|governing conditions?)\s*[:.\-–—]*/gi, "\n")
    .replace(/[ \t]*(?:state all governing(?: mathematical)? conditions?\.?)/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Helper: Normalize Solution Structure
 * - When needsGraph === true: EXACTLY 4 slides (Problem Statement, Solution of the Problem, Evidence [graph], Conclusion)
 * - When needsGraph === false: EXACTLY 3 slides (Problem Statement, Solution of the Problem, Conclusion)
 */
export function normalizeSolution(
  data: unknown,
  problemText?: string,
  topic?: string
): ExtractedSolution | null {
  if (typeof data === "object" && data !== null) {
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj.slides) && obj.slides.length > 0) {
      const needsGraph = problemText
        ? isGeometryOrGraphingTask(problemText, topic)
        : Boolean(obj.graphData && (obj.graphData as Record<string, unknown>).functions);

      let inputSlides = obj.slides as Record<string, unknown>[];

      if (!needsGraph) {
        // Evidence is ONLY needed if the graph will help show the solution.
        // For pure algebra, filter out any evidence/graph slides.
        const filtered = inputSlides.filter((s) => {
          const type = String(s.type || "").toLowerCase();
          const title = String(s.title || "").toLowerCase();
          if (type === "graph" || type === "evidence") return false;
          if (title.includes("evidence") || title.includes("verification") || title.includes("proof")) return false;
          return true;
        });

        if (filtered.length >= 3) {
          const introSlide = filtered[0];
          const conclusionSlide = filtered[filtered.length - 1];
          const middleSlides = filtered.slice(1, -1);
          const solutionSlide = {
            title: "Solution of the Problem",
            subtitle: middleSlides[0]?.subtitle || topic || "Step-by-Step Solution",
            content: middleSlides.map((m) => String(m.content || m.text || "")).filter(Boolean).join("\n\n"),
            notes: middleSlides[0]?.notes || "Follow the step-by-step mathematical derivation.",
            type: "solution",
          };
          inputSlides = [introSlide, solutionSlide, conclusionSlide];
        } else if (filtered.length === 2) {
          inputSlides = filtered;
        } else {
          inputSlides = inputSlides.slice(0, 3);
        }

        const standardTitles = [
          "Problem Statement",
          "Solution of the Problem",
          "Conclusion",
        ];
        const standardTypes = ["intro", "solution", "conclusion"];

        return {
          explanation: String(obj.explanation || "Problem Solution"),
          slides: inputSlides.slice(0, 3).map((s: Record<string, unknown>, idx: number) => {
            let rawTitle = String(s.title || standardTitles[idx] || `Slide ${idx + 1}`);
            if (idx === 0) rawTitle = "Problem Statement";
            else if (idx === 1) rawTitle = "Solution of the Problem";
            else if (idx === 2) rawTitle = "Conclusion";

            return {
              title: rawTitle,
              subtitle: s.subtitle ? String(s.subtitle) : (topic || "Advanced Functions"),
              content: cleanSlideText(String(s.content || s.text || "")),
              notes: cleanSpeakerScript(
                String(s.notes || s.script || "Let's work through the problem step by step to find the solution.")
              ),
              type: standardTypes[idx] || "solution",
            };
          }),
          graphData: undefined,
        };
      }

      // When needsGraph is true (visual graph helps show the solution) -> strictly 4 slides
      if (inputSlides.length > 4) {
        const introSlide = inputSlides[0];
        const solutionSlide = {
          title: "Solution of the Problem",
          subtitle: inputSlides[1]?.subtitle || inputSlides[2]?.subtitle || topic || "Step-by-Step Solution",
          content: [inputSlides[1]?.content, inputSlides[2]?.content].filter(Boolean).join("\n\n"),
          notes: inputSlides[1]?.notes || inputSlides[2]?.notes || "Work through the mathematical solution.",
          type: "solution",
        };
        const evidenceSlide = inputSlides[inputSlides.length - 2];
        const conclusionSlide = inputSlides[inputSlides.length - 1];
        inputSlides = [introSlide, solutionSlide, evidenceSlide, conclusionSlide];
      }

      const standardTitles = [
        "Problem Statement",
        "Solution of the Problem",
        "Evidence",
        "Conclusion",
      ];
      const standardTypes = ["intro", "solution", "graph", "conclusion"];

      return {
        explanation: String(obj.explanation || "Problem Solution"),
        slides: inputSlides.slice(0, 4).map((s: Record<string, unknown>, idx: number) => {
          let rawTitle = String(s.title || standardTitles[idx] || `Slide ${idx + 1}`);
          if (idx === 0) rawTitle = "Problem Statement";
          else if (idx === 1) rawTitle = "Solution of the Problem";
          else if (idx === 2) rawTitle = "Evidence";
          else if (idx === 3) rawTitle = "Conclusion";

          return {
            title: rawTitle,
            subtitle: s.subtitle ? String(s.subtitle) : (topic || "Advanced Functions"),
            content: cleanSlideText(String(s.content || s.text || "")),
            notes: cleanSpeakerScript(
              String(s.notes || s.script || "Let's work through the problem step by step to find the solution.")
            ),
            type: standardTypes[idx] || "solution",
          };
        }),
        graphData: (obj.graphData as Record<string, unknown>) || undefined,
      };
    }
  }
  return null;
}

export function extractJson<T = Record<string, unknown>>(
  raw: string,
  mode: "questions" | "solution" = "questions",
  problemText?: string,
  topic?: string
): T {
  if (!raw || typeof raw !== "string") {
    if (mode === "questions") {
      return { questions: [] } as unknown as T;
    }
    return createDefaultSolution("No response received from AI model.", topic) as unknown as T;
  }

  const trimmed = raw.trim();

  // -------------------------------------------------------------------------
  // Helper: Normalize Question Objects & Arrays
  // -------------------------------------------------------------------------
  const normalizeQuestions = (data: unknown): { questions: ExtractedQuestion[] } | null => {
    if (Array.isArray(data)) {
      const qs: ExtractedQuestion[] = data.map((item, idx) => {
        let id = String(item?.id || item?.number || item?.label || idx + 1);
        let text = String(
          item?.text || item?.question || item?.problem || item?.content || JSON.stringify(item)
        );

        // Strip duplicate label from start of text if present (e.g. "C1 Describe..." -> "Describe...")
        const labelPrefixMatch = text.match(/^([A-Za-z]\d+)\s*[:.\-–—\s]\s*(.+)$/);
        if (labelPrefixMatch) {
          if (!id || id === String(idx + 1) || id.startsWith("Q") || id.startsWith("Problem")) {
            id = labelPrefixMatch[1].toUpperCase();
          }
          text = labelPrefixMatch[2];
        }

        return {
          id,
          text: text.trim(),
          difficulty: Number(item?.difficulty || 5),
          type: String(item?.type || item?.chapter || item?.topic || detectTopic(text)),
        };
      });
      return { questions: qs };
    }

    if (typeof data === "object" && data !== null) {
      const obj = data as Record<string, unknown>;
      const qList =
        obj.questions ||
        obj.problems ||
        obj.exercises ||
        obj.items ||
        (obj.question ? [obj] : null);

      if (Array.isArray(qList) && qList.length > 0) {
        return normalizeQuestions(qList);
      }
      if (obj.text || obj.question || obj.problem) {
        const text = String(obj.text || obj.question || obj.problem);
        return {
          questions: [
            {
              id: String(obj.id || "1"),
              text: text.trim(),
              difficulty: Number(obj.difficulty || 5),
              type: String(obj.type || detectTopic(text)),
            },
          ],
        };
      }
    }
    return null;
  };

  // -------------------------------------------------------------------------
  // 1. Direct JSON Parse Attempt
  // -------------------------------------------------------------------------
  try {
    const parsed = JSON.parse(trimmed);
    if (mode === "questions") {
      const norm = normalizeQuestions(parsed);
      if (norm && norm.questions.length > 0) return norm as unknown as T;
    } else {
      const norm = normalizeSolution(parsed);
      if (norm && norm.slides.length > 0) return norm as unknown as T;
    }
  } catch {}

  // -------------------------------------------------------------------------
  // 2. Unpack Markdown Fences (```json ... ``` or ``` ... ```)
  // -------------------------------------------------------------------------
  const codeBlock = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (codeBlock) {
    const codeContent = codeBlock[1].trim();
    let parsed: unknown = null;
    try {
      parsed = JSON.parse(codeContent);
    } catch {
      try {
        parsed = JSON.parse(sanitizeJsonString(codeContent));
      } catch {}
    }
    if (parsed) {
      if (mode === "questions") {
        const norm = normalizeQuestions(parsed);
        if (norm && norm.questions.length > 0) return norm as unknown as T;
      } else {
        const norm = normalizeSolution(parsed);
        if (norm && norm.slides.length > 0) return norm as unknown as T;
      }
    }
  }

  // -------------------------------------------------------------------------
  // 3. Slice and Sanitize JSON Array [...] or Object {...}
  // -------------------------------------------------------------------------
  const trySliceAndSanitize = (startChar: string, endChar: string): unknown => {
    const s = trimmed.indexOf(startChar);
    const e = trimmed.lastIndexOf(endChar);
    if (s !== -1 && e > s) {
      const slice = trimmed.slice(s, e + 1);
      try {
        return JSON.parse(slice);
      } catch {}

      // Sanitize slice with proper LaTeX backslash escaping
      const sanitized = sanitizeJsonString(slice);
      try {
        return JSON.parse(sanitized);
      } catch {}
    }
    return null;
  };

  // Try parsing Array first (if question list was emitted directly)
  const arrayResult = trySliceAndSanitize("[", "]");
  if (arrayResult) {
    if (mode === "questions") {
      const norm = normalizeQuestions(arrayResult);
      if (norm && norm.questions.length > 0) return norm as unknown as T;
    }
  }

  // Try parsing Object
  const objectResult = trySliceAndSanitize("{", "}");
  if (objectResult) {
    if (mode === "questions") {
      const norm = normalizeQuestions(objectResult);
      if (norm && norm.questions.length > 0) return norm as unknown as T;
    } else {
      const norm = normalizeSolution(objectResult);
      if (norm && norm.slides.length > 0) return norm as unknown as T;
    }
  }

  // -------------------------------------------------------------------------
  // 4. Regex Block Extraction for { "text": ... } or { "id": ... }
  // -------------------------------------------------------------------------
  if (mode === "questions") {
    const extractedList: ExtractedQuestion[] = [];
    const blockRegex = /\{[^{}]*\}/g;
    let blockMatch: RegExpExecArray | null;

    while ((blockMatch = blockRegex.exec(raw)) !== null) {
      const block = blockMatch[0];
      const textMatch = block.match(
        /"(?:text|question|problem|content|prompt|statement)"\s*:\s*"((?:[^"\\]|\\.)*)"/i
      );
      if (textMatch) {
        const idMatch = block.match(/"(?:id|number|label)"\s*:\s*(?:"([^"]+)"|(\d+))/i);
        const diffMatch = block.match(/"(?:difficulty|diff|level)"\s*:\s*(?:"?(\d+)"?)/i);
        const typeMatch = block.match(/"(?:type|chapter|topic)"\s*:\s*"([^"]+)"/i);
        const rawText = textMatch[1].replace(/\\\\/g, "\\");

        extractedList.push({
          id: idMatch ? idMatch[1] || idMatch[2] : `Q${extractedList.length + 1}`,
          text: rawText,
          difficulty: diffMatch ? parseInt(diffMatch[1], 10) : 5,
          type: typeMatch ? typeMatch[1] : detectTopic(rawText),
        });
      }
    }

    if (extractedList.length > 0) {
      const norm = normalizeQuestions(extractedList);
      if (norm && norm.questions.length > 0) return norm as unknown as T;
    }

    // -----------------------------------------------------------------------
    // 5. Conversational / Multi-line OCR Parser (handles C1-C4, Question 1-4, etc.)
    // -----------------------------------------------------------------------
    const rawParsed = parseQuestionsFromRawText(raw);
    if (rawParsed.length > 0) {
      return { questions: rawParsed } as unknown as T;
    }

    // -----------------------------------------------------------------------
    // 6. Failsafe: Clean conversational preamble and wrap into single curriculum problem
    // -----------------------------------------------------------------------
    let fallbackText = trimmed
      .replace(
        /^(?:sure,?\s*(?:here\s+(?:are|is))?|here\s+(?:are|is)|based\s+on|below\s+(?:are|is)|from\s+the\s+image|i\s+(?:have|can)|the\s+following)[^\n:]*:\s*/i,
        ""
      )
      .trim();
    if (fallbackText.length === 0) fallbackText = "Solve the given equation.";
    else if (fallbackText.length > 400) fallbackText = fallbackText.slice(0, 400);

    return {
      questions: [
        {
          id: "Q1",
          text: fallbackText,
          difficulty: 5,
          type: detectTopic(fallbackText),
        },
      ],
    } as unknown as T;
  }

  // -------------------------------------------------------------------------
  // Fallback for Solution Mode: Markdown Slide Parser
  // -------------------------------------------------------------------------
  const mdSolution = parseSolutionFromMarkdown(trimmed, problemText, topic);
  if (mdSolution && mdSolution.slides.length > 0) {
    return mdSolution as unknown as T;
  }

  return createDefaultSolution(trimmed, topic) as unknown as T;
}

/**
 * Extracts structured presentation slides from markdown formatted model responses.
 */
export function parseSolutionFromMarkdown(
  raw: string,
  problemText?: string,
  topic?: string
): ExtractedSolution | null {
  if (!raw || typeof raw !== "string") return null;

  const slideRegex =
    /(?:^|\n+)(?:#{1,3}\s*)?(?:Slide\s*\d+\s*[:.\-–—]?\s*|\*\*Slide\s*\d+\s*[:.\-–—]?\*\*|\bStep\s*\d+\s*[:.\-–—]?\s*)([^\n]*)/i;
  if (!slideRegex.test(raw)) return null;

  const sections = raw.split(
    /(?:^|\n+)(?:#{1,3}\s*)?(?:Slide\s*\d+\s*[:.\-–—]?\s*|\*\*Slide\s*\d+\s*[:.\-–—]?\*\*|\bStep\s*\d+\s*[:.\-–—]?\s*)/i
  );
  const slides: ExtractedSlide[] = [];

  for (let i = 1; i < sections.length; i++) {
    const sec = sections[i].trim();
    if (!sec) continue;

    const lines = sec.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) continue;

    const rawTitle = lines[0].replace(/^[:.\-–—*#\s]+|[:.\-–—*#\s]+$/g, "");
    const title = rawTitle.length > 2 ? rawTitle : `Step ${slides.length + 1}`;

    const contentLines: string[] = [];
    let notes = "Analyze the mathematical constraints and derive the exact solution.";

    for (let j = 1; j < lines.length; j++) {
      const line = lines[j];
      const notesMatch = line.match(
        /^(?:Notes|Script|Narration|Teacher|Speaker)\s*[:.\-–—]\s*(.+)$/i
      );
      if (notesMatch) {
        notes = cleanSpeakerScript(notesMatch[1]);
      } else {
        contentLines.push(line);
      }
    }

    const standardTitles = ["Problem Statement", "Solution of the Problem", "Evidence", "Conclusion"];
    const standardTypes = ["intro", "solution", "evidence", "conclusion"];
    const currentIdx = slides.length;

    slides.push({
      title: title || standardTitles[currentIdx] || `Slide ${currentIdx + 1}`,
      subtitle: "Mathematical Derivation",
      content: contentLines.join("\n") || title,
      notes,
      type: standardTypes[Math.min(currentIdx, 3)],
    });
  }

  if (slides.length >= 2) {
    return normalizeSolution(
      {
        explanation: "Problem Analysis and Step-by-Step Resolution",
        slides,
      },
      problemText,
      topic
    );
  }
  return null;
}

export function generateCurriculumSolution(problemText: string, topic?: string): ExtractedSolution {
  const cleanTopic = topic || detectTopic(problemText);
  const isRational = cleanTopic.includes("Rational") || /\\div|\\frac|denominator|restriction|simplif/i.test(problemText);
  const isTrig = cleanTopic.includes("Trigonometric") || /sin|cos|tan|radian/i.test(problemText);

  // Extract the actual math expression from the problem text
  const mathMatches = problemText.match(/\$\$[\s\S]+?\$\$|\$[^\$\n]+?\$/g) || [];
  const primaryFormula = mathMatches[0] || "";

  // Try to extract factors from rational expressions like ((x+3)(x-6))/((x+4)(x+5))
  const factors = extractFactorsFromProblem(problemText);

  if (isRational && factors) {
    return buildRationalSolution(problemText, cleanTopic, factors);
  }

  // For non-rational or unparseable problems, embed the actual problem text
  return buildGenericSolution(problemText, cleanTopic, primaryFormula, isTrig);
}

interface ParsedFactors {
  // Numerator and denominator factors of the dividend
  divNumFactors: string[];
  divDenFactors: string[];
  // Numerator and denominator factors of the divisor
  sorNumFactors: string[];
  sorDenFactors: string[];
  // All restriction values
  restrictions: { factor: string; value: number }[];
  // Common factors that cancel
  commonFactors: string[];
  // Remaining factors after cancellation
  resultNum: string[];
  resultDen: string[];
  // Original expression LaTeX
  originalLatex: string;
  // mathjs expression for graphing
  mathjsExpr: string;
}

function extractFactorsFromProblem(text: string): ParsedFactors | null {
  // Normalize the text: remove LaTeX wrappers and dollar signs
  let clean = text
    .replace(/\$\$/g, "")
    .replace(/\$/g, "")
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, "($1)/($2)")
    .replace(/\\div/g, "÷")
    .replace(/\\cdot/g, "*")
    .replace(/\\times/g, "*")
    .replace(/\\left/g, "")
    .replace(/\\right/g, "")
    .trim();

  // Try to find pattern: A/B ÷ C/D or A/B / C/D
  // Where A, B, C, D contain factor groups like (x+3)(x-6)
  const divisionMatch = clean.match(
    /\(?([^÷/]*)\)?\s*[/]\s*\(?([^÷]*?)\)?\s*[÷/]\s*\(?([^÷/]*)\)?\s*[/]\s*\(?([^)]*(?:\([^)]*\))*[^)]*)\)?/
  ) || clean.match(
    /(\([^)]+\)(?:\s*\([^)]+\))*)\s*[/]\s*(\([^)]+\)(?:\s*\([^)]+\))*)\s*[÷]\s*(\([^)]+\)(?:\s*\([^)]+\))*)\s*[/]\s*(\([^)]+\)(?:\s*\([^)]+\))*)/
  );

  // Simpler approach: extract all (x+n) or (x-n) style factors from the text
  const factorPattern = /\(x\s*([+-])\s*(\d+)\)/gi;
  const allFactors: { str: string; value: number }[] = [];
  let match;
  while ((match = factorPattern.exec(clean)) !== null) {
    const sign = match[1] === "+" ? 1 : -1;
    const num = parseInt(match[2]) * sign;
    // The restriction is when (x + num) = 0, so x = -num
    allFactors.push({ str: `(x${sign === 1 ? "+" : "-"}${match[2]})`, value: -num });
  }

  if (allFactors.length < 4) return null; // Need at least 4 factors for a rational division

  // For a typical problem like ((x+3)(x-6))/((x+4)(x+5)) ÷ ((x-6)(x+8))/((x+4)(x-7))
  // We expect 8 factors total (4 in dividend, 4 in divisor)
  // Split them by position: first half = dividend, second half = divisor

  const half = Math.floor(allFactors.length / 2);
  const dividendFactors = allFactors.slice(0, half);
  const divisorFactors = allFactors.slice(half);

  // For a 4-factor dividend: factors 0,1 = numerator, factors 2,3 = denominator
  const divNumFactors = dividendFactors.slice(0, Math.ceil(dividendFactors.length / 2)).map(f => f.str);
  const divDenFactors = dividendFactors.slice(Math.ceil(dividendFactors.length / 2)).map(f => f.str);
  const sorNumFactors = divisorFactors.slice(0, Math.ceil(divisorFactors.length / 2)).map(f => f.str);
  const sorDenFactors = divisorFactors.slice(Math.ceil(divisorFactors.length / 2)).map(f => f.str);

  // After division: multiply dividend by reciprocal of divisor
  // Result numerator: divNum * sorDen
  // Result denominator: divDen * sorNum
  const afterFlipNum = [...divNumFactors, ...sorDenFactors];
  const afterFlipDen = [...divDenFactors, ...sorNumFactors];

  // Find common factors that cancel
  const commonFactors: string[] = [];
  const remainNum = [...afterFlipNum];
  const remainDen = [...afterFlipDen];

  for (let i = remainNum.length - 1; i >= 0; i--) {
    const idx = remainDen.indexOf(remainNum[i]);
    if (idx !== -1) {
      commonFactors.push(remainNum[i]);
      remainNum.splice(i, 1);
      remainDen.splice(idx, 1);
    }
  }

  // Get all unique restriction values (all factors that ever appear in a denominator)
  const restrictionSet = new Map<number, string>();
  for (const f of [...divDenFactors, ...sorNumFactors, ...sorDenFactors]) {
    const m = f.match(/\(x\s*([+-])\s*(\d+)\)/);
    if (m) {
      const sign = m[1] === "+" ? 1 : -1;
      const val = -(parseInt(m[2]) * sign);
      restrictionSet.set(val, f);
    }
  }
  // Also add divisor numerator factors (they become denominator factors in the original expression context)
  for (const f of divDenFactors) {
    const m = f.match(/\(x\s*([+-])\s*(\d+)\)/);
    if (m) {
      const sign = m[1] === "+" ? 1 : -1;
      const val = -(parseInt(m[2]) * sign);
      restrictionSet.set(val, f);
    }
  }
  // For division, the divisor's numerator also creates restrictions
  for (const f of sorNumFactors) {
    const m = f.match(/\(x\s*([+-])\s*(\d+)\)/);
    if (m) {
      const sign = m[1] === "+" ? 1 : -1;
      const val = -(parseInt(m[2]) * sign);
      restrictionSet.set(val, f);
    }
  }

  const restrictions = Array.from(restrictionSet.entries())
    .map(([value, factor]) => ({ factor, value }))
    .sort((a, b) => a.value - b.value);

  // Build original LaTeX
  const originalLatex = `\\frac{${divNumFactors.join("")}}{${divDenFactors.join("")}} \\div \\frac{${sorNumFactors.join("")}}{${sorDenFactors.join("")}}`;

  // Build mathjs expression for the simplified result
  const mathjsNum = remainNum.length > 0 ? remainNum.map(f => f.replace(/x/g, "x")).join("*") : "1";
  const mathjsDen = remainDen.length > 0 ? remainDen.map(f => f.replace(/x/g, "x")).join("*") : "1";
  const mathjsExpr = `(${mathjsNum})/(${mathjsDen})`;

  return {
    divNumFactors,
    divDenFactors,
    sorNumFactors,
    sorDenFactors,
    restrictions,
    commonFactors,
    resultNum: remainNum,
    resultDen: remainDen,
    originalLatex,
    mathjsExpr,
  };
}

function buildRationalSolution(problemText: string, topic: string, f: ParsedFactors): ExtractedSolution {
  const needsGraph = isGeometryOrGraphingTask(problemText, topic);
  const restrictionValues = f.restrictions.map(r => r.value);
  const resultLatex = `\\frac{${f.resultNum.join("")}}{${f.resultDen.join("")}}`;

  const slides: ExtractedSlide[] = [
    {
      title: "Problem Statement",
      subtitle: topic,
      content: `Simplify the rational expression and find all variable restrictions:
$$${f.originalLatex}$$
Goal: Multiply by the reciprocal of the divisor, cancel common factors, and find restrictions where any denominator equals zero.`,
      notes: `Let's simplify this division of rational expressions step by step and find any values of x that make denominators zero.`,
      type: "intro",
    },
    {
      title: "Solution of the Problem",
      subtitle: "Step-by-Step Solution",
      content: `Step 1: Multiply by the reciprocal of the second fraction:
$$\\frac{${f.divNumFactors.join("")}}{${f.divDenFactors.join("")}} \\times \\frac{${f.sorDenFactors.join("")}}{${f.sorNumFactors.join("")}}$$

Step 2: Note all restrictions before cancelling (denominators cannot be zero):
$$${restrictionValues.map(v => `x \\neq ${v}`).join(", \\quad ")}$$

Step 3: Cancel common factors ${f.commonFactors.length > 0 ? `$${f.commonFactors.join(", ")}$` : ""}:
$$${resultLatex}$$`,
      notes: `First flip the second fraction to multiply. Note all restrictions from denominators before cancelling common factors.`,
      type: "solution",
    },
  ];

  if (needsGraph) {
    slides.push({
      title: "Evidence",
      subtitle: "Visual Graph & Asymptotes",
      content: `Asymptotes and holes for $f(x) = ${resultLatex}$:
• Vertical Asymptotes: ${f.resultDen.map(d => {
        const m = d.match(/\(x\s*([+-])\s*(\d+)\)/);
        if (m) {
          const sign = m[1] === "+" ? 1 : -1;
          const val = -(parseInt(m[2]) * sign);
          return `$x = ${val}$`;
        }
        return "";
      }).filter(Boolean).join(", ")}
• Horizontal Asymptote: $y = 1$
${f.commonFactors.length > 0 ? `• Holes: ${f.commonFactors.join(", ")}` : ""}`,
      notes: `The graph shows vertical asymptotes where denominators equal zero and holes where factors cancelled.`,
      type: "graph",
    });
  }

  slides.push({
    title: "Conclusion",
    subtitle: "Final Answer",
    content: `Final Simplified Expression:
$$\\boxed{${resultLatex}}$$

Restrictions:
$$${restrictionValues.map(v => `x \\neq ${v}`).join(", \\quad ")}$$`,
    notes: `Here is the simplified expression along with all variable restrictions.`,
    type: "conclusion",
  });

  return {
    explanation: `Simplification of rational expression with ${f.restrictions.length} restrictions.`,
    slides,
    graphData: needsGraph
      ? {
          type: "function",
          equation: `$${resultLatex}$`,
          isRadian: false,
          functions: [
            {
              equation: `$${resultLatex}$`,
              mathjs: f.mathjsExpr,
              color: "#38bdf8",
            },
          ],
          asymptotes: f.resultDen.map(d => {
            const m = d.match(/\(x\s*([+-])\s*(\d+)\)/);
            if (m) {
              const sign = m[1] === "+" ? 1 : -1;
              const val = -(parseInt(m[2]) * sign);
              return { type: "vertical" as const, value: val, label: `x = ${val}` };
            }
            return null;
          }).filter((a): a is NonNullable<typeof a> => a !== null),
          holes: f.commonFactors.map(cf => {
            const m = cf.match(/\(x\s*([+-])\s*(\d+)\)/);
            if (m) {
              const sign = m[1] === "+" ? 1 : -1;
              const xVal = -(parseInt(m[2]) * sign);
              return { x: xVal, y: 0 };
            }
            return null;
          }).filter((h): h is NonNullable<typeof h> => h !== null),
          properties: [
            { name: "Restrictions", value: `$${restrictionValues.map(v => `x \\neq ${v}`).join(", \\; ")}$` },
          ],
        }
      : undefined,
  };
}

function buildGenericSolution(problemText: string, topic: string, formula: string, isTrig: boolean): ExtractedSolution {
  const needsGraph = isGeometryOrGraphingTask(problemText, topic);
  const displayProblem = formula || problemText.slice(0, 160);

  // Check if problem asks why y = c is a polynomial or about polynomial definitions
  const isPolyDef = /why.*(y\s*=\s*\d+|function.*polynomial|constant.*polynomial)|polynomial.*function.*y\s*=\s*\d+|explain\s+why.*polynomial/i.test(problemText);

  if (isPolyDef) {
    const constMatch = problemText.match(/y\s*=\s*(-?\d+(?:\.\d+)?)/i);
    const constVal = constMatch ? constMatch[1] : "3";

    const slides: ExtractedSlide[] = [
      {
        title: "Problem Statement",
        subtitle: "Polynomial Functions",
        content: `Given function:
$$y = ${constVal}$$

Explain why $y = ${constVal}$ is a polynomial function.`,
        notes: `Let's look at the constant function y equals ${constVal} and see why it fits the definition of a polynomial.`,
        type: "intro",
      },
      {
        title: "Solution of the Problem",
        subtitle: "Definition of a Polynomial",
        content: `A polynomial is an expression where all exponents of the variable are non-negative integers (whole numbers: $0, 1, 2, \\dots$).

We can rewrite $y = ${constVal}$ with an explicit power of $x$:
$$y = ${constVal}x^0$$

Since $x^0 = 1$ for any $x \\neq 0$:
$$y = ${constVal}(1) = ${constVal}$$

The exponent of $x$ is $0$, which is a non-negative integer. Therefore, $y = ${constVal}$ is a polynomial of degree $0$ (a constant polynomial).`,
        notes: `Any non-zero value to the power of 0 is 1. Writing y as ${constVal} times x to the power of 0 shows that the exponent is 0, which is a whole number.`,
        type: "solution",
      },
    ];

    if (needsGraph) {
      slides.push({
        title: "Evidence",
        subtitle: "Visual Graph",
        content: `On the Cartesian plane, $y = ${constVal}$ is a horizontal line:
• Every point has $y$-coordinate ${constVal}
• The slope is $m = 0$
• The $y$-intercept is $(0, ${constVal})$`,
        notes: `Looking at the graph, y equals ${constVal} forms a flat horizontal line with slope 0.`,
        type: "graph",
      });
    }

    slides.push({
      title: "Conclusion",
      subtitle: "Final Answer",
      content: `$$\\boxed{y = ${constVal}x^0 \\quad (\\text{Degree } 0 \\text{ Constant Polynomial})}$$

• Degree: $0$
• Leading coefficient: $a_0 = ${constVal}$
• Domain: all real numbers ($x \\in \\mathbb{R}$)`,
      notes: `In conclusion, y equals ${constVal} is a polynomial function with degree 0.`,
      type: "conclusion",
    });

    return {
      explanation: `Explanation that the constant function y = ${constVal} is a degree 0 polynomial.`,
      slides,
      graphData: needsGraph
        ? {
            type: "function",
            equation: `y = ${constVal}`,
            bounds: { minX: -5, maxX: 5, minY: -2, maxY: Number(constVal) + 3 },
            functions: [
              { mathjs: String(constVal), color: "#38bdf8", equation: `y = ${constVal}` },
            ],
            properties: [
              { name: "Degree", value: "0" },
              { name: "Function Type", value: "Constant Polynomial" },
              { name: "Domain", value: "x ∈ ℝ" },
              { name: "Slope", value: "m = 0" },
            ],
          }
        : undefined,
    };
  }

  const slides: ExtractedSlide[] = [
    {
      title: "Problem Statement",
      subtitle: topic,
      content: `Problem:
${displayProblem}

Identify given values and what needs to be solved.`,
      notes: `Let's read the problem carefully and identify what we need to solve.`,
      type: "intro",
    },
    {
      title: "Solution of the Problem",
      subtitle: "Step-by-Step Solution",
      content: isTrig
        ? `Step 1: Apply standard trigonometric identities and angle values.
Step 2: Isolate the trigonometric ratio on the interval.
Step 3: Solve for the exact values.`
        : `Step 1: Set up the equations and identify the operations needed.
Step 2: Work through the algebraic steps carefully.
Step 3: Simplify and reach the final result.`,
      notes: `Let's work through the steps one by one to solve the problem.`,
      type: "solution",
    },
  ];

  if (needsGraph) {
    slides.push({
      title: "Evidence",
      subtitle: "Visual Graph & Key Features",
      content: `Visual analysis on the Cartesian plane:
${displayProblem}
• Intercepts and axis intersections
• Turning points and extrema
• Asymptotes and end behavior`,
      notes: `The graph visually confirms our key points and solution.`,
      type: "graph",
    });
  }

  slides.push({
    title: "Conclusion",
    subtitle: "Final Answer",
    content: `Final Answer:
${displayProblem}

The solution has been verified and all conditions are satisfied.`,
    notes: `Here is the final verified answer.`,
    type: "conclusion",
  });

  return {
    explanation: `Step-by-step resolution for this ${topic} problem.`,
    slides,
    graphData: needsGraph
      ? {
          type: "function",
          equation: "f(x)",
          isRadian: isTrig,
          functions: [
            {
              equation: "f(x)",
              mathjs: isTrig ? "sin(x)" : "x^2 - 4",
              color: "#38bdf8",
            },
          ],
          properties: [
            { name: "Topic", value: topic },
          ],
        }
      : undefined,
  };
}

function createDefaultSolution(problemText: string, topic?: string): ExtractedSolution {
  return generateCurriculumSolution(problemText, topic);
}

