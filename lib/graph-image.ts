export interface GraphImage {
  src: string;
  alt: string;
  width: number;
  height: number;
}

export const GRAPH_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];
export const MAX_GRAPH_IMAGE_SOURCE_BYTES = 20 * 1024 * 1024;
export const MAX_GRAPH_IMAGE_URL_LENGTH = 400_000;

export function graphImageFileError(file: { type: string; size: number }): string | null {
  if (!GRAPH_IMAGE_TYPES.includes(file.type)) return "Choose a PNG, JPG, or WebP graph image.";
  if (!Number.isFinite(file.size) || file.size <= 0 || file.size > MAX_GRAPH_IMAGE_SOURCE_BYTES) return "Choose an image smaller than 20 MB.";
  return null;
}

export function graphImageSize(width: number, height: number, maxEdge = 1600) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0 || width * height > 40_000_000) {
    throw new Error("This image is too large or has invalid dimensions. Try a smaller screenshot.");
  }
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

/** Only local, raster data URLs belong in saved graph images. */
export function normalizeGraphImage(value: unknown): GraphImage | null {
  if (!value || typeof value !== "object") return null;
  const image = value as Record<string, unknown>;
  if (typeof image.src !== "string" || image.src.length > MAX_GRAPH_IMAGE_URL_LENGTH ||
    !/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(image.src) ||
    typeof image.width !== "number" || typeof image.height !== "number" ||
    !Number.isInteger(image.width) || !Number.isInteger(image.height) ||
    image.width < 1 || image.height < 1 || image.width > 1600 || image.height > 1600) return null;
  return { src: image.src, alt: typeof image.alt === "string" ? image.alt.slice(0, 2000) : "Graph image", width: image.width, height: image.height };
}

/** Prepare a self-contained image locally; no upload or AI service is involved. */
export async function prepareGraphImage(file: File): Promise<GraphImage> {
  const error = graphImageFileError(file);
  if (error) throw new Error(error);
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("This image couldn’t be opened. Try a different image or screenshot."));
      element.src = objectUrl;
    });
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) throw new Error("This browser couldn’t prepare the image. Try another browser.");
    for (const maxEdge of [1600, 1200, 960]) {
      const size = graphImageSize(image.naturalWidth, image.naturalHeight, maxEdge);
      canvas.width = size.width;
      canvas.height = size.height;
      context.drawImage(image, 0, 0, size.width, size.height);
      // Prefer lossless PNG for sharp axes, equations, and small labels.
      const candidates = [() => canvas.toDataURL("image/png"), () => canvas.toDataURL("image/webp", 0.92), () => canvas.toDataURL("image/webp", 0.8)];
      for (const encode of candidates) {
        const src = encode();
        const result = normalizeGraphImage({ src, ...size, alt: file.name.replace(/\.[^.]+$/, "") || "Graph image" });
        if (result) return result;
      }
    }
    throw new Error("This image has too much detail to save. Crop it to the graph and try again.");
  } finally { URL.revokeObjectURL(objectUrl); }
}
