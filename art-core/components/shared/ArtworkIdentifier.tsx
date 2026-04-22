"use client";

import { useState, useRef, useCallback } from "react";
import Image from "next/image";
import {
  Camera, Upload, X, Loader2, ShieldCheck, ShieldX,
  AlertTriangle, Search, ChevronDown, ChevronUp,
  ExternalLink, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ArtworkAnalysis {
  identified: boolean;
  confidence: number;
  title: string | null;
  artist: string | null;
  year: string | null;
  movement: string | null;
  technique: string | null;
  dimensions: string | null;
  location: string | null;
  description: string | null;
  anecdotes: string | null;
  style_clues: string[];
  probable_artists: string[];
  is_likely_original: boolean;
  red_flags: string[];
}

interface Props {
  /** Visual context: which app is using this */
  context?: "art-core" | "pass-core" | "prime-core";
  /** Called when analysis is complete */
  onAnalysis?: (analysis: ArtworkAnalysis, imageFile: File) => void;
  /** Called when user wants to certify the identified artwork */
  onCertify?: (analysis: ArtworkAnalysis, imageFile: File) => void;
  /** Called when an already-uploaded file should be used */
  imageFile?: File | null;
  /** Label for the primary CTA */
  ctaLabel?: string;
  className?: string;
}

const ACCENT = {
  "art-core": { color: "text-gold", bg: "bg-gold/10", border: "border-gold/30", hex: "#C9A84C" },
  "pass-core": { color: "text-gold", bg: "bg-gold/10", border: "border-gold/30", hex: "#C9A84C" },
  "prime-core": { color: "text-[#00C896]", bg: "bg-[#00C896]/10", border: "border-[#00C896]/30", hex: "#00C896" },
};

export function ArtworkIdentifier({
  context = "art-core",
  onAnalysis,
  onCertify,
  imageFile: externalFile,
  ctaLabel,
  className,
}: Props) {
  const [mode, setMode] = useState<"idle" | "camera" | "preview" | "loading" | "result">("idle");
  const [imageFile, setImageFile] = useState<File | null>(externalFile ?? null);
  const [preview, setPreview] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<ArtworkAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const accent = ACCENT[context];

  const setFile = useCallback((file: File) => {
    setImageFile(file);
    const url = URL.createObjectURL(file);
    setPreview(url);
    setMode("preview");
    setAnalysis(null);
    setError(null);
  }, []);

  const startCamera = async () => {
    setMode("camera");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch {
      setError("Caméra inaccessible. Utilisez l'upload à la place.");
      setMode("idle");
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setMode("idle");
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext("2d")?.drawImage(videoRef.current, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `identify_${Date.now()}.jpg`, { type: "image/jpeg" });
      stopCamera();
      setFile(file);
    }, "image/jpeg", 0.92);
  };

  const analyse = async () => {
    if (!imageFile) return;
    setMode("loading");
    setError(null);

    const form = new FormData();
    form.append("image", imageFile);

    try {
      const res = await fetch("/api/identify-artwork", { method: "POST", body: form });
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error ?? "Erreur d'analyse");
      }

      setAnalysis(data.analysis);
      setMode("result");
      onAnalysis?.(data.analysis, imageFile);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur d'analyse");
      setMode("preview");
    }
  };

  const reset = () => {
    setMode("idle");
    setImageFile(null);
    setPreview(null);
    setAnalysis(null);
    setError(null);
    setShowDetails(false);
    if (preview) URL.revokeObjectURL(preview);
  };

  const confidenceColor = (c: number) =>
    c >= 80 ? "text-emerald-400" : c >= 50 ? "text-amber-400" : "text-red-400";

  const confidenceBg = (c: number) =>
    c >= 80 ? "bg-emerald-400" : c >= 50 ? "bg-amber-400" : "bg-red-400";

  return (
    <div className={cn("rounded-2xl border border-white/8 bg-[#111111] overflow-hidden", className)}>
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-white/5">
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", accent.bg)}>
          <Sparkles className={cn("size-4", accent.color)} />
        </div>
        <div>
          <p className="text-sm font-semibold text-white">Identifier une œuvre</p>
          <p className="text-[11px] text-white/40">Analyse par Claude Vision · IA spécialisée art</p>
        </div>
      </div>

      <div className="p-5">
        {/* IDLE */}
        {mode === "idle" && (
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={startCamera}
              variant="outline"
              className="flex-1 h-20 flex-col gap-2 border-white/10 hover:border-white/20"
            >
              <Camera className="size-5 text-white/60" />
              <span className="text-xs">Prendre une photo</span>
            </Button>
            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
              className="flex-1 h-20 flex-col gap-2 border-white/10 hover:border-white/20"
            >
              <Upload className="size-5 text-white/60" />
              <span className="text-xs">Importer une image</span>
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) setFile(f); }}
            />
          </div>
        )}

        {/* CAMERA */}
        {mode === "camera" && (
          <div className="space-y-3">
            <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
              {/* Corner guides */}
              <div className="absolute inset-4 pointer-events-none">
                {["top-0 left-0 border-t-2 border-l-2", "top-0 right-0 border-t-2 border-r-2",
                  "bottom-0 left-0 border-b-2 border-l-2", "bottom-0 right-0 border-b-2 border-r-2"]
                  .map((cls, i) => (
                    <div key={i} className={cn("absolute w-6 h-6 border-white/60 rounded-sm", cls)} />
                  ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={stopCamera} variant="outline" size="sm" className="border-white/10">
                <X className="size-4" />Annuler
              </Button>
              <Button onClick={capturePhoto} className="flex-1">
                <Camera className="size-4" />Capturer
              </Button>
            </div>
          </div>
        )}

        {/* PREVIEW */}
        {mode === "preview" && preview && (
          <div className="space-y-4">
            <div className="relative rounded-xl overflow-hidden">
              <Image src={preview} alt="Preview" width={600} height={400} className="w-full object-contain max-h-64 bg-black" />
              <button
                onClick={reset}
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 flex items-center justify-center text-white/70 hover:text-white"
              >
                <X className="size-3.5" />
              </button>
            </div>
            {error && (
              <p className="text-xs text-red-400 flex items-center gap-1.5">
                <AlertTriangle className="size-3.5" />{error}
              </p>
            )}
            <Button onClick={analyse} className="w-full">
              <Search className="size-4" />Identifier cette œuvre
            </Button>
          </div>
        )}

        {/* LOADING */}
        {mode === "loading" && (
          <div className="py-10 flex flex-col items-center gap-4">
            {preview && (
              <div className="relative w-24 h-24 rounded-xl overflow-hidden border border-white/10 mb-2">
                <Image src={preview} alt="Analyse" fill className="object-cover" />
              </div>
            )}
            <Loader2 className={cn("size-8 animate-spin", accent.color)} />
            <div className="text-center">
              <p className="text-sm text-white font-medium">Analyse en cours…</p>
              <p className="text-xs text-white/40 mt-1">Claude Vision interroge sa base de 500M d&apos;œuvres</p>
            </div>
          </div>
        )}

        {/* RESULT */}
        {mode === "result" && analysis && (
          <div className="space-y-4">
            {/* Preview thumb */}
            {preview && (
              <div className="relative w-full h-40 rounded-xl overflow-hidden border border-white/8">
                <Image src={preview} alt={analysis.title ?? "Œuvre"} fill className="object-contain bg-black" />
              </div>
            )}

            {/* Status banner */}
            <div className={cn(
              "flex items-center gap-3 p-3 rounded-xl border",
              analysis.identified
                ? "bg-emerald-500/5 border-emerald-500/20"
                : "bg-amber-500/5 border-amber-500/20"
            )}>
              {analysis.identified
                ? <ShieldCheck className="size-5 text-emerald-400 shrink-0" />
                : <AlertTriangle className="size-5 text-amber-400 shrink-0" />}
              <div className="flex-1 min-w-0">
                <p className={cn("text-sm font-semibold", analysis.identified ? "text-emerald-400" : "text-amber-400")}>
                  {analysis.identified ? "Œuvre identifiée" : "Œuvre non reconnue"}
                </p>
                <p className="text-xs text-white/50 truncate">
                  {analysis.identified
                    ? `Confiance : ${analysis.confidence}%`
                    : "Caractéristiques stylistiques détectées"}
                </p>
              </div>
              {/* Confidence bar */}
              <div className="flex flex-col items-end gap-1 shrink-0">
                <span className={cn("text-xs font-bold tabular-nums", confidenceColor(analysis.confidence))}>
                  {analysis.confidence}%
                </span>
                <div className="w-16 h-1.5 rounded-full bg-white/10">
                  <div
                    className={cn("h-full rounded-full transition-all", confidenceBg(analysis.confidence))}
                    style={{ width: `${analysis.confidence}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Main info */}
            {analysis.identified && (
              <div className="space-y-2">
                {analysis.title && (
                  <h3 className="font-playfair text-lg font-semibold text-white leading-tight">
                    {analysis.title}
                  </h3>
                )}
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-white/60">
                  {analysis.artist && <span>{analysis.artist}</span>}
                  {analysis.year && <span>· {analysis.year}</span>}
                  {analysis.movement && <span>· {analysis.movement}</span>}
                </div>
                {analysis.technique && (
                  <p className="text-xs text-white/40">{analysis.technique}{analysis.dimensions ? ` — ${analysis.dimensions}` : ""}</p>
                )}
                {analysis.location && (
                  <p className="text-xs text-white/40 flex items-center gap-1">
                    <ExternalLink className="size-3" />{analysis.location}
                  </p>
                )}
              </div>
            )}

            {/* Not identified — show style clues */}
            {!analysis.identified && analysis.style_clues?.length > 0 && (
              <div>
                <p className="text-xs text-white/40 mb-2">Caractéristiques détectées :</p>
                <div className="flex flex-wrap gap-1.5">
                  {analysis.style_clues.map((c) => (
                    <span key={c} className="text-xs px-2.5 py-1 rounded-full bg-white/5 border border-white/8 text-white/60">
                      {c}
                    </span>
                  ))}
                </div>
                {analysis.probable_artists?.length > 0 && (
                  <p className="text-xs text-white/50 mt-2">
                    Artistes probables : {analysis.probable_artists.join(", ")}
                  </p>
                )}
              </div>
            )}

            {/* Red flags */}
            {analysis.red_flags?.length > 0 && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/5 border border-red-500/20">
                <ShieldX className="size-4 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-red-400 mb-1">Alertes détectées</p>
                  {analysis.red_flags.map((f) => (
                    <p key={f} className="text-xs text-red-300/70">{f}</p>
                  ))}
                </div>
              </div>
            )}

            {/* Description toggle */}
            {analysis.description && (
              <div>
                <button
                  onClick={() => setShowDetails((v) => !v)}
                  className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors"
                >
                  {showDetails ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                  {showDetails ? "Masquer" : "Description complète"}
                </button>
                {showDetails && (
                  <div className="mt-2 space-y-2">
                    <p className="text-sm text-white/60 leading-relaxed">{analysis.description}</p>
                    {analysis.anecdotes && (
                      <p className="text-xs text-white/40 italic border-l-2 border-white/10 pl-3">
                        {analysis.anecdotes}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <Button onClick={reset} variant="outline" size="sm" className="border-white/10">
                <X className="size-4" />Nouvelle
              </Button>
              {onCertify && imageFile && (
                <Button
                  onClick={() => onCertify(analysis, imageFile)}
                  size="sm"
                  className="flex-1"
                >
                  <ShieldCheck className="size-4" />
                  {ctaLabel ?? "Certifier cette œuvre"}
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
