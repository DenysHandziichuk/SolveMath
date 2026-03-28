"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen overflow-hidden bg-background">
      {/* Hero Section */}
      <section className="relative flex flex-col items-center justify-center pt-48 pb-32 px-6 text-center w-[80vw] mx-auto flex-1">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-bold uppercase tracking-widest mb-10"
        >
          <Sparkles className="h-3 w-3" />
          The Future of Learning
        </motion.div>
        
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-7xl md:text-[8rem] font-black tracking-tighter leading-[0.8] text-foreground mb-12"
        >
          Instant slides.<br />Perfect logic.
        </motion.h1>
        
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-xl md:text-2xl text-muted-foreground max-w-3xl mb-16 leading-relaxed font-medium"
        >
          Drop a math screenshot and get a classroom-ready presentation with speaker notes and animated graphs in seconds.
        </motion.p>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto"
        >
          <Link
            href="/try"
            className="flex h-16 items-center justify-center gap-3 rounded-full bg-foreground px-10 text-xl font-bold text-background transition-all hover:scale-105 active:scale-95"
          >
            Try it for free <ArrowRight className="h-6 w-6" />
          </Link>
        </motion.div>
      </section>

      {/* Floating Mock UI Element - Background Aesthetic */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-6xl h-[400px] bg-gradient-to-t from-primary/5 via-secondary/5 to-transparent pointer-events-none rounded-t-[4rem] border-x border-t border-border/20 shadow-2xl overflow-hidden z-[-1] hidden lg:block" />

      <footer className="py-12 text-center text-sm text-muted-foreground">
        <p>© 2026 SolveMath AI. Inspired by Mobbin Design.</p>
      </footer>
    </div>
  );
}
