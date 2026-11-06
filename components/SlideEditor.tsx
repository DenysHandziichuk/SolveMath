"use client";

import { useEffect, useRef, useState } from "react";
import { Check, X } from "lucide-react";
import { GraphEditor } from "./GraphEditor";
import { hasGraphLayout, hasTableLayout, type Slide } from "@/lib/presentation";
import { TableEditor } from "./TableEditor";
import { SlideLayoutPicker } from "./SlideLayoutPicker";
import { graphBounds, MAX_SLIDE_GRAPHS, type GraphData } from "@/lib/graph-data";
import { validateGraphExpression } from "@/lib/graph-functions";
import { DESMOS_LINK_HELP, normalizeDesmosUrl } from "@/lib/desmos";
import { normalizeGraphImage } from "@/lib/graph-image";
import { tableValidationError } from "@/lib/slide-tables";

interface SlideEditorProps {
  slide: Slide;
  initialGraphs?: GraphData[];
  initialSection?: "text" | "graphs" | "tables";
  onSave: (slide: Slide) => void;
  onCancel: () => void;
  onDirtyChange?: (dirty: boolean) => void;
}

export function SlideEditor({ slide, initialGraphs = [], initialSection = "text", onSave, onCancel, onDirtyChange }: SlideEditorProps) {
  const [draft, setDraftState] = useState<Slide>(() => ({
    ...slide, graphs: slide.graphs || (slide.graphData ? [slide.graphData] : initialGraphs),
    layout: initialSection === "tables" && !hasTableLayout(slide.layout) ? (initialGraphs.length ? "table-graph" : "table")
      : initialSection === "graphs" && !hasGraphLayout(slide.layout) ? (hasTableLayout(slide.layout) || slide.tables?.length ? "table-graph" : "split")
      : slide.layout || (slide.tables?.length ? (initialGraphs.length ? "table-graph" : "table") : initialGraphs.length ? "split" : "text"),
  }));
  const draftRef = useRef(draft);
  const [originalDraft] = useState(() => JSON.stringify(draft));
  const setDraft = (change: Slide | ((current: Slide) => Slide)) => {
    const next = typeof change === "function" ? change(draftRef.current) : change;
    draftRef.current = next;
    setDraftState(next);
    onDirtyChange?.(JSON.stringify(next) !== originalDraft);
  };
  const [error, setError] = useState("");
  const [isPreparingImage, setIsPreparingImage] = useState(false);
  const graphSection = useRef<HTMLDetailsElement>(null);
  const tableSection = useRef<HTMLDetailsElement>(null);
  useEffect(() => { if (initialSection === "graphs") graphSection.current?.scrollIntoView({ block: "start", behavior: "smooth" }); }, [initialSection]);
  useEffect(() => { if (initialSection === "tables") tableSection.current?.scrollIntoView({ block: "start", behavior: "smooth" }); }, [initialSection]);
  const update = (field: "title" | "subtitle" | "content" | "secondaryContent" | "notes", value: string) => {
    setDraft((current) => ({ ...current, [field]: value }));
    setError("");
  };

  return (
    <form className="slide-editor studio-form presenter-card space-y-4" onInvalidCapture={(event) => {
      let details = (event.target as HTMLElement).closest("details");
      while (details) { details.open = true; details = details.parentElement?.closest("details") || null; }
      setError("Check the highlighted fields before saving.");
    }} onSubmit={(event) => {
      event.preventDefault();
      if (isPreparingImage) return;
      for (const table of hasTableLayout(draft.layout) ? draft.tables || [] : []) {
        const tableError = tableValidationError(table);
        if (tableError) { setError(tableError); return; }
      }
      for (const graph of hasGraphLayout(draft.layout) ? draft.graphs || [] : []) {
        if (graph.image !== undefined) {
          if (!normalizeGraphImage(graph.image) || graph.desmosUrl !== undefined) { setError("Replace the graph image before saving."); return; }
          continue;
        }
        if (graph.desmosUrl !== undefined) {
          if (!normalizeDesmosUrl(graph.desmosUrl)) { setError(DESMOS_LINK_HELP); return; }
          continue;
        }
        const bounds = graphBounds(graph);
        if (bounds.minX >= bounds.maxX || bounds.minY >= bounds.maxY || !Number.isFinite(bounds.maxX - bounds.minX) || !Number.isFinite(bounds.maxY - bounds.minY)) { setError("Each axis minimum must be smaller than its maximum."); return; }
        for (const fn of graph.functions || []) {
          if (!fn.mathjs?.trim() && !fn.points?.length) { setError("Enter an expression or coordinates for each curve, or remove the empty curve."); return; }
          const expressionError = fn.mathjs ? validateGraphExpression(fn.mathjs) : null;
          if (expressionError) { setError(expressionError); return; }
          if (fn.domain?.min !== undefined && fn.domain.max !== undefined && fn.domain.min >= fn.domain.max) { setError("A curve's starting x must be smaller than its ending x."); return; }
        }
        for (const item of graph.asymptotes || []) {
          if (item.type === "oblique" ? validateGraphExpression(String(item.value)) : !String(item.value).trim() || !Number.isFinite(Number(item.value))) { setError("Check each asymptote's value or expression."); return; }
        }
      }
      onSave({ ...draft, title: draft.title.trim(), graphData: undefined });
    }} onKeyDown={(event) => { if (event.key === "Escape") { event.stopPropagation(); onCancel(); } }}>
      <div className="flex items-center justify-between gap-2"><h3 className="text-sm font-semibold">Edit slide</h3><button type="button" aria-label="Cancel slide edits" onClick={onCancel} className="drawing-icon-button"><X className="h-4 w-4" /></button></div>
      <SlideLayoutPicker value={draft.layout || "text"} disabled={isPreparingImage} onChange={(layout) => { setDraft((current) => ({ ...current, layout })); setError(""); }} />
      <label className="studio-label"><span>Title</span><input autoFocus={initialSection === "text"} value={draft.title} placeholder="Add a title" onChange={(event) => update("title", event.target.value)} /></label>
      <label className="studio-label"><span>Subtitle</span><input value={draft.subtitle || ""} placeholder="Add a subtitle (optional)" onChange={(event) => update("subtitle", event.target.value)} /></label>
      <label className="studio-label"><span>{draft.layout === "columns" ? "Left column" : draft.layout === "title" ? "Supporting text (optional)" : draft.layout === "visual" ? "Caption (optional)" : draft.layout === "statement" ? "Key result or takeaway" : "Slide content"}</span><textarea aria-label={draft.layout === "columns" ? "Left column" : "Slide content"} rows={draft.layout === "title" || draft.layout === "visual" ? 3 : 6} value={draft.content} placeholder="Write your question, explanation, or equations…" onChange={(event) => update("content", event.target.value)} aria-describedby="slide-math-hint" /></label>
      {draft.layout === "columns" && <label className="studio-label"><span>Right column</span><textarea aria-label="Right column" rows={6} value={draft.secondaryContent || ""} placeholder="Add your comparison, second idea, or more steps…" onChange={(event) => update("secondaryContent", event.target.value)} aria-describedby="slide-math-hint" /></label>}
      <p id="slide-math-hint" className="studio-help">Use $x^2$ for inline math, $$x^2$$ for a displayed equation, and **text** for bold. New lines are preserved.</p>
      {draft.visualContext && <details className="graph-fieldset"><summary>Information read from the image</summary><label className="studio-label"><span>Graph observations & table values</span><textarea rows={5} value={draft.visualContext} onChange={(event) => setDraft({ ...draft, visualContext: event.target.value })} /></label></details>}
      {hasTableLayout(draft.layout) && <details ref={tableSection} open className="graph-editor-section"><summary>Edit tables</summary><TableEditor tables={draft.tables || []} onChange={(tables) => { setDraft((current) => ({ ...current, tables })); setError(""); }} onPlot={(graph) => {
        if ((draftRef.current.graphs?.length || 0) >= MAX_SLIDE_GRAPHS) return `Use at most ${MAX_SLIDE_GRAPHS} graphs per slide. Remove a graph before adding another plot.`;
        setDraft((current) => ({ ...current, graphs: [...(current.graphs || []), graph], layout: "table-graph" }));
        setError("");
        return null;
      }} /></details>}
      {hasGraphLayout(draft.layout) && <details ref={graphSection} open className="graph-editor-section"><summary>Build your graphs</summary><GraphEditor graphs={draft.graphs || []} onBusyChange={setIsPreparingImage} onChange={(graphs) => { setDraft((current) => ({ ...current, graphs })); setError(""); }} /></details>}
      <label className="studio-label"><span>Speaker notes</span><textarea aria-label="Speaker notes" rows={4} value={draft.notes} placeholder="Add what you want to say…" onChange={(event) => update("notes", event.target.value)} /></label>
      {error && <p role="alert" className="studio-field-error">{error}</p>}
      <div className="studio-form-actions slide-editor-actions"><button type="submit" disabled={isPreparingImage} className="studio-button"><Check className="h-3.5 w-3.5" />{isPreparingImage ? "Preparing image…" : "Save changes"}</button><button type="button" onClick={onCancel} className="studio-quiet-button">Cancel</button></div>
      <p className="studio-help">Save or cancel to continue to another slide.</p>
    </form>
  );
}
