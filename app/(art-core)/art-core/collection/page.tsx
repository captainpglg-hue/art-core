"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Layers, Share2, Eye, FileText, ShoppingBag, Filter } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

const FILTERS = [
  { key: "all", label: "Toutes" },
  { key: "peinture", label: "Peintures" },
  { key: "sculpture", label: "Sculptures" },
  { key: "photographie", label: "Photographies" },
];

const mockCollection = [
  {
    id: "c1",
    title: "Lumière d'Automne",
    artist: "Claire Dubois",
    image: "/placeholder-art.jpg",
    acquired: "2026-02-15",
    value: 2400,
    category: "peinture",
    certified: true,
  },
  {
    id: "c2",
    title: "Fragments Urbains",
    artist: "Marc Leroy",
    image: "/placeholder-art.jpg",
    acquired: "2026-01-20",
    value: 3800,
    category: "photographie",
    certified: true,
  },
  {
    id: "c3",
    title: "Zen Garden",
    artist: "Hiro Sato",
    image: "/placeholder-art.jpg",
    acquired: "2025-12-05",
    value: 6300,
    category: "peinture",
    certified: false,
  },
  {
    id: "c4",
    title: "Duomo d'Oro",
    artist: "Giulia Rossi",
    image: "/placeholder-art.jpg",
    acquired: "2025-11-18",
    value: 5800,
    category: "sculpture",
    certified: true,
  },
];

export default function CollectionPage() {
  const [collection, setCollection] = useState(mockCollection);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    fetch("/api/artworks?owned=true")
      .then((r) => r.json())
      .then((d) => {
        if (d.artworks?.length) setCollection(d.artworks);
        else setCollection(mockCollection);
      })
      .catch(() => setCollection(mockCollection))
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === "all" ? collection : collection.filter((c) => c.category === filter);

  const totalValue = collection.reduce((sum, c) => sum + c.value, 0);

  function shareArtwork(id: string) {
    navigator.clipboard.writeText(`${window.location.origin}/art-core/oeuvre/${id}/public`);
    toast({ title: "Lien de partage copié !" });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-2 border-[#D4AF37]/30 border-t-[#D4AF37] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="font-playfair text-3xl sm:text-4xl font-semibold text-white">Ma Collection</h1>
          <p className="text-white/40 text-sm mt-1">
            {collection.length} oeuvre{collection.length !== 1 ? "s" : ""} — Valeur estimée : {formatPrice(totalValue)}
          </p>
        </div>
        <div className="flex gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-full text-xs transition-all ${
                filter === f.key
                  ? "bg-[#D4AF37] text-black font-semibold"
                  : "bg-white/[0.03] border border-white/10 text-white/50 hover:text-white"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Empty State */}
      {filtered.length === 0 && filter === "all" ? (
        <div className="text-center py-20">
          <Layers className="size-14 text-white/10 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Votre collection est vide</h2>
          <p className="text-white/40 text-sm mb-6">
            Commencez à collectionner des oeuvres uniques certifiées
          </p>
          <Link
            href="/art-core"
            className="inline-flex items-center gap-2 bg-[#D4AF37] hover:bg-[#c9a432] text-black font-semibold px-6 py-3 rounded-xl transition-colors"
          >
            <ShoppingBag className="size-4" />
            Explorer le marketplace
          </Link>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Filter className="size-10 text-white/10 mx-auto mb-3" />
          <p className="text-white/40 text-sm">Aucune oeuvre dans cette catégorie</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="group rounded-2xl overflow-hidden bg-white/[0.03] border border-white/10 hover:border-[#D4AF37]/30 transition-all"
            >
              <Link href={`/art-core/oeuvre/${item.id}`}>
                <div className="relative aspect-[4/3] bg-[#111]">
                  <Image
                    src={item.image}
                    alt={item.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                  {item.certified && (
                    <div className="absolute top-3 left-3 flex items-center gap-1 bg-black/70 backdrop-blur-sm text-white text-[11px] font-semibold px-2.5 py-1 rounded-full">
                      <span className="text-green-400">&#10003;</span> Certifié
                    </div>
                  )}
                </div>
              </Link>
              <div className="p-4">
                <p className="text-xs text-white/40 mb-1">{item.artist}</p>
                <h3 className="text-sm font-semibold text-white line-clamp-1">{item.title}</h3>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[#D4AF37] font-bold text-sm">{formatPrice(item.value)}</span>
                  <span className="text-[11px] text-white/25">
                    Acquis le {new Date(item.acquired).toLocaleDateString("fr-FR")}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-3 pt-3 border-t border-white/5">
                  <Link
                    href={`/art-core/oeuvre/${item.id}`}
                    className="flex items-center gap-1 text-white/40 hover:text-white text-[11px] transition-colors"
                  >
                    <Eye className="size-3" /> Voir
                  </Link>
                  <button
                    onClick={() => shareArtwork(item.id)}
                    className="flex items-center gap-1 text-white/40 hover:text-white text-[11px] transition-colors"
                  >
                    <Share2 className="size-3" /> Partager
                  </button>
                  <button
                    onClick={() => toast({ title: "Certificat en cours de génération..." })}
                    className="flex items-center gap-1 text-white/40 hover:text-white text-[11px] transition-colors"
                  >
                    <FileText className="size-3" /> Certificat
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
