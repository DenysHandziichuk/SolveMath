"use client";

import { motion } from "framer-motion";
import { MathRenderer } from "./MathRenderer";
import { compile } from "mathjs";
import { useMemo } from "react";

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

interface MathGraphProps {
  functions?: GraphFunction[];
  // Maintain backward compatibility for single point set
  points?: Point[];
  properties?: { name: string; value: string }[];
  bounds?: { minX: number; maxX: number; minY: number; maxY: number };
  color?: string;
  equation?: string;
}

export function MathGraph({ functions, points, properties, bounds, color = "#6366f1", equation }: MathGraphProps) {
  // Configuration
  const width = 600;
  const height = 400;
  const padding = 40;

  const minX = bounds?.minX ?? -10;
  const maxX = bounds?.maxX ?? 10;
  const minY = bounds?.minY ?? -7;
  const maxY = bounds?.maxY ?? 7;

  // Use mathjs to calculate points if the mathjs string is provided
  const displayFunctions = useMemo(() => {
    const rawFunctions: GraphFunction[] = functions || (points ? [{ points, color, equation }] : []);
    
    return rawFunctions.map(fn => {
      if (fn.mathjs) {
        const generatedPoints: Point[] = [];
        try {
          if (fn.mathjs.includes(",")) {
             // Parametric
             const [xEq, yEq] = fn.mathjs.split(",").map(s => s.trim());
             const cx = compile(xEq);
             const cy = compile(yEq);
             for (let t = 0; t <= 2 * Math.PI + 0.1; t += 0.1) {
               try {
                 const x = cx.evaluate({ t, x: t });
                 const y = cy.evaluate({ t, x: t });
                 if (typeof x === 'number' && typeof y === 'number' && isFinite(x) && isFinite(y)) {
                   generatedPoints.push({ x, y });
                 }
               } catch {}
             }
          } else {
             // Standard y = f(x)
             const cy = compile(fn.mathjs);
             const step = (maxX - minX) / 150; // Use reasonable number of points
             for (let x = minX; x <= maxX; x += step) {
               try {
                 const y = cy.evaluate({ x });
                 if (typeof y === 'number' && isFinite(y)) {
                   generatedPoints.push({ x, y });
                 }
               } catch {}
             }
          }
          return { ...fn, points: generatedPoints.length > 0 ? generatedPoints : (fn.points || []) };
        } catch {
          return { ...fn, points: fn.points || [] };
        }
      }
      return { ...fn, points: fn.points || [] };
    });
  }, [functions, points, color, equation, minX, maxX]);
  
  if (displayFunctions.length === 0) return null;

  // Scaling functions mapping logical units to SVG pixels
  const scaleX = (x: number) => {
    return padding + ((x - minX) / (maxX - minX)) * (width - 2 * padding);
  };
  const scaleY = (y: number) => {
    return height - (padding + ((y - minY) / (maxY - minY)) * (height - 2 * padding));
  };

  // Generate Grid Lines
  const xGridStep = Math.ceil((maxX - minX) / 15) || 1;
  const yGridStep = Math.ceil((maxY - minY) / 10) || 1;

  const xGrid = Array.from({ length: Math.floor((maxX - minX) / xGridStep) + 1 }, (_, i) => minX + i * xGridStep);
  const yGrid = Array.from({ length: Math.floor((maxY - minY) / yGridStep) + 1 }, (_, i) => minY + i * yGridStep);

  // Axis Ticks (skip edges to avoid overlap)
  const xTicks = xGrid.filter(t => t !== minX && t !== maxX);
  const yTicks = yGrid.filter(t => t !== minY && t !== maxY && t !== 0);

  return (
    <div className="relative flex flex-col items-center justify-center p-4 lg:p-8 bg-zinc-950/40 rounded-[2.5rem] border border-white/5 w-full max-w-3xl shadow-2xl backdrop-blur-xl group overflow-hidden">
      {/* Desmos-style Equation Card(s) */}
      <div className="absolute top-6 left-6 z-20 flex flex-col gap-2">
        {displayFunctions.length > 1 && (
          <div className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1 ml-1">Legend</div>
        )}
        {displayFunctions.map((fn, idx) => fn.equation && (
          <motion.div 
            key={idx}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.2 }}
            className="flex items-center gap-3 bg-zinc-900/90 border border-white/10 p-3 rounded-2xl shadow-xl backdrop-blur-md"
          >
            <div style={{ backgroundColor: fn.color || color }} className="h-4 w-4 rounded-full shadow-[0_0_10px_rgba(0,0,0,0.5)] border-2 border-white/20" />
            <div className="text-sm font-black font-mono text-white/90">
              <MathRenderer text={fn.equation} />
            </div>
          </motion.div>
        ))}
      </div>

      {properties && properties.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="absolute bottom-6 right-6 z-20 flex flex-col gap-3 bg-zinc-900/90 border border-white/10 p-4 rounded-2xl shadow-xl backdrop-blur-md"
        >
          <div className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">Properties</div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            {properties.map((prop, idx) => (
              <div key={idx} className="flex flex-col">
                <span className="text-[10px] font-bold text-white/50 uppercase">{prop.name}</span>
                <span className="text-sm font-black font-mono text-white/90 mt-0.5">
                  <MathRenderer text={prop.value} />
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto overflow-visible relative z-10"
      >
        {/* Minor Grid Lines */}
        {xGrid.map(x => (
          <line 
            key={`gx-${x}`}
            x1={scaleX(x)} y1={padding} x2={scaleX(x)} y2={height - padding} 
            stroke="white" strokeWidth="0.5" strokeOpacity="0.05" 
          />
        ))}
        {yGrid.map(y => (
          <line 
            key={`gy-${y}`}
            x1={padding} y1={scaleY(y)} x2={width - padding} y2={scaleY(y)} 
            stroke="white" strokeWidth="0.5" strokeOpacity="0.05" 
          />
        ))}

        {/* Main Axes */}
        <line 
          x1={scaleX(minX)} y1={scaleY(0)} x2={scaleX(maxX)} y2={scaleY(0)} 
          stroke="white" strokeWidth="1.5" strokeOpacity="0.2" strokeLinecap="round" 
        />
        <line 
          x1={scaleX(0)} y1={scaleY(minY)} x2={scaleX(0)} y2={scaleY(maxY)} 
          stroke="white" strokeWidth="1.5" strokeOpacity="0.2" strokeLinecap="round" 
        />

        {/* Axis Labels */}
        {xTicks.map(tick => (
          <text 
            key={`xt-${tick}`}
            x={scaleX(tick)} y={scaleY(0) + 18} 
            fontSize="10" fill="white" fillOpacity="0.3" textAnchor="middle" fontWeight="bold"
          >
            {Math.round(tick * 100) / 100}
          </text>
        ))}
        {yTicks.map(tick => (
          <text 
            key={`yt-${tick}`}
            x={scaleX(0) - 12} y={scaleY(tick) + 4} 
            fontSize="10" fill="white" fillOpacity="0.3" textAnchor="end" fontWeight="bold"
          >
            {Math.round(tick * 100) / 100}
          </text>
        ))}

        {/* The Function Paths */}
        {displayFunctions.map((fn, idx) => {
          const validPoints = fn.points?.filter(p => typeof p.x === 'number' && !isNaN(p.x) && typeof p.y === 'number' && !isNaN(p.y)) || [];
          
          if (validPoints.length === 1) {
            return (
              <motion.circle
                key={idx}
                cx={scaleX(validPoints[0].x)}
                cy={scaleY(validPoints[0].y)}
                r="6"
                fill={fn.color || color}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 1 }}
                style={{ filter: `drop-shadow(0 0 10px ${fn.color || color})` }}
              />
            );
          }

          // Asymptote checking logic
          let pathData = "";
          const yThreshold = (maxY - minY) * 1.5;
          let prevPoint: Point | null = null;

          validPoints.forEach((p, i) => {
            const sx = scaleX(p.x);
            const sy = scaleY(p.y);
            if (i === 0) {
              pathData += `M ${sx} ${sy}`;
            } else {
              if (prevPoint && Math.abs(p.y - prevPoint!.y) > yThreshold) {
                pathData += ` M ${sx} ${sy}`; // Start new segment
              } else {
                pathData += ` L ${sx} ${sy}`;
              }
            }
            prevPoint = p;
          });

          return pathData && (
            <motion.path
              key={idx}
              d={pathData}
              fill="none"
              stroke={fn.color || color} 
              strokeWidth={idx === 0 && displayFunctions.length > 1 ? "3" : "5"}
              strokeDasharray={idx === 0 && displayFunctions.length > 1 ? "10,5" : "0"}
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 2.5, ease: [0.22, 1, 0.36, 1], delay: idx * 0.5 }}
              style={{ filter: `drop-shadow(0 0 15px ${fn.color || color})` }}
            />
          );
        })}
      </svg>
    </div>
  );
}
