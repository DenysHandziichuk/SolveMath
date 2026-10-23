import assert from "node:assert/strict";
import { test } from "node:test";
import OpenAI from "openai";
import { extractQuestionsFromImage } from "../lib/question-extraction";
import { VisionServiceUnavailableError } from "../lib/vision-completion";

const request = {
  imageUrl: "data:image/png;base64,dGVzdA==",
  model: "primary-vision",
  fallbackModel: "backup-vision",
};

// Regression: the user's polynomial worksheet became three renumbered cards,
// and minus signs in C2 were transcribed as multiplication dots.
const worksheet = [
  "Describe what is meant by a root, a zero, and an x-intercept. How are they related?",
  "Without solving, describe two ways to show that 2, -1, 3, and -2 are the roots of the polynomial equation $x^4 - 2x^3 - 7x^2 + 8x + 12 = 0$.",
  "A polynomial equation of degree four has exactly two distinct real roots. How many x-intercepts does the graph of the polynomial function have?",
  "Describe the different methods that can be used to factor a polynomial function.",
  "Suppose the degree of a polynomial function is $n$. What is the maximum number of real roots of the corresponding equation? Will the number of x-intercepts of the graph of the function be the same as the number of roots? Explain.",
];
const questions = worksheet.map((text, index) => ({
  id: "C" + (index + 1), text, difficulty: 5, type: "Polynomial Equations & Functions",
}));
const verified = { printedLabels: questions.map((question) => question.id), questions };
const mergedDraft = { questions: [
  { ...questions[0], text: worksheet[0] + "\n\n" + worksheet[1].replace(/ - /g, " \\cdot ") },
  { ...questions[1], text: worksheet[2] + "\n\n" + worksheet[3] },
  { ...questions[2], text: worksheet[4] },
] };

// Mock only the HTTP boundary; use the real SDK, recovery, parsing, and validation.
function visionClient(responses: unknown[]) {
  const remaining = [...responses];
  return new OpenAI({
    apiKey: "test-key",
    fetch: async () => Response.json({
      id: "vision-test", object: "chat.completion", created: 0, model: "vision",
      choices: [{
        index: 0, finish_reason: "stop",
        message: { role: "assistant", content: JSON.stringify(remaining.shift() ?? { questions: [] }) },
      }],
    }),
  });
}

test("visual verification restores C1–C5 and the printed polynomial from a merged draft", async () => {
  const result = await extractQuestionsFromImage(request, { nvidia: visionClient([mergedDraft, verified]) });
  assert.deepEqual(result.questions, questions);
});

for (const [scenario, invalid] of [
  ["missing parents", { ...verified, questions: mergedDraft.questions }],
  ["duplicate IDs", { ...verified, questions: [questions[0], questions[0], ...questions.slice(2)] }],
  ["wrong reading order", { ...verified, questions: [...questions].reverse() }],
  ["missing visual inventory", { questions }],
  ["parent hidden inside an entry", {
    printedLabels: ["C1"],
    questions: [{ ...questions[0], text: worksheet[0] + "\nC2 " + worksheet[1] }],
  }],
] as const) {
  test("verification with " + scenario + " recovers a complete worksheet through the fallback", async () => {
    const nvidia = visionClient([mergedDraft, invalid, verified]);
    const result = await extractQuestionsFromImage(request, { nvidia });
    assert.deepEqual(result.questions, questions);
  });
}

test("failed verification never returns the unverified merged draft as successful detection", async () => {
  const nvidia = visionClient([mergedDraft, mergedDraft, mergedDraft]);
  await assert.rejects(extractQuestionsFromImage(request, { nvidia }), VisionServiceUnavailableError);
});

test("an unnumbered problem retains all subparts and deliberately incorrect printed mathematics", async () => {
  const text = "Describe the error in each statement.\na) $1 - 2 = 3$\nb) $2 + 2 = 5$\nc) $3^2 = 6$";
  const unnumbered = { id: "Q1", text, difficulty: 3, type: "Algebra" };
  const nvidia = visionClient([
    { questions: [unnumbered] },
    { printedLabels: [], questions: [unnumbered] },
  ]);
  const result = await extractQuestionsFromImage(request, { nvidia });
  assert.deepEqual(result.questions, [unnumbered]);
});

test("an image without math questions returns an empty list without fabricating a problem", async () => {
  const nvidia = visionClient([{ questions: [] }, { printedLabels: [], questions: [] }]);
  const result = await extractQuestionsFromImage(request, { nvidia });
  assert.deepEqual(result, { questions: [] });
});
