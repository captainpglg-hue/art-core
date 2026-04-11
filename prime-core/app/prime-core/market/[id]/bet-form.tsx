"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

interface Props {
  marketId: string;
  question: string;
  oddsYes: number;
  oddsNo: number;
}

export function BetForm({ marketId, question, oddsYes, oddsNo }: Props) {
  const router = useRouter();
  const [position, setPosition] = useState<"yes" | "no" | null>(null);
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  async function handleBet() {
    if (!position || !amount) return;
    setLoading(true);
    try {
      const res = await fetch("/api/bet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ market_id: marketId, position, amount: parseFloat(amount) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data);
      router.refresh();
    } catch (err: any) {
      alert(err.message);
    } finally { setLoading(false); }
  }

  if (result) {
    return (
      <div className="rounded-2xl bg-green-500/5 border border-green-500/20 p-6 text-center">
        <p className="text-lg font-bold text-white mb-2">Pari placé !</p>
        <p className="text-sm text-white/40">
          {position === "yes" ? "OUI" : "NON"} — {amount} pts à {result.odds}x
        </p>
        <p className="text-green-400 font-bold mt-2">Gain potentiel: {result.potentialPayout} pts</p>
        <button onClick={() => { setResult(null); setPosition(null); setAmount(""); }} className="mt-4 text-sm text-[#C9A84C] hover:underline">
          Placer un autre pari
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-[#141720] border border-white/8 p-6">
      <h3 className="text-sm font-semibold text-white mb-4">Placer un pari</h3>

      {/* Position selection */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <button
          onClick={() => setPosition("yes")}
          className={`p-4 rounded-xl border-2 transition-all ${
            position === "yes"
              ? "border-green-500 bg-green-500/10"
              : "border-white/10 hover:border-green-500/30"
          }`}
        >
          <p className="text-lg font-bold text-green-400">OUI</p>
          <p className="text-xs text-white/30">Cote: {oddsYes}x</p>
        </button>
        <button
          onClick={() => setPosition("no")}
          className={`p-4 rounded-xl border-2 transition-all ${
            position === "no"
              ? "border-red-500 bg-red-500/10"
              : "border-white/10 hover:border-red-500/30"
          }`}
        >
          <p className="text-lg font-bold text-red-400">NON</p>
          <p className="text-xs text-white/30">Cote: {oddsNo}x</p>
        </button>
      </div>

      {/* Amount */}
      <div className="mb-4">
        <label className="text-xs text-white/40 mb-1.5 block">Montant (points)</label>
        <input
          type="number"
          min="1"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="10"
          className="w-full h-10 rounded-xl bg-white/5 border border-white/10 text-sm text-white px-3 focus:outline-none focus:border-[#C9A84C]/40"
        />
        {position && amount && (
          <p className="text-xs text-[#C9A84C] mt-2">
            Gain potentiel: {(parseFloat(amount) * (position === "yes" ? oddsYes : oddsNo)).toFixed(2)} pts
          </p>
        )}
      </div>

      <div className="flex gap-3 text-xs text-white/30 mb-4">
        {[5, 10, 25, 50].map(v => (
          <button key={v} onClick={() => setAmount(String(v))} className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">{v} pts</button>
        ))}
      </div>

      <button
        onClick={handleBet}
        disabled={!position || !amount || loading}
        className="w-full py-3 rounded-xl bg-[#C9A84C] text-[#0D0F14] font-semibold disabled:opacity-30 hover:bg-[#C9A84C]/80 transition-colors flex items-center justify-center gap-2"
      >
        {loading ? <Loader2 className="size-4 animate-spin" /> : null}
        Parier
      </button>

      <p className="text-[10px] text-white/20 text-center mt-3">
        Le pari sera résolu quand l&apos;oeuvre sera vendue sur ART-CORE.
      </p>
    </div>
  );
}
