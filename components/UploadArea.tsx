"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { X, Loader2, Image as ImageIcon, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { problemImageFileError } from "@/lib/problem-image";

interface UploadAreaProps {
  onImageSelect: (base64: string) => void;
  isProcessing: boolean;
}

export function UploadArea({ onImageSelect, isProcessing }: UploadAreaProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fileError, setFileError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const readerRef = useRef<FileReader | null>(null);
  const [isReading, setIsReading] = useState(false);
  const busy = isProcessing || isReading;

  useEffect(() => () => {
    const reader = readerRef.current;
    if (reader) { reader.onload = null; reader.onerror = null; reader.onabort = null; reader.abort(); }
  }, []);

  const handleFile = useCallback((file: File) => {
    if (isProcessing || readerRef.current?.readyState === FileReader.LOADING) return;
    const error = problemImageFileError(file);
    if (error) { setFileError(error); return; }
    setFileError("");
    const reader = new FileReader();
    readerRef.current = reader;
    setIsReading(true);
    reader.onload = () => {
      setIsReading(false);
      const base64 = reader.result as string;
      setPreview(base64);
      onImageSelect(base64);
    };
    reader.onerror = () => { setIsReading(false); setFileError("This image couldn’t be opened. Please choose another image."); };
    reader.onabort = () => setIsReading(false);
    reader.readAsDataURL(file);
  }, [onImageSelect, isProcessing]);

  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      if (busy) return;
      for (const item of Array.from(event.clipboardData?.items || [])) {
        if (!item.type.startsWith("image/")) continue;
        const file = item.getAsFile();
        if (file) { event.preventDefault(); handleFile(file); break; }
      }
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [handleFile, busy]);

  return (
    <div className="upload-area">
      <div className={cn("upload-dropzone", isDragging && "is-dragging", preview && "has-preview")} aria-busy={busy}
        onDragOver={event => { event.preventDefault(); if (!busy) setIsDragging(true); }}
        onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setIsDragging(false); }}
        onDrop={event => { event.preventDefault(); setIsDragging(false); if (!busy && event.dataTransfer.files[0]) handleFile(event.dataTransfer.files[0]); }}>
        {preview ? <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Uploaded math problem" className="upload-preview" />
          {!busy && <button type="button" aria-label="Remove image" onClick={() => { setPreview(null); setFileError(""); if (fileInputRef.current) fileInputRef.current.value = ""; }} className="upload-remove"><X size={17} /></button>}
          {busy && <div className="upload-processing" role="status"><Loader2 size={28} className="animate-spin" strokeWidth={1.5} aria-hidden="true" /><p>Reading your problem…</p><span>Reading the text, graphs, and tables.</span></div>}
        </> : <button type="button" className="upload-trigger" onClick={() => fileInputRef.current?.click()} disabled={busy}>
          <span className="upload-symbol"><ImageIcon size={28} strokeWidth={1.25} aria-hidden="true" /></span>
          <span className="upload-title">Upload a math problem</span>
          <span className="upload-description">Drop your screenshot here, or browse your files.</span>
          <span className="studio-button">Choose an image<ArrowUpRight size={15} aria-hidden="true" /></span>
          <span className="upload-paste">You can also paste an image with <kbd>Ctrl</kbd> + <kbd>V</kbd> / <kbd>⌘</kbd> + <kbd>V</kbd></span>
        </button>}
        <input type="file" ref={fileInputRef} aria-label="Upload problem image" accept="image/png,image/jpeg,image/webp" disabled={busy} className="hidden" onChange={event => { if (event.target.files?.[0]) handleFile(event.target.files[0]); event.target.value = ""; }} />
      </div>
      <div className="upload-footnote"><span>Screenshots, photos, and scanned questions.</span><span>PNG, JPG, WebP · Up to 6 MB</span></div>
      <p className="upload-privacy-note">Uploaded problems are sent to the configured AI services. Manual slides and uploaded graph images are stored in this browser.</p>
      {fileError && <p className="studio-field-error" role="alert">{fileError}</p>}
    </div>
  );
}
