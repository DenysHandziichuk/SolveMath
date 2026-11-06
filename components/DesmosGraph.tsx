"use client";

import { useState } from "react";
import { ExternalLink, Loader2, RotateCcw } from "lucide-react";
import { desmosEmbedUrl, normalizeDesmosUrl } from "@/lib/desmos";
import { MathRenderer } from "./MathRenderer";
import { cn } from "@/lib/utils";

export function DesmosGraph({ url, title, compact = false }: { url: string; title?: string; compact?: boolean }) {
  const source = normalizeDesmosUrl(url);
  const embed = desmosEmbedUrl(url);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [reload, setReload] = useState(0);

  return (
    <figure className={cn("math-graph graph-card desmos-graph", compact && "graph-card-compact")} data-compact={compact}>
      <figcaption className="graph-card-heading">
        <span><MathRenderer text={title || "Desmos graph"} inline /></span>
        <span className="desmos-badge">Desmos</span>
      </figcaption>
      {embed ? <div className="desmos-embed-shell">
        {!loaded && <div className="desmos-loading" role="status"><Loader2 size={20} className="animate-spin" aria-hidden="true" />Loading Desmos…</div>}
        <iframe
          key={reload}
          src={embed}
          title={title ? `Desmos graph: ${title}` : "Interactive Desmos graph"}
          className="desmos-iframe"
          style={{ opacity: loaded ? 1 : 0 }}
          referrerPolicy="no-referrer"
          onLoad={() => { setLoaded(true); setFailed(false); }}
          onError={() => { setFailed(true); setLoaded(true); }}
        />
      </div> : <p className="desmos-message" role="alert">This Desmos link is invalid. Edit the slide to add a shared graph link.</p>}
      {source && <div className="desmos-graph-footer">
        <span>{failed ? "Couldn’t load the graph. Open it in Desmos or retry." : "Online graph · Internet required"}</span>
        <button type="button" aria-label="Reload Desmos graph" title="Reload graph" onClick={() => { setLoaded(false); setFailed(false); setReload(reload + 1); }}><RotateCcw size={13} aria-hidden="true" /></button>
        <a href={source} target="_blank" rel="noopener noreferrer">Open in Desmos<ExternalLink size={13} aria-hidden="true" /></a>
      </div>}
    </figure>
  );
}
