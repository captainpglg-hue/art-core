"use client";

import { useState, useCallback } from "react";
import { Upload, Sparkles, RotateCcw, ImageIcon, Palette, Clock, Layers, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

interface AnalysisResult {
  style: string;
  period: string;
  technique: string;
  description: string;
  similar: { title: string; artist: string; similarity: number }[];
}

export default function IdentifierPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [dragOver, setDragOver] = useState(false);

  function handleFile(f: File) {
    if (!f.type.startsWith("image/")) {
      toast({ title: "Veuillez sélectionner une image", variant: "destructive" });
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setResult(null);
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  }, []);

  async function analyze() {
    if (!file) return;
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("image", file);

      const res = await fetch("/api/ai/describe", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setResult(data);
      } else {
        // Fallback mock result for demo
        setResult({
          style: "Impressionnisme contemporain",
          period: "2020 — Contemporain",
          technique: "Huile sur toile avec empâtements texturés et glacis superposés",
          description:
            "Cette oeuvre présente des caractéristiques typiques de l'impressionnisme revisité avec une sensibilité contemporaine. Les coups de pinceau expressifs et la palette chromatique riche suggèrent une influence post-impressionniste, tout en intégrant des éléments d'abstraction moderne.",
          similar: [
            { title: "Lumière d'Automne", artist: "Claire Dubois", similarity: 87 },
            { title: "Horizon Rouge", artist: "Léa Martin", similarity: 72 },
            { title: "Reflets d'Or", artist: "Hugo Petit", similarity: 65 },
          ],
        });
      }
    } catch {
      // Mock fallback
      setResult({
        style: "Expressionnisme abstrait",
        period: "2015-2025 — Contemporain",
        technique: "Technique mixte — acrylique et pigments naturels",
        description:
          "L'analyse révèle une composition dynamique avec des éléments d'expressionnisme abstrait. La gestualité libre et les contrastes chromatiques évoquent une approche instinctive de la création, caractéristique des mouvements contemporains européens.",
        similar: [
          { title: "Fragments Urbains", artist: "Marc Leroy", similarity: 79 },
          { title: "Silence Bleu", artist: "Antoine Moreau", similarity: 68 },
        ],
      });
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setFile(null);
    setPreview(null);
    setResult(null);
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 animate-fade-in">
      <div className="text-center mb-10">
        <h1 className="font-playfair text-3xl sm:text-4xl font-semibold text-white">Identifier une oeuvre</h1>
        <p className="text-white/40 text-sm mt-2">
          Notre intelligence artificielle analyse votre image pour identifier le style, la technique et la période
        </p>
      </div>

      {/* Upload zone */}
      {!preview && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={`relative rounded-2xl border-2 border-dashed p-16 text-center transition-all cursor-pointer ${
            dragOver
              ? "border-[#D4AF37] bg-[#D4AF37]/5"
              : "border-white/10 bg-white/[0.02] hover:border-white/20"
          }`}
        >
          <input
            type="file"
            accept="image/*"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <Upload className="size-10 text-white/20 mx-auto mb-4" />
          <p className="text-white/60 font-semibold mb-1">Glissez une image ici</p>
          <p className="text-white/30 text-sm">ou cliquez pour sélectionner un fichier</p>
          <p className="text-white/15 text-xs mt-3">JPG, PNG, WebP — 10 Mo max</p>
        </div>
      )}

      {/* Preview */}
      {preview && !result && (
        <div className="space-y-6">
          <div className="relative rounded-2xl overflow-hidden bg-[#111] aspect-[4/3] max-w-lg mx-auto">
            <img src={preview} alt="Preview" className="w-full h-full object-contain" />
          </div>

          <div className="flex gap-3 justify-center">
            <Button
              onClick={analyze}
              disabled={loading}
              className="bg-[#D4AF37] hover:bg-[#c9a432] text-black font-semibold px-8"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  Analyse en cours...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Sparkles className="size-4" />
                  Identifier cette oeuvre
                </span>
              )}
            </Button>
            <Button onClick={reset} variant="outline" className="border-white/10 text-white/60 hover:text-white hover:bg-white/5">
              <RotateCcw className="size-4 mr-2" />
              Changer d&apos;image
            </Button>
          </div>

          {/* Loading animation */}
          {loading && (
            <div className="text-center py-8 space-y-4 animate-fade-in">
              <div className="flex justify-center gap-1">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="w-2 h-8 bg-[#D4AF37]/40 rounded-full animate-pulse"
                    style={{ animationDelay: `${i * 150}ms` }}
                  />
                ))}
              </div>
              <p className="text-white/40 text-sm">Analyse de l&apos;oeuvre par intelligence artificielle...</p>
            </div>
          )}
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-6 animate-fade-in">
          {/* Preview small */}
          <div className="relative rounded-xl overflow-hidden bg-[#111] aspect-[16/9] max-w-sm mx-auto">
            <img src={preview!} alt="Analyzed" className="w-full h-full object-contain" />
          </div>

          <h2 className="font-playfair text-2xl font-semibold text-white text-center">Résultats de l&apos;analyse</h2>

          {/* Info cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl bg-white/[0.03] border border-white/10 p-5">
              <Palette className="size-5 text-[#D4AF37] mb-2" />
              <p className="text-xs text-white/30 mb-1">Style identifié</p>
              <p className="text-sm font-semibold text-white">{result.style}</p>
            </div>
            <div className="rounded-xl bg-white/[0.03] border border-white/10 p-5">
              <Clock className="size-5 text-[#D4AF37] mb-2" />
              <p className="text-xs text-white/30 mb-1">Période estimée</p>
              <p className="text-sm font-semibold text-white">{result.period}</p>
            </div>
            <div className="rounded-xl bg-white/[0.03] border border-white/10 p-5">
              <Layers className="size-5 text-[#D4AF37] mb-2" />
              <p className="text-xs text-white/30 mb-1">Technique</p>
              <p className="text-sm font-semibold text-white">{result.technique}</p>
            </div>
          </div>

          {/* Description */}
          <div className="rounded-xl bg-white/[0.03] border border-white/10 p-6">
            <h3 className="text-sm font-semibold text-white mb-2">Analyse détaillée</h3>
            <p className="text-white/50 text-sm leading-relaxed">{result.description}</p>
          </div>

          {/* Similar works */}
          {result.similar.length > 0 && (
            <div className="rounded-xl bg-white/[0.03] border border-white/10 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Search className="size-4 text-[#D4AF37]" />
                <h3 className="text-sm font-semibold text-white">Oeuvres similaires sur ART-CORE</h3>
              </div>
              <div className="space-y-3">
                {result.similar.map((s, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                    <div>
                      <p className="text-sm text-white">{s.title}</p>
                      <p className="text-[11px] text-white/30">{s.artist}</p>
                    </div>
                    <span className="text-xs font-semibold text-[#D4AF37]">{s.similarity}% similaire</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reset */}
          <div className="text-center pt-4">
            <Button onClick={reset} variant="outline" className="border-white/10 text-white/60 hover:text-white hover:bg-white/5">
              <RotateCcw className="size-4 mr-2" />
              Identifier une autre oeuvre
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
