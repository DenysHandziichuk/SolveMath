"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Video, Compass, BookOpen, Layers } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-[#070b12] text-slate-100 overflow-x-hidden selection:bg-blue-600 selection:text-white">
      {/* Background ambient lighting */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-blue-600/10 blur-[130px] rounded-full" />
      </div>

      {/* Hero Section */}
      <section className="relative z-10 flex flex-col items-center justify-center pt-36 sm:pt-44 pb-20 px-4 sm:px-6 text-center max-w-5xl mx-auto flex-1">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-semibold uppercase tracking-wider mb-8 backdrop-blur-md"
        >
          <span>1080p 60fps Recording</span>
          <span className="opacity-40">•</span>
          <span>Classroom Slide Engine</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.08 }}
          className="text-5xl sm:text-7xl md:text-8xl font-black tracking-tight text-white max-w-4xl leading-[1.02] mb-6"
        >
          Instant slides.<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-sky-300 to-indigo-300">
            Pure mathematics.
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.16 }}
          className="text-base sm:text-xl text-slate-300 max-w-2xl mb-10 leading-relaxed font-normal"
        >
          Drop any math problem screenshot to generate structured 16:9 presentation slides with textbook KaTeX proofs,
          animated coordinate graphs, and synchronized teacher presenter notes.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.24 }}
          className="flex flex-col sm:flex-row gap-3.5 w-full sm:w-auto"
        >
          <Link
            href="/try"
            className="flex h-13 items-center justify-center gap-2.5 rounded-full bg-blue-600 px-8 text-sm font-bold text-white shadow-xl shadow-blue-600/25 transition-all hover:bg-blue-500 hover:shadow-blue-500/35 active:scale-95"
          >
            <span>Upload Problem Screenshot</span>
            <ArrowRight className="h-4 w-4" />
          </Link>

          <Link
            href="/calculator"
            className="flex h-13 items-center justify-center gap-2.5 rounded-full border border-slate-800 bg-slate-900/60 px-8 text-sm font-semibold text-slate-200 backdrop-blur-md transition-all hover:bg-slate-800 hover:text-white active:scale-95"
          >
            <Compass className="h-4 w-4 text-blue-400" />
            <span>Interactive Graphing Lab</span>
          </Link>
        </motion.div>
      </section>

      {/* Feature Pillars */}
      <section className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 pb-24 w-full">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.32 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-5"
        >
          <div className="p-6 rounded-2xl border border-slate-800/80 bg-slate-900/40 backdrop-blur-md space-y-3 transition-all hover:border-slate-700 hover:bg-slate-900/60">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Video className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-white">1080p 60fps MP4 Recording</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Locked 16:9 aspect-ratio capture with high-bitrate video encoding and synchronized microphone audio. Zero distortion or stretching.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-slate-800/80 bg-slate-900/40 backdrop-blur-md space-y-3 transition-all hover:border-slate-700 hover:bg-slate-900/60">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <BookOpen className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-white">Rigorous Step-by-Step Proofs</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Complete algebraic derivations rendered in KaTeX with domain restrictions, asymptotes, and factoring in standard textbook formatting.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-slate-800/80 bg-slate-900/40 backdrop-blur-md space-y-3 transition-all hover:border-slate-700 hover:bg-slate-900/60">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Layers className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-white">Dynamic Coordinate Graphs</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Plots rational asymptotes, sinusoidal waves in radian measure, and polynomial roots directly alongside your presentation slides.
            </p>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-800/60 py-8 text-center text-xs text-slate-500">
        <p>SolveMath • 1080p 60fps Presentation Studio</p>
      </footer>
    </div>
  );
}
