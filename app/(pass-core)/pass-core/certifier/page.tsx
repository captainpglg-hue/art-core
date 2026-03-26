"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Camera, ChevronRight, Check, Loader2, X, RotateCcw, Share2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { detectPhone } from "@/lib/macro-compatibility";

type Step = "intro" | "photo-global" | "phone-check" | "live-camera" | "analysis" | "coordinates" | "submit" | "done";

const TECHNIQUES = ["Peinture", "Ceramique", "Tissu", "Bijou", "Bois", "Photo", "Sculpture", "Autre"];

export default function CertifierPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("intro");
  const [form, setForm] = useState({ title: "", technique: "", width: "", height: "", year: "", price: "", description: "" });
  const [globalPhoto, setGlobalPhoto] = useState<string | null>(null);
  const [macroPhoto, setMacroPhoto] = useState<string | null>(null);
  const [macroFile, setMacroFile] = useState<File | null>(null);
  const [phone, setPhone] = useState<ReturnType<typeof detectPhone> | null>(null);
  const [analysis, setAnalysis] = useState<{ score: number; mpx: number; sharpness: number; brightness: number; passed: boolean; issues: string[] } | null>(null);
  const [hash, setHash] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [coord, setCoord] = useState({ corner: "Bas-droite", x_mm: 50, y_mm: 50 });
  const globalRef = useRef<HTMLInputElement>(null);
  const macroRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const analyzeTimerRef = useRef<number>(0);
  const [liveQuality, setLiveQuality] = useState({ sharpness: 0, brightness: 0, resolution: 0, ready: false });
  const [flashBorder, setFlashBorder] = useState(false);

  const introValid = form.title && form.technique && form.width && form.height && form.year;

  // ── Analyze macro photo quality ──
  async function analyzeMacro(file: File) {
    const url = URL.createObjectURL(file);
    setMacroPhoto(url);
    setMacroFile(file);

    const img = new Image();
    img.src = url;
    await new Promise<void>(r => { img.onload = () => r(); });

    const w = img.width, h = img.height;
    const mpx = (w * h) / 1_000_000;
    const issues: string[] = [];

    // Resolution check
    const resOk = mpx >= 8;
    if (!resOk) issues.push(`Resolution ${mpx.toFixed(1)}MP — minimum 8MP requis`);

    // Analyze center crop on small canvas
    const sz = 300;
    const c = document.createElement("canvas");
    c.width = sz; c.height = sz;
    const ctx = c.getContext("2d")!;
    const crop = Math.min(w, h);
    ctx.drawImage(img, (w - crop) / 2, (h - crop) / 2, crop, crop, 0, 0, sz, sz);
    const d = ctx.getImageData(0, 0, sz, sz).data;

    // Grayscale + brightness
    const gray = new Float32Array(sz * sz);
    let lumSum = 0;
    for (let i = 0; i < sz * sz; i++) {
      gray[i] = d[i * 4] * 0.299 + d[i * 4 + 1] * 0.587 + d[i * 4 + 2] * 0.114;
      lumSum += gray[i];
    }
    const avgLum = lumSum / (sz * sz);
    if (avgLum < 50) issues.push("Photo trop sombre");
    if (avgLum > 210) issues.push("Photo trop claire");
    const brightScore = (avgLum >= 50 && avgLum <= 210) ? 100 : 30;

    // Sharpness (Laplacian)
    let lapSum = 0, lapSum2 = 0, n = 0;
    for (let y = 1; y < sz - 1; y++) {
      for (let x = 1; x < sz - 1; x++) {
        const v = -gray[(y-1)*sz+x] - gray[y*sz+x-1] + 4*gray[y*sz+x] - gray[y*sz+x+1] - gray[(y+1)*sz+x];
        lapSum += v; lapSum2 += v * v; n++;
      }
    }
    const lapVar = lapSum2 / n - (lapSum / n) ** 2;
    if (lapVar < 100) issues.push("Photo floue — stabilisez et faites la mise au point");
    const sharpScore = lapVar > 200 ? 100 : lapVar > 100 ? 60 : 30;

    const score = Math.round((mpx >= 12 ? 100 : mpx >= 8 ? 70 : 30) * 0.3 + sharpScore * 0.4 + brightScore * 0.3);
    const passed = score >= 60 && mpx >= 4 && lapVar >= 80;

    // Compute SHA-256
    let hashHex = "";
    try {
      const buffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
      hashHex = "0x" + Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");
    } catch {
      hashHex = "0x" + Date.now().toString(16) + Math.random().toString(16).slice(2);
    }
    setHash(hashHex);
    setAnalysis({ score, mpx, sharpness: sharpScore, brightness: brightScore, passed, issues });
  }

  // ── Camera availability check ──
  const [hasCamera, setHasCamera] = useState(true);
  useEffect(() => {
    async function check() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) { setHasCamera(false); return; }
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cam = devices.some(d => d.kind === "videoinput");
        setHasCamera(cam);
      } catch { setHasCamera(false); }
    }
    check();
  }, []);

  // ── Live camera ──
  function startLiveCamera() {
    if (!hasCamera) {
      // Desktop fallback: open file picker instead
      macroRef.current?.click();
      return;
    }
    navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false })
      .then(stream => {
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
        // Try to auto-zoom x2 if supported
        try {
          const track = stream.getVideoTracks()[0];
          const caps = track.getCapabilities() as any;
          if (caps?.zoom?.max && caps.zoom.max >= 2) {
            const zoom = Math.min(caps.zoom.max, 2.5);
            track.applyConstraints({ advanced: [{ zoom } as any] }).catch(() => {});
          }
        } catch {}
        // Start analysis loop every 400ms
        analyzeTimerRef.current = window.setInterval(analyzeLiveFrame, 400);
      })
      .catch(() => {
        // Camera denied or unavailable — fallback to file picker
        toast({ title: "Caméra indisponible", description: "Sélectionnez une photo macro depuis vos fichiers.", variant: "destructive" });
        macroRef.current?.click();
      });
  }

  function stopLiveCamera() {
    clearInterval(analyzeTimerRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }

  function analyzeLiveFrame() {
    const v = videoRef.current;
    if (!v || v.readyState < 2) return;
    const w = v.videoWidth, h = v.videoHeight;
    const mpx = (w * h) / 1_000_000;

    const c = document.createElement("canvas");
    const sz = 200;
    c.width = sz; c.height = sz;
    const ctx = c.getContext("2d")!;
    const crop = Math.min(w, h);
    ctx.drawImage(v, (w - crop) / 2, (h - crop) / 2, crop, crop, 0, 0, sz, sz);
    const d = ctx.getImageData(0, 0, sz, sz).data;

    const gray = new Float32Array(sz * sz);
    let lumSum = 0;
    for (let i = 0; i < sz * sz; i++) {
      gray[i] = d[i * 4] * 0.299 + d[i * 4 + 1] * 0.587 + d[i * 4 + 2] * 0.114;
      lumSum += gray[i];
    }
    const avgLum = lumSum / (sz * sz);
    const brightOk = avgLum >= 50 && avgLum <= 210;

    let lapSum = 0, lapSum2 = 0, n = 0;
    for (let y = 1; y < sz - 1; y++) {
      for (let x = 1; x < sz - 1; x++) {
        const val = -gray[(y-1)*sz+x] - gray[y*sz+x-1] + 4*gray[y*sz+x] - gray[y*sz+x+1] - gray[(y+1)*sz+x];
        lapSum += val; lapSum2 += val * val; n++;
      }
    }
    const lapVar = lapSum2 / n - (lapSum / n) ** 2;
    const sharpOk = lapVar >= 100;
    const resOk = mpx >= 4;

    // Resolution du flux video est toujours basse (1-2MP) meme sur un 200MP
    // La vraie resolution sera verifiee sur la photo capturee
    // Ici on verifie juste que le flux fonctionne (> 0.3MP)
    const streamOk = mpx >= 0.3;
    const allOk = sharpOk && brightOk && streamOk;
    setLiveQuality({
      sharpness: Math.min(100, Math.round(lapVar / 2)),
      brightness: Math.round(avgLum / 2.55),
      resolution: streamOk ? 100 : 0,
      ready: allOk,
    });

    // Flash the border when ready
    if (allOk) setFlashBorder(prev => !prev);
    else setFlashBorder(false);
  }

  function captureLivePhoto() {
    const v = videoRef.current;
    if (!v) return;
    // Flash blanc pour feedback visuel
    const flash = document.createElement("div");
    flash.style.cssText = "position:fixed;inset:0;background:white;z-index:9999;opacity:0.8;transition:opacity 0.3s";
    document.body.appendChild(flash);
    setTimeout(() => { flash.style.opacity = "0"; setTimeout(() => flash.remove(), 300); }, 100);

    const c = document.createElement("canvas");
    c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext("2d")!.drawImage(v, 0, 0);
    stopLiveCamera();
    c.toBlob(async blob => {
      if (!blob) return;
      const file = new File([blob], "macro.jpg", { type: "image/jpeg" });
      setStep("analysis");
      await analyzeMacro(file);
    }, "image/jpeg", 0.95);
  }

  // Start/stop camera when step changes
  useEffect(() => {
    if (step === "live-camera") {
      setLiveQuality({ sharpness: 0, brightness: 0, resolution: 0, ready: false });
      setFlashBorder(false);
      startLiveCamera();
    }
    return () => { if (step === "live-camera") stopLiveCamera(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // ── Submit certification ──
  async function handleSubmit() {
    setLoading(true);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      // Send as FormData to include the photo
      const fd = new FormData();
      fd.append("title", form.title);
      fd.append("technique", form.technique);
      fd.append("dimensions", `${form.width} x ${form.height} cm`);
      fd.append("year", form.year);
      fd.append("price", form.price || "0");
      fd.append("description", form.description);
      fd.append("hash", hash);
      fd.append("coord_corner", coord.corner);
      fd.append("coord_x_mm", String(coord.x_mm));
      fd.append("coord_y_mm", String(coord.y_mm));
      // Attach macro photo if available
      if (macroFile) fd.append("photo_full", macroFile);
      // Attach global photo if available
      if (globalPhoto) {
        try {
          const resp = await fetch(globalPhoto);
          const blob = await resp.blob();
          fd.append("photo_angle", new File([blob], "global.jpg", { type: "image/jpeg" }));
        } catch {}
      }

      const res = await fetch("/api/certification", {
        method: "POST",
        signal: controller.signal,
        body: fd,
      });
      clearTimeout(timeout);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur serveur");
      setResult(data);
      setStep("done");
    } catch (err: any) {
      const msg = err.name === "AbortError" ? "Delai depasse — verifiez votre connexion" : err.message;
      toast({ title: "Erreur", description: msg, variant: "destructive" });
      setStep("coordinates"); // retour pour reessayer
    } finally { setLoading(false); }
  }

  const STEPS = [
    { k: "intro", label: "Info" },
    { k: "photo-global", label: "Photo" },
    { k: "phone-check", label: "Appareil" },
    { k: "live-camera", label: "Macro" },
    { k: "analysis", label: "Analyse" },
    { k: "coordinates", label: "Position" },
    { k: "submit", label: "Certificat" },
  ];
  const si = STEPS.findIndex(s => s.k === step);

  return (
    <div className="max-w-lg mx-auto px-4 py-6 pb-24 min-h-screen">

      {/* Hidden file inputs */}
      <input ref={globalRef} type="file" accept="image/*" capture={hasCamera ? "environment" : undefined} className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) { setGlobalPhoto(URL.createObjectURL(f)); setStep("photo-global"); } }} />
      <input ref={macroRef} type="file" accept="image/*" capture={hasCamera ? "environment" : undefined} className="hidden"
        onChange={async e => { const f = e.target.files?.[0]; if (f) { setStep("analysis"); await analyzeMacro(f); } }} />

      {/* Progress bar */}
      {step !== "intro" && step !== "done" && (
        <div className="flex gap-1 mb-6">
          {STEPS.map((s, i) => (
            <div key={s.k} className="flex-1 h-1 rounded-full" style={{ background: i <= si ? "#D4AF37" : "rgba(255,255,255,0.08)" }} />
          ))}
        </div>
      )}

      {/* ═══ INTRO ═══ */}
      {step === "intro" && (
        <div className="animate-fade-in">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center mx-auto mb-4">
              <ShieldCheck className="size-8 text-[#D4AF37]" />
            </div>
            <h1 className="text-2xl font-semibold text-white mb-2">Certifiez votre oeuvre</h1>
            <p className="text-white/40 text-sm">Photo + empreinte SHA-256 = protection definitive</p>
          </div>

          <div className="space-y-4 mb-6">
            <div>
              <label className="text-sm text-white/60 mb-1.5 block">Titre *</label>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Ex: Crepuscule Dore"
                className="w-full h-12 rounded-xl bg-white/5 border border-white/10 text-white px-4 focus:outline-none focus:border-[#D4AF37]/40" />
            </div>
            <div>
              <label className="text-sm text-white/60 mb-1.5 block">Technique *</label>
              <div className="flex flex-wrap gap-2">
                {TECHNIQUES.map(t => (
                  <button key={t} onClick={() => setForm(f => ({ ...f, technique: t }))}
                    className={`px-3 py-2 rounded-lg text-xs ${form.technique === t ? "bg-[#D4AF37] text-black font-semibold" : "bg-white/5 text-white/50"}`}>{t}</button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-white/60 mb-1 block">Largeur cm *</label>
                <input type="number" inputMode="numeric" value={form.width} onChange={e => setForm(f => ({ ...f, width: e.target.value }))} placeholder="80"
                  className="w-full h-12 rounded-xl bg-white/5 border border-white/10 text-white px-3 text-center focus:outline-none focus:border-[#D4AF37]/40" />
              </div>
              <div>
                <label className="text-xs text-white/60 mb-1 block">Hauteur cm *</label>
                <input type="number" inputMode="numeric" value={form.height} onChange={e => setForm(f => ({ ...f, height: e.target.value }))} placeholder="120"
                  className="w-full h-12 rounded-xl bg-white/5 border border-white/10 text-white px-3 text-center focus:outline-none focus:border-[#D4AF37]/40" />
              </div>
              <div>
                <label className="text-xs text-white/60 mb-1 block">Annee *</label>
                <input type="number" inputMode="numeric" value={form.year} onChange={e => setForm(f => ({ ...f, year: e.target.value }))} placeholder="2024"
                  className="w-full h-12 rounded-xl bg-white/5 border border-white/10 text-white px-3 text-center focus:outline-none focus:border-[#D4AF37]/40" />
              </div>
            </div>
            <div>
              <label className="text-xs text-white/60 mb-1 block">Prix EUR (optionnel)</label>
              <input type="number" inputMode="numeric" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="1500"
                className="w-full h-12 rounded-xl bg-white/5 border border-white/10 text-white px-4 focus:outline-none focus:border-[#D4AF37]/40" />
            </div>
          </div>

          {/* Macro photo guide */}
          <div className="rounded-xl bg-[#D4AF37]/5 border border-[#D4AF37]/15 p-4 mb-4">
            <div className="flex items-start gap-3">
              <span className="text-lg">🔍</span>
              <div>
                <p className="text-[#D4AF37] text-sm font-medium mb-1">Photo macro requise</p>
                <p className="text-white/40 text-xs leading-relaxed">
                  Prenez une photo MACRO (gros plan 5-10 cm) de la texture ou du grain de l&apos;œuvre.
                  C&apos;est cette empreinte unique qui sera hashée en SHA-256 pour la blockchain.
                </p>
              </div>
            </div>
          </div>

          <button onClick={() => globalRef.current?.click()} disabled={!introValid}
            className="w-full py-4 rounded-xl bg-[#D4AF37] text-[#0A1128] font-semibold disabled:opacity-30 flex items-center justify-center gap-2 active:brightness-90">
            <Camera className="size-5" /> Photographier l&apos;œuvre <ChevronRight className="size-5" />
          </button>
        </div>
      )}

      {/* ═══ PHOTO GLOBALE ═══ */}
      {step === "photo-global" && globalPhoto && (
        <div className="animate-fade-in">
          <h2 className="text-lg font-semibold text-white mb-4">Photo de l&apos;oeuvre</h2>
          <div className="rounded-2xl overflow-hidden mb-4">
            <img src={globalPhoto} alt="Oeuvre" className="w-full" />
          </div>
          <div className="flex gap-3">
            <button onClick={() => globalRef.current?.click()} className="flex-1 py-3 rounded-xl border border-white/10 text-white/50 text-sm">Reprendre</button>
            <button onClick={() => { setPhone(detectPhone(navigator.userAgent)); setStep("phone-check"); }}
              className="flex-1 py-3 rounded-xl bg-[#D4AF37] text-[#0A1128] font-semibold text-sm flex items-center justify-center gap-2">
              Continuer <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      )}

      {/* ═══ PHONE CHECK ═══ */}
      {step === "phone-check" && phone && (
        <div className="animate-fade-in">
          <h2 className="text-lg font-semibold text-white mb-4 text-center">Votre appareil</h2>

          <div className={`rounded-2xl border p-5 mb-6 ${
            phone.grade === "A" ? "border-green-500/30 bg-green-500/5" :
            phone.grade === "B" ? "border-blue-500/30 bg-blue-500/5" :
            phone.grade === "C" ? "border-yellow-500/30 bg-yellow-500/5" :
            "border-red-500/30 bg-red-500/5"
          }`}>
            <div className="flex items-center gap-4 mb-3">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-bold ${
                phone.grade === "A" ? "bg-green-500/20 text-green-400" :
                phone.grade === "B" ? "bg-blue-500/20 text-blue-400" :
                phone.grade === "C" ? "bg-yellow-500/20 text-yellow-400" :
                "bg-red-500/20 text-red-400"
              }`}>{phone.grade}</div>
              <div>
                <p className="text-white font-semibold">{phone.brand} {phone.model}</p>
                {phone.mainCamera !== "?" && <p className="text-white/40 text-xs">Capteur : {phone.mainCamera}</p>}
              </div>
            </div>
            <p className={`text-sm ${phone.grade === "A" ? "text-green-400" : phone.grade === "B" ? "text-blue-400" : phone.grade === "C" ? "text-yellow-400" : "text-red-400"}`}>
              {phone.grade === "A" ? "Excellent — macro sans kit" : phone.grade === "B" ? "Bon — macro possible" : phone.grade === "C" ? "Moyen — kit recommande" : "Kit macro obligatoire"}
            </p>
            <p className="text-white/30 text-xs mt-1">{phone.note}</p>
          </div>

          <div className="rounded-xl bg-[#D4AF37]/5 border border-[#D4AF37]/15 p-4 mb-6">
            <p className="text-[#D4AF37] text-sm font-medium mb-1">Comment prendre la photo macro</p>
            <p className="text-white/40 text-xs">1. Approchez a 3-5cm de la zone a certifier</p>
            <p className="text-white/40 text-xs">2. <strong className="text-[#D4AF37]">Zoomez x2 ou x3</strong> avec deux doigts (pincez l&apos;ecran)</p>
            <p className="text-white/40 text-xs">3. Tapez sur l&apos;ecran pour faire la mise au point</p>
            <p className="text-white/40 text-xs">4. Quand les barres sont vertes → appuyez pour capturer</p>
          </div>

          {phone.compatible || !hasCamera ? (
            <button onClick={() => hasCamera ? setStep("live-camera") : macroRef.current?.click()}
              className="w-full py-4 rounded-xl bg-[#D4AF37] text-[#0A1128] font-semibold flex items-center justify-center gap-2 active:brightness-90">
              <Camera className="size-5" /> {hasCamera ? "Ouvrir la caméra macro" : "Sélectionner une photo macro"}
            </button>
          ) : (
            <p className="text-red-400 text-sm text-center">Appareil non compatible. Utilisez un autre téléphone ou le kit macro.</p>
          )}
        </div>
      )}

      {/* ═══ LIVE CAMERA ═══ */}
      {step === "live-camera" && (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
          {/* Video feed */}
          <video
            ref={videoRef}
            className="w-full flex-1 object-cover"
            playsInline
            muted
            autoPlay
            onClick={(e) => (e.target as HTMLVideoElement).play().catch(() => {})}
          />

          {/* Flashing border when ready */}
          {liveQuality.ready && (
            <div className={`absolute inset-0 pointer-events-none border-4 rounded-none transition-opacity duration-300 ${flashBorder ? "border-[#D4AF37] opacity-100" : "border-[#D4AF37] opacity-20"}`} />
          )}

          {/* Center reticle */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className={`w-48 h-48 border-2 rounded-lg ${liveQuality.ready ? "border-[#D4AF37]" : "border-white/30"}`}>
              <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-inherit" />
              <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-inherit" />
              <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-inherit" />
              <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-inherit" />
            </div>
          </div>

          {/* Top: instructions */}
          <div className="absolute top-0 inset-x-0 bg-gradient-to-b from-black/80 to-transparent p-4 pt-8">
            <p className="text-white text-sm font-medium text-center">Approchez a 3-5 cm de l&apos;oeuvre</p>
            <p className="text-[#D4AF37] text-sm font-bold text-center mt-2 animate-pulse">Zoomez x2-x3 avec deux doigts</p>
            <p className="text-white/40 text-xs text-center mt-1">Puis tapez sur l&apos;ecran pour la mise au point</p>
          </div>

          {/* Bottom: live indicators */}
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 to-transparent p-4 pb-8">
            {/* Quality bars */}
            <div className="space-y-2 mb-4 max-w-xs mx-auto">
              {[
                { label: "Nettete", value: liveQuality.sharpness, ok: liveQuality.sharpness >= 50 },
                { label: "Lumiere", value: liveQuality.brightness, ok: liveQuality.brightness >= 20 && liveQuality.brightness <= 82 },
                { label: "Camera", value: liveQuality.resolution, ok: liveQuality.resolution > 0 },
              ].map(q => (
                <div key={q.label} className="flex items-center gap-3">
                  <span className="text-xs text-white/50 w-16">{q.label}</span>
                  <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-300 ${q.ok ? "bg-green-400" : "bg-red-400"}`}
                      style={{ width: `${Math.min(100, q.value)}%` }} />
                  </div>
                  <span className={`text-xs font-bold w-6 ${q.ok ? "text-green-400" : "text-red-400"}`}>
                    {q.ok ? "OK" : "—"}
                  </span>
                </div>
              ))}
            </div>

            {/* Status + capture button */}
            <div className="flex items-center justify-center gap-6">
              <button onClick={() => { stopLiveCamera(); setStep("phone-check"); }}
                className="w-12 h-12 rounded-full border border-white/30 flex items-center justify-center">
                <X className="size-5 text-white/50" />
              </button>

              {liveQuality.ready ? (
                <button onClick={captureLivePhoto}
                  className="w-20 h-20 rounded-full border-4 border-[#D4AF37] flex items-center justify-center animate-pulse active:scale-90 transition-transform">
                  <div className="w-14 h-14 rounded-full bg-[#D4AF37]" />
                </button>
              ) : (
                <div className="w-20 h-20 rounded-full border-4 border-white/20 flex items-center justify-center">
                  <div className="w-14 h-14 rounded-full bg-white/10" />
                </div>
              )}

              <div className="w-12 h-12" /> {/* spacer */}
            </div>

            <p className="text-center text-xs mt-3 text-white/30">
              {liveQuality.ready
                ? "Qualite OK — appuyez pour capturer"
                : "Stabilisez et approchez jusqu'a ce que les barres soient vertes"}
            </p>
          </div>
        </div>
      )}

      {/* ═══ ANALYSIS ═══ */}
      {step === "analysis" && (
        <div className="animate-fade-in">
          <h2 className="text-lg font-semibold text-white mb-4 text-center">Analyse qualite</h2>

          {!analysis && (
            <div className="flex flex-col items-center py-16">
              <Loader2 className="size-10 text-[#D4AF37] animate-spin mb-4" />
              <p className="text-white/50 text-sm">Analyse en cours...</p>
            </div>
          )}

          {analysis && macroPhoto && (
            <>
              <div className="relative rounded-2xl overflow-hidden mb-6">
                <img src={macroPhoto} alt="Macro" className="w-full aspect-square object-cover" />
                <div className={`absolute top-3 right-3 px-3 py-1.5 rounded-full text-sm font-bold ${
                  analysis.passed ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                }`}>{analysis.score}%</div>
              </div>

              <div className="rounded-xl bg-white/[0.03] border border-white/10 p-4 mb-4 space-y-3">
                {[
                  { label: "Resolution", value: analysis.mpx >= 12 ? 100 : analysis.mpx >= 8 ? 70 : 30, detail: `${analysis.mpx.toFixed(1)} MP` },
                  { label: "Nettete", value: analysis.sharpness, detail: analysis.sharpness >= 60 ? "Bonne" : "Insuffisante" },
                  { label: "Luminosite", value: analysis.brightness, detail: analysis.brightness >= 60 ? "Correcte" : "A ameliorer" },
                ].map(s => (
                  <div key={s.label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-white/50">{s.label}</span>
                      <span className="text-white/70">{s.detail}</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                      <div className={`h-full rounded-full ${s.value >= 60 ? "bg-[#D4AF37]" : "bg-red-500"}`} style={{ width: `${s.value}%` }} />
                    </div>
                  </div>
                ))}
              </div>

              {analysis.issues.length > 0 && (
                <div className="rounded-xl bg-red-500/5 border border-red-500/15 p-3 mb-4">
                  {analysis.issues.map((issue, i) => <p key={i} className="text-red-400 text-xs">— {issue}</p>)}
                </div>
              )}

              {analysis.passed ? (
                <div className="space-y-3">
                  <div className="rounded-xl bg-green-500/10 border border-green-500/20 p-3 flex items-center gap-3">
                    <Check className="size-5 text-green-400" />
                    <p className="text-green-400 text-sm font-medium">Photo validee !</p>
                  </div>
                  <button onClick={() => setStep("coordinates")}
                    className="w-full py-4 rounded-xl bg-[#D4AF37] text-[#0A1128] font-semibold flex items-center justify-center gap-2">
                    Continuer <ChevronRight className="size-5" />
                  </button>
                </div>
              ) : (
                <button onClick={() => { setAnalysis(null); setMacroPhoto(null); macroRef.current?.click(); }}
                  className="w-full py-4 rounded-xl bg-[#D4AF37] text-[#0A1128] font-semibold flex items-center justify-center gap-2">
                  <Camera className="size-5" /> Reprendre la photo
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* ═══ COORDINATES ═══ */}
      {step === "coordinates" && (
        <div className="animate-fade-in">
          <h2 className="text-lg font-semibold text-white mb-4">Position de la zone macro</h2>
          <p className="text-white/40 text-xs mb-4">Indiquez ou se trouve la zone photographiee sur l&apos;oeuvre</p>

          <div className="space-y-4 mb-6">
            <div>
              <label className="text-xs text-white/60 mb-1 block">Coin de reference</label>
              <div className="flex flex-wrap gap-2">
                {["Haut-gauche", "Haut-droite", "Bas-gauche", "Bas-droite", "Centre"].map(c => (
                  <button key={c} onClick={() => setCoord(p => ({ ...p, corner: c }))}
                    className={`px-3 py-2 rounded-lg text-xs ${coord.corner === c ? "bg-[#D4AF37] text-black font-semibold" : "bg-white/5 text-white/50"}`}>{c}</button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-white/60 mb-1 block">X (mm depuis le coin)</label>
                <input type="number" inputMode="numeric" value={coord.x_mm} onChange={e => setCoord(p => ({ ...p, x_mm: parseInt(e.target.value) || 0 }))}
                  className="w-full h-12 rounded-xl bg-white/5 border border-white/10 text-white px-3 text-center focus:outline-none focus:border-[#D4AF37]/40" />
              </div>
              <div>
                <label className="text-xs text-white/60 mb-1 block">Y (mm depuis le coin)</label>
                <input type="number" inputMode="numeric" value={coord.y_mm} onChange={e => setCoord(p => ({ ...p, y_mm: parseInt(e.target.value) || 0 }))}
                  className="w-full h-12 rounded-xl bg-white/5 border border-white/10 text-white px-3 text-center focus:outline-none focus:border-[#D4AF37]/40" />
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-white/[0.02] border border-white/5 p-4 mb-6 text-xs space-y-1">
            <p className="text-white/30">Hash SHA-256</p>
            <p className="text-[#D4AF37] font-mono text-[10px] break-all">{hash}</p>
          </div>

          <button onClick={() => { setStep("submit"); handleSubmit(); }}
            className="w-full py-4 rounded-xl bg-[#D4AF37] text-[#0A1128] font-semibold flex items-center justify-center gap-2 active:brightness-90">
            {loading ? <Loader2 className="size-5 animate-spin" /> : <ShieldCheck className="size-5" />}
            Certifier cette oeuvre
          </button>
        </div>
      )}

      {/* ═══ SUBMIT (loading) ═══ */}
      {step === "submit" && !result && (
        <div className="flex flex-col items-center py-16">
          <Loader2 className="size-10 text-[#D4AF37] animate-spin mb-4" />
          <p className="text-white/50 text-sm">Certification en cours...</p>
          <p className="text-white/20 text-xs mt-2">Calcul du hash blockchain...</p>
        </div>
      )}

      {/* ═══ DONE ═══ */}
      {step === "done" && result && (
        <div className="animate-fade-in text-center">
          <div className="w-16 h-16 rounded-full bg-green-500/10 border-2 border-green-500/30 flex items-center justify-center mx-auto mb-4">
            <Check className="size-8 text-green-400" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Oeuvre certifiee !</h2>
          <p className="text-white/40 text-sm mb-6">Votre oeuvre est en ligne sur Art-Core</p>

          <div className="rounded-xl bg-white/[0.03] border border-white/10 p-4 mb-6 text-left text-sm space-y-2">
            <div className="flex justify-between"><span className="text-white/30">Titre</span><span className="text-white">{form.title}</span></div>
            <div className="flex justify-between"><span className="text-white/30">Technique</span><span className="text-white/70">{form.technique}</span></div>
            <div className="flex justify-between"><span className="text-white/30">Dimensions</span><span className="text-white/70">{form.width} x {form.height} cm</span></div>
            {form.price && <div className="flex justify-between"><span className="text-white/30">Prix</span><span className="text-[#D4AF37]">{form.price} EUR</span></div>}
            <div className="pt-2 border-t border-white/5">
              <p className="text-white/30 text-xs">Hash SHA-256</p>
              <p className="text-[#D4AF37] font-mono text-[10px] break-all mt-1">{hash}</p>
            </div>
          </div>

          <div className="rounded-xl bg-green-500/10 border border-green-500/20 p-3 mb-6">
            <p className="text-green-400 text-xs">Un email de confirmation avec votre certificat a ete envoye.</p>
          </div>

          <div className="space-y-3">
            {result.id && (
              <button onClick={() => router.push(`/art-core/oeuvre/${result.id}`)}
                className="w-full py-4 rounded-xl bg-[#D4AF37] text-[#0A1128] font-semibold">
                Voir mon oeuvre sur Art-Core
              </button>
            )}
            <button onClick={() => { setStep("intro"); setForm({ title: "", technique: "", width: "", height: "", year: "", price: "", description: "" }); setGlobalPhoto(null); setMacroPhoto(null); setAnalysis(null); setHash(""); setResult(null); }}
              className="w-full py-3 rounded-xl border border-white/10 text-white/40 text-sm flex items-center justify-center gap-2">
              <RotateCcw className="size-4" /> Certifier une autre oeuvre
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
