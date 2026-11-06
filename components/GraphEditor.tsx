"use client";

import { useEffect, useRef, useState } from "react";
import { ExternalLink, ImagePlus, Link2, Plus, Trash2 } from "lucide-react";
import { MathGraph } from "./MathGraph";
import { GraphImageUpload } from "./GraphImageUpload";
import { DEFAULT_GRAPH_BOUNDS, GRAPH_COLORS, MAX_SLIDE_GRAPHS, graphBounds, type GraphData, type GraphFunction, type GraphPoint } from "@/lib/graph-data";
import { validateGraphExpression } from "@/lib/graph-functions";
import { DESMOS_LINK_HELP, normalizeDesmosUrl } from "@/lib/desmos";

function NumberField({ label, value, onChange, required = false }: { label: string; value?: number; onChange: (value: number | undefined) => void; required?: boolean }) {
  return <label className="studio-label"><span>{label}</span><input type="number" step="any" required={required} defaultValue={value ?? ""} onChange={(event) => {
    const raw = event.target.value;
    if (!raw && !required) onChange(undefined);
    else if (raw && Number.isFinite(Number(raw))) onChange(Number(raw));
  }} /></label>;
}

function PointsInput({ label, points, onChange }: { label: string; points: GraphPoint[]; onChange: (points: GraphPoint[]) => void }) {
  const serialize = (items: GraphPoint[]) => items.map((point) => `${point.x}, ${point.y}${point.label ? `, ${point.label}` : ""}`).join("\n");
  const serialized = serialize(points);
  const [draft, setDraft] = useState({ text: serialized, source: serialized, error: "" });
  const current = draft.source === serialized ? draft : { text: serialized, source: serialized, error: "" };
  const textarea = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { textarea.current?.setCustomValidity(current.error); }, [current.error]);
  return <label className="studio-label"><span>{label}</span><textarea ref={textarea} rows={3} value={current.text} placeholder={'-2, 1.11, Minimum\n0, 2, y-intercept'} aria-invalid={!!current.error} onChange={(event) => {
    const raw = event.target.value;
    const lines = raw.split("\n").filter((line) => line.trim());
    const parsed: GraphPoint[] = [];
    let message = "";
    for (const line of lines) {
      const [x, y, ...label] = line.split(",");
      if (!x?.trim() || !y?.trim() || !Number.isFinite(Number(x)) || !Number.isFinite(Number(y))) { message = "Use one point per line: x, y, optional label."; break; }
      parsed.push({ x: Number(x), y: Number(y), ...(label.join(",").trim() ? { label: label.join(",").trim() } : {}) });
    }
    event.target.setCustomValidity(message);
    setDraft({ text: raw, source: message ? serialized : serialize(parsed), error: message });
    if (!message) onChange(parsed);
  }} />{current.error && <span className="studio-field-error">{current.error}</span>}<span className="studio-help">One per line: x, y, optional label.</span></label>;
}

const PRESETS: { name: string; graph: GraphData }[] = [
  { name: "Parabola", graph: { functions: [{ mathjs: "x^2", equation: "$y = x^2$", color: GRAPH_COLORS[0] }], bounds: { minX: -5, maxX: 5, minY: -2, maxY: 10 } } },
  { name: "Reciprocal", graph: { functions: [{ mathjs: "1/x", equation: "$y = 1/x$", color: GRAPH_COLORS[1] }], asymptotes: [{ type: "vertical", value: 0 }, { type: "horizontal", value: 0 }], bounds: DEFAULT_GRAPH_BOUNDS } },
  { name: "Reciprocal quadratic", graph: { functions: [{ mathjs: "-10/((x+5)*(x-1))", equation: "$y = \\frac{-10}{(x+5)(x-1)}$", color: GRAPH_COLORS[1] }], bounds: { minX: -11, maxX: 7, minY: -4, maxY: 7 }, asymptotes: [{ type: "vertical", value: -5, label: "x = -5" }, { type: "vertical", value: 1, label: "x = 1" }, { type: "horizontal", value: 0 }], points: [{ x: -2, y: 10 / 9, label: "(-2, 10/9)" }] } },
  { name: "Sine", graph: { functions: [{ mathjs: "sin(x)", equation: "$y = \\sin(x)$", color: GRAPH_COLORS[2] }], isRadian: true, bounds: { minX: -0.5, maxX: 7, minY: -2, maxY: 2 } } },
];

function DesmosGraphFields({ graph, onChange }: { graph: GraphData; onChange: (graph: GraphData) => void }) {
  const [error, setError] = useState("");
  return <div className="space-y-3">
    <label className="studio-label"><span>Desmos graph link</span><input
      type="text"
      defaultValue={graph.desmosUrl}
      required
      spellCheck={false}
      autoCapitalize="none"
      aria-invalid={!!error}
      onChange={(event) => {
        const url = normalizeDesmosUrl(event.target.value);
        const message = url ? "" : DESMOS_LINK_HELP;
        event.target.setCustomValidity(message);
        setError(message);
        onChange({ ...graph, desmosUrl: url || event.target.value });
      }}
    /></label>
    {error && <p className="studio-field-error" role="alert">{error}</p>}
    <p className="studio-help">Edit the graph in Desmos, then paste its shared link here. Exploring or zooming this preview won’t change the saved graph. An internet connection is needed to display it.</p>
  </div>;
}

export function GraphEditor({ graphs, onChange, onBusyChange }: { graphs: GraphData[]; onChange: (graphs: GraphData[]) => void; onBusyChange?: (busy: boolean) => void }) {
  const [selected, setSelected] = useState(0);
  const [revision, setRevision] = useState(0);
  const [plotPoints, setPlotPoints] = useState(false);
  const [showDesmosImport, setShowDesmosImport] = useState(false);
  const [showImageImport, setShowImageImport] = useState(false);
  const [desmosDraft, setDesmosDraft] = useState("");
  const [desmosError, setDesmosError] = useState("");
  const index = Math.min(selected, Math.max(0, graphs.length - 1));
  const graph = graphs[index];
  const updateGraph = (next: GraphData) => onChange(graphs.map((item, i) => i === index ? next : item));
  const updateFunction = (functionIndex: number, patch: Partial<GraphFunction>) => updateGraph({ ...graph, functions: graph.functions?.map((fn, i) => i === functionIndex ? { ...fn, ...patch } : fn) });
  const bounds = graph ? graphBounds(graph) : DEFAULT_GRAPH_BOUNDS;

  const addDesmosGraph = () => {
    if (graphs.length >= MAX_SLIDE_GRAPHS) return;
    const url = normalizeDesmosUrl(desmosDraft);
    if (!url) { setDesmosError(DESMOS_LINK_HELP); return; }
    onChange([...graphs, { type: "desmos", title: `Desmos graph ${graphs.filter((item) => item.desmosUrl).length + 1}`, desmosUrl: url }]);
    setSelected(graphs.length);
    setPlotPoints(false);
    setDesmosDraft("");
    setDesmosError("");
    setShowDesmosImport(false);
  };

  return <div className="graph-editor space-y-4">
    <div className="graph-editor-tabs" aria-label="Graphs on this slide">
      {graphs.map((item, i) => <button type="button" key={i} aria-pressed={index === i} className="studio-quiet-button" onClick={() => { setSelected(i); setPlotPoints(false); }}>{item.title || `Graph ${i + 1}`}</button>)}
      <button type="button" className="studio-secondary-button" disabled={graphs.length >= MAX_SLIDE_GRAPHS} onClick={() => { onChange([...graphs, { title: `Graph ${graphs.length + 1}`, functions: [], bounds: { ...DEFAULT_GRAPH_BOUNDS } }]); setSelected(graphs.length); setPlotPoints(false); }}><Plus size={14} />Add graph</button>
      <button type="button" className="studio-secondary-button" disabled={graphs.length >= MAX_SLIDE_GRAPHS} aria-expanded={showDesmosImport} onClick={() => { setShowDesmosImport(!showDesmosImport); setShowImageImport(false); }}><Link2 size={14} />Add from Desmos</button>
      <button type="button" className="studio-secondary-button" disabled={graphs.length >= MAX_SLIDE_GRAPHS} aria-expanded={showImageImport} onClick={() => { setShowImageImport(!showImageImport); setShowDesmosImport(false); }}><ImagePlus size={14} />Add graph image</button>
    </div>
    {showImageImport && <section className="graph-fieldset space-y-3" aria-label="Add a graph image">
      <p className="studio-help">Use an exported Desmos image or a screenshot. It’s saved with your slides and needs no internet or AI to display.</p>
      <GraphImageUpload onBusyChange={onBusyChange} onSelect={(image) => {
        if (graphs.length >= MAX_SLIDE_GRAPHS) return;
        onChange([...graphs, { type: "image", title: `Graph image ${graphs.filter((item) => item.image).length + 1}`, image }]);
        setSelected(graphs.length);
        setPlotPoints(false);
        setShowImageImport(false);
      }} />
    </section>}
    {showDesmosImport && <section className="graph-fieldset desmos-import space-y-3" aria-label="Add a Desmos graph">
      <label className="studio-label"><span>Desmos shared graph link or embed code</span><input
        type="text"
        value={desmosDraft}
        placeholder="https://www.desmos.com/calculator/…"
        autoFocus
        autoCapitalize="none"
        spellCheck={false}
        aria-invalid={!!desmosError}
        onChange={(event) => { setDesmosDraft(event.target.value); setDesmosError(""); }}
        onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addDesmosGraph(); } }}
      /></label>
      <p className="studio-help">In Desmos, use Share to copy your graph link, then paste it here. The graph appears on your slide as an interactive Desmos view.</p>
      <button type="button" className="studio-quiet-button" onClick={() => { setShowDesmosImport(false); setShowImageImport(true); }}><ImagePlus size={14} />Use an exported image or screenshot instead</button>
      {desmosError && <p role="alert" className="studio-field-error">{desmosError}</p>}
      <div className="desmos-import-actions"><a href="https://www.desmos.com/calculator" target="_blank" rel="noopener noreferrer" className="studio-quiet-button">Create in Desmos<ExternalLink size={13} /></a><button type="button" disabled={graphs.length >= MAX_SLIDE_GRAPHS} className="studio-button" onClick={addDesmosGraph}><Plus size={14} />Add to slide</button></div>
    </section>}
    {!graph ? <p className="studio-help">Add a graph to start. Build it with an equation or coordinates, add a Desmos link, or upload a graph image.</p> : <div key={`${index}-${revision}`} className="space-y-4">
      <div className="graph-editor-preview"><MathGraph {...graph} compact onPlotPoint={plotPoints ? (point) => updateGraph({ ...graph, points: [...(graph.points || []), point] }) : undefined} /></div>
      {graph.desmosUrl === undefined && graph.image === undefined && <button type="button" aria-pressed={plotPoints} className="studio-secondary-button" onClick={() => setPlotPoints(!plotPoints)}>{plotPoints ? "Stop placing points" : "Place points on graph"}</button>}
      {plotPoints && graph.desmosUrl === undefined && graph.image === undefined && <p className="studio-help">Click inside the graph to place points, or enter exact coordinates below.</p>}
      <label className="studio-label"><span>Graph title</span><input value={graph.title || ""} placeholder="e.g. Part a" onChange={(event) => updateGraph({ ...graph, title: event.target.value })} /></label>
      {graph.image !== undefined ? <div className="space-y-3">
        <label className="studio-label"><span>Image description</span><textarea rows={3} value={graph.image.alt} placeholder="Describe the graph, its axes, and important points" onChange={(event) => updateGraph({ ...graph, image: { ...graph.image!, alt: event.target.value } })} /></label>
        <p className="studio-help">The whole image is shown without cropping. A description helps people who use a screen reader.</p>
        {!showImageImport && <GraphImageUpload label="Replace graph image" onBusyChange={onBusyChange} onSelect={(image) => updateGraph({ ...graph, image })} />}
      </div> : graph.desmosUrl !== undefined ? <div className="space-y-3">
        <DesmosGraphFields graph={graph} onChange={updateGraph} />
        {!showImageImport && <div className="space-y-2"><p className="studio-help">Prefer a static graph? Replace this live view with an exported Desmos image or screenshot.</p><GraphImageUpload label="Use an image instead" onBusyChange={onBusyChange} onSelect={(image) => { updateGraph({ title: graph.title, type: "image", image }); setRevision(revision + 1); }} /></div>}
      </div> : <>
      {graph.reconstruction === "approximate" && <p className="studio-help">This is an approximate reconstruction of the source. Keep the original observations when explaining it.</p>}
      {graph.description && <p className="studio-help">{graph.description}</p>}
      {!graph.functions?.length && !graph.points?.length && <div className="graph-presets"><span className="studio-help">Start with a shape:</span>{PRESETS.map((preset) => <button key={preset.name} type="button" className="studio-quiet-button" onClick={() => { updateGraph({ title: graph.title, ...structuredClone(preset.graph) }); setRevision(revision + 1); }}>{preset.name}</button>)}</div>}
      <fieldset className="graph-fieldset"><legend>Functions & curves</legend>
        {graph.functions?.map((fn, i) => <div key={i} className="graph-function-fields space-y-3">
          <div className="graph-function-heading"><span>Curve {i + 1}</span><input type="color" aria-label={`Curve ${i + 1} color`} value={fn.color || GRAPH_COLORS[i % GRAPH_COLORS.length]} onChange={(event) => updateFunction(i, { color: event.target.value })} /><button type="button" aria-label={`Remove curve ${i + 1}`} className="drawing-icon-button" onClick={() => { updateGraph({ ...graph, functions: graph.functions?.filter((_, n) => n !== i) }); setRevision(revision + 1); }}><Trash2 size={14} /></button></div>
          <label className="studio-label"><span>Expression in x</span><input value={fn.mathjs || ""} placeholder="e.g. -10/((x+5)*(x-1))" onChange={(event) => updateFunction(i, { mathjs: event.target.value })} aria-invalid={!!fn.mathjs && !!validateGraphExpression(fn.mathjs)} />{fn.mathjs && validateGraphExpression(fn.mathjs) && <span className="studio-field-error">{validateGraphExpression(fn.mathjs)}</span>}</label>
          <label className="studio-label"><span>Equation label (optional)</span><input value={fn.equation || ""} placeholder="e.g. $y = x^2$" onChange={(event) => updateFunction(i, { equation: event.target.value })} /></label>
          <div className="graph-number-grid"><NumberField label="From x (optional)" value={fn.domain?.min} onChange={(min) => updateFunction(i, { domain: { ...fn.domain, min } })} /><NumberField label="To x (optional)" value={fn.domain?.max} onChange={(max) => updateFunction(i, { domain: { ...fn.domain, max } })} /></div>
          <label className="graph-checkbox"><input type="checkbox" checked={fn.dashed || false} onChange={(event) => updateFunction(i, { dashed: event.target.checked })} />Dashed curve</label>
          <details><summary>Use coordinates for this curve</summary><p className="studio-help">Leave the expression empty to connect these points. Use a separate curve for each disconnected branch.</p><PointsInput label="Curve coordinates" points={fn.points || []} onChange={(points) => updateFunction(i, { points })} /></details>
        </div>)}
        <button type="button" className="studio-secondary-button" onClick={() => updateGraph({ ...graph, functions: [...(graph.functions || []), { mathjs: "", color: GRAPH_COLORS[(graph.functions?.length || 0) % GRAPH_COLORS.length] }] })}><Plus size={14} />Add curve</button>
        <p className="studio-help">Use x^2, 1/x, sqrt(x), sin(x), or pi. Enter only the right-hand side. Limit x to show just one branch.</p>
      </fieldset>
      <fieldset className="graph-fieldset"><legend>Axis range</legend><div className="graph-number-grid">
        {(["minX", "maxX", "minY", "maxY"] as const).map((key) => <NumberField key={key} label={{ minX: "x minimum", maxX: "x maximum", minY: "y minimum", maxY: "y maximum" }[key]} value={bounds[key]} required onChange={(value) => { if (value !== undefined) updateGraph({ ...graph, bounds: { ...bounds, [key]: value } }); }} />)}
      </div><label className="graph-checkbox"><input type="checkbox" checked={graph.isRadian || false} onChange={(event) => updateGraph({ ...graph, isRadian: event.target.checked })} />Label x in radians</label></fieldset>
      <details className="graph-fieldset"><summary>Asymptotes</summary><div className="space-y-3">
        {graph.asymptotes?.map((item, i) => <div key={i} className="graph-asymptote-row"><label className="studio-label"><span>Direction</span><select value={item.type} onChange={(event) => updateGraph({ ...graph, asymptotes: graph.asymptotes?.map((a, n) => n === i ? { ...a, type: event.target.value as typeof item.type, value: event.target.value === "oblique" ? "x" : 0, label: undefined } : a) })}><option value="vertical">Vertical: x =</option><option value="horizontal">Horizontal: y =</option><option value="oblique">Oblique: y =</option></select></label><label className="studio-label"><span>{item.type === "oblique" ? "Expression" : "Value"}</span><input type={item.type === "oblique" ? "text" : "number"} step="any" required value={item.value} onChange={(event) => updateGraph({ ...graph, asymptotes: graph.asymptotes?.map((a, n) => n === i ? { ...a, value: event.target.value, label: undefined } : a) })} /></label><button type="button" className="drawing-icon-button" aria-label={`Remove asymptote ${i + 1}`} onClick={() => { updateGraph({ ...graph, asymptotes: graph.asymptotes?.filter((_, n) => n !== i) }); setRevision(revision + 1); }}><Trash2 size={14} /></button></div>)}
        <button type="button" className="studio-secondary-button" onClick={() => updateGraph({ ...graph, asymptotes: [...(graph.asymptotes || []), { type: "vertical", value: 0 }] })}><Plus size={14} />Add asymptote</button>
      </div></details>
      <PointsInput label="Marked points" points={graph.points || []} onChange={(points) => updateGraph({ ...graph, points })} />
      <details className="graph-fieldset"><summary>Holes & symmetry</summary><PointsInput label="Open circles (holes)" points={graph.holes || []} onChange={(holes) => updateGraph({ ...graph, holes })} /><NumberField label="Axis of symmetry: x = (optional)" value={graph.symmetryAxis} onChange={(symmetryAxis) => updateGraph({ ...graph, symmetryAxis })} /></details>
      </>}
      <button type="button" className="studio-quiet-button graph-remove" onClick={() => { onChange(graphs.filter((_, i) => i !== index)); setSelected(Math.max(0, index - 1)); setRevision(revision + 1); }}><Trash2 size={14} />Remove this graph</button>
    </div>}
  </div>;
}
