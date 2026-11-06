import assert from "node:assert/strict";
import { test } from "node:test";
import { createBlankSlide, getSlideGraphs, hasGraphLayout, isSlideTemplate, type Slide, type SlideTemplate } from "../lib/presentation";
import { extractJson, type ExtractedSolution } from "../lib/json-extractor";

const graph = { title: "Parabola", functions: [{ mathjs: "x^2" }] };

test("text layouts can hide graphs without losing them when switching back to a visual layout", () => {
  const original: Slide = { ...createBlankSlide("graphs"), title: "Compare", content: "Left idea", secondaryContent: "Right idea", graphs: [graph] };
  for (const layout of ["title", "text", "columns", "statement"] as SlideTemplate[]) {
    const changed = { ...original, layout };
    assert.deepEqual(getSlideGraphs(changed), []);
    const restored = { ...changed, layout: "graph-left" as const };
    assert.deepEqual(getSlideGraphs(restored), [graph]);
    assert.equal(restored.content, "Left idea");
    assert.equal(restored.secondaryContent, "Right idea");
  }
});

test("both graph positions, comparison, and full-size visual layouts can display diagrams on slide one", () => {
  for (const layout of ["split", "graph-left", "graphs", "visual"] as SlideTemplate[]) {
    const slide = { ...createBlankSlide(layout), type: "intro", graphs: [graph] };
    assert.deepEqual(getSlideGraphs(slide), [graph]);
    assert.equal(hasGraphLayout(layout), true);
  }
  assert.equal(isSlideTemplate("custom-html"), false);
  assert.equal(isSlideTemplate(undefined), false);
});

test("two-column content and key-result layouts survive saving and solution normalization", () => {
  const second = "Compare this with $g(x) = x^3$.\nIts sign changes at zero.";
  const deck = { explanation: "Compare two functions.", slides: [
    { title: "Problem", type: "intro", layout: "title", content: "Compare two functions.", subtitle: "Algebra", notes: "Introduce." },
    { title: "Solution", type: "solution", layout: "columns", content: "The square is nonnegative: $x^2 \\ge 0$.", secondaryContent: second, notes: "Compare both columns." },
    { title: "Conclusion", type: "conclusion", layout: "statement", content: "Even powers are nonnegative; odd powers can be negative.", notes: "Recap." },
  ] };
  const result = extractJson<ExtractedSolution>(JSON.stringify(deck), "solution", deck.slides[0].content);
  assert.equal(result.slides[0].layout, "title");
  assert.equal(result.slides[1].layout, "columns");
  assert.equal(result.slides[1].secondaryContent, second);
  assert.equal(result.slides[2].layout, "statement");
  const restored = JSON.parse(JSON.stringify(result)) as ExtractedSolution;
  assert.equal(restored.slides[1].secondaryContent, second);
});

test("legacy slides retain their existing graph fallback behavior", () => {
  const solution = { explanation: "", slides: [], graphData: graph };
  const slide = { title: "Evidence", content: "Read the graph.", notes: "Explain.", type: "graph" };
  assert.deepEqual(getSlideGraphs(slide, solution), [graph]);
  assert.deepEqual(getSlideGraphs({ ...slide, graphs: [] }, solution), []);
});
