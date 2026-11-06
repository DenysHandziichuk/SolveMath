"use client";

import { useId, useState, type ClipboardEvent } from "react";
import { ChartNoAxesCombined, Plus, Trash2 } from "lucide-react";
import type { GraphData } from "@/lib/graph-data";
import { createSlideTable, MAX_SLIDE_TABLES, MAX_TABLE_CELL_LENGTH, MAX_TABLE_COLUMNS, MAX_TABLE_ROWS, MAX_TABLE_TITLE_LENGTH, pasteTableCells, plotTableValues, type SlideTable, type TableKind } from "@/lib/slide-tables";
import { MathTable } from "./MathTable";

interface TableEditorProps {
  tables: SlideTable[];
  onChange: (tables: SlideTable[]) => void;
  onPlot?: (graph: GraphData) => string | null;
}

const NAMES: Record<TableKind, string> = { values: "Value table", sign: "Sign table", custom: "Blank table" };

function TableFields({ table, index, onChange, onRemove, onPlot }: { table: SlideTable; index: number; onChange: (table: SlideTable) => void; onRemove: () => void; onPlot?: TableEditorProps["onPlot"] }) {
  const id = useId();
  const [activeCell, setActiveCell] = useState<{ row: number; column: number } | null>(null);
  const [xColumn, setXColumn] = useState(0);
  const [yColumn, setYColumn] = useState(1);
  const [connect, setConnect] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; error: boolean } | null>(null);
  const selectedX = Math.min(xColumn, table.headers.length - 1);
  const selectedY = Math.min(yColumn, table.headers.length - 1);
  const change = (next: SlideTable) => { onChange(next); setFeedback(null); };
  const changeCell = (row: number, column: number, value: string) => {
    if (row >= table.rows.length || column >= table.headers.length) return;
    if (row === -1) change({ ...table, headers: table.headers.map((cell, c) => c === column ? value : cell) });
    else change({ ...table, rows: table.rows.map((cells, r) => r === row ? cells.map((cell, c) => c === column ? value : cell) : cells) });
  };
  const paste = (event: ClipboardEvent<HTMLInputElement>, row: number, column: number) => {
    const text = event.clipboardData.getData("text/plain");
    if (!/[\t\r\n]/.test(text)) return;
    event.preventDefault();
    const result = pasteTableCells(table, text, row, column);
    if (result.table) { change(result.table); setFeedback({ text: "Pasted cells. Existing values outside the pasted area are kept.", error: false }); }
    else setFeedback({ text: result.error, error: true });
  };
  const canInsertSign = activeCell && activeCell.row < table.rows.length && activeCell.column < table.headers.length && !(table.firstColumnHeader && activeCell.column === 0);

  return <fieldset className="table-editor-card graph-fieldset">
    <legend>Table {index + 1} · {NAMES[table.kind]}</legend>
    <div className="table-editor-heading">
      <label className="studio-label"><span>Table title (optional)</span><input value={table.title || ""} maxLength={MAX_TABLE_TITLE_LENGTH} placeholder="Add a table title" onChange={(event) => change({ ...table, title: event.target.value })} /></label>
      <button type="button" className="studio-quiet-button" aria-label={`Remove table ${index + 1}`} onClick={onRemove}><Trash2 size={14} aria-hidden="true" />Remove</button>
    </div>
    <p id={`${id}-help`} className="studio-help">Edit any cell. Use $...$ for math. Paste cells from a spreadsheet, starting at a heading or data cell.</p>
    <div className="table-editor-scroll" role="region" aria-label={`Edit table ${index + 1} cells`} tabIndex={0}>
      <table className="table-editor-grid" aria-describedby={`${id}-help`}>
        <caption className="sr-only">Editable headers and values for table {index + 1}</caption>
        <thead><tr><th scope="col" className="table-editor-row-control"><span className="sr-only">Row</span></th>{table.headers.map((header, column) => <th scope="col" key={column}>
          <div className="table-editor-column-heading"><span>Column {column + 1}</span><button type="button" className="table-cell-remove" aria-label={`Remove column ${column + 1}`} disabled={table.headers.length <= 2} onClick={() => {
            change({ ...table, headers: table.headers.filter((_, c) => c !== column), rows: table.rows.map((row) => row.filter((_, c) => c !== column)) }); setActiveCell(null);
          }}><Trash2 size={12} aria-hidden="true" /></button></div>
          <input aria-label={`Column ${column + 1} heading`} value={header} maxLength={MAX_TABLE_CELL_LENGTH} placeholder={table.kind === "sign" && column > 0 ? "e.g. $x < -3$" : "Heading"} spellCheck={false} onFocus={() => setActiveCell(null)} onChange={(event) => changeCell(-1, column, event.target.value)} onPaste={(event) => paste(event, -1, column)} />
        </th>)}</tr></thead>
        <tbody>{table.rows.map((row, rowIndex) => <tr key={rowIndex}>
          <th scope="row" className="table-editor-row-control"><span>{rowIndex + 1}</span><button type="button" className="table-cell-remove" aria-label={`Remove row ${rowIndex + 1}`} disabled={table.rows.length <= 1} onClick={() => { change({ ...table, rows: table.rows.filter((_, r) => r !== rowIndex) }); setActiveCell(null); }}><Trash2 size={12} aria-hidden="true" /></button></th>
          {row.map((cell, column) => <td key={column}><input value={cell} maxLength={MAX_TABLE_CELL_LENGTH} aria-label={`Row ${rowIndex + 1}, column ${column + 1}`} placeholder={table.firstColumnHeader && column === 0 ? "Row heading" : ""} spellCheck={false} onFocus={() => setActiveCell({ row: rowIndex, column })} onChange={(event) => changeCell(rowIndex, column, event.target.value)} onPaste={(event) => paste(event, rowIndex, column)} /></td>)}
        </tr>)}</tbody>
      </table>
    </div>
    <div className="table-editor-actions">
      <button type="button" className="studio-secondary-button" disabled={table.rows.length >= MAX_TABLE_ROWS} onClick={() => change({ ...table, rows: [...table.rows, table.headers.map(() => "")] })}><Plus size={13} aria-hidden="true" />Add row</button>
      <button type="button" className="studio-secondary-button" disabled={table.headers.length >= MAX_TABLE_COLUMNS} onClick={() => change({ ...table, headers: [...table.headers, ""], rows: table.rows.map((row) => [...row, ""]) })}><Plus size={13} aria-hidden="true" />Add column</button>
      <span className="studio-help">{table.rows.length}/{MAX_TABLE_ROWS} rows · {table.headers.length}/{MAX_TABLE_COLUMNS} columns</span>
    </div>
    <label className="graph-checkbox"><input type="checkbox" checked={table.firstColumnHeader} onChange={(event) => change({ ...table, firstColumnHeader: event.target.checked })} />Use the first column as row headings</label>
    {table.kind === "sign" && <div className="table-sign-tools">
      <p className="studio-help">Select a data cell, then choose a symbol or type your own.</p>
      <div className="table-editor-actions">{[{ value: "+", name: "Positive", label: "+" }, { value: "−", name: "Negative", label: "−" }, { value: "0", name: "Zero", label: "0" }, { value: "Undefined", name: "Undefined", label: "Undefined" }, { value: "", name: "Clear cell", label: "Clear" }].map((symbol) => <button type="button" key={symbol.name} className="studio-secondary-button" disabled={!canInsertSign} aria-label={symbol.name} onClick={() => { if (activeCell) changeCell(activeCell.row, activeCell.column, symbol.value); }}>{symbol.label}</button>)}</div>
    </div>}
    <details className="table-preview"><summary>Preview formatted table</summary><MathTable table={table} index={index} /></details>
    {onPlot && table.kind !== "sign" && <details className="table-plot-options">
      <summary>Plot values on this slide</summary>
      <div className="graph-number-grid">
        <label className="studio-label"><span>x column</span><select aria-label="Column for x values" value={selectedX} onChange={(event) => setXColumn(Number(event.target.value))}>{table.headers.map((header, column) => <option key={column} value={column}>{column + 1}: {header || "Untitled"}</option>)}</select></label>
        <label className="studio-label"><span>y column</span><select aria-label="Column for y values" value={selectedY} onChange={(event) => setYColumn(Number(event.target.value))}>{table.headers.map((header, column) => <option key={column} value={column}>{column + 1}: {header || "Untitled"}</option>)}</select></label>
      </div>
      <label className="graph-checkbox"><input type="checkbox" checked={connect} onChange={(event) => setConnect(event.target.checked)} />Join points in row order</label>
      <p className="studio-help">Use numbers or fractions, such as −2, 0.5, or 1/3. Rows with both selected cells blank are skipped.</p>
      <button type="button" className="studio-secondary-button" onClick={() => {
        const result = plotTableValues(table, selectedX, selectedY, connect);
        if (!result.graph) { setFeedback({ text: result.error, error: true }); return; }
        const error = onPlot(result.graph);
        setFeedback({ text: error || `Added ${result.graph.points!.length} points to the slide.`, error: Boolean(error) });
      }}><ChartNoAxesCombined size={14} aria-hidden="true" />Add plot to slide</button>
      <p className="studio-help">The graph is a copy of these values. After changing the table, remove the old graph and add a new plot.</p>
    </details>}
    {feedback && <p role={feedback.error ? "alert" : "status"} className={feedback.error ? "studio-field-error" : "studio-help"}>{feedback.text}</p>}
  </fieldset>;
}

export function TableEditor({ tables, onChange, onPlot }: TableEditorProps) {
  return <div className="table-editor">
    {!tables.length && <p className="studio-help">Choose a starting table. Values and signs are yours to fill in.</p>}
    {tables.map((table, index) => <TableFields key={index} table={table} index={index} onChange={(next) => onChange(tables.map((existing, i) => i === index ? next : existing))} onRemove={() => onChange(tables.filter((_, i) => i !== index))} onPlot={onPlot} />)}
    <div className="table-editor-actions">{(["values", "sign", "custom"] as TableKind[]).map((kind) => <button key={kind} type="button" disabled={tables.length >= MAX_SLIDE_TABLES} className="studio-secondary-button" onClick={() => onChange([...tables, createSlideTable(kind)])}><Plus size={13} aria-hidden="true" />{NAMES[kind]}</button>)}</div>
    <p className="studio-help">Up to {MAX_SLIDE_TABLES} tables per slide. Split larger tables across slides for readable text.</p>
  </div>;
}
