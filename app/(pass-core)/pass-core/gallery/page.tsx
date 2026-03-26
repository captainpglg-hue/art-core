"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Loader2, Search, Filter, Grid3X3, Calendar, User } from "lucide-react";

interface CertificateCard {
  id: string;
  title: string;
  artist: string;
  image_url?: string;
  status: string;
  created_at: string;
}

type FilterStatus = "all" | "certified" | "pending";

export default function GalleryPage() {
  const router = useRouter();
  const [certificates, setCertificates] = useState<CertificateCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function fetchCertificates() {
      try {
        const res = await fetch("/api/certification?all=true");
        const data = await res.json();
        if (res.ok && Array.isArray(data)) {
          setCertificates(data);
        } else if (res.ok && data.certificates) {
          setCertificates(data.certificates);
        }
      } catch {}
      finally { setLoading(false); }
    }
    fetchCertificates();
  }, []);

  const filtered = certificates.filter((c) => {
    if (filter === "certified" && c.status !== "certified") return false;
    if (filter === "pending" && c.status !== "pending") return false;
    if (search) {
      const q = search.toLowerCase();
      return c.title.toLowerCase().includes(q) || c.artist.toLowerCase().includes(q);
    }
    return true;
  });

  const FILTERS: { key: FilterStatus; label: string }[] = [
    { key: "all", label: "Toutes" },
    { key: "certified", label: "Certifiees" },
    { key: "pending", label: "En attente" },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 pb-24 animate-fade-in">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-playfair text-2xl font-semibold text-white mb-1">Galerie des certificats</h1>
        <p className="text-white/40 text-sm">Toutes les œuvres certifiées par PASS-CORE</p>
      </div>

      {/* Search & Filters */}
      <div className="mb-6 space-y-3">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-white/30" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par titre ou artiste..."
            className="w-full h-12 rounded-xl bg-white/5 border border-white/10 text-white pl-11 pr-4 text-sm focus:outline-none focus:border-[#D4AF37]/40"
          />
        </div>
        <div className="flex gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${
                filter === f.key
                  ? "bg-[#D4AF37] text-[#0A1128]"
                  : "bg-white/5 text-white/50 active:bg-white/10"
              }`}
            >
              {f.label}
            </button>
          ))}
          <div className="ml-auto text-xs text-white/30 flex items-center gap-1">
            <Grid3X3 className="size-3.5" /> {filtered.length} resultats
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-8 text-[#D4AF37] animate-spin" />
        </div>
      )}

      {/* Empty */}
      {!loading && filtered.length === 0 && (
        <div className="text-center py-20">
          <ShieldCheck className="size-12 text-white/10 mx-auto mb-4" />
          <p className="text-white/30 text-sm">Aucun certificat trouve</p>
          {search && (
            <button onClick={() => setSearch("")} className="mt-3 text-[#D4AF37] text-xs underline">
              Effacer la recherche
            </button>
          )}
        </div>
      )}

      {/* Grid */}
      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
          {filtered.map((cert) => (
            <button
              key={cert.id}
              onClick={() => router.push(`/pass-core/certificate/${cert.id}`)}
              className="group rounded-2xl overflow-hidden border border-white/8 bg-white/[0.02] text-left transition-all hover:border-[#D4AF37]/30 hover:bg-white/[0.04] active:scale-[0.98]"
            >
              {/* Image */}
              <div className="aspect-square bg-white/5 relative overflow-hidden">
                {cert.image_url ? (
                  <img src={cert.image_url} alt={cert.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ShieldCheck className="size-8 text-white/10" />
                  </div>
                )}
                {/* Status badge */}
                <div className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                  cert.status === "certified"
                    ? "bg-green-500/20 text-green-400"
                    : "bg-yellow-500/20 text-yellow-400"
                }`}>
                  {cert.status === "certified" ? "Certifie" : "En attente"}
                </div>
              </div>

              {/* Info */}
              <div className="p-3">
                <p className="text-sm text-white font-medium truncate">{cert.title}</p>
                <div className="flex items-center gap-1 mt-1">
                  <User className="size-3 text-white/20" />
                  <p className="text-[11px] text-white/40 truncate">{cert.artist}</p>
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <Calendar className="size-3 text-white/20" />
                  <p className="text-[11px] text-white/30">{new Date(cert.created_at).toLocaleDateString("fr-FR")}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
