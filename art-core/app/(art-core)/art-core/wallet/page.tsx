"use client";

import { useEffect, useState } from "react";
import { Coins, ArrowUp, ArrowDown, TrendingUp, Clock } from "lucide-react";
import { formatPrice } from "@/lib/utils";

export default function WalletPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/wallet").then(r => r.json()).then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center py-24"><div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin" /></div>;
  if (!data) return <div className="text-center py-24 text-white/40">Erreur de chargement</div>;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="font-playfair text-3xl font-semibold text-white mb-8">Portefeuille</h1>

      {/* Balance card */}
      <div className="rounded-2xl bg-gradient-to-br from-[#1E1E1E] to-[#151515] border border-gold/10 p-6 mb-8">
        <p className="text-xs uppercase tracking-widest text-white/30 mb-2">Solde actuel</p>
        <div className="flex items-baseline gap-3">
          <Coins className="size-8 text-gold" />
          <span className="font-playfair text-4xl font-bold text-gold tabular-nums">{data.points_balance}</span>
          <span className="text-white/40 text-lg">pts</span>
        </div>
        <div className="flex gap-6 mt-4 text-sm text-white/40">
          <span className="flex items-center gap-1.5"><TrendingUp className="size-4 text-green-400" />Total gagné: {data.total_earned} pts</span>
        </div>
      </div>

      {/* Gauge investments */}
      {data.gaugeInvestments?.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">Investissements (Jauges)</h2>
          <div className="space-y-2">
            {data.gaugeInvestments.map((g: any) => (
              <div key={g.id} className="flex items-center justify-between p-3 rounded-xl bg-white/3 border border-white/5">
                <div>
                  <p className="text-sm text-white/70">{g.artwork_title}</p>
                  <p className="text-[11px] text-white/30">Jauge: {g.gauge_points}/100 {g.gauge_locked ? "— Verrouillée" : ""}</p>
                </div>
                <span className="text-gold font-semibold text-sm tabular-nums">{g.points} pts</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Commissions */}
      {data.commissions?.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">Commissions reçues</h2>
          <div className="space-y-2">
            {data.commissions.map((c: any) => (
              <div key={c.id} className="flex items-center justify-between p-3 rounded-xl bg-green-500/5 border border-green-500/10">
                <div>
                  <p className="text-sm text-white/70">{c.artwork_title}</p>
                  <p className="text-[11px] text-white/30">{c.percentage.toFixed(1)}% du pool — {c.points_invested} pts investis</p>
                </div>
                <span className="text-green-400 font-semibold text-sm tabular-nums">+{c.paid_as_points.toFixed(0)} pts</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transaction history */}
      <h2 className="text-lg font-semibold text-white mb-4">Historique</h2>
      <div className="space-y-1">
        {data.transactions?.map((t: any) => (
          <div key={t.id} className="flex items-center justify-between py-2.5 border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${t.amount > 0 ? "bg-green-500/10" : "bg-red-500/10"}`}>
                {t.amount > 0 ? <ArrowUp className="size-4 text-green-400" /> : <ArrowDown className="size-4 text-red-400" />}
              </div>
              <div>
                <p className="text-sm text-white/70">{t.description}</p>
                <p className="text-[10px] text-white/25 flex items-center gap-1"><Clock className="size-3" />{new Date(t.created_at).toLocaleDateString("fr-FR")}</p>
              </div>
            </div>
            <span className={`font-semibold text-sm tabular-nums ${t.amount > 0 ? "text-green-400" : "text-red-400"}`}>
              {t.amount > 0 ? "+" : ""}{t.amount} pts
            </span>
          </div>
        ))}
        {(!data.transactions || data.transactions.length === 0) && (
          <p className="text-white/25 text-sm text-center py-8">Aucune transaction</p>
        )}
      </div>
    </div>
  );
}
