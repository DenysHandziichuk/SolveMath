import { parse } from "mathjs";
import type { GraphData, GraphFunction, GraphPoint } from "./graph-data";

const allowedFunctions = new Set(["sin", "cos", "tan", "asin", "acos", "atan", "sinh", "cosh", "tanh", "sec", "csc", "cot", "sqrt", "abs", "exp", "log", "log10", "ln", "floor", "ceil", "round", "sign", "min", "max"]);
const allowedSymbols = new Set(["x", "t", "pi", "e", ...allowedFunctions]);

export function compileGraphExpression(expression: string) {
  if (!expression.trim() || expression.length > 500) throw new Error("Enter an expression of up to 500 characters, such as x^2 or 1/x.");
  const node = parse(expression.replace(/\bln\s*\(/g, "log("));
  let count = 0;
  node.traverse((child) => {
    if (++count > 150 || !["OperatorNode", "ConstantNode", "SymbolNode", "ParenthesisNode", "FunctionNode"].includes(child.type)) {
      throw new Error("Use a mathematical expression in x, such as x^2, sin(x), or 1/(x-1).");
    }
    if (child.type === "SymbolNode" && !allowedSymbols.has(String(child))) throw new Error(`Unknown symbol: ${child}. Use x, t, pi, or e.`);
    if (child.type === "FunctionNode" && !allowedFunctions.has((child as unknown as { fn: { name: string } }).fn.name)) throw new Error("This function is not supported in a graph.");
  });
  return node.compile();
}

/** Split only a top-level comma; log(x, 2) is not a parametric curve. */
export function splitGraphExpression(expression: string): string[] {
  let depth = 0;
  for (let index = 0; index < expression.length; index++) {
    if (expression[index] === "(") depth++;
    else if (expression[index] === ")") depth--;
    else if (expression[index] === "," && depth === 0) return [expression.slice(0, index), expression.slice(index + 1)];
  }
  return [expression];
}

export function validateGraphExpression(expression: string): string | null {
  try {
    splitGraphExpression(expression).forEach(compileGraphExpression);
    return null;
  } catch (error) { return error instanceof Error ? error.message : "Check this expression."; }
}

/** Nulls preserve gaps, including values outside the real domain. */
export function sampleGraphFunction(fn: GraphFunction, bounds: NonNullable<GraphData["bounds"]>): (GraphPoint | null)[] {
  if (!fn.mathjs) return (fn.points || []).map((point) =>
    Number.isFinite(point.x) && Number.isFinite(point.y) && point.x >= (fn.domain?.min ?? -Infinity) && point.x <= (fn.domain?.max ?? Infinity) ? point : null);
  try {
    const expressions = splitGraphExpression(fn.mathjs).map(compileGraphExpression);
    const parametric = expressions.length === 2;
    const min = Math.max(parametric ? 0 : bounds.minX, fn.domain?.min ?? -Infinity);
    const max = Math.min(parametric ? 2 * Math.PI : bounds.maxX, fn.domain?.max ?? Infinity);
    if (min >= max) return [];
    return Array.from({ length: 641 }, (_, index) => {
      const input = min + (max - min) * index / 640;
      try {
        const scope = { x: input, t: input, pi: Math.PI, e: Math.E };
        const x = parametric ? expressions[0].evaluate(scope) : input;
        const y = expressions[parametric ? 1 : 0].evaluate(scope);
        return typeof x === "number" && typeof y === "number" && Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
      } catch { return null; }
    });
  } catch { return fn.points || []; }
}

export function graphSegments(samples: (GraphPoint | null)[], bounds: NonNullable<GraphData["bounds"]>, asymptotes: GraphData["asymptotes"] = []): GraphPoint[][] {
  const segments: GraphPoint[][] = [];
  let segment: GraphPoint[] = [];
  let previous: GraphPoint | null = null;
  const poles = asymptotes.filter((item) => item.type === "vertical").map((item) => Number(item.value)).filter(Number.isFinite);
  const finish = () => { if (segment.length) segments.push(segment); segment = []; previous = null; };
  for (const point of samples) {
    if (!point) { finish(); continue; }
    if (previous && (Math.abs(point.y - previous.y) > (bounds.maxY - bounds.minY) * 1.5 ||
      poles.some((pole) => (previous!.x <= pole && point.x >= pole) || (previous!.x >= pole && point.x <= pole)))) finish();
    segment.push(point);
    previous = point;
  }
  finish();
  return segments;
}
