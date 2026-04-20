"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Download, Check, RefreshCw, FileText, AlertCircle } from "lucide-react";

interface PendingFiche {
  entry_id: string;
  entry_number: number | null;
  created_at: string | null;
  recipient_email: string | null;
  merchant_name: string | null;
  merchant_rom: string | null;
  artwork_title: string | null;
  artwork_category: string | null;
  purchase_price: number | null;
  pdf_size_bytes: number;
  download_url: string | null;
}

export default function FichesPendingPage() {
  const [fiches, setFiches] = useState<PendingFiche[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [markingId, setMarkingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/admin/fiches-pending", { credentials: "include" });
      const j = await r.json();
      if (!r.ok) {
        setError(j.error || `Erreur ${r.status}`);
        setFiches([]);
      } else {
        setFiches(j.fiches || []);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function markSent(entryId: string) {
    setMarkingId(entryId);
    try {
      const r = await fetch(`/api/admin/fiches-pending/${entryId}/sent`, {
        method: "POST",
        credentials: "include",
      });
      if (r.ok) {
        setFiches((prev) => prev.filter((f) => f.entry_id !== entryId));
      } else {
        const j = await r.json().catch(() => ({}));
        alert(`Erreur : ${j.error || r.status}`);
      }
    } catch (e: any) {
      alert(`Erreur : ${e.message}`);
    } finally {
      setMarkingId(null);
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-playfair text-3xl font-semibold text-white mb-1">Fiches de police — en attente</h1>
          <p className="text-white/40 text-sm">
            PDFs générés automatiquement mais dont l&apos;envoi email a échoué. À envoyer manuellement puis marquer comme envoyés.
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-sm transition-colors"
          disabled={loading}
        >
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          Rafraîchir
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-3">
          <AlertCircle className="size-5 text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-red-300 text-sm font-medium">Erreur de chargement</p>
            <p className="text-red-400/70 text-xs mt-1">{error}</p>
            {error.includes("admin") && (
              <p className="text-red-400/50 text-xs mt-2">
                Cette page n&apos;est accessible qu&apos;aux utilisateurs avec le rôle <code className="px-1 py-0.5 bg-black/30 rounded">admin</code>.
              </p>
            )}
          </div>
        </div>
      )}

      {loading && !error ? (
        <div className="text-center py-20 text-white/30">Chargement…</div>
      ) : fiches.length === 0 && !error ? (
        <div className="text-center py-24 rounded-2xl bg-white/[0.02] border border-white/5">
          <FileText className="size-12 text-white/10 mx-auto mb-4" />
          <p className="text-white/50 font-medium mb-1">Aucune fiche en attente</p>
          <p className="text-white/25 text-sm">
            Quand une fiche de police est générée et qu&apos;aucun email n&apos;a pu partir, elle apparaîtra ici.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {fiches.map((f) => (
            <div key={f.entry_id} className="rounded-2xl bg-white/[0.03] border border-white/10 p-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-[#D4AF37] font-mono text-sm font-bold">N° {f.entry_number ?? "—"}</span>
                    {f.merchant_rom && (
                      <span className="text-white/40 text-xs font-mono px-2 py-0.5 bg-white/5 rounded">{f.merchant_rom}</span>
                    )}
                    {f.created_at && (
                      <span className="text-white/30 text-xs">
                        {new Date(f.created_at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
                      </span>
                    )}
                  </div>
                  <p className="text-white font-semibold text-base mb-1 truncate">{f.artwork_title || "(titre manquant)"}</p>
                  <p className="text-white/50 text-sm mb-2">
                    Marchand : <span className="text-white/70">{f.merchant_name || "—"}</span>
                    {f.artwork_category && <span className="text-white/30"> · {f.artwork_category}</span>}
                    {f.purchase_price != null && (
                      <span className="text-[#D4AF37] ml-2">
                        {new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(Number(f.purchase_price))}
                      </span>
                    )}
                  </p>
                  <p className="text-white/40 text-xs">
                    À envoyer à : <span className="text-white/60 font-mono">{f.recipient_email || "(email manquant)"}</span>
                    <span className="text-white/20 ml-3">PDF {(f.pdf_size_bytes / 1024).toFixed(0)} kB</span>
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {f.download_url && (
                    <a
                      href={f.download_url}
                      download={`fiche-police-${f.entry_number || f.entry_id}.pdf`}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/30 text-[#D4AF37] text-sm font-medium hover:bg-[#D4AF37]/20 transition-colors"
                    >
                      <Download className="size-4" />
                      Télécharger PDF
                    </a>
                  )}
                  <button
                    onClick={() => markSent(f.entry_id)}
                    disabled={markingId === f.entry_id}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500/15 border border-green-500/30 text-green-300 text-sm font-medium hover:bg-green-500/25 transition-colors disabled:opacity-50"
                  >
                    <Check className="size-4" />
                    {markingId === f.entry_id ? "…" : "Marquer envoyée"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-10 p-5 rounded-2xl bg-white/[0.02] border border-white/5">
        <p className="text-white/50 text-sm mb-2">Procédure recommandée :</p>
        <ol className="text-white/40 text-xs space-y-1.5 list-decimal list-inside">
          <li>Télécharge le PDF de la fiche concernée</li>
          <li>Envoie-le par email au destinataire listé ci-dessus (Cc : captainpglg@gmail.com)</li>
          <li>Clique &laquo; Marquer envoyée &raquo; pour archiver la fiche dans le dossier <code className="px-1 bg-black/30 rounded">sent/</code></li>
        </ol>
        <p className="text-white/30 text-xs mt-3">
          <Link href="/art-core/admin" className="text-[#D4AF37]/70 hover:text-[#D4AF37]">← Retour au dashboard admin</Link>
        </p>
      </div>
    </div>
  );
}
