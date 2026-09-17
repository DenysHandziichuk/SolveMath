"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { X, Loader2, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface UploadAreaProps {
  onImageSelect: (base64: string) => void;
  isProcessing: boolean;
}

export function UploadArea({ onImageSelect, isProcessing }: UploadAreaProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setPreview(base64);
      onImageSelect(base64);
    };
    reader.readAsDataURL(file);
  }, [onImageSelect]);

  // Global clipboard paste listener (Ctrl+V anywhere on the page)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (isProcessing) return;
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith("image/")) {
          const file = items[i].getAsFile();
          if (file) {
            e.preventDefault();
            handleFile(file);
            break;
          }
        }
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [handleFile, isProcessing]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-2">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        className={cn(
          "relative flex aspect-video w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed transition-all duration-200",
          isDragging
            ? "border-blue-500 bg-blue-500/10 shadow-2xl shadow-blue-500/10 scale-[1.01]"
            : "border-slate-800/90 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-900/60 shadow-lg",
          preview && "border-solid border-slate-800"
        )}
      >
        {preview ? (
          <div className="relative h-full w-full overflow-hidden rounded-2xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Problem Preview" className="h-full w-full object-contain bg-slate-950/80" />
            <div className="absolute inset-0 bg-slate-950/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
              <button
                onClick={() => setPreview(null)}
                className="rounded-xl bg-slate-800 border border-slate-700 p-2 text-white shadow-lg transition-transform hover:scale-105"
                title="Remove image"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {isProcessing && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-sm">
                <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
                <p className="mt-3 text-xs font-semibold text-slate-200">Reading Math Problems...</p>
              </div>
            )}
          </div>
        ) : (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="flex h-full w-full cursor-pointer flex-col items-center justify-center gap-3 text-center p-8 select-none"
          >
            <div className="rounded-xl bg-slate-800/80 border border-slate-700/60 p-3.5 text-blue-400 shadow-inner">
              <ImageIcon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-base font-semibold text-slate-200">
                Drop assignment or exam screenshot here
              </p>
              <p className="mt-1 text-xs text-slate-400">
                or paste with <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px]">Ctrl+V</kbd> • click to browse
              </p>
            </div>
          </div>
        )}
        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          accept="image/*"
          className="hidden"
        />
      </div>
    </div>
  );
}

