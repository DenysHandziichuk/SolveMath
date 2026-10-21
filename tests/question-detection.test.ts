import assert from "node:assert/strict";
import { test } from "node:test";
import { extractJson, getQuestionPartLabels, type ExtractedQuestion } from "../lib/json-extractor";

// Regression: the 2026-10-17 remainder-theorem worksheet was shown as one C1 card.
const worksheet = [
  "Explain why there is a restriction on the divisor of a polynomial function. How is the restriction determined?",
  "When and why might it be necessary to use a placeholder when dividing a polynomial by a binomial?",
  String.raw`Describe the error in this statement:
$\frac{x^3 + 3x^2 - 2x - 1}{x - 2} = (x^2 + 5x + 8) + 5$`,
  "Given a polynomial function P(x) such that $P(-3) = 0$, what are the divisor and the remainder? What is the relationship between the divisor and P(x)?",
  String.raw`Identify the dividend, divisor, quotient, and remainder in each statement.
a) $\frac{6x^2 + 5x - 7}{3x + 1} = 2x + 1 - \frac{8}{3x + 1}$
b) $12x^3 + 2x^2 + 11x + 14 = (3x + 2)(4x^2 - 2x + 5) + 4$
c) $\frac{5x^3 - 7x^2 - x + 6}{x - 1} = 5x^2 - 2x - 3 + \frac{3}{x - 1}$`,
];

for (const format of ["json", "markdown"] as const) {
  test(`merged ${format} OCR separates C1–C5 and preserves C5's equations and subparts`, () => {
    const transcription = worksheet.map((text, index) => `C${index + 1} ${text}`).join("\n\n");
    const raw = format === "json"
      ? JSON.stringify({ questions: [{ id: "C1", text: transcription, difficulty: 4 }] })
      : `Communicate Your Understanding\n${transcription}`;
    const result = extractJson<{ questions: ExtractedQuestion[] }>(raw, "questions");

    assert.deepEqual(result.questions.map((q) => q.id), ["C1", "C2", "C3", "C4", "C5"]);
    assert.deepEqual(result.questions.map((q) => q.text), worksheet);
    assert.deepEqual(getQuestionPartLabels(result.questions[4].text), ["a", "b", "c"]);
  });
}

test("already separated questions keep their IDs, formulas, and part labels", () => {
  const questions = worksheet.map((text, index) => ({ id: `C${index + 1}`, text, difficulty: 4, type: "Polynomial Equations & Functions" }));
  const result = extractJson<{ questions: ExtractedQuestion[] }>(JSON.stringify({ questions }), "questions");
  assert.deepEqual(result.questions, questions);
});

test("double-escaped OCR line breaks are decoded without damaging LaTeX commands", () => {
  const text = String.raw`Explain the restriction $x \neq 2$.\nC2 Describe the remainder.\na) $\frac{5}{x-2}$\nb) $\neq$`;
  const result = extractJson<{ questions: ExtractedQuestion[] }>(JSON.stringify({ questions: [{ id: "C1", text }] }), "questions");
  assert.deepEqual(result.questions.map((q) => q.id), ["C1", "C2"]);
  assert.equal(result.questions[0].text, String.raw`Explain the restriction $x \neq 2$.`);
  assert.equal(result.questions[1].text, String.raw`Describe the remainder.
a) $\frac{5}{x-2}$
b) $\neq$`);
});
