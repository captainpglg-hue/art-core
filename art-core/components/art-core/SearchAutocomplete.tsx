"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, Image, User, Palette, X } from "lucide-react";

type Suggestion = { type: "artwork" | "artist" | "style"; label: string; id?: string; sub?: string };

export function SearchAutocomplete() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<any>(null);

  useEffect(() => {
    if (query.length < 2) { setSuggestions([]); setOpen(false); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&limit=10`);
        const data = await res.json();
        const sugs: Suggestion[] = [];
        const seenArtists: string[] = [];
        const seenStyles: string[] = [];

        // Artworks (max 2)
        let artCount = 0;
        for (const a of data.artworks || []) {
          if (artCount >= 2) break;
          sugs.push({ type: "artwork", label: a.title, id: a.id, sub: `${a.artist_name} — ${a.price}€` });
          artCount++;
          if (a.artist_name && !seenArtists.includes(a.artist_name)) seenArtists.push(a.artist_name);
          if (a.style && !seenStyles.includes(a.style)) seenStyles.push(a.style);
        }

        // Artists (max 2)
        for (let i = 0; i < Math.min(2, seenArtists.length); i++) {
          sugs.push({ type: "artist", label: seenArtists[i] });
        }

        // Styles (max 2)
        for (let i = 0; i < Math.min(2, seenStyles.length); i++) {
          sugs.push({ type: "style", label: seenStyles[i] });
        }

        setSuggestions(sugs.slice(0, 6));
        setOpen(sugs.length > 0);
      } catch {}
      finally { setLoading(false); }
    }, 300);
  }, [query]);

  function handleSelect(sug: Suggestion) {
    setOpen(false);
    if (sug.type === "artwork" && sug.id) {
      router.push(`/art-core/oeuvre/${sug.id}`);
    } else if (sug.type === "artist") {
      router.push(`/art-core?q=${encodeURIComponent(sug.label)}`);
    } else {
      router.push(`/art-core/search?style=${encodeURIComponent(sug.label)}`);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setOpen(false);
    if (query.trim()) router.push(`/art-core?q=${encodeURIComponent(query.trim())}`);
  }

  const ICONS = { artwork: Image, artist: User, style: Palette };

  return (
    <div className="relative">
      <form onSubmit={handleSubmit}>
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-white/30" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => { if (suggestions.length > 0) setOpen(true); }}
            placeholder="Rechercher une oeuvre, un artiste, un style..."
            className="w-full h-11 pl-10 pr-10 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/25 focus:outline-none focus:border-[#D4AF37]/40"
          />
          {query && (
            <button type="button" onClick={() => { setQuery(""); setSuggestions([]); setOpen(false); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30">
              <X className="size-4" />
            </button>
          )}
        </div>
      </form>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-[#1a1a1a] border border-[#D4AF37]/20 rounded-xl overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.6)] z-50">
          {suggestions.map((sug, i) => {
            const Icon = ICONS[sug.type];
            return (
              <button key={i} onClick={() => handleSelect(sug)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/5 active:bg-white/8 transition-colors border-b border-white/[0.04] last:border-0">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  sug.type === "artwork" ? "bg-[#D4AF37]/10" : sug.type === "artist" ? "bg-blue-500/10" : "bg-purple-500/10"
                }`}>
                  <Icon className={`size-4 ${
                    sug.type === "artwork" ? "text-[#D4AF37]" : sug.type === "artist" ? "text-blue-400" : "text-purple-400"
                  }`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{sug.label}</p>
                  {sug.sub && <p className="text-[11px] text-white/30 truncate">{sug.sub}</p>}
                </div>
                <span className="text-[10px] text-white/15 shrink-0 capitalize">{
                  sug.type === "artwork" ? "oeuvre" : sug.type === "artist" ? "artiste" : "style"
                }</span>
              </button>
            );
          })}

          {suggestions.length === 0 && query.length >= 2 && (
            <div className="px-4 py-4 text-center">
              <p className="text-white/30 text-xs">Aucun résultat</p>
              <p className="text-white/15 text-[11px] mt-1">Essayez : peinture abstraite, sculpture bronze...</p>
            </div>
          )}
        </div>
      )}

      {/* Close on outside click */}
      {open && <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />}
    </div>
  );
}
