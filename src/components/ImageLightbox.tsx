"use client";

import { useState, useEffect } from "react";

export function ImageLightbox() {
  const [src, setSrc] = useState<string | null>(null);
  const [alt, setAlt] = useState("");

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "IMG" && target.closest(".tiptap")) {
        e.preventDefault();
        setSrc((target as HTMLImageElement).src);
        setAlt((target as HTMLImageElement).alt || "");
      }
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  if (!src) return null;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-8"
      onClick={() => setSrc(null)}
    >
      <div
        className="relative max-w-[90vw] max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={src}
          alt={alt}
          className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
        />
        {alt && (
          <p className="text-center text-white/80 text-sm mt-3">{alt}</p>
        )}
        <button
          onClick={() => setSrc(null)}
          className="absolute -top-3 -right-3 w-8 h-8 bg-white rounded-full flex items-center justify-center text-text shadow-lg hover:bg-border transition-colors"
        >
          x
        </button>
      </div>
    </div>
  );
}
