import { normalizeQuestionVisuals, type QuestionVisuals } from "./graph-data";
import { MAX_SLIDE_TABLES, tableValidationError } from "./slide-tables";

export class InputError extends Error {
  constructor(message: string, readonly status = 400) { super(message); this.name = "InputError"; }
}

export { MAX_PROBLEM_IMAGE_BYTES, PROBLEM_IMAGE_TYPES, problemImageFileError } from "./problem-image";
import { MAX_PROBLEM_IMAGE_BYTES } from "./problem-image";

export const MAX_IMAGE_REQUEST_BYTES = 9 * 1024 * 1024;
export const MAX_SOLUTION_REQUEST_BYTES = 256 * 1024;

/** Enforce the byte limit while reading, including requests without Content-Length. */
export async function readJsonBody(request: Request, maxBytes: number): Promise<Record<string, unknown>> {
  const contentType = request.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
  if (contentType !== "application/json") throw new InputError("Send this request as JSON.", 415);
  const declaredSize = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredSize) && declaredSize > maxBytes) throw new InputError("This request is too large.", 413);
  if (!request.body) throw new InputError("The request is empty.");
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let total = 0;
  let text = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) { await reader.cancel(); throw new InputError("This request is too large.", 413); }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
  } finally { reader.releaseLock(); }
  let body: unknown;
  try { body = JSON.parse(text); } catch { throw new InputError("This request contains invalid JSON."); }
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new InputError("Send a JSON object with the required fields.");
  return body as Record<string, unknown>;
}

export function decodeProblemImage(value: unknown): Buffer {
  if (typeof value !== "string" || !value.trim()) throw new InputError("Choose an image of the problem.");
  const match = value.match(/^data:image\/(?:png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/);
  const base64 = match?.[1] || (/^[A-Za-z0-9+/]+={0,2}$/.test(value) ? value : "");
  if (!base64 || base64.length % 4 !== 0) throw new InputError("This image couldn’t be read. Use a PNG, JPG, or WebP file.");
  if (base64.length > Math.ceil(MAX_PROBLEM_IMAGE_BYTES / 3) * 4) throw new InputError("Choose an image smaller than 6 MB.", 413);
  const buffer = Buffer.from(base64, "base64");
  if (!buffer.length || buffer.length > MAX_PROBLEM_IMAGE_BYTES) throw new InputError("Choose an image smaller than 6 MB.", 413);
  return buffer;
}

export function validateQuestion(value: unknown): QuestionVisuals & { text: string; topic: string } {
  const object = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
  const text = typeof value === "string" ? value : object?.text ?? object?.prompt;
  if (typeof text !== "string" || !text.trim()) throw new InputError("Enter the full question before creating slides.");
  if (text.length > 24000) throw new InputError("This question is too long. Split it into smaller questions.", 413);
  if (object?.visualContext !== undefined && (typeof object.visualContext !== "string" || object.visualContext.length > 24000)) throw new InputError("The graph or table description is too long or invalid.");
  if (object?.graphs !== undefined && (!Array.isArray(object.graphs) || object.graphs.length > 12)) throw new InputError("Use at most 12 source graphs in one question.");
  if (object?.tables !== undefined) {
    if (!Array.isArray(object.tables) || object.tables.length > MAX_SLIDE_TABLES) throw new InputError(`Use at most ${MAX_SLIDE_TABLES} source tables in one question.`);
    for (const table of object.tables) {
      const error = tableValidationError(table);
      if (error) throw new InputError(error);
    }
  }
  const topic = typeof object?.type === "string" && object.type.trim() ? object.type.trim().slice(0, 120) : "Mathematics";
  return { text: text.trim(), topic, ...normalizeQuestionVisuals(object || {}) };
}
