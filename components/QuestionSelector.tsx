"use client";

import { motion } from "framer-motion";
import { ArrowRight, BookOpen } from "lucide-react";
import { MathRenderer } from "./MathRenderer";

interface Question {
  id: string;
  text: string;
  difficulty: number;
  type: string;
}

interface QuestionSelectorProps {
  questions: Question[];
  onSelect: (question: Question) => void;
  isSolving: boolean;
}

export function QuestionSelector({ questions, onSelect, isSolving }: QuestionSelectorProps) {
  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">Detected Problems</h2>
          <p className="text-xs text-slate-400">Select a problem to generate presentation slides</p>
        </div>
        <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-md bg-slate-800 text-slate-300">
          {questions.length} {questions.length === 1 ? "problem" : "problems"}
        </span>
      </div>

      <div className="grid gap-3.5">
        {questions.map((q, index) => (
          <motion.div
            key={q.id || index}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08, duration: 0.3 }}
          >
            <button
              disabled={isSolving}
              onClick={() => onSelect(q)}
              className="group relative flex w-full flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 p-5 text-left backdrop-blur-md transition-all hover:border-blue-500/50 hover:bg-slate-900/90 active:scale-[0.99] disabled:opacity-50 shadow-md"
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="flex items-center gap-1.5 rounded-md bg-slate-800/90 border border-slate-700/60 px-2.5 py-1 text-[11px] font-semibold text-slate-200">
                  <BookOpen className="h-3 w-3 text-blue-400" />
                  {q.type || "Algebra & Functions"}
                </span>
                <span className="text-[11px] font-mono font-medium text-slate-400">
                  {q.id ? (/^\d+$/.test(q.id) ? `Problem ${q.id}` : q.id) : `Problem ${index + 1}`}
                </span>
              </div>

              <div className="text-base font-normal leading-relaxed text-slate-100 mb-4 pl-1">
                <MathRenderer text={q.text} />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-800/80 text-xs font-semibold text-blue-400 group-hover:text-blue-300">
                <span>Build Presentation Slides</span>
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600/20 text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                  <ArrowRight className="h-4 w-4" />
                </div>
              </div>
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

