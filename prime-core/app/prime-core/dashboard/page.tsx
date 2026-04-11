import { getMarkets, getDb } from "@/lib/db";
import Link from "next/link";
import { TrendingUp, TrendingDown, Lock, Clock, CheckCircle } from "lucide-react";

export const dynamic = "force-dynamic";

export default function DashboardPage() {
  const markets = getMarkets();
  const parsed = markets.map((m) => ({
    ...m,
    photos: JSON.parse(m.photos || "[]"),
  }));

  const openMarkets = parsed.filter(m => m.status === "open");
  const resolvedMarkets = parsed.filter(m => m.status.startsWith("resolved"));

  // Stats
  const totalVolume = parsed.reduce((sum, m) => sum + m.total_yes_amount + m.total_no_amount, 0);
  const totalBets = (getDb().prepare("SELECT COUNT(*) as count FROM bets").get() as any).count;

  return (
    <div className="max-w-screen-xl mx-auto px-4 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Marchés Prédictifs</h1>
        <p className="text-white/40 text-sm">Pariez sur les ventes d&apos;oeuvres — les cotes évoluent avec la jauge de points.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: "Marchés ouverts", value: openMarkets.length, color: "text-green-400" },
          { label: "Volume total", value: `${totalVolume} pts`, color: "text-[#C9A84C]" },
          { label: "Paris placés", value: totalBets, color: "text-white" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl bg-[#141720] border border-white/5 p-5">
            <p className={`text-2xl font-bold tabular-nums ${s.color}`}>{s.value}</p>
            <p className="text-xs text-white/30 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Open Markets */}
      <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <Clock className="size-4 text-green-400" />Marchés ouverts
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
        {openMarkets.map((market) => (
          <Link key={market.id} href={`/prime-core/market/${market.id}`}
            className="group rounded-2xl bg-[#141720] border border-white/5 hover:border-[#C9A84C]/20 transition-all overflow-hidden">
            {/* Image strip */}
            <div className="h-24 bg-[#0D0F14] relative overflow-hidden">
              {market.photos[0] && <img src={market.photos[0]} alt="" className="w-full h-full object-cover opacity-40 group-hover:opacity-50 transition-opacity" />}
              <div className="absolute inset-0 bg-gradient-to-t from-[#141720] to-transparent" />
              <div className="absolute bottom-3 left-4 right-4">
                <p className="text-[11px] text-white/40">{market.artist_name}</p>
                <p className="text-sm font-semibold text-white">{market.artwork_title}</p>
              </div>
              {market.gauge_locked ? (
                <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#C9A84C]/20 text-[10px] text-[#C9A84C] font-medium">
                  <Lock className="size-2.5" />Verrouillé
                </div>
              ) : null}
            </div>

            <div className="p-4 space-y-3">
              <p className="text-sm text-white/70">{market.question}</p>

              {/* Odds bar */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-6 rounded-lg overflow-hidden flex">
                    <div className="bg-green-500/20 flex items-center justify-center" style={{ width: `${(market.total_yes_amount / Math.max(market.total_yes_amount + market.total_no_amount, 1)) * 100}%` }}>
                      <span className="text-[10px] font-bold text-green-400">OUI {market.odds_yes}x</span>
                    </div>
                    <div className="bg-red-500/20 flex-1 flex items-center justify-center">
                      <span className="text-[10px] font-bold text-red-400">NON {market.odds_no}x</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Gauge indicator */}
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-white/30">Jauge: {market.gauge_points}/100</span>
                <span className="text-white/30">{market.total_yes_amount + market.total_no_amount} pts misés</span>
                <span className="text-[#C9A84C] font-medium">{market.market_type === "time" ? "Délai" : "Valeur"}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Resolved Markets */}
      {resolvedMarkets.length > 0 && (
        <>
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <CheckCircle className="size-4 text-white/30" />Marchés résolus
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {resolvedMarkets.map((market) => (
              <div key={market.id} className="rounded-2xl bg-[#141720]/50 border border-white/5 p-4 opacity-70">
                <p className="text-xs text-white/30 mb-1">{market.artwork_title}</p>
                <p className="text-sm text-white/50">{market.question}</p>
                <div className="mt-2 flex items-center gap-2">
                  <span className={`text-xs font-bold ${market.status === "resolved_yes" ? "text-green-400" : "text-red-400"}`}>
                    {market.status === "resolved_yes" ? "OUI" : "NON"}
                  </span>
                  <span className="text-[10px] text-white/20">Résolu le {market.resolved_at ? new Date(market.resolved_at).toLocaleDateString("fr-FR") : "—"}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
