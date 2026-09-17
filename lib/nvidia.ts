import OpenAI from "openai";

export const NVIDIA_BASE_URL =
  process.env.NVIDIA_BASE_URL || "https://integrate.api.nvidia.com/v1";

// NVIDIA NIM default model: Llama 3.2 11B (reliable 4-5s presentation generation)
export const NVIDIA_DEFAULT_MODEL =
  process.env.NVIDIA_MODEL || "meta/llama-3.2-11b-vision-instruct";

export const NVIDIA_FALLBACK_MODEL =
  "z-ai/glm-5.3-flash";

// NVIDIA NIM vision model for document/exam OCR extraction
export const NVIDIA_VISION_MODEL =
  process.env.NVIDIA_VISION_MODEL || "meta/llama-3.2-11b-vision-instruct";

export function getNvidiaClient(): OpenAI {
  const apiKey =
    process.env.NVIDIA_API_KEY ||
    process.env.GROQ_API_KEY ||
    "placeholder-key-for-build";

  return new OpenAI({
    apiKey,
    baseURL: NVIDIA_BASE_URL,
    maxRetries: 0,
  });
}

// Lazy proxy so top-level imports don't crash static builds when env variables are empty
export const nvidia = new Proxy({} as OpenAI, {
  get(_target, prop) {
    const client = getNvidiaClient();
    const val = client[prop as keyof OpenAI];
    return typeof val === "function"
      ? (val as (...args: unknown[]) => unknown).bind(client)
      : val;
  },
});
