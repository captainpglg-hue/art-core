"use client";

import { useState } from "react";
import { Search, CheckCircle, XCircle, Clock, Loader2 } from "lucide-react";

type ArtworkStatus = "certified" | "pending" | "rejected";

const statusConfig: Record<ArtworkStatus, { label: string; color: string; icon: React.FC<{ className?: string }> }> = {
  certified: { label: "Certifié", color: "bg-emerald-500/20 text-emerald-400", icon: CheckCircle },
  pending: { label: "En attente", color: "bg-yellow-500/20 text-yellow-400", icon: Clock },
  rejected: { label: "Rejeté", color: "bg-red-500/20 text-red-400", icon: XCircle },
};

const mockArtworks = [
  { id: 1, title: "Lumière Dorée", artist: "Marie Dupont", status: "certified" as ArtworkStatus, date: "2026-03-18", price: "2 400 €" },
  { id: 2, title: "Fragment Nocturne", artist: "Emma Leroy", status: "pending" as ArtworkStatus, date: "2026-03-20", price: "1 800 €" },
  { id: 3, title: "Horizon Abstrait", artist: "Thomas Bernard", status: "rejected" as ArtworkStatus, date: "2026-03-15", price: "950 €" },
  { id: 4, title: "Éclat Urbain", artist: "Marie Dupont", status: "certified" as ArtworkStatus, date: "2026-03-10", price: "3 200 €" },
  { id: 5, title: "Murmure Bleu", artist: "Emma Leroy", status: "pending" as ArtworkStatus, date: "2026-03-21", price: "1 450 €" },
  { id: 6, title: "Vestige", artist: "Thomas Bernard", status: "certified" as ArtworkStatus, date: "2026-03-05", price: "5 600 €" },
];

export default function AdminArtworks() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filtered = mockArtworks.filter((a) => {
    const matchSearch = a.title.toLowerCase().includes(search.toLowerCase()) || a.artist.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || a.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="animate-fade-in space-y-6">
      <h1 className="font-playfair text-2xl md:text-3xl font-bold text-white">
        Oeuvres
      </h1>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/30" />
          <input
            type="text"
            placeholder="Rechercher par titre ou artiste..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#D4AF37]/50"
          />
        </div>
        <div className="flex gap-2">
          {[
            { key: "all", label: "Tous" },
            { key: "pending", label: "En attente" },
            { key: "certified", label: "Certifié" },
            { key: "rejected", label: "Rejeté" },
          ].map((s) => (
            <button
              key={s.key}
              onClick={() => setStatusFilter(s.key)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === s.key
                  ? "bg-[#D4AF37] text-black"
                  : "bg-white/[0.03] border border-white/10 text-white/60 hover:text-white"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Artwork Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((artwork) => {
          const st = statusConfig[artwork.status];
          const StIcon = st.icon;
          return (
            <div
              key={artwork.id}
              className="bg-white/[0.03] border border-white/10 rounded-2xl overflow-hidden group"
            >
              {/* Thumbnail placeholder */}
              <div className="aspect-[4/3] bg-gradient-to-br from-white/[0.05] to-white/[0.02] flex items-center justify-center">
                <span className="text-white/10 text-4xl font-playfair">{artwork.title[0]}</span>
              </div>

              <div className="p-4 space-y-3">
                <div>
                  <h3 className="text-white font-semibold text-sm">{artwork.title}</h3>
                  <p className="text-white/40 text-xs">{artwork.artist}</p>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[#D4AF37] text-sm font-bold">{artwork.price}</span>
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${st.color}`}>
                    <StIcon className="size-3" />
                    {st.label}
                  </span>
                </div>

                <p className="text-xs text-white/30">{artwork.date}</p>

                {/* Moderation actions */}
                {artwork.status === "pending" && (
                  <div className="flex gap-2 pt-1">
                    <button className="flex-1 py-2 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-medium hover:bg-emerald-500/30 transition-colors">
                      Approuver
                    </button>
                    <button className="flex-1 py-2 rounded-lg bg-[#ff6347]/20 text-[#ff6347] text-xs font-medium hover:bg-[#ff6347]/30 transition-colors">
                      Rejeter
                    </button>
                  </div>
                )}
                {artwork.status === "certified" && (
                  <div className="flex gap-2 pt-1">
                    <button className="flex-1 py-2 rounded-lg bg-[#ff6347]/10 text-[#ff6347]/70 text-xs font-medium hover:bg-[#ff6347]/20 hover:text-[#ff6347] transition-colors">
                      Révoquer certification
                    </button>
                  </div>
                )}
                {artwork.status === "rejected" && (
                  <div className="flex gap-2 pt-1">
                    <button className="flex-1 py-2 rounded-lg bg-emerald-500/10 text-emerald-400/70 text-xs font-medium hover:bg-emerald-500/20 hover:text-emerald-400 transition-colors">
                      Réexaminer
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-white/30">
          Aucune oeuvre trouvée
        </div>
      )}
    </div>
  );
}
