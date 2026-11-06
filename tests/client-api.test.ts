import assert from "node:assert/strict";
import { test } from "node:test";
import { postJson } from "../lib/client-api";

test("HTML and network failures become readable messages instead of raw parser exceptions", async () => {
  await assert.rejects(postJson("/api", {}, { fetch: async () => new Response("<html>Error</html>", { status: 502 }) }), /unreadable response/);
  await assert.rejects(postJson("/api", {}, { fetch: async () => { throw new TypeError("Failed to fetch"); } }), /couldn’t connect/);
  await assert.rejects(postJson("/api", {}, { fetch: async () => Response.json({ error: "Try again in 60 seconds." }, { status: 429 }) }), /60 seconds/);
});

test("navigation cancellation aborts the HTTP request and timeouts explain the next action", async () => {
  const pending: typeof fetch = async (_url, options) => new Promise((_resolve, reject) => {
    const signal = options?.signal;
    if (signal?.aborted) { reject(new DOMException("Canceled", "AbortError")); return; }
    signal?.addEventListener("abort", () => reject(new DOMException("Canceled", "AbortError")), { once: true });
  });
  const controller = new AbortController();
  const request = postJson("/api", {}, { signal: controller.signal, fetch: pending });
  controller.abort();
  await assert.rejects(request, (error: unknown) => error instanceof DOMException && error.name === "AbortError");
  await assert.rejects(postJson("/api", {}, { fetch: pending, timeoutMs: 5 }), /took too long/);
});
