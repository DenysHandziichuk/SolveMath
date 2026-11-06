"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SolutionDisplay, type Solution } from "@/components/SolutionDisplay";
import { Loader2 } from "lucide-react";
import { SAMPLE_LESSON } from "@/lib/sample-lesson";
import { createManualPresentation } from "@/lib/presentation";
import { loadPresentation, savePresentation } from "@/lib/presentation-store";
import Link from "next/link";

export default function PresentationPage() {
  const router = useRouter();
  const [solution, setSolution] = useState<Solution | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [saveError, setSaveError] = useState(false);
  const [loadError, setLoadError] = useState<"manual" | "ai" | null>(null);
  const storageKey = useRef("math_solution");
  const isManual = useRef(false);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const demo = params.get("demo") === "1";
      isManual.current = params.get("mode") === "manual";
      storageKey.current = isManual.current ? "math_manual_solution" : demo ? "math_demo_solution" : "math_solution";
      const saved = loadPresentation(storageKey.current, () => isManual.current ? localStorage : sessionStorage);
      setSaveError(saved.unsaved);
      if (saved.corrupt) { setLoadError(isManual.current ? "manual" : "ai"); return; }
      const parsed = saved.solution || (isManual.current ? createManualPresentation() : demo ? SAMPLE_LESSON : null);
      if (!parsed) { router.replace("/try"); return; }
      setSolution(parsed);
    } catch {
      if (isManual.current) { setSolution(createManualPresentation()); setSaveError(true); }
      else if (storageKey.current === "math_demo_solution") setSolution(SAMPLE_LESSON);
      else router.replace("/try");
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  const saveSolution = useCallback((next: Solution) => {
    setSolution(next);
    setSaveError(!savePresentation(storageKey.current, next, () => isManual.current ? localStorage : sessionStorage));
  }, []);

  if (loadError) return <main className="presentation-recovery" aria-labelledby="recovery-title"><div className="presenter-card"><h1 id="recovery-title">This presentation couldn’t be opened.</h1><p>The saved copy hasn’t been changed. Return to the studio, or start a new presentation.</p><div className="studio-form-actions"><Link href="/try" className="studio-secondary-button">Return to studio</Link>{loadError === "manual" ? <button type="button" onClick={() => { setSolution(createManualPresentation()); setLoadError(null); }} className="studio-button">Start a new presentation</button> : <a href="/presentation?mode=manual" className="studio-button">Open manual editor</a>}</div></div></main>;

  if (isLoading || !solution) {
    return (
      <div className="flex h-[calc(100vh-64px)] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" aria-label="Loading presentation" role="status" />
      </div>
    );
  }

  return (
    <div className="bg-background">
      {saveError && <div role="alert" className="fixed left-3 right-3 top-2 z-[70] rounded-lg bg-amber-100 px-4 py-3 text-sm text-amber-950">Your changes are available now, but browser storage is full or unavailable. They may be lost when you leave this page.</div>}
      <SolutionDisplay 
        solution={solution} 
        onSolutionChange={saveSolution}
        onReset={() => {
          router.push("/try");
        }} 
      />
    </div>
  );
}
