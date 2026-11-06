import katex from "katex";

export function escapeMathHtml(text: string): string {
  return text.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]!));
}

/** OCR, AI output, and saved slide text must never enable HTML or remote resources. */
export function renderSafeMath(tex: string, displayMode: boolean): string {
  if (tex.length > 10000) return escapeMathHtml(tex);
  try {
    return katex.renderToString(tex, {
      displayMode,
      throwOnError: false,
      strict: false,
      trust: false,
      maxSize: 20,
      maxExpand: 500,
      output: "htmlAndMathml",
    });
  } catch { return escapeMathHtml(tex); }
}
