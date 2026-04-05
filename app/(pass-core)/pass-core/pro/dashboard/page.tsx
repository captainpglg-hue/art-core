"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ShieldCheck, FileText, Plus, Download, Loader2,
  AlertTriangle, Building, Hash, MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

interface MerchantData {
  merchant: {
    id: string;
    raison_sociale: string;
    siret: string;
    activite: string;
    nom_gerant: string;
    email: string;
    telephone: string;
    adresse: string;
    code_postal: string;
    ville: string;
    numero_rom_prefix: string;
    date_adhesion: string;
    abonnement: string;
    actif: boolean;
  };
  stats: {
    totalEntries: number;
    totalValue: number;
    lastEntry: {
      entry_number: number;
      acquisition_date: string;
      description: string;
      purchase_price: number;
      blockchain_hash: string;
    } | null;
    alerteTracfin: boolean;
    alerteTracfinCount: number;
  };
}

export default function ProDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<MerchantData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pdfLoading, setPdfLoading] = useState(false);

  useEffect(() => {
    fetch("/api/merchants/me")
      .then((r) => {
        if (r.status === 401) {
          router.push("/pass-core/pro/inscription");
          return null;
        }
        if (r.status === 404) {
          router.push("/pass-core/pro/inscription");
          return null;
        }
        return r.json();
      })
      .then((d) => {
        if (d) setData(d);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [router]);

  async function handleDownloadPDF() {
    if (!data) return;
    setPdfLoading(true);
    try {
      const res = await fetch(`/api/merchants/${data.merchant.id}/send-registre`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "download" }),
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `registre-police-${data.merchant.numero_rom_prefix}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        toast({ title: "PDF téléchargé" });
      } else {
        toast({ title: "Erreur", description: "Impossible de générer le PDF", variant: "destructive" });
      }
    } catch {
      toast({ title: "Erreur réseau", variant: "destructive" });
    } finally {
      setPdfLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="size-8 animate-spin text-[#C9A84C]" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <p className="text-red-400 mb-4">{error || "Profil introuvable"}</p>
        <Button asChild><Link href="/pass-core/pro/inscription">S&apos;inscrire</Link></Button>
      </div>
    );
  }

  const { merchant, stats } = data;
  const formatPrice = (v: number) =>
    new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 0 }).format(v);

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#C9A84C]/60 mb-1">Espace professionnel</p>
          <h1 className="font-playfair text-2xl font-bold text-white">{merchant.raison_sociale}</h1>
          <p className="text-white/40 text-sm mt-0.5">{merchant.activite} — {merchant.nom_gerant}</p>
        </div>
        <div className={`px-3 py-1.5 rounded-full text-xs font-bold ${merchant.actif ? "bg-green-500/15 text-green-400 border border-green-500/20" : "bg-red-500/15 text-red-400 border border-red-500/20"}`}>
          {merchant.actif ? "Actif" : "Inactif"}
        </div>
      </div>

      {/* Tracfin alert */}
      {stats.alerteTracfin && (
        <div className="rounded-xl bg-red-500/5 border border-red-500/20 p-4 mb-6 flex items-start gap-3">
          <AlertTriangle className="size-5 text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-red-400 font-bold text-sm">Alerte Tracfin</p>
            <p className="text-red-400/60 text-xs">{stats.alerteTracfinCount} transaction(s) en espèces &gt; 1 000 EUR.</p>
          </div>
        </div>
      )}

      {/* Identity card */}
      <div className="rounded-xl bg-white/[0.03] border border-[#C9A84C]/15 p-6 mb-6">
        <h2 className="text-xs uppercase tracking-wider text-[#C9A84C]/60 font-medium mb-4">Identité professionnelle</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div className="flex items-start gap-2.5">
            <Building className="size-4 text-white/20 mt-0.5 shrink-0" />
            <div>
              <p className="text-white/30 text-[10px] uppercase">Raison sociale</p>
              <p className="text-white font-medium">{merchant.raison_sociale}</p>
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <Hash className="size-4 text-white/20 mt-0.5 shrink-0" />
            <div>
              <p className="text-white/30 text-[10px] uppercase">SIRET</p>
              <p className="text-white font-mono">{merchant.siret.replace(/(\d{3})(\d{3})(\d{3})(\d{5})/, "$1 $2 $3 $4")}</p>
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <ShieldCheck className="size-4 text-[#C9A84C] mt-0.5 shrink-0" />
            <div>
              <p className="text-white/30 text-[10px] uppercase">Numéro ROM</p>
              <p className="text-[#C9A84C] font-bold font-mono">{merchant.numero_rom_prefix}</p>
            </div>
          </div>
        </div>
        <div className="mt-4 flex items-start gap-2.5 text-sm">
          <MapPin className="size-4 text-white/20 mt-0.5 shrink-0" />
          <div>
            <p className="text-white/30 text-[10px] uppercase">Adresse</p>
            <p className="text-white/70">{merchant.adresse}, {merchant.code_postal} {merchant.ville}</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="rounded-xl bg-white/[0.03] border border-white/8 p-4 text-center">
          <p className="text-[10px] uppercase tracking-wider text-white/30 mb-1">Entrées</p>
          <p className="text-xl font-bold text-[#C9A84C]">{stats.totalEntries}</p>
        </div>
        <div className="rounded-xl bg-white/[0.03] border border-white/8 p-4 text-center">
          <p className="text-[10px] uppercase tracking-wider text-white/30 mb-1">Valeur</p>
          <p className="text-xl font-bold text-[#C9A84C]">{formatPrice(stats.totalValue)}</p>
        </div>
        <div className="rounded-xl bg-white/[0.03] border border-white/8 p-4 text-center">
          <p className="text-[10px] uppercase tracking-wider text-white/30 mb-1">Conformité</p>
          <p className={`text-xl font-bold ${stats.alerteTracfin ? "text-red-400" : "text-green-400"}`}>
            {stats.alerteTracfin ? "Alerte" : "OK"}
          </p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="space-y-3">
        <Link
          href="/pass-core/certifier"
          className="flex items-center gap-3 w-full rounded-xl bg-[#C9A84C] text-[#0a0a0a] p-4 font-bold hover:bg-[#C9A84C]/90 transition"
        >
          <Plus className="size-5" />
          <span>Enregistrer une oeuvre</span>
        </Link>

        <button
          onClick={handleDownloadPDF}
          disabled={pdfLoading}
          className="flex items-center gap-3 w-full rounded-xl bg-white/[0.03] border border-[#C9A84C]/20 text-[#C9A84C] p-4 font-medium hover:bg-[#C9A84C]/5 transition disabled:opacity-50"
        >
          {pdfLoading ? <Loader2 className="size-5 animate-spin" /> : <Download className="size-5" />}
          <span>Mon cahier de police PDF</span>
        </button>

        <Link
          href="/pass-core/gallery"
          className="flex items-center gap-3 w-full rounded-xl bg-white/[0.03] border border-white/10 text-white/70 p-4 font-medium hover:bg-white/[0.05] transition"
        >
          <FileText className="size-5" />
          <span>Mes oeuvres certifiées</span>
        </Link>
      </div>
    </div>
  );
}
