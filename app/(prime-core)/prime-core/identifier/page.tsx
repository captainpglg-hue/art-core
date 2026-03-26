"use client";

import { useState, useRef, useCallback } from "react";
import {
  Upload,
  Image as ImageIcon,
  Loader2,
  User,
  Palette,
  Clock,
  Layers,
  X,
  Camera,
} from "lucide-react";

interface IdentificationResult {
  artist: string | null;
  confidence: number;
  style: string;
  period: string;
  description: string;
  similarWorks: { title: string; artist: string; year: string }[];
}

export default function IdentifierPage() {
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<IdentificationResult | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);
    setResult(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleAnalyze = async () => {
    if (!preview) return;
    setLoading(true);

    // Simulate API call to /api/ai/describe
    try {
      await new Promise((r) => setTimeout(r, 2500));

      // Mock result
      setResult({
        artist: "Claude Monet (attribué)",
        confidence: 78,
        style: "Impressionnisme — Utilisation caractéristique de touches rapides et de lumière naturelle. La palette met en avant des bleus, verts et blancs typiques du mouvement impressionniste français.",
        period: "Fin XIXe siècle (estimé 1875-1890)",
        description:
          "L'oeuvre présente une composition paysagère avec un traitement atmosphérique de la lumière. Les coups de pinceau visibles et la dissolution des formes dans la lumière sont caractéristiques d'un style impressionniste mature.",
        similarWorks: [
          { title: "Impression, soleil levant", artist: "Claude Monet", year: "1872" },
          { title: "Les Nymphéas", artist: "Claude Monet", year: "1906" },
          { title: "La Promenade", artist: "Claude Monet", year: "1875" },
        ],
      });
    } catch {
      // Handle error silently
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setPreview(null);
    setResult(null);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 animate-fade-in">
      <h1 className="font-playfair text-3xl font-semibold text-white mb-2">Identifier une oeuvre</h1>
      <p className="text-white/40 text-sm mb-8">
        Téléchargez une image pour identifier l&apos;artiste, le style et la période.
      </p>

      {/* Upload Zone */}
      {!preview ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          className={`relative rounded-2xl border-2 border-dashed p-12 text-center cursor-pointer transition-colors ${
            dragOver
              ? "border-[#2ecc71] bg-[#2ecc71]/5"
              : "border-white/[0.1] bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
          }`}
        >
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
          <div className="w-16 h-16 rounded-2xl bg-[#2ecc71]/10 flex items-center justify-center mx-auto mb-4">
            <Upload className="size-8 text-[#2ecc71]" />
          </div>
          <p className="text-sm font-medium text-white mb-1">
            Glissez-déposez ou cliquez pour télécharger
          </p>
          <p className="text-xs text-white/30">PNG, JPG, WEBP — Max 10 Mo</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Preview */}
          <div className="relative rounded-2xl overflow-hidden bg-white/[0.03] border border-white/[0.08]">
            <img src={preview} alt="Preview" className="w-full max-h-80 object-contain" />
            <button
              onClick={handleReset}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center text-white/60 hover:text-white transition-colors"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Analyze Button */}
          {!result && !loading && (
            <button
              onClick={handleAnalyze}
              className="w-full py-3 rounded-xl bg-[#2ecc71] text-white font-semibold text-sm hover:bg-[#27ae60] transition-colors flex items-center justify-center gap-2"
            >
              <Camera className="size-4" />
              Analyser l&apos;image
            </button>
          )}

          {/* Loading */}
          {loading && (
            <div className="rounded-2xl bg-white/[0.03] border border-white/[0.08] p-8 text-center">
              <Loader2 className="size-8 text-[#2ecc71] animate-spin mx-auto mb-3" />
              <p className="text-sm text-white/60">Analyse en cours...</p>
              <p className="text-xs text-white/25 mt-1">Identification du style et de l&apos;artiste</p>
            </div>
          )}

          {/* Results */}
          {result && (
            <div className="space-y-4">
              {/* Artist */}
              {result.artist && (
                <div className="rounded-2xl bg-white/[0.03] border border-[#2ecc71]/20 p-5">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-[#2ecc71]/10 flex items-center justify-center">
                      <User className="size-5 text-[#2ecc71]" />
                    </div>
                    <div>
                      <p className="text-xs text-white/30">Artiste identifié</p>
                      <p className="text-lg font-semibold text-white">{result.artist}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <div className="h-1.5 flex-1 rounded-full bg-white/[0.08] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#2ecc71]"
                        style={{ width: `${result.confidence}%` }}
                      />
                    </div>
                    <span className="text-xs text-[#2ecc71] tabular-nums">{result.confidence}%</span>
                  </div>
                </div>
              )}

              {/* Style */}
              <div className="rounded-2xl bg-white/[0.03] border border-white/[0.08] p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Palette className="size-4 text-[#D4AF37]" />
                  <p className="text-xs text-white/30">Analyse du style</p>
                </div>
                <p className="text-sm text-white/70 leading-relaxed">{result.style}</p>
              </div>

              {/* Period */}
              <div className="rounded-2xl bg-white/[0.03] border border-white/[0.08] p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="size-4 text-[#D4AF37]" />
                  <p className="text-xs text-white/30">Période estimée</p>
                </div>
                <p className="text-sm font-medium text-white">{result.period}</p>
              </div>

              {/* Description */}
              <div className="rounded-2xl bg-white/[0.03] border border-white/[0.08] p-5">
                <div className="flex items-center gap-2 mb-2">
                  <ImageIcon className="size-4 text-[#D4AF37]" />
                  <p className="text-xs text-white/30">Description</p>
                </div>
                <p className="text-sm text-white/70 leading-relaxed">{result.description}</p>
              </div>

              {/* Similar Works */}
              <div className="rounded-2xl bg-white/[0.03] border border-white/[0.08] p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Layers className="size-4 text-[#D4AF37]" />
                  <p className="text-xs text-white/30">Oeuvres similaires</p>
                </div>
                <div className="space-y-2">
                  {result.similarWorks.map((work, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0"
                    >
                      <div>
                        <p className="text-sm text-white/70">{work.title}</p>
                        <p className="text-[11px] text-white/30">{work.artist}</p>
                      </div>
                      <span className="text-xs text-white/40">{work.year}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Retry */}
              <button
                onClick={handleReset}
                className="w-full py-3 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white/60 text-sm font-medium hover:bg-white/[0.08] transition-colors"
              >
                Analyser une autre image
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
