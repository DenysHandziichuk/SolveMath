"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2 } from "lucide-react";
import { prepareGraphImage, type GraphImage } from "@/lib/graph-image";

interface GraphImageUploadProps {
  onSelect: (image: GraphImage) => void;
  onBusyChange?: (busy: boolean) => void;
  label?: string;
}

export function GraphImageUpload({ onSelect, onBusyChange, label = "Choose graph image" }: GraphImageUploadProps) {
  const input = useRef<HTMLInputElement>(null);
  const mounted = useRef(true);
  const working = useRef(false);
  const select = useRef(onSelect);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  useEffect(() => { select.current = onSelect; }, [onSelect]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (working.current) { working.current = false; onBusyChange?.(false); }
    };
  }, [onBusyChange]);

  const chooseImage = async (file: File) => {
    if (working.current) return;
    working.current = true;
    setBusy(true);
    setError("");
    onBusyChange?.(true);
    try {
      const image = await prepareGraphImage(file);
      if (mounted.current) select.current(image);
    } catch (error) {
      if (mounted.current) setError(error instanceof Error ? error.message : "This image couldn’t be opened.");
    } finally {
      if (mounted.current && working.current) { working.current = false; setBusy(false); onBusyChange?.(false); }
    }
  };

  return <div
    className={`graph-image-upload${dragging ? " is-dragging" : ""}`}
    role="group"
    aria-label={label}
    aria-busy={busy}
    tabIndex={0}
    onDragOver={(event) => { event.preventDefault(); if (!busy) setDragging(true); }}
    onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragging(false); }}
    onDrop={(event) => { event.preventDefault(); setDragging(false); if (event.dataTransfer.files[0]) void chooseImage(event.dataTransfer.files[0]); }}
    onPaste={(event) => {
      const item = Array.from(event.clipboardData.items).find((item) => item.type.startsWith("image/"));
      const file = item?.getAsFile();
      if (file) { event.preventDefault(); void chooseImage(file); }
    }}
  >
    <button type="button" className="studio-secondary-button" disabled={busy} onClick={() => input.current?.click()}>{busy ? <Loader2 size={15} className="animate-spin" /> : <ImagePlus size={15} />}{busy ? "Preparing image…" : label}</button>
    <input type="file" ref={input} className="hidden" aria-label={label} accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; if (file) void chooseImage(file); }} />
    <p className="studio-help">Drop a PNG, JPG, or WebP here, or focus this box and paste a screenshot. Up to 20 MB; large images are resized.</p>
    {error && <p className="studio-field-error" role="alert">{error}</p>}
  </div>;
}
