"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ShieldCheck, Share2, Printer, ArrowLeft, Loader2, Clock,
  User, Hash, Fingerprint, Calendar, QrCode, ExternalLink,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Certificate {
  id: string;
  title: string;
  artist: string;
  technique: string;
  dimensions: string;
  year: string;
  description: string;
  image_url: string;
  sha256: string;
  phash: string;
  status: string;
  created_at: string;
  certified_at?: string;
  ownership_history?: { owner: string; date: string; action: string }[];
}

export default function CertificateDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [cert, setCert] = useState<Certificate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchCertificate() {
      try {
        const res = await fetch(`/api/certification?id=${params.id}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Certificat introuvable");
        setCert(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    if (params.id) fetchCertificate();
  }, [params.id]);

  async function handleShare() {
    const url = `${window.location.origin}/pass-core/certificate/${params.id}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: `Certificat — ${cert?.title}`, url });
      } catch {}
    } else {
      await navigator.clipboard.writeText(url);
      toast({ title: "Lien copie", description: "Le lien du certificat a ete copie dans le presse-papier." });
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="size-8 text-[#D4AF37] animate-spin" />
      </div>
    );
  }

  if (error || !cert) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12 text-center animate-fade-in">
        <ShieldCheck className="size-12 text-white/20 mx-auto mb-4" />
        <h1 className="font-playfair text-xl text-white mb-2">Certificat introuvable</h1>
        <p className="text-white/40 text-sm mb-6">{error || "Ce certificat n'existe pas ou a ete supprime."}</p>
        <button onClick={() => router.push("/pass-core/verifier")}
          className="px-6 py-3 rounded-xl bg-[#D4AF37] text-[#0A1128] font-semibold text-sm">
          Verifier un certificat
        </button>
      </div>
    );
  }

  const isCertified = cert.status === "certified";

  return (
    <div className="max-w-lg mx-auto px-4 py-6 pb-24 animate-fade-in">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-white/50 text-sm active:text-white/70">
          <ArrowLeft className="size-4" /> Retour
        </button>
        <div className="flex items-center gap-2">
          <button onClick={handleShare} className="p-2.5 rounded-xl bg-white/5 border border-white/10 active:bg-white/10">
            <Share2 className="size-4 text-white/60" />
          </button>
          <button onClick={() => router.push(`/pass-core/certificate/${params.id}/print`)}
            className="p-2.5 rounded-xl bg-white/5 border border-white/10 active:bg-white/10">
            <Printer className="size-4 text-white/60" />
          </button>
        </div>
      </div>

      {/* Status badge */}
      <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium mb-4 ${
        isCertified ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
      }`}>
        <ShieldCheck className="size-3.5" />
        {isCertified ? "Certifie" : "En attente de verification"}
      </div>

      {/* Artwork image */}
      {cert.image_url && (
        <div className="rounded-2xl overflow-hidden border border-white/10 mb-6">
          <img src={cert.image_url} alt={cert.title} className="w-full aspect-[4/3] object-cover" />
        </div>
      )}

      {/* Title & Artist */}
      <h1 className="font-playfair text-2xl font-semibold text-white mb-1">{cert.title}</h1>
      <p className="text-white/50 text-sm mb-6">par {cert.artist}</p>

      {/* Info grid */}
      <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4 space-y-3 mb-6">
        <div className="flex items-center gap-3">
          <Calendar className="size-4 text-[#D4AF37] shrink-0" />
          <div className="flex-1 flex justify-between text-sm">
            <span className="text-white/30">Date de certification</span>
            <span className="text-white/70">{cert.certified_at ? new Date(cert.certified_at).toLocaleDateString("fr-FR") : "En attente"}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <User className="size-4 text-[#D4AF37] shrink-0" />
          <div className="flex-1 flex justify-between text-sm">
            <span className="text-white/30">Artiste</span>
            <span className="text-white/70">{cert.artist}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Clock className="size-4 text-[#D4AF37] shrink-0" />
          <div className="flex-1 flex justify-between text-sm">
            <span className="text-white/30">Technique</span>
            <span className="text-white/70">{cert.technique}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ExternalLink className="size-4 text-[#D4AF37] shrink-0" />
          <div className="flex-1 flex justify-between text-sm">
            <span className="text-white/30">Dimensions</span>
            <span className="text-white/70">{cert.dimensions}</span>
          </div>
        </div>
      </div>

      {/* Hash section */}
      <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4 space-y-3 mb-6">
        <h3 className="text-xs text-[#D4AF37] font-semibold uppercase tracking-wider mb-2">Empreintes numeriques</h3>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Hash className="size-3.5 text-white/30" />
            <span className="text-[11px] text-white/30 uppercase tracking-wider">SHA-256</span>
          </div>
          <p className="text-white/50 text-[11px] font-mono break-all bg-white/[0.03] rounded-lg px-3 py-2">{cert.sha256}</p>
        </div>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Fingerprint className="size-3.5 text-white/30" />
            <span className="text-[11px] text-white/30 uppercase tracking-wider">pHash</span>
          </div>
          <p className="text-white/50 text-[11px] font-mono break-all bg-white/[0.03] rounded-lg px-3 py-2">{cert.phash}</p>
        </div>
      </div>

      {/* QR Code placeholder */}
      <div className="rounded-xl border border-white/8 bg-white/[0.02] p-6 flex flex-col items-center mb-6">
        <div className="w-32 h-32 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-3">
          <QrCode className="size-12 text-white/20" />
        </div>
        <p className="text-white/30 text-xs">QR Code du certificat</p>
        <p className="text-white/15 text-[10px]">Scannez pour verifier l&apos;authenticite</p>
      </div>

      {/* Ownership history */}
      {cert.ownership_history && cert.ownership_history.length > 0 && (
        <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4 mb-6">
          <h3 className="text-xs text-[#D4AF37] font-semibold uppercase tracking-wider mb-4">Historique de propriete</h3>
          <div className="relative pl-6">
            <div className="absolute left-2 top-1 bottom-1 w-px bg-white/10" />
            {cert.ownership_history.map((entry, i) => (
              <div key={i} className="relative mb-4 last:mb-0">
                <div className={`absolute -left-[18px] top-1 w-3 h-3 rounded-full border-2 ${
                  i === 0 ? "bg-[#D4AF37] border-[#D4AF37]" : "bg-[#0A1128] border-white/20"
                }`} />
                <p className="text-sm text-white/70 font-medium">{entry.action}</p>
                <p className="text-xs text-white/30">{entry.owner} — {entry.date}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Description */}
      {cert.description && (
        <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4 mb-6">
          <h3 className="text-xs text-[#D4AF37] font-semibold uppercase tracking-wider mb-2">Description</h3>
          <p className="text-white/50 text-sm leading-relaxed">{cert.description}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button onClick={handleShare}
          className="flex-1 py-4 rounded-xl border border-[#D4AF37]/30 text-[#D4AF37] font-medium flex items-center justify-center gap-2 active:bg-[#D4AF37]/5">
          <Share2 className="size-4" /> Partager
        </button>
        <button onClick={() => router.push(`/pass-core/certificate/${params.id}/print`)}
          className="flex-1 py-4 rounded-xl bg-[#D4AF37] text-[#0A1128] font-semibold flex items-center justify-center gap-2 active:brightness-90">
          <Printer className="size-4" /> Imprimer
        </button>
      </div>
    </div>
  );
}
