"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";

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
}

export default function CertificatePrintPage() {
  const params = useParams();
  const [cert, setCert] = useState<Certificate | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCertificate() {
      try {
        const res = await fetch(`/api/certification?id=${params.id}`);
        const data = await res.json();
        if (res.ok) setCert(data);
      } catch {}
      finally { setLoading(false); }
    }
    if (params.id) fetchCertificate();
  }, [params.id]);

  useEffect(() => {
    if (cert && !loading) {
      const timer = setTimeout(() => window.print(), 500);
      return () => clearTimeout(timer);
    }
  }, [cert, loading]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0A1128]">
        <Loader2 className="size-8 text-[#D4AF37] animate-spin" />
      </div>
    );
  }

  if (!cert) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0A1128]">
        <p className="text-white/50">Certificat introuvable</p>
      </div>
    );
  }

  const certDate = cert.certified_at ? new Date(cert.certified_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "En attente";

  return (
    <>
      <style jsx global>{`
        @media print {
          body { background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
          .print-page { background: white !important; color: black !important; padding: 0 !important; }
        }
        @media screen {
          .print-page { max-width: 800px; margin: 0 auto; }
        }
      `}</style>

      {/* Screen-only back button */}
      <div className="no-print bg-[#0A1128] p-4 text-center">
        <button onClick={() => window.history.back()}
          className="px-6 py-2 rounded-xl border border-white/10 text-white/50 text-sm mr-3">
          Retour
        </button>
        <button onClick={() => window.print()}
          className="px-6 py-2 rounded-xl bg-[#D4AF37] text-[#0A1128] font-semibold text-sm">
          Imprimer
        </button>
      </div>

      <div className="print-page bg-white min-h-screen p-8 text-black">
        {/* Header */}
        <div className="border-b-2 border-[#D4AF37] pb-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-wider" style={{ fontFamily: "serif" }}>ART-CORE</h1>
              <p className="text-sm text-gray-500 mt-1">Authenticate the Real</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400 uppercase tracking-wider">Certificat d&apos;authenticite</p>
              <p className="text-lg font-semibold text-[#D4AF37] font-mono">#{cert.id}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          {/* Left: Image */}
          <div>
            {cert.image_url && (
              <img src={cert.image_url} alt={cert.title} className="w-full aspect-[4/3] object-cover rounded border border-gray-200" />
            )}
            {!cert.image_url && (
              <div className="w-full aspect-[4/3] bg-gray-100 rounded border border-gray-200 flex items-center justify-center">
                <p className="text-gray-400 text-sm">Image non disponible</p>
              </div>
            )}
          </div>

          {/* Right: Details */}
          <div className="space-y-4">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider">Oeuvre</p>
              <p className="text-xl font-semibold" style={{ fontFamily: "serif" }}>{cert.title}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider">Artiste</p>
              <p className="text-base">{cert.artist}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider">Technique</p>
                <p className="text-sm">{cert.technique}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider">Dimensions</p>
                <p className="text-sm">{cert.dimensions}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider">Annee</p>
                <p className="text-sm">{cert.year}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider">Statut</p>
                <p className="text-sm font-medium" style={{ color: cert.status === "certified" ? "#16a34a" : "#ca8a04" }}>
                  {cert.status === "certified" ? "Certifie" : "En attente"}
                </p>
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider">Date de certification</p>
              <p className="text-sm">{certDate}</p>
            </div>
          </div>
        </div>

        {/* Hashes */}
        <div className="border border-gray-200 rounded-lg p-4 mb-8">
          <h3 className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-3">Empreintes numeriques</h3>
          <div className="space-y-2">
            <div>
              <span className="text-[10px] text-gray-400 uppercase">SHA-256</span>
              <p className="text-[11px] font-mono text-gray-600 break-all">{cert.sha256}</p>
            </div>
            <div>
              <span className="text-[10px] text-gray-400 uppercase">pHash</span>
              <p className="text-[11px] font-mono text-gray-600 break-all">{cert.phash}</p>
            </div>
          </div>
        </div>

        {/* Description */}
        {cert.description && (
          <div className="mb-8">
            <h3 className="text-xs text-gray-400 uppercase tracking-wider font-semibold mb-2">Description</h3>
            <p className="text-sm text-gray-600 leading-relaxed">{cert.description}</p>
          </div>
        )}

        {/* QR code placeholder */}
        <div className="flex items-end justify-between border-t-2 border-[#D4AF37] pt-6">
          <div>
            <p className="text-xs text-gray-400 mb-1">Verifie par</p>
            <p className="font-bold text-lg" style={{ fontFamily: "serif" }}>ART-CORE GROUP LTD</p>
            <p className="text-xs text-gray-400">Companies House UK</p>
            <p className="text-xs text-gray-400">art-core.app — contact@art-core.app</p>
          </div>
          <div className="text-center">
            <div className="w-24 h-24 border border-gray-300 rounded flex items-center justify-center mb-1">
              <span className="text-gray-300 text-[10px]">QR CODE</span>
            </div>
            <p className="text-[9px] text-gray-400">Scannez pour verifier</p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-gray-100 text-center">
          <p className="text-[10px] text-gray-300">
            Ce document est un certificat d&apos;authenticite delivre par ART-CORE GROUP LTD. Verification en ligne : art-core.app/pass-core/verifier
          </p>
        </div>
      </div>
    </>
  );
}
