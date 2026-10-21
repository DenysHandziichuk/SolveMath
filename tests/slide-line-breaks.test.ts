import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeSolution } from "../lib/json-extractor";

function solutionContent(content: string): string {
  const result = normalizeSolution({ slides: [
    { content: "Test each candidate binomial." },
    { content },
    { content: "The factors are B, D, and F." },
  ] });
  assert.ok(result);
  return result.slides[1].content;
}

// Regression: F was attached to E's last line while F's equation wrapped below it.
test("a merged F label starts a new line with its own equation", () => {
  const e = "E: $P(-1/2)=-5/2$, so $2x+1$ is not a factor;";
  const f = "F: $P(-3/2)=0$, so $2x+3$ is a factor.";
  assert.equal(solutionContent(`${e} F:\n$P(-3/2)=0$, so $2x+3$ is a factor.`), `${e}\n${f}`);
});

for (const [input, expected] of [
  ["A: First test. B: Second test. C: Third test.", "A: First test.\nB: Second test.\nC: Third test."],
  ["a) First test; b) Second test.", "a) First test;\nb) Second test."],
  ["1. First step. 2. Second step.", "1. First step.\n2. Second step."],
  ["**E:** First test; **F:** Second test.", "**E:** First test;\n**F:** Second test."],
] as const) {
  test(`consecutive labels get separate lines: ${input}`, () => {
    assert.equal(solutionContent(input), expected);
  });
}

for (const content of [
  "The factors are B, D, and F. Point F: the final point on the diagram.",
  "Factor Theorem: $P(r)=0$ if $x-r$ is a factor.",
  "A: $\\text{A: first B: second}$ is one formula.\nB: $P(x) \\neq 0$.",
  "A: First test.\nB: Second test.\nC: Third test.",
] as const) {
  test(`existing prose, math, and line breaks stay intact: ${content}`, () => {
    assert.equal(solutionContent(content), content);
  });
}
