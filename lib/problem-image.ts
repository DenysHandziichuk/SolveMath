export const MAX_PROBLEM_IMAGE_BYTES = 6 * 1024 * 1024;
export const PROBLEM_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];

export function problemImageFileError(file: { type: string; size: number }): string | null {
  if (!PROBLEM_IMAGE_TYPES.includes(file.type)) return "Choose a PNG, JPG, or WebP image.";
  if (!Number.isFinite(file.size) || file.size <= 0 || file.size > MAX_PROBLEM_IMAGE_BYTES) return "Choose an image smaller than 6 MB.";
  return null;
}

