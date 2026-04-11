"use client";

import { useState } from "react";
import Image from "next/image";
import { ZoomIn, X, ChevronLeft, ChevronRight, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ArtworkViewerProps {
  mainImage: string;
  additionalImages?: string[];
  title: string;
}

export function ArtworkViewer({ mainImage, additionalImages = [], title }: ArtworkViewerProps) {
  const allImages = [mainImage, ...additionalImages.filter(Boolean)];
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const prev = () =>
    setLightboxIndex((i) => (i - 1 + allImages.length) % allImages.length);
  const next = () =>
    setLightboxIndex((i) => (i + 1) % allImages.length);

  return (
    <>
      {/* Main viewer */}
      <div className="space-y-3">
        {/* Primary image */}
        <div
          className="relative aspect-[4/5] md:aspect-[3/4] rounded-xl overflow-hidden bg-dark-200 group cursor-zoom-in"
          onClick={() => openLightbox(activeIndex)}
        >
          <Image
            src={allImages[activeIndex]}
            alt={title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
            sizes="(max-width: 768px) 100vw, 50vw"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <button
            className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-lg bg-black/60 backdrop-blur-sm border border-white/10 px-3 py-1.5 text-xs text-white/70 opacity-0 group-hover:opacity-100 transition-all hover:border-gold/30 hover:text-white"
            onClick={(e) => { e.stopPropagation(); openLightbox(activeIndex); }}
          >
            <Maximize2 className="size-3" />
            Agrandir
          </button>
        </div>

        {/* Thumbnails */}
        {allImages.length > 1 && (
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {allImages.map((img, i) => (
              <button
                key={i}
                onClick={() => setActiveIndex(i)}
                className={cn(
                  "shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition-all",
                  i === activeIndex
                    ? "border-gold shadow-gold"
                    : "border-white/10 hover:border-white/30 opacity-60 hover:opacity-100"
                )}
              >
                <Image
                  src={img}
                  alt={`${title} ${i + 1}`}
                  width={56}
                  height={56}
                  className="object-cover w-full h-full"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center"
          onClick={() => setLightboxOpen(false)}
        >
          {/* Close */}
          <button
            className="absolute top-4 right-4 w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white/70 hover:bg-white/20 hover:text-white transition-all z-10"
            onClick={() => setLightboxOpen(false)}
          >
            <X className="size-5" />
          </button>

          {/* Prev / Next */}
          {allImages.length > 1 && (
            <>
              <button
                className="absolute left-4 w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white/70 hover:bg-white/20 hover:text-white transition-all z-10"
                onClick={(e) => { e.stopPropagation(); prev(); }}
              >
                <ChevronLeft className="size-5" />
              </button>
              <button
                className="absolute right-4 w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white/70 hover:bg-white/20 hover:text-white transition-all z-10"
                onClick={(e) => { e.stopPropagation(); next(); }}
              >
                <ChevronRight className="size-5" />
              </button>
            </>
          )}

          {/* Image */}
          <div
            className="relative max-w-[90vw] max-h-[90vh] w-full h-full"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={allImages[lightboxIndex]}
              alt={title}
              fill
              className="object-contain"
              sizes="90vw"
            />
          </div>

          {/* Counter */}
          {allImages.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-white/40">
              {lightboxIndex + 1} / {allImages.length}
            </div>
          )}
        </div>
      )}
    </>
  );
}
