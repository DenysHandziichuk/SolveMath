import assert from "node:assert/strict";
import { test } from "node:test";
import { decodeProblemImage, InputError, readJsonBody, validateQuestion } from "../lib/api-input";
import { problemImageFileError } from "../lib/problem-image";

const request = (body: string, headers: Record<string, string> = { "content-type": "application/json" }) => new Request("http://localhost/api", { method: "POST", headers, body });
const hasStatus = (status: number) => (error: unknown) => error instanceof InputError && error.status === status;

test("JSON reading rejects unsupported content, malformed JSON, and non-object payloads", async () => {
  await assert.rejects(readJsonBody(request("{}", { "content-type": "text/plain" }), 100), hasStatus(415));
  for (const body of ["", "{", "null", "[]", '"question"']) await assert.rejects(readJsonBody(request(body), 100), hasStatus(400));
  assert.deepEqual(await readJsonBody(request('{"question":"x² = 4"}'), 100), { question: "x² = 4" });
});

test("request byte limits apply to undeclared, under-declared, and multi-byte bodies", async () => {
  await assert.rejects(readJsonBody(request(JSON.stringify({ text: "é".repeat(20) })), 40), hasStatus(413));
  await assert.rejects(readJsonBody(request("{}", { "content-type": "application/json", "content-length": "999" }), 100), hasStatus(413));
  const bytes = new TextEncoder().encode(JSON.stringify({ question: "x".repeat(200) }));
  let canceled = false;
  const body = new ReadableStream<Uint8Array>({
    start(controller) { controller.enqueue(bytes); },
    cancel() { canceled = true; },
  });
  const streamed = new Request("http://localhost/api", { method: "POST", headers: { "content-type": "application/json", "content-length": "2" }, body, duplex: "half" } as RequestInit);
  await assert.rejects(readJsonBody(streamed, 100), hasStatus(413));
  assert.equal(canceled, true);
});

test("questions require text and preserve source graph observations", () => {
  for (const value of [undefined, null, [], {}, 3, "   ", { text: 4 }]) assert.throws(() => validateQuestion(value), hasStatus(400));
  assert.throws(() => validateQuestion("x".repeat(24001)), hasStatus(413));
  assert.throws(() => validateQuestion({ text: "Find the slope.", graphs: Array(13).fill({}) }), hasStatus(400));
  assert.throws(() => validateQuestion({ text: "Find the slope.", visualContext: {} }), hasStatus(400));
  assert.deepEqual(validateQuestion({ text: "a) Find the slope.", type: "Calculus", visualContext: "Curve a is decreasing.", graphs: [{ title: "a)", functions: [{ mathjs: "1/x" }] }] }), {
    text: "a) Find the slope.", topic: "Calculus", visualContext: "Curve a is decreasing.", graphs: [{ title: "a)", functions: [{ mathjs: "1/x" }] }],
  });
});

test("image uploads reject unsupported types and malformed base64 before decoding", () => {
  for (const value of [undefined, 4, "", "https://example.com/image.png", "data:image/svg+xml;base64,PHN2Zz4=", "%%%", "abc"]) assert.throws(() => decodeProblemImage(value), hasStatus(400));
  assert.equal(decodeProblemImage("data:image/png;base64,dGVzdA==").toString(), "test");
  assert.equal(problemImageFileError({ type: "image/png", size: 1024 }), null);
  assert.ok(problemImageFileError({ type: "image/svg+xml", size: 1024 }));
  assert.ok(problemImageFileError({ type: "image/jpeg", size: 7 * 1024 * 1024 }));
});
