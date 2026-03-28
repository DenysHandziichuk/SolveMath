"use client";

import { motion } from "framer-motion";
import { MathRenderer } from "./MathRenderer";

interface Point {
  x: number;
  y: number;
}

interface MathGraphProps {
  points: Point[];
  color?: string;
  equation?: string;
}

export function MathGraph({ points, color = "#6366f1", equation }: MathGraphProps) {
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

  // Generate Grid Lines (1 unit steps)
  const xGrid = Array.from({ length: 21 }, (_, i) => -10 + i);
  const yGrid = Array.from({ length: 15 }, (_, i) => -7 + i);

  // Axis Ticks
  const xTicks = [-8, -6, -4, -2, 2, 4, 6, 8];
  const yTicks = [-6, -4, -2, 2, 4, 6];

  return (
    <div className="relative flex flex-col items-center justify-center p-4 lg:p-8 bg-zinc-950/40 rounded-[2.5rem] border border-white/5 w-full max-w-3xl shadow-2xl backdrop-blur-xl group overflow-hidden">
      {/* Desmos-style Equation Card */}
      {equation && (
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="absolute top-6 left-6 z-20 flex items-center gap-3 bg-zinc-900/90 border border-white/10 p-3 rounded-2xl shadow-xl backdrop-blur-md"
        >
          <div style={{ backgroundColor: color }} className="h-4 w-4 rounded-full shadow-[0_0_10px_rgba(0,0,0,0.5)] border-2 border-white/20" />
          <div className="text-sm font-black font-mono text-white/90">
            <MathRenderer text={equation} />
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
            {tick}
          </text>
        ))}
        {yTicks.map(tick => (
          <text 
            key={`yt-${tick}`}
            x={scaleX(0) - 12} y={scaleY(tick) + 4} 
            fontSize="10" fill="white" fillOpacity="0.3" textAnchor="end" fontWeight="bold"
          >
            {tick}
          </text>
        ))}

        {/* The Function Path */}
        {pathData && (
          <motion.path
            d={pathData}
            fill="none"
            stroke={color} 
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 2.5, ease: [0.22, 1, 0.36, 1] }}
            style={{ filter: `drop-shadow(0 0 15px ${color})` }}
          />
        )}
      </svg>
      
    
    </div>
  );
}
