import assert from "node:assert/strict";
import { test } from "node:test";
import { desmosEmbedUrl, normalizeDesmosUrl } from "../lib/desmos";
import { normalizeGraphData } from "../lib/graph-data";
import { extractJson, type ExtractedSolution } from "../lib/json-extractor";
import { getSlideGraphs, type Solution } from "../lib/presentation";

const shared = "https://www.desmos.com/calculator/wydhf2ifyo";

test("Desmos share links and iframe snippets become one trusted embed URL", () => {
  for (const input of [
    shared,
    "https://desmos.com/calculator/wydhf2ifyo/",
    "desmos.com/calculator/wydhf2ifyo",
    "www.desmos.com/calculator/wydhf2ifyo?lang=uk",
    "//www.desmos.com/calculator/wydhf2ifyo?embed",
    `  ${shared}?embed&width=500#fragment  `,
    `<iframe src="${shared}?embed" width="500" height="500" frameborder="0"></iframe>`,
    `<iframe\n title='Graph' src='${shared}?embed&amp;lang=en'></iframe>`,
  ]) {
    assert.equal(normalizeDesmosUrl(input), shared, String(input));
    assert.equal(desmosEmbedUrl(input), `${shared}?embed`);
  }
});

test("only saved HTTPS Desmos calculator graphs may be embedded", () => {
  for (const input of [
    "", null, {},
    "https://www.desmos.com/calculator", // No graph was shared.
    "https://www.desmos.com/3d/abc123", // Not a Graphing Calculator link.
    "https://www.desmos.com/geometry/abc123",
    "https://www.desmos.com/calculator/abc123/extra",
    "https://www.desmos.com/calculator/a%2Fb",
    "https://www.desmos.com.evil.example/calculator/abc123",
    "https://desmos.com@evil.example/calculator/abc123",
    "https://evil.example@www.desmos.com/calculator/abc123",
    "https://www.desmos.com:444/calculator/abc123",
    "http://www.desmos.com/calculator/abc123",
    "javascript:alert(1)",
    'data:text/html,<iframe src="https://evil.example"></iframe>',
    '<iframe srcdoc="arbitrary HTML"></iframe>',
    '<iframe src="https://evil.example/calculator/abc123"></iframe>',
    `${shared}${"x".repeat(8000)}`,
  ]) {
    assert.equal(normalizeDesmosUrl(input), null, String(input));
    assert.equal(desmosEmbedUrl(input), null, String(input));
  }
});

test("untrusted embed HTML is discarded while its Desmos graph link survives", () => {
  const graph = normalizeGraphData({ title: "A Desmos graph", desmosUrl: `<iframe src="${shared}?embed" onload="doNotExecute()"></iframe><script>doNotExecute()</script>` });
  assert.deepEqual(graph, { title: "A Desmos graph", desmosUrl: shared });
  assert.equal(normalizeGraphData({ desmosUrl: "https://evil.example/graph" }), undefined);
});

test("Desmos and native graphs survive saving, duplication, comparison, and slide-one rendering", () => {
  const mixed = [
    { title: "Desmos example", type: "desmos", desmosUrl: shared },
    { title: "My parabola", functions: [{ mathjs: "x^2" }] },
  ];
  const solution: Solution = {
    explanation: "Compare the graphs.", creationMode: "manual",
    slides: [{ title: "Compare", content: "", notes: "", layout: "graphs", type: "intro", graphs: mixed }],
  };
  const saved = JSON.parse(JSON.stringify(solution)) as Solution;
  assert.deepEqual(getSlideGraphs(saved.slides[0], saved), mixed);
  assert.deepEqual(getSlideGraphs(structuredClone(saved.slides[0])), mixed);
  assert.equal(getSlideGraphs({ ...saved.slides[0], graphs: [mixed[1]] }).length, 1);
});

test("solution normalization retains Desmos links on problem and solution slides", () => {
  const graph = { title: "Shared graph", type: "desmos", desmosUrl: `${shared}?embed` };
  const result = extractJson<ExtractedSolution>(JSON.stringify({ slides: [
    { title: "Problem", type: "intro", content: "Describe the graph.", notes: "Look.", graphs: [graph] },
    { title: "Solution", type: "solution", content: "Read its features.", notes: "Explain.", graphs: [graph] },
    { title: "Conclusion", type: "conclusion", content: "Summary.", notes: "Review." },
  ] }), "solution", "Describe the graph.");
  assert.equal(result.slides[0].graphs?.[0].desmosUrl, shared);
  assert.equal(result.slides[1].graphs?.[0].desmosUrl, shared);
});
