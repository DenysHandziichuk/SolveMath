"use client";

import { cn } from "@/lib/utils";

interface MathRendererProps {
  text: string;
  className?: string;
}

export function MathRenderer({ text, className }: MathRendererProps) {
  if (!text) return null;

  // Aggressive cleaning: remove LaTeX artifacts and transform symbols
  const cleanText = text
    .replace(/\$/g, "") // Remove $
    .replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, "$1/$2") // Convert \frac{a}{b} to a/b
    .replace(/\\/g, "") // Remove \
    .replace(/\{/g, "") // Remove {
    .replace(/\}/g, "") // Remove }
    .replace(/\*/g, " × ") // keyboard * to math multiplication
    .replace(/\//g, " ÷ ") // keyboard / to math division
    .replace(/\|([^|]+)\|/g, "|$1|"); // Ensure absolute value bars are preserved or styled

  // Split text by newlines and render each line
  const lines = cleanText.split("\n").filter(line => line.trim().length > 0);

  return (
    <div className={cn("flex flex-col", className || "gap-4")}>
      {lines.map((line, lineIdx) => {
        // More robust exponent matching: finds ^ followed by numbers or letters
        // We split and keep the delimiter to process it
        const subParts = line.split(/(\s*\^[a-zA-Z0-9]+\s*)/g);
        
        return (
          <p key={lineIdx} className="leading-tight">
            {subParts.map((subPart, j) => {
              const trimmed = subPart.trim();
              if (trimmed.startsWith("^")) {
                const exponentValue = trimmed.slice(1);
                return (
                  <sup key={j} className="text-[0.6em] leading-none font-bold align-top relative -top-[0.3em] ml-0.5">
                    {exponentValue}
                  </sup>
                );
              }
              return <span key={j}>{subPart}</span>;
            })}
          </p>
        );
      })}
    </div>
  );
}
