import { Calculator } from "lucide-react";

export function Header() {
  return (
    <header className="flex flex-col items-center justify-center pt-16 pb-12 text-center animate-in fade-in slide-in-from-top-4 duration-1000">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/20">
        <Calculator className="h-8 w-8 text-white" />
      </div>
      <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
        SolveMath
      </h1>
      <p className="mt-4 text-lg text-muted-foreground max-w-md">
        Upload a screenshot of your math problems and let AI guide you through the easiest ones.
      </p>
    </header>
  );
}
