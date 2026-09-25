"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  Mic,
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
} from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";
import { MathRenderer } from "./MathRenderer";
import { MathGraph } from "./MathGraph";
import { ScreenRecorder } from "./ScreenRecorder";
import { cn } from "@/lib/utils";

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
}

const THEMES = {
  slate: {
    name: "Oxford Slate",
    bg: "bg-[#090d16]",
    slideBg: "bg-[#0b0f19]",
    slideBorder: "border-slate-800",
    text: "text-white",
    subtext: "text-slate-300",
    accent: "#3b82f6",
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

export function SolutionDisplay({ solution, onReset }: SolutionDisplayProps) {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(420);
  const [isResizing, setIsResizing] = useState(false);
  const [theme, setTheme] = useState<ThemeKey>("slate");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(true);

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

  const [graphComparisonView, setGraphComparisonView] = useState<"dual" | "a" | "b">("dual");

  // Reset comparison view on slide switch
  useEffect(() => {
    setGraphComparisonView("dual");
  }, [currentSlideIndex]);

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
  const hasValidGraph =
    activeGraphs.length > 0 &&
    activeGraphs.some((g) => (g.functions?.length || g.points?.length));

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
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  }, []);

  // Keyboard navigation (Arrow keys, Spacebar, F for fullscreen)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === "ArrowRight" || e.key === "PageDown" || e.key === " ") {
        e.preventDefault();
        setCurrentSlideIndex((prev) => Math.min(solution.slides.length - 1, prev + 1));
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        setCurrentSlideIndex((prev) => Math.max(0, prev - 1));
      } else if (e.key.toLowerCase() === "f") {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === "Escape" && isFullscreen) {
        setIsFullscreen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [solution.slides.length, isFullscreen, toggleFullscreen]);


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
      setCurrentSlideIndex(currentSlideIndex + 1);
    }
  };

  const prevSlide = () => {
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex(currentSlideIndex - 1);
    }
  };

  const [isSpeaking, setIsSpeaking] = useState(false);

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
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, [currentSlideIndex]);

  const copyNote = () => {
    if (!currentSlide) return;
    navigator.clipboard.writeText(currentSlide.notes);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn("fixed inset-0 z-50 flex h-[100dvh] w-screen overflow-hidden", activeTheme.bg)}>
      {/* ========================================================================= */}
      {/* LEFT PANEL: The 16:9 Presentation Stage (Strict 1920x1080 Aspect Ratio) */}
      {/* ========================================================================= */}
      <div
        ref={presentationAreaRef}
        id="presentation-area"
        className={cn(
          "relative flex flex-1 items-center justify-center p-3 sm:p-6 overflow-hidden select-none transition-colors duration-300",
          activeTheme.bg
        )}
      >
        {/* PRESENTATION STAGE: Hard-locked to 16:9 aspect-video */}
        <div
          id="presentation-slide-stage"
          className={cn(
            "relative aspect-video w-full max-w-[calc((100dvh-48px)*16/9)] max-h-[calc(100dvh-48px)] flex flex-col justify-between p-5 sm:p-7 lg:p-8 rounded-2xl border shadow-2xl overflow-hidden transition-all duration-300",
            activeTheme.slideBg,
            activeTheme.slideBorder
          )}
        >
          {/* Slide Header */}
          <div className="flex items-center justify-between pb-2.5 border-b border-white/5 shrink-0">
            <div className="text-xs font-medium text-zinc-400 truncate max-w-[70%]">
              {currentSlide.subtitle ? (
                <MathRenderer text={currentSlide.subtitle} inline />
              ) : (
                <span>Slide {currentSlideIndex + 1}</span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-mono text-zinc-400">
                {String(currentSlideIndex + 1).padStart(2, "0")} / {String(solution.slides.length).padStart(2, "0")}
              </span>

              <button
                onClick={toggleFullscreen}
                title="Fullscreen (F)"
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
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
                className="w-full flex flex-col flex-1 justify-start h-full overflow-hidden min-h-0"
              >
                <h1 className={cn("text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight mb-3 shrink-0", activeTheme.text)}>
                  <MathRenderer text={currentSlide.title} inline />
                </h1>

                {/* Split view when graph slide */}
                {isGraphSlide && activeGraphs.length > 0 ? (
                  isMultiGraph ? (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch flex-1 min-h-0 overflow-hidden">
                      {/* Left: Mathematical Explanation */}
                      <div className={cn("lg:col-span-4 text-xs sm:text-sm lg:text-base font-normal leading-relaxed overflow-y-auto max-h-full pr-2 flex flex-col justify-between", activeTheme.subtext)}>
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
                      <div className="lg:col-span-8 flex items-center justify-center h-full max-h-full overflow-hidden">
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
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-center flex-1 min-h-0 overflow-hidden">
                      <div className={cn("text-sm sm:text-base lg:text-lg font-normal leading-relaxed overflow-y-auto max-h-full pr-2", activeTheme.subtext)}>
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
                  <div className="flex-1 flex flex-col justify-center items-start max-w-4xl py-2 overflow-y-auto pr-1">
                    <div className="w-full rounded-2xl bg-white/[0.03] border border-white/10 p-6 sm:p-8 backdrop-blur-sm shadow-xl">
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-semibold uppercase tracking-wider mb-4">
                        <span>Selected Problem</span>
                      </div>
                      <div className={cn("text-lg sm:text-xl lg:text-2xl font-medium leading-relaxed", activeTheme.text)}>
                        <MathRenderer text={currentSlide.content} />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className={cn("text-sm sm:text-base lg:text-lg font-normal leading-relaxed max-w-4xl flex-1 overflow-y-auto pr-2", activeTheme.subtext)}>
                    <MathRenderer text={currentSlide.content} />
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Slide Footer: Presentation progress ticks */}
          <div className="flex items-center gap-1.5 pt-3 border-t border-white/5">
            {solution.slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentSlideIndex(idx)}
                title={`Jump to slide ${idx + 1}`}
                className={cn(
                  "h-1.5 flex-1 rounded-full transition-all duration-300",
                  idx === currentSlideIndex ? "bg-blue-500 shadow-sm" : "bg-white/10 hover:bg-white/20"
                )}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Resize Handle */}
      <div
        onMouseDown={startResizing}
        className={cn(
          "hidden lg:block w-1.5 h-full cursor-col-resize hover:bg-blue-500 transition-colors z-30 bg-slate-800/40",
          isResizing && "bg-blue-500 w-2"
        )}
      />

      {/* ========================================================================= */}
      {/* RIGHT PANEL: Presenter Studio & Controls */}
      {/* ========================================================================= */}
      <div
        className="flex flex-col border-l border-slate-800 bg-[#0f172a] shadow-2xl z-20 w-full lg:w-auto text-slate-100"
        style={{
          width: typeof window !== "undefined" && window.innerWidth >= 1024 ? `${sidebarWidth}px` : "100%",
          minWidth: typeof window !== "undefined" && window.innerWidth >= 1024 ? "380px" : "auto",
        }}
      >
        {/* Dashboard Header with Recorder and Reset */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-600 shadow-md text-white">
              <Presentation className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight text-white">Presenter Studio</h2>
              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                <Clock className="h-3 w-3 text-slate-500" />
                <span className="font-mono">{formatTimer(timerSeconds)}</span>
                <button
                  onClick={() => setIsTimerRunning(!isTimerRunning)}
                  className="hover:text-slate-200 underline text-[10px]"
                >
                  {isTimerRunning ? "Pause" : "Resume"}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ScreenRecorder />
            <button
              onClick={onReset}
              title="Return to Lesson Selector"
              className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Dashboard Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
          {/* Lecture Theme Palette Selection */}
          <section className="space-y-2">
            <div className="flex items-center gap-2 text-slate-400">
              <Palette className="h-3.5 w-3.5 text-blue-400" />
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Lecture Theme</h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              {(Object.keys(THEMES) as ThemeKey[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  className={cn(
                    "flex items-center gap-2 p-2 rounded-xl border text-left transition-all",
                    theme === t
                      ? "border-blue-500 bg-blue-500/15 ring-1 ring-blue-500 text-white font-semibold"
                      : "border-slate-800 bg-slate-900/60 hover:border-slate-700 text-slate-300"
                  )}
                >
                  <div className={cn("h-3.5 w-3.5 rounded-full border border-white/20 shrink-0", THEMES[t].slideBg)} />
                  <span className="text-xs truncate">{THEMES[t].name}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Teacher / Speaker Script Notes */}
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-blue-400">
                <Volume2 className="h-3.5 w-3.5" />
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Spoken Lesson Script</h3>
                {currentSlide.notes && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    ~{Math.max(4, Math.round(currentSlide.notes.trim().split(/\s+/).length / 2.5))}s read
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={toggleSpeak}
                  title={isSpeaking ? "Stop reading aloud" : "Read script aloud (Text-to-Speech)"}
                  className={cn(
                    "p-1.5 rounded-lg transition-colors flex items-center gap-1",
                    isSpeaking
                      ? "bg-blue-500/20 text-blue-400 border border-blue-500/30 animate-pulse"
                      : "text-slate-400 hover:text-blue-400"
                  )}
                >
                  {isSpeaking ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                </button>
                <button
                  onClick={copyNote}
                  title="Copy script"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-blue-400 transition-colors"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={`${theme}-${currentSlideIndex}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-sm sm:text-base leading-relaxed text-slate-200 bg-slate-900/80 p-4 rounded-xl border border-slate-800 font-normal select-text shadow-sm"
              >
                <MathRenderer text={currentSlide.notes} />
              </motion.div>
            </AnimatePresence>
          </section>

          {/* Slide Deck Navigator */}
          <section className="space-y-2">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Slide Navigator</h3>
            <div className="space-y-1">
              {solution.slides.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentSlideIndex(idx)}
                  className={cn(
                    "w-full flex items-center justify-between p-2.5 rounded-xl border text-left text-xs transition-all gap-2",
                    idx === currentSlideIndex
                      ? "border-blue-500/60 bg-blue-500/15 text-white font-semibold shadow-sm"
                      : "border-slate-800/60 bg-slate-900/40 text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
                  )}
                >
                  <div className="flex items-center gap-2 truncate min-w-0">
                    <span className="text-[11px] font-mono text-slate-400 font-semibold shrink-0">
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    <span className="truncate text-xs font-medium text-slate-200">
                      {s.title}
                    </span>
                  </div>
                  <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-400 font-mono shrink-0">
                    {s.type === "intro" ? "Problem" : s.type === "solution" ? "Solution" : s.type === "graph" || s.type === "evidence" ? "Evidence" : "Conclusion"}
                  </span>
                </button>
              ))}
            </div>
          </section>
        </div>

        {/* Navigation Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-900/40 flex flex-col gap-2.5">
          <div className="flex items-center gap-2.5">
            <button
              onClick={prevSlide}
              disabled={currentSlideIndex === 0}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 font-semibold text-xs transition-all hover:bg-slate-700 disabled:opacity-30 active:scale-95 shadow-sm"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Previous</span>
            </button>
            <button
              onClick={nextSlide}
              disabled={currentSlideIndex === solution.slides.length - 1}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-xs shadow-md transition-all hover:bg-blue-500 disabled:opacity-30 active:scale-95"
            >
              <span>Next</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <p className="text-[10px] text-center text-slate-500">
            Keyboard Shortcuts: <kbd className="px-1 py-0.5 rounded bg-slate-800 text-slate-300">Space</kbd> / <kbd className="px-1 py-0.5 rounded bg-slate-800 text-slate-300">→</kbd> Next • <kbd className="px-1 py-0.5 rounded bg-slate-800 text-slate-300">F</kbd> Fullscreen
          </p>
        </div>
      </div>
    </div>
  );
}

