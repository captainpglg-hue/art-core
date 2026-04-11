"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { Camera, RefreshCw, CheckCircle2, AlertTriangle, ZoomIn, SwitchCamera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface QualityIndicator {
  label: string;
  ok: boolean;
  hint: string;
}

interface CertificationCameraProps {
  onCapture: (file: File) => void;
  onCancel: () => void;
}

export function CertificationCamera({ onCapture, onCancel }: CertificationCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [capturedDataUrl, setCapturedDataUrl] = useState<string | null>(null);
  const [quality, setQuality] = useState<QualityIndicator[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Start camera ──────────────────────────────────────────────
  const startCamera = useCallback(async (facing: "environment" | "user") => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
    setIsReady(false);
    setError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facing,
          width: { ideal: 3840, min: 1280 },
          height: { ideal: 2160, min: 720 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setIsReady(true);
          analyzeQuality(stream);
        };
      }
    } catch {
      setError("Impossible d'accéder à la caméra. Vérifiez les permissions.");
    }
  }, []);

  useEffect(() => {
    startCamera(facingMode);
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [facingMode, startCamera]);

  // ── Quality analysis ──────────────────────────────────────────
  function analyzeQuality(stream: MediaStream) {
    const track = stream.getVideoTracks()[0];
    const settings = track.getSettings();
    const w = settings.width ?? 0;
    const h = settings.height ?? 0;

    setQuality([
      {
        label: "Résolution",
        ok: w >= 1280 && h >= 720,
        hint: w >= 1280 ? `${w}×${h}px` : `Faible (${w}×${h}px)`,
      },
      {
        label: "Éclairage",
        ok: true, // Can't detect without analysing frame pixels in real-time
        hint: "Assurez-vous d'un bon éclairage",
      },
      {
        label: "Stabilité",
        ok: true,
        hint: "Posez l'appareil ou restez stable",
      },
    ]);
  }

  // ── Capture ───────────────────────────────────────────────────
  function captureFrame() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
    setCapturedDataUrl(dataUrl);

    // Update quality with actual resolution
    setQuality((prev) =>
      prev.map((q) =>
        q.label === "Résolution"
          ? { ...q, ok: video.videoWidth >= 1280, hint: `${video.videoWidth}×${video.videoHeight}px` }
          : q
      )
    );
  }

  // ── Confirm capture → File ────────────────────────────────────
  function confirmCapture() {
    if (!capturedDataUrl) return;
    fetch(capturedDataUrl)
      .then((r) => r.blob())
      .then((blob) => {
        const file = new File([blob], `capture_${Date.now()}.jpg`, { type: "image/jpeg" });
        onCapture(file);
      });
  }

  function retake() {
    setCapturedDataUrl(null);
  }

  function switchCamera() {
    setFacingMode((m) => (m === "environment" ? "user" : "environment"));
    setCapturedDataUrl(null);
  }

  const allQualityOk = quality.every((q) => q.ok);

  return (
    <div className="rounded-2xl border border-gold/20 bg-[#0A0A0A] overflow-hidden">
      {/* Viewfinder */}
      <div className="relative aspect-[4/3] bg-black">
        {!capturedDataUrl ? (
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            muted
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={capturedDataUrl} alt="Capture" className="w-full h-full object-cover" />
        )}

        {/* Corner guides */}
        {!capturedDataUrl && isReady && (
          <>
            <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-gold/70 rounded-tl-sm" />
            <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-gold/70 rounded-tr-sm" />
            <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-gold/70 rounded-bl-sm" />
            <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-gold/70 rounded-br-sm" />
          </>
        )}

        {/* Switch camera */}
        {!capturedDataUrl && (
          <button
            onClick={switchCamera}
            className="absolute top-3 right-3 w-9 h-9 rounded-lg bg-black/50 backdrop-blur-sm flex items-center justify-center text-white/70 hover:text-white transition-colors"
          >
            <SwitchCamera className="size-4" />
          </button>
        )}

        {/* Zoom hint */}
        {!capturedDataUrl && isReady && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 rounded-full bg-black/50 backdrop-blur-sm px-3 py-1.5 text-[10px] text-white/50">
            <ZoomIn className="size-3" />
            Cadrez l&apos;œuvre entière
          </div>
        )}

        {/* Error overlay */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 text-center p-6">
            <div>
              <AlertTriangle className="size-8 text-gold mx-auto mb-3" />
              <p className="text-sm text-white/70">{error}</p>
            </div>
          </div>
        )}

        {/* Loading */}
        {!isReady && !error && !capturedDataUrl && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <div className="flex flex-col items-center gap-3">
              <Camera className="size-8 text-gold/60 animate-pulse" />
              <p className="text-xs text-white/40">Initialisation de la caméra…</p>
            </div>
          </div>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />

      {/* Quality indicators */}
      <div className="px-4 py-3 border-t border-white/5 flex items-center gap-4">
        {quality.map((q) => (
          <div key={q.label} className="flex items-center gap-1.5">
            {q.ok ? (
              <CheckCircle2 className="size-3 text-[#00C896]" />
            ) : (
              <AlertTriangle className="size-3 text-gold" />
            )}
            <span className={cn("text-[10px]", q.ok ? "text-white/40" : "text-gold/70")}>
              {q.label} · {q.hint}
            </span>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="px-4 pb-4 flex gap-3">
        <Button variant="outline" size="sm" onClick={onCancel} className="flex-none">
          Annuler
        </Button>

        {!capturedDataUrl ? (
          <Button
            size="sm"
            className="flex-1"
            disabled={!isReady || !!error}
            onClick={captureFrame}
          >
            <Camera className="size-4" />
            Capturer
          </Button>
        ) : (
          <>
            <Button variant="outline" size="sm" onClick={retake} className="flex-none gap-1.5">
              <RefreshCw className="size-4" />
              Reprendre
            </Button>
            <Button
              size="sm"
              className="flex-1"
              disabled={!allQualityOk}
              onClick={confirmCapture}
            >
              <CheckCircle2 className="size-4" />
              Utiliser cette photo
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
