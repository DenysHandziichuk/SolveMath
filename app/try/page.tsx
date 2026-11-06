"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UploadArea } from "@/components/UploadArea";
import { QuestionSelector } from "@/components/QuestionSelector";
import { Loader2, AlertCircle, ArrowLeft, ArrowUpRight, Check, X, PencilLine } from "lucide-react";
import { postJson } from "@/lib/client-api";
import { normalizeStoredPresentation, savePresentation } from "@/lib/presentation-store";
import type { ExtractedQuestion } from "@/lib/json-extractor";

type Question = ExtractedQuestion;

export default function TryPage() {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSolving, setIsSolving] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef<AbortController | null>(null);
  useEffect(() => () => requestRef.current?.abort(), []);
  const activeStep = isSolving ? 2 : questions.length ? 1 : 0;

  const handleImageSelect = async (base64: string) => {
    if (requestRef.current) return;
    const controller = new AbortController();
    requestRef.current = controller;
    setIsProcessing(true);
    setError(null);
    try {
      const data = await postJson<{ questions?: Question[] }>("/api/process", { image: base64 }, { signal: controller.signal });
      if (controller.signal.aborted) return;
      if (!Array.isArray(data.questions) || !data.questions.every((question) => question && typeof question.text === "string" && typeof question.id === "string" && typeof question.type === "string")) throw new Error("The detected questions couldn’t be read. Try another image.");
      const detected = data.questions || [];
      setQuestions(detected);
      if (!detected.length) setError("No math problems were found. Try a clearer image with the full question in view.");
    } catch (err) {
      if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "We couldn’t read this image. Please try again.");
    } finally { if (requestRef.current === controller) requestRef.current = null; if (!controller.signal.aborted) setIsProcessing(false); }
  };

  const handleQuestionSelect = async (question: Question) => {
    if (requestRef.current) return;
    const controller = new AbortController();
    requestRef.current = controller;
    setIsSolving(true);
    setError(null);
    try {
      const data = await postJson<unknown>("/api/solve", { question }, { signal: controller.signal });
      if (controller.signal.aborted) return;
      const presentation = normalizeStoredPresentation(data);
      if (!presentation) throw new Error("The service returned an incomplete presentation. Try again.");
      savePresentation("math_solution", presentation, () => sessionStorage);
      router.push("/presentation");
    } catch (err) {
      if (!controller.signal.aborted) { setError(err instanceof Error ? err.message : "We couldn’t create your lesson. Please try again."); setIsSolving(false); }
    } finally { if (requestRef.current === controller) requestRef.current = null; }
  };

  const cancelRequest = () => {
    requestRef.current?.abort();
    requestRef.current = null;
    setIsProcessing(false);
    setIsSolving(false);
    setError(null);
  };

  return (
    <main id="main-content" className="studio-shell">
      <div className="studio-container">
        <div className="studio-page-heading">
          <p className="studio-eyebrow">Lesson studio</p>
          <h1>Create a math presentation.</h1>
          <p>Build your own slides, or upload an image and review the question before generating a solution.</p>
        </div>

        <Link href="/presentation?mode=manual" className="studio-manual-entry"><PencilLine size={22} strokeWidth={1.5} aria-hidden="true" /><div><h2>Create manually</h2><p>Start with blank slides. Add your own text, equations, and graphs. No AI needed.</p></div><ArrowUpRight size={18} aria-hidden="true" /></Link>

        <ol className="studio-steps" aria-label="Create a lesson">
          {["Upload an image", "Review the questions", "Generate slides"].map((step, index) => <li key={step} aria-current={activeStep === index ? "step" : undefined} data-complete={index < activeStep}><span className="studio-step-icon">{index < activeStep ? <Check size={12} aria-hidden="true" /> : index + 1}</span><span>{step}</span></li>)}
        </ol>

        <div className="studio-grid">
          <div className="studio-main">
            {isSolving ? (
              <section className="studio-loading" role="status" aria-live="polite"><Loader2 className="animate-spin" size={28} strokeWidth={1.5} aria-hidden="true" /><h2>Creating your slides…</h2><p>Solving the selected question and preparing graphs and speaker notes. This can take up to two minutes.</p></section>
            ) : questions.length ? (
              <>
                <QuestionSelector questions={questions} onSelect={handleQuestionSelect} onUpdate={(index, text, visualContext, tables) => { setQuestions(current => current.map((question, i) => i === index ? { ...question, text, visualContext, tables } : question)); setError(null); }} isSolving={isSolving} />
                <button type="button" onClick={() => { setQuestions([]); setError(null); }} className="studio-back-link"><ArrowLeft size={14} aria-hidden="true" />Upload another screenshot</button>
              </>
            ) : <UploadArea onImageSelect={handleImageSelect} isProcessing={isProcessing} />}

            {(isProcessing || isSolving) && <button type="button" onClick={cancelRequest} className="studio-quiet-button">Cancel request</button>}
            {error && <div className="studio-alert" role="alert"><AlertCircle size={18} aria-hidden="true" /><p>{error}</p><button type="button" aria-label="Dismiss error" onClick={() => setError(null)}><X size={16} /></button></div>}
          </div>

          <aside className="studio-guidance" aria-labelledby="guidance-title">
            <h2 id="guidance-title">Before you upload</h2>
            <p>Include enough detail to read the full problem.</p>
            <ol><li>Keep the full question, graphs, tables, and all its parts in view.</li><li>Use a sharp image with easy-to-read text and axis labels.</li><li>Review the detected text and graph information before creating your slides.</li></ol>
            <div className="studio-sample-link"><p>Try the editor first</p><Link href="/presentation?demo=1">Explore a sample lesson<ArrowUpRight size={14} aria-hidden="true" /></Link></div>
          </aside>
        </div>

        <footer className="studio-footer"><span>Manual presentations are saved in this browser.</span><span className="studio-ready" role="status"><span aria-hidden="true" />{isSolving ? "Creating your lesson" : isProcessing ? "Reading your image" : "Ready"}</span></footer>
      </div>
    </main>
  );
}
