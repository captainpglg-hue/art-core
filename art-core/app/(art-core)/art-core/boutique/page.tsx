"use client";

import { useEffect, useState } from "react";
import { Rocket, Star, Award, Search, Crown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

const ICONS: Record<string, any> = { rocket: Rocket, star: Star, award: Award, search: Search, crown: Crown };

export default function BoutiquePage() {
  const [items, setItems] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [artworks, setArtworks] = useState<any[]>([]);
  const [selectedArtwork, setSelectedArtwork] = useState("");
  const [loading, setLoading] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/promo/shop").then(r => r.json()).then(d => setItems(d.items));
    fetch("/api/auth/me").then(r => r.json()).then(d => setUser(d.user));
    fetch("/api/artworks?status=for_sale&limit=50").then(r => r.json()).then(d => setArtworks(d.artworks));
  }, []);

  async function handlePurchase(itemId: string) {
    if (!selectedArtwork) { toast({ title: "Sélectionnez une oeuvre", variant: "destructive" }); return; }
    setLoading(itemId);
    try {
      const res = await fetch("/api/promo/shop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ artwork_id: selectedArtwork, promo_item_id: itemId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: "Promotion activée !" });
      fetch("/api/auth/me").then(r => r.json()).then(d => setUser(d.user));
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally { setLoading(null); }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="font-playfair text-3xl font-semibold text-white mb-2">Boutique Promo</h1>
      <p className="text-white/40 text-sm mb-8">Boostez la visibilité de vos oeuvres avec vos points.</p>

      {user && (
        <div className="mb-6 p-4 rounded-xl bg-gold/5 border border-gold/15 flex items-center gap-3">
          <span className="text-gold font-bold text-lg tabular-nums">{user.points_balance} pts</span>
          <span className="text-white/30 text-sm">disponibles</span>
        </div>
      )}

      {/* Select artwork */}
      <div className="mb-8">
        <label className="text-sm text-white/50 mb-2 block">Oeuvre à promouvoir</label>
        <select
          value={selectedArtwork}
          onChange={(e) => setSelectedArtwork(e.target.value)}
          className="w-full h-10 rounded-xl bg-white/5 border border-white/10 text-sm text-white px-3 focus:outline-none focus:border-gold/40"
        >
          <option value="">Choisir une oeuvre...</option>
          {artworks.map((a: any) => (
            <option key={a.id} value={a.id}>{a.title} — {a.price}€</option>
          ))}
        </select>
      </div>

      {/* Items grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item) => {
          const Icon = ICONS[item.icon] || Star;
          const canAfford = user && user.points_balance >= item.cost_points;
          return (
            <div key={item.id} className="rounded-2xl border border-white/8 bg-[#111111] p-5 space-y-4 hover:border-gold/20 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center">
                  <Icon className="size-5 text-gold" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">{item.name}</h3>
                  <p className="text-[10px] text-white/30">{item.duration_hours}h</p>
                </div>
              </div>
              <p className="text-xs text-white/50 leading-relaxed">{item.description}</p>
              <div className="flex items-center justify-between">
                <span className="text-gold font-bold tabular-nums">{item.cost_points} pts</span>
                <Button
                  size="sm"
                  onClick={() => handlePurchase(item.id)}
                  disabled={!canAfford || !selectedArtwork || loading === item.id}
                  className="gap-1.5"
                >
                  {loading === item.id ? <Loader2 className="size-3.5 animate-spin" /> : null}
                  Acheter
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
