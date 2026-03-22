"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { label: "Tout", value: "all" },
  { label: "Peinture", value: "painting" },
  { label: "Sculpture", value: "sculpture" },
  { label: "Photo", value: "photography" },
  { label: "Numérique", value: "digital" },
  { label: "Dessin", value: "drawing" },
  { label: "Mixte", value: "mixed_media" },
  { label: "Céramique", value: "ceramics" },
];

const STATUS_FILTERS = [
  { label: "Vente", value: "sale" },
  { label: "Location", value: "rent" },
  { label: "Enchere", value: "auction" },
  { label: "Certifie", value: "certified" },
];

const GAUGE_FILTERS = [
  { label: "Jauge ouverte", value: "gauge_open" },
  { label: "Deal verrouille", value: "gauge_locked" },
  { label: "Tendance", value: "gauge_hot" },
];

const SORT_OPTIONS = [
  { label: "Recent", value: "recent" },
  { label: "Prix ↑", value: "price_asc" },
  { label: "Prix ↓", value: "price_desc" },
  { label: "Jauge ↓", value: "gauge_desc" },
  { label: "Tendance", value: "trending" },
];

export function FilterBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const category = searchParams.get("category") ?? "all";
  const status = searchParams.get("status") ?? "";
  const gauge = searchParams.get("gauge") ?? "";
  const sort = searchParams.get("sort") ?? "recent";
  const q = searchParams.get("q") ?? "";

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (!value || value === "all") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`, { scroll: false });
      });
    },
    [pathname, router, searchParams]
  );

  const toggleStatus = (value: string) => {
    updateParam("status", status === value ? "" : value);
  };

  const toggleGauge = (value: string) => {
    updateParam("gauge", gauge === value ? "" : value);
  };

  const clearAll = () => {
    startTransition(() => {
      router.push(pathname, { scroll: false });
    });
  };

  const hasFilters = category !== "all" || !!status || !!gauge || sort !== "recent" || !!q;

  return (
    <div
      className={cn(
        "sticky top-16 z-30 bg-[#0a0a0a]/90 backdrop-blur-md border-b border-white/5 py-3 px-4 space-y-2.5 transition-opacity",
        isPending && "opacity-70"
      )}
    >
      {/* Row 1: Search + Clear */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-white/30" />
          <input
            type="text"
            placeholder="Rechercher une oeuvre, un artiste..."
            value={q}
            onChange={(e) => updateParam("q", e.target.value)}
            className="w-full h-9 pl-8 pr-3 rounded-lg bg-white/5 border border-white/8 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#C9A84C]/40 focus:ring-1 focus:ring-[#C9A84C]/20 transition-colors"
          />
        </div>
        {hasFilters && (
          <button
            onClick={clearAll}
            className="shrink-0 flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs text-white/40 hover:text-white/70 hover:bg-white/5 transition-all border border-white/5"
          >
            <X className="size-3" />
            <span className="hidden sm:inline">Reset</span>
          </button>
        )}
      </div>

      {/* Row 2: Sort + Category + Status + Gauge chips */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-0.5">
        {SORT_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => updateParam("sort", opt.value)}
            className={cn(
              "shrink-0 px-3 h-7 rounded-full text-xs font-medium transition-all",
              sort === opt.value
                ? "bg-[#C9A84C]/15 text-[#C9A84C] border border-[#C9A84C]/30"
                : "text-white/40 hover:text-white/70 hover:bg-white/5"
            )}
          >
            {opt.label}
          </button>
        ))}

        <div className="w-px h-4 bg-white/10 mx-1 shrink-0" />

        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => updateParam("category", cat.value)}
            className={cn(
              "shrink-0 px-3 h-7 rounded-full text-xs font-medium transition-all",
              category === cat.value
                ? "bg-[#C9A84C] text-black font-semibold"
                : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/80"
            )}
          >
            {cat.label}
          </button>
        ))}

        <div className="w-px h-4 bg-white/10 mx-1 shrink-0" />

        {STATUS_FILTERS.map((s) => (
          <button
            key={s.value}
            onClick={() => toggleStatus(s.value)}
            className={cn(
              "shrink-0 px-3 h-7 rounded-full text-xs font-medium border transition-all",
              status === s.value
                ? "bg-[#C9A84C]/10 border-[#C9A84C]/40 text-[#C9A84C]"
                : "border-white/10 text-white/40 hover:border-white/20 hover:text-white/70"
            )}
          >
            {s.label}
          </button>
        ))}

        <div className="w-px h-4 bg-white/10 mx-1 shrink-0" />

        {GAUGE_FILTERS.map((g) => (
          <button
            key={g.value}
            onClick={() => toggleGauge(g.value)}
            className={cn(
              "shrink-0 px-3 h-7 rounded-full text-xs font-medium border transition-all",
              gauge === g.value
                ? "bg-[#C9A84C]/10 border-[#C9A84C]/40 text-[#C9A84C]"
                : "border-white/10 text-white/40 hover:border-white/20 hover:text-white/70"
            )}
          >
            {g.label}
          </button>
        ))}
      </div>
    </div>
  );
}
