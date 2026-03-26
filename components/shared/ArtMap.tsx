"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin, Users, Palette, X, ExternalLink, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface MapUser {
  id: string;
  username: string;
  full_name: string;
  avatar_url?: string;
  city?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  role: "artist" | "scout";
  style?: string;
}

interface ArtMapProps {
  users: MapUser[];
  height?: string;
  showFilters?: boolean;
  className?: string;
}

// Dynamically load Leaflet only on client
let leafletLoaded = false;

export function ArtMap({ users, height = "500px", showFilters = true, className }: ArtMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<unknown>(null);
  const [selected, setSelected] = useState<MapUser | null>(null);
  const [filter, setFilter] = useState<"all" | "artist" | "scout">("all");
  const [citySearch, setCitySearch] = useState("");

  const filtered = users.filter((u) => {
    if (!u.latitude || !u.longitude) return false;
    if (filter !== "all" && u.role !== filter) return false;
    if (citySearch && !u.city?.toLowerCase().includes(citySearch.toLowerCase())) return false;
    return true;
  });

  useEffect(() => {
    if (!mapRef.current || typeof window === "undefined") return;

    let map: unknown;
    let L: unknown;

    async function init() {
      if (!leafletLoaded) {
        // Load Leaflet CSS
        if (!document.getElementById("leaflet-css")) {
          const link = document.createElement("link");
          link.id = "leaflet-css";
          link.rel = "stylesheet";
          link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
          document.head.appendChild(link);
        }
        leafletLoaded = true;
      }

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const leaflet = require("leaflet") as typeof import("leaflet");
      L = leaflet;

      // Destroy previous instance
      if (mapInstanceRef.current) {
        (mapInstanceRef.current as import("leaflet").Map).remove();
        mapInstanceRef.current = null;
      }

      if (!mapRef.current) return;

      map = leaflet.map(mapRef.current, {
        center: [30, 10],
        zoom: 2,
        zoomControl: true,
        attributionControl: false,
      });

      // Dark tile layer matching app aesthetic
      leaflet.tileLayer(
        "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        { maxZoom: 19 }
      ).addTo(map as import("leaflet").Map);

      mapInstanceRef.current = map;

      // Add markers
      for (const user of filtered) {
        if (!user.latitude || !user.longitude) continue;

        const isArtist = user.role === "artist";
        const color = isArtist ? "#C9A84C" : "#6366F1";
        const initials = (user.full_name || user.username || "?")
          .split(" ")
          .map((w: string) => w[0])
          .join("")
          .substring(0, 2)
          .toUpperCase();

        const icon = leaflet.divIcon({
          className: "",
          html: `
            <div style="
              width:36px; height:36px;
              background:${color};
              border-radius:50%;
              border:2px solid rgba(255,255,255,0.3);
              display:flex; align-items:center; justify-content:center;
              font-size:11px; font-weight:700; color:#000;
              box-shadow:0 2px 8px rgba(0,0,0,0.5);
              cursor:pointer;
            ">${initials}</div>
          `,
          iconSize: [36, 36],
          iconAnchor: [18, 18],
        });

        const marker = leaflet
          .marker([user.latitude, user.longitude], { icon })
          .addTo(map as import("leaflet").Map);

        marker.on("click", () => {
          setSelected(user);
        });
      }
    }

    init();

    return () => {
      if (mapInstanceRef.current) {
        (mapInstanceRef.current as import("leaflet").Map).remove();
        mapInstanceRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, citySearch]);

  return (
    <div className={cn("relative rounded-2xl overflow-hidden border border-white/10", className)}>
      {/* Filters */}
      {showFilters && (
        <div className="absolute top-3 left-3 z-[999] flex flex-col gap-2">
          <div className="flex gap-1.5 bg-black/70 backdrop-blur-md rounded-xl p-1.5 border border-white/10">
            {(["all", "artist", "scout"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "px-3 py-1 rounded-lg text-xs font-medium transition-all",
                  filter === f
                    ? f === "artist"
                      ? "bg-[#C9A84C] text-black"
                      : f === "scout"
                      ? "bg-indigo-500 text-white"
                      : "bg-white/20 text-white"
                    : "text-white/50 hover:text-white/80"
                )}
              >
                {f === "all" ? "Tous" : f === "artist" ? "Artistes" : "Scouts"}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3 text-white/40" />
            <input
              type="text"
              placeholder="Ville..."
              value={citySearch}
              onChange={(e) => setCitySearch(e.target.value)}
              className="w-40 pl-7 pr-3 py-1.5 bg-black/70 backdrop-blur-md border border-white/10 rounded-lg text-xs text-white placeholder:text-white/30 outline-none focus:border-gold/40"
            />
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-3 left-3 z-[999] flex gap-3 bg-black/70 backdrop-blur-md rounded-xl px-3 py-2 border border-white/10">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[#C9A84C]" />
          <span className="text-[10px] text-white/60">Artistes</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-indigo-500" />
          <span className="text-[10px] text-white/60">Scouts</span>
        </div>
        <span className="text-[10px] text-white/30">{filtered.length} marqueurs</span>
      </div>

      {/* Map container */}
      <div ref={mapRef} style={{ height, width: "100%" }} />

      {/* Selected user panel */}
      {selected && (
        <div className="absolute top-3 right-3 z-[999] w-56 bg-black/90 backdrop-blur-md rounded-2xl border border-white/10 p-4 shadow-2xl">
          <button
            onClick={() => setSelected(null)}
            className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-lg text-white/40 hover:text-white transition-colors"
          >
            <X className="size-3.5" />
          </button>

          <div className="flex items-center gap-3 mb-3">
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0",
              selected.role === "artist" ? "bg-gold/20 text-gold border border-gold/30" : "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
            )}>
              {(selected.full_name || selected.username || "?").split(" ").map((w: string) => w[0]).join("").substring(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">{selected.full_name || selected.username}</p>
              <p className="text-xs text-white/40">{selected.city}, {selected.country}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 mb-3">
            {selected.role === "artist" ? (
              <><Palette className="size-3 text-gold" /><span className="text-xs text-gold/80">Artiste</span></>
            ) : (
              <><Users className="size-3 text-indigo-400" /><span className="text-xs text-indigo-400">Scout</span></>
            )}
            {selected.style && (
              <span className="text-xs text-white/30 ml-1">· {selected.style}</span>
            )}
          </div>

          <a
            href={`/art-core/profil/${selected.id}`}
            className="flex items-center justify-center gap-1.5 w-full py-1.5 rounded-lg bg-gold/10 hover:bg-gold/20 border border-gold/20 text-xs text-gold transition-colors"
          >
            Voir le profil
            <ExternalLink className="size-3" />
          </a>
        </div>
      )}

      {/* Count badge */}
      <div className="absolute top-3 right-3 z-[998] flex items-center gap-1.5 bg-black/60 backdrop-blur-sm rounded-lg px-2.5 py-1.5 border border-white/10">
        <MapPin className="size-3 text-gold" />
        <span className="text-xs text-white/60">{filtered.length}</span>
      </div>
    </div>
  );
}
