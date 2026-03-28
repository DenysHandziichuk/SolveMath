"use client";

import { motion } from "framer-motion";

interface Point {
  x: number;
  y: number;
}

interface MathGraphProps {
  points: Point[];
  color?: string;
}

export function MathGraph({ points, color = "#6366f1" }: MathGraphProps) {
  if (!points || points.length === 0) return null;

  // Configuration
  const width = 600;
  const height = 400;
  const padding = 40;

  const minX = -10;
  const maxX = 10;
  const minY = -7;
  const maxY = 7;

  // Scaling functions mapping logical units to SVG pixels
  const scaleX = (x: number) => {
    return padding + ((x - minX) / (maxX - minX)) * (width - 2 * padding);
  };
  const scaleY = (y: number) => {
    return height - (padding + ((y - minY) / (maxY - minY)) * (height - 2 * padding));
  };

  // Generate SVG path string, filtering points within range
  const validPoints = points.filter(p => p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY);
  
  const pathData = validPoints
    .map((p, i) => `${i === 0 ? "M" : "L"} ${scaleX(p.x)} ${scaleY(p.y)}`)
    .join(" ");

  // Generate Ticks for axes
  const xTicks = [-8, -6, -4, -2, 2, 4, 6, 8];
  const yTicks = [-6, -4, -2, 2, 4, 6];

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-zinc-950/80 rounded-[2rem] border border-white/10 w-full max-w-2xl shadow-2xl backdrop-blur-md">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto overflow-visible"
      >
        {/* Main Axes */}
        <line 
          x1={scaleX(minX)} y1={scaleY(0)} x2={scaleX(maxX)} y2={scaleY(0)} 
          stroke="#444" strokeWidth="2" strokeLinecap="round" 
        />
        <line 
          x1={scaleX(0)} y1={scaleY(minY)} x2={scaleX(0)} y2={scaleY(maxY)} 
          stroke="#444" strokeWidth="2" strokeLinecap="round" 
        />

        {/* X-Axis Ticks and Labels */}
        {xTicks.map(tick => (
          <g key={`x-${tick}`}>
            <line 
              x1={scaleX(tick)} y1={scaleY(0) - 5} 
              x2={scaleX(tick)} y2={scaleY(0) + 5} 
              stroke="#666" strokeWidth="1" 
            />
            <text 
              x={scaleX(tick)} y={scaleY(0) + 20} 
              fontSize="10" fill="#888" textAnchor="middle" fontWeight="bold"
            >
              {tick}
            </text>
          </g>
        ))}

        {/* Y-Axis Ticks and Labels */}
        {yTicks.map(tick => (
          <g key={`y-${tick}`}>
            <line 
              x1={scaleX(0) - 5} y1={scaleY(tick)} 
              x2={scaleX(0) + 5} y2={scaleY(tick)} 
              stroke="#666" strokeWidth="1" 
            />
            <text 
              x={scaleX(0) - 15} y={scaleY(tick) + 4} 
              fontSize="10" fill="#888" textAnchor="end" fontWeight="bold"
            >
              {tick}
            </text>
          </g>
        ))}

        {/* Origin Label */}
        <text x={scaleX(0) - 10} y={scaleY(0) + 15} fontSize="10" fill="#666">0</text>

        {/* The Function Path */}
        {pathData && (
          <motion.path
            d={pathData}
            fill="none"
            stroke={color} 
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 2, ease: "easeInOut" }}
            style={{ filter: `drop-shadow(0 0 12px ${color}80)` }}
          />
        )}
      </svg>
      
      {/* Legend / Axis Hint */}
      <div className="mt-6 flex items-center gap-4 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
        <div className="flex items-center gap-2">
          <div style={{ backgroundColor: color }} className="h-1 w-4 rounded-full" />
          <span>Function Graph</span>
        </div>
        <div className="h-3 w-[1px] bg-white/10" />
        <span>Step: 1 Unit</span>
      </div>
    </div>
  );
}
