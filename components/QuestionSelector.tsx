"use client";

import { useId, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, BookOpen, Pencil } from "lucide-react";
import { MathRenderer } from "./MathRenderer";
import { QuestionEditor } from "./QuestionEditor";

interface Question {
  id: string;
  text: string;
  difficulty: number;
  type: string;
}

interface QuestionSelectorProps {
  questions: Question[];
  onSelect: (question: Question) => void;
  onUpdate: (index: number, text: string) => void;
  isSolving: boolean;
}

export function QuestionSelector({ questions, onSelect, onUpdate, isSolving }: QuestionSelectorProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const editButtonRef = useRef<HTMLButtonElement | null>(null);
  const editorId = useId();
  const isEditing = editingIndex !== null;

  const closeEditor = () => {
    setEditingIndex(null);
    requestAnimationFrame(() => editButtonRef.current?.focus());
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">Detected Problems</h2>
          <p id={editorId + "-status"} role="status" className="text-xs text-slate-400">
            {isEditing
              ? "Save or cancel your changes before generating slides."
              : "Review or edit a problem, then generate presentation slides."}
          </p>
        </div>
        <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-md bg-slate-800 text-slate-300">
          {questions.length} {questions.length === 1 ? "problem" : "problems"}
        </span>
      </div>

      <ul className="grid gap-3.5">
        {questions.map((q, index) => {
          const label = q.id ? (/^\d+$/.test(q.id) ? "Problem " + q.id : q.id) : "Problem " + (index + 1);
          const isCurrentEditor = editingIndex === index;

          return (
            <motion.li
              key={q.id || index}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08, duration: 0.3 }}
            >
              <article
                aria-label={label}
                className={"relative flex min-w-0 w-full flex-col overflow-hidden rounded-2xl border bg-slate-900/60 p-5 text-left shadow-md backdrop-blur-md " + (isCurrentEditor ? "border-blue-500/60" : "border-slate-800")}
              >
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-1.5 rounded-md bg-slate-800/90 border border-slate-700/60 px-2.5 py-1 text-[11px] font-semibold text-slate-200">
                    <BookOpen aria-hidden="true" className="h-3 w-3 shrink-0 text-blue-400" />
                    {q.type || "Algebra & Functions"}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-mono font-medium text-slate-400">{label}</span>
                    <button
                      type="button"
                      disabled={isSolving || isEditing}
                      aria-label={"Edit " + label}
                      aria-expanded={isCurrentEditor}
                      aria-controls={editorId + "-" + index}
                      aria-describedby={isEditing ? editorId + "-status" : undefined}
                      onClick={(event) => {
                        editButtonRef.current = event.currentTarget;
                        setEditingIndex(index);
                      }}
                      className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-slate-300 transition-colors hover:bg-slate-800 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Pencil aria-hidden="true" className="h-3.5 w-3.5" />
                      Edit
                    </button>
                  </div>
                </div>

                {isCurrentEditor ? (
                  <QuestionEditor
                    id={editorId + "-" + index}
                    label={label}
                    text={q.text}
                    onSave={(text) => {
                      onUpdate(index, text);
                      closeEditor();
                    }}
                    onCancel={closeEditor}
                  />
                ) : (
                  <>
                    <div className="min-w-0 text-base font-normal leading-relaxed text-slate-100 mb-4 pl-1">
                      <MathRenderer text={q.text} />
                    </div>
                    <button
                      type="button"
                      disabled={isSolving || isEditing}
                      aria-label={"Build presentation slides for " + label}
                      aria-describedby={isEditing ? editorId + "-status" : undefined}
                      onClick={() => onSelect(q)}
                      className="group flex min-h-11 w-full flex-wrap items-center justify-between gap-3 rounded-sm border-t border-slate-800/80 pt-3 text-left text-xs font-semibold text-blue-400 transition-colors hover:text-blue-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-400 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <span>Build Presentation Slides</span>
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600/20 text-blue-400 transition-all group-hover:bg-blue-600 group-hover:text-white">
                        <ArrowRight aria-hidden="true" className="h-4 w-4" />
                      </span>
                    </button>
                  </>
                )}
              </article>
            </motion.li>
          );
        })}
      </ul>
    </div>
  );
}

