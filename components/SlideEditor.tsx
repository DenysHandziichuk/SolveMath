"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import type { Slide } from "./SolutionDisplay";

interface SlideEditorProps {
  slide: Slide;
  onSave: (slide: Slide) => void;
  onCancel: () => void;
}

export function SlideEditor({ slide, onSave, onCancel }: SlideEditorProps) {
  const [draft, setDraft] = useState(slide);
  const [error, setError] = useState("");
  const update = (field: "title" | "subtitle" | "content" | "notes", value: string) => {
    setDraft((current) => ({ ...current, [field]: value }));
    setError("");
  };

  return (
    <form className="slide-editor studio-form presenter-card space-y-3" onSubmit={(event) => {
      event.preventDefault();
      if (!draft.title.trim()) { setError("Give this slide a title before saving."); return; }
      onSave({ ...draft, title: draft.title.trim() });
    }} onKeyDown={(event) => { if (event.key === "Escape") { event.stopPropagation(); onCancel(); } }}>
      <div className="flex items-center justify-between gap-2"><h3 className="text-sm font-semibold">Edit slide</h3><button type="button" aria-label="Cancel slide edits" onClick={onCancel} className="drawing-icon-button"><X className="h-4 w-4" /></button></div>
      <label className="studio-label"><span>Title</span><input autoFocus value={draft.title} onChange={(event) => update("title", event.target.value)} aria-invalid={!!error} aria-describedby={error ? "slide-title-error" : undefined} /></label>
      <label className="studio-label"><span>Subtitle</span><input value={draft.subtitle || ""} onChange={(event) => update("subtitle", event.target.value)} /></label>
      <label className="studio-label"><span>Slide content</span><textarea aria-label="Slide content" rows={7} value={draft.content} onChange={(event) => update("content", event.target.value)} aria-describedby="slide-math-hint" /></label>
      <p id="slide-math-hint" className="studio-help">Use $x^2$ for inline math, $$x^2$$ for a displayed equation, and **text** for bold. New lines are preserved.</p>
      <label className="studio-label"><span>Speaker notes</span><textarea aria-label="Speaker notes" rows={4} value={draft.notes} onChange={(event) => update("notes", event.target.value)} /></label>
      {error && <p id="slide-title-error" role="alert" className="studio-field-error">{error}</p>}
      <div className="studio-form-actions"><button type="submit" className="studio-button"><Check className="h-3.5 w-3.5" />Save changes</button><button type="button" onClick={onCancel} className="studio-quiet-button">Cancel</button></div>
      <p className="studio-help">Save or cancel to continue to another slide.</p>
    </form>
  );
}
