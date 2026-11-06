import assert from "node:assert/strict";
import { test } from "node:test";
import Groq from "groq-sdk";
import OpenAI from "openai";
import { createSlideTable, MAX_TABLE_CELL_LENGTH, MAX_TABLE_ROWS, normalizeSlideTable, normalizeSlideTables, parseTableNumber, pasteTableCells, plotTableValues, tableValidationError, type SlideTable } from "../lib/slide-tables";
import { createBlankSlide, getSlideGraphs, getSlideTables, hasGraphLayout, hasTableLayout, type SlideTemplate } from "../lib/presentation";
import { normalizeStoredPresentation } from "../lib/presentation-store";
import { extractJson, normalizeSolution, type ExtractedQuestion } from "../lib/json-extractor";
import { requestSolutionCompletion } from "../lib/solution-completion";
import { extractQuestionsFromImage } from "../lib/question-extraction";
import { InputError, validateQuestion } from "../lib/api-input";
import { applyQuestionVisuals } from "../lib/visual-evidence";

const signTable: SlideTable = {
  kind: "sign", title: "Summary table", firstColumnHeader: true,
  headers: ["Interval", "$x < -3$", "$-3 < x < 1$", "$x = 1$", "$1 < x < 5$", "$x > 5$"],
  rows: [["Sign of $f(x)$", "+", "−", "−", "−", "+"], ["Sign of slope", "+", "+", "0", "−", "−"], ["Change in slope", "+", "−", "−", "−", "+"]],
};
const values: SlideTable = { kind: "values", title: "Sample values", headers: ["$x$", "$f(x)$"], rows: [["−2", "4"], ["0", "0"], ["1/2", "$\\frac{1}{4}$"], ["", ""]], firstColumnHeader: false };
const deck = { explanation: "One possible function.", slides: [
  { title: "Problem", type: "intro", content: "Sketch a possible graph from this sign table.", notes: "" },
  { title: "Solution", type: "solution", content: "One example is $f(x)=1/((x+3)(x-5))$.", notes: "A positive numerator gives the required signs.", graphs: [{ functions: [{ mathjs: "1/((x+3)*(x-5))" }] }] },
  { title: "Conclusion", type: "conclusion", content: "The signs agree with the table. Positive multiples also work.", notes: "" },
] };

test("table presets supply structure without inventing values or answers", () => {
  const sign = createSlideTable("sign");
  assert.equal(sign.firstColumnHeader, true);
  assert.ok(sign.headers.slice(1).every((cell) => cell === ""));
  assert.ok(sign.rows.every((row) => row.slice(1).every((cell) => cell === "")));
  for (const kind of ["values", "custom"] as const) {
    const table = createSlideTable(kind);
    assert.ok(table.rows.flat().every((cell) => cell === ""));
    assert.equal(tableValidationError(table), null);
    table.rows[0][0] = "Changed";
    assert.equal(createSlideTable(kind).rows[0][0], "");
  }
});

test("table normalization keeps exact interval endpoints, math, signs, and blank cells", () => {
  const table = { ...signTable, headers: [...signTable.headers], rows: signTable.rows.map((row) => [...row]) };
  table.rows[0][2] = "";
  table.headers[0] = "Interval";
  const normalized = normalizeSlideTable({ ...table, html: "<script>untrusted</script>" });
  assert.deepEqual(normalized, table);
  normalized!.rows[0][1] = "0";
  assert.equal(table.rows[0][1], "+");
});

test("malformed or oversized tables are rejected without shifting or clipping cells", () => {
  for (const invalid of [null, [], {}, { ...signTable, kind: { toString: 1 } }, { ...signTable, headers: ["x"] }, { ...signTable, rows: [] }, { ...signTable, rows: [["missing cells"]] }, { ...values, firstColumnHeader: "false" }, { ...values, rows: [[0, 2]] }, { ...values, headers: ["x".repeat(MAX_TABLE_CELL_LENGTH + 1), "y"] }, { ...values, rows: Array(MAX_TABLE_ROWS + 1).fill(["0", "0"]) }]) {
    assert.notEqual(tableValidationError(invalid), null);
    assert.equal(normalizeSlideTable(invalid), undefined);
  }
  assert.deepEqual(normalizeSlideTables([values, values, values]), []);
});

test("spreadsheet paste grows a rectangular grid and preserves cells outside the pasted area", () => {
  const original = structuredClone(values);
  const result = pasteTableCells(values, "2\t4\r\n3\t9\r\n", 2, 1);
  assert.ok(result.table);
  assert.deepEqual(result.table.headers, ["$x$", "$f(x)$", ""]);
  assert.deepEqual(result.table.rows, [["−2", "4", ""], ["0", "0", ""], ["1/2", "2", "4"], ["", "3", "9"]]);
  assert.deepEqual(values, original);
  const fromHeader = pasteTableCells(createSlideTable("custom"), "x\tf(x)\n-1\t1\n0\t0\n1\t1", -1, 0);
  assert.deepEqual(fromHeader.table?.headers, ["x", "f(x)"]);
  assert.deepEqual(fromHeader.table?.rows, [["-1", "1"], ["0", "0"], ["1", "1"]]);
});

test("oversized paste is an error and leaves the original table intact", () => {
  const original = structuredClone(values);
  for (const pasted of [Array(9).fill("1").join("\t"), Array(14).fill("1\t2").join("\n"), "a".repeat(161) + "\t2"]) assert.ok(pasteTableCells(values, pasted, 0, 0).error);
  assert.deepEqual(values, original);
});

test("plotting accepts decimal and fractional math cells without evaluating code or variables", () => {
  for (const [cell, number] of [["−2", -2], [".5", 0.5], ["1e-3", 0.001], ["-1/2", -0.5], ["1 / 4", 0.25], ["$\\frac{1}{4}$", 0.25], ["$-\\frac{-1}{2}$", 0.5], ["\\(-3/4\\)", -0.75], ["$$0$$", 0]] as const) assert.equal(parseTableNumber(cell), number);
  for (const cell of ["", " ", "+", "Undefined", "1/0", "Infinity", "1e999", "1e13", "x", "2+3", "alert(1)", "<img>", "1/2/3", "1 2", "1 e 3"]) assert.equal(parseTableNumber(cell), null);
});

test("numeric tables plot exact pairs, skip completely blank rows, and default to separate points", () => {
  const result = plotTableValues(values);
  assert.ok(result.graph);
  assert.deepEqual(result.graph.points, [{ x: -2, y: 4 }, { x: 0, y: 0 }, { x: 0.5, y: 0.25 }]);
  assert.equal(result.graph.functions, undefined);
  const bounds = result.graph.bounds!;
  result.graph.points!.forEach(({ x, y }) => assert.ok(bounds.minX < x && bounds.maxX > x && bounds.minY < y && bounds.maxY > y));
  const joined = plotTableValues(values, 0, 1, true);
  assert.deepEqual(joined.graph?.functions?.[0].points, result.graph.points);
  assert.match(joined.graph!.description!, /row order/);
});

test("selected numeric columns determine the axes and a one-point plot has usable bounds", () => {
  const result = plotTableValues({ ...values, rows: [["2", "-3"]] }, 1, 0);
  assert.deepEqual(result.graph?.points, [{ x: -3, y: 2 }]);
  const zero = plotTableValues({ ...values, rows: [["0", "0"]] });
  assert.ok(zero.graph!.bounds!.minX < 0 && zero.graph!.bounds!.maxX > 0);
  assert.ok(zero.graph!.bounds!.minY < 0 && zero.graph!.bounds!.maxY > 0);
});

test("plotting reports incomplete/non-numeric rows instead of silently dropping them", () => {
  assert.match(plotTableValues({ ...values, rows: [["1", ""]] }).error!, /row 1/);
  assert.match(plotTableValues({ ...values, rows: [["1", "2"], ["a", "3"]] }).error!, /row 2/);
  assert.ok(plotTableValues(createSlideTable("values")).error);
  assert.ok(plotTableValues(signTable).error);
  assert.ok(plotTableValues(values, 0, 0).error);
  assert.ok(plotTableValues(values, 0, 99).error);
});

test("table layouts work on the first or a later slide and survive saving and layout switches", () => {
  for (const layout of ["table", "table-graph"] as SlideTemplate[]) {
    assert.equal(hasTableLayout(layout), true);
    assert.deepEqual(createBlankSlide(layout).tables, []);
    const graph = plotTableValues(values).graph!;
    const slide = { ...createBlankSlide(layout), tables: [signTable, values], graphs: [graph] };
    const restored = normalizeStoredPresentation(JSON.parse(JSON.stringify({ slides: [slide, slide] })))!;
    for (const saved of restored.slides) {
      assert.deepEqual(getSlideTables(saved), [signTable, values]);
      assert.equal(getSlideGraphs(saved).length, layout === "table-graph" ? 1 : 0);
      const hidden = { ...saved, layout: "text" as const };
      assert.deepEqual(getSlideTables(hidden), []);
      assert.deepEqual(getSlideTables({ ...hidden, layout }), [signTable, values]);
    }
  }
  assert.equal(hasGraphLayout("table-graph"), true);
  assert.equal(hasGraphLayout("table"), false);
});

test("AI-created tables survive solution normalization even when a problem does not need a graph", () => {
  const result = normalizeSolution({ ...deck, slides: deck.slides.map((slide) => ({ ...slide, tables: [values], layout: "text" })) }, "Evaluate the expression.");
  assert.deepEqual(result!.slides[1].tables, [values]);
  assert.equal(result!.slides[1].layout, "table");
  assert.equal(result!.slides[1].graphs, undefined);
});

test("source tables reach the solver unchanged and appear beside the relevant generated graph", async () => {
  const groq = new Groq({ apiKey: "test-key", fetch: async (_url, init) => {
    const body = JSON.parse(String(init?.body));
    assert.ok(body.messages[1].content.includes(JSON.stringify([signTable])));
    return Response.json({ id: "tables", object: "chat.completion", created: 0, model: "test", choices: [{ index: 0, finish_reason: "stop", message: { role: "assistant", content: JSON.stringify(deck) } }] });
  } });
  const result = await requestSolutionCompletion({ questionText: deck.slides[0].content, questionTopic: "Rational functions", tables: [signTable], systemPrompt: "Return JSON.", userPrompt: "Solve.", maxTokens: 6000 }, { groq });
  assert.equal(result.slides[0].layout, "table");
  assert.deepEqual(result.slides[0].tables, [signTable]);
  assert.equal(result.slides[0].graphs, undefined);
  assert.deepEqual(result.slides[1].tables, [signTable]);
  assert.equal(result.slides[1].layout, "table-graph");
  assert.equal(result.slides[1].graphs?.[0].functions?.[0].mathjs, "1/((x+3)*(x-5))");
  assert.equal(result.slides[2].tables, undefined);
});

test("worksheet extraction preserves every structured sign-table cell through visual verification", async () => {
  const question = { id: "C2", text: deck.slides[0].content, type: "Rational functions", difficulty: 5, visualContext: "Use the printed summary table.", tables: [signTable] };
  const responses = [{ questions: [question] }, { printedLabels: ["C2"], questions: [{ ...question, hasVisuals: true }] }];
  const client = new OpenAI({ apiKey: "test-key", fetch: async (_url, init) => {
    assert.match(JSON.parse(String(init?.body)).messages[0].content, /tables array/);
    return Response.json({ id: "tables", object: "chat.completion", created: 0, model: "test", choices: [{ index: 0, finish_reason: "stop", message: { role: "assistant", content: JSON.stringify(responses.shift()) } }] });
  } });
  const result = await extractQuestionsFromImage({ imageUrl: "data:image/png;base64,dGVzdA==", model: "test", fallbackModel: "backup" }, { nvidia: client });
  assert.deepEqual(result.questions, [question]);
  const parsed = extractJson<{ questions: ExtractedQuestion[] }>(JSON.stringify(result));
  assert.deepEqual(parsed.questions[0].tables, [signTable]);
});

test("solve requests validate source tables before normalization can remove invalid givens", () => {
  assert.deepEqual(validateQuestion({ text: "Read this table.", tables: [signTable] }).tables, [signTable]);
  for (const tables of [{}, [values, values, values], [{ ...values, rows: [["incomplete"]] }], [{ ...values, headers: [null, "y"] }]]) assert.throws(() => validateQuestion({ text: "Read this table.", tables }), (error) => error instanceof InputError && error.status === 400);
});

test("source tables follow their own subpart and do not overwrite a calculated solution table", () => {
  const questionTable = { ...signTable, title: "a)" };
  const result = applyQuestionVisuals({ explanation: "", slides: [
    { title: "Problem", content: "a) Read the table.\nb) Solve the equation.", notes: "", type: "intro" },
    { title: "Solution", subtitle: "Part a: Signs", content: "Use the intervals.", notes: "", type: "solution" },
    { title: "Solution", subtitle: "Part b: Equation", content: "$x=2$", notes: "", type: "solution" },
    { title: "Conclusion", content: "Answers.", notes: "", type: "conclusion" },
  ] }, { tables: [questionTable] });
  assert.deepEqual(result.slides[1].tables, [questionTable]);
  assert.equal(result.slides[2].tables, undefined);
  const calculated = applyQuestionVisuals({ ...result, slides: result.slides.map((slide, i) => i === 1 ? { ...slide, tables: [values] } : slide) }, { tables: [questionTable] });
  assert.deepEqual(calculated.slides[0].tables, [questionTable]);
  assert.deepEqual(calculated.slides[1].tables, [values]);
});

test("visual verification retries rather than accepting a structured table with missing cells", async () => {
  const question = { id: "C2", text: deck.slides[0].content, type: "Rational functions", difficulty: 5, visualContext: "Use the summary table.", tables: [signTable], hasVisuals: true };
  const responses = [
    { questions: [question] },
    { printedLabels: ["C2"], questions: [{ ...question, tables: [{ ...signTable, rows: [["dropped cells"]] }] }] },
    { printedLabels: ["C2"], questions: [question] },
  ];
  const client = new OpenAI({ apiKey: "test-key", fetch: async () => Response.json({ id: "tables", object: "chat.completion", created: 0, model: "test", choices: [{ index: 0, finish_reason: "stop", message: { role: "assistant", content: JSON.stringify(responses.shift()) } }] }) });
  const result = await extractQuestionsFromImage({ imageUrl: "data:image/png;base64,dGVzdA==", model: "test", fallbackModel: "backup" }, { nvidia: client });
  assert.equal(responses.length, 0);
  assert.deepEqual(result.questions[0].tables, [signTable]);
});
