"use client";

import Link from "next/link";
import { Calculator } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";

export function Navbar() {
  const pathname = usePathname();
  
  // Hide navbar in presentation mode if needed, or keep it consistent
  if (pathname === "/presentation") return null;

  return (
    <div className="fixed top-8 left-0 right-0 z-[100] flex justify-center px-6 pointer-events-none">
      <nav className={cn(
        "flex h-20 w-full max-w-4xl items-center justify-between rounded-full border border-white/10 bg-zinc-900/80 px-8 shadow-2xl backdrop-blur-2xl pointer-events-auto",
      )}>
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white shadow-lg transition-transform group-hover:scale-110">
              <Calculator className="h-6 w-6" />
            </div>
            <span className="text-2xl font-black tracking-tighter text-white">SolveMath</span>
          </Link>
        </div>

        <div className="flex items-center gap-10">
          <div className="hidden items-center gap-10 md:flex">
            <Link
            href="/calculator"
            className="rounded-full bg-white px-8 py-3 text-lg font-black text-black transition-all hover:bg-zinc-200 active:scale-95 shadow-xl"
          >
            Graphic Calculator
          </Link>
          </div> 
        </div>
      </nav>
    </div>
  );
}
