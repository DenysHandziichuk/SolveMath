"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Mic, LineChart, ChevronLeft, ChevronRight, RotateCcw, Copy, Check, Presentation, Sparkles } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { MathRenderer } from "./MathRenderer";
import { MathGraph } from "./MathGraph";
import { ScreenRecorder } from "./ScreenRecorder";
import { cn } from "@/lib/utils";

interface Slide {
  title: string;
  content: string;
  notes: string;
}

interface Solution {
  explanation: string;
  slides: Slide[];
  graphData?: {
    type: string;
    equation: string;
    points: { x: number; y: number }[];
  };
}

interface SolutionDisplayProps {
  solution: Solution;
  onReset: () => void;
}

const THEMES = {
  studio: {
    name: "Studio",
    bg: "bg-zinc-900",
    slideBg: "bg-zinc-900",
    text: "text-white",
    subtext: "text-zinc-300",
    accent: "#6366f1",
    glow: "from-indigo-500/10 via-transparent to-indigo-500/10",
  },
  whiteboard: {
    name: "Whiteboard",
    bg: "bg-zinc-100",
    slideBg: "bg-white",
    text: "text-zinc-900",
    subtext: "text-zinc-600",
    accent: "#2563eb",
    glow: "from-blue-500/5 via-transparent to-blue-500/5",
  },
  blueprint: {
    name: "Blueprint",
    bg: "bg-blue-900",
    slideBg: "bg-blue-950",
    text: "text-blue-50",
    subtext: "text-blue-300/80",
    accent: "#38bdf8",
    glow: "from-sky-400/20 via-transparent to-sky-400/20",
  },
  chalkboard: {
    name: "Chalkboard",
    bg: "bg-emerald-950",
    slideBg: "bg-emerald-900",
    text: "text-zinc-50",
    subtext: "text-zinc-200/70",
    accent: "#fde047",
    glow: "from-white/5 via-transparent to-white/5",
  },
  midnight: {
    name: "Midnight",
    bg: "bg-slate-950",
    slideBg: "bg-black",
    text: "text-purple-50",
    subtext: "text-purple-300/70",
    accent: "#a855f7",
    glow: "from-purple-500/20 via-transparent to-purple-500/20",
  },
  sunset: {
    name: "Sunset",
    bg: "bg-orange-950",
    slideBg: "bg-[#1a0f0a]",
    text: "text-orange-50",
    subtext: "text-orange-200/70",
    accent: "#f97316",
    glow: "from-orange-500/15 via-transparent to-orange-500/15",
  },
  matrix: {
    name: "Matrix",
    bg: "bg-black",
    slideBg: "bg-black",
    text: "text-green-500",
    subtext: "text-green-700",
    accent: "#22c55e",
    glow: "from-green-500/10 via-transparent to-green-500/10",
  },
  paper: {
    name: "Paper",
    bg: "bg-[#f4ead5]",
    slideBg: "bg-[#fdf6e3]",
    text: "text-[#586e75]",
    subtext: "text-[#93a1a1]",
    accent: "#cb4b16",
    glow: "from-orange-900/5 via-transparent to-orange-900/5",
  }
};

type ThemeKey = keyof typeof THEMES;

export function SolutionDisplay({ solution, onReset }: SolutionDisplayProps) {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(400); 
  const [isResizing, setIsResizing] = useState(false);
  const [theme, setTheme] = useState<ThemeKey>("studio");

  const activeTheme = THEMES[theme];

  const currentSlide = solution.slides[currentSlideIndex];
  const isGraphSlide = currentSlide.title.toLowerCase().includes("graph") || currentSlideIndex === 4;

  const startResizing = useCallback((e: React.MouseEvent) => {
    setIsResizing(true);
    e.preventDefault();
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback((e: MouseEvent) => {
    if (isResizing) {
      const newWidth = window.innerWidth - e.clientX;
      const minWidth = 400;
      const maxWidth = window.innerWidth * 0.9;
      if (newWidth >= minWidth && newWidth <= maxWidth) {
        setSidebarWidth(newWidth);
      }
    }
  }, [isResizing]);

  useEffect(() => {
    if (isResizing) {
      window.addEventListener("mousemove", resize);
      window.addEventListener("mouseup", stopResizing);
    } else {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    }
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [isResizing, resize, stopResizing]);

  const nextSlide = () => {
    if (currentSlideIndex < solution.slides.length - 1) {
      setCurrentSlideIndex(currentSlideIndex + 1);
    }
  };

  const prevSlide = () => {
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex(currentSlideIndex - 1);
    }
  };

  const copyNote = () => {
    navigator.clipboard.writeText(currentSlide.notes);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn("fixed inset-0 z-50 flex h-[100dvh] w-screen overflow-hidden animate-in fade-in duration-500", activeTheme.bg)}>
      {/* LEFT PANEL: The Presentation */}
      <div 
        id="presentation-area"
        className={cn("relative hidden lg:flex flex-col items-center justify-center transition-colors duration-500", activeTheme.slideBg)}
        style={{ flex: 1 }}
      >
        <div className={cn("absolute inset-0 bg-gradient-to-br pointer-events-none transition-opacity duration-500", activeTheme.glow)} />
        
        <div className="relative z-10 w-full max-w-5xl px-12 flex flex-col items-center text-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${theme}-${currentSlideIndex}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4 }}
              className="w-full"
            >
              <h1 className={cn("mb-12 text-6xl md:text-7xl font-black tracking-tight drop-shadow-2xl transition-colors duration-500", activeTheme.text)}>
                {currentSlide.title}
              </h1>
              {/* Slide Content */}
              <div className={cn(
                "text-2xl md:text-3xl lg:text-4xl font-bold leading-tight transition-colors duration-500",
                activeTheme.subtext,
                isGraphSlide && solution.graphData?.points && "lg:text-xl mb-6"
              )}>
                <MathRenderer text={currentSlide.content} />
              </div>
{/* The Animated Graph */}
{isGraphSlide && solution.graphData && solution.graphData.points && (
   <div className="mt-4 flex justify-center w-full max-w-2xl mx-auto">
    <MathGraph 
      points={solution.graphData.points} 
      color={activeTheme.accent} 
      equation={solution.graphData.equation}
    />
   </div>
)}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="absolute bottom-10 right-12 flex items-center gap-3 text-zinc-500 font-mono text-sm tracking-widest">
          <span style={{ color: activeTheme.accent }} className="font-bold transition-colors duration-500">
            {String(currentSlideIndex + 1).padStart(2, '0')}
          </span>
          <div className="h-4 w-[1px] bg-white/10" />
          <span>{String(solution.slides.length).padStart(2, '0')}</span>
        </div>
      </div>

      <div
        onMouseDown={startResizing}
        className={cn(
          "hidden lg:block w-1.5 h-full cursor-col-resize hover:bg-primary transition-colors z-30 bg-border/20",
          isResizing && "bg-primary w-2"
        )}
      />

      {/* RIGHT PANEL: Speaker Dashboard */}
      <div 
        className="flex flex-col border-l border-border bg-card shadow-2xl z-20 w-full lg:w-auto"
        style={{ 
          width: typeof window !== 'undefined' && window.innerWidth >= 1024 ? `${sidebarWidth}px` : '100%',
          minWidth: typeof window !== 'undefined' && window.innerWidth >= 1024 ? '400px' : 'auto'
        }}
      >
        <div className="p-4 lg:p-8 border-b border-border flex items-center justify-between bg-secondary/20 pt-[env(safe-area-inset-top,1rem)]">
          <div className="flex items-center gap-3">
            <div className="p-2 lg:p-2.5 rounded-xl bg-primary shadow-lg text-white">
              <Presentation className="h-4 w-4 lg:h-5 lg:h-5" />
            </div>
            <div>
              <h2 className="text-sm lg:text-lg font-bold tracking-tight text-foreground">Speaker View</h2>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <ScreenRecorder />
            <div className="h-6 w-[1px] bg-border mx-1 lg:mx-2" />
            <button
              onClick={onReset}
              className="p-2 lg:p-2.5 rounded-full hover:bg-secondary text-muted-foreground transition-all active:scale-95 flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 lg:bg-transparent"
            >
              <RotateCcw className="h-4 w-4 lg:h-5 lg:h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 lg:p-10 space-y-8 custom-scrollbar">
          {/* Theme Selector */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-zinc-500">
              <Sparkles className="h-4 w-4" />
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">Themes</h3>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(THEMES) as ThemeKey[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-2xl border transition-all hover:scale-[1.02] active:scale-95",
                    theme === t ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border bg-secondary/30"
                  )}
                >
                  <div className={cn("h-6 w-6 rounded-full border border-white/10 shadow-sm", THEMES[t].slideBg)} />
                  <span className="text-xs font-bold">{THEMES[t].name}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-primary">
                <Mic className="h-4 w-4 lg:h-5 lg:h-5" />
                <h3 className="text-[10px] lg:text-xs font-black uppercase tracking-[0.2em]">Script</h3>
              </div>
              <button onClick={copyNote} className="p-2 rounded-lg text-muted-foreground hover:text-primary transition-all">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
            
            <AnimatePresence mode="wait">
              <motion.div
                key={`${theme}-${currentSlideIndex}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-base lg:text-xl leading-relaxed text-foreground/80 italic font-medium bg-secondary/30 p-6 lg:p-8 rounded-[1.5rem] lg:rounded-[2rem] border border-border/50"
              >
                <MathRenderer text={currentSlide.notes} className="gap-3" />
              </motion.div>
            </AnimatePresence>
          </section>

          {solution.graphData && solution.graphData.equation && (
            <section className="space-y-4">
              <div className="flex items-center gap-2.5 text-zinc-500">
                <LineChart className="h-4 w-4 lg:h-5 lg:h-5" />
                <h3 className="text-[10px] lg:text-xs font-black uppercase tracking-[0.2em]">Graph Logic</h3>
              </div>
              <div className="p-4 lg:p-6 rounded-[1.5rem] lg:rounded-[2rem] bg-zinc-950 text-white border border-white/5">
                <p className="text-[10px] font-bold text-zinc-500 uppercase mb-2">{solution.graphData.type}</p>
                <div className="text-xl lg:text-2xl font-black tracking-tighter text-center py-2">
                  <MathRenderer text={solution.graphData.equation} />
                </div>
              </div>
            </section>
          )}
        </div>

        <div className="p-6 lg:p-8 border-t border-border bg-secondary/10 flex flex-col gap-4 lg:gap-6 pb-[env(safe-area-inset-bottom,1.5rem)]">
          <div className="flex items-center justify-between gap-3 lg:gap-4">
            <button
              onClick={prevSlide}
              disabled={currentSlideIndex === 0}
              className="flex-1 flex items-center justify-center gap-2 py-4 lg:py-5 rounded-[1.25rem] lg:rounded-[1.5rem] bg-card border border-border font-bold transition-all hover:bg-secondary disabled:opacity-20 active:scale-95 text-sm lg:text-base"
            >
              <ChevronLeft className="h-5 w-5 lg:h-6 lg:h-6" />
              <span>Back</span>
            </button>
            <button
              onClick={nextSlide}
              disabled={currentSlideIndex === solution.slides.length - 1}
              className="flex-1 flex items-center justify-center gap-2 py-4 lg:py-5 rounded-[1.25rem] lg:rounded-[1.5rem] bg-primary text-white font-bold shadow-xl shadow-primary/20 transition-all hover:brightness-110 disabled:opacity-20 active:scale-95 text-sm lg:text-base"
            >
              <span>Next</span>
              <ChevronRight className="h-5 w-5 lg:h-6 lg:h-6" />
            </button>
          </div>
          
          <div className="flex gap-1.5 lg:gap-2">
            {solution.slides.map((_, idx) => (
              <div key={idx} className={cn("h-1.5 lg:h-2 flex-1 rounded-full transition-all duration-500", idx === currentSlideIndex ? "bg-primary" : "bg-border")} />
            ))}
          </div>
        </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); }
      `}</style>
    </div>
  );
}
