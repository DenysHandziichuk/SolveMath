"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { X, Loader2, Image as ImageIcon, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface UploadAreaProps {
  onImageSelect: (base64: string) => void;
  isProcessing: boolean;
}

export function UploadArea({ onImageSelect, isProcessing }: UploadAreaProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fileError, setFileError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    if (isProcessing) return;
    if (!file.type.startsWith("image/")) { setFileError("Please choose an image of your math problem."); return; }
    setFileError("");
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setPreview(base64);
      onImageSelect(base64);
    };
    reader.onerror = () => setFileError("This image couldn’t be opened. Please choose another image.");
    reader.readAsDataURL(file);
  }, [onImageSelect, isProcessing]);

  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      if (isProcessing) return;
      for (const item of Array.from(event.clipboardData?.items || [])) {
        if (!item.type.startsWith("image/")) continue;
        const file = item.getAsFile();
        if (file) { event.preventDefault(); handleFile(file); break; }
      }
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [handleFile, isProcessing]);

  return (
    <div className="upload-area">
      <div className={cn("upload-dropzone", isDragging && "is-dragging", preview && "has-preview")} aria-busy={isProcessing}
        onDragOver={event => { event.preventDefault(); if (!isProcessing) setIsDragging(true); }}
        onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setIsDragging(false); }}
        onDrop={event => { event.preventDefault(); setIsDragging(false); if (!isProcessing && event.dataTransfer.files[0]) handleFile(event.dataTransfer.files[0]); }}>
        {preview ? <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Uploaded math problem" className="upload-preview" />
          {!isProcessing && <button type="button" aria-label="Remove image" onClick={() => { setPreview(null); setFileError(""); if (fileInputRef.current) fileInputRef.current.value = ""; }} className="upload-remove"><X size={17} /></button>}
          {isProcessing && <div className="upload-processing" role="status"><Loader2 size={28} className="animate-spin" strokeWidth={1.5} aria-hidden="true" /><p>Reading your problem…</p><span>Finding the questions, equations, and details.</span></div>}
        </> : <button type="button" className="upload-trigger" onClick={() => fileInputRef.current?.click()} disabled={isProcessing}>
          <span className="upload-symbol"><ImageIcon size={28} strokeWidth={1.25} aria-hidden="true" /></span>
          <span className="upload-title">A problem worth explaining.</span>
          <span className="upload-description">Drop your screenshot here, or browse your files.</span>
          <span className="studio-button">Choose an image<ArrowUpRight size={15} aria-hidden="true" /></span>
          <span className="upload-paste">You can also paste an image with <kbd>Ctrl</kbd> + <kbd>V</kbd> / <kbd>⌘</kbd> + <kbd>V</kbd></span>
        </button>}
        <input type="file" ref={fileInputRef} aria-label="Upload problem image" accept="image/*" disabled={isProcessing} className="hidden" onChange={event => { if (event.target.files?.[0]) handleFile(event.target.files[0]); event.target.value = ""; }} />
      </div>
      <div className="upload-footnote"><span>Screenshots, photos, and scanned questions.</span><span>Image files</span></div>
      {fileError && <p className="studio-field-error" role="alert">{fileError}</p>}
    </div>
  );
}
