"use client";

import { useState, useEffect } from "react";
import { Download, X, MoreVertical, PlusSquare, Share } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PWAInstaller({ appName }: { appName: string }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Already installed as PWA
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setInstalled(true);
      return;
    }

    // Dismissed recently
    const dismissed = localStorage.getItem(`pwa-dismissed-${appName}`);
    if (dismissed && Date.now() - parseInt(dismissed) < 12 * 60 * 60 * 1000) return;

    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(ios);

    // Try native prompt (HTTPS only)
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setTimeout(() => setShowBanner(true), 2000);
    };
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => { setInstalled(true); setShowBanner(false); setShowManual(false); });

    // If no native prompt after 4s (HTTP or unsupported), show manual instructions
    const fallbackTimer = setTimeout(() => {
      if (!deferredPrompt) {
        setShowBanner(true);
        setShowManual(true);
      }
    }, 4000);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      clearTimeout(fallbackTimer);
    };
  }, []);

  async function handleInstall() {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") setInstalled(true);
      setShowBanner(false);
      setDeferredPrompt(null);
    }
  }

  function handleDismiss() {
    setShowBanner(false);
    setShowManual(false);
    localStorage.setItem(`pwa-dismissed-${appName}`, String(Date.now()));
  }

  if (!showBanner || installed) return null;

  // Native install available (HTTPS)
  if (deferredPrompt && !showManual) {
    return (
      <div className="fixed bottom-20 md:bottom-4 left-4 right-4 z-[60] animate-slide-up max-w-lg mx-auto">
        <div className="bg-[#111111] border border-[#C9A84C]/20 rounded-2xl p-4 shadow-[0_0_30px_rgba(0,0,0,0.8)] flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-[#C9A84C]/10 flex items-center justify-center shrink-0">
            <Download className="size-6 text-[#C9A84C]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white">Installer {appName}</p>
            <p className="text-[11px] text-white/35">Accès rapide depuis l&apos;écran d&apos;accueil</p>
          </div>
          <button onClick={handleInstall}
            className="px-4 py-2 rounded-xl bg-[#C9A84C] text-[#0a0a0a] text-sm font-semibold shrink-0 active:brightness-90">
            Installer
          </button>
          <button onClick={handleDismiss} className="w-8 h-8 flex items-center justify-center shrink-0 text-white/30">
            <X className="size-4" />
          </button>
        </div>
      </div>
    );
  }

  // Manual install instructions (HTTP / fallback)
  return (
    <div className="fixed bottom-20 md:bottom-4 left-3 right-3 z-[60] animate-slide-up max-w-lg mx-auto">
      <div className="bg-[#111111] border border-[#C9A84C]/20 rounded-2xl p-4 shadow-[0_0_30px_rgba(0,0,0,0.8)]">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-[#C9A84C]/10 flex items-center justify-center shrink-0">
            <Download className="size-5 text-[#C9A84C]" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-white">Ajouter {appName} à l&apos;accueil</p>
            <p className="text-[11px] text-white/35">Comme une vraie app, sans téléchargement</p>
          </div>
          <button onClick={handleDismiss} className="w-8 h-8 flex items-center justify-center shrink-0 text-white/30">
            <X className="size-4" />
          </button>
        </div>

        {isIOS ? (
          <div className="space-y-2.5 text-xs">
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/5">
              <div className="w-7 h-7 rounded-lg bg-blue-500/15 flex items-center justify-center shrink-0">
                <Share className="size-4 text-blue-400" />
              </div>
              <p className="text-white/60">
                <span className="text-white font-medium">1.</span> Appuyez sur <span className="text-blue-400 font-medium">Partager</span> en bas
              </p>
            </div>
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/5">
              <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                <PlusSquare className="size-4 text-white/60" />
              </div>
              <p className="text-white/60">
                <span className="text-white font-medium">2.</span> Choisissez <span className="text-white font-medium">&quot;Sur l&apos;écran d&apos;accueil&quot;</span>
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2.5 text-xs">
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/5">
              <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                <MoreVertical className="size-4 text-white/60" />
              </div>
              <p className="text-white/60">
                <span className="text-white font-medium">1.</span> Appuyez sur <span className="text-white font-medium">le menu</span> <MoreVertical className="size-3 inline text-white/60" /> en haut à droite
              </p>
            </div>
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/5">
              <div className="w-7 h-7 rounded-lg bg-[#C9A84C]/10 flex items-center justify-center shrink-0">
                <PlusSquare className="size-4 text-[#C9A84C]" />
              </div>
              <p className="text-white/60">
                <span className="text-white font-medium">2.</span> Choisissez <span className="text-[#C9A84C] font-medium">&quot;Ajouter à l&apos;écran d&apos;accueil&quot;</span>
              </p>
            </div>
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/5">
              <div className="w-7 h-7 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
                <Download className="size-4 text-green-400" />
              </div>
              <p className="text-white/60">
                <span className="text-white font-medium">3.</span> Confirmez <span className="text-green-400 font-medium">&quot;Ajouter&quot;</span>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
