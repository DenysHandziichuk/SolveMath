"use client";

import { Eraser, Highlighter, PenLine, Pencil, Trash2, Undo2, MousePointer2 } from "lucide-react";
import type { DrawingTool } from "@/lib/slide-drawing";
import { cn } from "@/lib/utils";

const brushes = [
  { id: "pen", label: "Pen", icon: PenLine },
  { id: "pencil", label: "Pencil", icon: Pencil },
  { id: "highlighter", label: "Highlighter", icon: Highlighter },
  { id: "eraser", label: "Eraser", icon: Eraser },
] as const;
const colors = [
  { value: "#3b82f6", name: "Blue" },
  { value: "#ef4444", name: "Red" },
  { value: "#22c55e", name: "Green" },
  { value: "#facc15", name: "Yellow" },
  { value: "#ffffff", name: "White" },
  { value: "#172033", name: "Black" },
];

interface DrawingToolsProps {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  tool: DrawingTool;
  onToolChange: (tool: DrawingTool) => void;
  color: string;
  onColorChange: (color: string) => void;
  width: number;
  onWidthChange: (width: number) => void;
  canUndo: boolean;
  onUndo: () => void;
  onClear: () => void;
}

export function DrawingTools(props: DrawingToolsProps) {
  return (
    <section className="drawing-toolbar" aria-label="Drawing tools">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button type="button" aria-pressed={props.enabled} onClick={() => props.onEnabledChange(!props.enabled)} className={cn("drawing-toggle", props.enabled && "is-active")}>
          {props.enabled ? <PenLine className="h-4 w-4" /> : <MousePointer2 className="h-4 w-4" />}
          {props.enabled ? "Drawing on" : "Draw on slide"}
        </button>
        <div className="flex items-center gap-1">
          <button type="button" onClick={props.onUndo} disabled={!props.canUndo} aria-label="Undo last drawing" title="Undo last drawing (Ctrl+Z / ⌘Z)" className="drawing-icon-button"><Undo2 className="h-4 w-4" /></button>
          <button type="button" onClick={props.onClear} disabled={!props.canUndo} aria-label="Clear slide drawings" title="Clear slide drawings (can be undone)" className="drawing-icon-button"><Trash2 className="h-4 w-4" /></button>
        </div>
      </div>
      {props.enabled && <>
        <div className="drawing-brushes" aria-label="Brush type">
          {brushes.map(({ id, label, icon: Icon }) => <button type="button" key={id} aria-pressed={props.tool === id} onClick={() => props.onToolChange(id)}><Icon className="h-4 w-4" />{label}</button>)}
        </div>
        <div className="flex flex-wrap items-center gap-2" aria-label="Drawing colors">
          {colors.map(({ value, name }) => <button type="button" key={value} aria-label={`${name} ink`} aria-pressed={props.color.toLowerCase() === value} onClick={() => props.onColorChange(value)} className="drawing-swatch" style={{ backgroundColor: value }} />)}
          <label className="drawing-custom-color">Custom<input aria-label="Custom ink color" type="color" value={props.color} onChange={(event) => props.onColorChange(event.target.value)} /></label>
        </div>
        <label className="drawing-size">Size<input aria-label="Brush size" type="range" min="2" max="18" step="1" value={props.width} onChange={(event) => props.onWidthChange(Number(event.target.value))} /><span>{props.width}</span></label>
        <p className="studio-help">Draw with a mouse, touch, or stylus. Ctrl+Z / ⌘Z undoes the last drawing on this slide.</p>
      </>}
    </section>
  );
}
