import assert from "node:assert/strict";
import { test } from "node:test";
import OpenAI from "openai";
import Groq from "groq-sdk";
import { requestVisionCompletion, VisionServiceUnavailableError } from "../lib/vision-completion";
import { extractJson, type ExtractedQuestion } from "../lib/json-extractor";

const request = {
  imageUrl: "data:image/png;base64,dGVzdA==",
  systemPrompt: "Transcribe the worksheet.",
  userPrompt: "Return all questions.",
  model: "primary-vision",
  fallbackModel: "backup-vision",
};
const transcription = JSON.stringify({ questions: [
  { id: "C1", text: "Explain the restriction." },
  { id: "C2", text: "Explain the remainder.\na) First part.\nb) Second part." },
] });

function completion(content: string | null, finishReason = "stop") {
  return Response.json({
    id: "vision-test", object: "chat.completion", created: 0, model: "vision",
    choices: [{ index: 0, message: { role: "assistant", content }, finish_reason: finishReason }],
  });
}

function providerError(status: number) {
  return Response.json({ error: { message: "Failed to generate completions", type: "provider_error" } }, {
    status, headers: { "retry-after-ms": "1" },
  });
}

// Regression: NVIDIA's intermittent HTTP 500 reached /api/process because retries
// were disabled and the only fallback required an unconfigured Groq key.
for (const scenario of ["temporary 500", "persistent 500", "retired model", "empty response", "truncated response"] as const) {
  test(`${scenario} recovers usable questions with only an NVIDIA key`, async () => {
    let primaryAttempts = 0;
    const client = new OpenAI({
      apiKey: "test-key", maxRetries: 0,
      fetch: async (_url, init) => {
        const { model } = JSON.parse(String(init?.body));
        if (model === request.fallbackModel) return completion(transcription);
        primaryAttempts++;
        if (scenario === "temporary 500" && primaryAttempts > 1) return completion(transcription);
        if (scenario === "retired model") return providerError(410);
        if (scenario === "empty response") return completion(null);
        if (scenario === "truncated response") return completion('{"questions":[', "length");
        return providerError(500);
      },
    });

    const content = await requestVisionCompletion(request, { nvidia: client });
    const result = extractJson<{ questions: ExtractedQuestion[] }>(content, "questions");
    assert.deepEqual(result.questions.map((question) => question.id), ["C1", "C2"]);
    assert.equal(result.questions[1].text, "Explain the remainder.\na) First part.\nb) Second part.");
  });
}

for (const nvidiaAvailable of [false, true]) {
  test(`Groq returns questions ${nvidiaAvailable ? "after NVIDIA fails" : "when it is the only provider"}`, async () => {
    const nvidia = nvidiaAvailable ? new OpenAI({ apiKey: "test-key", fetch: async () => providerError(503) }) : undefined;
    const groq = new Groq({ apiKey: "test-key", fetch: async () => completion(transcription) });
    const content = await requestVisionCompletion(request, { nvidia, groq });
    assert.equal(content, transcription);
  });
}

test("exhausted providers return a retryable service error instead of fabricated questions", async () => {
  const nvidia = new OpenAI({ apiKey: "test-key", fetch: async () => providerError(500) });
  await assert.rejects(requestVisionCompletion(request, { nvidia }), (error: unknown) => {
    assert.ok(error instanceof VisionServiceUnavailableError);
    assert.equal(error.status, 503);
    return true;
  });
});

test("invalid credentials stop requests to other models using the same key", async () => {
  const nvidia = new OpenAI({
    apiKey: "invalid-key",
    fetch: async (_url, init) => {
      const { model } = JSON.parse(String(init?.body));
      return model === request.model ? providerError(401) : completion(transcription);
    },
  });
  await assert.rejects(requestVisionCompletion(request, { nvidia }), VisionServiceUnavailableError);
});

// Regression: the polynomial worksheet's C1–C5 became three cards even though
// the provider returned successful, syntactically valid JSON.
test("a structurally invalid transcription recovers through the backup model", async () => {
  const merged = JSON.stringify({ questions: [{ id: "C1", text: "Two merged questions." }] });
  const nvidia = new OpenAI({
    apiKey: "test-key",
    fetch: async (_url, init) => {
      const { model } = JSON.parse(String(init?.body));
      return completion(model === request.model ? merged : transcription);
    },
  });
  const checkedRequest = {
    ...request,
    validateContent: (content: string) => {
      const data = JSON.parse(content);
      if (data.questions.length !== 2) throw new Error("Missing printed question label");
    },
  };

  const content = await requestVisionCompletion(checkedRequest, { nvidia });
  assert.equal(content, transcription);
});
