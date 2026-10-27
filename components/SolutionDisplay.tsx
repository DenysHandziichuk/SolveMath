"use client";

import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Copy,
  Check,
  Presentation,
  Maximize2,
  Minimize2,
  Clock,
  Palette,
  Volume2,
  VolumeX,
  Type,
  Pencil,
} from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";
import { MathRenderer } from "./MathRenderer";
import { MathGraph } from "./MathGraph";
import { ScreenRecorder } from "./ScreenRecorder";
import { cn } from "@/lib/utils";
import { SlideDrawing } from "./SlideDrawing";
import { DrawingTools } from "./DrawingTools";
import { SlideEditor } from "./SlideEditor";
import { SlideStage } from "./SlideStage";
import type { DrawingStroke, DrawingTool } from "@/lib/slide-drawing";

interface GraphFunction {
  points?: { x: number; y: number }[];
  mathjs?: string;
  color?: string;
  equation?: string;
}

export interface GraphData {
  title?: string;
  type?: string;
  equation?: string;
  isRadian?: boolean;
  points?: { x: number; y: number }[];
  functions?: GraphFunction[];
  asymptotes?: { type: "vertical" | "horizontal" | "oblique"; value: number | string; label?: string }[];
  symmetryAxis?: number;
  holes?: { x: number; y: number }[];
  properties?: { name: string; value: string }[];
  bounds?: { minX: number; maxX: number; minY: number; maxY: number };
}

export interface Slide {
  title: string;
  subtitle?: string;
  content: string;
  notes: string;
  type?: string;
  graphData?: GraphData;
  graphs?: GraphData[];
  drawings?: DrawingStroke[];
}

export interface Solution {
  explanation: string;
  slides: Slide[];
  graphData?: GraphData;
  graphs?: GraphData[];
}

export interface SolutionDisplayProps {
  solution: Solution;
  onReset: () => void;
  onSolutionChange: (solution: Solution) => void;
}

const THEMES = {
  slate: {
    name: "Studio",
    bg: "bg-[#edf0eb]",
    slideBg: "bg-[#1c2926]",
    slideBorder: "border-[#30413b]",
    text: "text-[#f0f3ed]",
    subtext: "text-[#c3cdc6]",
    accent: "#add0b6",
  },
  chalkboard: {
    name: "Chalkboard",
    bg: "bg-[#021f18]",
    slideBg: "bg-[#03261e]",
    slideBorder: "border-emerald-900/60",
    text: "text-[#fef3c7]",
    subtext: "text-[#fde68a]/90",
    accent: "#f59e0b",
  },
  whiteboard: {
    name: "Whiteboard",
    bg: "bg-[#f1f5f9]",
    slideBg: "bg-[#ffffff]",
    slideBorder: "border-slate-200",
    text: "text-slate-900",
    subtext: "text-slate-700",
    accent: "#2563eb",
  },
  navy: {
    name: "Cambridge Navy",
    bg: "bg-[#050b14]",
    slideBg: "bg-[#081220]",
    slideBorder: "border-blue-900/40",
    text: "text-blue-50",
    subtext: "text-blue-200/90",
    accent: "#38bdf8",
  },
  paper: {
    name: "Academic Paper",
    bg: "bg-[#ece9df]",
    slideBg: "bg-[#f7f5ed]",
    slideBorder: "border-[#dfdcce]",
    text: "text-[#1c1917]",
    subtext: "text-[#44403c]",
    accent: "#b91c1c",
  },
};

type ThemeKey = keyof typeof THEMES;

export type TextScale = "compact" | "standard" | "large" | "xlarge";

export const TEXT_SCALE_OPTIONS: { id: TextScale; label: string; name: string }[] = [
  { id: "compact", label: "A-", name: "Compact" },
  { id: "standard", label: "A", name: "Standard" },
  { id: "large", label: "A+", name: "Large (+25%)" },
  { id: "xlarge", label: "A++", name: "Extra Large (+50%)" },
];

function getTitleClass(scale: TextScale) {
  return { compact: "text-[60px]", standard: "text-[72px]", large: "text-[90px]", xlarge: "text-[108px]" }[scale];
}

function getIntroContentClass(scale: TextScale, content?: string) {
  const len = content?.length || 0;
  if (len < 140) return { compact: "text-[44px]", standard: "text-[54px]", large: "text-[68px]", xlarge: "text-[80px]" }[scale];
  if (len < 320) return { compact: "text-[36px]", standard: "text-[44px]", large: "text-[54px]", xlarge: "text-[66px]" }[scale];
  return { compact: "text-[28px]", standard: "text-[34px]", large: "text-[42px]", xlarge: "text-[50px]" }[scale];
}

function getSolutionContentClass(scale: TextScale, content?: string) {
  const len = content?.length || 0;
  if (len < 250) return { compact: "text-[36px]", standard: "text-[44px]", large: "text-[54px]", xlarge: "text-[66px]" }[scale];
  if (len < 650) return { compact: "text-[28px]", standard: "text-[36px]", large: "text-[44px]", xlarge: "text-[54px]" }[scale];
  return { compact: "text-[24px]", standard: "text-[30px]", large: "text-[36px]", xlarge: "text-[44px]" }[scale];
}

function getSplitSingleContentClass(scale: TextScale) {
  return { compact: "text-[26px]", standard: "text-[34px]", large: "text-[42px]", xlarge: "text-[50px]" }[scale];
}

function getSplitDualContentClass(scale: TextScale) {
  return { compact: "text-[22px]", standard: "text-[28px]", large: "text-[34px]", xlarge: "text-[42px]" }[scale];
}

export function SolutionDisplay({ solution, onReset, onSolutionChange }: SolutionDisplayProps) {
  const reduceMotion = useReducedMotion();
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(420);
  const [isResizing, setIsResizing] = useState(false);
  const [theme, setTheme] = useState<ThemeKey>("slate");
  const [textScale, setTextScale] = useState<TextScale>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("solvemath_text_scale") as TextScale;
        if (saved && ["compact", "standard", "large", "xlarge"].includes(saved)) {
          return saved;
        }
      } catch {}
    }
    return "standard";
  });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingTool, setDrawingTool] = useState<DrawingTool>("pen");
  const [inkColor, setInkColor] = useState("#3b82f6");
  const [brushWidth, setBrushWidth] = useState(6);
  const [showFullscreenTools, setShowFullscreenTools] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [graphComparisonView, setGraphComparisonView] = useState<"dual" | "a" | "b">("dual");

  const selectSlide = useCallback((index: number) => {
    setCurrentSlideIndex(index);
    setGraphComparisonView("dual");
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
  }, []);

  const textScaleIndex = Math.max(0, TEXT_SCALE_OPTIONS.findIndex((opt) => opt.id === textScale));

  const adjustTextScale = useCallback((direction: -1 | 1) => {
    setTextScale((prev) => {
      const idx = TEXT_SCALE_OPTIONS.findIndex((opt) => opt.id === prev);
      const cur = idx === -1 ? 1 : idx;
      const nextIdx = Math.max(0, Math.min(TEXT_SCALE_OPTIONS.length - 1, cur + direction));
      const nextScale = TEXT_SCALE_OPTIONS[nextIdx].id;
      try {
        localStorage.setItem("solvemath_text_scale", nextScale);
      } catch {}
      return nextScale;
    });
  }, []);

  const setTextScaleDirectly = useCallback((scale: TextScale) => {
    setTextScale(scale);
    try {
      localStorage.setItem("solvemath_text_scale", scale);
    } catch {}
  }, []);

  const presentationAreaRef = useRef<HTMLDivElement>(null);

  const activeTheme = THEMES[theme];
  const defaultSlide: Slide = {
    title: "Problem Statement",
    subtitle: "Overview",
    content: solution.explanation || "Problem Analysis and Resolution",
    notes: "Review the problem formulation and derived results.",
    type: "intro",
  };
  const currentSlide =
    (solution.slides && solution.slides[currentSlideIndex]) ||
    solution.slides?.[0] ||
    defaultSlide;

  const updateSlide = useCallback((slide: Slide) => {
    const slides = solution.slides.length ? solution.slides.map((existing, index) => index === currentSlideIndex ? slide : existing) : [slide];
    onSolutionChange({ ...solution, slides });
  }, [solution, currentSlideIndex, onSolutionChange]);

  const addStroke = (stroke: DrawingStroke) => {
    updateSlide({ ...currentSlide, drawings: [...(currentSlide.drawings || []), stroke] });
  };

  const undoDrawing = useCallback(() => {
    if (!currentSlide.drawings?.length) return;
    updateSlide({ ...currentSlide, drawings: currentSlide.drawings.slice(0, -1) });
  }, [currentSlide, updateSlide]);

  // Determine active graphs: prioritize slide-level graphs, then solution-level graphs
  const slideGraphs: GraphData[] =
    currentSlide.graphs ||
    (currentSlide.graphData ? [currentSlide.graphData] : []);

  const solutionGraphs: GraphData[] =
    solution.graphs ||
    (solution.graphData ? [solution.graphData] : []);

  // Slide types that are explicitly non-graph slides
  const isExplicitNonGraphSlide =
    currentSlide.type === "intro" ||
    currentSlide.type === "solution" ||
    currentSlide.type === "concept" ||
    currentSlide.type === "derivation" ||
    currentSlide.type === "summary" ||
    currentSlide.type === "conclusion" ||
    currentSlideIndex === 0;

  // A slide is a graph slide if it has its own graphs, or is marked as graph/evidence
  const isGraphSlideType =
    currentSlide.type === "graph" ||
    currentSlide.type === "evidence" ||
    currentSlide.type === "comparison" ||
    Boolean(currentSlide.title && /evidence|graph|visual|plot|coordinate/i.test(currentSlide.title));

  const isGraphSlide =
    Boolean(slideGraphs.length) ||
    (!isExplicitNonGraphSlide && isGraphSlideType && Boolean(solutionGraphs.length));

  const activeGraphs = slideGraphs.length > 0 ? slideGraphs : (isGraphSlide ? solutionGraphs : []);
  const isMultiGraph = activeGraphs.length >= 2;
  // Presentation Timer
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning]);

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      presentationAreaRef.current?.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  }, []);

  // Keyboard navigation (Arrow keys, Spacebar, F for fullscreen)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && e.target.closest("input, textarea, select, [contenteditable='true']")) return;
      if (isEditing) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        undoDrawing();
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.target instanceof HTMLElement && e.target.closest("button, a")) return;

      if (e.key === "ArrowRight" || e.key === "PageDown" || e.key === " ") {
        e.preventDefault();
        selectSlide(Math.min(solution.slides.length - 1, currentSlideIndex + 1));
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        selectSlide(Math.max(0, currentSlideIndex - 1));
      } else if (e.key.toLowerCase() === "f") {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === "Escape" && isFullscreen) {
        setIsFullscreen(false);
      } else if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        adjustTextScale(1);
      } else if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        adjustTextScale(-1);
      } else if (e.key === "0") {
        e.preventDefault();
        setTextScaleDirectly("standard");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [solution.slides.length, currentSlideIndex, selectSlide, isFullscreen, toggleFullscreen, adjustTextScale, setTextScaleDirectly, undoDrawing, isEditing]);

  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);


  // Resizable sidebar handlers
  const startResizing = useCallback((e: React.MouseEvent) => {
    setIsResizing(true);
    e.preventDefault();
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback(
    (e: MouseEvent) => {
      if (isResizing) {
        const newWidth = window.innerWidth - e.clientX;
        const minWidth = 380;
        const maxWidth = window.innerWidth * 0.85;
        if (newWidth >= minWidth && newWidth <= maxWidth) {
          setSidebarWidth(newWidth);
        }
      }
    },
    [isResizing]
  );

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
      selectSlide(currentSlideIndex + 1);
    }
  };

  const prevSlide = () => {
    if (currentSlideIndex > 0) {
      selectSlide(currentSlideIndex - 1);
    }
  };

  const toggleSpeak = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else {
      window.speechSynthesis.cancel();
      const textToSpeak = currentSlide?.notes || "";
      if (!textToSpeak) return;
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      utterance.rate = 1.0;
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      setIsSpeaking(true);
      window.speechSynthesis.speak(utterance);
    }
  };

  useEffect(() => {
    return () => window.speechSynthesis?.cancel();
  }, []);

  const copyNote = () => {
    if (!currentSlide) return;
    navigator.clipboard.writeText(currentSlide.notes);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="presentation-workspace fixed inset-0 z-50 flex h-[100dvh] w-full flex-col overflow-hidden lg:flex-row">
      {/* ========================================================================= */}
      {/* LEFT PANEL: The 16:9 Presentation Stage (Strict 1920x1080 Aspect Ratio) */}
      {/* ========================================================================= */}
      <div
        ref={presentationAreaRef}
        id="presentation-area"
        className="presentation-area relative flex min-h-0 min-w-0 flex-1 items-center justify-center overflow-hidden select-none"
      >
        <div className="presentation-topbar"><Link href="/" className="landing-wordmark">SolveMath<span>.</span></Link><span>Lesson workspace</span><button type="button" onClick={toggleFullscreen} disabled={isEditing} className="studio-secondary-button"><Maximize2 size={14} aria-hidden="true" />Present</button></div>
        {/* PRESENTATION STAGE: Hard-locked to 16:9 aspect-video */}
        <SlideStage
          className={cn(
            "relative aspect-video w-full rounded-lg border overflow-hidden",
            activeTheme.slideBg,
            activeTheme.slideBorder
          )}
        >
          {/* Slide Header */}
          <div className="relative z-20 flex items-center justify-between gap-2 pb-3 border-b border-white/10 shrink-0">
            <div className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-zinc-400 truncate max-w-[60%]">
              {currentSlide.subtitle ? (
                <MathRenderer text={currentSlide.subtitle} inline />
              ) : (
                <span>Slide {currentSlideIndex + 1}</span>
              )}
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              {/* Quick Text Size Adjuster on the slide */}
              <div className="flex items-center border border-white/10 rounded-lg bg-black/30 backdrop-blur-sm p-0.5 text-xs text-zinc-300">
                <button
                  onClick={() => adjustTextScale(-1)}
                  title="Smaller text (- / _)"
                  disabled={textScaleIndex === 0}
                  className="px-2 py-0.5 rounded hover:bg-white/10 hover:text-white disabled:opacity-25 transition-all font-bold"
                >
                  A-
                </button>
                <span className="px-2 py-0.5 text-[11px] font-mono font-semibold text-zinc-300 border-x border-white/10 min-w-[32px] text-center">
                  {TEXT_SCALE_OPTIONS[textScaleIndex]?.label}
                </span>
                <button
                  onClick={() => adjustTextScale(1)}
                  title="Larger text (+ / =)"
                  disabled={textScaleIndex === TEXT_SCALE_OPTIONS.length - 1}
                  className="px-2 py-0.5 rounded hover:bg-white/10 hover:text-white disabled:opacity-25 transition-all font-bold"
                >
                  A+
                </button>
              </div>

              <span className="text-xs sm:text-sm font-mono text-zinc-400 font-medium">
                {String(currentSlideIndex + 1).padStart(2, "0")} / {String(solution.slides.length).padStart(2, "0")}
              </span>

              <button
                onClick={toggleFullscreen}
                title="Fullscreen (F)"
                aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                disabled={isEditing}
                className="p-1 rounded text-zinc-400 hover:text-white transition-colors"
              >
                {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Slide Body: Title + Content (+ Graph if applicable) */}
          <div className="flex-1 flex flex-col justify-start my-3 overflow-hidden min-h-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={`${theme}-${currentSlideIndex}`}
                initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? { opacity: 1 } : { opacity: 0, y: -6 }}
                transition={{ duration: reduceMotion ? 0 : 0.2 }}
                className="w-full flex flex-col flex-1 justify-start h-full overflow-hidden min-h-0"
              >
                <h1 className={cn(getTitleClass(textScale), "font-black tracking-tight mb-4 sm:mb-6 shrink-0", activeTheme.text)}>
                  <MathRenderer text={currentSlide.title} inline />
                </h1>

                {/* Split view when graph slide */}
                {isGraphSlide && activeGraphs.length > 0 ? (
                  isMultiGraph ? (
                    <div className="grid grid-cols-12 gap-4 items-stretch flex-1 min-h-0 overflow-hidden">
                      {/* Left: Mathematical Explanation */}
                      <div className={cn("col-span-4 font-normal leading-relaxed overflow-y-auto max-h-full pr-2 flex flex-col justify-between", getSplitDualContentClass(textScale), activeTheme.subtext)}>
                        <div className="space-y-3">
                          <MathRenderer text={currentSlide.content} />
                        </div>
                        {/* Comparison Switcher Controls */}
                        <div className="pt-2 mt-auto border-t border-white/10 flex items-center gap-1.5 shrink-0 select-none">
                          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mr-1">View:</span>
                          <button
                            onClick={() => setGraphComparisonView("dual")}
                            className={cn(
                              "px-2.5 py-1 rounded-lg text-xs font-semibold transition-all",
                              graphComparisonView === "dual"
                                ? "bg-blue-600 text-white shadow-md shadow-blue-600/30 ring-1 ring-blue-400"
                                : "bg-slate-800/80 text-slate-300 hover:bg-slate-700"
                            )}
                          >
                            Dual View
                          </button>
                          <button
                            onClick={() => setGraphComparisonView("a")}
                            className={cn(
                              "px-2.5 py-1 rounded-lg text-xs font-semibold transition-all",
                              graphComparisonView === "a"
                                ? "bg-blue-600 text-white shadow-md shadow-blue-600/30 ring-1 ring-blue-400"
                                : "bg-slate-800/80 text-slate-300 hover:bg-slate-700"
                            )}
                          >
                            {activeGraphs[0]?.title ? "Graph (a)" : "Graph A"}
                          </button>
                          <button
                            onClick={() => setGraphComparisonView("b")}
                            className={cn(
                              "px-2.5 py-1 rounded-lg text-xs font-semibold transition-all",
                              graphComparisonView === "b"
                                ? "bg-blue-600 text-white shadow-md shadow-blue-600/30 ring-1 ring-blue-400"
                                : "bg-slate-800/80 text-slate-300 hover:bg-slate-700"
                            )}
                          >
                            {activeGraphs[1]?.title ? "Graph (b)" : "Graph B"}
                          </button>
                        </div>
                      </div>

                      {/* Right: Graph Canvas Panel (Dual side-by-side or single focused) */}
                      <div className="col-span-8 flex items-center justify-center h-full max-h-full overflow-hidden">
                        {graphComparisonView === "dual" ? (
                          <div className="grid grid-cols-2 gap-3 w-full h-full items-center justify-center">
                            <MathGraph
                              title={activeGraphs[0].title || "Case (a)"}
                              functions={activeGraphs[0].functions}
                              points={activeGraphs[0].points}
                              properties={activeGraphs[0].properties}
                              bounds={activeGraphs[0].bounds}
                              asymptotes={activeGraphs[0].asymptotes}
                              symmetryAxis={activeGraphs[0].symmetryAxis}
                              holes={activeGraphs[0].holes}
                              isRadian={activeGraphs[0].isRadian}
                              color="#38bdf8"
                              equation={activeGraphs[0].equation}
                              compact={true}
                            />
                            <MathGraph
                              title={activeGraphs[1].title || "Case (b)"}
                              functions={activeGraphs[1].functions}
                              points={activeGraphs[1].points}
                              properties={activeGraphs[1].properties}
                              bounds={activeGraphs[1].bounds}
                              asymptotes={activeGraphs[1].asymptotes}
                              symmetryAxis={activeGraphs[1].symmetryAxis}
                              holes={activeGraphs[1].holes}
                              isRadian={activeGraphs[1].isRadian}
                              color="#10b981"
                              equation={activeGraphs[1].equation}
                              compact={true}
                            />
                          </div>
                        ) : graphComparisonView === "a" ? (
                          <div className="w-full h-full flex items-center justify-center">
                            <MathGraph
                              title={activeGraphs[0].title || "Case (a)"}
                              functions={activeGraphs[0].functions}
                              points={activeGraphs[0].points}
                              properties={activeGraphs[0].properties}
                              bounds={activeGraphs[0].bounds}
                              asymptotes={activeGraphs[0].asymptotes}
                              symmetryAxis={activeGraphs[0].symmetryAxis}
                              holes={activeGraphs[0].holes}
                              isRadian={activeGraphs[0].isRadian}
                              color="#38bdf8"
                              equation={activeGraphs[0].equation}
                            />
                          </div>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <MathGraph
                              title={activeGraphs[1].title || "Case (b)"}
                              functions={activeGraphs[1].functions}
                              points={activeGraphs[1].points}
                              properties={activeGraphs[1].properties}
                              bounds={activeGraphs[1].bounds}
                              asymptotes={activeGraphs[1].asymptotes}
                              symmetryAxis={activeGraphs[1].symmetryAxis}
                              holes={activeGraphs[1].holes}
                              isRadian={activeGraphs[1].isRadian}
                              color="#10b981"
                              equation={activeGraphs[1].equation}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-5 items-center flex-1 min-h-0 overflow-hidden">
                      <div className={cn("font-normal leading-relaxed overflow-y-auto max-h-full pr-2", getSplitSingleContentClass(textScale), activeTheme.subtext)}>
                        <MathRenderer text={currentSlide.content} />
                      </div>
                      <div className="flex items-center justify-center h-full max-h-full overflow-hidden">
                        <MathGraph
                          title={activeGraphs[0]?.title}
                          functions={activeGraphs[0]?.functions}
                          points={activeGraphs[0]?.points}
                          properties={activeGraphs[0]?.properties}
                          bounds={activeGraphs[0]?.bounds}
                          asymptotes={activeGraphs[0]?.asymptotes}
                          symmetryAxis={activeGraphs[0]?.symmetryAxis}
                          holes={activeGraphs[0]?.holes}
                          isRadian={activeGraphs[0]?.isRadian}
                          color={activeTheme.accent}
                          equation={activeGraphs[0]?.equation}
                        />
                      </div>
                    </div>
                  )
                ) : currentSlide.type === "intro" || currentSlideIndex === 0 ? (
                  <div className="flex-1 flex flex-col justify-start items-start max-w-5xl py-2 sm:py-4 overflow-y-auto pr-2">
                    <div className={cn("leading-relaxed tracking-normal", getIntroContentClass(textScale, currentSlide.content), activeTheme.text)}>
                      <MathRenderer text={currentSlide.content} />
                    </div>
                  </div>
                ) : (
                  <div
                    className={cn(
                      "font-normal leading-relaxed max-w-5xl flex-1 overflow-y-auto pr-2",
                      getSolutionContentClass(textScale, currentSlide.content),
                      activeTheme.subtext
                    )}
                  >
                    <MathRenderer text={currentSlide.content} />
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Slide Footer: Presentation progress ticks */}
          <div className="relative z-20 flex items-center gap-1.5 pt-3 border-t border-white/5">
            {solution.slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => selectSlide(idx)}
                disabled={isEditing}
                title={`Jump to slide ${idx + 1}`}
                aria-label={`Jump to slide ${idx + 1}`}
                className={cn(
                  "h-1.5 flex-1 rounded-full transition-all duration-300",
                  idx === currentSlideIndex ? "bg-[#a2c5aa]" : "bg-zinc-500/25 hover:bg-zinc-500/40"
                )}
              />
            ))}
          </div>
          <SlideDrawing key={currentSlideIndex} strokes={currentSlide.drawings || []} enabled={isDrawing && !isEditing} tool={drawingTool} color={inkColor} width={brushWidth} onStroke={addStroke} />
        </SlideStage>
        {isFullscreen && showFullscreenTools && <div className="fullscreen-settings">
          <div className="flex items-center justify-between px-2 pb-2"><span className="text-xs font-semibold">Brush & color</span><button type="button" aria-label="Close drawing settings" onClick={() => setShowFullscreenTools(false)} className="studio-quiet-button">Close</button></div>
          <DrawingTools enabled={isDrawing} onEnabledChange={setIsDrawing} tool={drawingTool} onToolChange={setDrawingTool} color={inkColor} onColorChange={setInkColor} width={brushWidth} onWidthChange={setBrushWidth} canUndo={Boolean(currentSlide.drawings?.length)} onUndo={undoDrawing} onClear={() => addStroke({ tool: "clear", color: inkColor, width: brushWidth, points: [] })} />
        </div>}
        {isFullscreen && <div className="fullscreen-toolbar">
          <button type="button" aria-pressed={isDrawing} onClick={() => setIsDrawing(!isDrawing)} className="studio-quiet-button">{isDrawing ? "Stop drawing" : "Draw"}</button>
          <button type="button" aria-expanded={showFullscreenTools} onClick={() => { setIsDrawing(true); setShowFullscreenTools(!showFullscreenTools); }} className="studio-quiet-button">Brush & color</button>
          <button type="button" onClick={undoDrawing} disabled={!currentSlide.drawings?.length} className="studio-quiet-button">Undo</button>
          <button type="button" onClick={prevSlide} disabled={currentSlideIndex === 0 || isEditing} aria-label="Previous slide" className="drawing-icon-button"><ChevronLeft className="h-4 w-4" /></button>
          <button type="button" onClick={nextSlide} disabled={currentSlideIndex === solution.slides.length - 1 || isEditing} aria-label="Next slide" className="drawing-icon-button"><ChevronRight className="h-4 w-4" /></button>
        </div>}
      </div>

      {/* Resize Handle */}
      <div
        onMouseDown={startResizing}
        className={cn(
          "presenter-resize-handle hidden lg:block",
          isResizing && "is-resizing"
        )}
      />

      {/* ========================================================================= */}
      {/* RIGHT PANEL: Presenter controls share the studio design system. */}
      <aside className="presenter-sidebar" style={{ "--sidebar-width": `${sidebarWidth}px` } as React.CSSProperties} aria-label="Presenter controls">
        <header className="presenter-header">
          <div className="presenter-title"><Presentation size={19} strokeWidth={1.5} aria-hidden="true" /><div><h2>Presenter Studio</h2><div className="presenter-timer"><Clock size={12} aria-hidden="true" /><span>{formatTimer(timerSeconds)}</span><button type="button" onClick={() => setIsTimerRunning(!isTimerRunning)}>{isTimerRunning ? "Pause" : "Resume"}</button></div></div></div>
          <button type="button" onClick={onReset} title="Return to lesson studio" aria-label="Return to lesson selector" className="drawing-icon-button"><RotateCcw size={16} /></button>
        </header>
        <div className="presenter-recording"><span>Lesson recording</span><ScreenRecorder /></div>

        <div className="presenter-body">
          <section className="presenter-section" aria-label="Slide editing">
            <div className="presenter-section-heading"><h3>Your slide</h3><span>{String(currentSlideIndex + 1).padStart(2, "0")} of {String(solution.slides.length).padStart(2, "0")}</span></div>
            {isEditing ? <SlideEditor key={currentSlideIndex} slide={currentSlide} onSave={slide => { updateSlide(slide); setIsEditing(false); }} onCancel={() => setIsEditing(false)} /> :
              <button type="button" onClick={() => { setIsDrawing(false); setIsEditing(true); }} className="studio-secondary-button presenter-edit-button"><Pencil size={15} aria-hidden="true" />Edit slide</button>}
            <DrawingTools enabled={isDrawing && !isEditing} onEnabledChange={enabled => { if (!isEditing) setIsDrawing(enabled); }} tool={drawingTool} onToolChange={setDrawingTool} color={inkColor} onColorChange={setInkColor} width={brushWidth} onWidthChange={setBrushWidth} canUndo={Boolean(currentSlide.drawings?.length) && !isEditing} onUndo={undoDrawing} onClear={() => addStroke({ tool: "clear", color: inkColor, width: brushWidth, points: [] })} />
          </section>

          <section className="presenter-section">
            <div className="presenter-section-heading"><h3><Palette size={14} aria-hidden="true" />Slide appearance</h3></div>
            <div className="presenter-themes">
              {(Object.keys(THEMES) as ThemeKey[]).map(t => <button key={t} type="button" onClick={() => setTheme(t)} aria-pressed={theme === t} className="presenter-theme"><span className={cn("theme-swatch", THEMES[t].slideBg)} aria-hidden="true" /><span>{THEMES[t].name}</span></button>)}
            </div>
          </section>

          <section className="presenter-section">
            <div className="presenter-section-heading"><h3><Type size={14} aria-hidden="true" />Text size</h3><span>{TEXT_SCALE_OPTIONS[textScaleIndex]?.name}</span></div>
            <div className="presenter-text-sizes">
              {TEXT_SCALE_OPTIONS.map(option => <button key={option.id} type="button" onClick={() => setTextScaleDirectly(option.id)} aria-pressed={textScale === option.id} title={option.name}>{option.label}</button>)}
            </div>
          </section>

          <section className="presenter-section">
            <div className="presenter-section-heading"><h3><Volume2 size={14} aria-hidden="true" />Speaker notes</h3><div className="flex items-center gap-1"><button type="button" onClick={toggleSpeak} aria-label={isSpeaking ? "Stop reading aloud" : "Read speaker notes aloud"} title={isSpeaking ? "Stop reading aloud" : "Read speaker notes aloud"} className="drawing-icon-button">{isSpeaking ? <VolumeX size={15} /> : <Volume2 size={15} />}</button><button type="button" onClick={copyNote} aria-label={copied ? "Notes copied" : "Copy speaker notes"} title="Copy speaker notes" className="drawing-icon-button">{copied ? <Check size={15} /> : <Copy size={15} />}</button></div></div>
            <div className="presenter-notes"><MathRenderer text={currentSlide.notes || "Add your own speaker notes with Edit slide."} /></div>
          </section>

          <section className="presenter-section">
            <div className="presenter-section-heading"><h3>Lesson slides</h3><span>{solution.slides.length} slides</span></div>
            <div className="presenter-deck">
              {solution.slides.map((slide, index) => <button key={index} type="button" onClick={() => selectSlide(index)} disabled={isEditing} aria-current={index === currentSlideIndex ? "step" : undefined} className="presenter-slide-link"><span className="presenter-slide-number">{String(index + 1).padStart(2, "0")}</span><span className="presenter-slide-name">{slide.title}</span><span className="presenter-slide-type">{slide.type === "intro" ? "Problem" : slide.type === "graph" || slide.type === "evidence" ? "Graph" : slide.type === "conclusion" || slide.type === "summary" ? "Recap" : "Solution"}</span></button>)}
            </div>
          </section>
        </div>

        <footer className="presenter-footer"><div className="presenter-navigation"><button type="button" onClick={prevSlide} disabled={currentSlideIndex === 0 || isEditing} className="studio-secondary-button"><ChevronLeft size={16} aria-hidden="true" />Previous</button><button type="button" onClick={nextSlide} disabled={currentSlideIndex === solution.slides.length - 1 || isEditing} className="studio-button">Next<ChevronRight size={16} aria-hidden="true" /></button></div><p><kbd>←</kbd> <kbd>→</kbd> Slides <span>·</span> <kbd>F</kbd> Fullscreen <span>·</span> <kbd>Ctrl Z</kbd> Undo</p></footer>
      </aside>
    </div>
  );
}

