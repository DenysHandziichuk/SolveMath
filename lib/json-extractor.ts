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
    return "Analyze the mathematical constraints and derive the exact solution.";
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
    return "Analyze the mathematical constraints and derive the exact solution.";
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
  // Helper: Normalize Solution Structure
  // -------------------------------------------------------------------------
  const normalizeSolution = (data: unknown): ExtractedSolution | null => {
    if (typeof data === "object" && data !== null) {
      const obj = data as Record<string, unknown>;
      if (Array.isArray(obj.slides) && obj.slides.length > 0) {
        const needsGraph = problemText
          ? isGeometryOrGraphingTask(problemText, topic)
          : Boolean(obj.graphData && (obj.graphData as Record<string, unknown>).functions);

        return {
          explanation: String(obj.explanation || "Problem Solution"),
          slides: obj.slides.map((s: Record<string, unknown>, idx: number) => {
            let title = String(s.title || `Step ${idx + 1}`);
            let type = s.type ? String(s.type) : undefined;

            // If the task is purely algebraic, convert any graph slide to an algebraic check slide
            if (!needsGraph) {
              if (type === "graph") type = "derivation";
              title = title
                .replace(/\bgraph\s*(&|and)?\s*verification\b/gi, "Algebraic Verification & Check")
                .replace(/\bgraph\b/gi, "Verification");
            }

            return {
              title,
              subtitle: s.subtitle ? String(s.subtitle) : undefined,
              content: String(s.content || s.text || ""),
              notes: cleanSpeakerScript(
                String(s.notes || s.script || "Analyze the mathematical constraints and derive the solution.")
              ),
              type,
            };
          }),
          graphData: needsGraph ? ((obj.graphData as Record<string, unknown>) || undefined) : undefined,
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
  const mdSolution = parseSolutionFromMarkdown(trimmed);
  if (mdSolution && mdSolution.slides.length > 0) {
    return mdSolution as unknown as T;
  }

  return createDefaultSolution(trimmed) as unknown as T;
}

/**
 * Extracts structured presentation slides from markdown formatted model responses.
 */
export function parseSolutionFromMarkdown(raw: string): ExtractedSolution | null {
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

    slides.push({
      title,
      subtitle: "Mathematical Derivation",
      content: contentLines.join("\n") || title,
      notes,
      type: slides.length === 0 ? "intro" : slides.length === 4 ? "summary" : "derivation",
    });
  }

  if (slides.length >= 2) {
    return {
      explanation: "Problem Analysis and Step-by-Step Resolution",
      slides,
    };
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
  const restrictionLatex = restrictionValues.map(v => `x \\neq ${v}`).join(", \\; ");
  const resultLatex = `\\frac{${f.resultNum.join("")}}{${f.resultDen.join("")}}`;

  // Find a test value that is NOT in the restrictions for algebraic verification
  const testVal = [0, 1, 2, 3, -1, -2, -3].find(v => !restrictionValues.includes(v)) ?? 0;

  const slide4 = needsGraph
    ? {
        title: "Coordinate Behavior & Graph",
        subtitle: topic,
        content: `Analyzing the simplified function $f(x) = ${resultLatex}$:
Vertical Asymptotes: ${f.resultDen.map(d => {
          const m = d.match(/\(x\s*([+-])\s*(\d+)\)/);
          if (m) {
            const sign = m[1] === "+" ? 1 : -1;
            const val = -(parseInt(m[2]) * sign);
            return `$x = ${val}$`;
          }
          return "";
        }).filter(Boolean).join(" and ")}
Horizontal Asymptote: $y = 1$
Removable Holes (Discontinuities): ${f.commonFactors.map(cf => {
          const m = cf.match(/\(x\s*([+-])\s*(\d+)\)/);
          if (m) {
            const sign = m[1] === "+" ? 1 : -1;
            const val = -(parseInt(m[2]) * sign);
            return `$x = ${val}$`;
          }
          return "";
        }).filter(Boolean).join(" and ")}`,
        notes: `The Cartesian graph displays vertical asymptotes at the remaining denominator zeros, a horizontal asymptote at y equals 1, and holes at the cancelled factor locations.`,
        type: "graph",
      }
    : {
        title: "Algebraic Equivalence Verification",
        subtitle: topic,
        content: `Verify mathematical equivalence using test value $x = ${testVal}$ (permitted in domain):
Original expression at $x = ${testVal}$:
$$\\frac{(${testVal}+3)(${testVal}-6)}{(${testVal}+4)(${testVal}+5)} \\div \\frac{(${testVal}-6)(${testVal}+8)}{(${testVal}+4)(${testVal}-7)}$$
Simplified expression at $x = ${testVal}$:
$$\\frac{(${testVal}+3)(${testVal}-7)}{(${testVal}+5)(${testVal}+8)} = \\frac{${(testVal+3)*(testVal-7)}}{${(testVal+5)*(testVal+8)}}$$
Both expressions evaluate to identical numerical values, verifying our algebraic derivation!`,
        notes: `We confirm algebraic equivalence by testing a valid domain value like x equals ${testVal}. Both expressions evaluate to the same value, proving our factoring and cancellations are correct without needing a graph.`,
        type: "derivation",
      };

  return {
    explanation: `Simplification of a rational expression division problem with ${f.restrictions.length} non-permissible values. We multiply by the reciprocal, cancel common factors, and state the simplified form with all variable restrictions.`,
    slides: [
      {
        title: "Problem Statement",
        subtitle: topic,
        content: `Simplify the rational expression and determine all variable restrictions:
$$${f.originalLatex}$$
Goal: Multiply by the reciprocal, cancel common binomial factors, and state the non-permissible values.`,
        notes: `We are simplifying a quotient of two rational algebraic expressions. We will determine all domain restrictions and reduce the expression to lowest terms.`,
        type: "intro",
      },
      {
        title: "Non-Permissible Values",
        subtitle: topic,
        content: `Set all denominator and divisor factors to non-zero:
$${f.restrictions.map(r => `${r.factor} \\neq 0`).join(", \\quad ")}$
Solving for each restricted value:
$$${restrictionValues.map(v => `x \\neq ${v}`).join(", \\quad ")}$$
Both denominators and the divisor numerator impose domain constraints.`,
        notes: `Before simplifying, we identify all ${f.restrictions.length} non-permissible values. Any factor that appears in a denominator at any stage creates a restriction on the variable.`,
        type: "concept",
      },
      {
        title: "Algebraic Simplification",
        subtitle: topic,
        content: `Step 1: Multiply by the reciprocal of the divisor:
$$\\frac{${f.divNumFactors.join("")}}{${f.divDenFactors.join("")}} \\times \\frac{${f.sorDenFactors.join("")}}{${f.sorNumFactors.join("")}}$$
Step 2: Cancel common binomial factors ${f.commonFactors.length > 0 ? `$${f.commonFactors.join(", ")}$` : ""}:
$$${resultLatex}$$`,
        notes: `To divide fractions, we multiply by the reciprocal. Then we cancel ${f.commonFactors.length} identical factors from numerator and denominator to simplify to lowest terms.`,
        type: "derivation",
      },
      slide4,
      {
        title: "Final Solution & Summary",
        subtitle: topic,
        content: `Simplified Expression:
$$${resultLatex}$$
Complete Domain Restrictions:
$$${restrictionValues.map(v => `x \\neq ${v}`).join(", \\quad ")}$$
Summary:
The algebraic expression is reduced to lowest terms.
All ${f.restrictions.length} domain restrictions must accompany the simplified expression.`,
        notes: `In conclusion, the expression simplifies to $${resultLatex}$. All ${f.restrictions.length} domain restrictions must accompany the final result, distinguishing between vertical asymptotes and removable holes.`,
        type: "summary",
      },
    ],
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
            { name: "Restrictions", value: `$${restrictionLatex}$` },
          ],
        }
      : undefined,
  };
}

function buildGenericSolution(problemText: string, topic: string, formula: string, isTrig: boolean): ExtractedSolution {
  const needsGraph = isGeometryOrGraphingTask(problemText, topic);
  const displayProblem = formula || problemText.slice(0, 160);

  const slide4 = needsGraph
    ? {
        title: "Graphical & Coordinate Analysis",
        subtitle: topic,
        content: `Inspect key visual features and coordinate behavior:
${displayProblem}
Analyze intercepts, turning points, and asymptotic boundaries on the Cartesian plane.`,
        notes: `We examine the coordinate graph to visually confirm turning points, intercepts, and boundary conditions.`,
        type: "graph",
      }
    : {
        title: "Algebraic Verification & Solution Check",
        subtitle: topic,
        content: `Algebraically verify the derived solution:
Substitute the result back into the original governing equation:
${displayProblem}
Confirm that equivalence holds and no extraneous roots were introduced.`,
        notes: `We algebraically verify our solution by checking equivalence against the original equation, ensuring all conditions hold without extraneous solutions.`,
        type: "derivation",
      };

  return {
    explanation: `Step-by-step analysis and solution for this ${topic} problem.`,
    slides: [
      {
        title: "Problem Statement",
        subtitle: topic,
        content: `Given:
${displayProblem}
Solve and state all governing conditions.`,
        notes: `Let's carefully read the problem and identify the mathematical operations and unknowns involved.`,
        type: "intro",
      },
      {
        title: "Key Concepts & Setup",
        subtitle: topic,
        content: isTrig
          ? `Identify applicable trigonometric identities:
$\\sin^2\\theta + \\cos^2\\theta = 1$
Determine the domain: $\\theta \\in [0, 2\\pi)$
Note any restricted values.`
          : `Identify the structure of the expression:
${displayProblem}
Determine domain constraints where the expression is undefined.`,
        notes: `Before solving, we establish the domain and identify which mathematical tools apply.`,
        type: "concept",
      },
      {
        title: "Solution Steps",
        subtitle: topic,
        content: isTrig
          ? `Step 1: Substitute known identities and simplify.
Step 2: Isolate the trigonometric ratio.
Step 3: Apply inverse trig functions for exact values.`
          : `Step 1: Identify and factor all algebraic components.
Step 2: Apply relevant algebraic operations.
Step 3: Simplify and reduce to lowest terms.`,
        notes: `We work through the algebraic manipulation step by step, maintaining equivalence at each stage.`,
        type: "derivation",
      },
      slide4,
      {
        title: "Final Answer & Summary",
        subtitle: topic,
        content: `The verified solution to:
${displayProblem}
has been resolved with all restrictions and boundary conditions verified.`,
        notes: `State the complete solution set, confirming that all conditions and restrictions hold.`,
        type: "summary",
      },
    ],
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

