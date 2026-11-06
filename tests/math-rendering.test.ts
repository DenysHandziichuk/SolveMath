import assert from "node:assert/strict";
import { test } from "node:test";
import { renderSafeMath } from "../lib/math-rendering";
import { cleanSpeakerScript, parseSolutionFromMarkdown } from "../lib/json-extractor";

test("untrusted mathematics cannot create executable links or external images", () => {
  for (const tex of [String.raw`\href{javascript:alert(1)}{click}`, String.raw`\includegraphics{https://example.com/track.png}`, String.raw`\htmlStyle{position:fixed;inset:0}{overlay}`]) {
    const html = renderSafeMath(tex, false);
    assert.doesNotMatch(html, /<a\b|<img\b|href=["']javascript:|style=["'][^"']*position:fixed/i);
  }
});

test("invalid and excessive mathematics stays escaped and normal equations retain MathML", () => {
  const tex = '<img src=x onerror="alert(1)">' + "x".repeat(10001);
  const fallback = renderSafeMath(tex, false);
  assert.ok(fallback.startsWith("&lt;img"));
  assert.doesNotMatch(fallback, /<img/);
  assert.match(renderSafeMath(String.raw`\frac{x^2-1}{x+1}`, true), /katex-mathml/);
  assert.ok(renderSafeMath(String.raw`\def\a{\a}\a`, false).length < 100000);
});

test("missing notes stay empty instead of inventing a generic teaching script", () => {
  assert.equal(cleanSpeakerScript(""), "");
  const markdown = parseSolutionFromMarkdown("## Slide 1: Problem\nSolve x + 1 = 2.\n## Slide 2: Solution\nx = 1.\n## Slide 3: Conclusion\nx = 1.");
  assert.ok(markdown?.slides.every((slide) => slide.notes === ""));
  assert.equal(cleanSpeakerScript("Welcome everyone!"), "");
  assert.equal(cleanSpeakerScript("Welcome everyone! Subtract 3 from both sides."), "Subtract 3 from both sides.");
  assert.equal(cleanSpeakerScript("The Remainder Theorem gives P(2) = 0."), "The Remainder Theorem gives P(2) = 0.");
});

test("copy cleanup does not erase mathematical instructions in the original problem", async () => {
  const { extractJson } = await import("../lib/json-extractor");
  const problem = "State all governing conditions.\nKey Takeaways: explain why the roots satisfy the original equation.";
  const result = extractJson<{ slides: { content: string }[] }>(JSON.stringify({ slides: [
    { title: "Problem", type: "intro", content: problem },
    { title: "Solution", type: "solution", content: "Use the original equation." },
    { title: "Conclusion", type: "conclusion", content: "Check the conditions." },
  ] }), "solution", problem);
  assert.equal(result.slides[0].content, problem);
});
