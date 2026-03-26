"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";
import { X } from "lucide-react";
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

  const hasFilters = category !== "all" || !!status || !!gauge || sort !== "recent";

  return (
    <div
      className={cn(
        "space-y-2.5 transition-opacity",
        isPending && "opacity-70"
      )}
    >
      {/* Filters + Reset */}
      <div className="flex items-center gap-2 mb-1">
        {hasFilters && (
          <button
            onClick={clearAll}
            className="shrink-0 flex items-center gap-1.5 h-7 px-3 rounded-full text-xs text-white/40 hover:text-white/70 hover:bg-white/5 transition-all border border-white/5"
          >
            <X className="size-3" />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* Sort + Category + Status + Gauge chips */}
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
