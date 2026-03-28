"use client";

import { motion } from "framer-motion";
import { Star, ArrowRight } from "lucide-react";
import { MathRenderer } from "./MathRenderer";
import { cn } from "@/lib/utils";

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
  // Sort by difficulty (ascending)
  const sortedQuestions = [...questions].sort((a, b) => a.difficulty - b.difficulty);
  const easiestId = sortedQuestions[0]?.id;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">Select a Question</h2>
        <span className="text-sm text-muted-foreground">{questions.length} detected</span>
      </div>
      
      <div className="grid gap-4">
        {sortedQuestions.map((q, index) => (
          <motion.div
            key={q.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1, duration: 0.5 }}
          >
            <button
              disabled={isSolving}
              onClick={() => onSelect(q)}
              className={cn(
                "group relative flex w-full flex-col overflow-hidden rounded-3xl border border-border bg-card p-6 text-left transition-all hover:border-primary/50 hover:shadow-lg active:scale-[0.98] disabled:opacity-50",
                q.id === easiestId && "border-primary/30 bg-primary/5 ring-1 ring-primary/20"
              )}
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground uppercase tracking-wider">
                    {q.type}
                  </span>
                  {q.id === easiestId && (
                    <span className="flex items-center gap-1 rounded-full bg-primary/20 px-3 py-1 text-xs font-bold text-primary">
                      <Star className="h-3 w-3 fill-current" />
                      RECOMMENDED: EASIEST
                    </span>
                  )}
                </div>
                <div className="text-xs font-medium text-muted-foreground">
                  Difficulty: {q.difficulty}/10
                </div>
              </div>
              
              <div className="text-lg font-medium leading-relaxed text-foreground mb-4">
                <MathRenderer text={q.text} />
              </div>
              
              <div className="flex items-center justify-end">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white shadow-md transition-transform group-hover:translate-x-1">
                  <ArrowRight className="h-5 w-5" />
                </div>
              </div>
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
