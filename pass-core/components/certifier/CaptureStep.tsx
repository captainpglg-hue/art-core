"use client";

import { useEffect } from "react";
import { useCameraMacro, type CameraQuality } from "./useCameraMacro";

/**
 * Capture photo macro avec guide visuel et contraintes qualité.
 *
 * Affiche :
 *  - viewfinder caméra plein écran (fixed inset-0, z-50)
 *  - overlay cadre de cadrage, coins + cible centrale
 *  - jauge qualité EN HAUT (toujours visible, au-dessus de la zone
 *    que la nav bar Android peut manger)
 *  - jauge qualité EN BAS (redondance) avec safe-area-inset-bottom
 *  - feedback textuel en temps réel (résolution / netteté / exposition)
 *  - bouton Capturer désactivé tant que qualité insuffisante
 *  - état "initialisation caméra" visible si pas encore ready
 */

interface Props {
  onCapture: (
    blob: Blob,
    dataUrl: string,
    width: number,
    height: number,
    quality: CameraQuality
  ) => void;
  onCancel?: () => void;
  title?: string;
  subtitle?: string;
}

export default function CaptureStep({ onCapture, onCancel, title, subtitle }: Props) {
  const { videoRef, canvasRef, isReady, error, quality, start, capture } =
    useCameraMacro();

  useEffect(() => {
    start();
  }, [start]);

  async function handleCapture() {
    const result = await capture();
    if (!result) return;
    onCapture(result.blob, result.dataUrl, result.width, result.height, result.quality);
  }

  const scoreColor = quality.isAcceptable ? "#10b981" : quality.score >= 40 ? "#f59e0b" : "#ef4444";
  const scoreBg = quality.isAcceptable
    ? "linear-gradient(to right, #10b981, #34d399)"
    : quality.score >= 40
    ? "linear-gradient(to right, #f59e0b, #fbbf24)"
    : "linear-gradient(to right, #dc2626, #f59e0b)";

  return (
    <div
      className="fixed inset-0 bg-black text-white flex flex-col"
      style={{ zIndex: 60 }}
    >
      {/* ═══ BARRE QUALITE HAUTE (toujours visible) ══════════════ */}
      <div
        className="bg-black/90 backdrop-blur px-4 pt-3 pb-3 border-b border-white/10"
        style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
      >
        {title && (
          <p className="text-[10px] uppercase tracking-widest text-[#d4af37] mb-0.5">
            {title}
          </p>
        )}
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs opacity-80">
            {quality.resolution} MP · netteté {quality.sharpness}% · expo {quality.exposure}%
          </span>
          <span
            className="text-xs font-bold px-2 py-0.5 rounded-full"
            style={{
              color: scoreColor,
              backgroundColor: `${scoreColor}20`,
            }}
          >
            {isReady ? (quality.isAcceptable ? "✓ PRÊT" : "⚠ AJUSTER") : "INIT…"}
          </span>
        </div>
        <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full transition-all duration-200"
            style={{ width: `${quality.score}%`, background: scoreBg }}
          />
        </div>
        <p className="text-[11px] mt-1 opacity-80">
          {!isReady ? "Initialisation de la caméra…" : quality.feedback}
        </p>
      </div>

      {/* ═══ VIEWFINDER ══════════════════════════════════════════ */}
      <div className="relative flex-1 overflow-hidden">
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className="absolute inset-0 w-full h-full object-cover"
        />
        <canvas ref={canvasRef} className="hidden" />

        {/* Overlay guide macro */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-black/25" />
          {/* Fenêtre centrale claire */}
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[70%] aspect-square border-2 rounded-lg transition-colors duration-200"
            style={{
              borderColor: scoreColor,
              boxShadow: "0 0 0 9999px rgba(0,0,0,0.35)",
            }}
          >
            {/* Coins */}
            {["top-0 left-0", "top-0 right-0", "bottom-0 left-0", "bottom-0 right-0"].map(
              (pos) => (
                <div
                  key={pos}
                  className={`absolute w-5 h-5 border-white ${pos} ${
                    pos.includes("top") ? "border-t-2" : "border-b-2"
                  } ${pos.includes("left") ? "border-l-2" : "border-r-2"}`}
                />
              )
            )}
            {/* Cible centrale */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-px bg-white/50" />
              <div className="absolute w-px h-8 bg-white/50" />
            </div>
          </div>

          {/* Subtitle guide */}
          {subtitle && (
            <div className="absolute top-3 left-0 right-0 text-center px-4">
              <p className="text-sm opacity-90 bg-black/40 inline-block px-3 py-1 rounded-full backdrop-blur">
                {subtitle}
              </p>
            </div>
          )}
        </div>

        {/* Écran d'init si pas ready */}
        {!isReady && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70">
            <div className="text-center">
              <div className="inline-block w-10 h-10 border-4 border-white/20 border-t-[#d4af37] rounded-full animate-spin mb-3" />
              <p className="text-sm opacity-80">Démarrage de la caméra…</p>
              <p className="text-xs opacity-50 mt-1">Autorise l&apos;accès à la caméra si demandé</p>
            </div>
          </div>
        )}

        {/* Erreur caméra */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center p-6 bg-black/85">
            <div className="max-w-sm text-center">
              <p className="text-red-400 mb-2 font-medium">Impossible d&apos;accéder à la caméra</p>
              <p className="text-xs text-white/60 mb-4 break-words">{error}</p>
              <button
                onClick={start}
                className="px-4 py-2 bg-white text-black rounded-lg text-sm font-medium"
              >
                Réessayer
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ═══ BARRE QUALITE BASSE (redondance + gros score) ═════════ */}
      <div
        className="bg-black/90 backdrop-blur px-4 py-3 border-t border-white/10"
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-wider opacity-60">
            Score qualité
          </span>
          <span
            className="text-2xl font-bold tabular-nums"
            style={{ color: scoreColor }}
          >
            {quality.score}
            <span className="text-xs opacity-60 font-normal">/100</span>
          </span>
        </div>
      </div>

      {/* ═══ BOUTONS ═══════════════════════════════════════════════ */}
      <div
        className="bg-black px-6 py-4 flex items-center justify-between"
        style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
      >
        {onCancel ? (
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm opacity-80 hover:opacity-100"
          >
            Annuler
          </button>
        ) : (
          <div className="w-[72px]" />
        )}
        <button
          onClick={handleCapture}
          disabled={!isReady || !quality.isAcceptable}
          className="mx-auto w-16 h-16 rounded-full border-4 border-white disabled:border-white/30 disabled:opacity-40 transition-all active:scale-95"
          aria-label="Capturer"
        >
          <span
            className="block w-full h-full rounded-full"
            style={{
              background: quality.isAcceptable ? "#d4af37" : "rgba(255,255,255,0.2)",
            }}
          />
        </button>
        <div className="w-[72px]" />
      </div>
    </div>
  );
}
