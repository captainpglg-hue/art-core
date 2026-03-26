"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ShieldCheck, Copy, ExternalLink, ArrowLeft, Share2, Check } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

interface Artwork {
  id: string;
  title: string;
  artist_name: string;
  technique?: string;
  dimensions?: string;
  year?: string;
  price: number;
  photos: string[];
  blockchain_hash?: string;
  description?: string;
  category?: string;
}

export default function PublicArtworkPage() {
  const params = useParams();
  const id = params.id as string;
  const [artwork, setArtwork] = useState<Artwork | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch(`/api/artworks/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.artwork) {
          const a = d.artwork;
          setArtwork({
            ...a,
            photos: typeof a.photos === "string" ? JSON.parse(a.photos) : a.photos || [],
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  function copyLink() {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    toast({ title: "Lien copié !" });
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#D4AF37]/30 border-t-[#D4AF37] rounded-full animate-spin" />
      </div>
    );
  }

  if (!artwork) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center text-center px-4">
        <p className="text-white/40 text-lg mb-4">Oeuvre introuvable</p>
        <Link href="/art-core" className="text-[#D4AF37] text-sm hover:underline">
          Retour au marketplace
        </Link>
      </div>
    );
  }

  const mainImage = artwork.photos[0] || "/placeholder-art.jpg";
  const isCertified = !!artwork.blockchain_hash;

  return (
    <div className="min-h-screen bg-[#0a0a0a] animate-fade-in">
      {/* Minimal header */}
      <header className="flex items-center justify-between px-4 sm:px-8 py-5 border-b border-white/5">
        <Link href="/art-core" className="flex items-center gap-2 text-white/60 hover:text-white transition-colors">
          <ArrowLeft className="size-4" />
          <span className="font-playfair text-lg font-semibold text-[#D4AF37]">ART-CORE</span>
        </Link>
        <button
          onClick={copyLink}
          className="flex items-center gap-2 text-white/40 hover:text-white text-sm transition-colors"
        >
          {copied ? <Check className="size-4 text-green-400" /> : <Share2 className="size-4" />}
          Partager
        </button>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-8 py-10">
        {/* Image */}
        <div className="relative aspect-[4/3] sm:aspect-[3/2] rounded-2xl overflow-hidden bg-[#111] mb-8">
          <Image
            src={mainImage}
            alt={artwork.title}
            fill
            className="object-cover"
            priority
            sizes="(max-width: 768px) 100vw, 800px"
          />
          {isCertified && (
            <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-black/70 backdrop-blur-sm text-white text-xs font-semibold px-3 py-1.5 rounded-full">
              <ShieldCheck className="size-3.5 text-green-400" />
              Certifié
            </div>
          )}
        </div>

        {/* Details */}
        <div className="space-y-6">
          <div>
            <h1 className="font-playfair text-3xl sm:text-4xl font-semibold text-white">{artwork.title}</h1>
            <p className="text-white/50 text-lg mt-1">par {artwork.artist_name}</p>
          </div>

          <div className="flex flex-wrap gap-3">
            {artwork.technique && (
              <span className="px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/10 text-white/60 text-sm">
                {artwork.technique}
              </span>
            )}
            {artwork.dimensions && (
              <span className="px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/10 text-white/60 text-sm">
                {artwork.dimensions}
              </span>
            )}
            {artwork.year && (
              <span className="px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/10 text-white/60 text-sm">
                {artwork.year}
              </span>
            )}
            {artwork.category && (
              <span className="px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/10 text-white/60 text-sm capitalize">
                {artwork.category.replace("_", " ")}
              </span>
            )}
          </div>

          {artwork.description && (
            <p className="text-white/40 text-sm leading-relaxed">{artwork.description}</p>
          )}

          <div className="text-[#D4AF37] text-2xl font-bold">{formatPrice(artwork.price)}</div>

          {/* CTA */}
          <Link
            href={`/art-core/oeuvre/${artwork.id}`}
            className="inline-flex items-center gap-2 bg-[#D4AF37] hover:bg-[#c9a432] text-black font-semibold px-8 py-3 rounded-xl transition-colors"
          >
            Voir sur ART-CORE
            <ExternalLink className="size-4" />
          </Link>

          {/* Share buttons */}
          <div className="pt-6 border-t border-white/5">
            <p className="text-white/30 text-xs uppercase tracking-wider mb-3">Partager</p>
            <div className="flex gap-3">
              <button
                onClick={copyLink}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/[0.03] border border-white/10 text-white/60 text-sm hover:border-white/20 transition-colors"
              >
                <Copy className="size-4" />
                Copier le lien
              </button>
              <a
                href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(typeof window !== "undefined" ? window.location.href : "")}&text=${encodeURIComponent(`Découvrez "${artwork.title}" sur ART-CORE`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/[0.03] border border-white/10 text-white/60 text-sm hover:border-white/20 transition-colors"
              >
                <ExternalLink className="size-4" />
                Twitter / X
              </a>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
