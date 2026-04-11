"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search, Sparkles, BellRing, Film, LayoutDashboard, Mail,
  Bookmark, MapPin, Crown, Share2, Zap, Award, Loader2,
  Check, Coins, CreditCard, ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const ICONS: Record<string, any> = {
  search: Search, sparkles: Sparkles, "bell-ring": BellRing, film: Film,
  "layout-dashboard": LayoutDashboard, mail: Mail, bookmark: Bookmark,
  "map-pin": MapPin, crown: Crown, "share-2": Share2, zap: Zap, award: Award,
};

const TIER_CONFIG = {
  bronze: { label: "BRONZE", color: "from-amber-700 to-amber-600", border: "border-amber-700/30", bg: "bg-amber-700/5", text: "text-amber-500", badge: "bg-amber-700/20 text-amber-400" },
  silver: { label: "ARGENT", color: "from-gray-400 to-gray-300", border: "border-gray-400/30", bg: "bg-gray-400/5", text: "text-gray-300", badge: "bg-gray-400/20 text-gray-300" },
  gold: { label: "OR", color: "from-[#C9A84C] to-[#F5D76E]", border: "border-[#C9A84C]/30", bg: "bg-[#C9A84C]/5", text: "text-[#C9A84C]", badge: "bg-[#C9A84C]/20 text-[#C9A84C]" },
};

export default function BoutiquePromotionPage() {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [artworks, setArtworks] = useState<any[]>([]);
  const [selectedArtwork, setSelectedArtwork] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const [purchased, setPurchased] = useState<string | null>(null);
  const [activePromos, setActivePromos] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/promo/shop").then(r => r.json()).then(d => setItems(d.items || []));
    fetch("/api/auth/me").then(r => r.json()).then(d => setUser(d.user));
    fetch("/api/artworks?limit=50").then(r => r.json()).then(d => setArtworks(d.artworks || []));
    fetch("/api/promo/active").then(r => r.json()).then(d => setActivePromos(d.promos || [])).catch(() => {});
  }, []);

  async function handlePurchase(itemId: string, payWith: "points" | "euros") {
    if (!selectedArtwork && !["featured_artist", "premium_badge", "social_pack", "push_buyers", "notify_scouts"].some(t => items.find(i => i.id === itemId)?.type === t)) {
      toast({ title: "Sélectionnez une oeuvre", variant: "destructive" });
      return;
    }

    setLoading(itemId);
    try {
      const res = await fetch("/api/promo/shop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ artwork_id: selectedArtwork || null, promo_item_id: itemId, pay_with: payWith }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setPurchased(itemId);
      toast({ title: "Promotion activée !", description: `${data.item} — ${payWith === "points" ? data.amount + " pts" : data.amount + "€"}` });
      setUser((u: any) => u ? { ...u, points_balance: data.new_balance } : u);

      setTimeout(() => setPurchased(null), 3000);
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally { setLoading(null); }
  }

  const tiers = ["bronze", "silver", "gold"] as const;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-playfair text-3xl font-semibold text-white mb-2">Boutique Promotion</h1>
        <p className="text-white/40 text-sm">Boostez la visibilité de vos oeuvres — payez en points ou en euros.</p>
      </div>

      {/* Balance + Artwork selector */}
      <div className="flex flex-col sm:flex-row gap-4 mb-10">
        {user && (
          <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-[#C9A84C]/5 border border-[#C9A84C]/15">
            <Coins className="size-6 text-[#C9A84C]" />
            <div>
              <p className="text-2xl font-bold text-[#C9A84C] tabular-nums">{user.points_balance}</p>
              <p className="text-[10px] text-white/30">Points disponibles</p>
            </div>
          </div>
        )}
        <div className="flex-1">
          <label className="text-xs text-white/40 mb-1.5 block">Oeuvre à promouvoir</label>
          <select
            value={selectedArtwork}
            onChange={(e) => setSelectedArtwork(e.target.value)}
            className="w-full h-11 rounded-xl bg-white/5 border border-white/10 text-sm text-white px-4 focus:outline-none focus:border-[#C9A84C]/40 appearance-none"
          >
            <option value="">Choisir une oeuvre...</option>
            {artworks.filter(a => a.status !== "sold").map((a: any) => (
              <option key={a.id} value={a.id}>{a.title} — {a.price}€</option>
            ))}
          </select>
        </div>
      </div>

      {/* Point earning info */}
      <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-5 mb-10">
        <h3 className="text-sm font-semibold text-white mb-3">Comment gagner des points ?</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
          {[
            { label: "Vendre une oeuvre", pts: "10% du prix" },
            { label: "Recommandation scout", pts: "+50 pts" },
            { label: "Boost communautaire reçu", pts: "+5 pts / 10 boosts" },
            { label: "Compléter son profil", pts: "+20 pts" },
            { label: "1ère certification PASS-CORE", pts: "+100 pts" },
            { label: "Parrainer un artiste", pts: "+75 pts" },
          ].map((r) => (
            <div key={r.label} className="flex items-center gap-2 p-2 rounded-lg bg-white/3">
              <span className="text-[#C9A84C] font-bold shrink-0">{r.pts}</span>
              <span className="text-white/50">{r.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 3 Tiers */}
      {tiers.map((tier) => {
        const config = TIER_CONFIG[tier];
        const tierItems = items.filter(i => i.tier === tier);
        if (tierItems.length === 0) return null;

        return (
          <div key={tier} className="mb-10">
            <div className="flex items-center gap-3 mb-5">
              <span className={cn("px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider", config.badge)}>
                {config.label}
              </span>
              <span className="text-xs text-white/25">
                {tier === "bronze" ? "50-150 pts / 5-15€" : tier === "silver" ? "200-500 pts / 20-50€" : "1000-2000 pts / 100-200€"}
              </span>
              <div className="flex-1 h-px bg-gradient-to-r from-white/10 to-transparent" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {tierItems.map((item) => {
                const Icon = ICONS[item.icon] || Sparkles;
                const canAffordPoints = user && user.points_balance >= item.cost_points;
                const isPurchased = purchased === item.id;
                const isLoading = loading === item.id;

                return (
                  <div
                    key={item.id}
                    className={cn(
                      "rounded-2xl border p-5 transition-all hover:-translate-y-0.5",
                      config.border, config.bg,
                      "hover:shadow-lg"
                    )}
                  >
                    <div className="flex items-start gap-4 mb-4">
                      <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center shrink-0", config.bg, "border", config.border)}>
                        <Icon className={cn("size-5", config.text)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-white">{item.name}</h3>
                        <p className="text-[11px] text-white/35 mt-0.5">{item.duration_hours}h de durée</p>
                      </div>
                    </div>

                    <p className="text-xs text-white/45 leading-relaxed mb-4">{item.description}</p>

                    {/* Price + Actions */}
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <span className={cn("text-lg font-bold tabular-nums", config.text)}>{item.cost_points}</span>
                        <span className="text-white/25 text-xs ml-1">pts</span>
                        <span className="text-white/15 text-xs mx-2">ou</span>
                        <span className="text-white/50 font-semibold text-sm">{item.cost_euros}€</span>
                      </div>

                      {isPurchased ? (
                        <div className="flex items-center gap-1.5 text-green-400 text-xs font-medium">
                          <Check className="size-4" />Activé !
                        </div>
                      ) : (
                        <div className="flex gap-1.5">
                          <Button
                            size="sm"
                            onClick={() => handlePurchase(item.id, "points")}
                            disabled={!canAffordPoints || isLoading}
                            className="gap-1 text-xs h-8"
                          >
                            {isLoading ? <Loader2 className="size-3 animate-spin" /> : <Coins className="size-3" />}
                            Points
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handlePurchase(item.id, "euros")}
                            disabled={isLoading}
                            className="gap-1 text-xs h-8"
                          >
                            <CreditCard className="size-3" />
                            {item.cost_euros}€
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Active promos */}
      {activePromos.length > 0 && (
        <div className="mt-10">
          <h2 className="text-lg font-semibold text-white mb-4">Promotions actives</h2>
          <div className="space-y-2">
            {activePromos.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-green-500/5 border border-green-500/10">
                <div>
                  <p className="text-sm text-white/70">{p.name}</p>
                  {p.artwork_title && <p className="text-[11px] text-white/30">{p.artwork_title}</p>}
                </div>
                <span className="text-xs text-green-400 font-medium">
                  Expire {new Date(p.expires_at).toLocaleDateString("fr-FR")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
