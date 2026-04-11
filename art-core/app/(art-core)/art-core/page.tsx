import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { getArtworks } from "@/lib/db";
import { ArtworkCard, ArtworkCardSkeleton } from "@/components/art-core/ArtworkCard";
import { FilterBar } from "@/components/art-core/FilterBar";
import { SearchAutocomplete } from "@/components/art-core/SearchAutocomplete";
import { PriceSlider } from "@/components/art-core/PriceSlider";
import { ShieldCheck, Truck, RotateCcw, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Marketplace",
  description: "Découvrez et achetez des oeuvres d'art uniques certifiées sur ART-CORE.",
};

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{
    category?: string;
    status?: string;
    sort?: string;
    q?: string;
    price_min?: string;
    price_max?: string;
  }>;
}

async function ArtworkGrid({ searchParams }: { searchParams: Awaited<PageProps["searchParams"]> }) {
  const artworks = getArtworks({
    status: searchParams.status || undefined,
    category: searchParams.category && searchParams.category !== "all" ? searchParams.category : undefined,
    search: searchParams.q || undefined,
    sort: searchParams.sort || "newest",
    limit: 60,
  });

  let parsed = artworks.map((a) => ({
    ...a,
    photos: typeof a.photos === "string" ? JSON.parse(a.photos) : a.photos,
  }));

  // Price filter
  const pMin = parseFloat(searchParams.price_min || "0");
  const pMax = parseFloat(searchParams.price_max || "0");
  if (pMin > 0) parsed = parsed.filter(a => a.price >= pMin);
  if (pMax > 0) parsed = parsed.filter(a => a.price <= pMax);

  // Sort: boosted first
  const sorted = [...parsed].sort((a, b) => {
    const aP = (a.boost_active || 0) + (a.highlight_active || 0);
    const bP = (b.boost_active || 0) + (b.highlight_active || 0);
    return bP - aP;
  });

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 rounded-full bg-white/3 border border-white/10 flex items-center justify-center mb-4">
          <span className="text-3xl">&#127912;</span>
        </div>
        <p className="text-white/50 font-medium mb-1">Aucune oeuvre trouvée</p>
        <p className="text-white/25 text-sm">Modifiez les filtres ou revenez plus tard.</p>
      </div>
    );
  }

  return (
    <>
      <p className="text-white/25 text-xs mb-5">{sorted.length} oeuvre{sorted.length !== 1 ? "s" : ""}</p>
      <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-5 space-y-0">
        {sorted.map((artwork, i) => (
          <div key={artwork.id} className="break-inside-avoid mb-5">
            <ArtworkCard artwork={artwork} priority={i < 4} promoted={!!(artwork.boost_active || artwork.highlight_active)} />
          </div>
        ))}
      </div>
    </>
  );
}

function GridSkeleton() {
  return (
    <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-5">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="break-inside-avoid mb-5"><ArtworkCardSkeleton /></div>
      ))}
    </div>
  );
}

export default async function MarketplacePage({ searchParams }: PageProps) {
  const params = await searchParams;
  return (
    <>
      {/* ═══ HERO — Above the fold ═══ */}
      {!params.q && !params.category && !params.status && (
        <section className="bg-[#121212] border-b border-white/5">
          <div className="max-w-screen-xl mx-auto px-4 lg:px-8 py-12 md:py-16">
            <h1 className="font-playfair text-3xl md:text-5xl font-semibold text-white leading-tight mb-4 max-w-2xl">
              L&apos;art original, certifié et livré chez&nbsp;vous
            </h1>
            <p className="text-white/45 text-base md:text-lg mb-8 max-w-lg">
              Des milliers d&apos;oeuvres uniques d&apos;artistes émergents et reconnus
            </p>
            <Link href="#catalogue"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-[#D4AF37] text-[#121212] font-semibold text-base active:brightness-90 transition-all hover:shadow-[0_0_30px_rgba(212,175,55,0.3)]">
              Découvrir les oeuvres <ArrowRight className="size-5" />
            </Link>

            {/* Réassurance */}
            <div className="flex flex-wrap gap-6 md:gap-10 mt-10">
              {[
                { icon: ShieldCheck, text: "Oeuvres certifiées originales" },
                { icon: Truck, text: "Livraison sécurisée sous 7 jours" },
                { icon: RotateCcw, text: "Satisfait ou remboursé 14 jours" },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.text} className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-lg bg-[#D4AF37]/10 flex items-center justify-center shrink-0">
                      <Icon className="size-4.5 text-[#D4AF37]" />
                    </div>
                    <span className="text-white/50 text-sm">{item.text}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ═══ Search + Price Slider ═══ */}
      <div id="catalogue" className="sticky top-16 z-30 bg-[#0a0a0a]/95 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-screen-2xl mx-auto px-4 lg:px-8 py-3 space-y-2">
          <SearchAutocomplete />
          <PriceSlider />
        </div>
      </div>

      <Suspense fallback={null}>
        <FilterBar />
      </Suspense>

      <div className="max-w-screen-2xl mx-auto px-4 lg:px-8 py-6">
        <Suspense fallback={<GridSkeleton />}>
          <ArtworkGrid searchParams={params} />
        </Suspense>
      </div>

      {/* ═══ COMMENT CA MARCHE ═══ */}
      {!params.q && !params.category && (
        <section className="border-t border-white/5 bg-[#0d0d0d]">
          <div className="max-w-screen-xl mx-auto px-4 lg:px-8 py-16">
            <h2 className="font-playfair text-2xl font-semibold text-white text-center mb-10">Comment ca marche</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { num: "1", title: "Je decouvre", desc: "Parcourez des milliers d'oeuvres originales selectionnees par nos experts. Filtrez par style, prix, taille." },
                { num: "2", title: "Je choisis en confiance", desc: "Chaque oeuvre est certifiee originale et livree avec son certificat d'authenticite." },
                { num: "3", title: "Je recois", desc: "Livraison securisee, emballage premium, satisfait ou rembourse 14 jours." },
              ].map((s) => (
                <div key={s.num} className="text-center">
                  <div className="w-12 h-12 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center mx-auto mb-4">
                    <span className="text-[#D4AF37] font-bold text-lg">{s.num}</span>
                  </div>
                  <h3 className="text-white font-semibold mb-2">{s.title}</h3>
                  <p className="text-white/40 text-sm leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Pourquoi ART-CORE */}
          <div className="max-w-screen-xl mx-auto px-4 lg:px-8 pb-16">
            <div className="rounded-2xl bg-[#D4AF37]/5 border border-[#D4AF37]/10 p-8 md:p-10 text-center">
              <h2 className="font-playfair text-xl font-semibold text-white mb-4">Pourquoi ART-CORE</h2>
              <p className="text-white/45 text-sm leading-relaxed max-w-xl mx-auto">
                Nous avons cree ART-CORE parce que l&apos;art original merite d&apos;etre accessible.
                Pas besoin d&apos;etre collectionneur ou d&apos;aller dans une galerie intimidante.
                Ici, chaque oeuvre est verifiee, chaque artiste est reel, chaque achat est protege.
              </p>
              <div className="flex justify-center gap-4 mt-6">
                <Link href="/art-core/about" className="text-[#D4AF37] text-sm font-medium hover:underline">En savoir plus</Link>
                <Link href="/art-core/faq" className="text-white/40 text-sm hover:text-white/60">FAQ</Link>
              </div>
            </div>
          </div>

          {/* Nos artistes */}
          <div className="max-w-screen-xl mx-auto px-4 lg:px-8 pb-16">
            <h2 className="font-playfair text-2xl font-semibold text-white text-center mb-8">Nos artistes</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { name: "Marie Dubois", city: "Paris", quote: "ART-CORE m'a permis de toucher des acheteurs que je n'aurais jamais atteints en galerie." },
                { name: "Lucas Martin", city: "Lyon", quote: "La certification rassure mes clients. Mes ventes ont augmente de 60% depuis mon inscription." },
                { name: "Sophie Laurent", city: "Bordeaux", quote: "En tant qu'initie, j'investis sur les artistes que j'aime. C'est du soutien concret." },
              ].map((a) => (
                <div key={a.name} className="rounded-2xl bg-white/[0.02] border border-white/5 p-6">
                  <div className="w-12 h-12 rounded-full bg-[#D4AF37]/10 flex items-center justify-center mb-4">
                    <span className="text-[#D4AF37] font-bold text-sm">{a.name.split(" ").map(n => n[0]).join("")}</span>
                  </div>
                  <p className="text-white/50 text-sm italic leading-relaxed mb-4">&laquo; {a.quote} &raquo;</p>
                  <p className="text-white font-medium text-sm">{a.name}</p>
                  <p className="text-white/25 text-xs">{a.city}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
