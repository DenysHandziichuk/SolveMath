"use client";

import { useState, useEffect, useMemo } from "react";
import { MathGraph } from "@/components/MathGraph";
import { motion, AnimatePresence } from "framer-motion";
import { compile } from "mathjs";
import { Compass, Info, Plus, X, ToggleLeft, ToggleRight } from "lucide-react";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6"];

const MHF4U_PRESETS = [
  { label: "Rational Function", eq: "(2*x - 4)/(x + 1)" },
  { label: "Sinusoidal Wave", eq: "3*cos(2*(x - pi/4)) + 1" },
  { label: "Cubic Polynomial", eq: "-x^3 + 3*x^2 + 1" },
  { label: "Base 2 Logarithm", eq: "log(max(0.001, x))/log(2)" },
  { label: "Unit Circle", eq: "cos(t), sin(t)" },
];

export default function CalculatorPage() {
  const [equations, setEquations] = useState<string[]>(["(2*x - 4)/(x + 1)", "2"]);
  const [errors, setErrors] = useState<(string | null)[]>([]);
  const [isRadian, setIsRadian] = useState<boolean>(false);

  // Generate functions when equations change
  const graphFunctions = useMemo(() => {
    const newFunctions: { points: { x: number; y: number }[]; color: string; equation: string }[] = [];
    const newErrors: (string | null)[] = [...equations.map(() => null)];

    const minX = isRadian ? 0 : -10;
    const maxX = isRadian ? 2 * Math.PI : 10;
    const step = isRadian ? (2 * Math.PI) / 200 : 0.1;

    equations.forEach((eq, index) => {
      if (!eq.trim()) return;

      const points = [];
      try {
        if (eq.includes(",")) {
          // Parametric mode: "x(t), y(t)"
          const [xEq, yEq] = eq.split(",").map((s) => s.trim());
          const cx = compile(xEq);
          const cy = compile(yEq);
          for (let t = 0; t <= 2 * Math.PI + 0.05; t += 0.05) {
            try {
              const x = cx.evaluate({ t, x: t, pi: Math.PI });
              const y = cy.evaluate({ t, x: t, pi: Math.PI });
              if (typeof x === "number" && typeof y === "number" && isFinite(x) && isFinite(y)) {
                points.push({ x, y });
              }
            } catch {}
          }
        } else {
          // Standard y = f(x)
          const cy = compile(eq);
          for (let x = minX; x <= maxX; x += step) {
            try {
              const y = cy.evaluate({ x, pi: Math.PI, e: Math.E });
              if (typeof y === "number" && isFinite(y) && !isNaN(y)) {
                points.push({ x, y });
              }
            } catch {}
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
  }, [equations, isRadian]);

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
    <div className="min-h-screen bg-[#070b12] text-slate-100 pt-32 pb-24 px-4 sm:px-6">
      <div className="mx-auto max-w-6xl flex flex-col items-center">
        {/* Animated Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center mb-10 space-y-2.5"
        >
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-semibold uppercase tracking-wider mb-2 backdrop-blur-md">
            <Compass className="h-3.5 w-3.5" />
            <span>Coordinate Graphing Lab</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white">
            Interactive Graphing Lab
          </h1>
          <p className="text-sm sm:text-base text-slate-400 max-w-xl mx-auto font-normal">
            Plot rational functions, asymptotes, sinusoidal waves, and parametric curves.
          </p>
        </motion.div>

        <div className="w-full flex flex-col lg:flex-row gap-8 items-start justify-center">
          {/* Input Panel */}
          <div className="w-full lg:w-[420px] flex flex-col gap-5">
            <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-xl space-y-5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Functions</label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsRadian(!isRadian)}
                    className="flex items-center gap-1 text-xs font-semibold text-slate-300 hover:text-white"
                  >
                    {isRadian ? <ToggleRight className="h-5 w-5 text-blue-400" /> : <ToggleLeft className="h-5 w-5 text-slate-500" />}
                    <span>Radian (π)</span>
                  </button>

                  {equations.length < 5 && (
                    <button
                      onClick={addEquation}
                      className="text-xs font-bold text-blue-400 hover:underline flex items-center gap-1"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <AnimatePresence>
                  {equations.map((eq, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-1.5"
                    >
                      <div className="relative flex items-center gap-2">
                        <div
                          className="absolute left-3.5 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full shadow-md z-10"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <input
                          type="text"
                          value={eq}
                          onChange={(e) => updateEquation(index, e.target.value)}
                          placeholder="e.g. (2*x - 4)/(x + 1)"
                          className="w-full h-12 bg-slate-950/80 border border-slate-800 rounded-xl pl-9 pr-9 text-sm font-semibold font-mono text-slate-100 focus:outline-none focus:border-blue-500 transition-all"
                        />
                        {equations.length > 1 && (
                          <button
                            onClick={() => removeEquation(index)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-rose-400 transition-colors"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                      {errors[index] && <p className="text-[11px] text-rose-400 font-medium ml-2">{errors[index]}</p>}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              <div className="text-[11px] text-zinc-500 leading-relaxed border-t border-zinc-800/60 pt-3">
                <span className="font-mono text-zinc-400">1/(x - 2)</span> •{" "}
                <span className="font-mono text-zinc-400">sin(x)</span> •{" "}
                <span className="font-mono text-zinc-400">cos(t), sin(t)</span>
              </div>
            </div>

            {/* Presets */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-mono text-zinc-500">
                Presets
              </span>
              <div className="flex flex-wrap gap-1.5">
                {MHF4U_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => {
                      if (preset.label.includes("Sinusoidal")) setIsRadian(true);
                      setEquations([preset.eq]);
                    }}
                    className="px-2.5 py-1 rounded-md border border-zinc-800 bg-zinc-950/60 text-xs text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 transition-colors"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Visualization Panel */}
          <div className="flex-1 w-full max-w-3xl flex justify-center">
            <MathGraph
              functions={graphFunctions.functions}
              isRadian={isRadian}
              bounds={isRadian ? { minX: 0, maxX: 2 * Math.PI, minY: -4, maxY: 4 } : undefined}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

