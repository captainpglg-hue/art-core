import Link from "next/link";
import { ShieldCheck, Lock, Star } from "lucide-react";
import { GaugeBar } from "./GaugeBar";
import { formatPrice } from "@/lib/utils";
import { cn } from "@/lib/utils";

type Artwork = {
  id: string;
  title: string;
  photos: string[];
  price: number;
  gauge_points: number;
  gauge_locked: number;
  status: string;
  blockchain_hash?: string;
  artist_name?: string;
  artist_username?: string;
  boost_active?: number;
  highlight_active?: number;
  category?: string;
  creation_date?: string;
};

interface ArtworkCardProps {
  artwork: Artwork;
  priority?: boolean;
  promoted?: boolean;
}

export function ArtworkCard({ artwork, priority = false, promoted = false }: ArtworkCardProps) {
  const gaugePoints = artwork.gauge_points ?? 0;
  const isCertified = !!artwork.blockchain_hash;
  const isLocked = artwork.gauge_locked === 1 || gaugePoints >= 100;
  const imageUrl = artwork.photos?.[0] || "/placeholder-art.jpg";
  const artistName = artwork.artist_name ?? "Artiste";
  const isPromoted = promoted || artwork.boost_active === 1 || artwork.highlight_active === 1;

  return (
    <Link
      href={`/art-core/oeuvre/${artwork.id}`}
      className={cn(
        "group block rounded-2xl overflow-hidden bg-[#111111] hover:shadow-[0_0_30px_rgba(212,175,55,0.10)] transition-all duration-300 hover:-translate-y-0.5",
        isLocked && "ring-1 ring-[#C9A84C]/30 shadow-[0_0_20px_rgba(212,175,55,0.08)]",
        isPromoted && "ring-1 ring-[#C9A84C]/20"
      )}
    >
      <div className="relative overflow-hidden bg-[#111]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt={artwork.title}
          className="w-full aspect-[4/3] object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          loading={priority ? "eager" : "lazy"}
          onError={(e) => {
            const el = e.target as HTMLImageElement;
            el.style.display = "none";
            const placeholder = el.parentElement?.querySelector(".art-placeholder");
            if (placeholder) (placeholder as HTMLElement).style.display = "flex";
          }}
        />
        <div className="art-placeholder hidden w-full aspect-[4/3] items-center justify-center bg-[#1a1a1a] border border-white/5">
          <div className="text-center">
            <svg className="mx-auto mb-2 size-10 text-white/10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><rect x="3" y="3" width="18" height="18" rx="2" strokeWidth="1.5" /><path d="M3 16l5-5 4 4 3-3 6 6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            <p className="text-[10px] text-white/15">Image en cours de chargement</p>
          </div>
        </div>

        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          {isCertified && (
            <span className="flex items-center gap-1.5 rounded-full bg-black/70 backdrop-blur-sm border border-[#C9A84C]/30 px-2.5 py-1 text-[11px] text-[#C9A84C] font-medium">
              <ShieldCheck className="size-3" />Certifié
            </span>
          )}
          {isLocked && (
            <span className="flex items-center gap-1.5 rounded-full bg-[#C9A84C]/20 backdrop-blur-sm border border-[#C9A84C]/40 px-2.5 py-1 text-[11px] text-[#C9A84C] font-semibold animate-pulse">
              <Lock className="size-3" />Deal verrouillé
            </span>
          )}
          {isPromoted && (
            <span className="flex items-center gap-1 rounded-full bg-[#C9A84C]/15 backdrop-blur-sm px-2 py-0.5 text-[10px] text-[#C9A84C] font-medium">
              <Star className="size-2.5" />Promo
            </span>
          )}
        </div>

        {artwork.status !== "sold" && artwork.price > 0 && (
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent px-4 py-4">
            <p className="text-lg font-bold text-[#C9A84C] tabular-nums">{formatPrice(artwork.price)}</p>
          </div>
        )}

        {artwork.status === "sold" && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="text-white/80 font-bold text-lg bg-black/60 px-4 py-2 rounded-lg">VENDUE</span>
          </div>
        )}
      </div>

      <div className="px-4 pt-3.5 pb-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[8px] font-medium text-white/50 shrink-0">
            {artistName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
          </div>
          <span className="text-[11px] text-white/40 truncate">{artistName}</span>
          {artwork.category && <span className="ml-auto text-[10px] text-white/20 shrink-0 capitalize">{artwork.category}</span>}
        </div>

        <h3 className="font-playfair text-sm font-semibold text-white leading-snug line-clamp-2 group-hover:text-[#C9A84C]/90 transition-colors mb-2.5">
          {artwork.title}
        </h3>

        <GaugeBar value={gaugePoints} locked={isLocked} compact />
      </div>
    </Link>
  );
}

export function ArtworkCardSkeleton() {
  return (
    <div className="rounded-2xl overflow-hidden bg-[#111111]">
      <div className="bg-white/5 animate-pulse h-56 w-full" />
      <div className="px-4 pt-3.5 pb-4 space-y-2.5">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-white/5 animate-pulse" />
          <div className="h-2.5 w-20 rounded bg-white/5 animate-pulse" />
        </div>
        <div className="h-3.5 w-3/4 rounded bg-white/5 animate-pulse" />
        <div className="h-2 w-full rounded bg-white/5 animate-pulse" />
      </div>
    </div>
  );
}
