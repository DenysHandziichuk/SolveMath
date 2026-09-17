"use client";

import Link from "next/link";
import { Compass, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";

export function Navbar() {
  const pathname = usePathname();

  // Hide navbar during presentation mode
  if (pathname === "/presentation") return null;

  return (
    <div className="fixed top-6 left-0 right-0 z-[100] flex justify-center px-4 sm:px-6 pointer-events-none">
      <nav
        className={cn(
          "flex h-14 w-full max-w-3xl items-center justify-between rounded-full border border-white/10 bg-slate-950/80 px-6 shadow-2xl backdrop-blur-2xl pointer-events-auto transition-all"
        )}
      >
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white shadow-md shadow-blue-600/30 transition-transform group-hover:scale-105">
            <Compass className="h-4 w-4" />
          </div>
          <span className="text-base font-extrabold tracking-tight text-white">SolveMath</span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/try"
            className={cn(
              "flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-full transition-all",
              pathname === "/try"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                : "text-slate-300 hover:text-white hover:bg-white/5"
            )}
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span>Lesson Studio</span>
          </Link>

          <Link
            href="/calculator"
            className={cn(
              "flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-full transition-all",
              pathname === "/calculator"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                : "text-slate-300 hover:text-white hover:bg-white/5"
            )}
          >
            <Compass className="h-3.5 w-3.5" />
            <span>Graphing Lab</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}

