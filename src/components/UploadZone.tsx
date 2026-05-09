"use client";

import { useCallback, useRef, useState } from "react";

interface UploadZoneProps {
  onUpload: (file: File, preview: string) => void;
  disabled?: boolean;
}

export default function UploadZone({ onUpload, disabled }: UploadZoneProps) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/")) return;
      const reader = new FileReader();
      reader.onload = () => {
        onUpload(file, reader.result as string);
      };
      reader.readAsDataURL(file);
    },
    [onUpload]
  );

  return (
    <div
      onClick={() => !disabled && inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
      }}
      className={`
        animate-fade-in-up
        relative cursor-pointer overflow-hidden rounded-2xl border
        p-14 text-center transition-all duration-500
        ${
          dragOver
            ? "border-cyan-400/60 bg-cyan-400/5 shadow-lg shadow-cyan-400/10"
            : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
        }
        ${disabled ? "pointer-events-none opacity-50" : ""}
      `}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />

      {/* Decorative corner accents */}
      <div className="absolute top-0 left-0 h-8 w-8 border-t border-l border-white/20 rounded-tl-2xl" />
      <div className="absolute top-0 right-0 h-8 w-8 border-t border-r border-white/20 rounded-tr-2xl" />
      <div className="absolute bottom-0 left-0 h-8 w-8 border-b border-l border-white/20 rounded-bl-2xl" />
      <div className="absolute bottom-0 right-0 h-8 w-8 border-b border-r border-white/20 rounded-br-2xl" />

      <div className="space-y-4">
        {/* Animated icon */}
        <div className="animate-float mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/5">
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            className="text-white/50"
          >
            <rect x="3" y="3" width="18" height="18" rx="3" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="M21 15l-5-5L5 21" />
          </svg>
        </div>

        <div>
          <p className="text-base font-medium text-white/70">
            Drop a photo to travel through time
          </p>
          <p className="mt-1.5 text-sm text-white/30">
            or click to browse &middot; JPG, PNG, WebP
          </p>
        </div>

        {/* Subtle pill */}
        <div className="mx-auto w-fit rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] uppercase tracking-[0.15em] text-white/25">
          200 years of reimagination
        </div>
      </div>
    </div>
  );
}
