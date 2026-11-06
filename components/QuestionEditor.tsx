"use client";

import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { MathRenderer } from "./MathRenderer";
import { TableEditor } from "./TableEditor";
import type { SlideTable } from "@/lib/slide-tables";

interface QuestionEditorProps {
  id: string;
  label: string;
  text: string;
  visualContext?: string;
  tables?: SlideTable[];
  onSave: (text: string, visualContext?: string, tables?: SlideTable[]) => void;
  onCancel: () => void;
}

export function QuestionEditor({ id, label, text, visualContext, tables, onSave, onCancel }: QuestionEditorProps) {
  const [draft, setDraft] = useState(text);
  const [visualDraft, setVisualDraft] = useState(visualContext || "");
  const [tableDraft, setTableDraft] = useState(tables || []);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isEmpty = draft.trim().length === 0;

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  return (
    <form
      id={id}
      aria-label={"Edit " + label}
      className="studio-form space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (!isEmpty) onSave(draft.trim(), visualDraft.trim() || undefined, tableDraft);
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape" && !event.nativeEvent.isComposing) {
          event.preventDefault();
          onCancel();
        }
      }}
    >
      <div className="space-y-2">
        <label htmlFor={id + "-text"} className="studio-label">
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
          className="studio-input"
        />
        <p id={id + "-hint"} className="studio-help">
          Include the full question and all its parts. Use $...$ around math.
        </p>
        {isEmpty && (
          <p id={id + "-error"} role="alert" className="studio-field-error">
            Enter a problem before saving.
          </p>
        )}
      </div>

      {visualContext !== undefined && <label className="studio-label"><span>Graph observations & table values</span><textarea value={visualDraft} onChange={(event) => setVisualDraft(event.target.value)} rows={6} /><span className="studio-help">Preserve graph labels, intervals, and every table cell. Say when a value is approximate or unreadable.</span></label>}

      <details className="question-table-editor" open={tables?.length ? true : undefined}><summary>Edit or add tables</summary><TableEditor tables={tableDraft} onChange={setTableDraft} /></details>

      {!isEmpty && (
        <div className="min-w-0 space-y-2">
          <p className="studio-help">Preview</p>
          <div className="question-edit-preview">
            <MathRenderer text={draft} />
          </div>
        </div>
      )}

      <div className="studio-form-actions">
        <button
          type="button"
          onClick={onCancel}
          className="studio-quiet-button"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isEmpty}
          className="studio-button"
        >
          <Check aria-hidden="true" className="h-4 w-4" />
          Save changes
        </button>
      </div>
    </form>
  );
}
