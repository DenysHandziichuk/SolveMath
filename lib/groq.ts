import Groq from "groq-sdk";

export const GROQ_DEFAULT_MODEL = process.env.GROQ_MODEL || "qwen/qwen3.8-27b";
// Keep additional Groq models opt-in rather than silently returning to GPT-OSS.
export const GROQ_FALLBACK_MODEL = process.env.GROQ_FALLBACK_MODEL || "";

export function getGroqClient(): Groq {
  const apiKey = process.env.GROQ_API_KEY || "placeholder-key-for-build";
  return new Groq({ apiKey });
}

// Lazy proxy so top-level imports do not crash static builds if GROQ_API_KEY is unset
export const groq = new Proxy({} as Groq, {
  get(_target, prop) {
    const client = getGroqClient();
    const val = client[prop as keyof Groq];
    return typeof val === "function" ? (val as (...args: unknown[]) => unknown).bind(client) : val;
  },
});


