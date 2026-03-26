"use client";

import { useState } from "react";
import {
  Wallet,
  ArrowUp,
  ArrowDown,
  TrendingUp,
  Clock,
  CreditCard,
  Send,
  Download,
} from "lucide-react";

const mockTransactions = [
  { id: 1, date: "2026-03-22", type: "royalty", label: "Royalty — Léa Fontaine", amount: 45, status: "completé" },
  { id: 2, date: "2026-03-21", type: "pari", label: "Pari gagné — Nadia Kowalski", amount: 90, status: "completé" },
  { id: 3, date: "2026-03-20", type: "commission", label: "Commission réseau", amount: 15, status: "completé" },
  { id: 4, date: "2026-03-19", type: "pari", label: "Pari — Marco Bellucci", amount: -25, status: "completé" },
  { id: 5, date: "2026-03-18", type: "royalty", label: "Royalty — Fatima El Amri", amount: 32, status: "completé" },
  { id: 6, date: "2026-03-17", type: "retrait", label: "Retrait vers IBAN", amount: -200, status: "completé" },
  { id: 7, date: "2026-03-15", type: "pari", label: "Pari — Clara Dubois", amount: -10, status: "completé" },
  { id: 8, date: "2026-03-14", type: "royalty", label: "Royalty — Omar Diallo", amount: 28, status: "completé" },
  { id: 9, date: "2026-03-12", type: "commission", label: "Commission réseau", amount: 22, status: "completé" },
  { id: 10, date: "2026-03-10", type: "pari", label: "Pari gagné — Yuki Tanaka", amount: 55, status: "completé" },
  { id: 11, date: "2026-03-08", type: "retrait", label: "Retrait vers IBAN", amount: -150, status: "en_attente" },
  { id: 12, date: "2026-03-05", type: "royalty", label: "Royalty — Léa Fontaine", amount: 38, status: "completé" },
];

const typeColors: Record<string, string> = {
  royalty: "text-[#2ecc71] bg-[#2ecc71]/10",
  pari: "text-[#D4AF37] bg-[#D4AF37]/10",
  commission: "text-blue-400 bg-blue-400/10",
  retrait: "text-red-400 bg-red-400/10",
};

const typeLabels: Record<string, string> = {
  royalty: "Royalty",
  pari: "Pari",
  commission: "Commission",
  retrait: "Retrait",
};

export default function WalletPrimePage() {
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [iban, setIban] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");

  const solde = 1245;
  const revenusMois = 237;
  const revenusTotal = 3570;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-fade-in">
      <h1 className="font-playfair text-3xl font-semibold text-white mb-8">Portefeuille</h1>

      {/* Balance Card */}
      <div className="rounded-2xl bg-gradient-to-br from-[#1a1d24] to-[#12141a] border border-[#2ecc71]/10 p-6 mb-8">
        <p className="text-xs uppercase tracking-widest text-white/30 mb-2">Solde disponible</p>
        <div className="flex items-baseline gap-3 mb-4">
          <Wallet className="size-8 text-[#2ecc71]" />
          <span className="font-playfair text-4xl font-bold text-[#2ecc71] tabular-nums">
            {solde.toLocaleString("fr-FR")} €
          </span>
        </div>
        <div className="flex flex-wrap gap-6 text-sm text-white/40">
          <span className="flex items-center gap-1.5">
            <TrendingUp className="size-4 text-[#2ecc71]" />
            Revenus ce mois : <span className="text-white/70 font-medium tabular-nums">{revenusMois} €</span>
          </span>
          <span className="flex items-center gap-1.5">
            <TrendingUp className="size-4 text-[#D4AF37]" />
            Revenus total : <span className="text-white/70 font-medium tabular-nums">{revenusTotal.toLocaleString("fr-FR")} €</span>
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 mb-8">
        <button
          onClick={() => setShowWithdraw(!showWithdraw)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2ecc71] text-white text-sm font-medium hover:bg-[#27ae60] transition-colors"
        >
          <Send className="size-4" />
          Retirer
        </button>
        <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white/70 text-sm font-medium hover:bg-white/[0.08] transition-colors">
          <Download className="size-4" />
          Recharger
        </button>
      </div>

      {/* Withdrawal Form */}
      {showWithdraw && (
        <div className="rounded-2xl bg-white/[0.03] border border-white/[0.08] p-6 mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">Demande de retrait</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-white/40 mb-1.5">IBAN</label>
              <input
                type="text"
                value={iban}
                onChange={(e) => setIban(e.target.value)}
                placeholder="FR76 1234 5678 9012 3456 7890 123"
                className="w-full px-4 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-[#2ecc71]/40"
              />
            </div>
            <div>
              <label className="block text-xs text-white/40 mb-1.5">Montant (€)</label>
              <input
                type="number"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="100"
                min={10}
                max={solde}
                className="w-full px-4 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-[#2ecc71]/40"
              />
            </div>
            <button className="px-6 py-2.5 rounded-xl bg-[#2ecc71] text-white text-sm font-semibold hover:bg-[#27ae60] transition-colors">
              Confirmer le retrait
            </button>
          </div>
        </div>
      )}

      {/* Transaction History */}
      <h2 className="text-lg font-semibold text-white mb-4">Historique des transactions</h2>
      <div className="space-y-1">
        {mockTransactions.map((t) => (
          <div key={t.id} className="flex items-center justify-between py-3 border-b border-white/[0.04]">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${t.amount > 0 ? "bg-[#2ecc71]/10" : "bg-red-400/10"}`}>
                {t.amount > 0 ? <ArrowUp className="size-4 text-[#2ecc71]" /> : <ArrowDown className="size-4 text-red-400" />}
              </div>
              <div>
                <p className="text-sm text-white/70">{t.label}</p>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${typeColors[t.type]}`}>
                    {typeLabels[t.type]}
                  </span>
                  <span className="text-[10px] text-white/20 flex items-center gap-1">
                    <Clock className="size-2.5" />
                    {new Date(t.date).toLocaleDateString("fr-FR")}
                  </span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <span className={`font-semibold text-sm tabular-nums ${t.amount > 0 ? "text-[#2ecc71]" : "text-red-400"}`}>
                {t.amount > 0 ? "+" : ""}{t.amount} €
              </span>
              {t.status === "en_attente" && (
                <p className="text-[10px] text-[#D4AF37]">En attente</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
