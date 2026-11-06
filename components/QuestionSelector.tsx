"use client";

import { useId, useRef, useState } from "react";
import { ArrowRight, BookOpen, Pencil } from "lucide-react";
import { MathRenderer } from "./MathRenderer";
import { QuestionEditor } from "./QuestionEditor";
import { MathGraph } from "./MathGraph";
import { MathTable } from "./MathTable";
import type { ExtractedQuestion } from "@/lib/json-extractor";
import type { SlideTable } from "@/lib/slide-tables";

type Question = ExtractedQuestion;

interface QuestionSelectorProps {
  questions: Question[];
  onSelect: (question: Question) => void;
  onUpdate: (index: number, text: string, visualContext?: string, tables?: SlideTable[]) => void;
  isSolving: boolean;
}

export function QuestionSelector({ questions, onSelect, onUpdate, isSolving }: QuestionSelectorProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const editButtonRef = useRef<HTMLButtonElement | null>(null);
  const editorId = useId();
  const isEditing = editingIndex !== null;

  const closeEditor = () => {
    setEditingIndex(null);
    requestAnimationFrame(() => editButtonRef.current?.focus());
  };

  return (
    <div className="question-selector">
      <div className="question-list-heading">
        <div>
          <h2>Review your question.</h2>
          <p id={editorId + "-status"} role="status" className="studio-help">
            {isEditing
              ? "Save or cancel your changes before generating slides."
              : "Review or edit a problem, then generate presentation slides."}
          </p>
        </div>
        <span className="studio-tag">
          {questions.length} {questions.length === 1 ? "problem" : "problems"}
        </span>
      </div>

      <ul className="question-list">
        {questions.map((q, index) => {
          const label = q.id ? (/^\d+$/.test(q.id) ? "Problem " + q.id : q.id) : "Problem " + (index + 1);
          const isCurrentEditor = editingIndex === index;

          return (
            <li key={q.id || index}>
              <article
                aria-label={label}
                className={"question-card" + (isCurrentEditor ? " is-editing" : "")}
              >
                <div className="question-card-heading">
                  <span className="studio-tag">
                    <BookOpen aria-hidden="true" className="h-3 w-3 shrink-0" />
                    {q.type || "Algebra & Functions"}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="studio-help">{label}</span>
                    <button
                      type="button"
                      disabled={isSolving || isEditing}
                      aria-label={"Edit " + label}
                      aria-expanded={isCurrentEditor}
                      aria-controls={editorId + "-" + index}
                      aria-describedby={isEditing ? editorId + "-status" : undefined}
                      onClick={(event) => {
                        editButtonRef.current = event.currentTarget;
                        setEditingIndex(index);
                      }}
                      className="studio-quiet-button"
                    >
                      <Pencil aria-hidden="true" className="h-3.5 w-3.5" />
                      Edit
                    </button>
                  </div>
                </div>

                {isCurrentEditor ? (
                  <QuestionEditor
                    id={editorId + "-" + index}
                    label={label}
                    text={q.text}
                    visualContext={q.visualContext}
                    tables={q.tables}
                    onSave={(text, visualContext, tables) => {
                      onUpdate(index, text, visualContext, tables);
                      closeEditor();
                    }}
                    onCancel={closeEditor}
                  />
                ) : (
                  <>
                    <div className="question-content">
                      <MathRenderer text={q.text} />
                    </div>
                    {q.visualContext && <details className="question-visual-evidence" open><summary>Graph & table information</summary><MathRenderer text={q.visualContext} /><p className="studio-help">Check these observations before creating slides. Approximate sketches use schematic coordinates.</p></details>}
                    {!!q.tables?.length && <div className="question-table-previews">{q.tables.map((table, index) => <div className="question-table-preview" key={index}><MathTable table={table} index={index} /></div>)}</div>}
                    {!!q.graphs?.length && <div className="question-graph-previews">{q.graphs.map((graph, index) => <MathGraph key={index} {...graph} compact />)}</div>}
                    <button
                      type="button"
                      disabled={isSolving || isEditing}
                      aria-label={"Build presentation slides for " + label}
                      aria-describedby={isEditing ? editorId + "-status" : undefined}
                      onClick={() => onSelect(q)}
                      className="question-build-button"
                    >
                      <span>Create lesson slides</span>
                      <span>
                        <ArrowRight aria-hidden="true" className="h-4 w-4" />
                      </span>
                    </button>
                  </>
                )}
              </article>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

