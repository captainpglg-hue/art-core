"use client";

import { useState } from "react";
import {
  Search,
  TrendingUp,
  TrendingDown,
  Eye,
  Image as ImageIcon,
  Check,
  ArrowUpDown,
  UserPlus,
} from "lucide-react";

const mockArtists = [
  { id: 1, name: "Léa Fontaine", technique: "Huile sur toile", cote: 87, evolution: 12.5, works: 24, scouted: true, royaltyEarned: 180 },
  { id: 2, name: "Marco Bellucci", technique: "Sculpture bronze", cote: 72, evolution: -3.2, works: 11, scouted: false, royaltyEarned: 0 },
  { id: 3, name: "Nadia Kowalski", technique: "Art numérique", cote: 93, evolution: 28.1, works: 45, scouted: true, royaltyEarned: 420 },
  { id: 4, name: "Yuki Tanaka", technique: "Aquarelle", cote: 65, evolution: 5.8, works: 18, scouted: false, royaltyEarned: 0 },
  { id: 5, name: "Omar Diallo", technique: "Photographie", cote: 81, evolution: -1.4, works: 32, scouted: true, royaltyEarned: 95 },
  { id: 6, name: "Clara Dubois", technique: "Technique mixte", cote: 78, evolution: 15.3, works: 14, scouted: false, royaltyEarned: 0 },
  { id: 7, name: "Andrei Petrov", technique: "Gravure", cote: 56, evolution: -8.7, works: 9, scouted: false, royaltyEarned: 0 },
  { id: 8, name: "Fatima El Amri", technique: "Céramique", cote: 91, evolution: 22.0, works: 27, scouted: true, royaltyEarned: 310 },
];

type Filter = "tous" | "scoutes" | "hausse" | "baisse";
type Sort = "cote" | "recent" | "alpha";

export default function ArtistesPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("tous");
  const [sort, setSort] = useState<Sort>("cote");
  const [artists, setArtists] = useState(mockArtists);

  const handleScout = (id: number) => {
    setArtists((prev) =>
      prev.map((a) => (a.id === id ? { ...a, scouted: true } : a))
    );
  };

  const filters: { key: Filter; label: string }[] = [
    { key: "tous", label: "Tous" },
    { key: "scoutes", label: "Mes scoutés" },
    { key: "hausse", label: "En hausse" },
    { key: "baisse", label: "En baisse" },
  ];

  const filtered = artists
    .filter((a) => {
      if (search && !a.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (filter === "scoutes") return a.scouted;
      if (filter === "hausse") return a.evolution > 0;
      if (filter === "baisse") return a.evolution < 0;
      return true;
    })
    .sort((a, b) => {
      if (sort === "cote") return b.cote - a.cote;
      if (sort === "alpha") return a.name.localeCompare(b.name);
      return b.id - a.id;
    });

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 animate-fade-in">
      <h1 className="font-playfair text-3xl font-semibold text-white mb-2">Artistes</h1>
      <p className="text-white/40 text-sm mb-6">Scoutez, suivez et investissez dans les talents de demain.</p>

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/30" />
          <input
            type="text"
            placeholder="Rechercher un artiste..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white text-sm placeholder:text-white/25 focus:outline-none focus:border-[#2ecc71]/40"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                filter === f.key
                  ? "bg-[#2ecc71]/20 text-[#2ecc71] border border-[#2ecc71]/30"
                  : "bg-white/[0.05] text-white/40 border border-white/[0.08] hover:text-white/60"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sort */}
      <div className="flex items-center gap-2 mb-4">
        <ArrowUpDown className="size-3.5 text-white/30" />
        <span className="text-xs text-white/30">Trier par :</span>
        {(["cote", "recent", "alpha"] as Sort[]).map((s) => (
          <button
            key={s}
            onClick={() => setSort(s)}
            className={`text-xs px-2 py-1 rounded ${
              sort === s ? "text-[#2ecc71]" : "text-white/30 hover:text-white/50"
            }`}
          >
            {s === "cote" ? "Cote" : s === "recent" ? "Récent" : "A-Z"}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {filtered.map((artist) => (
          <div
            key={artist.id}
            className="rounded-2xl bg-white/[0.03] border border-white/[0.08] p-5 hover:bg-white/[0.05] transition-colors"
          >
            {/* Avatar */}
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#2ecc71]/20 to-[#D4AF37]/20 flex items-center justify-center mb-3">
              <span className="text-lg font-bold text-white/60">
                {artist.name.split(" ").map((n) => n[0]).join("")}
              </span>
            </div>

            <h3 className="text-sm font-semibold text-white mb-0.5">{artist.name}</h3>
            <p className="text-[11px] text-white/30 mb-3">{artist.technique}</p>

            <div className="space-y-1.5 text-xs mb-4">
              <div className="flex justify-between">
                <span className="text-white/30">Cote</span>
                <span className="text-white/70 font-medium tabular-nums">{artist.cote}/100</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/30">Évolution</span>
                <span className={`flex items-center gap-0.5 font-medium tabular-nums ${artist.evolution > 0 ? "text-[#2ecc71]" : "text-red-400"}`}>
                  {artist.evolution > 0 ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                  {artist.evolution > 0 ? "+" : ""}
                  {artist.evolution}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/30">Oeuvres</span>
                <span className="text-white/70 tabular-nums">{artist.works}</span>
              </div>
              {artist.scouted && artist.royaltyEarned > 0 && (
                <div className="flex justify-between">
                  <span className="text-white/30">Royalty</span>
                  <span className="text-[#D4AF37] font-medium tabular-nums">{artist.royaltyEarned} €</span>
                </div>
              )}
            </div>

            {artist.scouted ? (
              <div className="flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#2ecc71]/10 border border-[#2ecc71]/20">
                <Check className="size-3.5 text-[#2ecc71]" />
                <span className="text-xs font-medium text-[#2ecc71]">Scouté</span>
              </div>
            ) : (
              <button
                onClick={() => handleScout(artist.id)}
                className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#2ecc71]/10 border border-[#2ecc71]/20 text-[#2ecc71] text-xs font-medium hover:bg-[#2ecc71]/20 transition-colors"
              >
                <UserPlus className="size-3.5" />
                Scout
              </button>
            )}
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-white/25 text-sm py-12">Aucun artiste trouvé</p>
      )}
    </div>
  );
}
