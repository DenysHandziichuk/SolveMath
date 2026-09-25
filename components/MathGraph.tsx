"use client";

import { MathRenderer } from "./MathRenderer";
import { compile } from "mathjs";
import { useMemo } from "react";
import { cn } from "@/lib/utils";

interface Point {
  x: number;
  y: number;
}

interface GraphFunction {
  points?: Point[];
  mathjs?: string;
  color?: string;
  equation?: string;
}

interface Asymptote {
  type: "vertical" | "horizontal" | "oblique";
  value: number | string;
  label?: string;
}

interface Hole {
  x: number;
  y: number;
}

export interface MathGraphProps {
  functions?: GraphFunction[];
  points?: Point[];
  properties?: { name: string; value: string }[];
  bounds?: { minX: number; maxX: number; minY: number; maxY: number };
  asymptotes?: Asymptote[];
  holes?: Hole[];
  isRadian?: boolean;
  color?: string;
  equation?: string;
  title?: string;
  symmetryAxis?: number;
  compact?: boolean;
}

export function MathGraph({
  functions,
  points,
  properties,
  bounds,
  asymptotes = [],
  holes = [],
  isRadian = false,
  color = "#3b82f6",
  equation,
  title,
  symmetryAxis,
  compact = false,
}: MathGraphProps) {
  // Coordinate Canvas Dimensions (responsive based on compact mode)
  const width = compact ? 520 : 640;
  const height = compact ? 340 : 380;
  const padding = compact ? 36 : 44;

  const minX = bounds?.minX ?? (isRadian ? -0.5 : -10);
  const maxX = bounds?.maxX ?? (isRadian ? 2 * Math.PI + 0.5 : 10);
  const minY = bounds?.minY ?? -7;
  const maxY = bounds?.maxY ?? 7;

  // Use mathjs to calculate points if the mathjs string is provided
  const displayFunctions = useMemo(() => {
    const rawFunctions: GraphFunction[] = functions || (points ? [{ points, color, equation }] : []);

    return rawFunctions.map((fn) => {
      if (fn.mathjs) {
        const generatedPoints: Point[] = [];
        try {
          if (fn.mathjs.includes(",")) {
            // Parametric mode: "x(t), y(t)"
            const [xEq, yEq] = fn.mathjs.split(",").map((s) => s.trim());
            const cx = compile(xEq);
            const cy = compile(yEq);
            const step = (2 * Math.PI) / 120;
            for (let t = 0; t <= 2 * Math.PI + 0.05; t += step) {
              try {
                const x = cx.evaluate({ t, x: t });
                const y = cy.evaluate({ t, x: t });
                if (typeof x === "number" && typeof y === "number" && isFinite(x) && isFinite(y)) {
                  generatedPoints.push({ x, y });
                }
              } catch {}
            }
          } else {
            // Standard y = f(x)
            const cy = compile(fn.mathjs);
            const totalSteps = 240;
            const step = (maxX - minX) / totalSteps;
            for (let x = minX; x <= maxX; x += step) {
              try {
                const y = cy.evaluate({ x, pi: Math.PI, e: Math.E });
                if (typeof y === "number" && isFinite(y) && !isNaN(y)) {
                  generatedPoints.push({ x, y });
                }
              } catch {}
            }
          }
          return { ...fn, points: generatedPoints.length > 0 ? generatedPoints : fn.points || [] };
        } catch {
          return { ...fn, points: fn.points || [] };
        }
      }
      return { ...fn, points: fn.points || [] };
    });
  }, [functions, points, color, equation, minX, maxX]);

  // Scaling functions mapping logical units to SVG pixels
  const scaleX = (x: number) => {
    return padding + ((x - minX) / (maxX - minX)) * (width - 2 * padding);
  };
  const scaleY = (y: number) => {
    return height - (padding + ((y - minY) / (maxY - minY)) * (height - 2 * padding));
  };

  // Generate Grid Lines and Ticks
  const xTicks = useMemo(() => {
    if (isRadian) {
      return [
        { val: 0, label: "0" },
        { val: Math.PI / 2, label: "π/2" },
        { val: Math.PI, label: "π" },
        { val: (3 * Math.PI) / 2, label: "3π/2" },
        { val: 2 * Math.PI, label: "2π" },
      ].filter((t) => t.val >= minX && t.val <= maxX);
    }
    const xStep = Math.ceil((maxX - minX) / 12) || 1;
    const ticks = [];
    for (let x = Math.ceil(minX / xStep) * xStep; x <= maxX; x += xStep) {
      if (x !== 0 && x >= minX && x <= maxX) {
        ticks.push({ val: x, label: String(Math.round(x * 10) / 10) });
      }
    }
    return ticks;
  }, [isRadian, minX, maxX]);

  const yTicks = useMemo(() => {
    const yStep = Math.ceil((maxY - minY) / 8) || 1;
    const ticks = [];
    for (let y = Math.ceil(minY / yStep) * yStep; y <= maxY; y += yStep) {
      if (y !== 0 && y >= minY && y <= maxY) {
        ticks.push({ val: y, label: String(Math.round(y * 10) / 10) });
      }
    }
    return ticks;
  }, [minY, maxY]);

  if (displayFunctions.length === 0 && asymptotes.length === 0) return null;


  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center bg-slate-950/80 rounded-2xl border border-slate-800/80 w-full shadow-xl backdrop-blur-md group overflow-hidden transition-all",
        compact ? "p-2 sm:p-3 max-w-full" : "p-3 sm:p-5 max-w-3xl"
      )}
    >
      {/* Title Badge (e.g. for comparing graphs) */}
      {title && (
        <div className="absolute top-3 right-3 z-20 pointer-events-none">
          <div className="bg-slate-900/90 border border-slate-700/80 px-2.5 py-1 rounded-lg text-xs font-bold text-slate-100 shadow-md backdrop-blur-sm">
            <MathRenderer text={title} inline />
          </div>
        </div>
      )}

      {/* Legend & Equation Badges */}
      <div className="absolute top-3 left-3 z-20 flex flex-col gap-1.5 max-w-[65%] pointer-events-none">
        {displayFunctions.map(
          (fn, idx) =>
            fn.equation && (
              <div
                key={idx}
                className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-lg shadow-md backdrop-blur-sm"
              >
                <div
                  style={{ backgroundColor: fn.color || color }}
                  className="h-2.5 w-2.5 rounded-full ring-2 ring-white/10"
                />
                <div className="text-xs font-semibold text-slate-200">
                  <MathRenderer text={fn.equation} inline />
                </div>
              </div>
            )
        )}
      </div>

      {/* Properties HUD */}
      {properties && properties.length > 0 && (
        <div className="absolute bottom-4 right-4 z-20 flex flex-col gap-1 bg-slate-900/90 border border-slate-800 p-2.5 rounded-xl shadow-md backdrop-blur-sm pointer-events-none">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            {properties.map((prop, idx) => (
              <div key={idx} className="flex flex-col">
                <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">
                  <MathRenderer text={prop.name} inline />
                </span>
                <span className="text-xs font-bold text-slate-100">
                  <MathRenderer text={prop.value} inline />
                </span>
              </div>

            ))}
          </div>
        </div>
      )}

      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible relative z-10">
        {/* Subtle Background Grid */}
        {xTicks.map((t) => (
          <line
            key={`grid-x-${t.val}`}
            x1={scaleX(t.val)}
            y1={padding}
            x2={scaleX(t.val)}
            y2={height - padding}
            stroke="#334155"
            strokeWidth="0.7"
            strokeDasharray="2,3"
            strokeOpacity="0.4"
          />
        ))}
        {yTicks.map((t) => (
          <line
            key={`grid-y-${t.val}`}
            x1={padding}
            y1={scaleY(t.val)}
            x2={width - padding}
            y2={scaleY(t.val)}
            stroke="#334155"
            strokeWidth="0.7"
            strokeDasharray="2,3"
            strokeOpacity="0.4"
          />
        ))}

        {/* Coordinate Axes */}
        <line
          x1={scaleX(minX)}
          y1={scaleY(0)}
          x2={scaleX(maxX)}
          y2={scaleY(0)}
          stroke="#94a3b8"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
        <line
          x1={scaleX(0)}
          y1={scaleY(minY)}
          x2={scaleX(0)}
          y2={scaleY(maxY)}
          stroke="#94a3b8"
          strokeWidth="1.2"
          strokeLinecap="round"
        />

        {/* Axis Ticks and Numeric Labels */}
        {xTicks.map((t) => (
          <text
            key={`xt-${t.val}`}
            x={scaleX(t.val)}
            y={Math.min(height - 12, Math.max(20, scaleY(0) + 16))}
            fontSize="10"
            fill="#94a3b8"
            textAnchor="middle"
            fontWeight="600"
            fontFamily="inherit"
          >
            {t.label}
          </text>
        ))}
        {yTicks.map((t) => (
          <text
            key={`yt-${t.val}`}
            x={Math.max(16, scaleX(0) - 8)}
            y={scaleY(t.val) + 3}
            fontSize="10"
            fill="#94a3b8"
            textAnchor="end"
            fontWeight="600"
            fontFamily="inherit"
          >
            {t.label}
          </text>
        ))}

        {/* Asymptotes (Dashed Lines) */}
        {asymptotes.map((asymp, idx) => {
          const numVal = typeof asymp.value === "number" ? asymp.value : parseFloat(asymp.value);
          if (isNaN(numVal)) return null;

          if (asymp.type === "vertical") {
            const sx = scaleX(numVal);
            return (
              <g key={`asymp-v-${idx}`}>
                <line
                  x1={sx}
                  y1={padding}
                  x2={sx}
                  y2={height - padding}
                  stroke="#ef4444"
                  strokeWidth="1.5"
                  strokeDasharray="6,4"
                  strokeOpacity="0.8"
                />
                {asymp.label && (
                  <text x={sx + 4} y={padding + 12} fontSize="10" fill="#ef4444" fontWeight="bold">
                    {asymp.label}
                  </text>
                )}
              </g>
            );
          } else if (asymp.type === "horizontal") {
            const sy = scaleY(numVal);
            return (
              <g key={`asymp-h-${idx}`}>
                <line
                  x1={padding}
                  y1={sy}
                  x2={width - padding}
                  y2={sy}
                  stroke="#ef4444"
                  strokeWidth="1.5"
                  strokeDasharray="6,4"
                  strokeOpacity="0.8"
                />
                {asymp.label && (
                  <text x={width - padding - 40} y={sy - 4} fontSize="10" fill="#ef4444" fontWeight="bold">
                    {asymp.label}
                  </text>
                )}
              </g>
            );
          }
          return null;
        })}

        {/* Line of Symmetry (Dashed Vertical Line with Label) */}
        {symmetryAxis !== undefined && !isNaN(symmetryAxis) && (
          <g key="symmetry-axis-line">
            <line
              x1={scaleX(symmetryAxis)}
              y1={padding - 6}
              x2={scaleX(symmetryAxis)}
              y2={height - padding + 6}
              stroke="#f43f5e"
              strokeWidth={compact ? "2" : "2.5"}
              strokeDasharray="5,4"
              strokeOpacity="0.95"
            />
            <text
              x={scaleX(symmetryAxis) + 6}
              y={padding + 8}
              fontSize={compact ? "9" : "10"}
              fill="#f43f5e"
              fontWeight="bold"
              fontFamily="inherit"
            >
              Axis of Symmetry (x = {symmetryAxis})
            </text>
          </g>
        )}

        {/* Function Curves */}
        {displayFunctions.map((fn, idx) => {
          const validPoints =
            fn.points?.filter((p) => typeof p.x === "number" && !isNaN(p.x) && typeof p.y === "number" && !isNaN(p.y)) ||
            [];

          if (validPoints.length === 1) {
            return (
              <circle
                key={idx}
                cx={scaleX(validPoints[0].x)}
                cy={scaleY(validPoints[0].y)}
                r="5"
                fill={fn.color || color}
                className="drop-shadow-md"
              />
            );
          }

          // Construct segments without jumping across vertical asymptotes
          const segments: string[] = [];
          let currentSegment = "";
          const yThreshold = (maxY - minY) * 1.5;
          let prevPoint: Point | null = null;

          validPoints.forEach((p) => {
            const sx = scaleX(p.x);
            const sy = scaleY(p.y);

            if (!prevPoint) {
              currentSegment = `M ${sx} ${sy}`;
            } else {
              const yJump = Math.abs(p.y - prevPoint.y);
              if (yJump > yThreshold) {
                // Terminate segment, start new
                if (currentSegment) segments.push(currentSegment);
                currentSegment = `M ${sx} ${sy}`;
              } else {
                currentSegment += ` L ${sx} ${sy}`;
              }
            }
            prevPoint = p;
          });
          if (currentSegment) segments.push(currentSegment);

          return segments.map((d, segIdx) => (
            <path
              key={`${idx}-seg-${segIdx}`}
              d={d}
              fill="none"
              stroke={fn.color || color}
              strokeWidth={idx === 0 && displayFunctions.length > 1 ? "2.5" : "3.5"}
              strokeDasharray={idx === 0 && displayFunctions.length > 1 ? "6,4" : "0"}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="drop-shadow-sm"
            />
          ));
        })}

        {/* Holes (Removable Discontinuities) */}
        {holes.map((hole, idx) => (
          <circle
            key={`hole-${idx}`}
            cx={scaleX(hole.x)}
            cy={scaleY(hole.y)}
            r="4.5"
            fill="#0f172a"
            stroke="#ef4444"
            strokeWidth="2"
          />
        ))}
      </svg>
    </div>
  );
}

