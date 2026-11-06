import Link from "next/link";
import { ArrowRight, ArrowUpRight, Check, ChartNoAxesCombined, PencilLine, Video } from "lucide-react";
import { LandingPreview } from "@/components/LandingPreview";

export default function LandingPage() {
  return (
    <main id="main-content" className="landing">
      <section className="landing-hero landing-container" aria-labelledby="hero-title">
        <div className="landing-hero-copy">
          <p className="landing-eyebrow">Math presentation studio</p>
          <h1 id="hero-title">Build slides.<br />Explain the math.</h1>
          <p className="landing-lead">Start with a blank presentation or upload a problem for AI-generated slides. Add your own explanations, graphs, and speaker notes.</p>
          <div className="landing-actions">
            <Link href="/try" className="landing-button">Upload a problem<ArrowRight size={16} aria-hidden="true" /></Link>
            <Link href="/presentation?mode=manual" className="landing-text-link">Create manually<ArrowUpRight size={15} aria-hidden="true" /></Link>
            <Link href="/presentation?demo=1" className="landing-text-link">View a sample<ArrowUpRight size={15} aria-hidden="true" /></Link>
          </div>
          <p className="landing-small-note"><Check size={14} aria-hidden="true" />Manual editing works without AI. No account required.</p>
        </div>
        <LandingPreview />
      </section>

      <section id="how-it-works" className="landing-workflow landing-container" aria-labelledby="workflow-title">
        <div className="landing-section-intro"><h2 id="workflow-title">From problem<br />to presentation.</h2><p>Choose generated slides or write your own.</p></div>
        <ol className="landing-steps">
          <li><span className="landing-step-number">01</span><div><h3>Choose how to start</h3><p>Upload a screenshot and select a question, or open a blank presentation.</p></div></li>
          <li><span className="landing-step-number">02</span><div><h3>Edit the explanation</h3><p>Write your steps, choose a layout, and add graphs or screenshots.</p></div></li>
          <li><span className="landing-step-number">03</span><div><h3>Present or record</h3><p>Keep your notes beside the slides, draw annotations, and record a walkthrough.</p></div></li>
        </ol>
      </section>

      <section id="workspace" className="landing-tools landing-container" aria-labelledby="tools-title">
        <div className="landing-tools-heading"><p className="landing-eyebrow">Writing and presenting</p><h2 id="tools-title">Text, graphs,<br />and speaker notes.</h2><Link href="/presentation?demo=1" className="landing-text-link">Try the workspace<ArrowUpRight size={16} aria-hidden="true" /></Link></div>
        <div className="landing-tool-list">
          <article><PencilLine size={21} strokeWidth={1.5} aria-hidden="true" /><div><h3>Eight slide layouts</h3><p>Use title slides, two text columns, graph comparisons, or a highlighted answer. Edit the text and equations yourself.</p></div></article>
          <article><ChartNoAxesCombined size={21} strokeWidth={1.5} aria-hidden="true" /><div><h3>Graphs you control</h3><p>Plot functions and points, embed a Desmos graph, or add an exported graph image. Show the graph beside your explanation or on its own.</p></div></article>
          <article><Video size={21} strokeWidth={1.5} aria-hidden="true" /><div><h3>Presenter controls</h3><p>Adjust text size, annotate slides, and record your presentation with optional microphone audio.</p></div></article>
        </div>
      </section>

      <section className="landing-bottom-cta landing-container"><h2>Prepare your<br />next math lesson.</h2><Link href="/try" className="landing-button">Open the studio<ArrowRight size={16} aria-hidden="true" /></Link></section>
      <footer className="landing-footer landing-container"><Link href="/" className="landing-wordmark">SolveMath<span>.</span></Link><p>Math presentations you can edit.</p></footer>
    </main>
  );
}
