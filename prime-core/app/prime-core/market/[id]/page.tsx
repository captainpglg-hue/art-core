import { notFound } from "next/navigation";
import { getMarketById, getBetsForMarket, getDb } from "@/lib/db";
import { BetForm } from "./bet-form";
import { Lock, TrendingUp } from "lucide-react";

export const dynamic = "force-dynamic";

interface Props { params: Promise<{ id: string }> }

export default async function MarketDetailPage({ params }: Props) {
  const { id } = await params;
  const market = getMarketById(id);
  if (!market) notFound();

  const bets = getBetsForMarket(id);
  const photos = JSON.parse(market.photos || "[]");

  const totalPool = market.total_yes_amount + market.total_no_amount;
  const yesPercent = totalPool > 0 ? (market.total_yes_amount / totalPool * 100).toFixed(1) : "50.0";
  const noPercent = totalPool > 0 ? (market.total_no_amount / totalPool * 100).toFixed(1) : "50.0";

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Artwork header */}
      <div className="flex gap-4 mb-6">
        {photos[0] && (
          <div className="w-20 h-20 rounded-xl overflow-hidden bg-[#141720] shrink-0">
            <img src={photos[0]} alt="" className="w-full h-full object-cover" />
          </div>
        )}
        <div>
          <p className="text-xs text-white/30">{market.artist_name}</p>
          <h2 className="text-lg font-semibold text-white">{market.artwork_title}</h2>
          <div className="flex items-center gap-3 mt-1 text-xs text-white/30">
            <span>{market.artwork_price}€</span>
            <span>Jauge: {market.gauge_points}/100</span>
            {market.gauge_locked ? <span className="text-[#C9A84C] flex items-center gap-1"><Lock className="size-3" />Verrouillé</span> : null}
          </div>
        </div>
      </div>

      {/* Question */}
      <div className="rounded-2xl bg-[#141720] border border-white/8 p-6 mb-6">
        <p className="text-xs uppercase tracking-widest text-[#C9A84C]/50 mb-2">
          {market.market_type === "time" ? "Pari sur le délai" : "Pari sur la valeur"}
        </p>
        <h1 className="text-xl font-bold text-white mb-6">{market.question}</h1>

        {/* Odds visualization */}
        <div className="space-y-3">
          <div className="flex rounded-xl overflow-hidden h-12">
            <div className="bg-green-500/15 flex items-center justify-center transition-all" style={{ width: `${yesPercent}%` }}>
              <span className="text-green-400 font-bold text-sm">OUI {market.odds_yes}x</span>
            </div>
            <div className="bg-red-500/15 flex-1 flex items-center justify-center">
              <span className="text-red-400 font-bold text-sm">NON {market.odds_no}x</span>
            </div>
          </div>
          <div className="flex justify-between text-xs text-white/30">
            <span>{yesPercent}% ({market.total_yes_amount} pts)</span>
            <span>{noPercent}% ({market.total_no_amount} pts)</span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mt-6 text-center">
          <div className="rounded-xl bg-white/3 p-3">
            <p className="text-lg font-bold text-white tabular-nums">{totalPool}</p>
            <p className="text-[10px] text-white/30">Pool total (pts)</p>
          </div>
          <div className="rounded-xl bg-white/3 p-3">
            <p className="text-lg font-bold text-white tabular-nums">{bets.length}</p>
            <p className="text-[10px] text-white/30">Paris placés</p>
          </div>
          <div className="rounded-xl bg-white/3 p-3">
            <p className="text-lg font-bold text-white capitalize tabular-nums">{market.status.replace("_", " ")}</p>
            <p className="text-[10px] text-white/30">Statut</p>
          </div>
        </div>
      </div>

      {/* Bet form (client component) */}
      {market.status === "open" && (
        <BetForm marketId={id} question={market.question} oddsYes={market.odds_yes} oddsNo={market.odds_no} />
      )}

      {/* Recent bets */}
      {bets.length > 0 && (
        <div className="mt-8">
          <h3 className="text-sm font-semibold text-white/60 mb-4">Paris récents</h3>
          <div className="space-y-2">
            {bets.map((bet) => (
              <div key={bet.id} className="flex items-center justify-between p-3 rounded-xl bg-[#141720] border border-white/5 text-xs">
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-0.5 rounded font-bold ${bet.position === "yes" ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400"}`}>
                    {bet.position === "yes" ? "OUI" : "NON"}
                  </span>
                  <span className="text-white/50">{bet.user_name}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-white/30">{bet.amount} pts</span>
                  <span className="text-[#C9A84C]">{bet.odds_at_bet}x</span>
                  <span className={`font-semibold ${bet.result === "won" ? "text-green-400" : bet.result === "lost" ? "text-red-400" : "text-white/30"}`}>
                    {bet.result === "pending" ? "En attente" : bet.result === "won" ? `+${bet.payout}` : "Perdu"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8 text-center">
        <a href={`http://localhost:3000/art-core/oeuvre/${market.artwork_id}`} className="text-sm text-[#C9A84C] hover:underline">
          Voir l&apos;oeuvre sur ART-CORE
        </a>
      </div>
    </div>
  );
}
