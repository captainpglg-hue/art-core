"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState, useTransition } from "react";
import { ChevronDown, X, Search, Truck, Heart, Sparkles, Tag } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Catégories hiérarchiques style Etsy ──────────────────────────────────────
const CATEGORIES: { id: string; label: string; techniques: { id: string; label: string }[] }[] = [
  { id: "painting", label: "Peinture", techniques: [
    { id: "huile", label: "Huile" }, { id: "acrylique", label: "Acrylique" },
    { id: "aquarelle", label: "Aquarelle" }, { id: "pastel", label: "Pastel" },
    { id: "gouache", label: "Gouache" }, { id: "encre", label: "Encre" },
  ]},
  { id: "sculpture", label: "Sculpture", techniques: [
    { id: "bronze", label: "Bronze" }, { id: "marbre", label: "Marbre" },
    { id: "bois", label: "Bois" }, { id: "pierre", label: "Pierre" },
    { id: "metal", label: "Métal" }, { id: "resine", label: "Résine" },
  ]},
  { id: "photography", label: "Photographie", techniques: [
    { id: "argentique", label: "Argentique" }, { id: "numerique", label: "Numérique" },
    { id: "polaroid", label: "Polaroïd" }, { id: "noir-blanc", label: "Noir & Blanc" },
  ]},
  { id: "drawing", label: "Dessin", techniques: [
    { id: "fusain", label: "Fusain" }, { id: "sanguine", label: "Sanguine" },
    { id: "crayon", label: "Crayon" }, { id: "encre-chine", label: "Encre de Chine" },
  ]},
  { id: "digital", label: "Art numérique", techniques: [
    { id: "nft", label: "NFT" }, { id: "impression", label: "Tirage d'art" },
    { id: "3d", label: "Œuvre 3D" }, { id: "generatif", label: "Génératif" },
  ]},
  { id: "ceramics", label: "Céramique & verre", techniques: [
    { id: "faience", label: "Faïence" }, { id: "porcelaine", label: "Porcelaine" },
    { id: "gres", label: "Grès" }, { id: "verre-souffle", label: "Verre soufflé" },
    { id: "cristal", label: "Cristal" },
  ]},
  { id: "mixed_media", label: "Techniques mixtes", techniques: [
    { id: "collage", label: "Collage" }, { id: "assemblage", label: "Assemblage" },
    { id: "street-art", label: "Street art" },
  ]},
  { id: "textile", label: "Textile", techniques: [
    { id: "tapisserie", label: "Tapisserie" }, { id: "broderie", label: "Broderie" },
    { id: "tissage", label: "Tissage" }, { id: "feutre", label: "Feutre" },
  ]},
  { id: "furniture", label: "Mobilier & objets d'art", techniques: [
    { id: "vintage", label: "Vintage" }, { id: "design", label: "Design" },
    { id: "antiquite", label: "Antiquité" }, { id: "luminaire", label: "Luminaire" },
  ]},
  { id: "prints", label: "Estampes", techniques: [
    { id: "lithographie", label: "Lithographie" }, { id: "serigraphie", label: "Sérigraphie" },
    { id: "gravure", label: "Gravure" }, { id: "linogravure", label: "Linogravure" },
  ]},
];

const PRICE_PRESETS = [
  { label: "Moins de 100 €", min: "0", max: "100" },
  { label: "100 – 500 €", min: "100", max: "500" },
  { label: "500 – 2 000 €", min: "500", max: "2000" },
  { label: "2 000 – 5 000 €", min: "2000", max: "5000" },
  { label: "5 000 – 20 000 €", min: "5000", max: "20000" },
  { label: "Plus de 20 000 €", min: "20000", max: "" },
];

const FORMATS = [
  { id: "S", label: "Petit format", hint: "< 30 cm" },
  { id: "M", label: "Format moyen", hint: "30 – 80 cm" },
  { id: "L", label: "Grand format", hint: "80 – 150 cm" },
  { id: "XL", label: "Très grand format", hint: "> 150 cm" },
];

const COLORS = [
  { id: "noir", label: "Noir", swatch: "#0a0a0a" },
  { id: "blanc", label: "Blanc", swatch: "#f5f5f5" },
  { id: "or", label: "Or", swatch: "#D4AF37" },
  { id: "argent", label: "Argent", swatch: "#C0C0C0" },
  { id: "rouge", label: "Rouge", swatch: "#C62828" },
  { id: "rose", label: "Rose", swatch: "#EC407A" },
  { id: "orange", label: "Orange", swatch: "#F57C00" },
  { id: "jaune", label: "Jaune", swatch: "#F9A825" },
  { id: "vert", label: "Vert", swatch: "#2E7D32" },
  { id: "bleu", label: "Bleu", swatch: "#1565C0" },
  { id: "violet", label: "Violet", swatch: "#6A1B9A" },
  { id: "marron", label: "Marron", swatch: "#5D4037" },
  { id: "beige", label: "Beige", swatch: "#D7CCC8" },
  { id: "multi", label: "Multicolore", swatch: "conic-gradient(from 0deg, #c62828, #f9a825, #2e7d32, #1565c0, #6a1b9a, #c62828)" },
];

const SELLERS = [
  { id: "artist", label: "Artiste indépendant" },
  { id: "galeriste", label: "Galerie d'art" },
  { id: "antiquaire", label: "Antiquaire" },
  { id: "brocanteur", label: "Brocanteur" },
  { id: "depot_vente", label: "Dépôt-vente" },
];

const STATUS_OPTIONS = [
  { value: "sale", label: "En vente" },
  { value: "rent", label: "En location" },
  { value: "auction", label: "Enchère" },
  { value: "certified", label: "Certifié blockchain" },
];

const SHIPPING_OPTIONS = [
  { id: "free", label: "Livraison gratuite", icon: Truck },
  { id: "fast", label: "Expédié sous 24-48h", icon: Sparkles },
  { id: "local", label: "Retrait local possible", icon: Tag },
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

// ─── Composant section pliable avec titre & séparateur ────────────────────────
function Section({ title, defaultOpen = true, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-white/[0.06] pb-4">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between mb-3 text-left"
      >
        <h3 className="text-[12px] uppercase tracking-widest text-white/60 font-semibold">{title}</h3>
        <ChevronDown className={cn("size-4 text-white/30 transition-transform", !open && "-rotate-90")} />
      </button>
      {open && <div className="space-y-0.5">{children}</div>}
    </div>
  );
}

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
  const format = searchParams.get("format") ?? "";
  const color = searchParams.get("color") ?? "";
  const seller = searchParams.get("seller") ?? "";
  const shipping = searchParams.get("shipping") ?? "";

  const [openCat, setOpenCat] = useState<string | null>(category || null);
  const [localQ, setLocalQ] = useState(q);
  const [customMin, setCustomMin] = useState(priceMin);
  const [customMax, setCustomMax] = useState(priceMax);

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
    if (isActive) { setCustomMin(""); setCustomMax(""); updateParams({ price_min: null, price_max: null }); }
    else { setCustomMin(min); setCustomMax(max); updateParams({ price_min: min || null, price_max: max || null }); }
  };
  const applyCustomPrice = () => updateParams({ price_min: customMin || null, price_max: customMax || null });
  const toggle = (key: string, current: string, value: string) =>
    updateParams({ [key]: current === value ? null : value });
  const setSort = (v: string) => updateParams({ sort: v === "recent" ? null : v });
  const submitSearch = () => updateParams({ q: localQ.trim() || null });

  const hasFilters = useMemo(
    () => !!q || !!category || !!technique || !!status || !!gauge || sort !== "recent" || !!priceMin || !!priceMax || !!format || !!color || !!seller || !!shipping,
    [q, category, technique, status, gauge, sort, priceMin, priceMax, format, color, seller, shipping]
  );

  const clearAll = () => {
    setLocalQ(""); setOpenCat(null); setCustomMin(""); setCustomMax("");
    startTransition(() => { router.push(pathname, { scroll: false }); });
  };

  return (
    <aside
      className={cn(
        "w-full lg:w-[280px] lg:shrink-0 lg:sticky lg:top-20 lg:self-start lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto",
        "rounded-2xl bg-[#0f0f0f] border border-white/[0.06] p-5 transition-opacity",
        isPending && "opacity-70"
      )}
    >
      {/* En-tête sticky avec titre + reset */}
      <div className="flex items-center justify-between mb-5 pb-3 border-b border-white/[0.08]">
        <h2 className="font-playfair text-lg text-white">Tous les filtres</h2>
        {hasFilters && (
          <button
            onClick={clearAll}
            className="flex items-center gap-1 text-[11px] text-[#D4AF37] hover:text-[#D4AF37]/80 transition"
          >
            <X className="size-3" />Réinitialiser
          </button>
        )}
      </div>

      <div className="space-y-5">
        {/* ── Recherche ── */}
        <div className="space-y-2 pb-4 border-b border-white/[0.06]">
          <h3 className="text-[12px] uppercase tracking-widest text-white/60 font-semibold">Rechercher</h3>
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

        {/* ── Tri ── */}
        <div className="space-y-2 pb-4 border-b border-white/[0.06]">
          <h3 className="text-[12px] uppercase tracking-widest text-white/60 font-semibold">Trier par</h3>
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

        {/* ── Bonnes affaires (Etsy "Special Offers") ── */}
        <Section title="Bonnes affaires" defaultOpen>
          {SHIPPING_OPTIONS.map((s) => {
            const isActive = shipping === s.id;
            const Icon = s.icon;
            return (
              <button
                key={s.id}
                onClick={() => toggle("shipping", shipping, s.id)}
                className={cn(
                  "w-full text-left text-sm px-3 py-2 rounded-lg transition-colors flex items-center gap-2.5",
                  isActive ? "bg-[#D4AF37]/10 text-[#D4AF37] font-medium" : "text-white/70 hover:bg-white/[0.04] hover:text-white"
                )}
              >
                <span className={cn("inline-block w-3.5 h-3.5 rounded border-2 shrink-0", isActive ? "bg-[#D4AF37] border-[#D4AF37]" : "border-white/30")} />
                <Icon className="size-3.5 opacity-60" />
                {s.label}
              </button>
            );
          })}
        </Section>

        {/* ── Catégories ── */}
        <Section title="Catégories" defaultOpen>
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
                  ><ChevronDown className={cn("size-4 transition-transform", isOpen && "rotate-180")} /></button>
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
        </Section>

        {/* ── Prix ── */}
        <Section title="Prix" defaultOpen>
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
          {/* Champ personnalisé Min — Max */}
          <div className="flex items-center gap-1.5 pt-2 mt-1">
            <input
              type="number"
              inputMode="numeric"
              min={0}
              value={customMin}
              onChange={(e) => setCustomMin(e.target.value)}
              onBlur={applyCustomPrice}
              onKeyDown={(e) => { if (e.key === "Enter") applyCustomPrice(); }}
              placeholder="Min"
              className="w-full h-9 px-2 rounded-md bg-white/[0.04] border border-white/10 text-xs text-white text-center focus:outline-none focus:border-[#D4AF37]/50 tabular-nums"
              aria-label="Prix minimum"
            />
            <span className="text-white/30 text-xs">à</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              value={customMax}
              onChange={(e) => setCustomMax(e.target.value)}
              onBlur={applyCustomPrice}
              onKeyDown={(e) => { if (e.key === "Enter") applyCustomPrice(); }}
              placeholder="Max"
              className="w-full h-9 px-2 rounded-md bg-white/[0.04] border border-white/10 text-xs text-white text-center focus:outline-none focus:border-[#D4AF37]/50 tabular-nums"
              aria-label="Prix maximum"
            />
            <span className="text-white/40 text-xs">€</span>
          </div>
        </Section>

        {/* ── Format (taille de l'œuvre) ── */}
        <Section title="Format" defaultOpen>
          {FORMATS.map((f) => {
            const isActive = format === f.id;
            return (
              <button
                key={f.id}
                onClick={() => toggle("format", format, f.id)}
                className={cn(
                  "w-full text-left text-sm px-3 py-2 rounded-lg transition-colors flex items-center justify-between",
                  isActive ? "bg-[#D4AF37]/10 text-[#D4AF37] font-medium" : "text-white/70 hover:bg-white/[0.04] hover:text-white"
                )}
              >
                <span>{f.label}</span>
                <span className="text-[10px] text-white/30">{f.hint}</span>
              </button>
            );
          })}
        </Section>

        {/* ── Couleur dominante ── */}
        <Section title="Couleur dominante" defaultOpen={false}>
          <div className="grid grid-cols-7 gap-2 pt-1">
            {COLORS.map((c) => {
              const isActive = color === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => toggle("color", color, c.id)}
                  className={cn(
                    "relative w-8 h-8 rounded-full border-2 transition-all hover:scale-110",
                    isActive ? "border-[#D4AF37] ring-2 ring-[#D4AF37]/30 ring-offset-2 ring-offset-[#0f0f0f]" : "border-white/15"
                  )}
                  style={c.swatch.startsWith("#") ? { backgroundColor: c.swatch } : { background: c.swatch }}
                  title={c.label}
                  aria-label={c.label}
                  aria-pressed={isActive}
                />
              );
            })}
          </div>
          {color && (
            <p className="text-[11px] text-white/40 pt-2 px-1">
              Sélection : <span className="text-[#D4AF37]">{COLORS.find((c) => c.id === color)?.label}</span>
            </p>
          )}
        </Section>

        {/* ── Type de vendeur ── */}
        <Section title="Type de vendeur" defaultOpen={false}>
          {SELLERS.map((s) => {
            const isActive = seller === s.id;
            return (
              <button
                key={s.id}
                onClick={() => toggle("seller", seller, s.id)}
                className={cn(
                  "w-full text-left text-sm px-3 py-2 rounded-lg transition-colors flex items-center gap-2",
                  isActive ? "bg-[#D4AF37]/10 text-[#D4AF37] font-medium" : "text-white/70 hover:bg-white/[0.04] hover:text-white"
                )}
              >
                <span className={cn("inline-block w-3.5 h-3.5 rounded border-2 shrink-0", isActive ? "bg-[#D4AF37] border-[#D4AF37]" : "border-white/30")} />
                {s.label}
              </button>
            );
          })}
        </Section>

        {/* ── État ── */}
        <Section title="État" defaultOpen>
          {STATUS_OPTIONS.map((s) => {
            const isActive = status === s.value;
            return (
              <button
                key={s.value}
                onClick={() => toggle("status", status, s.value)}
                className={cn(
                  "w-full text-left text-sm px-3 py-2 rounded-lg transition-colors flex items-center gap-2",
                  isActive ? "bg-[#D4AF37]/10 text-[#D4AF37] font-medium" : "text-white/70 hover:bg-white/[0.04] hover:text-white"
                )}
              >
                <span className={cn("inline-block w-3.5 h-3.5 rounded border-2 shrink-0", isActive ? "bg-[#D4AF37] border-[#D4AF37]" : "border-white/30")} />
                {s.label}
              </button>
            );
          })}
        </Section>

        {/* ── Jauge collective (spécifique ART-CORE) ── */}
        <Section title="Jauge collective" defaultOpen={false}>
          {GAUGE_OPTIONS.map((g) => {
            const isActive = gauge === g.value;
            return (
              <button
                key={g.value}
                onClick={() => toggle("gauge", gauge, g.value)}
                className={cn(
                  "w-full text-left text-sm px-3 py-2 rounded-lg transition-colors flex items-center gap-2",
                  isActive ? "bg-[#D4AF37]/10 text-[#D4AF37] font-medium" : "text-white/70 hover:bg-white/[0.04] hover:text-white"
                )}
              >
                <span className={cn("inline-block w-3.5 h-3.5 rounded border-2 shrink-0", isActive ? "bg-[#D4AF37] border-[#D4AF37]" : "border-white/30")} />
                {g.label}
              </button>
            );
          })}
        </Section>

        {/* ── Favoris (incite à se connecter) ── */}
        <div className="rounded-xl bg-[#D4AF37]/5 border border-[#D4AF37]/15 p-3 flex items-start gap-2.5">
          <Heart className="size-4 text-[#D4AF37] mt-0.5 shrink-0" />
          <div>
            <p className="text-xs text-white/70 font-medium">Sauvegarde tes favoris</p>
            <p className="text-[11px] text-white/40 leading-relaxed mt-0.5">
              Crée un compte pour mettre des œuvres en favoris et recevoir des alertes prix.
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
