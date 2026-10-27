import Link from "next/link";
import { ArrowRight, ArrowUpRight, Check, ChartNoAxesCombined, PencilLine, Video } from "lucide-react";
import { LandingPreview } from "@/components/LandingPreview";

export default function LandingPage() {
  return (
    <main className="landing">
      <section className="landing-hero landing-container" aria-labelledby="hero-title">
        <div className="landing-hero-copy">
          <p className="landing-eyebrow">Built for the way you teach.</p>
          <h1 id="hero-title">Good math.<br />Clear thinking.</h1>
          <p className="landing-lead">Turn a math problem into a lesson worth sharing. Create clear slides, make them your own, and walk through every step.</p>
          <div className="landing-actions">
            <Link href="/try" className="landing-button">Create a lesson<ArrowRight size={16} aria-hidden="true" /></Link>
            <Link href="/presentation?demo=1" className="landing-text-link">Explore a sample<ArrowUpRight size={15} aria-hidden="true" /></Link>
          </div>
          <p className="landing-small-note"><Check size={14} aria-hidden="true" />From your first screenshot to your final explanation.</p>
        </div>
        <LandingPreview />
      </section>

      <section id="how-it-works" className="landing-workflow landing-container" aria-labelledby="workflow-title">
        <div className="landing-section-intro"><h2 id="workflow-title">Less preparation.<br />More understanding.</h2><p>One workspace for the whole lesson.</p></div>
        <ol className="landing-steps">
          <li><span className="landing-step-number">01</span><div><h3>Start with a problem</h3><p>Upload or paste a screenshot. Pick the question you want to explain.</p></div></li>
          <li><span className="landing-step-number">02</span><div><h3>Make it your lesson</h3><p>Edit your slides and notes. Add an annotation, a sketch, or a little emphasis.</p></div></li>
          <li><span className="landing-step-number">03</span><div><h3>Bring the math to life</h3><p>Present step by step, explore the graphs, or record a walkthrough to share.</p></div></li>
        </ol>
      </section>

      <section id="workspace" className="landing-tools landing-container" aria-labelledby="tools-title">
        <div className="landing-tools-heading"><p className="landing-eyebrow">Your explanation comes first.</p><h2 id="tools-title">Everything you need.<br />Room to think.</h2><Link href="/presentation?demo=1" className="landing-text-link">Try the workspace<ArrowUpRight size={16} aria-hidden="true" /></Link></div>
        <div className="landing-tool-list">
          <article><PencilLine size={21} strokeWidth={1.5} aria-hidden="true" /><div><h3>A slide is just the starting point.</h3><p>Refine the wording, adjust an equation, and add your own speaker notes. Draw with pens, pencils, and highlighters in any color.</p></div></article>
          <article><ChartNoAxesCombined size={21} strokeWidth={1.5} aria-hidden="true" /><div><h3>Show what the equation means.</h3><p>Put algebra and geometry side by side with coordinate graphs. Connect each step of the solution to the shape of the curve.</p></div></article>
          <article><Video size={21} strokeWidth={1.5} aria-hidden="true" /><div><h3>A good explanation can travel.</h3><p>Present with your notes close at hand. Record your slides and voice, then download the walkthrough for your students.</p></div></article>
        </div>
      </section>

      <section className="landing-bottom-cta landing-container"><h2>Give your next lesson<br />a little more clarity.</h2><Link href="/try" className="landing-button">Open the studio<ArrowRight size={16} aria-hidden="true" /></Link></section>
      <footer className="landing-footer landing-container"><Link href="/" className="landing-wordmark">SolveMath<span>.</span></Link><p>Made for the moments when it clicks.</p></footer>
    </main>
  );
}
