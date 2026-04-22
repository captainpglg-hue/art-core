"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Heart, X } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { resolveFirstPhoto } from "@/lib/resolve-photo";
import { toast } from "@/hooks/use-toast";

export default function FavorisPage() {
  const [favorites, setFavorites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadFavorites(); }, []);

  function loadFavorites() {
    fetch("/api/favorites").then(r => r.json()).then(d => { setFavorites(d.favorites || []); setLoading(false); });
  }

  async function removeFavorite(artworkId: string) {
    await fetch("/api/favorites", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ artwork_id: artworkId }) });
    toast({ title: "Retiré des favoris" });
    loadFavorites();
  }

  if (loading) return <div className="flex items-center justify-center py-24"><div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin" /></div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="font-playfair text-3xl font-semibold text-white mb-2">Favoris</h1>
      <p className="text-white/40 text-sm mb-8">{favorites.length} oeuvre{favorites.length !== 1 ? "s" : ""} sauvegardée{favorites.length !== 1 ? "s" : ""}</p>

      {favorites.length === 0 ? (
        <div className="text-center py-16">
          <Heart className="size-12 text-white/10 mx-auto mb-4" />
          <p className="text-white/40">Aucun favori pour le moment</p>
          <Link href="/art-core" className="text-gold text-sm mt-2 inline-block hover:underline">Explorer le marketplace</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {favorites.map((f) => (
            <div key={f.id} className="relative rounded-2xl overflow-hidden bg-[#111111] group">
              <Link href={`/art-core/oeuvre/${f.artwork_id}`}>
                <div className="relative aspect-[4/3] bg-[#111]">
                  <Image src={resolveFirstPhoto(f.photos)} alt={f.title} fill className="object-cover" sizes="33vw" />
                </div>
                <div className="p-4">
                  <p className="text-xs text-white/40 mb-1">{f.artist_name}</p>
                  <h3 className="text-sm font-semibold text-white line-clamp-1">{f.title}</h3>
                  <p className="text-gold font-bold text-sm mt-1">{formatPrice(f.price)}</p>
                </div>
              </Link>
              <button onClick={() => removeFavorite(f.artwork_id)} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <X className="size-4 text-white/60" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
