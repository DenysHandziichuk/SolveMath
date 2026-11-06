import assert from "node:assert/strict";
import { test } from "node:test";
import { loadPresentation, normalizeStoredPresentation, savePresentation } from "../lib/presentation-store";
import { createManualPresentation } from "../lib/presentation";

test("a generated or edited deck remains available for navigation when browser saving fails", () => {
  const solution = createManualPresentation();
  solution.slides[0].content = "Keep this work.";
  const unavailable = () => { throw new Error("Browser storage blocked"); };
  assert.equal(savePresentation("audit-blocked-store", solution, unavailable), false);
  const restored = loadPresentation("audit-blocked-store", unavailable);
  assert.deepEqual(restored.solution, solution);
  assert.equal(restored.unsaved, true);
});

test("storage failures do not masquerade as failed AI generation and successful saves clear the warning", () => {
  const solution = createManualPresentation();
  assert.equal(savePresentation("audit-quota-store", solution, () => ({ getItem: () => null, setItem: () => { throw new Error("Quota exceeded"); } })), false);
  let stored = "";
  assert.equal(savePresentation("audit-quota-store", solution, () => ({ getItem: () => stored, setItem: (_key, value) => { stored = value; } })), true);
  assert.equal(loadPresentation("audit-quota-store", () => ({ getItem: () => stored, setItem() {} })).unsaved, false);
});

test("corrupt saved data is reported without erasing the stored copy", () => {
  let writes = 0;
  const read = (value: string) => ({ getItem: () => value, setItem() { writes++; } });
  assert.equal(loadPresentation("audit-bad-json", () => read("{broken")).corrupt, true);
  assert.equal(loadPresentation("audit-bad-slide", () => read(JSON.stringify({ slides: [{ title: {}, content: "x" }] }))).corrupt, true);
  assert.equal(writes, 0);
});

test("legacy decks gain empty notes and malformed drawings cannot crash the canvas", () => {
  const result = normalizeStoredPresentation({ slides: [{ title: "Problem", content: "$x^2 = 4$", drawings: [{ tool: "pen", color: "red", width: 4, points: [null] }] }] });
  assert.equal(result?.slides[0].notes, "");
  assert.deepEqual(result?.slides[0].drawings, []);
});
