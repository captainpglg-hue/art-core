"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Flame, TrendingUp, Eye, Heart, Clock, ArrowUpRight, Star } from "lucide-react";
import { formatPrice } from "@/lib/utils";

const PERIODS = [
  { key: "today", label: "Aujourd'hui" },
  { key: "week", label: "Cette semaine" },
  { key: "month", label: "Ce mois" },
];

const mockTrending = [
  { id: "t1", title: "Lumière d'Automne", artist: "Claire Dubois", price: 2400, image: "/placeholder-art.jpg", views: 1243, likes: 89, hot: true },
  { id: "t2", title: "Fragments Urbains", artist: "Marc Leroy", price: 3800, image: "/placeholder-art.jpg", views: 987, likes: 67, hot: true },
  { id: "t3", title: "Méridien Doré", artist: "Sophie Chen", price: 5200, image: "/placeholder-art.jpg", views: 856, likes: 54, hot: true },
  { id: "t4", title: "Silence Bleu", artist: "Antoine Moreau", price: 1900, image: "/placeholder-art.jpg", views: 743, likes: 48, hot: false },
  { id: "t5", title: "Horizon Rouge", artist: "Léa Martin", price: 4100, image: "/placeholder-art.jpg", views: 692, likes: 41, hot: false },
  { id: "t6", title: "Abstraction Noire", artist: "Pierre Duval", price: 6700, image: "/placeholder-art.jpg", views: 621, likes: 38, hot: false },
  { id: "t7", title: "Le Passage", artist: "Emma Bernard", price: 3300, image: "/placeholder-art.jpg", views: 589, likes: 35, hot: false },
  { id: "t8", title: "Reflets d'Or", artist: "Hugo Petit", price: 2800, image: "/placeholder-art.jpg", views: 534, likes: 29, hot: false },
];

const mockArtists = [
  { id: "a1", name: "Claire Dubois", avatar: "/placeholder-art.jpg", trend: "+24%", works: 12 },
  { id: "a2", name: "Marc Leroy", avatar: "/placeholder-art.jpg", trend: "+18%", works: 8 },
  { id: "a3", name: "Sophie Chen", avatar: "/placeholder-art.jpg", trend: "+15%", works: 15 },
  { id: "a4", name: "Antoine Moreau", avatar: "/placeholder-art.jpg", trend: "+12%", works: 6 },
  { id: "a5", name: "Léa Martin", avatar: "/placeholder-art.jpg", trend: "+9%", works: 10 },
];

const mockNew = [
  { id: "n1", title: "Aube Nouvelle", artist: "Julie Fontaine", price: 1800, image: "/placeholder-art.jpg" },
  { id: "n2", title: "Terre Promise", artist: "Karim Bensalem", price: 2200, image: "/placeholder-art.jpg" },
  { id: "n3", title: "Ondes Vibrantes", artist: "Nathalie Roux", price: 3500, image: "/placeholder-art.jpg" },
  { id: "n4", title: "Vestige", artist: "Thomas Blanc", price: 4800, image: "/placeholder-art.jpg" },
  { id: "n5", title: "Cosmos Intérieur", artist: "Amira Khalil", price: 2900, image: "/placeholder-art.jpg" },
  { id: "n6", title: "Le Souffle", artist: "Lucas Girard", price: 1500, image: "/placeholder-art.jpg" },
];

export default function TrendingPage() {
  const [period, setPeriod] = useState("week");
  const [loading, setLoading] = useState(true);
  const [artworks, setArtworks] = useState(mockTrending);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/artworks?sort=trending&period=${period}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.artworks?.length) setArtworks(d.artworks);
        else setArtworks(mockTrending);
      })
      .catch(() => setArtworks(mockTrending))
      .finally(() => setLoading(false));
  }, [period]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-10">
        <div>
          <h1 className="font-playfair text-3xl sm:text-4xl font-semibold text-white">Tendances</h1>
          <p className="text-white/40 text-sm mt-1">Les oeuvres et artistes les plus populaires</p>
        </div>
        <div className="flex gap-2">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`px-4 py-2 rounded-full text-sm transition-all ${
                period === p.key
                  ? "bg-[#D4AF37] text-black font-semibold"
                  : "bg-white/[0.03] border border-white/10 text-white/60 hover:text-white hover:border-white/20"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-2 border-[#D4AF37]/30 border-t-[#D4AF37] rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Hot Section */}
          <section className="mb-14">
            <div className="flex items-center gap-2 mb-6">
              <Flame className="size-5 text-orange-500" />
              <h2 className="text-xl font-semibold text-white">Hot</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {artworks.slice(0, 8).map((a, i) => (
                <Link
                  key={a.id}
                  href={`/art-core/oeuvre/${a.id}`}
                  className="group relative rounded-2xl overflow-hidden bg-white/[0.03] border border-white/10 hover:border-[#D4AF37]/30 transition-all"
                >
                  <div className="relative aspect-[4/3] bg-[#111]">
                    <Image
                      src={a.image || "/placeholder-art.jpg"}
                      alt={a.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    />
                    {i < 3 && (
                      <div className="absolute top-3 left-3 flex items-center gap-1 bg-orange-500/90 backdrop-blur-sm text-white text-[11px] font-bold px-2.5 py-1 rounded-full">
                        <Flame className="size-3" />
                        HOT
                      </div>
                    )}
                    <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm text-white text-[11px] px-2 py-1 rounded-full">
                      #{i + 1}
                    </div>
                  </div>
                  <div className="p-4">
                    <p className="text-xs text-white/40 mb-1">{a.artist}</p>
                    <h3 className="text-sm font-semibold text-white line-clamp-1">{a.title}</h3>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[#D4AF37] font-bold text-sm">{formatPrice(a.price)}</span>
                      <div className="flex items-center gap-3 text-white/30 text-[11px]">
                        <span className="flex items-center gap-1"><Eye className="size-3" />{a.views}</span>
                        <span className="flex items-center gap-1"><Heart className="size-3" />{a.likes}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {/* Artists Section */}
          <section className="mb-14">
            <div className="flex items-center gap-2 mb-6">
              <Star className="size-5 text-[#D4AF37]" />
              <h2 className="text-xl font-semibold text-white">Artistes en vue</h2>
            </div>
            <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
              {mockArtists.map((artist) => (
                <Link
                  key={artist.id}
                  href={`/art-core/profil/${artist.id}`}
                  className="flex-shrink-0 w-44 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-[#D4AF37]/30 transition-all p-5 text-center group"
                >
                  <div className="w-16 h-16 rounded-full bg-[#111] mx-auto mb-3 overflow-hidden border-2 border-white/10 group-hover:border-[#D4AF37]/50 transition-colors">
                    <Image src={artist.avatar} alt={artist.name} width={64} height={64} className="object-cover w-full h-full" />
                  </div>
                  <p className="text-sm font-semibold text-white truncate">{artist.name}</p>
                  <p className="text-[11px] text-white/30 mt-0.5">{artist.works} oeuvres</p>
                  <div className="flex items-center justify-center gap-1 mt-2 text-green-400 text-xs font-semibold">
                    <TrendingUp className="size-3" />
                    {artist.trend}
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {/* New Artworks Section */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Clock className="size-5 text-white/40" />
                <h2 className="text-xl font-semibold text-white">Nouvelles oeuvres</h2>
              </div>
              <Link href="/art-core?sort=newest" className="flex items-center gap-1 text-[#D4AF37] text-sm hover:underline">
                Voir tout <ArrowUpRight className="size-3" />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {mockNew.map((a) => (
                <Link
                  key={a.id}
                  href={`/art-core/oeuvre/${a.id}`}
                  className="group rounded-2xl overflow-hidden bg-white/[0.03] border border-white/10 hover:border-[#D4AF37]/30 transition-all"
                >
                  <div className="relative aspect-[4/3] bg-[#111]">
                    <Image
                      src={a.image}
                      alt={a.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                    <div className="absolute top-3 left-3 bg-[#D4AF37]/90 backdrop-blur-sm text-black text-[11px] font-bold px-2.5 py-1 rounded-full">
                      NOUVEAU
                    </div>
                  </div>
                  <div className="p-4">
                    <p className="text-xs text-white/40 mb-1">{a.artist}</p>
                    <h3 className="text-sm font-semibold text-white line-clamp-1">{a.title}</h3>
                    <p className="text-[#D4AF37] font-bold text-sm mt-1">{formatPrice(a.price)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
