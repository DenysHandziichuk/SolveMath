"use client";

import { memo, useId } from "react";
import { MathRenderer } from "./MathRenderer";
import { cn } from "@/lib/utils";
import { graphBounds, type GraphData, type GraphPoint } from "@/lib/graph-data";
import { compileGraphExpression, graphSegments, sampleGraphFunction } from "@/lib/graph-functions";
import { DesmosGraph } from "./DesmosGraph";
import { GraphImage } from "./GraphImage";

export interface MathGraphProps extends GraphData {
  color?: string;
  compact?: boolean;
  onPlotPoint?: (point: GraphPoint) => void;
}

function ticks(min: number, max: number, target: number) {
  const rough = (max - min) / target;
  const power = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 5, 10].map((n) => n * power).find((n) => n >= rough) || rough;
  return Array.from({ length: Math.min(30, Math.floor((max - Math.ceil(min / step) * step) / step) + 1) }, (_, i) =>
    Number((Math.ceil(min / step) * step + i * step).toPrecision(10)));
}

export const MathGraph = memo(function MathGraph({ color = "#38bdf8", compact = false, onPlotPoint, ...graph }: MathGraphProps) {
  const clipId = useId().replace(/:/g, "");
  if (graph.image !== undefined) return <GraphImage key={graph.image.src} image={graph.image} title={graph.title} compact={compact} />;
  if (graph.desmosUrl !== undefined) return <DesmosGraph key={graph.desmosUrl} url={graph.desmosUrl} title={graph.title} compact={compact} />;
  const width = 640;
  const height = 400;
  const padding = 42;
  const bounds = graphBounds(graph);
  const { minX, maxX, minY, maxY } = bounds;
  const { functions, points = [], holes = [], asymptotes = [], properties = [], title, description, symmetryAxis, reconstruction } = graph;
  const displayFunctions = (functions || []).map((fn) => ({
    ...fn, segments: graphSegments(sampleGraphFunction(fn, { minX, maxX, minY, maxY }), { minX, maxX, minY, maxY }, asymptotes),
  }));
  const scaleX = (x: number) => padding + (x - minX) / (maxX - minX) * (width - 2 * padding);
  const scaleY = (y: number) => height - padding - (y - minY) / (maxY - minY) * (height - 2 * padding);
  const axisX = scaleX(Math.max(minX, Math.min(maxX, 0)));
  const axisY = scaleY(Math.max(minY, Math.min(maxY, 0)));
  const xTicks = graph.isRadian
    ? [0, Math.PI / 2, Math.PI, 3 * Math.PI / 2, 2 * Math.PI].filter((n) => n >= minX && n <= maxX)
    : ticks(minX, maxX, 12);
  const yTicks = ticks(minY, maxY, 8);
  const tickLabel = (x: number) => graph.isRadian ? ({ [Math.PI / 2]: "π/2", [Math.PI]: "π", [3 * Math.PI / 2]: "3π/2", [2 * Math.PI]: "2π" }[x] || String(x)) : String(x);

  return (
    <figure className={cn("math-graph graph-card", compact && "graph-card-compact")} data-compact={compact}>
      {(title || reconstruction === "approximate") && <figcaption className="graph-card-heading"><span><MathRenderer text={title || "Graph"} inline /></span>{reconstruction === "approximate" && <span className="graph-approximation">Approximate sketch</span>}</figcaption>}
      {displayFunctions.some((fn) => fn.equation) && <div className="graph-legend">{displayFunctions.map((fn, index) => fn.equation && <span key={index}><i style={{ backgroundColor: fn.color || color }} /><MathRenderer text={fn.equation} inline /></span>)}</div>}
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={description || title || graph.equation || "Coordinate graph"} className={cn("graph-svg", onPlotPoint && "graph-svg-interactive")} onClick={onPlotPoint ? (event) => {
        const svg = event.currentTarget;
        const transform = svg.getScreenCTM();
        if (!transform) return;
        const position = new DOMPoint(event.clientX, event.clientY).matrixTransform(transform.inverse());
        if (position.x < padding || position.x > width - padding || position.y < padding || position.y > height - padding) return;
        onPlotPoint({ x: Math.round((minX + (position.x - padding) / (width - 2 * padding) * (maxX - minX)) * 10) / 10, y: Math.round((minY + (height - padding - position.y) / (height - 2 * padding) * (maxY - minY)) * 10) / 10 });
      } : undefined}>
        <title>{title || "Coordinate graph"}</title>
        {description && <desc>{description}</desc>}
        <defs><clipPath id={clipId}><rect x={padding} y={padding} width={width - 2 * padding} height={height - 2 * padding} /></clipPath></defs>
        {xTicks.map((x) => <line key={`gx${x}`} x1={scaleX(x)} y1={padding} x2={scaleX(x)} y2={height - padding} stroke="#334155" strokeWidth="0.7" />)}
        {yTicks.map((y) => <line key={`gy${y}`} x1={padding} y1={scaleY(y)} x2={width - padding} y2={scaleY(y)} stroke="#334155" strokeWidth="0.7" />)}
        <line x1={padding} y1={axisY} x2={width - padding + 8} y2={axisY} stroke="#94a3b8" strokeWidth="1.5" />
        <line x1={axisX} y1={height - padding} x2={axisX} y2={padding - 8} stroke="#94a3b8" strokeWidth="1.5" />
        <path d={`M ${width - padding + 8} ${axisY} l -7 -4 m 7 4 l -7 4 M ${axisX} ${padding - 8} l -4 7 m 4 -7 l 4 7`} fill="none" stroke="#94a3b8" />
        <text x={width - padding + 18} y={axisY + 5} fill="#cbd5e1" fontSize="14">x</text>
        <text x={axisX + 10} y={padding - 10} fill="#cbd5e1" fontSize="14">y</text>
        {xTicks.filter((x) => x !== 0).map((x) => <text key={`tx${x}`} x={scaleX(x)} y={Math.min(height - 12, axisY + 18)} textAnchor="middle" fill="#94a3b8" fontSize="12">{tickLabel(x)}</text>)}
        {yTicks.map((y) => <text key={`ty${y}`} x={Math.max(24, axisX - 9)} y={scaleY(y) + 4} textAnchor="end" fill="#94a3b8" fontSize="12">{y}</text>)}
        <g clipPath={`url(#${clipId})`}>
          {asymptotes.map((item, index) => {
            const value = Number(item.value);
            let x1 = padding, x2 = width - padding, y1 = 0, y2 = 0;
            if (item.type === "vertical" && Number.isFinite(value)) { x1 = x2 = scaleX(value); y1 = padding; y2 = height - padding; }
            else if (item.type === "horizontal" && Number.isFinite(value)) { y1 = y2 = scaleY(value); }
            else if (item.type === "oblique") {
              try { const fn = compileGraphExpression(String(item.value)); y1 = scaleY(fn.evaluate({ x: minX })); y2 = scaleY(fn.evaluate({ x: maxX })); if (!Number.isFinite(y1) || !Number.isFinite(y2)) return null; } catch { return null; }
            } else return null;
            return <g key={`a${index}`}><line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#fbbf24" strokeWidth="1.4" strokeDasharray="6 5" />{item.label && <text x={item.type === "vertical" ? x1 + 5 : padding + 5} y={item.type === "vertical" ? padding + 15 : y1 - 5} fill="#fbbf24" fontSize="11">{item.label}</text>}</g>;
          })}
          {symmetryAxis !== undefined && <line x1={scaleX(symmetryAxis)} y1={padding} x2={scaleX(symmetryAxis)} y2={height - padding} stroke="#c084fc" strokeWidth="1.5" strokeDasharray="4 5" />}
          {displayFunctions.flatMap((fn, index) => fn.segments.map((segment, segmentIndex) => segment.length === 1
            ? <circle key={`${index}-${segmentIndex}`} cx={scaleX(segment[0].x)} cy={scaleY(segment[0].y)} r="4" fill={fn.color || color} />
            : <path key={`${index}-${segmentIndex}`} d={segment.map((point, i) => `${i ? "L" : "M"} ${scaleX(point.x)} ${scaleY(point.y)}`).join(" ")} fill="none" stroke={fn.color || color} strokeWidth="3" strokeDasharray={fn.dashed ? "6 4" : undefined} strokeLinecap="round" strokeLinejoin="round" />))}
          {points.map((point, index) => <g key={`p${index}`}><circle cx={scaleX(point.x)} cy={scaleY(point.y)} r="4.5" fill={color} stroke="#0f172a" strokeWidth="1.5" />{point.label && <text x={scaleX(point.x) + 8} y={scaleY(point.y) - 9} fill="#f1f5f9" fontSize="13" stroke="#0f172a" strokeWidth="3" paintOrder="stroke">{point.label}</text>}</g>)}
          {holes.map((point, index) => <circle key={`h${index}`} cx={scaleX(point.x)} cy={scaleY(point.y)} r="5" fill="#0f172a" stroke={color} strokeWidth="2" />)}
        </g>
      </svg>
      {properties.length > 0 && <dl className="graph-properties">{properties.map((prop, index) => <div key={index}><dt><MathRenderer text={prop.name} inline /></dt><dd><MathRenderer text={prop.value} inline /></dd></div>)}</dl>}
    </figure>
  );
});
