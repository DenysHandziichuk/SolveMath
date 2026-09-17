"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UploadArea } from "@/components/UploadArea";
import { QuestionSelector } from "@/components/QuestionSelector";
import { Loader2, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Question {
  id: string;
  text: string;
  difficulty: number;
  type: string;
}

export default function TryPage() {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSolving, setIsSolving] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleImageSelect = async (base64: string) => {
    setIsProcessing(true);
    setError(null);

    try {
      const response = await fetch("/api/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64 }),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      setQuestions(data.questions || []);
      setIsProcessing(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to process image";
      setError(message);
      setIsProcessing(false);
    }
  };

  const handleQuestionSelect = async (question: Question) => {
    setIsSolving(true);
    setError(null);

    try {
      const response = await fetch("/api/solve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      sessionStorage.setItem("math_solution", JSON.stringify(data));
      router.push("/presentation");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to solve question";
      setError(message);
      setIsSolving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070b12] text-slate-100 pt-32 pb-20 px-4 sm:px-6">
      {/* Background ambient lighting */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-blue-600/10 blur-[120px] rounded-full" />
      </div>

      <div className="relative z-10 mx-auto max-w-3xl">
        {/* Studio Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center mb-10 space-y-2.5"
        >
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-semibold uppercase tracking-wider mb-2 backdrop-blur-md">
            <span>Lesson Presentation Studio</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white">
            Screenshot to 1080p Slides
          </h1>
          <p className="text-sm sm:text-base text-slate-400 max-w-xl mx-auto font-normal">
            Drop or paste any math problem screenshot to generate structured presentation slides.
          </p>
        </motion.div>

        <AnimatePresence mode="wait">
          {isSolving ? (
            <motion.div
              key="solving"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center justify-center py-20 gap-5 text-center"
            >
              <div className="relative flex h-16 w-16 items-center justify-center">
                <div className="absolute inset-0 rounded-full border-2 border-blue-500/20 animate-ping opacity-30" />
                <div className="absolute inset-0 rounded-full border-2 border-t-blue-500 border-r-transparent border-b-blue-500/40 border-l-transparent animate-spin" />
                <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-lg font-bold text-white">Preparing Presentation</h3>
                <p className="text-xs text-slate-400 max-w-sm">
                  Formatting step-by-step proofs, coordinate graphs, and speaker notes...
                </p>
              </div>
            </motion.div>
          ) : questions.length > 0 ? (
            <motion.div key="questions" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
              <QuestionSelector questions={questions} onSelect={handleQuestionSelect} isSolving={isSolving} />
              <button
                onClick={() => setQuestions([])}
                className="mt-6 mx-auto block text-xs font-semibold text-slate-400 hover:text-white underline underline-offset-4 transition-colors"
              >
                ← Upload another screenshot
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="space-y-6"
            >
              <UploadArea onImageSelect={handleImageSelect} isProcessing={isProcessing} />
            </motion.div>
          )}
        </AnimatePresence>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto mt-6 flex max-w-md items-center gap-3 rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-xs text-red-400 shadow-lg"
          >
            <AlertCircle className="h-4 w-4 shrink-0" />
            <p className="flex-1 font-medium">{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-[11px] font-bold uppercase tracking-wider text-slate-400 hover:text-white"
            >
              Dismiss
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}

