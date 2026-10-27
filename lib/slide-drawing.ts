export type DrawingTool = "pen" | "pencil" | "highlighter" | "eraser";

export interface DrawingPoint {
  x: number;
  y: number;
}

export interface DrawingStroke {
  tool: DrawingTool | "clear";
  color: string;
  width: number;
  points: DrawingPoint[];
}

// Slide coordinates stay independent of viewport size, fullscreen, and device pixels.
export const DRAWING_WIDTH = 1600;
export const DRAWING_HEIGHT = 900;

export function paintDrawing(
  context: CanvasRenderingContext2D,
  strokes: DrawingStroke[],
) {
  context.clearRect(0, 0, DRAWING_WIDTH, DRAWING_HEIGHT);

  for (const stroke of strokes) {
    if (stroke.tool === "clear") {
      context.clearRect(0, 0, DRAWING_WIDTH, DRAWING_HEIGHT);
      continue;
    }
    if (!stroke.points.length) continue;

    context.save();
    context.globalCompositeOperation = stroke.tool === "eraser" ? "destination-out" : "source-over";
    context.globalAlpha = stroke.tool === "highlighter" ? 0.28 : stroke.tool === "pencil" ? 0.65 : 1;
    context.strokeStyle = stroke.color;
    context.lineWidth = stroke.width * (stroke.tool === "highlighter" ? 5 : stroke.tool === "eraser" ? 6 : stroke.tool === "pencil" ? 0.6 : 1);
    context.lineCap = stroke.tool === "highlighter" ? "square" : "round";
    context.lineJoin = "round";
    context.beginPath();
    const first = stroke.points[0];
    context.moveTo(first.x, first.y);
    // A click without dragging leaves a visible dot.
    if (stroke.points.length === 1) context.lineTo(first.x + 0.01, first.y);
    for (let i = 1; i < stroke.points.length; i++) {
      const previous = stroke.points[i - 1];
      const point = stroke.points[i];
      context.quadraticCurveTo(previous.x, previous.y, (previous.x + point.x) / 2, (previous.y + point.y) / 2);
    }
    const last = stroke.points[stroke.points.length - 1];
    context.lineTo(last.x, last.y);
    context.stroke();
    context.restore();
  }
}
