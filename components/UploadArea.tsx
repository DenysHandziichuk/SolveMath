"use client";

import { useState, useRef } from "react";
import { Upload, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface UploadAreaProps {
  onImageSelect: (base64: string) => void;
  isProcessing: boolean;
}

export function UploadArea({ onImageSelect, isProcessing }: UploadAreaProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setPreview(base64);
      onImageSelect(base64);
    };
    reader.readAsDataURL(file);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-4 animate-in fade-in zoom-in-95 duration-700">
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        className={cn(
          "relative flex aspect-video w-full flex-col items-center justify-center rounded-[2rem] border-2 border-dashed transition-all duration-300",
          isDragging ? "border-primary bg-primary/5 shadow-xl scale-[1.01]" : "border-border bg-card shadow-sm hover:border-zinc-300 dark:hover:border-zinc-700",
          preview && "border-solid border-border"
        )}
      >
        {preview ? (
          <div className="relative h-full w-full overflow-hidden rounded-[1.9rem]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Preview" className="h-full w-full object-contain" />
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
               <button 
                onClick={() => setPreview(null)}
                className="rounded-full bg-white p-2 text-black shadow-lg transition-transform hover:scale-110"
               >
                 <X className="h-5 w-5" />
               </button>
            </div>
            {isProcessing && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="mt-4 font-medium text-foreground">Analyzing Screenshot...</p>
              </div>
            )}
          </div>
        ) : (
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="flex h-full w-full cursor-pointer flex-col items-center justify-center gap-4 text-center p-8"
          >
            <div className="rounded-2xl bg-secondary p-4 text-secondary-foreground shadow-inner">
              <Upload className="h-8 w-8" />
            </div>
            <div>
              <p className="text-xl font-semibold text-foreground">
                Drop your screenshot here
              </p>
              <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                Click to browse from your device.<br />Supported formats: PNG, JPG, WEBP.
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
