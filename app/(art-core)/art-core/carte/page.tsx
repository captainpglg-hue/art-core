"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { MapPin, Search, Globe, ArrowRight } from "lucide-react";
import { formatPrice } from "@/lib/utils";

const mockCities = [
  {
    name: "Paris", country: "France", count: 12, lat: "48.8°N", artworks: [
      { id: "p1", title: "Seine au Crépuscule", artist: "Claire Dubois", price: 3200, image: "/placeholder-art.jpg" },
      { id: "p2", title: "Montmartre Abstrait", artist: "Marc Leroy", price: 4500, image: "/placeholder-art.jpg" },
      { id: "p3", title: "Lumière Parisienne", artist: "Sophie Chen", price: 2800, image: "/placeholder-art.jpg" },
      { id: "p4", title: "Le Marais en Or", artist: "Léa Martin", price: 1900, image: "/placeholder-art.jpg" },
    ],
  },
  {
    name: "London", country: "Royaume-Uni", count: 8, lat: "51.5°N", artworks: [
      { id: "l1", title: "Thames Reflections", artist: "James Wilson", price: 5200, image: "/placeholder-art.jpg" },
      { id: "l2", title: "Brick Lane Nights", artist: "Emma Bernard", price: 3800, image: "/placeholder-art.jpg" },
      { id: "l3", title: "Royal Garden", artist: "Oliver Smith", price: 6100, image: "/placeholder-art.jpg" },
    ],
  },
  {
    name: "New York", country: "États-Unis", count: 5, lat: "40.7°N", artworks: [
      { id: "ny1", title: "Brooklyn Bridge Dawn", artist: "Sarah Johnson", price: 7200, image: "/placeholder-art.jpg" },
      { id: "ny2", title: "Harlem Colors", artist: "Michael Brown", price: 4100, image: "/placeholder-art.jpg" },
      { id: "ny3", title: "SoHo Shadows", artist: "Lisa Park", price: 5500, image: "/placeholder-art.jpg" },
    ],
  },
  {
    name: "Tokyo", country: "Japon", count: 3, lat: "35.7°N", artworks: [
      { id: "tk1", title: "Shibuya Neon", artist: "Yuki Tanaka", price: 4800, image: "/placeholder-art.jpg" },
      { id: "tk2", title: "Zen Garden", artist: "Hiro Sato", price: 6300, image: "/placeholder-art.jpg" },
      { id: "tk3", title: "Sakura Dreams", artist: "Mei Watanabe", price: 3700, image: "/placeholder-art.jpg" },
    ],
  },
  {
    name: "Berlin", country: "Allemagne", count: 4, lat: "52.5°N", artworks: [
      { id: "b1", title: "Mauer Fragments", artist: "Hans Weber", price: 2900, image: "/placeholder-art.jpg" },
      { id: "b2", title: "Kreuzberg Pulse", artist: "Anna Müller", price: 3400, image: "/placeholder-art.jpg" },
      { id: "b3", title: "Spree Reflections", artist: "Felix Braun", price: 4200, image: "/placeholder-art.jpg" },
    ],
  },
  {
    name: "Milan", country: "Italie", count: 6, lat: "45.5°N", artworks: [
      { id: "m1", title: "Duomo d'Oro", artist: "Giulia Rossi", price: 5800, image: "/placeholder-art.jpg" },
      { id: "m2", title: "Navigli Soir", artist: "Marco Bianchi", price: 3100, image: "/placeholder-art.jpg" },
      { id: "m3", title: "Milano Moderna", artist: "Chiara Conti", price: 4400, image: "/placeholder-art.jpg" },
      { id: "m4", title: "Brera in Blue", artist: "Luca Ferrari", price: 2600, image: "/placeholder-art.jpg" },
    ],
  },
];

export default function CartePage() {
  const [search, setSearch] = useState("");
  const [selectedCity, setSelectedCity] = useState<string | null>(null);

  const filteredCities = mockCities.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.country.toLowerCase().includes(search.toLowerCase())
  );

  const activeCity = mockCities.find((c) => c.name === selectedCity);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 animate-fade-in">
      {/* Header */}
      <div className="mb-10">
        <h1 className="font-playfair text-3xl sm:text-4xl font-semibold text-white">Carte des oeuvres</h1>
        <p className="text-white/40 text-sm mt-1">Explorez l&apos;art par localisation</p>
      </div>

      {/* Search */}
      <div className="relative mb-8 max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-white/30" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher une ville ou un pays..."
          className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/[0.03] border border-white/10 text-white placeholder:text-white/25 text-sm focus:outline-none focus:border-[#D4AF37]/50 transition-colors"
        />
      </div>

      {/* World Map Placeholder */}
      <div className="relative rounded-2xl bg-white/[0.03] border border-white/10 p-8 mb-10 overflow-hidden">
        <div className="flex items-center gap-2 mb-6">
          <Globe className="size-5 text-[#D4AF37]" />
          <h2 className="text-lg font-semibold text-white">Carte mondiale</h2>
        </div>

        {/* Stylized dot map */}
        <div className="relative w-full aspect-[2/1] flex items-center justify-center">
          <div className="absolute inset-0 opacity-10">
            <svg viewBox="0 0 800 400" className="w-full h-full" fill="none">
              <ellipse cx="400" cy="200" rx="350" ry="160" stroke="white" strokeWidth="0.5" opacity="0.3" />
              <ellipse cx="400" cy="200" rx="250" ry="110" stroke="white" strokeWidth="0.5" opacity="0.2" />
              <line x1="50" y1="200" x2="750" y2="200" stroke="white" strokeWidth="0.5" opacity="0.15" />
              <line x1="400" y1="30" x2="400" y2="370" stroke="white" strokeWidth="0.5" opacity="0.15" />
            </svg>
          </div>

          {/* City pins */}
          <div className="absolute inset-0">
            {[
              { name: "Paris", x: "47%", y: "32%" },
              { name: "London", x: "44%", y: "28%" },
              { name: "New York", x: "25%", y: "35%" },
              { name: "Tokyo", x: "82%", y: "38%" },
              { name: "Berlin", x: "49%", y: "30%" },
              { name: "Milan", x: "48%", y: "36%" },
            ].map((pin) => {
              const city = mockCities.find((c) => c.name === pin.name);
              const isActive = selectedCity === pin.name;
              return (
                <button
                  key={pin.name}
                  onClick={() => setSelectedCity(isActive ? null : pin.name)}
                  className="absolute group"
                  style={{ left: pin.x, top: pin.y }}
                >
                  <div className={`relative flex items-center justify-center transition-all ${isActive ? "scale-125" : ""}`}>
                    <div className={`w-3 h-3 rounded-full ${isActive ? "bg-[#D4AF37]" : "bg-[#D4AF37]/60"} animate-pulse`} />
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap bg-black/80 backdrop-blur-sm text-white text-[11px] px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      {pin.name} — {city?.count} oeuvres
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* City Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-10">
        {filteredCities.map((city) => (
          <button
            key={city.name}
            onClick={() => setSelectedCity(selectedCity === city.name ? null : city.name)}
            className={`rounded-xl p-4 text-left transition-all ${
              selectedCity === city.name
                ? "bg-[#D4AF37]/10 border border-[#D4AF37]/40"
                : "bg-white/[0.03] border border-white/10 hover:border-white/20"
            }`}
          >
            <MapPin className={`size-4 mb-2 ${selectedCity === city.name ? "text-[#D4AF37]" : "text-white/30"}`} />
            <p className="text-sm font-semibold text-white">{city.name}</p>
            <p className="text-[11px] text-white/30">{city.country}</p>
            <p className="text-xs text-[#D4AF37] font-semibold mt-1">{city.count} oeuvres</p>
          </button>
        ))}
      </div>

      {/* Selected City Artworks */}
      {activeCity && (
        <section className="animate-fade-in">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <MapPin className="size-5 text-[#D4AF37]" />
              <h2 className="text-xl font-semibold text-white">
                Oeuvres à {activeCity.name}
              </h2>
              <span className="text-white/30 text-sm">({activeCity.artworks.length})</span>
            </div>
            <button onClick={() => setSelectedCity(null)} className="text-white/40 text-sm hover:text-white transition-colors">
              Fermer
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {activeCity.artworks.map((a) => (
              <Link
                key={a.id}
                href={`/art-core/oeuvre/${a.id}`}
                className="group rounded-2xl overflow-hidden bg-white/[0.03] border border-white/10 hover:border-[#D4AF37]/30 transition-all"
              >
                <div className="relative aspect-[4/3] bg-[#111]">
                  <Image
                    src={a.image}
                    alt={a.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    sizes="(max-width: 640px) 100vw, 25vw"
                  />
                </div>
                <div className="p-4">
                  <p className="text-xs text-white/40 mb-1">{a.artist}</p>
                  <h3 className="text-sm font-semibold text-white line-clamp-1">{a.title}</h3>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[#D4AF37] font-bold text-sm">{formatPrice(a.price)}</span>
                    <ArrowRight className="size-3 text-white/20 group-hover:text-[#D4AF37] transition-colors" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Empty search state */}
      {filteredCities.length === 0 && (
        <div className="text-center py-16">
          <MapPin className="size-12 text-white/10 mx-auto mb-4" />
          <p className="text-white/40">Aucune ville trouvée pour &quot;{search}&quot;</p>
        </div>
      )}
    </div>
  );
}
