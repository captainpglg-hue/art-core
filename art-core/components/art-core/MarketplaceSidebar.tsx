"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState, useTransition } from "react";
import { ChevronDown, X, Search } from "lucide-react";
import { cn } from "@/lib/utils";

const CATEGORIES: { id: string; label: string; techniques: { id: string; label: string }[] }[] = [
  {
    id: "painting",
    label: "Peinture",
    techniques: [
      { id: "huile", label: "Huile" },
      { id: "acrylique", label: "Acrylique" },
      { id: "aquarelle", label: "Aquarelle" },
      { id: "pastel", label: "Pastel" },
      { id: "gouache", label: "Gouache" },
      { id: "encre", label: "Encre" },
    ],
  },
  {
    id: "sculpture",
    label: "Sculpture",
    techniques: [
      { id: "bronze", label: "Bronze" },
      { id: "marbre", label: "Marbre" },
      { id: "bois", label: "Bois" },
      { id: "pierre", label: "Pierre" },
      { id: "metal", label: "Métal" },
      { id: "resine", label: "Résine" },
    ],
  },
  {
    id: "photography",
    label: "Photographie",
    techniques: [
      { id: "argentique", label: "Argentique" },
      { id: "numerique", label: "Numérique" },
      { id: "polaroid", label: "Polaroïd" },
      { id: "noir-blanc", label: "Noir & Blanc" },
    ],
  },
  {
    id: "drawing",
    label: "Dessin",
    techniques: [
      { id: "fusain", label: "Fusain" },
      { id: "sanguine", label: "Sanguine" },
      { id: "crayon", label: "Crayon" },
      { id: "encre-chine", label: "Encre de Chine" },
    ],
  },
  {
    id: "digital",
    label: "Art numérique",
    techniques: [
      { id: "nft", label: "NFT" },
      { id: "impression", label: "Tirage d'art" },
      { id: "3d", label: "Œuvre 3D" },
      { id: "generatif", label: "Génératif" },
    ],
  },
  {
    id: "ceramics",
    label: "Céramique & verre",
    techniques: [
      { id: "faience", label: "Faïence" },
      { id: "porcelaine", label: "Porcelaine" },
      { id: "gres", label: "Grès" },
      { id: "verre-souffle", label: "Verre soufflé" },
      { id: "cristal", label: "Cristal" },
    ],
  },
  {
    id: "mixed_media",
    label: "Techniques mixtes",
    techniques: [
      { id: "collage", label: "Collage" },
      { id: "assemblage", label: "Assemblage" },
      { id: "street-art", label: "Street art" },
    ],
  },
  {
    id: "textile",
    label: "Textile",
    techniques: [
      { id: "tapisserie", label: "Tapisserie" },
      { id: "broderie", label: "Broderie" },
      { id: "tissage", label: "Tissage" },
      { id: "feutre", label: "Feutre" },
    ],
  },
  {
    id: "furniture",
    label: "Mobilier & objets d'art",
    techniques: [
      { id: "vintage", label: "Vintage" },
      { id: "design", label: "Design" },
      { id: "antiquite", label: "Antiquité" },
      { id: "luminaire", label: "Luminaire" },
    ],
  },
  {
    id: "prints",
    label: "Estampes",
    techniques: [
      { id: "lithographie", label: "Lithographie" },
      { id: "serigraphie", label: "Sérigraphie" },
      { id: "gravure", label: "Gravure" },
      { id: "linogravure", label: "Linogravure" },
    ],
  },
];

const PRICE_PRESETS = [
  { label: "Moins de 100 €", min: "0", max: "100" },
  { label: "100 – 500 €", min: "100", max: "500" },
  { label: "500 – 2 000 €", min: "500", max: "2000" },
  { label: "2 000 – 5 000 €", min: "2000", max: "5000" },
  { label: "5 000 – 20 000 €", min: "5000", max: "20000" },
  { label: "Plus de 20 000 €", min: "20000", max: "" },
];

const STATUS_OPTIONS = [
  { value: "sale", label: "En vente" },
  { value: "rent", label: "En location" },
  { value: "auction", label: "Enchère" },
  { value: "certified", label: "Certifié blockchain" },
];

const GAUGE_OPTIONS = [
  { value: "gauge_open", label: "Jauge ouverte" },
  { value: "gauge_locked", label: "Deal verrouillé" },
  { value: "gauge_hot", label: "Tendance" },
];

const SORT_OPTIONS = [
  { value: "recent", label: "Plus récent" },
  { value: "price_asc", label: "Prix croissant" },
  { value: "price_desc", label: "Prix décroissant" },
  { value: "gauge_desc", label: "Jauge la plus haute" },
  { value: "trending", label: "Tendance" },
];

export function MarketplaceSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const q = searchParams.get("q") ?? "";
  const category = searchParams.get("category") ?? "";
  const technique = searchParams.get("technique") ?? "";
  const status = searchParams.get("status") ?? "";
  const gauge = searchParams.get("gauge") ?? "";
  const sort = searchParams.get("sort") ?? "recent";
  const priceMin = searchParams.get("price_min") ?? "";
  const priceMax = searchParams.get("price_max") ?? "";

  const [openCat, setOpenCat] = useState<string | null>(category || null);
  const [localQ, setLocalQ] = useState(q);

  const updateParams = useCallback(
    (patch: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v === null || v === "") params.delete(k);
        else params.set(k, v);
      }
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`, { scroll: false });
      });
    },
    [pathname, router, searchParams]
  );

  const setCategory = (cid: string) => {
    if (category === cid) updateParams({ category: null, technique: null });
    else { updateParams({ category: cid, technique: null }); setOpenCat(cid); }
  };
  const setTechnique = (tid: string) => updateParams({ technique: technique === tid ? null : tid });
  const setPriceRange = (min: string, max: string) => {
    const isActive = priceMin === min && priceMax === max;
    if (isActive) updateParams({ price_min: null, price_max: null });
    else updateParams({ price_min: min || null, price_max: max || null });
  };
  const toggleStatus = (v: string) => updateParams({ status: status === v ? null : v });
  const toggleGauge = (v: string) => updateParams({ gauge: gauge === v ? null : v });
  const setSort = (v: string) => updateParams({ sort: v === "recent" ? null : v });
  const submitSearch = () => updateParams({ q: localQ.trim() || null });

  const hasFilters = useMemo(
    () => !!q || !!category || !!technique || !!status || !!gauge || sort !== "recent" || !!priceMin || !!priceMax,
    [q, category, technique, status, gauge, sort, priceMin, priceMax]
  );

  const clearAll = () => {
    setLocalQ(""); setOpenCat(null);
    startTransition(() => { router.push(pathname, { scroll: false }); });
  };

  return (
    <aside
      className={cn(
        "w-full lg:w-72 lg:shrink-0 lg:sticky lg:top-20 lg:self-start lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto",
        "rounded-2xl bg-[#0f0f0f] border border-white/[0.06] p-5 space-y-6 transition-opacity",
        isPending && "opacity-70"
      )}
    >
      <div className="space-y-2">
        <h3 className="text-[11px] uppercase tracking-widest text-white/40 font-semibold">Rechercher</h3>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-white/30" />
          <input
            type="text"
            value={localQ}
            onChange={(e) => setLocalQ(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") submitSearch(); }}
            onBlur={submitSearch}
            placeholder="Œuvre, artiste, style…"
            className="w-full h-10 pl-9 pr-3 rounded-lg bg-white/[0.04] border border-white/10 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#D4AF37]/50 focus:ring-1 focus:ring-[#D4AF37]/20"
          />
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-[11px] uppercase tracking-widest text-white/40 font-semibold">Trier par</h3>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="w-full h-10 px-3 rounded-lg bg-white/[0.04] border border-white/10 text-sm text-white focus:outline-none focus:border-[#D4AF37]/50"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value} className="bg-[#0f0f0f]">{o.label}</option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <h3 className="text-[11px] uppercase tracking-widest text-white/40 font-semibold">Catégories</h3>
        <div className="space-y-0.5">
          {CATEGORIES.map((cat) => {
            const isSelected = category === cat.id;
            const isOpen = openCat === cat.id;
            return (
              <div key={cat.id} className="rounded-lg overflow-hidden">
                <div className="flex items-center">
                  <button
                    onClick={() => setCategory(cat.id)}
                    className={cn(
                      "flex-1 text-left text-sm px-3 py-2 rounded-lg transition-colors",
                      isSelected ? "bg-[#D4AF37]/10 text-[#D4AF37] font-medium" : "text-white/70 hover:bg-white/[0.04] hover:text-white"
                    )}
                  >{cat.label}</button>
                  <button
                    onClick={() => setOpenCat(isOpen ? null : cat.id)}
                    className="p-2 text-white/30 hover:text-white/70 transition"
                    aria-label={isOpen ? "Réduire" : "Déplier"}
                  >
                    <ChevronDown className={cn("size-4 transition-transform", isOpen && "rotate-180")} />
                  </button>
                </div>
                {isOpen && (
                  <div className="pl-3 pr-1 pb-1 space-y-0.5">
                    {cat.techniques.map((t) => {
                      const tSelected = technique === t.id;
                      return (
                        <button
                          key={t.id}
                          onClick={() => setTechnique(t.id)}
                          className={cn(
                            "w-full text-left text-xs px-3 py-1.5 rounded-md transition-colors",
                            tSelected ? "bg-[#D4AF37]/15 text-[#D4AF37]" : "text-white/50 hover:bg-white/[0.04] hover:text-white/80"
                          )}
                        >{t.label}</button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-[11px] uppercase tracking-widest text-white/40 font-semibold">Prix</h3>
        <div className="space-y-0.5">
          {PRICE_PRESETS.map((p) => {
            const isActive = priceMin === p.min && priceMax === p.max;
            return (
              <button
                key={p.label}
                onClick={() => setPriceRange(p.min, p.max)}
                className={cn(
                  "w-full text-left text-sm px-3 py-2 rounded-lg transition-colors",
                  isActive ? "bg-[#D4AF37]/10 text-[#D4AF37] font-medium" : "text-white/70 hover:bg-white/[0.04] hover:text-white"
                )}
              >{p.label}</button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-[11px] uppercase tracking-widest text-white/40 font-semibold">État</h3>
        <div className="space-y-0.5">
          {STATUS_OPTIONS.map((s) => {
            const isActive = status === s.value;
            return (
              <button
                key={s.value}
                onClick={() => toggleStatus(s.value)}
                className={cn(
                  "w-full text-left text-sm px-3 py-2 rounded-lg transition-colors flex items-center gap-2",
                  isActive ? "bg-[#D4AF37]/10 text-[#D4AF37] font-medium" : "text-white/70 hover:bg-white/[0.04] hover:text-white"
                )}
              >
                <span className={cn("inline-block w-3.5 h-3.5 rounded border-2 transition-colors", isActive ? "bg-[#D4AF37] border-[#D4AF37]" : "border-white/30")} />
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-[11px] uppercase tracking-widest text-white/40 font-semibold">Jauge collective</h3>
        <div className="space-y-0.5">
          {GAUGE_OPTIONS.map((g) => {
            const isActive = gauge === g.value;
            return (
              <button
                key={g.value}
                onClick={() => toggleGauge(g.value)}
                className={cn(
                  "w-full text-left text-sm px-3 py-2 rounded-lg transition-colors flex items-center gap-2",
                  isActive ? "bg-[#D4AF37]/10 text-[#D4AF37] font-medium" : "text-white/70 hover:bg-white/[0.04] hover:text-white"
                )}
              >
                <span className={cn("inline-block w-3.5 h-3.5 rounded border-2 transition-colors", isActive ? "bg-[#D4AF37] border-[#D4AF37]" : "border-white/30")} />
                {g.label}
              </button>
            );
          })}
        </div>
      </div>

      {hasFilters && (
        <button
          onClick={clearAll}
          className="w-full flex items-center justify-center gap-1.5 h-10 rounded-lg border border-white/10 text-sm text-white/60 hover:text-white hover:border-white/20 transition"
        >
          <X className="size-3.5" />
          Réinitialiser tous les filtres
        </button>
      )}
    </aside>
  );
}
