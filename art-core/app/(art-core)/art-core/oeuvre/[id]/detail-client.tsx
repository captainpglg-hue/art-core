"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Coins, ArrowDown, ShoppingCart, Loader2, Send, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";

interface Props {
  artworkId: string;
  artworkTitle: string;
  artworkPrice: number;
  gaugePoints: number;
  gaugeLocked: boolean;
  artworkStatus: string;
  communityBoosts: number;
  currentUser: {
    id: string;
    is_initie: boolean | null;
    points_balance: number | null;
    role: string | null;
  } | null;
  isArtist: boolean;
  artistId: string;
}

export function ArtworkDetailClient({
  artworkId, artworkTitle, artworkPrice, gaugePoints, gaugeLocked, artworkStatus,
  communityBoosts, currentUser, isArtist, artistId,
}: Props) {
  const router = useRouter();
  const [depositAmount, setDepositAmount] = useState("");
  const [offerAmount, setOfferAmount] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const [boostCount, setBoostCount] = useState(communityBoosts || 0);
  const [hasBoosted, setHasBoosted] = useState(false);

  const isSold = artworkStatus === "sold";
  const canDeposit = currentUser?.is_initie && !gaugeLocked && !isSold && !isArtist;
  const canEmpty = isArtist && gaugePoints > 0 && !isSold;
  const canBuy = currentUser && !isArtist && !isSold && artworkStatus === "for_sale";
  const canOffer = currentUser && !isArtist && !isSold;

  async function handleDeposit() {
    const pts = parseInt(depositAmount);
    if (!pts || pts <= 0) { toast({ title: "Entrez un nombre de points valide", variant: "destructive" }); return; }
    if (pts > (currentUser?.points_balance ?? 0)) { toast({ title: "Points insuffisants", variant: "destructive" }); return; }

    setLoading("deposit");
    try {
      const res = await fetch("/api/gauge/deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ artwork_id: artworkId, points: pts }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: `${data.points_deposited} pts déposés !`, description: data.gauge_locked ? "Jauge verrouillée ! Vente garantie." : `Jauge: ${data.gauge_points}/100` });
      setDepositAmount("");
      router.refresh();
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally { setLoading(null); }
  }

  async function handleEmpty() {
    setLoading("empty");
    try {
      const res = await fetch("/api/gauge/empty", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ artwork_id: artworkId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: `${data.points_recovered} pts récupérés !` });
      router.refresh();
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally { setLoading(null); }
  }

  async function handleBuy() {
    setLoading("buy");
    try {
      const res = await fetch("/api/sale/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ artwork_id: artworkId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: "Achat confirmé !", description: `"${artworkTitle}" vous appartient.` });
      router.refresh();
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally { setLoading(null); }
  }

  async function handleOffer() {
    const amt = parseFloat(offerAmount);
    if (!amt || amt <= 0) { toast({ title: "Montant invalide", variant: "destructive" }); return; }
    setLoading("offer");
    try {
      const res = await fetch("/api/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ artwork_id: artworkId, amount: amt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: "Offre envoyée !" });
      setOfferAmount("");
      router.refresh();
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally { setLoading(null); }
  }

  if (!currentUser) {
    return (
      <div className="text-center py-3">
        <p className="text-xs text-white/30 mb-2">Connectez-vous pour interagir</p>
        <Button size="sm" variant="outline" asChild><a href="/auth/login">Se connecter</a></Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {canDeposit && (
        <div className="space-y-2">
          <p className="text-[11px] text-white/40">
            Déposez des points (solde: <span className="text-gold font-semibold">{currentUser.points_balance} pts</span>)
          </p>
          <div className="flex gap-2">
            <Input type="number" min="1" max={Math.min(currentUser.points_balance ?? 0, 100 - gaugePoints)} value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} placeholder="Points" className="flex-1 h-9 text-sm" />
            <Button size="sm" onClick={handleDeposit} disabled={loading === "deposit"} className="gap-1.5">
              {loading === "deposit" ? <Loader2 className="size-3.5 animate-spin" /> : <Coins className="size-3.5" />}Déposer
            </Button>
          </div>
        </div>
      )}
      {canEmpty && (
        <Button variant="outline" size="sm" onClick={handleEmpty} disabled={loading === "empty"} className="w-full gap-2 text-orange-400 border-orange-400/30 hover:bg-orange-400/10">
          {loading === "empty" ? <Loader2 className="size-3.5 animate-spin" /> : <ArrowDown className="size-3.5" />}
          Vider la jauge ({gaugePoints} pts)
        </Button>
      )}
      {canBuy && (
        <Button size="lg" onClick={handleBuy} disabled={loading === "buy"} className="w-full gap-2">
          {loading === "buy" ? <Loader2 className="size-4 animate-spin" /> : <ShoppingCart className="size-4" />}Acheter maintenant
        </Button>
      )}
      {canOffer && (
        <div className="flex gap-2">
          <Input type="number" min="1" value={offerAmount} onChange={(e) => setOfferAmount(e.target.value)} placeholder="Proposer un prix (€)" className="flex-1 h-9 text-sm" />
          <Button variant="outline" size="sm" onClick={handleOffer} disabled={loading === "offer"} className="gap-1.5">
            {loading === "offer" ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}Offrir
          </Button>
        </div>
      )}
      {gaugeLocked && !isSold && <p className="text-[11px] text-gold/60 text-center">Jauge verrouillée — vente garantie !</p>}

      {/* Community Boost */}
      {!isSold && !isArtist && (
        <div className="border-t border-white/5 pt-3 mt-3">
          <button
            onClick={async () => {
              setLoading("boost");
              try {
                const res = await fetch("/api/boost", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ artwork_id: artworkId }) });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error);
                setBoostCount(data.boost_count);
                setHasBoosted(true);
                toast({ title: "Boost envoyé !", description: data.auto_highlighted ? "50+ boosts — mise en avant auto !" : `${data.boost_count} boost${data.boost_count > 1 ? "s" : ""}` });
              } catch (err: any) { toast({ title: "Erreur", description: err.message, variant: "destructive" }); }
              finally { setLoading(null); }
            }}
            disabled={loading === "boost" || hasBoosted}
            className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs transition-all ${
              hasBoosted
                ? "bg-pink-500/10 border border-pink-500/20 text-pink-400"
                : "bg-white/3 border border-white/8 text-white/50 hover:border-pink-500/30 hover:text-pink-400"
            }`}
          >
            {loading === "boost" ? <Loader2 className="size-3.5 animate-spin" /> : <Heart className={`size-3.5 ${hasBoosted ? "fill-pink-400" : ""}`} />}
            {hasBoosted ? "Boosté !" : "Booster cette oeuvre (1 pt)"}
            <span className="text-white/25 ml-1">|</span>
            <span className={boostCount >= 50 ? "text-[#C9A84C] font-semibold" : "text-white/30"}>
              {boostCount} boost{boostCount !== 1 ? "s" : ""}
            </span>
          </button>
          {boostCount >= 50 && (
            <p className="text-[10px] text-[#C9A84C]/60 text-center mt-1">Mise en avant algorithmique active</p>
          )}
        </div>
      )}
    </div>
  );
}
