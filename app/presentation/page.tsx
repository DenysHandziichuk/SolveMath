"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SolutionDisplay } from "@/components/SolutionDisplay";
import { Loader2 } from "lucide-react";

interface Solution {
  explanation: string;
  slides: {
    title: string;
    content: string;
    notes: string;
  }[];
  graphData?: {
    type: string;
    equation: string;
    points: { x: number; y: number }[];
  };
}

export default function PresentationPage() {
  const router = useRouter();
  const [solution, setSolution] = useState<Solution | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const data = sessionStorage.getItem("math_solution");
    if (!data) {
      router.push("/try");
      return;
    }

    try {
      setSolution(JSON.parse(data));
    } catch {
      console.error("Failed to parse solution");
      router.push("/try");
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  if (isLoading || !solution) {
    return (
      <div className="flex h-[calc(100vh-64px)] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="bg-background">
      <SolutionDisplay 
        solution={solution} 
        onReset={() => {
          sessionStorage.removeItem("math_solution");
          router.push("/try");
        }} 
      />
    </div>
  );
}
