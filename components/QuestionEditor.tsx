"use client";

import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { MathRenderer } from "./MathRenderer";

interface QuestionEditorProps {
  id: string;
  label: string;
  text: string;
  onSave: (text: string) => void;
  onCancel: () => void;
}

export function QuestionEditor({ id, label, text, onSave, onCancel }: QuestionEditorProps) {
  const [draft, setDraft] = useState(text);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isEmpty = draft.trim().length === 0;

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  return (
    <form
      id={id}
      aria-label={"Edit " + label}
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (!isEmpty) onSave(draft.trim());
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && !event.nativeEvent.isComposing) {
          event.preventDefault();
          onCancel();
        }
      }}
    >
      <div className="space-y-2">
        <label htmlFor={id + "-text"} className="block text-sm font-semibold text-slate-200">
          Problem text
        </label>
        <textarea
          ref={textareaRef}
          id={id + "-text"}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          rows={6}
          required
          spellCheck={false}
          aria-invalid={isEmpty || undefined}
          aria-describedby={id + "-hint" + (isEmpty ? " " + id + "-error" : "")}
          className="block w-full min-w-0 resize-y rounded-lg border border-slate-600 bg-slate-950/70 p-3 font-mono text-base leading-relaxed text-slate-100 outline-none focus-visible:border-blue-400 focus-visible:ring-2 focus-visible:ring-blue-400/40 sm:text-sm"
        />
        <p id={id + "-hint"} className="text-xs leading-relaxed text-slate-400">
          Include the full question and all its parts. Use $...$ around math.
        </p>
        {isEmpty && (
          <p id={id + "-error"} role="alert" className="text-xs text-red-400">
            Enter a problem before saving.
          </p>
        )}
      </div>

      {!isEmpty && (
        <div className="min-w-0 space-y-2">
          <p className="text-xs font-semibold text-slate-400">Preview</p>
          <div className="min-w-0 overflow-x-auto rounded-lg border border-slate-800 bg-slate-950/40 p-3 text-sm text-slate-100">
            <MathRenderer text={draft} />
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-800/80 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="min-h-11 rounded-lg px-4 py-2 text-sm font-semibold text-slate-300 transition-colors hover:bg-slate-800 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isEmpty}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Check aria-hidden="true" className="h-4 w-4" />
          Save changes
        </button>
      </div>
    </form>
  );
}
