"use client";

import { useState, useRef } from "react";
import {
  Share2,
  Download,
  Copy,
  Check,
  Twitter,
  Instagram,
  ExternalLink,
  Loader2,
  QrCode,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SharePassCoreProps {
  passCore: {
    id: string;
    token_id?: string | null;
    hash: string;
    tx_hash: string | null;
    network: string;
    status: string;
    verification_url: string | null;
    created_at: string;
  };
  artworkTitle: string;
  artworkImageUrl?: string;
}

export function SharePassCore({ passCore, artworkTitle, artworkImageUrl }: SharePassCoreProps) {
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const verificationUrl = passCore.verification_url ?? `${typeof window !== "undefined" ? window.location.origin : ""}/pass-core/verifier?id=${passCore.token_id ?? passCore.id}`;
  const shortHash = passCore.hash.slice(0, 8) + "…" + passCore.hash.slice(-8);
  const tokenId = passCore.token_id ?? passCore.id.slice(0, 12).toUpperCase();
  const certDate = new Date(passCore.created_at).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // ── Copy link ─────────────────────────────────────────────────
  async function copyLink() {
    await navigator.clipboard.writeText(verificationUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // ── Generate QR code ──────────────────────────────────────────
  async function generateQr() {
    if (qrDataUrl) { setShowQr(true); return; }
    try {
      const QRCode = (await import("qrcode")).default;
      const url = await QRCode.toDataURL(verificationUrl, {
        width: 300,
        margin: 2,
        color: { dark: "#C9A84C", light: "#0A1128" },
      });
      setQrDataUrl(url);
      setShowQr(true);
    } catch {
      // Fallback — show the URL
      setShowQr(true);
    }
  }

  // ── Download certificate card as PNG ─────────────────────────
  async function downloadCard() {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: "#0A1128",
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const link = document.createElement("a");
      link.download = `pass-core-${tokenId}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch {
      // Silently fail — user can screenshot manually
    } finally {
      setDownloading(false);
    }
  }

  // ── Social share helpers ───────────────────────────────────────
  function shareOnTwitter() {
    const text = encodeURIComponent(
      `🎨 "${artworkTitle}" vient d'être certifiée sur @ArtCore — Le Pass-Core garantit son authenticité sur la blockchain.\n\nVérifiez ici :`
    );
    const url = encodeURIComponent(verificationUrl);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, "_blank");
  }

  function shareNative() {
    if (typeof navigator.share === "function") {
      navigator.share({
        title: `Pass-Core — ${artworkTitle}`,
        text: `Certificat d'authenticité blockchain pour "${artworkTitle}"`,
        url: verificationUrl,
      }).catch(() => {});
    } else {
      copyLink();
    }
  }

  return (
    <div className="space-y-4">
      {/* Certificate card (rendered for download) */}
      <div
        ref={cardRef}
        className="rounded-2xl border border-gold/30 bg-gradient-to-br from-[#0A1128] to-[#071022] p-6 relative overflow-hidden"
      >
        {/* Decorative glow */}
        <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-gold/5 -translate-y-12 translate-x-12 pointer-events-none" />

        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-[9px] uppercase tracking-[0.3em] text-gold/50 mb-1">Art-Core LTD</p>
            <p className="text-[10px] uppercase tracking-widest text-gold/70">Certificat d&apos;authenticité</p>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-[#00C896]/10 border border-[#00C896]/20 px-2.5 py-1">
            <div className="w-1.5 h-1.5 rounded-full bg-[#00C896] animate-pulse" />
            <span className="text-[10px] font-semibold text-[#00C896] uppercase tracking-wide">Actif</span>
          </div>
        </div>

        {/* Artwork thumbnail + title */}
        <div className="flex items-center gap-4 mb-5">
          {artworkImageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={artworkImageUrl}
              alt={artworkTitle}
              className="w-16 h-16 object-cover rounded-xl border border-white/10 flex-shrink-0"
            />
          )}
          <div>
            <h3 className="font-playfair text-lg font-semibold text-white leading-tight">{artworkTitle}</h3>
            <p className="text-xs text-white/40 mt-0.5">Certifié le {certDate}</p>
          </div>
        </div>

        {/* Hash data */}
        <div className="rounded-xl bg-white/3 border border-white/5 p-3 space-y-2 font-mono text-[11px]">
          <div className="flex justify-between">
            <span className="text-white/30">Token ID</span>
            <span className="text-gold/80 font-semibold">{tokenId}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/30">SHA-256</span>
            <span className="text-white/60">{shortHash}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/30">Réseau</span>
            <span className="text-white/60 capitalize">{passCore.network}</span>
          </div>
          {passCore.tx_hash && (
            <div className="flex justify-between">
              <span className="text-white/30">Tx Hash</span>
              <span className="text-white/60">
                {passCore.tx_hash.slice(0, 10)}…
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-[9px] text-white/20 mt-4 text-center">
          pass-core.art-core.app · Vérifiez sur : {verificationUrl.slice(0, 40)}…
        </p>
      </div>

      {/* QR code panel */}
      {showQr && (
        <div className="rounded-xl border border-gold/20 bg-[#0A1128] p-4 flex flex-col items-center gap-3">
          {qrDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qrDataUrl} alt="QR Code" className="w-40 h-40 rounded-lg" />
          ) : (
            <div className="w-40 h-40 rounded-lg bg-white/5 flex items-center justify-center">
              <p className="text-xs text-white/40 text-center px-3 break-all">{verificationUrl}</p>
            </div>
          )}
          <p className="text-xs text-white/40 text-center">
            Scannez pour vérifier l&apos;authenticité sur la blockchain
          </p>
        </div>
      )}

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={copyLink}
        >
          {copied ? <Check className="size-4 text-[#00C896]" /> : <Copy className="size-4" />}
          {copied ? "Copié !" : "Copier le lien"}
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={generateQr}
        >
          <QrCode className="size-4" />
          QR Code
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={shareOnTwitter}
        >
          <Twitter className="size-4" />
          Twitter / X
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={shareNative}
        >
          <Share2 className="size-4" />
          Partager
        </Button>
      </div>

      <div className="flex gap-3">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 gap-2"
          onClick={downloadCard}
          disabled={downloading}
        >
          {downloading ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
          Télécharger (PNG)
        </Button>

        {verificationUrl && (
          <Button
            size="sm"
            className="flex-1 gap-2"
            asChild
          >
            <a href={verificationUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="size-4" />
              Vérifier sur chain
            </a>
          </Button>
        )}
      </div>

      {/* Instagram hint */}
      <div className="rounded-xl border border-white/5 bg-white/3 p-3 flex items-start gap-3">
        <Instagram className="size-4 text-white/30 mt-0.5 shrink-0" />
        <p className="text-xs text-white/30 leading-relaxed">
          Pour Instagram, téléchargez l&apos;image PNG et partagez-la avec le lien en bio. Utilisez <span className="text-gold/50">#PassCore #ArtCore #ArtAuthentique</span>
        </p>
      </div>
    </div>
  );
}
