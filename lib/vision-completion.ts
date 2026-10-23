import type OpenAI from "openai";
import type Groq from "groq-sdk";

export interface VisionRequest {
  imageUrl: string;
  systemPrompt: string;
  userPrompt: string;
  model: string;
  fallbackModel: string;
  signal?: AbortSignal;
  validateContent?: (content: string) => void;
}

export interface VisionClients {
  nvidia?: OpenAI;
  groq?: Groq;
}

export class VisionServiceUnavailableError extends Error {
  readonly status = 503;

  constructor(cause: unknown) {
    super("The image reading service is temporarily unavailable. Please try uploading again shortly.", { cause });
    this.name = "VisionServiceUnavailableError";
  }
}

function completeContent(choice?: { message: { content: string | null }; finish_reason: string | null }): string {
  if (choice?.finish_reason === "length") throw new Error("Vision response was truncated");
  if (!choice?.message.content?.trim()) throw new Error("Empty response from AI vision model");
  return choice.message.content;
}

/** Retry transient provider failures, then use an independent vision model. */
export async function requestVisionCompletion(request: VisionRequest, clients: VisionClients): Promise<string> {
  const messages = [
    { role: "system" as const, content: request.systemPrompt },
    {
      role: "user" as const,
      content: [
        { type: "text" as const, text: request.userPrompt },
        { type: "image_url" as const, image_url: { url: request.imageUrl, detail: "high" as const } },
      ],
    },
  ];
  // Bound the whole recovery sequence, including SDK retries and other providers.
  const signal = request.signal || AbortSignal.timeout(90_000);
  const checkedContent = (choice: Parameters<typeof completeContent>[0]) => {
    const content = completeContent(choice);
    request.validateContent?.(content);
    return content;
  };
  let lastError: unknown;

  if (clients.nvidia) {
    const models = [...new Set([request.model, request.fallbackModel].filter(Boolean))];
    for (const model of models) {
      if (signal.aborted) break;
      try {
        const parameters = {
          messages, model, max_tokens: 6000, temperature: 0.1,
          // Nano Omni otherwise spends the OCR output budget on reasoning.
          ...(model.startsWith("nvidia/nemotron-3-nano-omni-")
            ? { chat_template_kwargs: { enable_thinking: false } }
            : {}),
        };
        const completion = await clients.nvidia.chat.completions.create(
          parameters,
          { timeout: 30000, maxRetries: 1, signal }
        );
        return checkedContent(completion.choices[0]);
      } catch (error) {
        lastError = error;
        const status = error && typeof error === "object" && "status" in error ? error.status : undefined;
        console.warn(`[Vision] NVIDIA model ${model} failed (${status ?? "incomplete response or connection failure"}).`);
        // A different model cannot repair credentials shared by this provider.
        if (status === 401 || status === 403) break;
      }
    }
  }

  if (clients.groq && !signal.aborted) {
    try {
      const completion = await clients.groq.chat.completions.create(
        {
          messages,
          model: "meta-llama/llama-4-scout-17b-16e-instruct",
          response_format: { type: "json_object" },
          max_tokens: 6000,
          temperature: 0.1,
        },
        { timeout: 30000, maxRetries: 1, signal }
      );
      return checkedContent(completion.choices[0]);
    } catch (error) {
      lastError = error;
    }
  }

  throw new VisionServiceUnavailableError(lastError);
}
