"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, ChevronLeft, ChevronRight, PenLine, Play } from "lucide-react";
import { MathRenderer } from "./MathRenderer";

const previews = [
  { title: "Understanding quadratics", subtitle: "The question", content: "Where does the curve meet the x-axis?", formula: "f(x) = x^2 - 5x + 6" },
  { title: "Find the pattern.", subtitle: "Factor the expression", content: "Two numbers. A product of 6. A sum of −5.", formula: "x^2 - 5x + 6 = (x-2)(x-3)" },
  { title: "See the solution.", subtitle: "Connect the ideas", content: "The roots are the points where the function is zero.", formula: "x = 2 \\quad \\text{or} \\quad x = 3" },
];

export function LandingPreview() {
  const [active, setActive] = useState(0);
  const preview = previews[active];
  return (
    <div className="lesson-preview">
      <div className="lesson-preview-top"><span><span className="preview-status-dot" />Lesson studio</span><Link href="/presentation?demo=1">Open sample<ArrowUpRight size={13} aria-hidden="true" /></Link></div>
      <div className="lesson-preview-slide" aria-live="polite" aria-atomic="true">
        <div className="preview-slide-meta"><span>Algebra / Quadratic equations</span><span>0{active + 1} / 03</span></div>
        <h2>{preview.title}</h2>
        <div className="preview-slide-content">
          <div className="preview-explanation"><p>{preview.content}</p><div className="preview-equation"><MathRenderer text={`$${preview.formula}$`} inline /></div>{active === 2 && <p className="preview-solution-note">Two roots. Two x-intercepts.</p>}</div>
          <svg className="preview-graph" viewBox="0 0 260 210" role="img" aria-labelledby="preview-graph-title"><title id="preview-graph-title">Graph of x squared minus five x plus six, crossing the x-axis at two and three</title>
            <defs><pattern id="preview-grid" width="30" height="30" patternUnits="userSpaceOnUse"><path d="M 30 0 L 0 0 0 30" fill="none" stroke="currentColor" strokeWidth="0.5" /></pattern><clipPath id="preview-graph-clip"><rect x="0" y="0" width="260" height="210" /></clipPath></defs>
            <rect width="260" height="210" fill="url(#preview-grid)" opacity="0.2" />
            <path d="M 20 165 H 250 M 35 200 V 10" stroke="currentColor" strokeOpacity="0.35" fill="none" />
            <g className="graph-labels" fill="currentColor"><text x="243" y="182">x</text><text x="20" y="18">y</text><text x="26" y="182">0</text><text x="110" y="183">2</text><text x="150" y="183">3</text></g>
            <path d="M 35 -75 Q 135 425 235 -75" clipPath="url(#preview-graph-clip)" fill="none" stroke="var(--landing-graph)" strokeWidth="2.5" />
            <circle cx="115" cy="165" r={active === 2 ? 5 : 3.5} fill="var(--landing-graph)" /><circle cx="155" cy="165" r={active === 2 ? 5 : 3.5} fill="var(--landing-graph)" />
          </svg>
        </div>
        <div className="preview-slide-bottom"><span>{preview.subtitle}</span><span>SolveMath</span></div>
      </div>
      <div className="preview-controls"><div className="preview-pagination" aria-label="Preview slides">{previews.map((item, index) => <button type="button" key={item.title} aria-label={`Preview slide ${index + 1}: ${item.title}`} aria-pressed={active === index} onClick={() => setActive(index)}><span>0{index + 1}</span></button>)}</div><div className="preview-arrows"><button type="button" aria-label="Previous preview slide" onClick={() => setActive((active + previews.length - 1) % previews.length)}><ChevronLeft size={16} /></button><button type="button" aria-label="Next preview slide" onClick={() => setActive((active + 1) % previews.length)}><ChevronRight size={16} /></button></div></div>
      <div className="preview-caption"><span><PenLine size={13} aria-hidden="true" />Editable slides. Your way of explaining.</span><Link href="/presentation?demo=1"><Play size={11} aria-hidden="true" />Try it</Link></div>
    </div>
  );
}
