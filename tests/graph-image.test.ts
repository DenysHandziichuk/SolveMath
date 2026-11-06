import assert from "node:assert/strict";
import { test } from "node:test";
import { graphImageFileError, graphImageSize, normalizeGraphImage, MAX_GRAPH_IMAGE_URL_LENGTH, type GraphImage } from "../lib/graph-image";
import { normalizeGraphData } from "../lib/graph-data";
import { extractJson, type ExtractedSolution } from "../lib/json-extractor";
import { createBlankSlide, getSlideGraphs, type Solution } from "../lib/presentation";

const image: GraphImage = {
  src: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aH1cAAAAASUVORK5CYII=",
  alt: "A reciprocal graph with two vertical asymptotes", width: 1, height: 1,
};

test("graph images keep their full local raster data through normalization", () => {
  assert.deepEqual(normalizeGraphImage(image), image);
  assert.deepEqual(normalizeGraphData({ title: "Desmos screenshot", type: "image", image }), { title: "Desmos screenshot", type: "image", image });
  const largeImage = { ...image, src: "data:image/png;base64," + "A".repeat(8000) };
  assert.equal(normalizeGraphData({ image: largeImage })?.image?.src, largeImage.src);
});

test("unsafe, remote, oversized, and malformed image sources cannot be saved as graph images", () => {
  for (const src of [
    "https://example.com/graph.png", "blob:https://example.com/temporary",
    "javascript:alert(1)", "data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=",
    "data:text/html;base64,PHNjcmlwdD4=", "data:image/png;base64,", 'data:image/png;base64,abc\" onerror=\"alert(1)',
    "data:image/png;base64," + "A".repeat(MAX_GRAPH_IMAGE_URL_LENGTH),
  ]) assert.equal(normalizeGraphImage({ ...image, src }), null);
  for (const dimensions of [{ width: 0 }, { height: -1 }, { width: 1601 }, { width: NaN }, { height: 1.5 }]) {
    assert.equal(normalizeGraphImage({ ...image, ...dimensions }), null);
  }
  assert.equal(normalizeGraphData({ image, desmosUrl: "https://www.desmos.com/calculator/abc123" }), undefined);
});

test("image uploads reject unsupported files and excessive source sizes", () => {
  for (const type of ["image/png", "image/jpeg", "image/webp"]) assert.equal(graphImageFileError({ type, size: 1000 }), null);
  for (const type of ["image/svg+xml", "image/gif", "application/pdf", "text/html"]) assert.ok(graphImageFileError({ type, size: 1000 }));
  for (const size of [0, -1, Infinity, 21 * 1024 * 1024]) assert.ok(graphImageFileError({ type: "image/png", size }));
});

test("image resizing preserves the complete graph's aspect ratio and never enlarges small images", () => {
  assert.deepEqual(graphImageSize(3200, 1800), { width: 1600, height: 900 });
  assert.deepEqual(graphImageSize(1000, 2000), { width: 800, height: 1600 });
  assert.deepEqual(graphImageSize(640, 480), { width: 640, height: 480 });
  assert.deepEqual(graphImageSize(3200, 1800, 960), { width: 960, height: 540 });
  assert.throws(() => graphImageSize(10000, 10000));
  assert.throws(() => graphImageSize(0, 400));
});

test("image graphs survive browser serialization and duplication with native and Desmos graphs", () => {
  const graphs = [
    { type: "image", title: "Static graph", image },
    { type: "desmos", desmosUrl: "https://www.desmos.com/calculator/abc123" },
    { functions: [{ mathjs: "x^2" }] },
  ];
  const deck: Solution = { explanation: "", creationMode: "manual", slides: [{ ...createBlankSlide("graphs"), graphs }] };
  const restored = JSON.parse(JSON.stringify(deck)) as Solution;
  assert.deepEqual(getSlideGraphs(restored.slides[0]), graphs);
  assert.deepEqual(getSlideGraphs(structuredClone(restored.slides[0])), graphs);
});

test("images and descriptions remain available on the problem and later slides", () => {
  const graph = { type: "image", image };
  const result = extractJson<ExtractedSolution>(JSON.stringify({ slides: [
    { title: "Problem", type: "intro", content: "Describe the graph.", notes: "Look.", graphs: [graph] },
    { title: "Solution", type: "solution", content: "Describe its features.", notes: "Explain.", graphs: [graph] },
    { title: "Conclusion", type: "conclusion", content: "Summary.", notes: "Review." },
  ] }), "solution", "Describe the graph.");
  assert.deepEqual(result.slides[0].graphs?.[0].image, image);
  assert.deepEqual(result.slides[1].graphs?.[0].image, image);
});
