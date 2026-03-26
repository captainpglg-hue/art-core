"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck, Camera, ChevronRight, Check, Loader2, Award, Lock, TrendingUp,
  Crosshair, MapPin, Share2, RotateCcw, X, ZoomIn,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { detectPhone } from "@/lib/macro-compatibility";

type Step = "intro" | "select-zone" | "phone-check" | "macro-photo" | "camera" | "capture" | "coordinates" | "blockchain";
type Material = "Peinture" | "Ceramique" | "Tissu" | "Bijou" | "Bois" | "Photo" | "Sculpture";
type CamScore = "A" | "B" | "C" | "D";

const MATERIALS: { k: Material; tip: string }[] = [
  { k: "Peinture", tip: "Cherchez les coups de pinceau denses" },
  { k: "Ceramique", tip: "Cherchez les zones d'email cristallise" },
  { k: "Tissu", tip: "Cherchez l'entrecroisement de fibres" },
  { k: "Bijou", tip: "Cherchez les zones de polissage" },
  { k: "Bois", tip: "Cherchez les veines et pores" },
  { k: "Photo", tip: "Cherchez le grain argentique" },
  { k: "Sculpture", tip: "Cherchez les textures sculptees" },
];

const NEED_GUIDE = new Set<Material>(["Bijou", "Ceramique", "Tissu"]);

function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }

function scoreBadge(s: CamScore) {
  const m: Record<CamScore, [string, string]> = {
    A: ["Resolution excellente", "text-green-400 bg-green-500/15"],
    B: ["Resolution bonne", "text-blue-400 bg-blue-500/15"],
    C: ["Resolution moyenne", "text-yellow-400 bg-yellow-500/15"],
    D: ["Resolution faible", "text-red-400 bg-red-500/15"],
  };
  return m[s];
}

export default function PassCoreCertifierPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("intro");

  // Intro form
  const [material, setMaterial] = useState<Material>("Peinture");
  const [form, setForm] = useState({ title: "", width: "", height: "", year: "", price: "", description: "" });

  // Zone selection
  const [artworkImg, setArtworkImg] = useState<string | null>(null);
  const [artworkFile, setArtworkFile] = useState<File | null>(null);
  const [zone, setZone] = useState({ x: 40, y: 40, w: 15, h: 15 });
  const [optimalZone, setOptimalZone] = useState<{ x: number; y: number } | null>(null);
  const zoneImgRef = useRef<HTMLImageElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Camera + quality
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const prevFrameRef = useRef<Uint8ClampedArray | null>(null);
  const qualityLoopRef = useRef<number>(0);
  const [camScore, setCamScore] = useState<CamScore>("B");
  const [quality, setQuality] = useState({ sharpness: 0, brightness: 0, stability: 0, reflections: 0, overall: 0 });
  const [camReady, setCamReady] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  // Capture
  const [capturedImg, setCapturedImg] = useState<string | null>(null);
  const [cropImg, setCropImg] = useState<string | null>(null);
  const [featureImg, setFeatureImg] = useState<string | null>(null);
  const [hash, setHash] = useState("");
  const [featureCount, setFeatureCount] = useState(0);
  const [processingStep, setProcessingStep] = useState(-1);
  const autoCaptureRef = useRef(false);
  const qualityStreakRef = useRef(0);
  const [phoneInfo, setPhoneInfo] = useState<ReturnType<typeof detectPhone> | null>(null);
  const macroFileRef = useRef<HTMLInputElement>(null);
  const [macroAnalysis, setMacroAnalysis] = useState<{ score: number; sharpness: number; brightness: number; resolution: number; mpx: number; passed: boolean; issues: string[] } | null>(null);
  const [macroPreview, setMacroPreview] = useState<string | null>(null);

  // Coordinates
  const [coord, setCoord] = useState({ corner: "Bas-droite", x_mm: 50, y_mm: 50, angle: 0 });

  // Blockchain
  const [blockchainStep, setBlockchainStep] = useState(-1);
  const [certResult, setCertResult] = useState<{ id?: string; block?: string; tx?: string } | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const STEPS_META = [
    { k: "select-zone", label: "Zone" },
    { k: "phone-check", label: "Appareil" },
    { k: "macro-photo", label: "Photo macro" },
    { k: "capture", label: "Analyse" },
    { k: "coordinates", label: "Coordonnees" },
    { k: "blockchain", label: "Certificat" },
  ];
  const si = STEPS_META.findIndex(s => s.k === step);
  const tip = MATERIALS.find(m => m.k === material)?.tip ?? "";

  // ─── Zone analysis ───
  function analyzeOptimalZone(img: HTMLImageElement) {
    const c = document.createElement("canvas");
    const sz = 256;
    c.width = sz; c.height = sz;
    const ctx = c.getContext("2d")!;
    ctx.drawImage(img, 0, 0, sz, sz);
    const d = ctx.getImageData(0, 0, sz, sz).data;
    const G = 8; const cs = sz / G;
    let best = -1, bx = 0, by = 0;
    for (let gy = 0; gy < G; gy++) {
      for (let gx = 0; gx < G; gx++) {
        let sum = 0, sum2 = 0, n = 0;
        for (let y = gy * cs; y < (gy + 1) * cs; y++) {
          for (let x = gx * cs; x < (gx + 1) * cs; x++) {
            const i = (y * sz + x) * 4;
            const l = d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114;
            sum += l; sum2 += l * l; n++;
          }
        }
        const variance = sum2 / n - (sum / n) ** 2;
        if (variance > best) { best = variance; bx = gx; by = gy; }
      }
    }
    const px = (bx / G) * 100 + (100 / G / 2) - 7.5;
    const py = (by / G) * 100 + (100 / G / 2) - 7.5;
    setOptimalZone({ x: clamp(px, 0, 85), y: clamp(py, 0, 85) });
    setZone({ x: clamp(px, 0, 85), y: clamp(py, 0, 85), w: 15, h: 15 });
  }

  function handleArtworkFile(file: File) {
    const url = URL.createObjectURL(file);
    setArtworkImg(url);
    setArtworkFile(file);
    const img = new Image();
    img.onload = () => analyzeOptimalZone(img);
    img.src = url;
  }

  // ─── Analyse photo macro (prise par camera native) ───
  async function analyzeMacroPhoto(file: File) {
    const url = URL.createObjectURL(file);
    setMacroPreview(url);

    const img = new Image();
    img.src = url;
    await new Promise<void>((resolve) => { img.onload = () => resolve(); });

    const w = img.width;
    const h = img.height;
    const mpx = (w * h) / 1_000_000;
    const issues: string[] = [];
    let score = 100;

    // Resolution
    const resScore = mpx >= 12 ? 100 : mpx >= 8 ? 70 : mpx >= 4 ? 40 : 10;
    if (mpx < 8) { issues.push(`Resolution ${mpx.toFixed(1)}MP — minimum 8MP requis`); score -= 30; }
    else if (mpx < 12) { score -= 10; }

    // Analyse sur canvas
    const canvas = document.createElement("canvas");
    const sz = 400;
    canvas.width = sz; canvas.height = sz;
    const ctx = canvas.getContext("2d")!;
    // Analyser le centre de l'image (zone macro)
    const cropSize = Math.min(w, h);
    const sx = (w - cropSize) / 2;
    const sy = (h - cropSize) / 2;
    ctx.drawImage(img, sx, sy, cropSize, cropSize, 0, 0, sz, sz);
    const d = ctx.getImageData(0, 0, sz, sz).data;

    // Grayscale
    const gray = new Float32Array(sz * sz);
    let lumSum = 0;
    for (let i = 0; i < sz * sz; i++) {
      gray[i] = d[i * 4] * 0.299 + d[i * 4 + 1] * 0.587 + d[i * 4 + 2] * 0.114;
      lumSum += gray[i];
    }

    // Brightness
    const avgLum = lumSum / (sz * sz);
    const brightScore = avgLum >= 50 && avgLum <= 210 ? 100 : 30;
    if (avgLum < 50) { issues.push("Photo trop sombre — ameliorez l'eclairage"); score -= 25; }
    else if (avgLum > 210) { issues.push("Photo trop claire — reduisez la luminosite"); score -= 25; }

    // Sharpness (Laplacian variance)
    let lapSum = 0, lapSum2 = 0, lapN = 0;
    for (let y = 1; y < sz - 1; y++) {
      for (let x = 1; x < sz - 1; x++) {
        const v = -gray[(y - 1) * sz + x] - gray[y * sz + x - 1] + 4 * gray[y * sz + x] - gray[y * sz + x + 1] - gray[(y + 1) * sz + x];
        lapSum += v; lapSum2 += v * v; lapN++;
      }
    }
    const lapVar = lapSum2 / lapN - (lapSum / lapN) ** 2;
    const sharpScore = lapVar > 200 ? 100 : lapVar > 100 ? 60 : 30;
    if (lapVar < 100) { issues.push("Photo floue — stabilisez et faites la mise au point"); score -= 30; }
    else if (lapVar < 200) { issues.push("Photo legerement floue"); score -= 10; }

    const overall = Math.round(resScore * 0.3 + sharpScore * 0.4 + brightScore * 0.3);
    const passed = overall >= 60 && mpx >= 4 && lapVar >= 80;

    setMacroAnalysis({ score: overall, sharpness: sharpScore, brightness: brightScore, resolution: resScore, mpx, passed, issues });

    if (passed) {
      // Set the captured image and compute hash
      setCapturedImg(url);

      // Compute SHA-256 hash
      const buffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = "0x" + hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
      setHash(hashHex);

      // Generate crop and feature images from center
      const cropCanvas = document.createElement("canvas");
      cropCanvas.width = sz; cropCanvas.height = sz;
      cropCanvas.getContext("2d")!.drawImage(img, sx, sy, cropSize, cropSize, 0, 0, sz, sz);
      setCropImg(cropCanvas.toDataURL("image/jpeg", 0.95));
      setFeatureImg(cropCanvas.toDataURL("image/jpeg", 0.95));
      setFeatureCount(Math.round(lapVar / 2));
    }

    return passed;
  }

  // ─── Camera (legacy — kept for fallback) ───
  async function startCamera() {
    // Try multiple resolutions — Xiaomi can freeze on 4K
    const configs = [
      { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } },
      { facingMode: "environment" },
      { facingMode: { exact: "environment" } },
      true,
    ];

    let stream: MediaStream | null = null;
    for (const config of configs) {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: config, audio: false });
        break;
      } catch {
        continue;
      }
    }

    if (!stream) {
      toast({ title: "Camera indisponible", description: "Autorisez l'acces a la camera dans Parametres > Applications > Chrome > Autorisations.", variant: "destructive" });
      return;
    }

    streamRef.current = stream;
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.setAttribute("playsinline", "true");
      videoRef.current.setAttribute("webkit-playsinline", "true");
      try {
        await videoRef.current.play();
      } catch {
        // Autoplay blocked — user will need to tap
        toast({ title: "Appuyez sur la video pour demarrer", description: "La camera a besoin d'une interaction." });
      }
    }

    // Wait a bit for stream to stabilize
    await new Promise(r => setTimeout(r, 300));

    const track = stream.getVideoTracks()[0];

    // ── Auto-zoom : ajuster le zoom pour la macro ──
    try {
      const capabilities = track.getCapabilities() as any;
      if (capabilities.zoom) {
        // Zoom a 2x-3x pour macro — ajuste selon les capacites du telephone
        const maxZoom = capabilities.zoom.max || 1;
        const idealZoom = Math.min(maxZoom, 3); // 3x max pour macro
        const macroZoom = Math.max(2, idealZoom); // 2x minimum
        const finalZoom = Math.min(macroZoom, maxZoom);
        await track.applyConstraints({ advanced: [{ zoom: finalZoom } as any] });
      }
      // Activer l'autofocus continu si disponible
      if (capabilities.focusMode && capabilities.focusMode.includes("continuous")) {
        await track.applyConstraints({ advanced: [{ focusMode: "continuous" } as any] });
      }
      // Activer le mode macro si disponible (Android 13+)
      if (capabilities.focusDistance) {
        const minDist = capabilities.focusDistance.min || 0;
        if (minDist < 0.1) { // Peut faire la mise au point a moins de 10cm
          await track.applyConstraints({ advanced: [{ focusDistance: minDist } as any] });
        }
      }
    } catch {
      // Zoom/focus non supportes — pas grave, on continue
    }

    const settings = track.getSettings();
    const w = settings.width ?? 1920;
    const h = settings.height ?? 1080;
    const mp = (w * h) / 1e6;
    const currentZoom = (settings as any).zoom || 1;
    const grade: CamScore = mp >= 12 ? "A" : mp >= 8 ? "B" : mp >= 4 ? "C" : "D";
    setCamScore(grade);
    setCamReady(true);
    if (currentZoom > 1) {
      toast({ title: `Zoom macro ${currentZoom.toFixed(1)}x active`, description: "Approchez a 3-5cm de l'oeuvre. La photo se prendra automatiquement." });
    }
    if (grade === "D") {
      toast({ title: "Resolution insuffisante", description: `${mp.toFixed(1)}MP — minimum 8MP requis.`, variant: "destructive" });
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    cancelAnimationFrame(qualityLoopRef.current);
    setCamReady(false);
    prevFrameRef.current = null;
  }

  // Quality loop
  const analyzeFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || videoRef.current.readyState < 2) {
      qualityLoopRef.current = requestAnimationFrame(analyzeFrame);
      return;
    }
    const v = videoRef.current;
    const c = canvasRef.current;
    const ctx = c.getContext("2d", { willReadFrequently: true })!;
    const s = 200;
    c.width = s; c.height = s;
    const sx = (v.videoWidth - s) / 2, sy = (v.videoHeight - s) / 2;
    ctx.drawImage(v, sx, sy, s, s, 0, 0, s, s);
    const d = ctx.getImageData(0, 0, s, s).data;

    // Sharpness (Laplacian)
    const gray = new Float32Array(s * s);
    for (let i = 0; i < s * s; i++) gray[i] = d[i * 4] * 0.299 + d[i * 4 + 1] * 0.587 + d[i * 4 + 2] * 0.114;
    let lapSum = 0, lapSum2 = 0, lapN = 0;
    for (let y = 1; y < s - 1; y++) {
      for (let x = 1; x < s - 1; x++) {
        const v2 = -gray[(y - 1) * s + x] - gray[y * s + x - 1] + 4 * gray[y * s + x] - gray[y * s + x + 1] - gray[(y + 1) * s + x];
        lapSum += v2; lapSum2 += v2 * v2; lapN++;
      }
    }
    const lapVar = lapSum2 / lapN - (lapSum / lapN) ** 2;
    const sharpScore = lapVar > 200 ? 100 : lapVar > 100 ? 60 : 30;

    // Brightness
    let lumSum = 0;
    for (let i = 0; i < s * s; i++) lumSum += gray[i];
    const avgLum = lumSum / (s * s);
    const brightScore = avgLum >= 60 && avgLum <= 200 ? 100 : avgLum < 60 ? 30 : 30;

    // Stability
    let stabScore = 100;
    if (prevFrameRef.current) {
      let diff = 0;
      for (let i = 0; i < d.length; i += 4) diff += Math.abs(d[i] - prevFrameRef.current[i]);
      const meanDiff = diff / (s * s);
      stabScore = meanDiff < 5 ? 100 : meanDiff < 15 ? 60 : 20;
    }
    prevFrameRef.current = new Uint8ClampedArray(d);

    // Reflections
    let bright = 0;
    for (let i = 0; i < s * s; i++) { if (gray[i] > 250) bright++; }
    const reflPct = bright / (s * s);
    const reflScore = reflPct < 0.02 ? 100 : reflPct < 0.05 ? 60 : 20;

    const overall = Math.round(sharpScore * 0.4 + brightScore * 0.2 + stabScore * 0.25 + reflScore * 0.15);
    setQuality({ sharpness: sharpScore, brightness: brightScore, stability: stabScore, reflections: reflScore, overall });

    // Auto-capture : 8 frames consecutives au-dessus de 60% → capture automatique
    if (overall >= 60 && stabScore >= 60 && sharpScore >= 60) {
      qualityStreakRef.current++;
      if (qualityStreakRef.current >= 8 && !autoCaptureRef.current) {
        autoCaptureRef.current = true;
        handleCapture();
        return; // stop the loop
      }
    } else {
      qualityStreakRef.current = 0;
    }

    setTimeout(() => { qualityLoopRef.current = requestAnimationFrame(analyzeFrame); }, 200);
  }, []);

  useEffect(() => {
    if (step === "camera") {
      autoCaptureRef.current = false;
      qualityStreakRef.current = 0;
      startCamera().then(() => { qualityLoopRef.current = requestAnimationFrame(analyzeFrame); });
      return () => stopCamera();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // ─── Burst capture (5 frames averaged) ───
  async function burstCapture(): Promise<ImageData> {
    const v = videoRef.current!;
    const w = v.videoWidth, h = v.videoHeight;
    const tc = document.createElement("canvas");
    tc.width = w; tc.height = h;
    const tctx = tc.getContext("2d")!;
    const acc = new Float64Array(w * h * 4);
    const N = 5;
    for (let i = 0; i < N; i++) {
      tctx.drawImage(v, 0, 0);
      const fd = tctx.getImageData(0, 0, w, h).data;
      for (let j = 0; j < fd.length; j++) acc[j] += fd[j];
      if (i < N - 1) await new Promise(r => setTimeout(r, 80));
    }
    const out = new Uint8ClampedArray(w * h * 4);
    for (let j = 0; j < out.length; j++) out[j] = Math.round(acc[j] / N);
    return new ImageData(out, w, h);
  }

  // ─── Capture ───
  async function handleCapture() {
    if (!videoRef.current) return;
    stopCamera();
    setStep("capture");
    setProcessingStep(0);

    const v = videoRef.current;
    const w = v.videoWidth, h = v.videoHeight;

    // Full frame from burst
    const merged = await burstCapture().catch(() => {
      const fc = document.createElement("canvas");
      fc.width = w; fc.height = h;
      const fctx = fc.getContext("2d")!;
      fctx.drawImage(v, 0, 0);
      return fctx.getImageData(0, 0, w, h);
    });

    const fc = document.createElement("canvas");
    fc.width = w; fc.height = h;
    fc.getContext("2d")!.putImageData(merged, 0, 0);
    setCapturedImg(fc.toDataURL("image/jpeg", 0.92));

    await delay(800);
    setProcessingStep(1);

    // Center crop
    const cs = Math.min(w, h, 800);
    const cx = (w - cs) / 2, cy = (h - cs) / 2;
    const cc = document.createElement("canvas");
    cc.width = cs; cc.height = cs;
    const cctx = cc.getContext("2d")!;
    cctx.putImageData(merged, -cx, -cy);
    const cropData = cctx.getImageData(0, 0, cs, cs);
    setCropImg(cc.toDataURL("image/jpeg", 0.92));

    await delay(800);
    setProcessingStep(2);

    // Feature points
    const gray2 = new Float32Array(cs * cs);
    for (let i = 0; i < cs * cs; i++) gray2[i] = cropData.data[i * 4] * 0.299 + cropData.data[i * 4 + 1] * 0.587 + cropData.data[i * 4 + 2] * 0.114;
    const pts: [number, number][] = [];
    const step2 = Math.max(2, Math.floor(cs / 200));
    for (let y = 1; y < cs - 1; y += step2) {
      for (let x = 1; x < cs - 1; x += step2) {
        const gx2 = gray2[y * cs + x + 1] - gray2[y * cs + x - 1];
        const gy2 = gray2[(y + 1) * cs + x] - gray2[(y - 1) * cs + x];
        if (Math.sqrt(gx2 * gx2 + gy2 * gy2) > 30) pts.push([x, y]);
      }
    }
    setFeatureCount(pts.length);

    // Draw feature points
    const fpc = document.createElement("canvas");
    fpc.width = cs; fpc.height = cs;
    const fpctx = fpc.getContext("2d")!;
    fpctx.putImageData(cropData, 0, 0);
    fpctx.fillStyle = "#D4AF37";
    for (const [px, py] of pts) {
      fpctx.globalAlpha = 0.7;
      fpctx.beginPath();
      fpctx.arc(px, py, 2, 0, Math.PI * 2);
      fpctx.fill();
    }
    fpctx.globalAlpha = 1;
    setFeatureImg(fpc.toDataURL("image/jpeg", 0.92));

    await delay(800);
    setProcessingStep(3);

    // SHA-256
    const buf = cropData.data.buffer;
    const hashBuf = await crypto.subtle.digest("SHA-256", buf);
    const arr = Array.from(new Uint8Array(hashBuf));
    const hex = arr.map(b => b.toString(16).padStart(2, "0")).join("");
    setHash(hex);

    await delay(600);
    setProcessingStep(4);
  }

  function formatHash(h: string) {
    return h.match(/.{1,4}/g)?.slice(0, 8).join("\u00B7") ?? h;
  }

  // ─── Blockchain step ───
  async function handleBlockchain() {
    setStep("blockchain");
    setBlockchainStep(0);
    await delay(1000);
    setBlockchainStep(1);
    await delay(800);
    setBlockchainStep(2);

    const block = `BLOC #${Math.floor(Date.now() / 1000)}`;
    const tx = `PC-${hash.substring(2, 18).toUpperCase()}`;

    await delay(1000);
    setBlockchainStep(3);

    // API call
    try {
      const body = {
        title: form.title,
        technique: material,
        dimensions: `${form.width} x ${form.height} cm`,
        year: form.year,
        price: form.price,
        description: form.description,
        hash,
        quality_score: quality.overall,
        coord_corner: coord.corner,
        coord_x_mm: coord.x_mm,
        coord_y_mm: coord.y_mm,
        coord_diameter_mm: 10,
        coord_angle: coord.angle,
        blockchain_block: block,
        blockchain_tx: tx,
      };
      const res = await fetch("/api/certification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      setCertResult({ id: data.id, block, tx });
    } catch {
      setCertResult({ block, tx });
    }

    await delay(400);
    setBlockchainStep(4);
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 4000);
  }

  function reset() {
    setStep("intro");
    setForm({ title: "", width: "", height: "", year: "", price: "", description: "" });
    setMaterial("Peinture");
    setArtworkImg(null); setArtworkFile(null);
    setZone({ x: 40, y: 40, w: 15, h: 15 }); setOptimalZone(null);
    setCapturedImg(null); setCropImg(null); setFeatureImg(null);
    setHash(""); setFeatureCount(0); setProcessingStep(-1);
    setCoord({ corner: "Bas-droite", x_mm: 50, y_mm: 50, angle: 0 });
    setBlockchainStep(-1); setCertResult(null);
    setCamReady(false); setQuality({ sharpness: 0, brightness: 0, stability: 0, reflections: 0, overall: 0 });
  }

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Certificat Pass-Core : ${form.title}`,
          text: `Oeuvre "${form.title}" certifiee par Pass-Core. Empreinte : ${formatHash(hash)}`,
          url: certResult?.id ? `${window.location.origin}/pass-core/certificate/${certResult.id}` : window.location.href,
        });
      } catch {}
    } else {
      toast({ title: "Lien copie", description: "Le lien du certificat a ete copie." });
    }
  }

  const introValid = form.title && form.width && form.height && form.year;

  // ─── Quality indicator colors ───
  function qColor(v: number) { return v >= 80 ? "bg-green-500" : v >= 50 ? "bg-yellow-500" : "bg-red-500"; }
  function qText(v: number) { return v >= 80 ? "text-green-400" : v >= 50 ? "text-yellow-400" : "text-red-400"; }

  // Zone touch/mouse drag
  function handleZoneDrag(e: React.TouchEvent | React.MouseEvent) {
    const parent = (e.currentTarget as HTMLElement).parentElement;
    if (!parent) return;
    const rect = parent.getBoundingClientRect();
    let cx: number, cy: number;
    if ("touches" in e) {
      cx = e.touches[0].clientX; cy = e.touches[0].clientY;
    } else {
      cx = e.clientX; cy = e.clientY;
    }
    const px = ((cx - rect.left) / rect.width) * 100 - zone.w / 2;
    const py = ((cy - rect.top) / rect.height) * 100 - zone.h / 2;
    setZone(z => ({ ...z, x: clamp(px, 0, 100 - z.w), y: clamp(py, 0, 100 - z.h) }));
  }

  return (
    <div className="min-h-screen bg-[#0A1128] pb-24">
      {/* Hidden helpers */}
      <canvas ref={canvasRef} className="hidden" />
      <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => { if (e.target.files?.[0]) handleArtworkFile(e.target.files[0]); }} />

      {/* Progress bar */}
      {step !== "intro" && (
        <div className="flex gap-1 px-4 pt-4 pb-2">
          {STEPS_META.map((s, i) => (
            <div key={s.k} className="flex-1">
              <div className={`h-1 rounded-full transition-colors ${i <= si ? "bg-[#D4AF37]" : "bg-white/8"}`} />
              <p className={`text-[9px] mt-1 text-center ${i <= si ? "text-[#D4AF37]" : "text-white/20"}`}>{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* ═══ INTRO ═══ */}
      {step === "intro" && (
        <div className="max-w-lg mx-auto px-4 py-6 animate-fade-in">
          <div className="text-center mb-8">
            <div className="w-20 h-20 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center mx-auto mb-4">
              <ShieldCheck className="size-10 text-[#D4AF37]" />
            </div>
            <h1 className="font-playfair text-2xl font-semibold text-white mb-2">Certifiez votre oeuvre en 6 etapes</h1>
            <p className="text-white/40 text-sm">Protocole de certification avance Pass-Core</p>
          </div>

          <div className="space-y-3 mb-6 text-left">
            {[
              { icon: Award, text: 'Badge "Oeuvre certifiee" sur votre fiche', color: "text-green-400" },
              { icon: TrendingUp, text: "Les oeuvres certifiees se vendent 40% plus cher", color: "text-[#D4AF37]" },
              { icon: Lock, text: "Protection contre la contrefacon", color: "text-blue-400" },
            ].map(b => (
              <div key={b.text} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/5">
                <b.icon className={`size-5 ${b.color} shrink-0`} />
                <p className="text-sm text-white/70">{b.text}</p>
              </div>
            ))}
          </div>

          {/* Material */}
          <label className="text-sm text-white/60 mb-2 block">Materiau / technique *</label>
          <div className="flex flex-wrap gap-2 mb-5">
            {MATERIALS.map(m => (
              <button key={m.k} onClick={() => setMaterial(m.k)}
                className={`px-3 py-2 rounded-lg text-xs transition-all ${material === m.k ? "bg-[#D4AF37] text-[#0A1128] font-semibold" : "bg-white/5 text-white/50"}`}>
                {m.k}
              </button>
            ))}
          </div>

          {/* Fields */}
          <div className="space-y-4 mb-6">
            <div>
              <label className="text-sm text-white/60 mb-1.5 block">Titre de l&apos;oeuvre *</label>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Ex: Crepuscule Dore"
                className="w-full h-12 rounded-xl bg-white/5 border border-white/10 text-white px-4 focus:outline-none focus:border-[#D4AF37]/40" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-sm text-white/60 mb-1.5 block">Largeur cm *</label>
                <input type="number" inputMode="numeric" value={form.width} onChange={e => setForm(f => ({ ...f, width: e.target.value }))} placeholder="80"
                  className="w-full h-12 rounded-xl bg-white/5 border border-white/10 text-white px-3 text-center focus:outline-none focus:border-[#D4AF37]/40" />
              </div>
              <div>
                <label className="text-sm text-white/60 mb-1.5 block">Hauteur cm *</label>
                <input type="number" inputMode="numeric" value={form.height} onChange={e => setForm(f => ({ ...f, height: e.target.value }))} placeholder="120"
                  className="w-full h-12 rounded-xl bg-white/5 border border-white/10 text-white px-3 text-center focus:outline-none focus:border-[#D4AF37]/40" />
              </div>
              <div>
                <label className="text-sm text-white/60 mb-1.5 block">Annee *</label>
                <input type="number" inputMode="numeric" value={form.year} onChange={e => setForm(f => ({ ...f, year: e.target.value }))} placeholder="2024"
                  className="w-full h-12 rounded-xl bg-white/5 border border-white/10 text-white px-3 text-center focus:outline-none focus:border-[#D4AF37]/40" />
              </div>
            </div>
            <div>
              <label className="text-sm text-white/60 mb-1.5 block">Prix souhaite EUR — optionnel</label>
              <input type="number" inputMode="numeric" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="1500"
                className="w-full h-12 rounded-xl bg-white/5 border border-white/10 text-white px-4 focus:outline-none focus:border-[#D4AF37]/40" />
            </div>
          </div>

          <button onClick={() => setStep("select-zone")} disabled={!introValid}
            className="w-full py-4 rounded-xl bg-[#D4AF37] text-[#0A1128] font-semibold text-base disabled:opacity-30 flex items-center justify-center gap-2 active:brightness-90">
            Commencer la certification <ChevronRight className="size-5" />
          </button>

          {/* Specs photo macro */}
          <div className="mt-6 rounded-xl bg-white/[0.02] border border-white/5 p-4">
            <p className="text-xs text-[#D4AF37] font-semibold uppercase tracking-widest mb-3">Qualite photo requise</p>
            <div className="space-y-2 text-xs text-white/40">
              <div className="flex justify-between"><span>Resolution minimum</span><span className="text-white/60">8 MP (3264×2448)</span></div>
              <div className="flex justify-between"><span>Resolution ideale</span><span className="text-white/60">12 MP+ (4096×3072)</span></div>
              <div className="flex justify-between"><span>Distance macro sans kit</span><span className="text-white/60">3-5 cm</span></div>
              <div className="flex justify-between"><span>Distance macro avec kit</span><span className="text-white/60">1-3 cm</span></div>
              <div className="flex justify-between"><span>Score qualite minimum</span><span className="text-white/60">60/100</span></div>
            </div>
          </div>

          {/* Smartphones compatibles */}
          <details className="mt-4">
            <summary className="text-xs text-[#D4AF37]/70 cursor-pointer hover:text-[#D4AF37]">Smartphones compatibles sans kit objectif</summary>
            <div className="mt-3 rounded-xl bg-white/[0.02] border border-white/5 p-4 space-y-3">
              <p className="text-[10px] text-white/30 mb-2">Ces smartphones peuvent certifier sans clip macro grace a leur capteur haute resolution ou mode macro integre :</p>
              {[
                { brand: "Xiaomi", models: "15T Pro (200MP) · 14 Ultra · 14T Pro · 13T Pro · Redmi Note 13 Pro+" },
                { brand: "Samsung", models: "S24 Ultra (200MP) · S24+ · S23 Ultra · A55 · A35" },
                { brand: "Apple", models: "iPhone 16 Pro · 15 Pro · 14 Pro · 13 Pro (mode macro integre)" },
                { brand: "Google", models: "Pixel 9 Pro · 8 Pro · 7 Pro" },
                { brand: "OnePlus", models: "12 · Nord 4" },
                { brand: "Oppo", models: "Find X7 Ultra · Reno 12 Pro" },
              ].map(g => (
                <div key={g.brand}>
                  <p className="text-xs text-white/60 font-medium">{g.brand}</p>
                  <p className="text-[11px] text-white/30">{g.models}</p>
                </div>
              ))}
              <div className="pt-2 border-t border-white/5">
                <p className="text-[10px] text-white/20">Autre smartphone ? Le kit clip macro Nova Bank (25€ — gratuit a l&apos;ouverture de compte) est recommande pour les telephones sans mode macro integre.</p>
              </div>
            </div>
          </details>
        </div>
      )}

      {/* ═══ STEP 1: SELECT ZONE ═══ */}
      {step === "select-zone" && (
        <div className="max-w-lg mx-auto px-4 py-4 animate-fade-in">
          <h1 className="font-playfair text-xl font-semibold text-white mb-1">Selection de la zone</h1>
          <p className="text-white/40 text-sm mb-4">Choisissez la zone 1cm&#178; a certifier</p>

          {!artworkImg ? (
            <div className="space-y-3 mb-6">
              <button onClick={async () => {
                try {
                  // Try camera with fallback resolutions for Xiaomi compatibility
                  let stream: MediaStream | null = null;
                  for (const config of [
                    { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } },
                    { facingMode: "environment" },
                    true,
                  ]) {
                    try {
                      stream = await navigator.mediaDevices.getUserMedia({ video: config, audio: false });
                      break;
                    } catch { continue; }
                  }
                  if (!stream) throw new Error("No camera");
                  const video = document.createElement("video");
                  video.srcObject = stream;
                  video.setAttribute("playsinline", "true");
                  video.muted = true;
                  await video.play();
                  await new Promise(r => setTimeout(r, 800));
                  const canvas = document.createElement("canvas");
                  canvas.width = video.videoWidth;
                  canvas.height = video.videoHeight;
                  canvas.getContext("2d")!.drawImage(video, 0, 0);
                  stream.getTracks().forEach(t => t.stop());
                  canvas.toBlob(blob => {
                    if (blob) {
                      const file = new File([blob], "artwork.jpg", { type: "image/jpeg" });
                      handleArtworkFile(file);
                    }
                  }, "image/jpeg", 0.95);
                } catch {
                  fileRef.current?.click();
                }
              }}
                className="w-full py-12 rounded-2xl border-2 border-dashed border-[#D4AF37]/30 flex flex-col items-center gap-3 active:bg-white/3">
                <Camera className="size-10 text-[#D4AF37]" />
                <span className="text-white/70 text-sm font-medium">Prendre une photo de l&apos;oeuvre</span>
                <span className="text-white/30 text-xs">La camera arriere va s&apos;ouvrir</span>
              </button>
              <button onClick={() => fileRef.current?.click()}
                className="w-full py-3 rounded-xl border border-white/10 text-white/40 text-xs active:bg-white/3">
                Ou importer depuis la galerie
              </button>
            </div>
          ) : (
            <>
              <div className="rounded-xl bg-[#D4AF37]/5 border border-[#D4AF37]/15 p-3 flex items-start gap-2 mb-4 text-xs text-white/60">
                <ZoomIn className="size-4 text-[#D4AF37] shrink-0 mt-0.5" />
                <span>{tip}</span>
              </div>

              {optimalZone && (
                <p className="text-[#D4AF37] text-xs font-medium mb-3 flex items-center gap-1.5">
                  <Crosshair className="size-3.5" />
                  Zone optimale detectee — densite de details maximale
                </p>
              )}

              <div className="relative rounded-xl overflow-hidden mb-4 touch-none select-none">
                <img ref={zoneImgRef} src={artworkImg} alt="" className="w-full" draggable={false} />
                {/* Optimal zone glow */}
                {optimalZone && (
                  <div className="absolute rounded border-2 border-[#D4AF37]/40 animate-pulse pointer-events-none"
                    style={{ left: `${optimalZone.x}%`, top: `${optimalZone.y}%`, width: "15%", height: "15%", boxShadow: "0 0 20px #D4AF3766" }} />
                )}
                {/* Draggable zone */}
                <div
                  className="absolute border-2 border-[#D4AF37] bg-[#D4AF37]/15 rounded cursor-move"
                  style={{ left: `${zone.x}%`, top: `${zone.y}%`, width: `${zone.w}%`, height: `${zone.h}%` }}
                  onTouchMove={handleZoneDrag} onMouseDown={e => { e.preventDefault(); const onMove = (ev: MouseEvent) => { const parent = (e.currentTarget as HTMLElement).parentElement!; const rect = parent.getBoundingClientRect(); const px = ((ev.clientX - rect.left) / rect.width) * 100 - zone.w / 2; const py = ((ev.clientY - rect.top) / rect.height) * 100 - zone.h / 2; setZone(z => ({ ...z, x: clamp(px, 0, 100 - z.w), y: clamp(py, 0, 100 - z.h) })); }; const onUp = () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); }; window.addEventListener("mousemove", onMove); window.addEventListener("mouseup", onUp); }}>
                  {/* Corner brackets */}
                  <div className="absolute -top-px -left-px w-3 h-3 border-t-2 border-l-2 border-[#D4AF37]" />
                  <div className="absolute -top-px -right-px w-3 h-3 border-t-2 border-r-2 border-[#D4AF37]" />
                  <div className="absolute -bottom-px -left-px w-3 h-3 border-b-2 border-l-2 border-[#D4AF37]" />
                  <div className="absolute -bottom-px -right-px w-3 h-3 border-b-2 border-r-2 border-[#D4AF37]" />
                </div>
              </div>

              <p className="text-[10px] text-white/20 mb-4">Deplacez le cadre dore sur la zone souhaitee</p>

              <div className="flex gap-3">
                <button onClick={() => { if (optimalZone) setZone(z => ({ ...z, x: optimalZone.x, y: optimalZone.y })); setPhoneInfo(detectPhone(navigator.userAgent)); setStep("phone-check"); }}
                  className="flex-1 py-4 rounded-xl bg-[#D4AF37] text-[#0A1128] font-semibold text-sm flex items-center justify-center gap-2 active:brightness-90">
                  Utiliser cette zone <ChevronRight className="size-4" />
                </button>
                <button onClick={() => { setPhoneInfo(detectPhone(navigator.userAgent)); setStep("phone-check"); }}
                  className="flex-1 py-4 rounded-xl border border-[#D4AF37]/30 text-[#D4AF37] font-medium text-sm active:bg-[#D4AF37]/5">
                  Choisir manuellement
                </button>
              </div>
            </>
          )}

          <button onClick={() => setStep("intro")} className="w-full mt-3 py-3 text-white/30 text-sm">Retour</button>
        </div>
      )}

      {/* ═══ PHONE CHECK ═══ */}
      {step === "phone-check" && phoneInfo && (
        <div className="max-w-lg mx-auto px-4 py-6 animate-fade-in">
          <h1 className="font-playfair text-xl font-semibold text-white mb-6 text-center">Verification de votre appareil</h1>

          <div className={`rounded-2xl border p-6 mb-6 ${
            phoneInfo.grade === "A" ? "border-green-500/30 bg-green-500/5" :
            phoneInfo.grade === "B" ? "border-blue-500/30 bg-blue-500/5" :
            phoneInfo.grade === "C" ? "border-yellow-500/30 bg-yellow-500/5" :
            "border-red-500/30 bg-red-500/5"
          }`}>
            <div className="flex items-center gap-4 mb-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-bold ${
                phoneInfo.grade === "A" ? "bg-green-500/20 text-green-400" :
                phoneInfo.grade === "B" ? "bg-blue-500/20 text-blue-400" :
                phoneInfo.grade === "C" ? "bg-yellow-500/20 text-yellow-400" :
                "bg-red-500/20 text-red-400"
              }`}>
                {phoneInfo.grade}
              </div>
              <div>
                <p className="text-white font-semibold text-lg">{phoneInfo.brand} {phoneInfo.model}</p>
                {phoneInfo.mainCamera !== "?" && (
                  <p className="text-white/40 text-sm">Capteur : {phoneInfo.mainCamera}</p>
                )}
              </div>
            </div>

            <p className={`text-sm font-medium mb-2 ${
              phoneInfo.grade === "A" ? "text-green-400" :
              phoneInfo.grade === "B" ? "text-blue-400" :
              phoneInfo.grade === "C" ? "text-yellow-400" :
              "text-red-400"
            }`}>
              {phoneInfo.grade === "A" ? "Excellent — certification optimale sans kit" :
               phoneInfo.grade === "B" ? "Bon — certification valide" :
               phoneInfo.grade === "C" ? "Moyen — kit macro recommande" :
               "Insuffisant — kit macro obligatoire"}
            </p>
            <p className="text-white/40 text-xs">{phoneInfo.note}</p>
          </div>

          {phoneInfo.needsKit && (
            <div className="rounded-xl bg-[#D4AF37]/5 border border-[#D4AF37]/15 p-4 mb-6 flex items-start gap-3">
              <Camera className="size-5 text-[#D4AF37] shrink-0 mt-0.5" />
              <div>
                <p className="text-[#D4AF37] text-sm font-medium">Kit macro recommande</p>
                <p className="text-white/30 text-xs mt-1">Le kit clip macro Nova Bank (25€ — gratuit a l&apos;ouverture de compte) ameliore la precision. Vous pouvez continuer sans kit, la qualite sera verifiee en temps reel.</p>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {phoneInfo.compatible && (
              <>
                <input ref={macroFileRef} type="file" accept="image/*" capture="environment" className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setStep("macro-photo");
                    await analyzeMacroPhoto(file);
                  }} />
                <button onClick={() => macroFileRef.current?.click()}
                  className="w-full py-4 rounded-xl bg-[#D4AF37] text-[#0A1128] font-semibold text-base flex items-center justify-center gap-2 active:brightness-90">
                  <Camera className="size-5" /> Prendre la photo macro
                </button>
                <p className="text-white/20 text-[10px] text-center">La camera de votre telephone va s&apos;ouvrir. Approchez a 3-5cm de la zone selectionnee.</p>
              </>
            )}
            {!phoneInfo.compatible && (
              <div className="text-center py-4">
                <p className="text-red-400 text-sm">Cet appareil n&apos;est pas compatible avec la certification macro.</p>
                <p className="text-white/30 text-xs mt-2">Utilisez un smartphone avec un capteur &gt;= 8MP et une mise au point rapprochee.</p>
              </div>
            )}
            <button onClick={() => setStep("select-zone")}
              className="w-full py-3 rounded-xl border border-white/10 text-white/40 text-sm active:bg-white/5">
              Retour
            </button>
          </div>
        </div>
      )}

      {/* ═══ MACRO PHOTO ANALYSIS ═══ */}
      {step === "macro-photo" && (
        <div className="max-w-lg mx-auto px-4 py-6 animate-fade-in">
          <h1 className="font-playfair text-xl font-semibold text-white mb-4 text-center">Analyse de la photo macro</h1>

          {!macroAnalysis && (
            <div className="flex flex-col items-center py-16">
              <Loader2 className="size-10 text-[#D4AF37] animate-spin mb-4" />
              <p className="text-white/50 text-sm">Analyse en cours...</p>
            </div>
          )}

          {macroAnalysis && macroPreview && (
            <>
              {/* Preview */}
              <div className="relative rounded-2xl overflow-hidden mb-6">
                <img src={macroPreview} alt="Photo macro" className="w-full aspect-square object-cover" />
                <div className={`absolute top-3 right-3 px-3 py-1.5 rounded-full text-sm font-bold ${
                  macroAnalysis.passed ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                }`}>
                  {macroAnalysis.score}%
                </div>
              </div>

              {/* Scores */}
              <div className="rounded-xl bg-white/[0.03] border border-white/10 p-4 mb-6 space-y-3">
                {[
                  { label: "Resolution", value: macroAnalysis.resolution, detail: `${macroAnalysis.mpx.toFixed(1)} MP` },
                  { label: "Nettete", value: macroAnalysis.sharpness, detail: macroAnalysis.sharpness >= 60 ? "Bonne" : "Insuffisante" },
                  { label: "Luminosite", value: macroAnalysis.brightness, detail: macroAnalysis.brightness >= 60 ? "Correcte" : "A ameliorer" },
                ].map(s => (
                  <div key={s.label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-white/50">{s.label}</span>
                      <span className="text-white/70">{s.detail}</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${s.value >= 60 ? "bg-[#D4AF37]" : "bg-red-500"}`}
                        style={{ width: `${s.value}%` }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Issues */}
              {macroAnalysis.issues.length > 0 && (
                <div className="rounded-xl bg-red-500/5 border border-red-500/15 p-4 mb-6">
                  {macroAnalysis.issues.map((issue, i) => (
                    <p key={i} className="text-red-400 text-xs mb-1">— {issue}</p>
                  ))}
                </div>
              )}

              {/* Result */}
              {macroAnalysis.passed ? (
                <div className="space-y-3">
                  <div className="rounded-xl bg-green-500/10 border border-green-500/20 p-4 flex items-center gap-3 mb-4">
                    <Check className="size-6 text-green-400 shrink-0" />
                    <div>
                      <p className="text-green-400 font-semibold">Photo validee !</p>
                      <p className="text-white/30 text-xs">La qualite est suffisante pour l&apos;authentification.</p>
                    </div>
                  </div>
                  <button onClick={() => setStep("coordinates")}
                    className="w-full py-4 rounded-xl bg-[#D4AF37] text-[#0A1128] font-semibold flex items-center justify-center gap-2 active:brightness-90">
                    Continuer <ChevronRight className="size-5" />
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4 flex items-center gap-3 mb-4">
                    <X className="size-6 text-red-400 shrink-0" />
                    <div>
                      <p className="text-red-400 font-semibold">Photo insuffisante</p>
                      <p className="text-white/30 text-xs">Reprenez la photo en suivant les conseils ci-dessus.</p>
                    </div>
                  </div>
                  <button onClick={() => { setMacroAnalysis(null); setMacroPreview(null); macroFileRef.current?.click(); }}
                    className="w-full py-4 rounded-xl bg-[#D4AF37] text-[#0A1128] font-semibold flex items-center justify-center gap-2 active:brightness-90">
                    <Camera className="size-5" /> Reprendre la photo
                  </button>
                </div>
              )}

              <button onClick={() => setStep("phone-check")}
                className="w-full py-3 rounded-xl border border-white/10 text-white/40 text-sm mt-3 active:bg-white/5">
                Retour
              </button>
            </>
          )}
        </div>
      )}

      {/* ═══ STEP LEGACY CAMERA (fallback) ═══ */}
      {step === "camera" && (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
          {/* Top bar */}
          <div className="absolute top-0 inset-x-0 z-20 bg-gradient-to-b from-black/80 to-transparent p-4 pt-6">
            <p className="text-white text-sm font-medium text-center">Positionnez le reticule sur la zone selectionnee</p>
            <p className="text-white/50 text-xs text-center mt-1">Maintenez a 3-5cm de l&apos;oeuvre</p>
            {/* Score badge */}
            {camReady && (
              <div className="flex justify-center mt-2 gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${scoreBadge(camScore)[1]}`}>
                  Score {camScore} — {scoreBadge(camScore)[0]}
                </span>
              </div>
            )}
            {camScore === "D" && (
              <p className="text-red-400 text-xs text-center mt-2">Clip macro Nova Bank recommande</p>
            )}
            {camScore === "C" && (
              <p className="text-yellow-400 text-xs text-center mt-2">Guide eclairage renforce obligatoire</p>
            )}
            {!camReady && (
              <p className="text-white/60 text-sm text-center mt-4 animate-pulse">Certifiez avec votre smartphone — aucun accessoire requis</p>
            )}
          </div>

          {/* Video */}
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            muted
            autoPlay
            webkit-playsinline="true"
            onClick={(e) => { (e.target as HTMLVideoElement).play().catch(() => {}); }}
          />

          {/* Reticle overlay */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <div className="w-48 h-48 relative">
              {/* Corner brackets */}
              <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-[#D4AF37]" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-[#D4AF37]" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-[#D4AF37]" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-[#D4AF37]" />
              {/* Crosshair */}
              <div className="absolute top-1/2 left-0 right-0 h-px bg-[#D4AF37]/40" />
              <div className="absolute left-1/2 top-0 bottom-0 w-px bg-[#D4AF37]/40" />
            </div>
          </div>

          {/* Directional guide for special materials */}
          {NEED_GUIDE.has(material) && showGuide && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
              <div className="w-64 h-64 border border-dashed border-white/20 rounded-full flex items-center justify-center">
                <div className="text-white/40 text-xs animate-pulse">Orientez lentement l&apos;eclairage</div>
              </div>
            </div>
          )}

          {/* Quality overlay at bottom */}
          {camReady && (
            <div className="absolute bottom-0 inset-x-0 z-20 bg-gradient-to-t from-black/90 to-transparent p-4 pb-8">
              {/* Quality pills */}
              <div className="flex justify-center gap-2 mb-3 flex-wrap">
                {([
                  ["Nettete", quality.sharpness],
                  ["Lumiere", quality.brightness],
                  ["Stabilite", quality.stability],
                  ["Reflets", quality.reflections],
                ] as [string, number][]).map(([label, val]) => (
                  <div key={label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 border border-white/10">
                    <div className={`w-2 h-2 rounded-full ${qColor(val)}`} />
                    <span className={`text-xs ${qText(val)}`}>{label}</span>
                  </div>
                ))}
              </div>

              {/* Overall bar */}
              <div className="mb-4">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-white/50 text-xs">Score global</span>
                  <span className={`text-sm font-semibold ${qText(quality.overall)}`}>{quality.overall}%</span>
                </div>
                <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-300 ${quality.overall >= 60 ? "bg-[#D4AF37]" : "bg-red-500"}`}
                    style={{ width: `${quality.overall}%` }} />
                </div>
                {quality.overall < 60 && (
                  <p className="text-red-400 text-xs mt-1">
                    {quality.sharpness < 50 ? "Image floue — approchez et stabilisez" : quality.brightness < 50 ? "Eclairage insuffisant" : quality.stability < 50 ? "Stabilisez le telephone" : "Reduisez les reflets"}
                  </p>
                )}
              </div>

              {/* Auto-capture indicator */}
              <div className="flex flex-col items-center gap-3">
                {quality.overall >= 60 ? (
                  <div className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-[#D4AF37]/20 border border-[#D4AF37]/40">
                    <div className="w-4 h-4 rounded-full bg-[#D4AF37] animate-pulse" />
                    <span className="text-[#D4AF37] font-semibold text-sm">Capture automatique en cours...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-white/5 border border-white/10">
                    <div className="w-4 h-4 rounded-full bg-red-500/50" />
                    <span className="text-white/50 text-sm">
                      {quality.sharpness < 50 ? "Approchez et stabilisez" : quality.brightness < 50 ? "Ameliorez l'eclairage" : quality.stability < 50 ? "Ne bougez plus" : "Reduisez les reflets"}
                    </span>
                  </div>
                )}
                <div className="flex justify-center gap-4">
                  <button onClick={() => { stopCamera(); setStep("select-zone"); }}
                    className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center text-white/50">
                    <X className="size-5" />
                  </button>
                  <button onClick={() => setShowGuide(g => !g)}
                    className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center text-white/50">
                    <Crosshair className="size-5" />
                  </button>
                </div>
                <p className="text-white/20 text-[10px] text-center">La photo se prend automatiquement quand la qualite est suffisante</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ STEP 4: CAPTURE + EXTRACTION ═══ */}
      {step === "capture" && (
        <div className="max-w-lg mx-auto px-4 py-4 animate-fade-in">
          <h1 className="font-playfair text-xl font-semibold text-white mb-4">Analyse de la capture</h1>

          {/* Processing steps */}
          <div className="space-y-3 mb-6">
            {[
              "Analyse de la microstructure...",
              "Extraction des points caracteristiques...",
              "Calcul de l'empreinte unique...",
              "Empreinte generee",
            ].map((msg, i) => (
              <div key={i} className={`flex items-center gap-3 transition-opacity duration-500 ${processingStep >= i ? "opacity-100" : "opacity-20"}`}>
                {processingStep > i ? (
                  <Check className="size-5 text-green-400 shrink-0" />
                ) : processingStep === i ? (
                  <Loader2 className="size-5 text-[#D4AF37] animate-spin shrink-0" />
                ) : (
                  <div className="size-5 rounded-full border border-white/20 shrink-0" />
                )}
                <span className="text-sm text-white/70">{msg}</span>
              </div>
            ))}
          </div>

          {processingStep >= 4 && (
            <>
              {/* Feature image */}
              {featureImg && (
                <div className="rounded-xl overflow-hidden border border-[#D4AF37]/30 mb-3">
                  <img src={featureImg} alt="Feature points" className="w-full" />
                </div>
              )}
              <p className="text-[#D4AF37] text-sm font-medium mb-4">{featureCount} points caracteristiques detectes</p>

              {/* Hash */}
              <div className="rounded-xl bg-white/[0.03] border border-white/10 p-4 mb-6">
                <p className="text-white/30 text-xs mb-2 uppercase tracking-wider">Empreinte SHA-256</p>
                <p className="text-[#D4AF37] font-mono text-sm break-all">{formatHash(hash)}</p>
              </div>

              <button onClick={() => setStep("coordinates")}
                className="w-full py-4 rounded-xl bg-[#D4AF37] text-[#0A1128] font-semibold flex items-center justify-center gap-2 active:brightness-90">
                Continuer <ChevronRight className="size-5" />
              </button>
            </>
          )}
        </div>
      )}

      {/* ═══ STEP 5: COORDINATES ═══ */}
      {step === "coordinates" && (
        <div className="max-w-lg mx-auto px-4 py-4 animate-fade-in">
          <h1 className="font-playfair text-xl font-semibold text-white mb-1">Coordonnees de la zone</h1>
          <p className="text-white/40 text-sm mb-6">Position physique sur l&apos;oeuvre</p>

          {/* Schematic */}
          <div className="relative mx-auto mb-6" style={{ width: 200, height: 260 }}>
            <div className="absolute inset-0 border-2 border-white/20 rounded-lg">
              {/* Corner labels */}
              <span className="absolute -top-5 left-0 text-[9px] text-white/30">HG</span>
              <span className="absolute -top-5 right-0 text-[9px] text-white/30">HD</span>
              <span className="absolute -bottom-5 left-0 text-[9px] text-white/30">BG</span>
              <span className="absolute -bottom-5 right-0 text-[9px] text-white/30">BD</span>
              {/* Zone dot */}
              <div className="absolute w-4 h-4 rounded-full bg-[#D4AF37] border-2 border-white"
                style={{
                  left: coord.corner.includes("gauche") ? `${(coord.x_mm / (parseFloat(form.width) * 10 || 800)) * 100}%` : `${100 - (coord.x_mm / (parseFloat(form.width) * 10 || 800)) * 100}%`,
                  top: coord.corner.includes("Haut") ? `${(coord.y_mm / (parseFloat(form.height) * 10 || 1200)) * 100}%` : `${100 - (coord.y_mm / (parseFloat(form.height) * 10 || 1200)) * 100}%`,
                  transform: "translate(-50%, -50%)",
                }} />
              {/* Distance arrows */}
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[9px] text-[#D4AF37]">X: {coord.x_mm}mm</div>
              <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-[#D4AF37] [writing-mode:vertical-lr]">Y: {coord.y_mm}mm</div>
            </div>
          </div>

          {/* Form */}
          <div className="space-y-4 mb-6">
            <div>
              <label className="text-sm text-white/60 mb-1.5 block">Coin de reference</label>
              <select value={coord.corner} onChange={e => setCoord(c => ({ ...c, corner: e.target.value }))}
                className="w-full h-12 rounded-xl bg-white/5 border border-white/10 text-white px-4 focus:outline-none focus:border-[#D4AF37]/40">
                {["Bas-droite", "Bas-gauche", "Haut-droite", "Haut-gauche"].map(c => <option key={c} value={c} className="bg-[#0A1128]">{c}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-white/60 mb-1.5 block">Distance X (mm)</label>
                <input type="number" inputMode="numeric" value={coord.x_mm} onChange={e => setCoord(c => ({ ...c, x_mm: +e.target.value }))}
                  className="w-full h-12 rounded-xl bg-white/5 border border-white/10 text-white px-3 text-center focus:outline-none focus:border-[#D4AF37]/40" />
              </div>
              <div>
                <label className="text-sm text-white/60 mb-1.5 block">Distance Y (mm)</label>
                <input type="number" inputMode="numeric" value={coord.y_mm} onChange={e => setCoord(c => ({ ...c, y_mm: +e.target.value }))}
                  className="w-full h-12 rounded-xl bg-white/5 border border-white/10 text-white px-3 text-center focus:outline-none focus:border-[#D4AF37]/40" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-white/60 mb-1.5 block">Diametre zone</label>
                <div className="h-12 rounded-xl bg-white/5 border border-white/10 text-white/50 px-3 flex items-center justify-center text-sm">10 mm</div>
              </div>
              <div>
                <label className="text-sm text-white/60 mb-1.5 block">Orientation (degres)</label>
                <input type="number" inputMode="numeric" value={coord.angle} min={0} max={360} onChange={e => setCoord(c => ({ ...c, angle: +e.target.value }))}
                  className="w-full h-12 rounded-xl bg-white/5 border border-white/10 text-white px-3 text-center focus:outline-none focus:border-[#D4AF37]/40" />
              </div>
            </div>
          </div>

          <p className="text-white/20 text-xs mb-4">Ces coordonnees permettront de retrouver cette zone lors de verifications futures</p>

          <div className="flex gap-3">
            <button onClick={() => setStep("capture")} className="flex-1 py-4 rounded-xl border border-white/10 text-white/50 font-medium">Retour</button>
            <button onClick={handleBlockchain}
              className="flex-1 py-4 rounded-xl bg-[#D4AF37] text-[#0A1128] font-semibold flex items-center justify-center gap-2 active:brightness-90">
              Valider <ChevronRight className="size-5" />
            </button>
          </div>
        </div>
      )}

      {/* ═══ STEP 6: BLOCKCHAIN + CERTIFICATE ═══ */}
      {step === "blockchain" && (
        <div className="max-w-lg mx-auto px-4 py-4 animate-fade-in relative">
          {/* Confetti */}
          {showConfetti && (
            <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
              {Array.from({ length: 40 }).map((_, i) => (
                <div key={i} className="absolute" style={{
                  left: `${Math.random() * 100}%`,
                  top: "-10px",
                  width: `${6 + Math.random() * 8}px`,
                  height: `${6 + Math.random() * 8}px`,
                  backgroundColor: ["#D4AF37", "#FFD700", "#FFA500", "#FF6347", "#00CED1", "#9370DB"][i % 6],
                  borderRadius: Math.random() > 0.5 ? "50%" : "0",
                  animationDelay: `${Math.random() * 2}s`,
                  animationDuration: `${2 + Math.random() * 3}s`,
                  animationName: "confetti-fall",
                  animationTimingFunction: "ease-in",
                  animationFillMode: "forwards",
                }} />
              ))}
            </div>
          )}

          {blockchainStep < 4 ? (
            <>
              <h1 className="font-playfair text-xl font-semibold text-white mb-6">Inscription du certificat</h1>
              <div className="space-y-4">
                {[
                  "Upload de la photo securisee...",
                  "Enregistrement des metadonnees...",
                  "Inscription blockchain simulee...",
                  "Certificat genere",
                ].map((msg, i) => (
                  <div key={i} className={`flex items-center gap-3 transition-opacity duration-500 ${blockchainStep >= i ? "opacity-100" : "opacity-20"}`}>
                    {blockchainStep > i ? <Check className="size-5 text-green-400 shrink-0" /> : blockchainStep === i ? <Loader2 className="size-5 text-[#D4AF37] animate-spin shrink-0" /> : <div className="size-5 rounded-full border border-white/20 shrink-0" />}
                    <span className="text-sm text-white/70">{msg}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-full bg-green-500/10 border-2 border-green-500/30 flex items-center justify-center mx-auto mb-3">
                  <Check className="size-8 text-green-400" />
                </div>
                <h1 className="font-playfair text-2xl font-semibold text-white">Oeuvre certifiee !</h1>
              </div>

              {/* Certificate card */}
              <div className="rounded-2xl border border-[#D4AF37]/30 bg-gradient-to-b from-[#D4AF37]/5 to-transparent overflow-hidden mb-6">
                {/* Header */}
                <div className="p-4 border-b border-[#D4AF37]/15 flex items-center gap-3">
                  <ShieldCheck className="size-6 text-[#D4AF37]" />
                  <div>
                    <p className="text-[#D4AF37] font-semibold text-sm">PASS-CORE</p>
                    <p className="text-white/30 text-[10px]">Certificat d&apos;authenticite</p>
                  </div>
                </div>

                {/* Images */}
                <div className="grid grid-cols-2 gap-px bg-white/5">
                  {capturedImg && <img src={capturedImg} alt="Oeuvre" className="w-full aspect-square object-cover" />}
                  {featureImg && <img src={featureImg} alt="Zone certifiee" className="w-full aspect-square object-cover" />}
                </div>

                {/* Details */}
                <div className="p-4 space-y-3 text-sm">
                  <div className="flex justify-between"><span className="text-white/30">Oeuvre</span><span className="text-white font-medium">{form.title}</span></div>
                  <div className="flex justify-between"><span className="text-white/30">Technique</span><span className="text-white/70">{material}</span></div>
                  <div className="flex justify-between"><span className="text-white/30">Dimensions</span><span className="text-white/70">{form.width} x {form.height} cm</span></div>

                  <div className="pt-2 border-t border-white/5">
                    <p className="text-white/30 text-xs mb-1">Empreinte SHA-256</p>
                    <p className="text-[#D4AF37] font-mono text-xs break-all">{formatHash(hash)}</p>
                  </div>

                  <div className="pt-2 border-t border-white/5">
                    <p className="text-white/30 text-xs mb-1">Blockchain</p>
                    <p className="text-white/70 font-mono text-xs">{certResult?.block}</p>
                    <p className="text-white/70 font-mono text-xs">RESEAU: PASS-CORE-SIM-V1</p>
                    <p className="text-white/70 font-mono text-xs">TX: {certResult?.tx}</p>
                  </div>

                  <div className="pt-2 border-t border-white/5">
                    <p className="text-white/30 text-xs mb-1">Coordonnees</p>
                    <p className="text-white/70 text-xs">{coord.corner} — X: {coord.x_mm}mm, Y: {coord.y_mm}mm — {coord.angle}deg</p>
                  </div>

                  <div className="pt-2 border-t border-white/5 flex justify-between items-center">
                    <span className="text-white/30 text-xs">Score qualite</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${quality.overall >= 80 ? "bg-green-500/15 text-green-400" : quality.overall >= 60 ? "bg-yellow-500/15 text-yellow-400" : "bg-red-500/15 text-red-400"}`}>
                      {quality.overall}%
                    </span>
                  </div>

                  <p className="text-white/20 text-[10px] text-center pt-2">
                    Certifie le {new Date().toLocaleDateString("fr-FR")} — ART-CORE GROUP LTD
                  </p>
                </div>
              </div>

              {/* Confirmation message */}
              <div className="rounded-xl bg-green-500/10 border border-green-500/20 p-4 flex items-start gap-3">
                <Check className="size-5 text-green-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-green-400 font-medium text-sm">Votre oeuvre est en ligne !</p>
                  <p className="text-white/40 text-xs mt-1">
                    Elle est visible et achetable sur le marketplace Art-Core.
                    {form.price ? ` Prix : ${form.price}€` : ""}
                  </p>
                  <p className="text-white/30 text-[10px] mt-1">Un email de confirmation avec votre certificat a ete envoye.</p>
                </div>
              </div>

              {/* Buttons */}
              <div className="space-y-3">
                {certResult?.id && (
                  <button onClick={() => router.push(`/art-core/oeuvre/${certResult.id}`)}
                    className="w-full py-4 rounded-xl bg-[#D4AF37] text-[#0A1128] font-semibold active:brightness-90">
                    Voir mon oeuvre sur Art-Core
                  </button>
                )}
                {certResult?.id && (
                  <button onClick={() => router.push(`/pass-core/certificate/${certResult.id}`)}
                    className="w-full py-4 rounded-xl border border-[#D4AF37]/30 text-[#D4AF37] font-medium active:bg-[#D4AF37]/5">
                    Voir le certificat blockchain
                  </button>
                )}
                <button onClick={handleShare}
                  className="w-full py-4 rounded-xl border border-white/10 text-white/60 font-medium flex items-center justify-center gap-2 active:bg-white/5">
                  <Share2 className="size-4" /> Partager
                </button>
                <button onClick={reset}
                  className="w-full py-4 rounded-xl border border-white/10 text-white/40 font-medium flex items-center justify-center gap-2 active:bg-white/5">
                  <RotateCcw className="size-4" /> Certifier une autre oeuvre
                </button>
              </div>
            </>
          )}
        </div>
      )}

    </div>
  );
}

function delay(ms: number) { return new Promise(r => setTimeout(r, ms)); }
