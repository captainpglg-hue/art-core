"use client";

import { useState } from "react";
import { FileText, FileSpreadsheet, Download, Loader2, Users, Image, Receipt, ShieldCheck } from "lucide-react";

interface ExportCard {
  key: string;
  title: string;
  description: string;
  icon: React.FC<{ className?: string }>;
  lastExport: string;
}

const exportCards: ExportCard[] = [
  {
    key: "users",
    title: "Utilisateurs",
    description: "Export complet des utilisateurs avec rôles, dates d'inscription et statuts.",
    icon: Users,
    lastExport: "2026-03-20",
  },
  {
    key: "artworks",
    title: "Oeuvres",
    description: "Catalogue des oeuvres avec artistes, prix, statuts de certification.",
    icon: Image,
    lastExport: "2026-03-19",
  },
  {
    key: "transactions",
    title: "Transactions",
    description: "Historique des ventes avec montants, commissions et statuts de paiement.",
    icon: Receipt,
    lastExport: "2026-03-21",
  },
  {
    key: "certificates",
    title: "Certificats",
    description: "Registre des certifications SHA-256 et pHash avec dates et propriétaires.",
    icon: ShieldCheck,
    lastExport: "2026-03-18",
  },
];

export default function AdminExport() {
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const handleExport = async (type: string, format: "pdf" | "csv") => {
    const key = `${type}-${format}`;
    setLoading((prev) => ({ ...prev, [key]: true }));
    try {
      window.open(`/api/admin/export?type=${type}&format=${format}`, "_blank");
    } finally {
      // Simulate download time
      setTimeout(() => {
        setLoading((prev) => ({ ...prev, [key]: false }));
      }, 2000);
    }
  };

  return (
    <div className="animate-fade-in space-y-8">
      <h1 className="font-playfair text-2xl md:text-3xl font-bold text-white">
        Export de données
      </h1>

      <div className="grid sm:grid-cols-2 gap-6">
        {exportCards.map((card) => {
          const Icon = card.icon;
          const pdfLoading = loading[`${card.key}-pdf`];
          const csvLoading = loading[`${card.key}-csv`];

          return (
            <div
              key={card.key}
              className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 space-y-4"
            >
              <div className="flex items-start gap-3">
                <div className="size-10 rounded-xl bg-[#D4AF37]/10 flex items-center justify-center shrink-0">
                  <Icon className="size-5 text-[#D4AF37]" />
                </div>
                <div>
                  <h3 className="text-white font-semibold">{card.title}</h3>
                  <p className="text-xs text-white/40 mt-1 leading-relaxed">
                    {card.description}
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => handleExport(card.key, "pdf")}
                  disabled={!!pdfLoading}
                  className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#ff6347]/10 text-[#ff6347] text-sm font-medium hover:bg-[#ff6347]/20 transition-colors disabled:opacity-50"
                >
                  {pdfLoading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <FileText className="size-4" />
                  )}
                  Exporter PDF
                </button>
                <button
                  onClick={() => handleExport(card.key, "csv")}
                  disabled={!!csvLoading}
                  className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 text-sm font-medium hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
                >
                  {csvLoading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <FileSpreadsheet className="size-4" />
                  )}
                  Exporter CSV
                </button>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-white/25">
                <Download className="size-3" />
                Dernier export : {card.lastExport}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
