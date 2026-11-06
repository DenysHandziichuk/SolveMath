"use client";

import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import type { SlideTable } from "@/lib/slide-tables";
import { MathRenderer } from "./MathRenderer";

export function MathTable({ table, index = 0 }: { table: SlideTable; index?: number }) {
  const cellContent = (text: string, blank: string) => text.trim() ? <MathRenderer text={text} /> : <><span className="sr-only">{blank}</span><span aria-hidden="true">&nbsp;</span></>;
  return <table className="math-table" data-kind={table.kind}>
    <caption className={table.title?.trim() ? undefined : "sr-only"}>{table.title?.trim() ? <MathRenderer text={table.title} /> : `Table ${index + 1}: ${table.kind === "sign" ? "signs and intervals" : table.kind === "values" ? "values" : "data"}`}</caption>
    <thead><tr>{table.headers.map((header, column) => <th scope="col" key={column}>{cellContent(header, `Column ${column + 1}`)}</th>)}</tr></thead>
    <tbody>{table.rows.map((row, r) => <tr key={r}>{row.map((cell, c) => table.firstColumnHeader && c === 0 ? <th scope="row" key={c}>{cellContent(cell, `Row ${r + 1}`)}</th> : <td key={c}>{cellContent(cell, "Blank")}</td>)}</tr>)}</tbody>
  </table>;
}

/** Fit within the fixed slide coordinates so table content and saved ink scale together. */
export function SlideTables({ tables, accent, fontSize, showFitWarning }: { tables: SlideTable[]; accent: string; fontSize: number; showFitWarning: boolean }) {
  const areaRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useLayoutEffect(() => {
    const area = areaRef.current, sheet = sheetRef.current;
    if (!area || !sheet) return;
    const observer = new ResizeObserver(() => {
      const next = Math.min(1, area.clientWidth / Math.max(sheet.scrollWidth, 1), area.clientHeight / Math.max(sheet.offsetHeight, 1));
      setScale((current) => Math.abs(current - next) > 0.002 ? next : current);
    });
    observer.observe(area);
    observer.observe(sheet);
    return () => observer.disconnect();
  }, []);
  return <div ref={areaRef} className="slide-tables-fit" style={{ "--table-accent": accent, fontSize } as CSSProperties}>
    <div ref={sheetRef} className="slide-tables-sheet" style={{ transform: `scale(${scale})` }}>{tables.map((table, index) => <MathTable key={index} table={table} index={index} />)}</div>
    {showFitWarning && scale < 0.65 && <span className="slide-table-fit-warning">For larger text, use fewer cells or split this table across slides.</span>}
  </div>;
}
