import assert from "node:assert/strict";
import { test } from "node:test";
import Groq from "groq-sdk";
import { requestSolutionCompletion, SolutionRateLimitError } from "../lib/solution-completion";
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

// Regression (2026-10-26): the default configuration has no backup model,
// so recoverable provider rejections must be handled on the selected model.
const qwenRequest = { ...request, groqModel: "qwen/qwen3.8-27b", groqFallbackModel: "" };

test("a JSON generation rejection recovers a complete deck without a backup model", async () => {
  const groq = new Groq({ apiKey: "test-key", fetch: async (_url, init) => {
    const parameters = JSON.parse(String(init?.body));
    if (parameters.response_format?.type === "json_object") {
      return Response.json({ error: {
        code: "json_validate_failed", type: "invalid_request_error",
        message: "Failed to generate JSON.", failed_generation: JSON.stringify({ slides: [deck.slides[0]] }),
      } }, { status: 400 });
    }
    return completion("```json\n" + JSON.stringify(deck) + "\n```");
  } });

  const result = await requestSolutionCompletion(qwenRequest, { groq });
  assert.equal(isCompleteSolution(result), true);
  assert.match(result.slides.at(-1)?.content || "", /x = 4/);
});

test("an oversized output request recovers within the account limit without spending it on hidden reasoning", async () => {
  const groq = new Groq({ apiKey: "test-key", fetch: async (_url, init) => {
    const parameters = JSON.parse(String(init?.body));
    if (parameters.max_tokens > 1000 || parameters.reasoning_effort !== "none") {
      return Response.json({ error: {
        code: "rate_limit_exceeded", type: "tokens",
        message: "Request too large on output tokens per minute (OTPM): Limit 1000, Requested 1177. Reduce max_tokens and try again.",
      } }, { status: 429 });
    }
    return completion();
  } });

  const result = await requestSolutionCompletion(qwenRequest, { groq });
  assert.equal(isCompleteSolution(result), true);
  assert.equal(result.slides[0].content, question);
  assert.match(result.slides.at(-1)?.content || "", /x = 4/);
});

for (const [message, expectedMessage] of [
  ["Rate limit reached for private-account on output tokens per minute (OTPM): Limit 1000, Used 800, Requested 600.", /try again in 23 seconds/i],
  ["Request too large for private-account on input tokens per minute (ITPM): Limit 1000, Requested 2000.", /shorter question/i],
] as const) {
  test(`unrecoverable quota errors explain ${message.startsWith("Request") ? "an oversized question" : "the retry delay"} without exposing provider details`, async () => {
    const groq = new Groq({ apiKey: "test-key", fetch: async (_url, init) => {
      const parameters = JSON.parse(String(init?.body));
      // Reducing output cannot repair input limits or already consumed quota.
      if (parameters.max_tokens < request.maxTokens) return completion();
      return Response.json({ error: { code: "rate_limit_exceeded", type: "tokens", message } }, {
        status: 429, headers: { "Retry-After": "23" },
      });
    } });

    await assert.rejects(requestSolutionCompletion(qwenRequest, { groq }), (error: unknown) => {
      assert.ok(error instanceof SolutionRateLimitError);
      assert.equal(error.status, 429);
      assert.equal(error.retryAfter, 23);
      assert.match(error.message, expectedMessage);
      assert.doesNotMatch(error.message, /private-account/);
      return true;
    });
  });
}

test("output-budget recovery and JSON-mode recovery can both be needed for one presentation", async () => {
  const groq = new Groq({ apiKey: "test-key", fetch: async (_url, init) => {
    const parameters = JSON.parse(String(init?.body));
    if (parameters.max_tokens > 1000) {
      return Response.json({ error: {
        code: "rate_limit_exceeded", message: "Request too large on output tokens per minute (OTPM): Limit 1000, Requested 1177.",
      } }, { status: 429 });
    }
    if (parameters.response_format?.type === "json_object") {
      return Response.json({ error: { code: "json_validate_failed", message: "Failed to generate JSON." } }, { status: 400 });
    }
    return completion();
  } });

  const result = await requestSolutionCompletion(qwenRequest, { groq });
  assert.equal(isCompleteSolution(result), true);
  assert.match(result.slides.at(-1)?.content || "", /x = 4/);
});

test("recovery rejects truncated output and never accepts a rejected generation as a solution", async () => {
  const groq = new Groq({ apiKey: "test-key", fetch: async (_url, init) => {
    const parameters = JSON.parse(String(init?.body));
    if (parameters.response_format?.type === "json_object") {
      return Response.json({ error: {
        code: "json_validate_failed", message: "Failed to generate JSON.", failed_generation: JSON.stringify(deck),
      } }, { status: 400 });
    }
    return completion(JSON.stringify(deck), "length");
  } });

  await assert.rejects(requestSolutionCompletion(qwenRequest, { groq }), /complete solution/i);
});
