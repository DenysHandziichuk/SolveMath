"use client";

import { useMemo } from "react";
import katex from "katex";
import { cn } from "@/lib/utils";

interface MathRendererProps {
  text: string;
  className?: string;
  inline?: boolean;
}

// List of allowed multi-letter math identifiers in raw text or math mode (without backslash)
const MATH_FUNCTIONS = new Set([
  "sin", "cos", "tan", "cot", "sec", "csc",
  "arcsin", "arccos", "arctan", "sinh", "cosh", "tanh",
  "log", "ln", "exp", "lg", "sqrt",
  "max", "min", "lim", "mod", "deg", "det", "dim", "gcd", "lcm",
  "abs", "pi", "theta", "alpha", "beta", "gamma", "delta", "lambda", "mu", "sigma", "omega", "phi"
]);

function isProseWord(word: string): boolean {
  if (!word || word.length < 2) return false;
  return !MATH_FUNCTIONS.has(word.toLowerCase());
}

// Extract an un-delimited equation or inequality: e.g. f(x) = x^2, y = 2x + 1, b > 0, x >= 0
function extractEquation(str: string, startIndex: number) {
  const lhsMatch = str
    .slice(startIndex)
    .match(/^(?:[a-zA-Z](?:'[a-zA-Z]?|\^[a-zA-Z0-9]+)?\([a-zA-Z0-9,\s\-+*.]+\)|[a-zA-Z])\s*(?:=|>=|<=|!=|\\ge\b|\\le\b|\\neq\b|>|<)\s*/);
  if (!lhsMatch) return null;

  const pos = startIndex + lhsMatch[0].length;
  const remaining = str.slice(pos);

  const tokenRegex = /(\s+)|([,;:?.!](?:\s|$))|(\\[a-zA-Z]+(?:\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\})*)|([a-zA-Z]{2,})|([0-9]+(?:\.[0-9]+)?|[a-zA-Z]|[+\-*/^=<>()[\]{}])/g;
  let match: RegExpExecArray | null;
  let lastValidRhsLength = 0;
  let openParens = 0;

  while ((match = tokenRegex.exec(remaining)) !== null) {
    const [, whitespace, punct, latexCmd, word, symbol] = match;

    if (punct) {
      break;
    }

    if (word) {
      const nextChar = remaining[tokenRegex.lastIndex];
      const isMathAttached = nextChar && /[\^_()\[\]{}*\/+\-=<>]/.test(nextChar);

      if (!isMathAttached && isProseWord(word)) {
        break;
      }
      lastValidRhsLength = tokenRegex.lastIndex;
      continue;
    }

    if (latexCmd) {
      lastValidRhsLength = tokenRegex.lastIndex;
      continue;
    }

    if (symbol) {
      if (symbol === '(' || symbol === '[' || symbol === '{') {
        openParens++;
      }
      if (symbol === ')' || symbol === ']' || symbol === '}') {
        if (openParens <= 0) {
          break;
        }
        openParens--;
      }
      lastValidRhsLength = tokenRegex.lastIndex;
      continue;
    }

    if (whitespace) {
      continue;
    }
  }

  if (lastValidRhsLength === 0) return null;
  const fullEquation = str.slice(startIndex, pos + lastValidRhsLength);
  return {
    equation: fullEquation,
    endIndex: pos + lastValidRhsLength,
  };
}

interface TextSegment {
  type: "display-math" | "inline-math" | "prose";
  value: string;
}

// Process plain/mixed text, extracting equations, LaTeX commands, standalone powers, and prose
function processTextSegment(text: string, segments: TextSegment[]) {
  let currentIndex = 0;

  while (currentIndex < text.length) {
    // 1. Check if an equation/inequality starts at currentIndex
    const eq = extractEquation(text, currentIndex);
    if (eq) {
      segments.push({ type: "inline-math", value: eq.equation });
      currentIndex = eq.endIndex;
      continue;
    }

    // 2. Check if a LaTeX command starts at currentIndex: e.g. \sqrt{x}, \frac{1}{2}, \pm
    const latexMatch = text.slice(currentIndex).match(/^(\\[a-zA-Z]+(?:\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\})*)/);
    if (latexMatch) {
      segments.push({ type: "inline-math", value: latexMatch[1] });
      currentIndex += latexMatch[1].length;
      continue;
    }

    // 3. Check if a standalone variable with exponent or subscript starts at currentIndex: e.g. x^2, x_1
    const powerMatch = text.slice(currentIndex).match(/^([a-zA-Z0-9]+(?:\^[0-9a-zA-Z]+|\^\{[^{}]+\}|_[0-9a-zA-Z]+|_{[^{}]+\})+)/);
    if (powerMatch) {
      segments.push({ type: "inline-math", value: powerMatch[1] });
      currentIndex += powerMatch[1].length;
      continue;
    }

    // Find next potential math start
    const nextEqMatch = text.slice(currentIndex + 1).search(/\b(?:[a-zA-Z](?:'[a-zA-Z]?|\^[a-zA-Z0-9]+)?\([a-zA-Z0-9,\s\-+*.]+\)|[a-zA-Z])\s*(?:=|>=|<=|!=|\\ge\b|\\le\b|\\neq\b|>|<)\s*/);
    const nextLatexMatch = text.slice(currentIndex + 1).search(/\\[a-zA-Z]+/);
    const nextPowerMatch = text.slice(currentIndex + 1).search(/\b[a-zA-Z0-9]+(?:\^|_)/);

    const candidates = [nextEqMatch, nextLatexMatch, nextPowerMatch].filter((idx) => idx !== -1);

    if (candidates.length === 0) {
      const remainingProse = text.slice(currentIndex);
      if (remainingProse) {
        segments.push({ type: "prose", value: remainingProse });
      }
      break;
    }

    const minOffset = Math.min(...candidates);
    const proseEnd = currentIndex + 1 + minOffset;
    const prose = text.slice(currentIndex, proseEnd);
    if (prose) {
      segments.push({ type: "prose", value: prose });
    }
    currentIndex = proseEnd;
  }
}

// Tokenize a line into display math, inline math, and prose segments
function segmentLine(line: string): TextSegment[] {
  const segments: TextSegment[] = [];

  const explicitTokens = line.split(/(\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\$[^\$\n]+?\$|\\\(.+?\\\))/g);

  for (const token of explicitTokens) {
    if (!token) continue;

    // Display math: $$...$$ or \[...\]
    if (
      (token.startsWith("$$") && token.endsWith("$$") && token.length >= 4) ||
      (token.startsWith("\\[") && token.endsWith("\\]") && token.length >= 4)
    ) {
      const inner = token.slice(2, -2).trim();
      segments.push({ type: "display-math", value: inner });
      continue;
    }

    // Inline math: $...$ or \(...\)
    if (
      (token.startsWith("$") && token.endsWith("$") && token.length >= 2) ||
      (token.startsWith("\\(") && token.endsWith("\\)") && token.length >= 4)
    ) {
      const isParen = token.startsWith("\\(");
      const inner = isParen ? token.slice(2, -2).trim() : token.slice(1, -1).trim();

      // Check if this inline math actually contains English words NOT inside \text{...}
      const strippedForWords = inner
        .replace(/\\(?:text|mathrm|operatorname)\{[^}]*\}/g, "")
        .replace(/\\[a-zA-Z]+/g, "");
      const hasUnescapedProseWords = /\b[a-zA-Z]{2,}\b/g;
      let match: RegExpExecArray | null;
      let foundProseWord = false;
      while ((match = hasUnescapedProseWords.exec(strippedForWords)) !== null) {
        if (isProseWord(match[0])) {
          foundProseWord = true;
          break;
        }
      }

      if (!foundProseWord) {
        segments.push({ type: "inline-math", value: inner });
        continue;
      }

      // If it contains unescaped English words (like "$f(x) = x^2 and f(x) = -x^2$"),
      // process as mixed text so words are not italicized as cursive
      processTextSegment(inner, segments);
      continue;
    }

    // Plain text segment
    processTextSegment(token, segments);
  }

  return segments;
}

export function MathRenderer({ text, className, inline = false }: MathRendererProps) {
  const renderedElements = useMemo(() => {
    if (!text) return null;

    // Helper to sanitize and normalize LaTeX strings for KaTeX
    const renderTex = (rawTex: string, displayMode: boolean) => {
      try {
        let tex = rawTex.trim();

        // 1. Normalize double-escaped LaTeX commands from JSON: \\\\frac -> \frac, \\\\sqrt -> \sqrt
        tex = tex.replace(/\\\\([a-zA-Z]+)/g, "\\$1");

        // 2. Normalize common raw arithmetic / relational signs to LaTeX inside math mode
        // (Only when not already preceded by a LaTeX backslash)
        tex = tex.replace(/(?<!\\)>=/g, " \\ge ");
        tex = tex.replace(/(?<!\\)<=/g, " \\le ");
        tex = tex.replace(/(?<!\\)!=/g, " \\neq ");
        tex = tex.replace(/(?<!\\)<>/g, " \\neq ");
        tex = tex.replace(/(?<!\\)\+-/g, " \\pm ");
        tex = tex.replace(/(?<!\\)\+\/-/g, " \\pm ");

        // Normalize known math function names without backslash: sqrt -> \sqrt, sin -> \sin, etc.
        tex = tex.replace(/(?<!\\)\b(sqrt|sin|cos|tan|cot|sec|csc|log|ln|lim|max|min|exp|arcsin|arccos|arctan|pi|theta)\b/g, "\\$1");

        // Convert standalone * between numbers or variables into multiplication dot \cdot
        tex = tex.replace(/([0-9a-zA-Z)\]}])\s*\*\s*([0-9a-zA-Z(\[{])/g, "$1 \\cdot $2");

        // Convert -> to \to
        tex = tex.replace(/(?<![\\-])->/g, " \\to ");

        return katex.renderToString(tex, {
          displayMode,
          throwOnError: false,
          strict: false,
          trust: true,
          output: "htmlAndMathml",
        });
      } catch {
        return rawTex;
      }
    };

    // Split multi-line text (supporting both raw \n and escaped \n, ignoring empty lines)
    // IMPORTANT: Only replace escaped \n when NOT part of LaTeX commands (e.g. \neq, \nabla, \not, etc.)
    const normalizedText = text
      .replace(/\\r\\n/g, "\n")
      .replace(/\\n(?!(eq|ne|not|nu|nabla|natural|nearrow|neg|newline|norm|ni|nsubseteq|nparallel)\b)/gi, "\n");
    const lines = normalizedText.split("\n").filter((l) => l.trim().length > 0);

    // Helper to render markdown bold/italic in prose without raw asterisks
    const renderProseWithMarkdown = (proseText: string, keyPrefix: string | number) => {
      if (!proseText) return null;

      // 1. Convert leading bullet asterisks or dashes (* or -) into clean bullet points •
      const cleaned = proseText.replace(/^([ \t]*)[*\-][ \t]+/gm, "$1• ");

      // 2. Tokenize bold (*** or **) and italic (*)
      const tokens = cleaned.split(/(\*\*\*[^\*\n]+?\*\*\*|\*\*[^\*\n]+?\*\*|\*(?!\s)[^\*\n]+?(?<!\s)\*)/g);

      return tokens.map((tok, i) => {
        if (!tok) return null;

        if (tok.startsWith("***") && tok.endsWith("***") && tok.length >= 6) {
          return (
            <strong key={`${keyPrefix}-bi-${i}`} className="font-bold italic text-slate-100 dark:text-white">
              {tok.slice(3, -3)}
            </strong>
          );
        }

        if (tok.startsWith("**") && tok.endsWith("**") && tok.length >= 4) {
          return (
            <strong key={`${keyPrefix}-b-${i}`} className="font-bold text-slate-100 dark:text-white">
              {tok.slice(2, -2)}
            </strong>
          );
        }

        if (tok.startsWith("*") && tok.endsWith("*") && tok.length >= 2) {
          return (
            <em key={`${keyPrefix}-i-${i}`} className="italic text-slate-200 dark:text-slate-300">
              {tok.slice(1, -1)}
            </em>
          );
        }

        // Clean out any dangling or unclosed ** asterisks so raw stars never leak to UI
        const stripped = tok.replace(/\*\*/g, "");
        return <span key={`${keyPrefix}-t-${i}`}>{stripped}</span>;
      });
    };

    return lines.map((line, lineIdx) => {
      const trimmed = line.trim();

      // Check for display math blocks: $$...$$ or \[...\]
      if (
        (trimmed.startsWith("$$") && trimmed.endsWith("$$") && trimmed.length > 4) ||
        (trimmed.startsWith("\\[") && trimmed.endsWith("\\]") && trimmed.length > 4)
      ) {
        const formula = trimmed.slice(2, -2).trim();
        return (
          <div
            key={lineIdx}
            className="my-1.5 overflow-x-auto text-center font-normal tracking-normal py-0.5"
            dangerouslySetInnerHTML={{ __html: renderTex(formula, true) }}
          />
        );
      }

      const segments = segmentLine(line);

      const contentSpans = segments.map((seg, segIdx) => {
        if (seg.type === "display-math") {
          return (
            <span
              key={segIdx}
              className="mx-1 inline-block"
              dangerouslySetInnerHTML={{ __html: renderTex(seg.value, true) }}
            />
          );
        }

        if (seg.type === "inline-math") {
          return (
            <span
              key={segIdx}
              className="mx-0.5 inline-block font-normal"
              dangerouslySetInnerHTML={{ __html: renderTex(seg.value, false) }}
            />
          );
        }

        return <span key={segIdx}>{renderProseWithMarkdown(seg.value, `prose-${lineIdx}-${segIdx}`)}</span>;
      });

      if (inline) {
        return (
          <span key={lineIdx} className="inline-flex items-center flex-wrap gap-x-1">
            {contentSpans}
          </span>
        );
      }

      const isBullet = /^[ \t]*[•*\-][ \t]+/.test(line);

      return (
        <p
          key={lineIdx}
          className={cn(
            "leading-relaxed tracking-normal",
            isBullet && "pl-5 sm:pl-6 -indent-5 sm:-indent-6"
          )}
        >
          {contentSpans}
        </p>
      );
    });
  }, [text, inline]);

  if (!text) return null;

  if (inline) {
    return <span className={cn("inline-flex items-center flex-wrap", className)}>{renderedElements}</span>;
  }

  return (
    <div className={cn("flex flex-col gap-3 sm:gap-4", className)}>
      {renderedElements}
    </div>
  );
}
