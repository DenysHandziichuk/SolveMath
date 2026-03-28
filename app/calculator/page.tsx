"use client";

import { useState, useEffect } from "react";
import { MathGraph } from "@/components/MathGraph";
import { motion } from "framer-motion";
import { evaluate } from "mathjs";
import { Calculator, Info, AlertCircle } from "lucide-react";

export default function CalculatorPage() {
  const [equation, setEquation] = useState("x^2");
  const [points, setPoints] = useState<{ x: number; y: number }[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Generate points when equation changes
  useEffect(() => {
    try {
      const newPoints = [];
      // Range from -10 to 10 with 0.2 increments for smoothness
      for (let x = -10; x <= 10; x += 0.2) {
        try {
          const y = evaluate(equation, { x });
          // Only add valid numbers to avoid graph breaks
          if (typeof y === 'number' && isFinite(y)) {
            newPoints.push({ x, y });
          }
        } catch {
          // Individual point failure (e.g. log of negative) - just skip
        }
      }
      
      if (newPoints.length === 0) {
        throw new Error("Invalid equation results");
      }
      
      setPoints(newPoints);
      setError(null);
    } catch {
      setError("Invalid mathematical expression");
      setPoints([]);
    }
  }, [equation]);

  return (
    <div className="min-h-screen bg-background pt-48 pb-24 px-6 overflow-x-hidden">
      <div className="mx-auto w-[80vw] flex flex-col items-center">
        {/* Header */}
        <div className="text-center mb-16 space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-bold uppercase tracking-widest"
          >
            <Calculator className="h-3 w-3" />
            Graphing Lab
          </motion.div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter">Live Calculator</h1>
          <p className="text-xl text-muted-foreground max-w-xl mx-auto">
            Type any function of x below to visualize it instantly on our high-precision grid.
          </p>
        </div>

        <div className="w-full flex flex-col lg:flex-row gap-12 items-start justify-center">
          {/* Input Panel */}
          <div className="w-full lg:w-[400px] flex flex-col gap-6">
            <div className="p-8 rounded-[2.5rem] bg-card border border-border shadow-2xl space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-2">Equation</label>
                <div className="relative">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 text-2xl font-bold text-primary font-mono italic">y =</span>
                  <input
                    type="text"
                    value={equation}
                    onChange={(e) => setEquation(e.target.value)}
                    placeholder="x^2 + 2x + 1"
                    className="w-full h-16 bg-secondary/50 border border-border rounded-2xl pl-16 pr-6 text-xl font-bold font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
              </div>

              {error ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20"
                >
                  <AlertCircle className="h-5 w-5 shrink-0" />
                  <p className="text-sm font-bold leading-tight">{error}</p>
                </motion.div>
              ) : (
                <div className="flex items-start gap-3 p-4 rounded-xl bg-primary/5 text-primary border border-primary/10">
                  <Info className="h-5 w-5 shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-bold">Pro-Tip</p>
                    <p className="opacity-80">Use standard notation like <code className="font-mono bg-primary/10 px-1 rounded">sin(x)</code>, <code className="font-mono bg-primary/10 px-1 rounded">sqrt(x)</code>, or <code className="font-mono bg-primary/10 px-1 rounded">x^2</code>.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Presets */}
            <div className="flex flex-wrap gap-2">
              {["x^2", "sin(x)", "2^x", "1/x", "abs(x)"].map(preset => (
                <button
                  key={preset}
                  onClick={() => setEquation(preset)}
                  className="px-4 py-2 rounded-full border border-border bg-card text-sm font-bold hover:bg-secondary transition-all"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Visualization Panel */}
          <div className="flex-1 w-full max-w-4xl">
            <MathGraph points={points} color="#6366f1" equation={`y = ${equation}`} />
          </div>
        </div>
      </div>
    </div>
  );
}
