"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { usePathname } from "next/navigation";

export function Navbar() {
  const pathname = usePathname();
  if (pathname === "/presentation") return null;

  return (
    <header className="landing-nav">
      <nav className="landing-container" aria-label="Main navigation">
        <Link href="/" className="landing-wordmark" aria-label="SolveMath home">SolveMath<span>.</span></Link>
        <div className="landing-nav-links"><Link href="/#how-it-works">How it works</Link></div>
        <Link href="/try" className="landing-nav-cta" aria-current={pathname === "/try" ? "page" : undefined}>{pathname === "/try" ? "Lesson studio" : "Open studio"}<ArrowUpRight size={15} aria-hidden="true" /></Link>
      </nav>
    </header>
  );
}
