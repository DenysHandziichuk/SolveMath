"use client";

import { cn } from "@/lib/utils";

interface MathRendererProps {
  text: string;
  className?: string;
}

export function MathRenderer({ text, className }: MathRendererProps) {
  if (!text) return null;

  // Clean the text: NEVER show $ symbols
  const cleanText = text.replace(/\$/g, "");

  // Split text by newlines and render each line
  const lines = cleanText.split("\n").filter(line => line.trim().length > 0);

  return (
    <div className={cn("flex flex-col", className || "gap-4")}>
      {lines.map((line, lineIdx) => {
        // Process plain text for ^ exponents (e.g., 2^x)
        // We split by ^ followed by alphanumeric characters
        const subParts = line.split(/(\^[a-zA-Z0-9]+)/g);
        
        return (
          <p key={lineIdx} className="leading-tight">
            {subParts.map((subPart, j) => {
              if (subPart.startsWith("^")) {
                return (
                  <sup key={j} className="text-[0.6em] leading-none ml-0.5 align-top relative -top-[0.2em]">
                    {subPart.slice(1)}
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
