"use client";

import { useState, useEffect } from "react";
import {
  Zap, Star, Award, Mail, Layout, Coins, Loader2, CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface PromoTool {
  id: string;
  name: string;
  description: string;
  type: string;
  cost_points: number;
  duration_days: number;
  icon: string;
}

interface PromoShopProps {
  userBalance: number;
  artworkId?: string;
  onPurchase?: (newBalance: number) => void;
}

const ICON_MAP: Record<string, typeof Zap> = {
  boost: Zap,
  featured: Star,
  badge: Award,
  newsletter: Mail,
  banner: Layout,
};

export function PromoShop({ userBalance, artworkId, onPurchase }: PromoShopProps) {
  const [tools, setTools] = useState<PromoTool[]>([]);
  const [loading, setLoading] = useState(true);
  const [buyingId, setBuyingId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/promo/shop")
      .then((r) => r.json())
      .then((data) => setTools(data.tools ?? []))
      .catch(() => toast({ title: "Erreur chargement boutique", variant: "destructive" }))
      .finally(() => setLoading(false));
  }, []);

  async function handleBuy(toolId: string) {
    setBuyingId(toolId);
    try {
      const res = await fetch("/api/promo/shop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ promo_tool_id: toolId, artwork_id: artworkId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast({
        title: "Promo activee !",
        description: `Nouveau solde : ${data.new_balance} pts`,
      });

      onPurchase?.(data.new_balance);
    } catch (err) {
      toast({
        title: "Erreur",
        description: err instanceof Error ? err.message : "Erreur inattendue",
        variant: "destructive",
      });
    } finally {
      setBuyingId(null);
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-40 rounded-2xl bg-white/5 animate-pulse" />
        ))}
      </div>
    );
  }

  // If no tools in DB, show defaults
  const displayTools: PromoTool[] = tools.length > 0 ? tools : [
    { id: "1", name: "Boost recherche", description: "Apparaissez en priorite dans les resultats de recherche", type: "boost", cost_points: 10, duration_days: 7, icon: "boost" },
    { id: "2", name: "Mise en avant", description: "Votre oeuvre en haut de la marketplace pendant 3 jours", type: "featured", cost_points: 25, duration_days: 3, icon: "featured" },
    { id: "3", name: "Badge Or", description: "Badge dore visible sur votre oeuvre pendant 14 jours", type: "badge", cost_points: 5, duration_days: 14, icon: "badge" },
    { id: "4", name: "Newsletter", description: "Votre oeuvre dans la newsletter quotidienne", type: "newsletter", cost_points: 30, duration_days: 1, icon: "newsletter" },
    { id: "5", name: "Banniere homepage", description: "Grande banniere sur la page d'accueil pendant 24h", type: "banner", cost_points: 50, duration_days: 1, icon: "banner" },
  ];

  return (
    <div className="space-y-6">
      {/* Balance bar */}
      <div className="flex items-center gap-3 p-4 rounded-xl bg-[#C9A84C]/5 border border-[#C9A84C]/15">
        <Coins className="size-6 text-[#C9A84C]" />
        <div className="flex-1">
          <p className="text-xs text-white/40">Votre solde</p>
          <p className="text-2xl font-bold text-[#C9A84C] tabular-nums">{userBalance} pts</p>
        </div>
      </div>

      {/* Tools grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {displayTools.map((tool) => {
          const Icon = ICON_MAP[tool.icon ?? tool.type] ?? Zap;
          const canAfford = userBalance >= tool.cost_points;

          return (
            <div
              key={tool.id}
              className={cn(
                "rounded-2xl border p-5 transition-all",
                canAfford
                  ? "border-white/10 bg-[#1E1E1E] hover:border-[#C9A84C]/20"
                  : "border-white/5 bg-[#111111] opacity-50"
              )}
            >
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-[#C9A84C]/10 flex items-center justify-center shrink-0">
                  <Icon className="size-5 text-[#C9A84C]" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-white">{tool.name}</h3>
                  <p className="text-xs text-white/40 mt-0.5 line-clamp-2">{tool.description}</p>
                </div>
              </div>

              <div className="flex items-center justify-between mt-4">
                <div>
                  <p className="text-lg font-bold text-[#C9A84C] tabular-nums">{tool.cost_points} pts</p>
                  <p className="text-[10px] text-white/25">{tool.duration_days}j de duree</p>
                </div>
                <Button
                  size="sm"
                  disabled={!canAfford || buyingId === tool.id}
                  onClick={() => handleBuy(tool.id)}
                  className="gap-1.5"
                >
                  {buyingId === tool.id ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="size-3.5" />
                  )}
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
