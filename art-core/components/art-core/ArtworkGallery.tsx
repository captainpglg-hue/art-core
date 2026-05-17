'use client';

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { X, ChevronLeft, ChevronRight, Expand } from "lucide-react";
import { cn } from "@/lib/utils";
import { PLACEHOLDER_ART } from "@/lib/resolve-photo";

interface ArtworkGalleryProps {
  photos: string[];
  title: string;
}

/**
 * Galerie interactive de la page œuvre : image principale cliquable,
 * miniatures, et lightbox plein écran (clavier + navigation).
 * Remplace l'ancien viewer statique pour une vraie « vitrine ».
 */
export function ArtworkGallery({ photos, title }: ArtworkGalleryProps) {
  const images = photos.length > 0 ? photos : [PLACEHOLDER_ART];
  const [active, setActive] = useState(0);
  const [lightbox, setLightbox] = useState(false);

  const safeActive = Math.min(active, images.length - 1);

  const go = useCallback(
    (dir: number) => {
      setActive((i) => (i + dir + images.length) % images.length);
    },
    [images.length]
  );

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(false);
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [lightbox, go]);

  return (
    <div className="space-y-4">
      {/* Image principale — clic pour agrandir */}
      <button
        type="button"
        onClick={() => setLightbox(true)}
        className="group relative block w-full aspect-[4/3] rounded-2xl overflow-hidden bg-[#111] cursor-zoom-in"
        aria-label="Agrandir l'image"
      >
        <Image
          src={images[safeActive]}
          alt={title}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
          priority
          sizes="(max-width: 1024px) 100vw, 60vw"
        />
        <span className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-black/60 backdrop-blur-sm border border-white/10 px-2.5 py-1 text-[11px] text-white/70 opacity-0 group-hover:opacity-100 transition-opacity">
          <Expand className="size-3" />Agrandir
        </span>
      </button>

      {/* Miniatures */}
      {images.length > 1 && (
        <div className="flex gap-3 overflow-x-auto no-scrollbar">
          {images.map((photo, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActive(i)}
              className={cn(
                "relative w-20 h-20 rounded-xl overflow-hidden bg-[#111] shrink-0 border-2 transition-colors",
                i === safeActive ? "border-[#C9A84C]" : "border-transparent hover:border-[#C9A84C]/40"
              )}
              aria-label={`Voir la photo ${i + 1}`}
            >
              <Image src={photo} alt={`${title} ${i + 1}`} fill className="object-cover" sizes="80px" />
            </button>
          ))}
        </div>
      )}

      {/* Lightbox plein écran */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm flex items-center justify-center"
          onClick={() => setLightbox(false)}
        >
          <button
            type="button"
            onClick={() => setLightbox(false)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            aria-label="Fermer"
          >
            <X className="size-5" />
          </button>

          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  go(-1);
                }}
                className="absolute left-4 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                aria-label="Image précédente"
              >
                <ChevronLeft className="size-6" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  go(1);
                }}
                className="absolute right-4 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                aria-label="Image suivante"
              >
                <ChevronRight className="size-6" />
              </button>
            </>
          )}

          <div className="relative w-[92vw] h-[88vh]" onClick={(e) => e.stopPropagation()}>
            <Image src={images[safeActive]} alt={title} fill className="object-contain" sizes="92vw" />
          </div>

          {images.length > 1 && (
            <span className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-xs text-white/70 tabular-nums">
              {safeActive + 1} / {images.length}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
