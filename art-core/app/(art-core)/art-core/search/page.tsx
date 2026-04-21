"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Search, SlidersHorizontal, X, MapPin, Lock, ShieldCheck,
  Star, ChevronDown, Navigation, Package,
} from "lucide-react";
import { cn, formatPrice } from "@/lib/utils";
import { resolveFirstPhoto } from "@/lib/resolve-photo";
import { GaugeBar } from "@/components/art-core/GaugeBar";

const CATEGORIES = [
  { label: "Toutes", value: "" },
  { label: "Peinture", value: "painting" },
  { label: "Sculpture", value: "sculpture" },
  { label: "Photo", value: "photography" },
  { label: "Numérique", value: "digital" },
  { label: "Dessin", value: "drawing" },
  { label: "Mixte", value: "mixed_media" },
  { label: "Céramique", value: "ceramics" },
];

const TECHNIQUES = ["Huile", "Aquarelle", "Acrylique", "Pastel", "Encre", "Mixte", "Gouache", "Fusain"];
const STYLES = ["contemporain", "abstrait", "figuratif", "classique", "street art", "minimaliste", "pop art", "conceptuel"];
const FORMATS = [
  { label: "Tous", value: "" },
  { label: "Petit (<30cm)", value: "small" },
  { label: "Moyen (30-100cm)", value: "medium" },
  { label: "Grand (>100cm)", value: "large" },
];
const GAUGES = [
  { label: "Toutes", value: "" },
  { label: "Jauge vide", value: "empty" },
  { label: "En cours", value: "active" },
  { label: "Deal verrouillé", value: "locked" },
];
const SORTS = [
  { label: "Plus récent", value: "newest" },
  { label: "Moins cher", value: "price_asc" },
  { label: "Plus cher", value: "price_desc" },
  { label: "Jauge max", value: "gauge" },
  { label: "Populaire", value: "popular" },
];
const RADIUSES = [
  { label: "10 km", value: 10 },
  { label: "30 km", value: 30 },
  { label: "50 km", value: 50 },
  { label: "100 km", value: 100 },
  { label: "France", value: 1000 },
  { label: "Tous", value: 0 },
];

type Filters = {
  q: string; category: string; technique: string; style: string;
  price_min: string; price_max: string; format: string; gauge: string;
  certified: string; sort: string; city: string; radius: number;
  pickup: string; lat: number; lon: number;
};

export default function SearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [artworks, setArtworks] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const debounceRef = useRef<any>(null);

  const [filters, setFilters] = useState<Filters>({
    q: searchParams.get("q") || "",
    category: searchParams.get("category") || "",
    technique: searchParams.get("technique") || "",
    style: searchParams.get("style") || "",
    price_min: searchParams.get("price_min") || "",
    price_max: searchParams.get("price_max") || "",
    format: searchParams.get("format") || "",
    gauge: searchParams.get("gauge") || "",
    certified: searchParams.get("certified") || "",
    sort: searchParams.get("sort") || "newest",
    city: searchParams.get("city") || "",
    radius: parseInt(searchParams.get("radius") || "0"),
    pickup: searchParams.get("pickup") || "",
    lat: parseFloat(searchParams.get("lat") || "0"),
    lon: parseFloat(searchParams.get("lon") || "0"),
  });

  const updateFilter = useCallback((key: string, value: any) => {
    setFilters(f => ({ ...f, [key]: value }));
  }, []);

  // Search with debounce
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      doSearch();
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [filters]);

  async function doSearch() {
    setLoading(true);
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v && v !== "0" && v !== 0) params.set(k, String(v));
    });

    // Update URL
    router.replace(`/art-core/search?${params.toString()}`, { scroll: false });

    try {
      const res = await fetch(`/api/search?${params.toString()}`);
      const data = await res.json();
      setArtworks(data.artworks || []);
      setTotal(data.total || 0);
    } catch { }
    finally { setLoading(false); }
  }

  function requestGeo() {
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFilters(f => ({ ...f, lat: pos.coords.latitude, lon: pos.coords.longitude, radius: f.radius || 50 }));
        setGeoLoading(false);
      },
      () => { setGeoLoading(false); },
      { enableHighAccuracy: false, timeout: 10000 }
    );
  }

  function clearFilters() {
    setFilters({ q: "", category: "", technique: "", style: "", price_min: "", price_max: "",
      format: "", gauge: "", certified: "", sort: "newest", city: "", radius: 0, pickup: "", lat: 0, lon: 0 });
  }

  const activeFilterCount = Object.entries(filters).filter(([k, v]) =>
    v && v !== "" && v !== "0" && v !== 0 && k !== "q" && k !== "sort" && k !== "lat" && k !== "lon"
  ).length;

  // Active filter chips
  const chips: { label: string; key: string }[] = [];
  if (filters.category) chips.push({ label: CATEGORIES.find(c => c.value === filters.category)?.label || filters.category, key: "category" });
  if (filters.technique) chips.push({ label: filters.technique, key: "technique" });
  if (filters.style) chips.push({ label: filters.style, key: "style" });
  if (filters.format) chips.push({ label: FORMATS.find(f => f.value === filters.format)?.label || "", key: "format" });
  if (filters.gauge) chips.push({ label: GAUGES.find(g => g.value === filters.gauge)?.label || "", key: "gauge" });
  if (filters.certified) chips.push({ label: filters.certified === "yes" ? "Certifié" : "Non certifié", key: "certified" });
  if (filters.city) chips.push({ label: filters.city, key: "city" });
  if (filters.radius) chips.push({ label: `${filters.radius} km`, key: "radius" });
  if (filters.pickup) chips.push({ label: "Retrait possible", key: "pickup" });
  if (filters.price_min) chips.push({ label: `Min ${filters.price_min}€`, key: "price_min" });
  if (filters.price_max) chips.push({ label: `Max ${filters.price_max}€`, key: "price_max" });

  return (
    <div className="max-w-screen-2xl mx-auto">
      {/* Search bar */}
      <div className="sticky top-16 z-20 bg-[#0a0a0a]/95 backdrop-blur-xl border-b border-white/[0.06] px-4 py-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-white/30" />
            <input
              value={filters.q}
              onChange={(e) => updateFilter("q", e.target.value)}
              placeholder="Rechercher une oeuvre, artiste, style..."
              className="w-full h-11 pl-10 pr-4 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-[#C9A84C]/40"
            />
            {filters.q && (
              <button onClick={() => updateFilter("q", "")} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30">
                <X className="size-4" />
              </button>
            )}
          </div>
          <button onClick={() => setFiltersOpen(true)}
            className={cn("w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border transition-colors",
              activeFilterCount > 0 ? "bg-[#C9A84C]/10 border-[#C9A84C]/30 text-[#C9A84C]" : "bg-white/5 border-white/10 text-white/40"
            )}>
            <SlidersHorizontal className="size-5" />
            {activeFilterCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#C9A84C] text-[#0a0a0a] text-[10px] font-bold flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Active chips */}
        {chips.length > 0 && (
          <div className="flex gap-1.5 mt-2 overflow-x-auto no-scrollbar">
            {chips.map((c) => (
              <button key={c.key} onClick={() => updateFilter(c.key, c.key === "radius" ? 0 : "")}
                className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#C9A84C]/10 border border-[#C9A84C]/20 text-[#C9A84C] text-xs">
                {c.label} <X className="size-3" />
              </button>
            ))}
            <button onClick={clearFilters} className="shrink-0 px-2.5 py-1 rounded-full text-white/30 text-xs">
              Tout effacer
            </button>
          </div>
        )}

        {/* Results count */}
        <p className="text-[11px] text-white/25 mt-2">
          {loading ? "Recherche..." : `${total} oeuvre${total !== 1 ? "s" : ""} trouvée${total !== 1 ? "s" : ""}`}
        </p>
      </div>

      {/* Results grid */}
      <div className="px-4 py-4">
        {artworks.length === 0 && !loading ? (
          <div className="text-center py-16">
            <Search className="size-12 text-white/10 mx-auto mb-4" />
            <p className="text-white/40">Aucun résultat</p>
            <p className="text-white/20 text-xs mt-1">Modifiez vos filtres</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {artworks.map((a) => (
              <Link key={a.id} href={`/art-core/oeuvre/${a.id}`}
                className="group block rounded-2xl overflow-hidden bg-[#111111] active:scale-[0.98] transition-all">
                <div className="relative aspect-[3/4] bg-[#0a0a0a]">
                  <Image src={resolveFirstPhoto(a.photos)} alt={a.title} fill className="object-cover" sizes="50vw" />
                  {a.blockchain_hash && (
                    <span className="absolute top-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-black/60 text-[#C9A84C] text-[9px]">
                      <ShieldCheck className="size-2.5" />
                    </span>
                  )}
                  {a.gauge_locked === 1 && (
                    <span className="absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[#C9A84C]/20 text-[#C9A84C] text-[9px] font-bold">
                      <Lock className="size-2.5" />
                    </span>
                  )}
                  {a.pickup_available === 1 && (
                    <span className="absolute bottom-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-green-500/20 text-green-400 text-[9px]">
                      <Package className="size-2.5" />
                    </span>
                  )}
                </div>
                <div className="p-3">
                  <p className="text-[10px] text-white/30 truncate">{a.artist_name}</p>
                  <h3 className="text-xs font-semibold text-white line-clamp-1 mt-0.5">{a.title}</h3>
                  <p className="text-sm font-bold text-[#C9A84C] mt-1">{formatPrice(a.price)}</p>
                  <div className="flex items-center justify-between mt-1.5">
                    {a.city && (
                      <span className="flex items-center gap-0.5 text-[10px] text-white/25">
                        <MapPin className="size-2.5" />{a.city}
                        {a.distance_km ? ` · ${a.distance_km}km` : ""}
                      </span>
                    )}
                    <span className="text-[10px] text-white/20">{a.gauge_points}pts</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* ═══ Filter panel (slide from bottom) ═══ */}
      {filtersOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/70" onClick={() => setFiltersOpen(false)} />
          <div className="absolute bottom-0 left-0 right-0 max-h-[85vh] bg-[#111111] rounded-t-3xl overflow-y-auto animate-slide-up">
            {/* Handle */}
            <div className="sticky top-0 bg-[#111111] z-10 pt-3 pb-2 px-4 border-b border-white/5">
              <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-3" />
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Filtres</h2>
                <button onClick={() => setFiltersOpen(false)} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                  <X className="size-4 text-white/50" />
                </button>
              </div>
            </div>

            <div className="px-4 py-4 space-y-6 pb-24">
              {/* Sort */}
              <div>
                <p className="text-xs text-white/30 uppercase tracking-widest mb-2">Trier par</p>
                <div className="flex flex-wrap gap-2">
                  {SORTS.map(s => (
                    <button key={s.value} onClick={() => updateFilter("sort", s.value)}
                      className={cn("px-3 py-2 rounded-lg text-xs transition-all",
                        filters.sort === s.value ? "bg-[#C9A84C] text-black font-semibold" : "bg-white/5 text-white/50")}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price range */}
              <div>
                <p className="text-xs text-white/30 uppercase tracking-widest mb-2">Prix (€)</p>
                <div className="flex gap-3">
                  <input type="number" inputMode="numeric" value={filters.price_min} onChange={e => updateFilter("price_min", e.target.value)}
                    placeholder="Min" className="flex-1 h-11 rounded-xl bg-white/5 border border-white/10 text-white text-sm px-3 focus:outline-none focus:border-[#C9A84C]/40" />
                  <span className="text-white/20 self-center">—</span>
                  <input type="number" inputMode="numeric" value={filters.price_max} onChange={e => updateFilter("price_max", e.target.value)}
                    placeholder="Max" className="flex-1 h-11 rounded-xl bg-white/5 border border-white/10 text-white text-sm px-3 focus:outline-none focus:border-[#C9A84C]/40" />
                </div>
              </div>

              {/* Category */}
              <div>
                <p className="text-xs text-white/30 uppercase tracking-widest mb-2">Catégorie</p>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map(c => (
                    <button key={c.value} onClick={() => updateFilter("category", c.value)}
                      className={cn("px-3 py-2 rounded-lg text-xs transition-all",
                        filters.category === c.value ? "bg-[#C9A84C] text-black font-semibold" : "bg-white/5 text-white/50")}>
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Technique */}
              <div>
                <p className="text-xs text-white/30 uppercase tracking-widest mb-2">Technique</p>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => updateFilter("technique", "")}
                    className={cn("px-3 py-2 rounded-lg text-xs", !filters.technique ? "bg-[#C9A84C] text-black font-semibold" : "bg-white/5 text-white/50")}>Toutes</button>
                  {TECHNIQUES.map(t => (
                    <button key={t} onClick={() => updateFilter("technique", t)}
                      className={cn("px-3 py-2 rounded-lg text-xs", filters.technique === t ? "bg-[#C9A84C] text-black font-semibold" : "bg-white/5 text-white/50")}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Style */}
              <div>
                <p className="text-xs text-white/30 uppercase tracking-widest mb-2">Style</p>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => updateFilter("style", "")}
                    className={cn("px-3 py-2 rounded-lg text-xs", !filters.style ? "bg-[#C9A84C] text-black font-semibold" : "bg-white/5 text-white/50")}>Tous</button>
                  {STYLES.map(s => (
                    <button key={s} onClick={() => updateFilter("style", s)}
                      className={cn("px-3 py-2 rounded-lg text-xs capitalize", filters.style === s ? "bg-[#C9A84C] text-black font-semibold" : "bg-white/5 text-white/50")}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Format */}
              <div>
                <p className="text-xs text-white/30 uppercase tracking-widest mb-2">Format</p>
                <div className="flex flex-wrap gap-2">
                  {FORMATS.map(f => (
                    <button key={f.value} onClick={() => updateFilter("format", f.value)}
                      className={cn("px-3 py-2 rounded-lg text-xs", filters.format === f.value ? "bg-[#C9A84C] text-black font-semibold" : "bg-white/5 text-white/50")}>
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Gauge */}
              <div>
                <p className="text-xs text-white/30 uppercase tracking-widest mb-2">État de la jauge</p>
                <div className="flex flex-wrap gap-2">
                  {GAUGES.map(g => (
                    <button key={g.value} onClick={() => updateFilter("gauge", g.value)}
                      className={cn("px-3 py-2 rounded-lg text-xs", filters.gauge === g.value ? "bg-[#C9A84C] text-black font-semibold" : "bg-white/5 text-white/50")}>
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Certified */}
              <div>
                <p className="text-xs text-white/30 uppercase tracking-widest mb-2">Certification blockchain</p>
                <div className="flex gap-2">
                  {[{ label: "Tous", value: "" }, { label: "Certifié", value: "yes" }, { label: "Non certifié", value: "no" }].map(c => (
                    <button key={c.value} onClick={() => updateFilter("certified", c.value)}
                      className={cn("px-3 py-2 rounded-lg text-xs flex-1", filters.certified === c.value ? "bg-[#C9A84C] text-black font-semibold" : "bg-white/5 text-white/50")}>
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Geo */}
              <div>
                <p className="text-xs text-white/30 uppercase tracking-widest mb-2">Localisation</p>
                <div className="space-y-3">
                  <input value={filters.city} onChange={e => updateFilter("city", e.target.value)}
                    placeholder="Ville ou code postal"
                    className="w-full h-11 rounded-xl bg-white/5 border border-white/10 text-white text-sm px-3 focus:outline-none focus:border-[#C9A84C]/40" />

                  <button onClick={requestGeo} disabled={geoLoading}
                    className="w-full h-11 rounded-xl border border-[#C9A84C]/20 text-[#C9A84C] text-sm flex items-center justify-center gap-2 active:bg-[#C9A84C]/5">
                    {geoLoading ? <div className="w-4 h-4 border-2 border-[#C9A84C]/30 border-t-[#C9A84C] rounded-full animate-spin" /> : <Navigation className="size-4" />}
                    Utiliser ma position
                  </button>

                  {(filters.lat !== 0 || filters.city) && (
                    <div>
                      <p className="text-[11px] text-white/30 mb-1.5">Rayon</p>
                      <div className="flex flex-wrap gap-2">
                        {RADIUSES.map(r => (
                          <button key={r.value} onClick={() => updateFilter("radius", r.value)}
                            className={cn("px-3 py-2 rounded-lg text-xs", filters.radius === r.value ? "bg-[#C9A84C] text-black font-semibold" : "bg-white/5 text-white/50")}>
                            {r.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <label className="flex items-center gap-3 py-2">
                    <input type="checkbox" checked={filters.pickup === "yes"} onChange={e => updateFilter("pickup", e.target.checked ? "yes" : "")}
                      className="w-5 h-5 rounded bg-white/5 border-white/10 accent-[#C9A84C]" />
                    <span className="text-sm text-white/60">Retrait en main propre possible</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Apply button */}
            <div className="sticky bottom-0 bg-[#111111] border-t border-white/5 p-4 safe-area-bottom">
              <button onClick={() => setFiltersOpen(false)}
                className="w-full py-4 rounded-xl bg-[#C9A84C] text-[#0a0a0a] font-semibold active:brightness-90">
                Voir {total} résultat{total !== 1 ? "s" : ""}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
