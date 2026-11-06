import type { GraphData } from "./graph-data";

export type TableKind = "values" | "sign" | "custom";

export interface SlideTable {
  kind: TableKind;
  title?: string;
  headers: string[];
  rows: string[][];
  firstColumnHeader: boolean;
}

export const MAX_SLIDE_TABLES = 2;
export const MAX_TABLE_COLUMNS = 8;
export const MAX_TABLE_ROWS = 12;
export const MAX_TABLE_CELL_LENGTH = 160;
export const MAX_TABLE_TITLE_LENGTH = 160;

export function createSlideTable(kind: TableKind): SlideTable {
  if (kind === "sign") return {
    kind, title: "", firstColumnHeader: true,
    headers: ["Interval", "", "", ""],
    rows: [["Sign of $f(x)$", "", "", ""], ["Sign of slope", "", "", ""], ["Change in slope", "", "", ""]],
  };
  return { kind, title: "", firstColumnHeader: false, headers: kind === "values" ? ["$x$", "$f(x)$"] : ["", ""], rows: Array.from({ length: kind === "values" ? 4 : 2 }, () => ["", ""]) };
}

/** Reject malformed or oversized tables as a whole; never drop individual givens. */
export function tableValidationError(value: unknown): string | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "This table couldn’t be read.";
  const table = value as Record<string, unknown>;
  if (typeof table.kind !== "string" || !["values", "sign", "custom"].includes(table.kind)) return "Choose a value, sign, or blank table.";
  if (table.title !== undefined && (typeof table.title !== "string" || table.title.length > MAX_TABLE_TITLE_LENGTH)) return "Keep the table title under 160 characters.";
  if (typeof table.firstColumnHeader !== "boolean") return "Choose whether the first column contains row headings.";
  if (!Array.isArray(table.headers) || table.headers.length < 2 || table.headers.length > MAX_TABLE_COLUMNS) return `Use 2–${MAX_TABLE_COLUMNS} columns per table.`;
  if (!Array.isArray(table.rows) || !table.rows.length || table.rows.length > MAX_TABLE_ROWS) return `Use 1–${MAX_TABLE_ROWS} rows per table.`;
  const validCell = (cell: unknown) => typeof cell === "string" && cell.length <= MAX_TABLE_CELL_LENGTH;
  if (!table.headers.every(validCell) || !table.rows.every((row) => Array.isArray(row) && row.length === (table.headers as unknown[]).length && row.every(validCell))) return `Keep each cell under ${MAX_TABLE_CELL_LENGTH} characters and give every row the same number of cells.`;
  return null;
}

export function normalizeSlideTable(value: unknown): SlideTable | undefined {
  if (tableValidationError(value)) return undefined;
  const table = value as SlideTable;
  return { kind: table.kind, ...(table.title !== undefined ? { title: table.title } : {}), headers: [...table.headers], rows: table.rows.map((row) => [...row]), firstColumnHeader: table.firstColumnHeader };
}

export function normalizeSlideTables(value: unknown): SlideTable[] {
  if (!Array.isArray(value) || value.length > MAX_SLIDE_TABLES) return [];
  return value.map(normalizeSlideTable).filter((table): table is SlideTable => Boolean(table));
}

/** Header row is -1; pasted spreadsheet cells grow the grid without shifting existing cells. */
export function pasteTableCells(table: SlideTable, text: string, row: number, column: number): { table: SlideTable; error?: never } | { error: string; table?: never } {
  if (row < -1 || row >= table.rows.length || column < 0 || column >= table.headers.length) return { error: "Select a cell before pasting." };
  if (text.length > (MAX_TABLE_ROWS + 1) * MAX_TABLE_COLUMNS * (MAX_TABLE_CELL_LENGTH + 1)) return { error: "This paste is too large. Split the table across slides." };
  const cells = text.replace(/\r\n?/g, "\n").replace(/\n$/, "").split("\n").map((line) => line.split("\t"));
  const width = Math.max(table.headers.length, column + Math.max(...cells.map((line) => line.length)));
  const height = Math.max(table.rows.length, row + cells.length);
  if (width > MAX_TABLE_COLUMNS || height > MAX_TABLE_ROWS) return { error: `Paste up to ${MAX_TABLE_COLUMNS} columns and ${MAX_TABLE_ROWS} rows. Split larger tables across slides.` };
  if (cells.some((line) => line.some((cell) => cell.length > MAX_TABLE_CELL_LENGTH))) return { error: `Keep each pasted cell under ${MAX_TABLE_CELL_LENGTH} characters.` };
  const result: SlideTable = { ...table, headers: Array.from({ length: width }, (_, c) => table.headers[c] || ""), rows: Array.from({ length: height }, (_, r) => Array.from({ length: width }, (_, c) => table.rows[r]?.[c] || "")) };
  cells.forEach((line, r) => line.forEach((cell, c) => {
    const destination = row + r;
    if (destination === -1) result.headers[column + c] = cell;
    else result.rows[destination][column + c] = cell;
  }));
  return { table: result };
}

/** Numeric cells can contain decimals, scientific notation, or a single fraction. */
export function parseTableNumber(text: string): number | null {
  let value = text.trim().replace(/−/g, "-");
  if (value.startsWith("$$") && value.endsWith("$$")) value = value.slice(2, -2).trim();
  else if (value.startsWith("$") && value.endsWith("$")) value = value.slice(1, -1).trim();
  else if (value.startsWith("\\(") && value.endsWith("\\)")) value = value.slice(2, -2).trim();
  const literal = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i;
  const fraction = value.match(/^([+-]?)\\(?:dfrac|tfrac|frac)\{([^{}]+)\}\{([^{}]+)\}$/);
  const parts = (fraction ? [fraction[2], fraction[3]] : value.split("/")).map((part) => part.trim());
  if (parts.length > 2 || !parts.every((part) => literal.test(part))) return null;
  const result = (fraction?.[1] === "-" ? -1 : 1) * Number(parts[0]) / (parts.length === 2 ? Number(parts[1]) : 1);
  return Number.isFinite(result) && Math.abs(result) <= 1e12 ? result : null;
}

export function plotTableValues(table: SlideTable, xColumn = 0, yColumn = 1, connect = false): { graph: GraphData; error?: never } | { error: string; graph?: never } {
  if (xColumn === yColumn || !Number.isInteger(xColumn) || !Number.isInteger(yColumn) || xColumn < 0 || yColumn < 0 || xColumn >= table.headers.length || yColumn >= table.headers.length) return { error: "Choose two different columns for x and y." };
  if (table.kind === "sign") return { error: "Sign tables describe intervals. Use a value table to plot coordinates." };
  const points: { x: number; y: number }[] = [];
  for (let row = 0; row < table.rows.length; row++) {
    const xText = table.rows[row][xColumn];
    const yText = table.rows[row][yColumn];
    if (!xText.trim() && !yText.trim()) continue;
    const x = parseTableNumber(xText);
    const y = parseTableNumber(yText);
    if (x === null || y === null) return { error: `Check row ${row + 1}: both selected columns need numbers or fractions between −10¹² and 10¹². Leave both cells blank to skip a row.` };
    points.push({ x, y });
  }
  if (!points.length) return { error: "Enter at least one complete pair of numeric values before plotting." };
  const axis = (values: number[]) => {
    const min = Math.min(0, ...values), max = Math.max(0, ...values);
    const padding = (max - min || 2) * 0.12;
    return { min: min - padding, max: max + padding };
  };
  const x = axis(points.map((point) => point.x)), y = axis(points.map((point) => point.y));
  return { graph: {
    title: table.title?.trim() || "Table of values", type: "table-values", points,
    description: `Plotted table values: x from column ${xColumn + 1}, y from column ${yColumn + 1}.${connect ? " Points are joined in row order." : " Points are not joined."}`,
    bounds: { minX: x.min, maxX: x.max, minY: y.min, maxY: y.max },
    ...(connect && points.length > 1 ? { functions: [{ points, color: "#38bdf8" }] } : {}),
  } };
}
