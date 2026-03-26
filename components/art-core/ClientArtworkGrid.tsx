"use client";

import { useEffect, useState } from "react";
import { ArtworkCard, ArtworkCardSkeleton } from "./ArtworkCard";

export function ClientArtworkGrid() {
  const [artworks, setArtworks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/artworks?limit=60")
      .then(r => r.json())
      .then(d => {
        const parsed = (d.artworks || [])
          .filter((a: any) => a.status !== "sold")
          .map((a: any) => ({
            ...a,
            photos: typeof a.photos === "string" ? JSON.parse(a.photos || "[]") : (a.photos || []),
          }));
        setArtworks(parsed);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-5">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="break-inside-avoid mb-5"><ArtworkCardSkeleton /></div>
        ))}
      </div>
    );
  }

  if (artworks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-white/50 font-medium mb-1">Aucune oeuvre trouvee</p>
        <p className="text-white/25 text-sm">Revenez plus tard.</p>
      </div>
    );
  }

  return (
    <>
      <p className="text-white/25 text-xs mb-5">{artworks.length} oeuvre{artworks.length !== 1 ? "s" : ""}</p>
      <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-5 space-y-0">
        {artworks.map((artwork: any, i: number) => (
          <div key={artwork.id} className="break-inside-avoid mb-5">
            <ArtworkCard artwork={artwork} priority={i < 4} />
          </div>
        ))}
      </div>
    </>
  );
}
