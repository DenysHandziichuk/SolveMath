import Groq from "groq-sdk";
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

function providerDetails(error: unknown) {
  if (!(error instanceof Groq.APIError)) return {};
  // The SDK retains the full error envelope; support both envelope shapes.
  const body = error.error as { error?: { code?: string; message?: string }; code?: string; message?: string } | undefined;
  const detail = body?.error || body;
  return { status: error.status, code: detail?.code, message: detail?.message, headers: error.headers };
}

export class SolutionRateLimitError extends Error {
  readonly status = 429;
  readonly retryAfter: number;

  constructor(cause: unknown) {
    const { message, headers } = providerDetails(cause);
    const seconds = Number(headers?.get("retry-after"));
    const retryAfter = Number.isFinite(seconds) && seconds > 0 ? Math.ceil(seconds) : 60;
    super(
      /request too large/i.test(message || "")
        ? "This question exceeds the AI service's current token limit. Try a shorter question or increase the service limit."
        : `The AI service is temporarily rate-limited. Please try again in ${retryAfter} seconds.`,
      { cause }
    );
    this.name = "SolutionRateLimitError";
    this.retryAfter = retryAfter;
  }
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
    const isQwen = model === "qwen/qwen3.8-27b";
    let maxTokens = isQwen ? Math.min(16384, request.maxTokens + 6000) : request.maxTokens;
    let jsonMode = true;
    let disableReasoning = false;

    // At most one JSON-mode recovery and one output-budget recovery per model.
    for (let attemptIndex = 0; attemptIndex < 3 && !signal.aborted; attemptIndex++) {
      try {
        console.log(`[Solve] Trying Groq model: ${model} (${maxTokens} tokens, ${jsonMode ? "JSON" : "text"} mode)`);
        const completion = await client.chat.completions.create(
          {
            messages, model, max_tokens: maxTokens, temperature: 0.15,
            response_format: { type: jsonMode ? "json_object" : "text" },
            ...(isQwen ? {
              reasoning_effort: disableReasoning ? "none" : "high",
              reasoning_format: "hidden",
            } : {}),
          },
          { timeout: isQwen ? 45000 : 25000, maxRetries: 0, signal }
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
        const { status, code, message } = providerDetails(error);
        console.warn(`[Solve] Groq model ${model} failed (${status ?? "timeout, connection failure, or incomplete response"}${code ? `, ${code}` : ""}).`);

        if (status === 400 && code === "json_validate_failed" && jsonMode) {
          // Generate fresh JSON without provider-side JSON validation. Never
          // accept failed_generation as a successful or complete response.
          jsonMode = false;
          disableReasoning = true;
          continue;
        }

        // A request larger than the enforced output limit cannot recover by
        // waiting. Fit the reported budget and leave it for the actual deck.
        const outputLimit = status === 429 && /request too large/i.test(message || "")
          ? message?.match(/output tokens per minute\s*\(OTPM\):\s*Limit\s+([\d,]+)/i)
          : null;
        const limit = Number(outputLimit?.[1].replace(/,/g, ""));
        if (Number.isFinite(limit) && limit > 0 && limit < maxTokens) {
          maxTokens = Math.floor(limit);
          disableReasoning = true;
          continue;
        }
        break;
      }
    }
    return null;
  }

  const groqModels = [...new Set([
    request.groqModel || GROQ_DEFAULT_MODEL,
    request.groqFallbackModel || GROQ_FALLBACK_MODEL,
  ].filter(Boolean))];
  for (const model of groqModels) {
    const solution = await attempt(model);
    if (solution) return solution;
    const { status } = providerDetails(lastError);
    if (status === 401 || status === 403) break;
  }

  if (providerDetails(lastError).status === 429) throw new SolutionRateLimitError(lastError);
  throw new Error("Groq did not return a complete solution", { cause: lastError });
}
