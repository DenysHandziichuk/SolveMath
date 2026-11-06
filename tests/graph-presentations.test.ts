import assert from "node:assert/strict";
import { test } from "node:test";
import OpenAI from "openai";
import Groq from "groq-sdk";
import { extractQuestionsFromImage } from "../lib/question-extraction";
import { extractJson, getQuestionPartLabels, type ExtractedQuestion } from "../lib/json-extractor";
import { createBlankSlide, createManualPresentation, getSlideGraphs } from "../lib/presentation";
import { normalizeGraphData, type GraphData } from "../lib/graph-data";
import { compileGraphExpression, graphSegments, sampleGraphFunction, validateGraphExpression } from "../lib/graph-functions";
import { requestSolutionCompletion } from "../lib/solution-completion";

// The attached reciprocal-quadratic worksheet includes three qualitative
// panels, a sign table, and an exact function. None may collapse into OCR text alone.
const panels: GraphData[] = [
  { title: "a)", reconstruction: "approximate", description: "Unscaled quadrant I branch: positive, decreasing, concave up.", functions: [{ points: [{ x: 0.1, y: 6 }, { x: 0.3, y: 2.5 }, { x: 1, y: 0.8 }, { x: 5, y: 0.1 }] }], asymptotes: [{ type: "vertical", value: 0 }, { type: "horizontal", value: 0 }] },
  { title: "b)", reconstruction: "approximate", description: "Unscaled quadrant III branch: negative, decreasing, concave down.", functions: [{ points: [{ x: -5, y: -0.1 }, { x: -1, y: -0.8 }, { x: -0.3, y: -2.5 }, { x: -0.1, y: -6 }] }] },
  { title: "c)", reconstruction: "approximate", description: "Unscaled quadrant II branch: positive, increasing, concave up.", functions: [{ points: [{ x: -5, y: 0.1 }, { x: -1, y: 0.8 }, { x: -0.3, y: 2.5 }, { x: -0.1, y: 6 }] }] },
];
const exactGraph: GraphData = {
  title: "Reciprocal quadratic", reconstruction: "exact",
  functions: [{ mathjs: "-10/((x+5)*(x-1))", color: "#f87171" }],
  bounds: { minX: -11, maxX: 7, minY: -4, maxY: 7 },
  asymptotes: [{ type: "vertical", value: -5 }, { type: "vertical", value: 1 }, { type: "horizontal", value: 0 }],
  points: [{ x: -2, y: 1.1, label: "(-2, 1.1), rounded" }],
};
const table = "Columns: x < -3 | -3 < x < 1 | x = 1 | 1 < x < 5 | x > 5\nSign of f(x): + | - | - | - | +\nSign of slope: + | + | 0 | - | -\nChange in slope: + | - | - | - | +";
const questions: ExtractedQuestion[] = [
  { id: "C1", text: "Describe the slope and change in slope for each graph.\na)\nb)\nc)", type: "Reciprocal functions", difficulty: 5, graphs: panels, visualContext: panels.map((panel) => `${panel.title} ${panel.description}`).join("\n") },
  { id: "C2", text: "A reciprocal of a quadratic function has the following summary table. Sketch a possible graph of the function.", type: "Reciprocal functions", difficulty: 5, visualContext: table },
  { id: "C3", text: "Describe the key features of the function shown.", type: "Reciprocal functions", difficulty: 5, graphs: [exactGraph], visualContext: "Printed equation: y = -10/((x+5)(x-1)). Vertical asymptotes x = -5 and x = 1. Marked point (-2, 1.1), rounded." },
];

function mockVision(responses: unknown[]) {
  const queue = [...responses];
  return new OpenAI({ apiKey: "test-key", fetch: async (_url, init) => {
    const body = JSON.parse(String(init?.body));
    assert.match(body.messages[0].content, /GRAPHS AND TABLES/);
    assert.match(body.messages[0].content, /untrusted worksheet data/);
    return Response.json({ id: "vision", object: "chat.completion", created: 0, model: "vision", choices: [{ index: 0, finish_reason: "stop", message: { role: "assistant", content: JSON.stringify(queue.shift()) } }] });
  } });
}

test("visual verification carries all three panels, the complete sign table, and the printed rational function", async () => {
  const client = mockVision([
    { questions: questions.map(({ id, text, type, difficulty }) => ({ id, text, type, difficulty })) },
    { printedLabels: ["C1", "C2", "C3"], questions: questions.map((question) => ({ ...question, hasVisuals: true })) },
  ]);
  const result = await extractQuestionsFromImage({ imageUrl: "data:image/png;base64,dGVzdA==", model: "primary", fallbackModel: "backup" }, { nvidia: client });
  assert.deepEqual(result.questions, questions);
  assert.deepEqual(getQuestionPartLabels(result.questions[0].text), ["a", "b", "c"]);
  assert.equal(result.questions[1].graphs, undefined); // A table is not an invented source graph.
});

test("verification retries when a visual problem has lost its diagram observations", async () => {
  const bad = { printedLabels: ["C3"], questions: [{ ...questions[2], hasVisuals: true, visualContext: "" }] };
  const good = { printedLabels: ["C3"], questions: [{ ...questions[2], hasVisuals: true }] };
  const result = await extractQuestionsFromImage({ imageUrl: "data:image/png;base64,dGVzdA==", model: "primary", fallbackModel: "backup" }, { nvidia: mockVision([bad, bad, good]) });
  assert.deepEqual(result.questions, [questions[2]]);
});

test("question normalization preserves sampled branches, exact functions, and table data", () => {
  const result = extractJson<{ questions: ExtractedQuestion[] }>(JSON.stringify({ questions }));
  assert.deepEqual(result.questions, questions);
});

for (const question of [questions[0], questions[2]]) {
  test(`${question.id} source graphs reach the solver and appear on the first and relevant solution slides`, async () => {
    const labels = question.id === "C1" ? ["a", "b", "c"] : [""];
    const deck = { explanation: "Read the curves.", slides: [
      { title: "Problem", content: "Shortened prompt", notes: "Read it.", type: "intro" },
      ...labels.map((label) => ({ title: "Solution", subtitle: label ? `Part ${label}: Slope` : "Explanation", content: "Describe the observed behavior.", notes: "Discuss the curve.", type: "solution" })),
      { title: "Conclusion", content: "Review the graph features.", notes: "Review.", type: "conclusion" },
    ] };
    const groq = new Groq({ apiKey: "test-key", fetch: async (_url, init) => {
      const body = JSON.parse(String(init?.body));
      const prompt = body.messages[1].content;
      assert.ok(prompt.includes(JSON.stringify(question.visualContext)));
      assert.ok(prompt.includes(JSON.stringify(question.graphs)));
      return Response.json({ id: "solution", object: "chat.completion", created: 0, model: "test", choices: [{ index: 0, finish_reason: "stop", message: { role: "assistant", content: JSON.stringify(deck) } }] });
    } });
    const result = await requestSolutionCompletion({ questionText: question.text, questionTopic: question.type, systemPrompt: "Return a complete JSON deck.", userPrompt: question.text, maxTokens: 6000, graphs: question.graphs, visualContext: question.visualContext }, { groq });
    assert.equal(result.slides[0].content, question.text);
    assert.equal(result.slides[0].visualContext, question.visualContext);
    assert.deepEqual(result.slides[0].graphs, question.graphs);
    labels.forEach((_, index) => assert.deepEqual(result.slides[index + 1].graphs, [question.graphs![index]]));
  });
}

test("table-only input retains every cell on the Problem slide without creating a source graph", async () => {
  const question = questions[1];
  const deck = { explanation: "A possible function.", slides: [
    { title: "Problem", content: question.text, notes: "Read.", type: "intro" },
    { title: "Solution", content: "A possible function is $1/((x+3)(x-5))$.", notes: "Choose a positive numerator.", type: "solution", graphs: [{ functions: [{ mathjs: "1/((x+3)*(x-5))" }] }] },
    { title: "Conclusion", content: "This is one possible example.", notes: "Other positive multiples also work.", type: "conclusion" },
  ] };
  const groq = new Groq({ apiKey: "test-key", fetch: async () => Response.json({ id: "test", object: "chat.completion", created: 0, model: "test", choices: [{ index: 0, finish_reason: "stop", message: { role: "assistant", content: JSON.stringify(deck) } }] }) });
  const result = await requestSolutionCompletion({ questionText: question.text, questionTopic: question.type, visualContext: table, systemPrompt: "Return JSON.", userPrompt: question.text, maxTokens: 6000 }, { groq });
  assert.equal(result.slides[0].visualContext, table);
  assert.equal(result.slides[0].graphs, undefined);
  assert.equal(result.slides[1].graphs?.[0].functions?.[0].mathjs, "1/((x+3)*(x-5))");
});

test("manual presentations start with real empty placeholders and support graphs on slide one", () => {
  const deck = createManualPresentation();
  assert.equal(deck.creationMode, "manual");
  assert.equal(deck.slides[0].title, "");
  assert.equal(deck.slides[0].content, "");
  const slide = { ...createBlankSlide("graphs"), graphs: panels };
  assert.deepEqual(getSlideGraphs(slide), panels);
  assert.equal(getSlideGraphs({ ...slide, layout: "text" }).length, 0);
  assert.equal(getSlideGraphs({ ...slide, graphs: [] }, { ...deck, graphs: panels }).length, 0);
});

test("reciprocal quadratic sampling preserves its minimum and separates both vertical poles", () => {
  const fn = compileGraphExpression(exactGraph.functions![0].mathjs!);
  assert.equal(fn.evaluate({ x: -2 }), 10 / 9);
  const samples = sampleGraphFunction(exactGraph.functions![0], exactGraph.bounds!);
  const segments = graphSegments(samples, exactGraph.bounds!, exactGraph.asymptotes);
  assert.ok(segments.length >= 3);
  for (const segment of segments) {
    assert.ok(!segment.some((p) => p.x < -5) || !segment.some((p) => p.x > -5));
    assert.ok(!segment.some((p) => p.x < 1) || !segment.some((p) => p.x > 1));
  }
});

test("domains, real-valued gaps, and function-call commas remain correct", () => {
  const bounds = { minX: -5, maxX: 5, minY: -4, maxY: 8 };
  const branch = sampleGraphFunction({ mathjs: "1/x", domain: { min: 0.1 } }, bounds);
  assert.ok(branch.every((point) => point === null || point.x > 0));
  const sqrt = sampleGraphFunction({ mathjs: "sqrt(x^2-1)" }, bounds);
  const segments = graphSegments(sqrt, bounds);
  assert.equal(segments.length, 2);
  const logarithm = sampleGraphFunction({ mathjs: "log(x, 2)", domain: { min: 1, max: 4 } }, bounds);
  assert.equal(logarithm.at(-1)?.y, 2);
  assert.equal(validateGraphExpression("ln(x)"), null);
  assert.notEqual(validateGraphExpression("x = 3"), null);
  assert.notEqual(validateGraphExpression('import("anything")'), null);
  assert.notEqual(validateGraphExpression("unknown(x)"), null);
});

test("untrusted graph data cannot introduce non-finite points or invalid bounds", () => {
  const graph = normalizeGraphData({ bounds: { minX: 1, maxX: 1, minY: 0, maxY: 10 }, points: [{ x: NaN, y: 1 }, { x: 0, y: 2 }], functions: [{ mathjs: "x", domain: { min: -1, max: 1 } }] });
  assert.equal(graph?.bounds, undefined);
  assert.deepEqual(graph?.points, [{ x: 0, y: 2 }]);
  assert.deepEqual(graph?.functions?.[0].domain, { min: -1, max: 1 });
});
