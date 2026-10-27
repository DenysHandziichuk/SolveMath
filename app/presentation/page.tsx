"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SolutionDisplay, type Solution } from "@/components/SolutionDisplay";
import { Loader2 } from "lucide-react";
import { SAMPLE_LESSON } from "@/lib/sample-lesson";

export default function PresentationPage() {
  const router = useRouter();
  const [solution, setSolution] = useState<Solution | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [saveError, setSaveError] = useState(false);
  const storageKey = useRef("math_solution");

  useEffect(() => {
    try {
      const demo = new URLSearchParams(window.location.search).get("demo") === "1";
      storageKey.current = demo ? "math_demo_solution" : "math_solution";
      const data = sessionStorage.getItem(storageKey.current);
      const parsed = data ? JSON.parse(data) : demo ? SAMPLE_LESSON : null;
      if (!parsed || !Array.isArray(parsed.slides) || !parsed.slides.length) {
        router.replace("/try");
        return;
      }
      setSolution(parsed);
    } catch {
      if (storageKey.current === "math_demo_solution") setSolution(SAMPLE_LESSON);
      else router.replace("/try");
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  const saveSolution = useCallback((next: Solution) => {
    setSolution(next);
    try {
      sessionStorage.setItem(storageKey.current, JSON.stringify(next));
      setSaveError(false);
    } catch {
      setSaveError(true);
    }
  }, []);

  if (isLoading || !solution) {
    return (
      <div className="flex h-[calc(100vh-64px)] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
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
