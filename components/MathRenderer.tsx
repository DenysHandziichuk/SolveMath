"use client";

import { useMemo } from "react";
import katex from "katex";
import { cn } from "@/lib/utils";

interface MathRendererProps {
  text: string;
  className?: string;
  inline?: boolean;
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
        // Graceful fallback to escaped text if KaTeX fails
        return rawTex;
      }
    };

    // Split multi-line text (supporting both raw \n and escaped \n, ignoring empty lines)
    // IMPORTANT: Only replace escaped \n when NOT part of LaTeX commands (e.g. \neq, \nabla, \not, etc.)
    const normalizedText = text
      .replace(/\\r\\n/g, "\n")
      .replace(/\\n(?!(eq|ne|not|nu|nabla|natural|nearrow|neg|newline|norm|ni|nsubseteq|nparallel)\b)/gi, "\n");
    const lines = normalizedText.split("\n").filter((l) => l.trim().length > 0);

    // Helper to detect if content wrapped in $ is actually English prose and not math
    const isProseSegment = (str: string): boolean => {
      const hasMathSymbols = /\\[a-zA-Z]+|[=^_{}\+\-\*\/<>]|\b(sin|cos|tan|log|ln|pi|theta)\b/i.test(str);
      const hasWordSpaces = /\b[a-zA-Z]{2,}\s+[a-zA-Z]{2,}\b/.test(str);
      return !hasMathSymbols && hasWordSpaces;
    };

    return lines.map((line, lineIdx) => {
      const trimmed = line.trim();

      // Check for display math blocks: $$...$$ or \[...\]
      if (
        (trimmed.startsWith("$$") && trimmed.endsWith("$$") && trimmed.length > 4) ||
        (trimmed.startsWith("\\[") && trimmed.endsWith("\\]") && trimmed.length > 4)
      ) {
        const formula = trimmed.slice(2, -2).trim();
        if (isProseSegment(formula)) {
          return (
            <p key={lineIdx} className="my-2 leading-relaxed font-normal">
              {formula}
            </p>
          );
        }

        return (
          <div
            key={lineIdx}
            className="my-2 overflow-x-auto text-center font-normal tracking-normal py-1"
            dangerouslySetInnerHTML={{ __html: renderTex(formula, true) }}
          />
        );
      }

      // Tokenize by math delimiters: $$...$$, $...$, \[...\], \(...\)
      // Preserves delimiters in returned array
      const parts = line.split(
        /(\$\$[\s\S]+?\$\$|\$[^\$\n]+?\$|\\\[[\s\S]+?\\\]|\\\(.+?\\\)|\b[a-zA-Z]\([a-zA-Z]\)\s*=\s*[^,;.?!]+)/g
      );

      const contentSpans = parts.map((part, partIdx) => {
        if (!part) return null;

        // 1. Display math $$...$$
        if (part.startsWith("$$") && part.endsWith("$$") && part.length >= 4) {
          const inner = part.slice(2, -2).trim();
          if (isProseSegment(inner)) {
            return <span key={partIdx}>{inner}</span>;
          }
          return (
            <span
              key={partIdx}
              className="mx-1 inline-block"
              dangerouslySetInnerHTML={{ __html: renderTex(inner, true) }}
            />
          );
        }

        // 2. Display math \[...\]
        if (part.startsWith("\\[") && part.endsWith("\\]") && part.length >= 4) {
          const inner = part.slice(2, -2).trim();
          if (isProseSegment(inner)) {
            return <span key={partIdx}>{inner}</span>;
          }
          return (
            <span
              key={partIdx}
              className="mx-1 inline-block"
              dangerouslySetInnerHTML={{ __html: renderTex(inner, true) }}
            />
          );
        }

        // 3. Inline math $...$
        if (part.startsWith("$") && part.endsWith("$") && part.length >= 2) {
          const inner = part.slice(1, -1).trim();
          if (isProseSegment(inner)) {
            return <span key={partIdx}>{inner}</span>;
          }
          return (
            <span
              key={partIdx}
              className="mx-0.5 inline-block font-normal"
              dangerouslySetInnerHTML={{ __html: renderTex(inner, false) }}
            />
          );
        }

        // 4. Inline math \(...\)
        if (part.startsWith("\\(") && part.endsWith("\\)") && part.length >= 4) {
          return (
            <span
              key={partIdx}
              className="mx-0.5 inline-block font-normal"
              dangerouslySetInnerHTML={{ __html: renderTex(part.slice(2, -2), false) }}
            />
          );
        }

        // 5. Plain text segment that contains raw LaTeX commands or math formulas without delimiters
        // E.g. \frac{1}{2}, \sqrt{x}, \ge, \le, \sin, \cos, \pi, \theta, x^2, or f(x) = ...
        if (
          /\\[a-zA-Z]+|\^[0-9a-zA-Z{]|_[0-9a-zA-Z{]|>=|<=|!=|\bpi\b|\btheta\b|\binfty\b/.test(
            part
          ) &&
          !/^[a-zA-Z\s]+$/.test(part) // not purely english words
        ) {
          // If the segment contains multiple English words separated by spaces,
          // DO NOT pass the whole sentence to KaTeX! KaTeX ignores spaces and renders all words in italic math font.
          // Instead, split out the LaTeX commands and only render the math commands with KaTeX.
          if (/\b[a-zA-Z]{2,}\s+[a-zA-Z]{2,}\b/.test(part)) {
            const subSegments = part.split(/(\\[a-zA-Z]+(?:\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\})*|[a-zA-Z]\([a-zA-Z]\)\s*=\s*[^,;.?!]+)/g);
            return (
              <span key={partIdx}>
                {subSegments.map((sub, subIdx) => {
                  if (!sub) return null;
                  if (sub.startsWith("\\") || /^[a-zA-Z]\([a-zA-Z]\)\s*=/.test(sub)) {
                    return (
                      <span
                        key={subIdx}
                        className="mx-0.5 inline-block font-normal"
                        dangerouslySetInnerHTML={{ __html: renderTex(sub, false) }}
                      />
                    );
                  }
                  return <span key={subIdx}>{sub}</span>;
                })}
              </span>
            );
          }

          return (
            <span
              key={partIdx}
              className="mx-0.5 inline-block font-normal"
              dangerouslySetInnerHTML={{ __html: renderTex(part, false) }}
            />
          );
        }

        // 6. Regular prose text
        return <span key={partIdx}>{part}</span>;
      });

      if (inline) {
        return (
          <span key={lineIdx} className="inline-flex items-center flex-wrap gap-x-1">
            {contentSpans}
          </span>
        );
      }

      return (
        <p key={lineIdx} className="leading-relaxed tracking-normal">
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
    <div className={cn("flex flex-col gap-2 sm:gap-2.5", className)}>
      {renderedElements}
    </div>
  );
}
