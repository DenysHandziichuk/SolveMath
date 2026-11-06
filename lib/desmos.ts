/** Accept shared graphs or Desmos's iframe code, but never render supplied HTML. */
export function normalizeDesmosUrl(input: unknown): string | null {
  if (typeof input !== "string" || input.length > 8000) return null;
  let source = input.trim();
  if (/^<iframe\s/i.test(source)) {
    const src = source.match(/\ssrc\s*=\s*(["'])(.*?)\1/i);
    if (!src) return null;
    source = src[2].replace(/&amp;/gi, "&");
  }
  if (source.startsWith("//")) source = `https:${source}`;
  else if (/^(?:www\.)?desmos\.com\//i.test(source)) source = `https://${source}`;
  try {
    const url = new URL(source);
    if (url.protocol !== "https:" || !["desmos.com", "www.desmos.com"].includes(url.hostname) ||
        url.username || url.password || url.port) return null;
    const match = url.pathname.match(/^\/calculator\/([a-zA-Z0-9]{1,64})\/?$/);
    return match ? `https://www.desmos.com/calculator/${match[1]}` : null;
  } catch { return null; }
}

export function desmosEmbedUrl(input: unknown): string | null {
  const url = normalizeDesmosUrl(input);
  return url ? `${url}?embed` : null;
}

export const DESMOS_LINK_HELP = "Paste a shared Desmos graph link, such as https://www.desmos.com/calculator/abc123, or its embed code. Use Share in Desmos to get the link.";
