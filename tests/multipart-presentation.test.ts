import assert from "node:assert/strict";
import { test } from "node:test";
import {
  extractJson,
  generateCurriculumSolution,
  getQuestionPartLabels,
  normalizeSolution,
  parseQuestionsFromRawText,
  parseSolutionFromMarkdown,
  type ExtractedQuestion,
  type ExtractedSolution,
} from "../lib/json-extractor";

// Regression: the supplied rates-of-change screenshot has two parts in C1
// and six in C2; the old parser kept at most two solution slides.
const speedQuestion = "a) Does the speedometer of a car measure average speed or instantaneous speed? Explain.\nb) Describe situations in which the instantaneous speed and the average speed would be the same.";
const rateParts = [
  "At 3 p.m., the plane was travelling at 850 km/h.",
  "The average speed travelled by the train during the 10-h trip was 130 km/h.",
  "The fire was spreading at a rate of 2 ha/h.",
  "5 s after an antiseptic spray is applied, the bacteria population is decreasing at a rate of 60 bacteria per second.",
  "He lost 4 kg per month over a 5-month period.",
  "After being heated for 2 min, the water temperature was rising at 1°C/min.",
];
const labels = rateParts.map((_, index) => String.fromCharCode(97 + index));
const rateQuestion = `State if each situation represents average rate of change or instantaneous rate of change. Give reasons for your answer.\n${rateParts.map((text, index) => `${labels[index]}) ${text}`).join("\n")}`;

function makeDeck(problem: string, partLabels = labels): ExtractedSolution {
  return {
    explanation: "Answers to each part.",
    slides: [
      { title: "Problem", content: problem, notes: "Read the problem.", type: "intro" },
      ...partLabels.map((label) => ({
        title: "Solution",
        subtitle: `Part ${label}: Explanation`,
        content: `Answer for part ${label}.`,
        notes: `Explain part ${label}.`,
        type: "solution",
      })),
      { title: "Conclusion", content: "All final answers.", notes: "Review the answers.", type: "conclusion" },
    ],
  };
}

for (const graphing of [false, true]) {
  test(`all six solution parts survive normalization ${graphing ? "with" : "without"} graphs`, () => {
    const problem = graphing ? `Sketch a graph for each situation. ${rateQuestion}` : rateQuestion;
    const deck = makeDeck(problem);
    const graphData = { functions: [{ mathjs: "x^2", equation: "y = x^2" }] };
    if (graphing) {
      deck.slides.splice(4, 0, {
        title: "Evidence", content: "Graph for part c.", notes: "Discuss the graph.", type: "graph", graphData,
      });
    }

    const result = normalizeSolution(deck, problem, "Calculus & Rates of Change");
    assert.ok(result);
    assert.deepEqual(result.slides.filter((slide) => slide.type === "solution").map((slide) => slide.content), labels.map((label) => `Answer for part ${label}.`));
    assert.equal(result.slides.at(-1)?.type, "conclusion");
    if (graphing) {
      assert.deepEqual(result.slides.find((slide) => slide.type === "graph")?.graphData, graphData);
    }
  });
}

test("a shortened AI problem slide is replaced by the full original question", () => {
  const deck = makeDeck(speedQuestion, ["a", "b"]);
  deck.slides[0].content = speedQuestion.split("\n")[0];
  const result = extractJson<ExtractedSolution>(JSON.stringify(deck), "solution", speedQuestion);
  assert.equal(result.slides[0].content, speedQuestion);
});

test("markdown presentations retain every solution part and the conclusion", () => {
  const deck = makeDeck(rateQuestion);
  const markdown = deck.slides.map((slide, index) => `## Slide ${index + 1}: ${slide.title}\n${slide.content}\nNotes: ${slide.notes}`).join("\n\n");
  const result = parseSolutionFromMarkdown(markdown, rateQuestion);
  assert.ok(result);
  assert.deepEqual(result.slides.filter((slide) => slide.type === "solution").map((slide) => slide.content), labels.map((label) => `Answer for part ${label}.`));
  assert.equal(result.slides.at(-1)?.content, "All final answers.");
});

test("OCR text keeps both parent questions and all their original subparts", () => {
  const raw = `Communicate Your Understanding\nC1 ${speedQuestion}\nC2 ${rateQuestion}`;
  const questions = parseQuestionsFromRawText(raw);
  assert.deepEqual(questions.map((question) => question.id), ["C1", "C2"]);
  assert.equal(questions[0].text, speedQuestion.replace(/\s+/g, " "));
  assert.equal(questions[1].text, rateQuestion.replace(/\s+/g, " "));
});

test("unrelated questions cannot supply invented subparts to C1", () => {
  const input = { questions: [
    { id: "C1", text: speedQuestion },
    { id: "C2", text: "Compare the parabolas y = x^2 and y = -x^2." },
  ] };
  const result = extractJson<{ questions: ExtractedQuestion[] }>(JSON.stringify(input), "questions");
  assert.equal(result.questions[0].text, speedQuestion);
});

test("offline fallback retains the complete multipart problem including its formulas", () => {
  const question = `${rateQuestion}\nUse $v = d/t$ when explaining average speed.`;
  const result = generateCurriculumSolution(question, "Calculus & Rates of Change");
  assert.equal(result.slides[0].content, question);
});

for (const [question, expected] of [
  [rateQuestion, labels],
  ["Explain: (a) average speed; (b) instantaneous speed; (c) their units.", ["a", "b", "c"]],
  ["i) Find the slope.\nii) Find the tangent.\niii) Explain the result.", ["i", "ii", "iii"]],
  ["Part 1: Find the slope. Part 2: Explain the result.", ["1", "2"]],
  ["Compare $f(x) = (a) x^2$ with $g(x) = (b) x^3$.", []],
] as const) {
  test(`subpart coverage detects ${expected.join(", ") || "no labels in math"}`, () => {
    assert.deepEqual(getQuestionPartLabels(question), expected);
  });
}
