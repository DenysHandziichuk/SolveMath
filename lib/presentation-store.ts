import { normalizeGraphData, normalizeGraphs } from "./graph-data";
import { isSlideTemplate, type Slide, type Solution } from "./presentation";
import type { DrawingStroke } from "./slide-drawing";
import { normalizeSlideTables } from "./slide-tables";

type BrowserStore = Pick<Storage, "getItem" | "setItem">;
interface Snapshot { solution: Solution | null; unsaved: boolean; corrupt: boolean }
const memory = new Map<string, Snapshot>();

function drawingStrokes(value: unknown): DrawingStroke[] {
  if (!Array.isArray(value)) return [];
  return value.filter((stroke) => stroke && ["pen", "pencil", "highlighter", "eraser", "clear"].includes(stroke.tool) &&
    typeof stroke.color === "string" && Number.isFinite(stroke.width) && Array.isArray(stroke.points) &&
    stroke.points.every((point: { x?: unknown; y?: unknown } | null) => point && typeof point.x === "number" && Number.isFinite(point.x) && typeof point.y === "number" && Number.isFinite(point.y)));
}

export function normalizeStoredPresentation(value: unknown): Solution | null {
  if (!value || typeof value !== "object") return null;
  const object = value as Record<string, unknown>;
  if (!Array.isArray(object.slides) || !object.slides.length || !object.slides.every((slide) =>
    slide && typeof slide === "object" && typeof slide.title === "string" && typeof slide.content === "string" &&
    (slide.notes === undefined || typeof slide.notes === "string"))) return null;
  const slides: Slide[] = object.slides.map((slide) => ({
    title: slide.title, content: slide.content, notes: slide.notes || "",
    ...(typeof slide.subtitle === "string" ? { subtitle: slide.subtitle } : {}),
    ...(typeof slide.type === "string" ? { type: slide.type } : {}),
    ...(isSlideTemplate(slide.layout) ? { layout: slide.layout } : {}),
    ...(typeof slide.secondaryContent === "string" ? { secondaryContent: slide.secondaryContent } : {}),
    ...(typeof slide.visualContext === "string" ? { visualContext: slide.visualContext } : {}),
    ...(Array.isArray(slide.graphs) ? { graphs: normalizeGraphs(slide.graphs) } : {}),
    ...(Array.isArray(slide.tables) ? { tables: normalizeSlideTables(slide.tables) } : {}),
    ...(slide.graphData ? { graphData: normalizeGraphData(slide.graphData) } : {}),
    ...(slide.drawings ? { drawings: drawingStrokes(slide.drawings) } : {}),
  }));
  return {
    explanation: typeof object.explanation === "string" ? object.explanation : "", slides,
    ...(object.creationMode === "manual" || object.creationMode === "ai" ? { creationMode: object.creationMode } : {}),
    ...(Array.isArray(object.graphs) ? { graphs: normalizeGraphs(object.graphs) } : {}),
    ...(object.graphData ? { graphData: normalizeGraphData(object.graphData) } : {}),
  };
}

/** Keep the current deck usable even when browser storage is blocked or full. */
export function savePresentation(key: string, solution: Solution, storage: () => BrowserStore): boolean {
  let saved = false;
  try { storage().setItem(key, JSON.stringify(solution)); saved = true; } catch { /* The in-memory copy remains usable. */ }
  memory.set(key, { solution, unsaved: !saved, corrupt: false });
  return saved;
}

export function loadPresentation(key: string, storage: () => BrowserStore): Snapshot {
  const current = memory.get(key);
  if (current) return current;
  let serialized: string | null;
  try { serialized = storage().getItem(key); } catch { return { solution: null, unsaved: true, corrupt: false }; }
  if (!serialized) return { solution: null, unsaved: false, corrupt: false };
  try {
    const solution = normalizeStoredPresentation(JSON.parse(serialized));
    return { solution, unsaved: false, corrupt: !solution };
  } catch { return { solution: null, unsaved: false, corrupt: true }; }
}
