/** Keep consecutive answer labels on separate lines without splitting math or prose references. */
export function normalizeSlideLineBreaks(text: string): string {
  const normalized = text
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n(?!(eq|ne|not|nu|nabla|natural|nearrow|neg|newline|norm|ni|nsubseteq|nparallel)\b)/gi, "\n");

  // Mask math with equal-length spaces so marker offsets still refer to the original text.
  const prose = normalized.replace(
    /\$\$[\s\S]*?\$\$|\$[^$\n]*?\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\)/g,
    (math) => " ".repeat(math.length)
  );
  const edits: { start: number; end: number; replacement: string }[] = [];
  let previous: { style: string; value: number; isListItem: boolean } | undefined;

  for (const match of prose.matchAll(/(^|[\s;])((?:\*\*)?([A-Za-z]|\d{1,2})([:.)])(?:\*\*)?)(?=\s|$)/gm)) {
    const [, prefix, marker, label, punctuation] = match;
    const start = match.index + prefix.length;
    const numeric = /^\d+$/.test(label);
    const style = `${numeric ? "number" : label === label.toUpperCase() ? "upper" : "lower"}${punctuation}`;
    const value = numeric ? Number(label) : label.charCodeAt(0);
    const linePrefix = normalized.slice(normalized.lastIndexOf("\n", start - 1) + 1, start);
    const atLineStart = /^[ \t]*(?:[-*•][ \t]+)?$/.test(linePrefix);
    const continuesList = Boolean(previous?.isListItem && previous.style === style && previous.value + 1 === value);

    if (continuesList && !atLineStart) {
      let breakStart = start;
      while (breakStart > 0 && /[ \t]/.test(normalized[breakStart - 1])) breakStart--;
      const labelEnd = start + marker.length;
      const followingWhitespace = normalized.slice(labelEnd).match(/^[ \t]*(?:\r?\n[ \t]*)?/)?.[0] || "";
      edits.push({
        start: breakStart,
        end: labelEnd + followingWhitespace.length,
        replacement: `\n${marker} `,
      });
    }
    previous = { style, value, isListItem: atLineStart || continuesList };
  }

  return edits.reverse().reduce(
    (result, edit) => result.slice(0, edit.start) + edit.replacement + result.slice(edit.end),
    normalized
  );
}
