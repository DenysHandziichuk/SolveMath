/** Keep transport errors readable and stop requests on timeout or navigation. */
export async function postJson<T>(url: string, body: unknown, options: { signal?: AbortSignal; timeoutMs?: number; fetch?: typeof fetch } = {}): Promise<T> {
  const controller = new AbortController();
  let timedOut = false;
  const cancel = () => controller.abort();
  if (options.signal?.aborted) controller.abort();
  else options.signal?.addEventListener("abort", cancel, { once: true });
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, options.timeoutMs ?? 115000);
  try {
    const response = await (options.fetch || fetch)(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: controller.signal });
    let data: unknown;
    try { data = await response.json(); } catch { throw new Error("The server returned an unreadable response. Try again shortly."); }
    if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("The server returned an unreadable response. Try again shortly.");
    const error = "error" in data ? data.error : undefined;
    if (!response.ok || error) throw new Error(typeof error === "string" ? error : "This request couldn’t be completed. Try again shortly.");
    return data as T;
  } catch (error) {
    if (timedOut) throw new Error("This request took too long. Try again, or create the slides manually.");
    if (controller.signal.aborted) throw new DOMException("Request canceled", "AbortError");
    if (error instanceof TypeError) throw new Error("The site couldn’t connect to the server. Check your connection and try again.");
    throw error;
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener("abort", cancel);
  }
}
