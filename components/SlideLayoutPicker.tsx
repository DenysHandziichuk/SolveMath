"use client";

import { useRef } from "react";
import { SLIDE_TEMPLATES, type SlideTemplate } from "@/lib/presentation";

function GraphSketch() {
  return <svg viewBox="0 0 64 44" aria-hidden="true"><path d="M8 4v32h50" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.4" /><path d="M11 29C21 29 22 8 32 8S44 29 56 12" fill="none" stroke="currentColor" strokeWidth="2.5" /></svg>;
}

export function SlideLayoutPicker({ value, onChange, disabled = false }: { value: SlideTemplate; onChange: (layout: SlideTemplate) => void; disabled?: boolean }) {
  const browser = useRef<HTMLDetailsElement>(null);
  return <details ref={browser} className="slide-layout-browser">
    <summary><span>Slide layout</span><strong>{SLIDE_TEMPLATES.find((template) => template.id === value)?.name}</strong><span>Change layout</span></summary>
    <fieldset className="slide-layout-picker" disabled={disabled}>
    <legend>Choose a layout</legend>
    <div className="slide-layout-options">
      {SLIDE_TEMPLATES.map((template) => <button key={template.id} type="button" aria-pressed={value === template.id} onClick={() => { onChange(template.id); if (browser.current) browser.current.open = false; }} className="slide-layout-option" title={template.description}>
        <span className="layout-sketch" data-layout={template.id} aria-hidden="true">
          <span className="layout-sketch-title" />
          <span className="layout-sketch-text" />
          <span className="layout-sketch-second-text" />
          <span className="layout-sketch-graph"><GraphSketch /></span>
          <span className="layout-sketch-second-graph"><GraphSketch /></span>
          <span className="layout-sketch-table" />
        </span>
        <span className="slide-layout-name">{template.name}</span>
        <span className="slide-layout-description">{template.description}</span>
      </button>)}
    </div>
    <p className="studio-help">You can switch layouts later. Your text, graphs, and tables are kept when you switch back.</p>
    </fieldset>
  </details>;
}
