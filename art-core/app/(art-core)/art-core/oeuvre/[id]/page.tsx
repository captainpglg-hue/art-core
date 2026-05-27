import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ChevronRight, ShoppingCart, Share2, Heart, Eye, Ruler, Tag,
  User2, Calendar, Lock, MessageSquare, ShieldCheck,
} from "lucide-react";
import { getArtworkById, getArtworks, getGaugeEntries, getDb, queryAll } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GaugeBar } from "@/components/art-core/GaugeBar";
import { ArtworkGallery } from "@/components/art-core/ArtworkGallery";
import { ArtworkCard } from "@/components/art-core/ArtworkCard";
import { formatPrice, formatDate } from "@/lib/utils";
import { resolveAllPhotos } from "@/lib/resolve-photo";
import { ArtworkDetailClient } from "./detail-client";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const artwork = await getArtworkById(id);
  return {
    title: artwork?.title ?? "Oeuvre",
    description: `Découvrez "${artwork?.title}" sur ART-CORE.`,
  };
}

export default async function ArtworkDetailPage({ params }: Props) {
  const { id } = await params;
  const artwork = await getArtworkById(id);
  if (!artwork) notFound();

  const photos = resolveAllPhotos(artwork.photos);
  const gaugeEntries = await getGaugeEntries(id);
  const currentUser = await getSessionUser();

  // Incrément des vues via RPC dédiée (cf. migration 20260520000000) — l'ancien
  // `UPDATE artworks SET views_count = views_count + 1` passait par le translator
  // REST qui n'évalue pas les expressions SQL, d'où 17 erreurs/jour en prod.
  // Cast typé : la RPC vient d'être créée et n'est pas encore dans types/supabase.ts
  // (regénération via `npm run db:types` au prochain sprint).
  try {
    const sb = getDb() as unknown as { rpc: (fn: string, args: Record<string, unknown>) => Promise<{ error: unknown }> };
    await sb.rpc("increment_artwork_views", { p_id: id });
  } catch {}

  const markets = await queryAll<any>("SELECT * FROM betting_markets WHERE artwork_id = ?", [id]);

  // Œuvres similaires — même catégorie, hors œuvre courante et œuvres vendues.
  const related = artwork.category
    ? (await getArtworks({ category: artwork.category, limit: 12 }))
        .filter((a) => a.id !== id && a.status !== "sold")
        .slice(0, 4)
    : [];

  const gaugePoints = Number(artwork.gauge_points ?? 0);
  const isLocked = artwork.gauge_locked === 1 || gaugePoints >= 100;
  const isArtist = currentUser?.id === artwork.artist_id;
  const isCertified = !!artwork.blockchain_hash;

  return (
    <div className="max-w-screen-xl mx-auto px-4 lg:px-8 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-white/30 mb-8">
        <Link href="/art-core" className="hover:text-white/60 transition-colors">Marketplace</Link>
        <ChevronRight className="size-3" />
        <span className="capitalize text-white/40">{artwork.category?.replace("_", " ")}</span>
        <ChevronRight className="size-3" />
        <span className="text-white/60 truncate max-w-[200px]">{artwork.title}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-10 xl:gap-14">
        {/* Left — Galerie interactive */}
        <ArtworkGallery photos={photos} title={artwork.title} />

        {/* Right — Info panel */}
        <div className="space-y-6 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto no-scrollbar">
          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            {isCertified && (
              <Badge className="text-[10px] bg-green-500/10 text-green-400 border-green-500/20 px-3 py-1">
                <ShieldCheck className="size-3 mr-1.5" />Oeuvre originale certifiée
              </Badge>
            )}
            {isLocked && (
              <Badge className="text-[10px] bg-[#C9A84C]/20 text-[#C9A84C] border-[#C9A84C]/30 animate-pulse">
                <Lock className="size-3 mr-1" />Deal verrouillé
              </Badge>
            )}
            {artwork.status === "sold" && (
              <Badge className="text-[10px] bg-green-500/20 text-green-400 border-green-500/30">Vendue</Badge>
            )}
          </div>

          {/* Certificat d'authenticité */}
          {isCertified && (
            <div className="rounded-xl bg-green-500/5 border border-green-500/15 p-4 flex items-start gap-3">
              <ShieldCheck className="size-5 text-green-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-green-400 font-medium">Œuvre originale — authenticité garantie</p>
                <p className="text-[11px] text-white/35 mt-0.5 leading-relaxed">
                  Cette œuvre a été certifiée par PASS-CORE et est livrée avec son certificat d&apos;authenticité,
                  rattaché à vie à l&apos;œuvre et infalsifiable.
                  {artwork.certification_date && ` Certifiée le ${new Date(artwork.certification_date).toLocaleDateString("fr-FR")}.`}
                </p>
              </div>
            </div>
          )}

          {/* Title + Artist */}
          <div>
            <h1 className="font-playfair text-3xl font-semibold text-white leading-tight mb-2">
              {artwork.title}
            </h1>
            <Link href={`/art-core/profil/${artwork.artist_id}`} className="flex items-center gap-2 group w-fit">
              <div className="w-7 h-7 rounded-full bg-dark-50 border border-white/10 flex items-center justify-center text-[10px] font-medium text-white/60">
                {artwork.artist_name?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
              </div>
              <span className="text-sm text-white/60 group-hover:text-[#C9A84C] transition-colors">
                {artwork.artist_name}
              </span>
            </Link>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-5 text-xs text-white/30">
            <span className="flex items-center gap-1.5"><Eye className="size-3.5" />{artwork.views_count ?? 0} vues</span>
            <span className="flex items-center gap-1.5"><Heart className="size-3.5" />{artwork.favorites_count ?? 0} favoris</span>
            {artwork.creation_date && (
              <span className="flex items-center gap-1.5"><Calendar className="size-3.5" />{artwork.creation_date}</span>
            )}
          </div>

          {/* Gauge Section */}
          <div className="rounded-xl border border-white/8 bg-[#1E1E1E] p-5 space-y-4">
            <p className="text-xs uppercase tracking-widest text-white/25">Jauge de Points</p>
            <GaugeBar
              value={gaugePoints}
              locked={isLocked}
              entries={gaugeEntries.map((e: any) => ({
                id: e.id,
                points: e.points,
                user: { id: e.initiate_id, username: e.initiate_username, full_name: e.initiate_name, avatar_url: null },
              }))}
            />

            {/* Initiate list */}
            {gaugeEntries.length > 0 && (
              <div className="space-y-2">
                <p className="text-[11px] text-white/30">Points par initié</p>
                {gaugeEntries.map((entry: any) => (
                  <div key={entry.id} className="flex items-center justify-between text-xs">
                    <span className="text-white/50">{entry.initiate_name}</span>
                    <span className="text-gold font-semibold tabular-nums">{entry.points} pts</span>
                  </div>
                ))}
              </div>
            )}

            {/* Client component for interactions */}
            <ArtworkDetailClient
              artworkId={id}
              artworkTitle={artwork.title}
              artworkPrice={artwork.price}
              gaugePoints={gaugePoints}
              gaugeLocked={isLocked}
              artworkStatus={artwork.status}
              communityBoosts={artwork.community_boosts || 0}
              currentUser={currentUser ? {
                id: currentUser.id,
                is_initie: currentUser.is_initie,
                points_balance: currentUser.points_balance,
                role: currentUser.role,
              } : null}
              isArtist={isArtist}
              artistId={artwork.artist_id}
            />
          </div>

          {/* Pricing */}
          {artwork.status !== "sold" && artwork.price > 0 && (
            <div className="rounded-xl border border-white/8 bg-[#1E1E1E] p-5 space-y-4">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-white/30 mb-1">Prix de vente</p>
                  <p
                    className="font-playfair text-3xl font-bold text-gold tabular-nums"
                    style={{ color: "#D4AF37" }}
                  >
                    {formatPrice(artwork.price)}
                  </p>
                </div>
              </div>

              <div className="border-t border-white/5 pt-3 text-[11px] text-white/25 space-y-1">
                <div className="flex justify-between"><span>Artiste (90%)</span><span>{formatPrice(artwork.price * 0.90)}</span></div>
                <div className="flex justify-between"><span>Plateforme (10%)</span><span>{formatPrice(artwork.price * 0.10)}</span></div>
                {isLocked && (
                  <div className="flex justify-between text-[#C9A84C]/50">
                    <span>Pool Initiés (50% de plateforme)</span>
                    <span>{formatPrice(artwork.price * 0.05)}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {artwork.status === "sold" && artwork.final_sale_price && (
            <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-5">
              <p className="text-[10px] uppercase tracking-widest text-green-400/50 mb-1">Vendue pour</p>
              <p className="font-playfair text-2xl font-bold text-green-400 tabular-nums">{formatPrice(artwork.final_sale_price)}</p>
              {artwork.sold_at && <p className="text-xs text-white/30 mt-1">Le {formatDate(artwork.sold_at)}</p>}
            </div>
          )}

          {/* Achat — disponible même pour l'artiste de l'œuvre (auto-achat autorisé) */}
          {artwork.status !== "sold" && (
            <div className="space-y-2.5">
              <Link
                href={`/art-core/checkout?artwork_id=${id}`}
                className="flex items-center justify-center gap-2.5 py-4 rounded-xl bg-[#C9A84C] text-[#0a0a0a] font-semibold text-base active:brightness-90 transition-all hover:shadow-[0_0_30px_rgba(212,175,55,0.3)]"
              >
                <ShoppingCart className="size-5" />
                Acheter{artwork.price > 0 ? ` — ${formatPrice(artwork.price)}` : ""}
              </Link>
              <p className="text-center text-[11px] text-white/30">
                Paiement sécurisé · Livraison sous 7 jours · Satisfait ou remboursé 14 jours
              </p>
              {!isArtist && (
                <Link
                  href={`/art-core/messages?to=${artwork.artist_id}&artwork=${id}`}
                  className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-white/10 text-sm text-white/50 hover:text-white hover:bg-white/5 transition-all"
                >
                  <MessageSquare className="size-4" />Une question ? Contacter le vendeur
                </Link>
              )}
            </div>
          )}

          {/* Details */}
          <div className="space-y-1.5">
            <p className="text-xs uppercase tracking-widest text-white/25 mb-3">Détails</p>
            {[
              artwork.technique && { icon: Tag, label: "Technique", value: artwork.technique },
              artwork.dimensions && { icon: Ruler, label: "Dimensions", value: artwork.dimensions },
              artwork.creation_date && { icon: Calendar, label: "Création", value: artwork.creation_date },
              { icon: User2, label: "Artiste", value: artwork.artist_name },
            ]
              .filter(Boolean)
              .map((item) => {
                if (!item) return null;
                const Icon = item.icon;
                return (
                  <div key={item.label} className="flex items-center gap-3 py-2 border-b border-white/5">
                    <Icon className="size-3.5 text-white/25 shrink-0" />
                    <span className="text-xs text-white/40 w-24 shrink-0">{item.label}</span>
                    <span className="text-xs text-white/70">{item.value}</span>
                  </div>
                );
              })}

            {/* Human-readable dimension hint */}
            {artwork.dimensions && (() => {
              const match = artwork.dimensions.match(/(\d+)/);
              const cm = match ? parseInt(match[1]) : 0;
              const hint = cm > 0 && cm < 30 ? "Format de bureau ou bibliothèque"
                : cm >= 30 && cm <= 80 ? "Format idéal pour couloir ou bureau"
                : cm > 80 && cm <= 150 ? "Format idéal pour salon ou salle à manger"
                : cm > 150 ? "Grande installation, prévoir un grand mur" : null;
              return hint ? (
                <p className="text-[11px] text-[#C9A84C]/60 italic pl-7 -mt-0.5">{hint}</p>
              ) : null;
            })()}
          </div>

          {/* Description */}
          {artwork.description && (
            <div>
              <p className="text-xs uppercase tracking-widest text-white/25 mb-3">Description</p>
              <p className="text-sm text-white/60 leading-relaxed">{artwork.description}</p>
            </div>
          )}

          {/* Betting markets */}
          {markets.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-widest text-white/25 mb-3">Marchés Prédictifs (PRIME-CORE)</p>
              <div className="space-y-2">
                {markets.map((m: any) => (
                  <div key={m.id} className="rounded-lg border border-white/8 bg-white/3 p-3 text-xs">
                    <p className="text-white/60 mb-1">{m.question}</p>
                    <div className="flex gap-4">
                      <span className="text-green-400">Oui: {m.odds_yes}x</span>
                      <span className="text-red-400">Non: {m.odds_no}x</span>
                      <span className="text-white/30 ml-auto capitalize">{m.status.replace("_", " ")}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Œuvres similaires */}
      {related.length > 0 && (
        <section className="mt-16 pt-12 border-t border-white/5">
          <h2 className="font-playfair text-2xl font-semibold text-white mb-1">Œuvres similaires</h2>
          <p className="text-white/35 text-sm mb-7">D&apos;autres pièces qui pourraient vous plaire</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            {related.map((a) => (
              <ArtworkCard key={a.id} artwork={{ ...a, photos: resolveAllPhotos(a.photos) }} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
