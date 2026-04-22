"use client";

import { useState } from "react";
import { X, Coins, TrendingUp, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface GaugeDepositModalProps {
  artworkId: string;
  artworkTitle: string;
  artworkPrice: number | null;
  currentGauge: number;
  userBalance: number;
  onDeposit: (points: number) => Promise<void>;
  onClose: () => void;
}

const QUICK_AMOUNTS = [5, 10, 15, 25, 50];

export function GaugeDepositModal({
  artworkId,
  artworkTitle,
  artworkPrice,
  currentGauge,
  userBalance,
  onDeposit,
  onClose,
}: GaugeDepositModalProps) {
  const [points, setPoints] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const maxDeposit = Math.min(userBalance, 100 - currentGauge);
  const potentialCommission = artworkPrice
    ? ((points / (currentGauge + points)) * artworkPrice * 0.05).toFixed(0)
    : null;
  const bonusPoints = Math.round(points * 1.5);

  async function handleDeposit() {
    if (points < 1 || points > maxDeposit) return;
    setLoading(true);
    setError("");
    try {
      await onDeposit(points);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors du depot");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-[#111111] border border-white/10 rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/8">
          <div>
            <h3 className="font-playfair text-lg font-semibold text-white">Deposer des points</h3>
            <p className="text-xs text-white/40 mt-0.5 truncate max-w-[280px]">{artworkTitle}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 text-white/40">
            <X className="size-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Balance */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-[#C9A84C]/5 border border-[#C9A84C]/15">
            <Coins className="size-5 text-[#C9A84C]" />
            <div>
              <p className="text-xs text-white/40">Votre solde</p>
              <p className="text-lg font-bold text-[#C9A84C] tabular-nums">{userBalance} pts</p>
            </div>
          </div>

          {/* Quick amounts */}
          <div>
            <p className="text-xs text-white/40 mb-2">Montant a deposer</p>
            <div className="flex gap-2 flex-wrap">
              {QUICK_AMOUNTS.filter((a) => a <= maxDeposit).map((amount) => (
                <button
                  key={amount}
                  onClick={() => setPoints(amount)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-sm font-semibold border transition-all",
                    points === amount
                      ? "bg-[#C9A84C]/15 border-[#C9A84C]/40 text-[#C9A84C]"
                      : "border-white/10 text-white/50 hover:border-white/20"
                  )}
                >
                  {amount} pts
                </button>
              ))}
            </div>
          </div>

          {/* Slider */}
          <div>
            <input
              type="range"
              min={1}
              max={maxDeposit || 1}
              value={points}
              onChange={(e) => setPoints(Number(e.target.value))}
              className="w-full accent-[#C9A84C] h-1.5"
            />
            <div className="flex justify-between text-[10px] text-white/25 mt-1">
              <span>1 pt</span>
              <span className="font-semibold text-white/50">{points} pts</span>
              <span>{maxDeposit} pts max</span>
            </div>
          </div>

          {/* Commission preview */}
          <div className="rounded-xl border border-white/8 bg-white/2 p-4 space-y-2">
            <p className="text-xs uppercase tracking-widest text-white/25 mb-2">
              <TrendingUp className="size-3 inline mr-1" />
              Potentiel si vendu
            </p>
            {artworkPrice && potentialCommission ? (
              <>
                <div className="flex justify-between text-xs">
                  <span className="text-white/40">Commission (5% du prix)</span>
                  <span className="text-[#C9A84C] font-semibold">~{potentialCommission} EUR</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-white/40">Bonus points (1.5x)</span>
                  <span className="text-[#C9A84C] font-semibold">+{bonusPoints} pts</span>
                </div>
              </>
            ) : (
              <p className="text-xs text-white/30">Prix non defini - commission calculee a la vente</p>
            )}
          </div>

          {/* Warning */}
          <div className="flex items-start gap-2 text-[11px] text-white/30">
            <AlertTriangle className="size-3.5 shrink-0 mt-0.5 text-amber-500/60" />
            <p>L&apos;artiste peut vider la jauge a tout moment. Vos points seront alors perdus.</p>
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 rounded-lg px-3 py-2">{error}</p>
          )}

          {/* CTA */}
          <Button
            size="lg"
            className="w-full gap-2"
            disabled={loading || points < 1 || points > maxDeposit}
            onClick={handleDeposit}
          >
            {loading ? (
              <span className="animate-pulse">Depot en cours...</span>
            ) : (
              <>
                <Coins className="size-4" />
                Deposer {points} points
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
