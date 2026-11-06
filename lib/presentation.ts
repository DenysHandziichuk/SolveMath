import type { DrawingStroke } from "./slide-drawing";
import type { GraphData } from "./graph-data";
import type { SlideTable } from "./slide-tables";

export interface Slide {
  title: string;
  subtitle?: string;
  content: string;
  notes: string;
  type?: string;
  layout?: SlideTemplate;
  secondaryContent?: string;
  graphData?: GraphData;
  graphs?: GraphData[];
  tables?: SlideTable[];
  visualContext?: string;
  drawings?: DrawingStroke[];
}

export interface Solution {
  explanation: string;
  slides: Slide[];
  graphData?: GraphData;
  graphs?: GraphData[];
  creationMode?: "manual" | "ai";
}

export type SlideTemplate = "title" | "text" | "columns" | "split" | "graph-left" | "graphs" | "visual" | "statement" | "table" | "table-graph";
export const SLIDE_TEMPLATES: { id: SlideTemplate; name: string; description: string }[] = [
  { id: "title", name: "Title slide", description: "Open a lesson or introduce a section" },
  { id: "text", name: "Title & text", description: "Write a question or explanation" },
  { id: "columns", name: "Two text columns", description: "Compare ideas or show two sets of steps" },
  { id: "split", name: "Text & graph", description: "Put your words beside a graph" },
  { id: "graph-left", name: "Graph & text", description: "Lead with the graph on the left" },
  { id: "graphs", name: "Graph comparison", description: "Compare graphs side by side" },
  { id: "visual", name: "Full graph or image", description: "Give a graph or screenshot more room" },
  { id: "statement", name: "Key result", description: "Highlight an answer, formula, or takeaway" },
  { id: "table", name: "Table", description: "Show values, intervals, or a sign table" },
  { id: "table-graph", name: "Table & graph", description: "Put a table beside a graph or image" },
];

export function isSlideTemplate(value: unknown): value is SlideTemplate {
  return SLIDE_TEMPLATES.some((template) => template.id === value);
}

export function hasGraphLayout(layout: string | undefined): boolean {
  return layout === "split" || layout === "graph-left" || layout === "graphs" || layout === "visual" || layout === "table-graph";
}

export function hasTableLayout(layout: string | undefined): boolean {
  return layout === "table" || layout === "table-graph";
}

export function createBlankSlide(layout: SlideTemplate = "text"): Slide {
  return { title: "", subtitle: "", content: "", notes: "", type: "custom", layout, ...(hasGraphLayout(layout) ? { graphs: [] } : {}), ...(hasTableLayout(layout) ? { tables: [] } : {}), ...(layout === "columns" ? { secondaryContent: "" } : {}) };
}

export function getSlideTables(slide: Slide): SlideTable[] {
  return slide.layout && !hasTableLayout(slide.layout) ? [] : slide.tables || [];
}

export function createManualPresentation(): Solution {
  return { explanation: "", creationMode: "manual", slides: [createBlankSlide()] };
}

export function getSlideGraphs(slide: Slide, solution?: Solution): GraphData[] {
  if (slide.layout && !hasGraphLayout(slide.layout)) return [];
  // An explicit empty list means this slide has no graphs, even in a legacy deck.
  if (slide.graphs) return slide.graphs;
  if (slide.graphData) return [slide.graphData];
  if (/^(graph|evidence|comparison)$/.test(slide.type || "") || /^(graph|evidence|visual|plot|coordinate)\b/i.test(slide.title)) {
    return solution?.graphs || (solution?.graphData ? [solution.graphData] : []);
  }
  return [];
}
