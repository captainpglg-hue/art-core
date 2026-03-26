"use client";

import { useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  Clock,
  Zap,
  X,
  Check,
  AlertCircle,
  Wallet,
} from "lucide-react";

const markets = [
  { id: 1, artist: "Léa Fontaine", odds: 2.4, pool: 1250, timeLeft: "2j 14h", trend: "up" as const },
  { id: 2, artist: "Marco Bellucci", odds: 3.1, pool: 680, timeLeft: "5j 8h", trend: "down" as const },
  { id: 3, artist: "Nadia Kowalski", odds: 1.8, pool: 2100, timeLeft: "1j 3h", trend: "up" as const },
  { id: 4, artist: "Clara Dubois", odds: 2.7, pool: 920, timeLeft: "3j 22h", trend: "up" as const },
  { id: 5, artist: "Andrei Petrov", odds: 4.2, pool: 340, timeLeft: "6j 1h", trend: "down" as const },
  { id: 6, artist: "Fatima El Amri", odds: 1.5, pool: 3400, timeLeft: "12h 30m", trend: "up" as const },
];

const myBets = [
  { id: 1, artist: "Léa Fontaine", amount: 25, direction: "hausse", odds: 2.4, status: "en_cours" as const },
  { id: 2, artist: "Yuki Tanaka", amount: 10, direction: "baisse", odds: 1.9, status: "gagne" as const },
  { id: 3, artist: "Omar Diallo", amount: 50, direction: "hausse", odds: 3.0, status: "perdu" as const },
  { id: 4, artist: "Nadia Kowalski", amount: 25, direction: "hausse", odds: 1.8, status: "en_cours" as const },
];

type Tab = "marches" | "mes_paris";

export default function ParisPage() {
  const [tab, setTab] = useState<Tab>("marches");
  const [betModal, setBetModal] = useState<typeof markets[0] | null>(null);
  const [betAmount, setBetAmount] = useState(10);
  const [betDirection, setBetDirection] = useState<"hausse" | "baisse">("hausse");
  const [betPlaced, setBetPlaced] = useState(false);

  const balance = 245;

  const handlePlaceBet = () => {
    setBetPlaced(true);
    setTimeout(() => {
      setBetPlaced(false);
      setBetModal(null);
    }, 1500);
  };

  const statusMap = {
    en_cours: { label: "En cours", color: "text-[#D4AF37] bg-[#D4AF37]/10" },
    gagne: { label: "Gagné", color: "text-[#2ecc71] bg-[#2ecc71]/10" },
    perdu: { label: "Perdu", color: "text-red-400 bg-red-400/10" },
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="font-playfair text-3xl font-semibold text-white">Paris prédictifs</h1>
          <p className="text-white/40 text-sm mt-1">Pariez sur l&apos;évolution de la cote des artistes</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08]">
          <Wallet className="size-4 text-[#D4AF37]" />
          <span className="text-sm font-semibold text-white tabular-nums">{balance} €</span>
          <span className="text-xs text-white/30">solde</span>
        </div>
      </div>

      {/* Comment ça marche */}
      <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-5 mb-8">
        <h2 className="text-white font-semibold text-sm mb-4">Comment ça marche</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { num: "1", text: "Choisissez un artiste dont vous pensez que la cote va monter" },
            { num: "2", text: "Placez votre mise (minimum 5 €)" },
            { num: "3", text: "La cote multiplie votre mise si vous avez raison" },
            { num: "4", text: "Le résultat est calculé à l\u2019expiration du marché" },
          ].map(s => (
            <div key={s.num} className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-[#2ecc71]/10 border border-[#2ecc71]/20 flex items-center justify-center shrink-0">
                <span className="text-[#2ecc71] font-bold text-xs">{s.num}</span>
              </div>
              <p className="text-white/40 text-xs leading-relaxed">{s.text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {([
          { key: "marches" as Tab, label: "Marchés actifs" },
          { key: "mes_paris" as Tab, label: "Mes paris" },
        ]).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              tab === t.key
                ? "bg-[#2ecc71]/20 text-[#2ecc71] border border-[#2ecc71]/30"
                : "bg-white/[0.05] text-white/40 border border-white/[0.08] hover:text-white/60"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Markets */}
      {tab === "marches" && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {markets.map((market) => (
            <div
              key={market.id}
              className="rounded-2xl bg-white/[0.03] border border-white/[0.08] p-5"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-white">{market.artist}</h3>
                {market.trend === "up" ? (
                  <TrendingUp className="size-4 text-[#2ecc71]" />
                ) : (
                  <TrendingDown className="size-4 text-red-400" />
                )}
              </div>
              <div className="space-y-2 text-xs mb-4">
                <div className="flex justify-between">
                  <span className="text-white/30">Cote actuelle</span>
                  <span className="text-[#D4AF37] font-semibold tabular-nums">x{market.odds}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/30">Pool total</span>
                  <span className="text-white/70 tabular-nums">{market.pool} €</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/30">Temps restant</span>
                  <span className="flex items-center gap-1 text-white/50">
                    <Clock className="size-3" />
                    {market.timeLeft}
                  </span>
                </div>
              </div>
              <button
                onClick={() => {
                  setBetModal(market);
                  setBetAmount(10);
                  setBetDirection("hausse");
                }}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#2ecc71] text-white text-xs font-semibold hover:bg-[#27ae60] transition-colors"
              >
                <Zap className="size-3.5" />
                Parier
              </button>
            </div>
          ))}
        </div>
      )}

      {/* My Bets */}
      {tab === "mes_paris" && (
        <div className="space-y-2">
          {myBets.map((bet) => {
            const s = statusMap[bet.status];
            return (
              <div
                key={bet.id}
                className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-white/[0.08]"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${bet.direction === "hausse" ? "bg-[#2ecc71]/10" : "bg-red-400/10"}`}>
                    {bet.direction === "hausse" ? (
                      <TrendingUp className="size-4 text-[#2ecc71]" />
                    ) : (
                      <TrendingDown className="size-4 text-red-400" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{bet.artist}</p>
                    <p className="text-[11px] text-white/30">
                      {bet.direction === "hausse" ? "Hausse" : "Baisse"} — Cote x{bet.odds}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-white tabular-nums">{bet.amount} €</p>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${s.color}`}>
                    {s.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Bet Modal */}
      {betModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#0D0F14] border border-white/[0.08] p-6">
            {betPlaced ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full bg-[#2ecc71]/20 flex items-center justify-center mx-auto mb-4">
                  <Check className="size-8 text-[#2ecc71]" />
                </div>
                <p className="text-lg font-semibold text-white">Pari placé !</p>
                <p className="text-sm text-white/40 mt-1">Bonne chance</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-white">Placer un pari</h3>
                  <button onClick={() => setBetModal(null)} className="text-white/30 hover:text-white/60">
                    <X className="size-5" />
                  </button>
                </div>

                <div className="mb-4">
                  <p className="text-sm text-white/40 mb-1">Artiste</p>
                  <p className="text-white font-medium">{betModal.artist}</p>
                  <p className="text-xs text-[#D4AF37] mt-1">Cote actuelle : x{betModal.odds}</p>
                </div>

                {/* Direction */}
                <div className="mb-4">
                  <p className="text-sm text-white/40 mb-2">Prédiction</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setBetDirection("hausse")}
                      className={`py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-1.5 transition-colors ${
                        betDirection === "hausse"
                          ? "bg-[#2ecc71]/20 text-[#2ecc71] border border-[#2ecc71]/30"
                          : "bg-white/[0.05] text-white/40 border border-white/[0.08]"
                      }`}
                    >
                      <TrendingUp className="size-4" /> Hausse
                    </button>
                    <button
                      onClick={() => setBetDirection("baisse")}
                      className={`py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-1.5 transition-colors ${
                        betDirection === "baisse"
                          ? "bg-red-400/20 text-red-400 border border-red-400/30"
                          : "bg-white/[0.05] text-white/40 border border-white/[0.08]"
                      }`}
                    >
                      <TrendingDown className="size-4" /> Baisse
                    </button>
                  </div>
                </div>

                {/* Amount */}
                <div className="mb-4">
                  <p className="text-sm text-white/40 mb-2">Montant</p>
                  <div className="flex gap-2 mb-2">
                    {[5, 10, 25].map((a) => (
                      <button
                        key={a}
                        onClick={() => setBetAmount(a)}
                        className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
                          betAmount === a
                            ? "bg-[#2ecc71]/20 text-[#2ecc71] border border-[#2ecc71]/30"
                            : "bg-white/[0.05] text-white/40 border border-white/[0.08]"
                        }`}
                      >
                        {a} €
                      </button>
                    ))}
                  </div>
                  <input
                    type="number"
                    value={betAmount}
                    onChange={(e) => setBetAmount(Number(e.target.value))}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-[#2ecc71]/40"
                    placeholder="Montant personnalisé"
                    min={1}
                  />
                </div>

                {/* Summary */}
                <div className="rounded-xl bg-white/[0.03] border border-white/[0.08] p-3 mb-6">
                  <div className="flex justify-between text-xs text-white/40 mb-1">
                    <span>Gain potentiel</span>
                    <span className="text-[#2ecc71] font-semibold tabular-nums">
                      {(betAmount * betModal.odds).toFixed(0)} €
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-white/40">
                    <span>Solde après pari</span>
                    <span className="text-white/60 tabular-nums">{balance - betAmount} €</span>
                  </div>
                </div>

                {betAmount > balance && (
                  <div className="flex items-center gap-2 text-xs text-red-400 mb-4">
                    <AlertCircle className="size-3.5" />
                    Solde insuffisant
                  </div>
                )}

                <button
                  onClick={handlePlaceBet}
                  disabled={betAmount > balance || betAmount <= 0}
                  className="w-full py-3 rounded-xl bg-[#2ecc71] text-white font-semibold text-sm hover:bg-[#27ae60] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Confirmer le pari — {betAmount} €
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
