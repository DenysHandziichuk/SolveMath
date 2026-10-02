import OpenAI from "openai";

export const NVIDIA_BASE_URL =
  process.env.NVIDIA_BASE_URL || "https://integrate.api.nvidia.com/v1";

// NVIDIA NIM default model: Nemotron 3 Ultra 550B (high-accuracy reasoning)
export const NVIDIA_DEFAULT_MODEL =
  process.env.NVIDIA_MODEL || "nvidia/nemotron-3-ultra-550b-a55b";

export const NVIDIA_FALLBACK_MODEL =
  "moonshotai/kimi-k3";

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
