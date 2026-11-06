import { normalizeDesmosUrl } from "./desmos";
import { normalizeGraphImage, type GraphImage } from "./graph-image";
import { normalizeSlideTables, type SlideTable } from "./slide-tables";

export interface GraphPoint {
  x: number;
  y: number;
  label?: string;
}

export interface GraphFunction {
  points?: GraphPoint[];
  mathjs?: string;
  color?: string;
  equation?: string;
  domain?: { min?: number; max?: number };
  dashed?: boolean;
}

export interface GraphData {
  image?: GraphImage;
  desmosUrl?: string;
  title?: string;
  type?: string;
  equation?: string;
  isRadian?: boolean;
  points?: GraphPoint[];
  functions?: GraphFunction[];
  asymptotes?: { type: "vertical" | "horizontal" | "oblique"; value: number | string; label?: string }[];
  symmetryAxis?: number;
  holes?: GraphPoint[];
  properties?: { name: string; value: string }[];
  bounds?: { minX: number; maxX: number; minY: number; maxY: number };
  reconstruction?: "exact" | "approximate";
  description?: string;
}

export const DEFAULT_GRAPH_BOUNDS = { minX: -10, maxX: 10, minY: -7, maxY: 7 };
export const GRAPH_COLORS = ["#38bdf8", "#f87171", "#34d399", "#fbbf24", "#c084fc", "#fb923c"];
export const MAX_SLIDE_GRAPHS = 6;

const record = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
const text = (value: unknown) => typeof value === "string" ? value.slice(0, 4000) : undefined;

function normalizePoints(value: unknown): GraphPoint[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.filter((point) => record(point) && finite(point.x) && finite(point.y)).slice(0, 1500).map((point) => ({
    x: point.x as number, y: point.y as number, ...(text(point.label) ? { label: text(point.label) } : {}),
  }));
}

/** Keep visual evidence through OCR and solving without trusting arbitrary model fields. */
export function normalizeGraphData(value: unknown): GraphData | undefined {
  if (!record(value)) return undefined;
  const graph: GraphData = {};
  if (value.image !== undefined) {
    const image = normalizeGraphImage(value.image);
    if (!image || value.desmosUrl !== undefined) return undefined;
    graph.image = image;
  }
  if (value.desmosUrl !== undefined) {
    const url = normalizeDesmosUrl(value.desmosUrl);
    if (!url) return undefined;
    graph.desmosUrl = url;
  }
  for (const key of ["title", "type", "equation", "description"] as const) {
    if (text(value[key])) graph[key] = text(value[key]);
  }
  if (typeof value.isRadian === "boolean") graph.isRadian = value.isRadian;
  if (value.reconstruction === "exact" || value.reconstruction === "approximate") graph.reconstruction = value.reconstruction;
  if (finite(value.symmetryAxis)) graph.symmetryAxis = value.symmetryAxis;
  const bounds = value.bounds;
  if (record(bounds) && finite(bounds.minX) && finite(bounds.maxX) && finite(bounds.minY) && finite(bounds.maxY) &&
      bounds.minX < bounds.maxX && bounds.minY < bounds.maxY &&
      Number.isFinite(bounds.maxX - bounds.minX) && Number.isFinite(bounds.maxY - bounds.minY)) {
    graph.bounds = { minX: bounds.minX, maxX: bounds.maxX, minY: bounds.minY, maxY: bounds.maxY };
  }
  if (Array.isArray(value.functions)) {
    graph.functions = value.functions.filter(record).slice(0, 12).map((fn) => {
      const result: GraphFunction = {};
      for (const key of ["mathjs", "equation", "color"] as const) {
        if (text(fn[key])) result[key] = text(fn[key]);
      }
      if (typeof fn.dashed === "boolean") result.dashed = fn.dashed;
      if (Array.isArray(fn.points)) result.points = normalizePoints(fn.points);
      if (record(fn.domain)) {
        result.domain = { ...(finite(fn.domain.min) ? { min: fn.domain.min } : {}), ...(finite(fn.domain.max) ? { max: fn.domain.max } : {}) };
      }
      return result;
    }).filter((fn) => fn.mathjs || fn.points?.length);
  }
  if (Array.isArray(value.points)) graph.points = normalizePoints(value.points);
  if (Array.isArray(value.holes)) graph.holes = normalizePoints(value.holes);
  if (Array.isArray(value.asymptotes)) {
    graph.asymptotes = value.asymptotes.filter(record).slice(0, 20).flatMap((item) => {
      if (item.type !== "vertical" && item.type !== "horizontal" && item.type !== "oblique") return [];
      if (!finite(item.value) && !(typeof item.value === "string" && item.value.trim())) return [];
      return [{ type: item.type, value: item.value as number | string, ...(text(item.label) ? { label: text(item.label) } : {}) }];
    });
  }
  if (Array.isArray(value.properties)) {
    graph.properties = value.properties.filter(record).slice(0, 12).flatMap((item) =>
      typeof item.name === "string" && typeof item.value === "string" ? [{ name: item.name, value: item.value }] : []);
  }
  return graph;
}

export function normalizeGraphs(value: unknown): GraphData[] {
  return Array.isArray(value) ? value.map(normalizeGraphData).filter((graph): graph is GraphData => Boolean(graph)) : [];
}

export function graphBounds(graph: GraphData) {
  return graph.bounds || (graph.isRadian ? { ...DEFAULT_GRAPH_BOUNDS, minX: -0.5, maxX: 2 * Math.PI + 0.5 } : DEFAULT_GRAPH_BOUNDS);
}

export interface QuestionVisuals {
  visualContext?: string;
  graphs?: GraphData[];
  tables?: SlideTable[];
}

export function normalizeQuestionVisuals(value: Record<string, unknown>): QuestionVisuals {
  const visualContext = typeof value.visualContext === "string" ? value.visualContext.trim().slice(0, 24000) : "";
  const graphs = normalizeGraphs(value.graphs);
  const tables = normalizeSlideTables(value.tables);
  return { ...(visualContext ? { visualContext } : {}), ...(graphs.length ? { graphs } : {}), ...(tables.length ? { tables } : {}) };
}
