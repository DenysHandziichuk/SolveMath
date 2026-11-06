"use client";

import { useState } from "react";
import { normalizeGraphImage, type GraphImage as GraphImageData } from "@/lib/graph-image";
import { MathRenderer } from "./MathRenderer";
import { cn } from "@/lib/utils";

export function GraphImage({ image, title, compact = false }: { image: GraphImageData; title?: string; compact?: boolean }) {
  const [failed, setFailed] = useState(false);
  const valid = normalizeGraphImage(image);
  return <figure className={cn("math-graph graph-card graph-image-card", compact && "graph-card-compact")} data-compact={compact}>
    {title && <figcaption className="graph-card-heading"><MathRenderer text={title} inline /></figcaption>}
    <div className="graph-image-frame">
      {valid && !failed ?
        // Images stay inside the presentation as data URLs; no remote optimization is needed.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={valid.src} alt={valid.alt || title || "Graph image"} width={valid.width} height={valid.height} className="graph-static-image" onError={() => setFailed(true)} />
        : <p role="alert" className="graph-image-error">This image couldn’t be displayed. Edit the slide to replace it.</p>}
    </div>
  </figure>;
}
