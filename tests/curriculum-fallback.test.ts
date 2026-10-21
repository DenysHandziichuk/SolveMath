import assert from "node:assert/strict";
import { test } from "node:test";
import { extractJson, generateCurriculumSolution, getPolynomialPlaceholderSolution, isCompleteSolution, type ExtractedSolution } from "../lib/json-extractor";

const placeholderQuestion = "When and why might it be necessary to use a placeholder when dividing a polynomial by a binomial?";

// Regression: C2 displayed a generic checklist and a fabricated "verified"
// conclusion after every external solution model failed (2026-10-17).
test("C2 explains when zero placeholders are needed and why coefficients must stay aligned", () => {
  const result = generateCurriculumSolution(placeholderQuestion, "Polynomial Equations & Functions");
  assert.equal(result.slides[0].content, placeholderQuestion);
  const solution = result.slides.filter((slide) => slide.type === "solution").map((slide) => slide.content).join("\n");
  const notes = result.slides.filter((slide) => slide.type === "solution").map((slide) => slide.notes).join("\n");
  assert.match(solution, /missing (?:power|term)/i);
  assert.match(solution, /zero coefficient|coefficient (?:of )?\$?0\$?/i);
  assert.match(solution, /align|position|column/i);
  assert.match(solution, /0x\^2/);
  assert.match(solution, /1,\s*0,\s*-4,\s*3/);
  assert.match(notes, /zero|missing/i);
  assert.doesNotMatch(solution, /Mathematical Resolution & Analysis|systematically execute/i);
  assert.match(result.slides.at(-1)?.content || "", /placeholder|zero/i);
  assert.equal(isCompleteSolution(result), true);
});

for (const source of ["offline", "malformed model response"] as const) {
  test(`${source} preserves an unsupported problem without pretending to solve it`, () => {
    const question = "Find all real roots of $x^5 - 2x + 7 = 0$.";
    const result = source === "offline"
      ? generateCurriculumSolution(question)
      : extractJson<ExtractedSolution>("The solution service failed.", "solution", question);
    assert.equal(result.slides[0].content, question);
    assert.equal(result.slides.some((slide) => slide.type === "solution" || slide.type === "conclusion"), false);
    assert.doesNotMatch(JSON.stringify(result), /Verified Solution Satisfies All Conditions/);
    assert.equal(isCompleteSolution(result), false);
  });
}

test("an AI response containing the old generic checklist is rejected as incomplete", () => {
  const result = extractJson<ExtractedSolution>(JSON.stringify({ slides: [
    { content: placeholderQuestion },
    { content: "Mathematical Resolution & Analysis: Analyze the problem statement, degrees, and governing conditions." },
    { content: "Verified Solution Satisfies All Conditions" },
  ] }), "solution", placeholderQuestion);
  assert.equal(isCompleteSolution(result), false);
});

test("a specific division exercise cannot be replaced by the illustrative C2 lesson", () => {
  assert.equal(getPolynomialPlaceholderSolution("Divide $x^4 + 5x + 1$ by $x - 2$, using placeholders for missing terms."), null);
});

test("a polynomial restriction question cannot invent an unrelated constant-function lesson", () => {
  const result = generateCurriculumSolution("Explain why there is a restriction on the divisor of a polynomial function. How is the restriction determined?");
  assert.equal(isCompleteSolution(result), false);
  assert.doesNotMatch(JSON.stringify(result), /y = 3/);
});

test("a supplied constant still receives its supported polynomial explanation", () => {
  const result = generateCurriculumSolution("Explain why $y = 7$ is a polynomial function.");
  assert.equal(isCompleteSolution(result), true);
  assert.match(result.slides[1].content, /7x\^0/);
});
