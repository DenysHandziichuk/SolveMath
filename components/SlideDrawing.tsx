"use client";

import { useCallback, useLayoutEffect, useRef, type PointerEvent } from "react";
import { DRAWING_HEIGHT, DRAWING_WIDTH, paintDrawing, type DrawingPoint, type DrawingStroke, type DrawingTool } from "@/lib/slide-drawing";

interface SlideDrawingProps {
  strokes: DrawingStroke[];
  enabled: boolean;
  tool: DrawingTool;
  color: string;
  width: number;
  onStroke: (stroke: DrawingStroke) => void;
}

export function SlideDrawing({ strokes, enabled, tool, color, width, onStroke }: SlideDrawingProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const draftRef = useRef<DrawingStroke | null>(null);
  const pointerRef = useRef<number | null>(null);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    context.setTransform(canvas.width / DRAWING_WIDTH, 0, 0, canvas.height / DRAWING_HEIGHT, 0, 0);
    paintDrawing(context, draftRef.current ? [...strokes, draftRef.current] : strokes);
  }, [strokes]);

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      // Observe layout dimensions, since the whole slide is visually scaled.
      // CSS transforms do not trigger ResizeObserver notifications.
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(canvas.clientWidth * ratio);
      canvas.height = Math.round(canvas.clientHeight * ratio);
      redraw();
    };
    const observer = new ResizeObserver(resize);
    resize();
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [redraw]);

  const getPoint = (event: PointerEvent<HTMLCanvasElement>): DrawingPoint => {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(DRAWING_WIDTH, (event.clientX - rect.left) / rect.width * DRAWING_WIDTH)),
      y: Math.max(0, Math.min(DRAWING_HEIGHT, (event.clientY - rect.top) / rect.height * DRAWING_HEIGHT)),
    };
  };

  const finish = (event: PointerEvent<HTMLCanvasElement>, cancelled = false) => {
    if (event.pointerId !== pointerRef.current) return;
    const stroke = draftRef.current;
    draftRef.current = null;
    pointerRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (stroke && !cancelled) onStroke(stroke);
    redraw();
  };

  return (
    <canvas
      ref={canvasRef}
      tabIndex={enabled ? 0 : -1}
      aria-label={enabled ? "Slide drawing surface. Use the drawing tools to choose a brush and color." : "Slide annotations"}
      className={`absolute inset-0 z-10 h-full w-full rounded-[inherit] ${enabled ? "touch-none" : "pointer-events-none"}`}
      style={{ cursor: tool === "eraser" ? "cell" : "crosshair" }}
      onPointerDown={(event) => {
        if (!enabled || event.button !== 0 || pointerRef.current !== null) return;
        event.preventDefault();
        event.currentTarget.focus({ preventScroll: true });
        event.currentTarget.setPointerCapture(event.pointerId);
        pointerRef.current = event.pointerId;
        draftRef.current = { tool, color, width, points: [getPoint(event)] };
        redraw();
      }}
      onPointerMove={(event) => {
        if (event.pointerId !== pointerRef.current || !draftRef.current) return;
        draftRef.current.points.push(getPoint(event));
        redraw();
      }}
      onPointerUp={(event) => finish(event)}
      onPointerCancel={(event) => finish(event, true)}
      onLostPointerCapture={(event) => finish(event, true)}
    />
  );
}
