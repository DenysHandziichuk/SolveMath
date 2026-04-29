"use client";

import { useState, useEffect, useMemo } from "react";
import { MathGraph } from "@/components/MathGraph";
import { motion, AnimatePresence } from "framer-motion";
import { compile } from "mathjs";
import { Calculator, Info, Plus, X } from "lucide-react";

const COLORS = ["#6366f1", "#ec4899", "#10b981", "#f59e0b", "#8b5cf6"];

export default function CalculatorPage() {
  const [equations, setEquations] = useState<string[]>(["x^2", "sin(x)"]);
  const [errors, setErrors] = useState<(string | null)[]>([]);

  // Generate functions when equations change
  const graphFunctions = useMemo(() => {
    const newFunctions: { points: {x: number, y: number}[], color: string, equation: string }[] = [];
    const newErrors: (string | null)[] = [...equations.map(() => null)];

    equations.forEach((eq, index) => {
      if (!eq.trim()) return;

      const points = [];
      try {
        // Parametric mode: "x(t), y(t)" (e.g., "cos(t), sin(t)" for a circle)
        if (eq.includes(",")) {
          const [xEq, yEq] = eq.split(",").map(s => s.trim());
          const cx = compile(xEq);
          const cy = compile(yEq);
          for (let t = 0; t <= 2 * Math.PI + 0.1; t += 0.1) {
            try {
              const x = cx.evaluate({ t, x: t }); // pass t (and x=t fallback)
              const y = cy.evaluate({ t, x: t });
              if (typeof x === 'number' && typeof y === 'number' && isFinite(x) && isFinite(y)) {
                points.push({ x, y });
              }
            } catch {
              // skip invalid point
            }
          }
        } else {
          // Standard y = f(x) mode
          const cy = compile(eq);
          for (let x = -10; x <= 10; x += 0.2) {
            try {
              const y = cy.evaluate({ x });
              if (typeof y === 'number' && isFinite(y)) {
                points.push({ x, y });
              }
            } catch {
              // skip invalid point
            }
          }
        }

        if (points.length === 0) {
          throw new Error("Invalid equation results");
        }
        
        newFunctions.push({ points, color: COLORS[index % COLORS.length], equation: eq });
      } catch {
        newErrors[index] = "Invalid mathematical expression";
      }
    });

    return { functions: newFunctions, errors: newErrors };
  }, [equations]);

  useEffect(() => {
    setErrors(graphFunctions.errors);
  }, [graphFunctions.errors]);

  const updateEquation = (index: number, val: string) => {
    const newEqs = [...equations];
    newEqs[index] = val;
    setEquations(newEqs);
  };

  const removeEquation = (index: number) => {
    setEquations(equations.filter((_, i) => i !== index));
  };

  const addEquation = () => {
    if (equations.length < 5) {
      setEquations([...equations, ""]);
    }
  };

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
            Compare multiple functions or plot parametric shapes instantly on our high-precision grid.
          </p>
        </div>

        <div className="w-full flex flex-col lg:flex-row gap-12 items-start justify-center">
          {/* Input Panel */}
          <div className="w-full lg:w-[450px] flex flex-col gap-6">
            <div className="p-6 lg:p-8 rounded-[2.5rem] bg-card border border-border shadow-2xl space-y-6">
              <div className="flex items-center justify-between">
                 <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-2">Equations</label>
                 {equations.length < 5 && (
                   <button onClick={addEquation} className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
                     <Plus className="h-3 w-3" /> Add
                   </button>
                 )}
              </div>

              <div className="space-y-4">
                <AnimatePresence>
                  {equations.map((eq, index) => (
                    <motion.div 
                      key={index}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-2"
                    >
                      <div className="relative flex items-center gap-2">
                        <div 
                          className="absolute left-4 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full shadow-md z-10" 
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <input
                          type="text"
                          value={eq}
                          onChange={(e) => updateEquation(index, e.target.value)}
                          placeholder={index === 0 ? "x^2" : "sin(x)"}
                          className="w-full h-14 bg-secondary/50 border border-border rounded-2xl pl-10 pr-10 text-lg font-bold font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                        />
                        {equations.length > 1 && (
                          <button 
                            onClick={() => removeEquation(index)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-red-500 transition-colors"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                      {errors[index] && (
                        <p className="text-xs text-red-500 font-bold ml-4">{errors[index]}</p>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              <div className="flex items-start gap-3 p-4 rounded-xl bg-primary/5 text-primary border border-primary/10">
                <Info className="h-5 w-5 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-bold">Pro-Tips</p>
                  <p className="opacity-80">
                    • Add multiple functions to compare them.<br/>
                    • Use parametric coords for shapes like circles: <code className="font-mono bg-primary/10 px-1 rounded text-xs">3*cos(t), 3*sin(t)</code>
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Presets */}
            <div className="flex flex-wrap gap-2">
              {["x^2", "sin(x)", "2^x", "4*cos(t), 4*sin(t)"].map(preset => (
                <button
                  key={preset}
                  onClick={() => {
                    if (equations.includes(preset)) return;
                    const emptyIdx = equations.findIndex(e => !e.trim());
                    if (emptyIdx !== -1) {
                      updateEquation(emptyIdx, preset);
                    } else if (equations.length < 5) {
                      setEquations([...equations, preset]);
                    }
                  }}
                  className="px-4 py-2 rounded-full border border-border bg-card text-sm font-bold hover:bg-secondary transition-all"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Visualization Panel */}
          <div className="flex-1 w-full max-w-4xl">
            <MathGraph functions={graphFunctions.functions} />
          </div>
        </div>
      </div>
    </div>
  );
}
