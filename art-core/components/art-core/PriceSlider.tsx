"use client";

import { useState, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

export function PriceSlider() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [min, setMin] = useState(searchParams.get("price_min") || "");
  const [max, setMax] = useState(searchParams.get("price_max") || "");

  const apply = useCallback((newMin: string, newMax: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (newMin && parseInt(newMin) > 0) params.set("price_min", newMin); else params.delete("price_min");
    if (newMax && parseInt(newMax) > 0) params.set("price_max", newMax); else params.delete("price_max");
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }, [pathname, router, searchParams]);

  function handleMinChange(v: string) {
    setMin(v);
    // Debounced apply
    clearTimeout((window as any).__priceTimer);
    (window as any).__priceTimer = setTimeout(() => apply(v, max), 600);
  }

  function handleMaxChange(v: string) {
    setMax(v);
    clearTimeout((window as any).__priceTimer);
    (window as any).__priceTimer = setTimeout(() => apply(min, v), 600);
  }

  const PRESETS = [
    { label: "< 500€", min: "0", max: "500" },
    { label: "500-2000€", min: "500", max: "2000" },
    { label: "2000-5000€", min: "2000", max: "5000" },
    { label: "> 5000€", min: "5000", max: "" },
  ];

  const hasFilter = (min && parseInt(min) > 0) || (max && parseInt(max) > 0);

  return (
    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
      <span className="text-[11px] text-white/25 shrink-0">Prix</span>

      <div className="flex items-center gap-1.5 shrink-0">
        <input
          type="number"
          inputMode="numeric"
          value={min}
          onChange={(e) => handleMinChange(e.target.value)}
          placeholder="Min €"
          className="w-[72px] h-8 rounded-lg bg-white/5 border border-white/10 text-xs text-white text-center focus:outline-none focus:border-[#D4AF37]/40 tabular-nums"
        />
        <span className="text-white/15 text-xs">—</span>
        <input
          type="number"
          inputMode="numeric"
          value={max}
          onChange={(e) => handleMaxChange(e.target.value)}
          placeholder="Max €"
          className="w-[72px] h-8 rounded-lg bg-white/5 border border-white/10 text-xs text-white text-center focus:outline-none focus:border-[#D4AF37]/40 tabular-nums"
        />
      </div>

      <div className="w-px h-4 bg-white/8 shrink-0" />

      {PRESETS.map((p) => {
        const active = min === p.min && max === p.max;
        return (
          <button key={p.label}
            onClick={() => {
              if (active) { setMin(""); setMax(""); apply("", ""); }
              else { setMin(p.min); setMax(p.max); apply(p.min, p.max); }
            }}
            className={`shrink-0 px-2.5 h-7 rounded-full text-[11px] font-medium transition-all ${
              active ? "bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30" : "text-white/30 hover:text-white/50"
            }`}>
            {p.label}
          </button>
        );
      })}

      {hasFilter && (
        <button onClick={() => { setMin(""); setMax(""); apply("", ""); }}
          className="shrink-0 text-[11px] text-white/20 hover:text-white/40 ml-1">
          Reset
        </button>
      )}
    </div>
  );
}
