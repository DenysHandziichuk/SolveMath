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

      // Store in session storage for the presentation page
      sessionStorage.setItem("math_solution", JSON.stringify(data));
      
      // Navigate to presentation
      router.push("/presentation");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to solve question";
      setError(message);
      setIsSolving(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-background pt-48 pb-12 px-6">
      <div className="mx-auto max-w-4xl">
        <AnimatePresence mode="wait">
          {!questions.length && !isSolving ? (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="text-center space-y-4">
                <h1 className="text-4xl font-bold tracking-tight">Upload Screenshot</h1>
                <p className="text-muted-foreground text-lg">Drop your math problems here to get started.</p>
              </div>
              <UploadArea onImageSelect={handleImageSelect} isProcessing={isProcessing} />
            </motion.div>
          ) : isSolving ? (
            <motion.div
              key="solving"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-24 gap-6"
            >
              <div className="relative flex h-24 w-24 items-center justify-center">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-10 w-10 rounded-full bg-primary/20 animate-ping" />
                </div>
              </div>
              <div className="text-center">
                <h2 className="text-2xl font-bold">Generating Presentation</h2>
                <p className="text-muted-foreground mt-2">Crafting slides, scripts, and animated graphs...</p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="select"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
            >
               <div className="text-center mb-12">
                <h1 className="text-4xl font-bold tracking-tight">Select Task</h1>
                <p className="text-muted-foreground mt-2">We found multiple questions. Which one should we solve first?</p>
              </div>
              <QuestionSelector 
                questions={questions} 
                onSelect={handleQuestionSelect} 
                isSolving={isSolving}
              />
              <button 
                onClick={() => setQuestions([])}
                className="mt-8 mx-auto block text-sm font-medium text-muted-foreground hover:text-foreground underline underline-offset-4"
              >
                Upload different image
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto mt-12 flex max-w-md items-center gap-3 rounded-2xl bg-red-500/10 p-4 text-red-500 border border-red-500/20"
          >
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p className="text-sm font-medium">{error}</p>
            <button 
              onClick={() => setError(null)}
              className="ml-auto text-xs uppercase font-bold tracking-widest hover:underline"
            >
              Dismiss
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
