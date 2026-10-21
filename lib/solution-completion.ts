import type Groq from "groq-sdk";
import { GROQ_DEFAULT_MODEL, GROQ_FALLBACK_MODEL } from "./groq";
import { extractJson, isCompleteSolution, type ExtractedSolution } from "./json-extractor";

interface SolutionRequest {
  questionText: string;
  questionTopic: string;
  systemPrompt: string;
  userPrompt: string;
  maxTokens: number;
  groqModel?: string;
  groqFallbackModel?: string;
}

interface SolutionClients {
  groq?: Groq;
}

/** Accept a model only after it produces a usable, complete presentation. */
export async function requestSolutionCompletion(
  request: SolutionRequest,
  clients: SolutionClients
): Promise<ExtractedSolution> {
  if (!clients.groq) throw new Error("Groq is not configured for presentation generation");
  const client = clients.groq;
  const messages = [
    { role: "system" as const, content: request.systemPrompt },
    { role: "user" as const, content: request.userPrompt },
  ];
  const signal = AbortSignal.timeout(100_000);
  let lastError: unknown;

  async function attempt(model: string): Promise<ExtractedSolution | null> {
    if (!model || signal.aborted) return null;
    try {
      console.log(`[Solve] Trying Groq model: ${model}`);
      const parameters = { messages, model, max_tokens: request.maxTokens, temperature: 0.15 };
      const useQwenReasoning = model === "qwen/qwen3.8-27b";
      // Bound each attempt instead of letting SDK retries prolong the request.
      const options = { timeout: useQwenReasoning ? 45000 : 25000, maxRetries: 0, signal };
      const completion = await client.chat.completions.create(
        {
          ...parameters,
          response_format: { type: "json_object" },
          // Thinking tokens share the completion budget; reserve room for the deck.
          ...(useQwenReasoning ? {
            reasoning_effort: "high",
            reasoning_format: "hidden",
            max_tokens: Math.min(16384, request.maxTokens + 6000),
          } : {}),
        }, options
      );
      const choice = completion?.choices[0];
      if (choice?.finish_reason === "length") throw new Error("Solution response was truncated");
      if (!choice?.message.content?.trim()) throw new Error("Empty solution response");
      const solution = extractJson<ExtractedSolution>(
        choice.message.content, "solution", request.questionText, request.questionTopic
      );
      if (!isCompleteSolution(solution)) throw new Error("The response did not contain a complete solution");
      return solution;
    } catch (error) {
      lastError = error;
      const status = error && typeof error === "object" && "status" in error ? error.status : undefined;
      console.warn(`[Solve] Groq model ${model} failed (${status ?? "timeout, connection failure, or incomplete response"}).`);
      return null;
    }
  }

  const groqModels = [...new Set([
    request.groqModel || GROQ_DEFAULT_MODEL,
    request.groqFallbackModel || GROQ_FALLBACK_MODEL,
  ].filter(Boolean))];
  for (const model of groqModels) {
    const solution = await attempt(model);
    if (solution) return solution;
    const status = lastError && typeof lastError === "object" && "status" in lastError ? lastError.status : undefined;
    if (status === 401 || status === 403) break;
  }

  throw new Error("Groq did not return a complete solution", { cause: lastError });
}
