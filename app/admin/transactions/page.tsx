"use client";

import { useState } from "react";
import { Euro, TrendingUp, Percent, FileDown, Loader2 } from "lucide-react";

type TxStatus = "completed" | "pending" | "refunded";

const statusStyle: Record<TxStatus, string> = {
  completed: "text-emerald-400",
  pending: "text-yellow-400",
  refunded: "text-[#ff6347]",
};

const statusLabel: Record<TxStatus, string> = {
  completed: "Complété",
  pending: "En attente",
  refunded: "Remboursé",
};

const mockTransactions = [
  { id: 1, date: "2026-03-22", buyer: "Sophie Laurent", artwork: "Lumière Dorée", amount: 2400, commission: 240, status: "completed" as TxStatus },
  { id: 2, date: "2026-03-21", buyer: "Lucas Petit", artwork: "Éclat Urbain", amount: 3200, commission: 320, status: "completed" as TxStatus },
  { id: 3, date: "2026-03-20", buyer: "Claire Moreau", artwork: "Vestige", amount: 5600, commission: 560, status: "pending" as TxStatus },
  { id: 4, date: "2026-03-19", buyer: "Hugo Martin", artwork: "Fragment Nocturne", amount: 1800, commission: 180, status: "completed" as TxStatus },
  { id: 5, date: "2026-03-18", buyer: "Sophie Laurent", artwork: "Murmure Bleu", amount: 1450, commission: 145, status: "refunded" as TxStatus },
  { id: 6, date: "2026-03-17", buyer: "Lucas Petit", artwork: "Horizon Abstrait", amount: 950, commission: 95, status: "completed" as TxStatus },
  { id: 7, date: "2026-03-15", buyer: "Claire Moreau", artwork: "Aube Silencieuse", amount: 2100, commission: 210, status: "completed" as TxStatus },
  { id: 8, date: "2026-03-14", buyer: "Jean-Pierre Roux", artwork: "Reflet d'Or", amount: 4800, commission: 480, status: "completed" as TxStatus },
  { id: 9, date: "2026-03-12", buyer: "Hugo Martin", artwork: "Crépuscule", amount: 1200, commission: 120, status: "pending" as TxStatus },
  { id: 10, date: "2026-03-10", buyer: "Sophie Laurent", artwork: "Sérénité", amount: 3700, commission: 370, status: "completed" as TxStatus },
];

const dateFilters = ["Cette semaine", "Ce mois", "Tout"] as const;

export default function AdminTransactions() {
  const [dateFilter, setDateFilter] = useState<string>("Tout");
  const [exporting, setExporting] = useState(false);

  const totalVentes = mockTransactions.reduce((s, t) => s + t.amount, 0);
  const totalCommission = mockTransactions.reduce((s, t) => s + t.commission, 0);
  const totalRoyalties = totalVentes - totalCommission;

  const handleExport = async () => {
    setExporting(true);
    try {
      window.open("/api/admin/export?type=transactions&format=pdf", "_blank");
    } finally {
      setTimeout(() => setExporting(false), 1500);
    }
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-playfair text-2xl md:text-3xl font-bold text-white">
          Transactions
        </h1>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#D4AF37] text-black text-sm font-medium hover:bg-[#D4AF37]/90 transition-colors disabled:opacity-50"
        >
          {exporting ? <Loader2 className="size-4 animate-spin" /> : <FileDown className="size-4" />}
          Exporter
        </button>
      </div>

      {/* Date filter */}
      <div className="flex gap-2">
        {dateFilters.map((f) => (
          <button
            key={f}
            onClick={() => setDateFilter(f)}
            className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
              dateFilter === f
                ? "bg-[#D4AF37] text-black"
                : "bg-white/[0.03] border border-white/10 text-white/60 hover:text-white"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <Euro className="size-4 text-[#D4AF37]" />
            <span className="text-xs text-white/40">Total ventes</span>
          </div>
          <p className="text-2xl font-bold text-white">{totalVentes.toLocaleString("fr-FR")} &euro;</p>
        </div>
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <Percent className="size-4 text-[#D4AF37]" />
            <span className="text-xs text-white/40">Commission plateforme (10%)</span>
          </div>
          <p className="text-2xl font-bold text-white">{totalCommission.toLocaleString("fr-FR")} &euro;</p>
        </div>
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="size-4 text-[#D4AF37]" />
            <span className="text-xs text-white/40">Royalties artistes</span>
          </div>
          <p className="text-2xl font-bold text-white">{totalRoyalties.toLocaleString("fr-FR")} &euro;</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white/[0.03] border border-white/10 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-3 px-4 text-white/40 font-medium">Date</th>
                <th className="text-left py-3 px-4 text-white/40 font-medium">Acheteur</th>
                <th className="text-left py-3 px-4 text-white/40 font-medium hidden md:table-cell">Oeuvre</th>
                <th className="text-right py-3 px-4 text-white/40 font-medium">Montant</th>
                <th className="text-right py-3 px-4 text-white/40 font-medium hidden lg:table-cell">Commission</th>
                <th className="text-right py-3 px-4 text-white/40 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {mockTransactions.map((tx) => (
                <tr
                  key={tx.id}
                  className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                >
                  <td className="py-3 px-4 text-white/50">{tx.date}</td>
                  <td className="py-3 px-4 text-white font-medium">{tx.buyer}</td>
                  <td className="py-3 px-4 text-white/50 hidden md:table-cell">{tx.artwork}</td>
                  <td className="py-3 px-4 text-right text-white font-medium">
                    {tx.amount.toLocaleString("fr-FR")} &euro;
                  </td>
                  <td className="py-3 px-4 text-right text-white/40 hidden lg:table-cell">
                    {tx.commission.toLocaleString("fr-FR")} &euro;
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className={`text-xs font-medium ${statusStyle[tx.status]}`}>
                      {statusLabel[tx.status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
