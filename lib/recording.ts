export function recordingExtension(mimeType: string): string {
  switch (mimeType.split(";")[0].trim().toLowerCase()) {
    case "video/mp4": return "mp4";
    case "video/webm": return "webm";
    case "video/ogg": return "ogv";
    case "video/x-matroska": return "mkv";
    default: return "bin";
  }
}

export function supportedRecordingType(isSupported: (type: string) => boolean): string | undefined {
  return ["video/mp4", "video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"].find((type) => {
    try { return isSupported(type); } catch { return false; }
  });
}

export function isCaptureConstraintError(error: unknown): boolean {
  return Boolean(error && typeof error === "object" && "name" in error && ["TypeError", "OverconstrainedError"].includes(String(error.name)));
}
