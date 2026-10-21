import assert from "node:assert/strict";
import { test } from "node:test";
import Groq from "groq-sdk";
import { requestSolutionCompletion } from "../lib/solution-completion";
import { isCompleteSolution } from "../lib/json-extractor";

const question = "Solve $2x + 3 = 11$.";
const request = {
  questionText: question, questionTopic: "Algebra",
  systemPrompt: "Return a complete mathematics presentation as JSON.",
  userPrompt: question, maxTokens: 3500,
  groqModel: "groq-primary", groqFallbackModel: "groq-backup",
};
const deck = {
  explanation: "Subtract 3, then divide by 2.",
  slides: [
    { title: "Problem", type: "intro", content: question, notes: "Solve for x." },
    { title: "Solution", type: "solution", content: "$2x = 8$, so $x = 4$.", notes: "Subtract three and divide by two." },
    { title: "Conclusion", type: "conclusion", content: "$x = 4$.", notes: "Check: two times four plus three is eleven." },
  ],
};

function completion(content: string | null = JSON.stringify(deck), finishReason = "stop") {
  return Response.json({
    id: "solution-test", object: "chat.completion", created: 0, model: "test",
    choices: [{ index: 0, message: { role: "assistant", content }, finish_reason: finishReason }],
  });
}

function providerError(status: number) {
  return Response.json({ error: { message: "Model unavailable", type: "invalid_request_error" } }, { status });
}

// Regression (2026-10-21): timeouts and incomplete responses must recover
// through the configured Groq backup rather than accepting a broken deck.
for (const failure of ["timeout", "empty", "truncated", "malformed", "incomplete"] as const) {
  test(`Groq supplies a complete deck after its primary model returns ${failure}`, async () => {
    const groq = new Groq({ apiKey: "test-key", fetch: async (_url, init) => {
      const { model } = JSON.parse(String(init?.body));
      if (model === request.groqFallbackModel) return completion();
      if (failure === "timeout") throw new Groq.APIConnectionTimeoutError();
      if (failure === "empty") return completion(null);
      if (failure === "truncated") return completion(JSON.stringify(deck), "length");
      if (failure === "malformed") return completion("The service could not solve the problem.");
      return completion(JSON.stringify({ slides: [deck.slides[0]] }));
    } });
    const result = await requestSolutionCompletion(request, { groq });
    assert.equal(isCompleteSolution(result), true);
    assert.equal(result.slides[0].content, question);
    assert.match(result.slides.at(-1)?.content || "", /x = 4/);
  });
}

test("an unavailable Groq model recovers through its independent backup", async () => {
  const groq = new Groq({ apiKey: "test-key", fetch: async (_url, init) => {
    const { model } = JSON.parse(String(init?.body));
    return model === request.groqModel ? providerError(404) : completion();
  } });
  const result = await requestSolutionCompletion(request, { groq });
  assert.equal(isCompleteSolution(result), true);
  assert.match(result.slides.at(-1)?.content || "", /x = 4/);
});

test("a missing Groq key fails instead of using another presentation provider", async () => {
  await assert.rejects(requestSolutionCompletion(request, {}), /Groq is not configured/);
});

test("truncated Groq answers cannot be returned as successful presentations", async () => {
  const groq = new Groq({ apiKey: "test-key", fetch: async () => completion(JSON.stringify(deck), "length") });
  await assert.rejects(requestSolutionCompletion(request, { groq }), /complete solution/i);
});

test("a provider outage fails honestly instead of inventing a solution", async () => {
  const groq = new Groq({ apiKey: "test-key", fetch: async () => providerError(503) });
  await assert.rejects(requestSolutionCompletion(request, { groq }), /complete solution/i);
});
