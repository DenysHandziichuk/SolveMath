"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UploadArea } from "@/components/UploadArea";
import { QuestionSelector } from "@/components/QuestionSelector";
import { Loader2, AlertCircle, ArrowLeft, ArrowUpRight, Check, X } from "lucide-react";

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
  const activeStep = isSolving ? 2 : questions.length ? 1 : 0;

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
      if (!response.ok || data.error) throw new Error(data.error || "We couldn’t read this image. Please try again.");
      const detected = data.questions || [];
      setQuestions(detected);
      if (!detected.length) setError("No math problems were found. Try a clearer image with the full question in view.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "We couldn’t read this image. Please try again.");
    } finally { setIsProcessing(false); }
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
      if (!response.ok || data.error) throw new Error(data.error || "We couldn’t create your lesson. Please try again.");
      sessionStorage.setItem("math_solution", JSON.stringify(data));
      router.push("/presentation");
    } catch (err) {
      setError(err instanceof Error ? err.message : "We couldn’t create your lesson. Please try again.");
      setIsSolving(false);
    }
  };

  return (
    <main className="studio-shell">
      <div className="studio-container">
        <div className="studio-page-heading">
          <p className="studio-eyebrow">Lesson studio</p>
          <h1>Start with a problem.</h1>
          <p>A screenshot, a clear explanation, a lesson that’s yours.<br className="studio-desktop-break" /> Let’s work through it, one step at a time.</p>
        </div>

        <ol className="studio-steps" aria-label="Create a lesson">
          {["Upload a problem", "Review the question", "Create your lesson"].map((step, index) => <li key={step} aria-current={activeStep === index ? "step" : undefined} data-complete={index < activeStep}><span className="studio-step-icon">{index < activeStep ? <Check size={12} aria-hidden="true" /> : index + 1}</span><span>{step}</span></li>)}
        </ol>

        <div className="studio-grid">
          <div className="studio-main">
            {isSolving ? (
              <section className="studio-loading" role="status" aria-live="polite"><Loader2 className="animate-spin" size={28} strokeWidth={1.5} aria-hidden="true" /><h2>A little preparation. A clearer lesson.</h2><p>Working through the solution and putting your slides,<br className="studio-desktop-break" /> graphs, and speaker notes together.</p></section>
            ) : questions.length ? (
              <>
                <QuestionSelector questions={questions} onSelect={handleQuestionSelect} onUpdate={(index, text) => { setQuestions(current => current.map((question, i) => i === index ? { ...question, text } : question)); setError(null); }} isSolving={isSolving} />
                <button type="button" onClick={() => { setQuestions([]); setError(null); }} className="studio-back-link"><ArrowLeft size={14} aria-hidden="true" />Upload another screenshot</button>
              </>
            ) : <UploadArea onImageSelect={handleImageSelect} isProcessing={isProcessing} />}

            {error && <div className="studio-alert" role="alert"><AlertCircle size={18} aria-hidden="true" /><p>{error}</p><button type="button" aria-label="Dismiss error" onClick={() => setError(null)}><X size={16} /></button></div>}
          </div>

          <aside className="studio-guidance" aria-labelledby="guidance-title">
            <h2 id="guidance-title">A clearer start.</h2>
            <p>A few small things make a better lesson.</p>
            <ol><li>Keep the full question and all its parts in view.</li><li>Use a sharp image with easy-to-read text.</li><li>Review the detected question before creating your slides.</li></ol>
            <div className="studio-sample-link"><p>Just looking around?</p><Link href="/presentation?demo=1">Explore a sample lesson<ArrowUpRight size={14} aria-hidden="true" /></Link></div>
          </aside>
        </div>

        <footer className="studio-footer"><span>Your explanation. Your way.</span><span className="studio-ready" role="status"><span aria-hidden="true" />{isSolving ? "Creating your lesson" : isProcessing ? "Reading your image" : "Ready when you are"}</span></footer>
      </div>
    </main>
  );
}
