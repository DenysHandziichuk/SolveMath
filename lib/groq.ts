import Groq from "groq-sdk";

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


