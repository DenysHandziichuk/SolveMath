import type { QuestionVisuals } from "./graph-data";
import { getQuestionPartLabels, type ExtractedSolution } from "./json-extractor";

/** Source diagrams and table cells belong on the problem slide, even when the model omits them. */
export function applyQuestionVisuals(solution: ExtractedSolution, visuals: QuestionVisuals): ExtractedSolution {
  const sourceGraphs = visuals.graphs || [];
  const sourceTables = visuals.tables || [];
  if (!sourceGraphs.length && !sourceTables.length && !visuals.visualContext) return solution;
  const firstSolution = solution.slides.findIndex((slide) => slide.type === "solution");
  return { ...solution, slides: solution.slides.map((slide, index) => {
    if (index === 0) return {
      ...slide,
      ...(visuals.visualContext ? { visualContext: visuals.visualContext } : {}),
      ...(sourceGraphs.length ? { graphs: sourceGraphs, graphData: undefined, layout: sourceGraphs.length > 1 ? "graphs" as const : "split" as const } : {}),
      ...(sourceTables.length ? { tables: sourceTables, layout: sourceGraphs.length || slide.graphs?.length || slide.graphData ? "table-graph" as const : "table" as const } : {}),
    };
    if (slide.type !== "solution") return slide;
    const labels = getQuestionPartLabels(`${slide.subtitle || ""}\n${slide.content}`);
    const relevant = <T extends { title?: string }>(items: T[]) => {
      const matching = items.filter((item) => {
        const itemLabels = getQuestionPartLabels(`${item.title || ""} `);
        const simple = item.title?.match(/^(?:graph|table|part|case)?\s*\(?([a-z]|[ivxlcdm]+)\)?[.:]?$/i)?.[1]?.toLowerCase();
        return labels.some((label) => itemLabels.includes(label) || simple === label);
      });
      return matching.length ? matching : index === firstSolution && labels.length === 0 ? items : [];
    };
    const graphs = slide.graphs?.length || slide.graphData ? [] : relevant(sourceGraphs);
    const tables = slide.tables?.length ? [] : relevant(sourceTables);
    if (!graphs.length && !tables.length) return slide;
    const hasGraphs = Boolean(graphs.length || slide.graphs?.length || slide.graphData);
    const hasTables = Boolean(tables.length || slide.tables?.length);
    return { ...slide, ...(graphs.length ? { graphs } : {}), ...(tables.length ? { tables } : {}), layout: hasTables ? (hasGraphs ? "table-graph" : "table") : (graphs.length > 1 ? "graphs" : "split") };
  }) };
}
