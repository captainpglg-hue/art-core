"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck, Camera, ZoomIn, RotateCcw, ChevronRight, ChevronLeft, Check,
  Loader2, Sparkles, X, Award, Lock, TrendingUp, Image as ImgIcon, Move,
  Fingerprint, Eye, Mic, MicOff,
} from "lucide-react";
import CaptureStep from "@/components/certifier/CaptureStep";
import type { CameraQuality } from "@/components/certifier/useCameraMacro";

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════
type Step = "intro" | "photo1" | "zone_select" | "photo2" | "photo2b" | "photo2c" | "photo3" |
            "f_title" | "f_technique" | "f_dimensions" | "f_year" | "f_description" | "f_price" |
            "f_identification" |
            "review" | "submitting" | "done";

const TECHNIQUES = ["Huile", "Acrylique", "Aquarelle", "Mixte", "Pastel", "Encre", "Numerique", "Sculpture", "Photographie", "Autre"];

// ═══════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════
export default function CertifierPage() {
  const router = useRouter();

  // Photos
  const [photo1, setPhoto1] = useState<{ file: File; url: string } | null>(null);
  const [photo2, setPhoto2] = useState<{ file: File; url: string } | null>(null);
  const [photo2b, setPhoto2b] = useState<{ file: File; url: string } | null>(null);
  const [photo2c, setPhoto2c] = useState<{ file: File; url: string } | null>(null);
  const [photo3, setPhoto3] = useState<{ file: File; url: string } | null>(null);
  const [photoCreation, setPhotoCreation] = useState<{ file: File; url: string } | null>(null);

  // Macro zone (% relative)
  const [macroZone, setMacroZone] = useState({ x: 60, y: 70, w: 25, h: 20 });
  const [dragging, setDragging] = useState(false);

  // Form (Typeform style — one field per screen)
  const [title, setTitle] = useState("");
  const [technique, setTechnique] = useState("");
  const [dimW, setDimW] = useState("");
  const [dimH, setDimH] = useState("");
  const [year, setYear] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");

  const [step, setStep] = useState<Step>("intro");
  const [aiLoading, setAiLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [authUser, setAuthUser] = useState<any | null | "loading">("loading");

  // Check auth on mount — certify requires a valid user.id (UUID) on pass-core
  useEffect(() => {
    let alive = true;
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (alive) setAuthUser(j?.user || null); })
      .catch(() => { if (alive) setAuthUser(null); });
    return () => { alive = false; };
  }, []);
  const [qualityScore, setQualityScore] = useState<any>(null);
  const [qualityScore2, setQualityScore2] = useState<any>(null);
  const [qualityScore2b, setQualityScore2b] = useState<any>(null);
  const [qualityScore2c, setQualityScore2c] = useState<any>(null);
  const [analyzingPhoto, setAnalyzingPhoto] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [returnToReview, setReturnToReview] = useState(false);
  const recognitionRef = useRef<any>(null);

  // ── Identification (auto-signup si pas de session) ────────────
  const [identEmail, setIdentEmail] = useState("");
  const [identName, setIdentName] = useState("");
  const [identPhone, setIdentPhone] = useState("");
  const [identRole, setIdentRole] = useState<"artist" | "galeriste" | "antiquaire" | "brocanteur" | "depot_vente" | "client">("artist");
  const [merchantRaisonSociale, setMerchantRaisonSociale] = useState("");
  const [merchantSiret, setMerchantSiret] = useState("");
  const [merchantActivite, setMerchantActivite] = useState("");
  const [merchantNomGerant, setMerchantNomGerant] = useState("");
  const [merchantAdresse, setMerchantAdresse] = useState("");
  const [merchantCodePostal, setMerchantCodePostal] = useState("");
  const [merchantVille, setMerchantVille] = useState("");
  const PRO_ROLES_SET = ["galeriste", "antiquaire", "brocanteur", "depot_vente"] as const;
  const isProRole = PRO_ROLES_SET.includes(identRole as any);

  const fileRef = useRef<HTMLInputElement>(null);
  const zoneRef = useRef<HTMLDivElement>(null);

  // ── Live camera overlay (3 macros avec jauge temps reel) ──
  const [liveCapture, setLiveCapture] = useState<null | "photo2" | "photo2b" | "photo2c">(null);

  function qualityFromCamera(q: CameraQuality) {
    // Mappe CameraQuality (sharpness/exposure/resolution/score) vers
    // la shape que la gauge post-capture affiche deja.
    let status: string, message: string;
    if (q.score >= 75) { status = "excellent"; message = "Bonne qualité — détails suffisants"; }
    else if (q.score >= 50) { status = "acceptable"; message = q.feedback || "Qualité correcte"; }
    else { status = "insufficient"; message = q.feedback || "Qualité insuffisante"; }
    return {
      score: q.score,
      status,
      message,
      details: {
        resolution: {
          score: Math.min(100, Math.round(q.resolution * 20)),
          value: `${q.resolution} MP`,
          megapixels: q.resolution.toFixed(1),
        },
        sharpness: q.sharpness,
        exposure: q.exposure,
        liveCapture: true,
      },
    };
  }

  function handleLiveCapture(
    blob: Blob,
    dataUrl: string,
    width: number,
    height: number,
    q: CameraQuality
  ) {
    const which = liveCapture;
    if (!which) return;
    const file = new File([blob], `macro-${which}.jpg`, { type: "image/jpeg" });
    const url = URL.createObjectURL(blob);
    const qMapped = qualityFromCamera(q);
    if (which === "photo2") { setPhoto2({ file, url }); setQualityScore2(qMapped); }
    if (which === "photo2b") { setPhoto2b({ file, url }); setQualityScore2b(qMapped); }
    if (which === "photo2c") { setPhoto2c({ file, url }); setQualityScore2c(qMapped); }
    setLiveCapture(null);
  }

  // Progress
  const ALL_STEPS: Step[] = ["intro", "photo1", "zone_select", "photo2", "photo2b", "photo2c", "photo3", "f_title", "f_technique", "f_dimensions", "f_year", "f_description", "f_price", "f_identification", "review", "submitting", "done"];
  const stepIdx = ALL_STEPS.indexOf(step);
  const progress = Math.round((stepIdx / (ALL_STEPS.length - 1)) * 100);

  // ── Instant quality score (synchronous, from file.size only) ─
  function instantQuality(file: File) {
    const sizeMB = file.size / (1024 * 1024);
    // Heuristic: macro photos from a good phone camera are typically 2-8 MB
    // < 0.5 MB = low quality/compressed, 1-3 MB = good, > 3 MB = excellent
    const sizeScore = Math.min(100, Math.round(sizeMB * 30));
    // Assume decent resolution from a modern phone (will refine async)
    const score = Math.min(100, Math.max(10, Math.round(sizeScore * 0.6 + 50 * 0.4)));
    let status: string, message: string;
    if (score >= 75) { status = "excellent"; message = "Bonne qualité — détails suffisants"; }
    else if (score >= 50) { status = "acceptable"; message = "Qualité correcte — rapprochez-vous si possible"; }
    else { status = "insufficient"; message = "Qualité insuffisante — rapprochez-vous et stabilisez"; }
    return { score, status, message, details: { resolution: { score: sizeScore, value: "...", megapixels: "..." } } };
  }

  // ── Photo capture ──────────────────────────────────────
  function capturePhoto(setter: (v: { file: File; url: string }) => void, qualitySetter?: (v: any) => void) {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.capture = "environment";
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (file) {
        setter({ file, url: URL.createObjectURL(file) });
        if (qualitySetter) {
          // ★ INSTANT: set quality gauge synchronously from file.size — visible immediately
          qualitySetter(instantQuality(file));
          // Then refine in background with full analysis (Image dimensions + API)
          refineQuality(file, qualitySetter);
        }
      }
    };
    input.click();
  }

  // ── Refined quality (async — updates gauge after initial instant display) ─
  async function refineQuality(file: File, setter: (v: any) => void) {
    try {
      // Step 1: quick client-side with Image dimensions
      const clientResult = await new Promise<any>((resolve, reject) => {
        const img = new window.Image();
        img.onload = () => {
          const w = img.naturalWidth, h = img.naturalHeight;
          const mp = (w * h) / 1_000_000;
          const resScore = Math.min(100, Math.round((mp / 2) * 100));
          const sizeMB = file.size / (1024 * 1024);
          const sizeScore = Math.min(100, Math.round(sizeMB * 40));
          const ratio = w / h;
          const ratioScore = (ratio > 0.5 && ratio < 2) ? 85 : 50;
          const score = Math.round(resScore * 0.4 + sizeScore * 0.35 + ratioScore * 0.25);
          let message: string, status: string;
          if (score >= 75) { status = "excellent"; message = "Bonne qualité — détails suffisants"; }
          else if (score >= 50) { status = "acceptable"; message = "Qualité correcte — rapprochez-vous si possible"; }
          else { status = "insufficient"; message = "Qualité insuffisante — rapprochez-vous et stabilisez"; }
          resolve({ score: Math.min(100, Math.max(10, score)), status, message, details: { resolution: { score: resScore, value: `${w}x${h}`, megapixels: mp.toFixed(1) } } });
        };
        img.onerror = () => reject();
        img.src = URL.createObjectURL(file);
      });
      setter(clientResult); // Update gauge with better estimate

      // Step 2: try server API for even better analysis (non-blocking)
      try {
        const fd = new FormData();
        fd.append("photo", file);
        const res = await fetch("/api/analyze-photo", { method: "POST", body: fd });
        if (res.ok) {
          const data = await res.json();
          if (data.score !== undefined) setter(data);
        }
      } catch { /* keep client result */ }
    } catch { /* keep instant result */ }
  }

  // ── Analyze photo quality (for main photo — non-macro) ──
  async function analyzePhoto(file: File, setter?: (v: any) => void) {
    const target = setter || setQualityScore;
    setAnalyzingPhoto(true);
    try {
      const fd = new FormData();
      fd.append("photo", file);
      const res = await fetch("/api/analyze-photo", { method: "POST", body: fd });
      if (!res.ok) throw new Error("API error");
      const data = await res.json();
      if (data.score !== undefined) { target(data); } else { throw new Error("Invalid"); }
    } catch {
      try {
        target(instantQuality(file));
      } catch {
        target({ score: 70, status: "acceptable", message: "Analyse estimée" });
      }
    }
    finally { setAnalyzingPhoto(false); }
  }

  // ── Zone drag on touch ─────────────────────────────────
  function handleZoneTouch(e: React.TouchEvent) {
    if (!zoneRef.current) return;
    const rect = zoneRef.current.getBoundingClientRect();
    const touch = e.touches[0];
    const x = Math.max(0, Math.min(100 - macroZone.w, ((touch.clientX - rect.left) / rect.width) * 100 - macroZone.w / 2));
    const y = Math.max(0, Math.min(100 - macroZone.h, ((touch.clientY - rect.top) / rect.height) * 100 - macroZone.h / 2));
    setMacroZone(z => ({ ...z, x: Math.round(x), y: Math.round(y) }));
  }

  // ── Speech-to-text (microphone) ─────────────────────────
  function toggleListening() {
    if (isListening) {
      // Stop listening
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("La reconnaissance vocale n'est pas supportée par ce navigateur. Utilisez Chrome ou Safari.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "fr-FR";
    recognition.continuous = true;
    recognition.interimResults = true;

    // Store the description text at the moment recording started
    const baseText = description.trimEnd();
    let accumulatedFinal = "";

    recognition.onstart = () => setIsListening(true);

    recognition.onresult = (event: any) => {
      let interim = "";
      accumulatedFinal = "";
      for (let i = 0; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          accumulatedFinal += transcript;
        } else {
          interim = transcript;
        }
      }
      const newText = (accumulatedFinal + interim).trim();
      const combined = baseText ? baseText + " " + newText : newText;
      setDescription(combined.slice(0, 600));
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      if (event.error === "not-allowed") {
        alert("Veuillez autoriser l'accès au microphone dans les paramètres de votre navigateur.");
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    recognition.start();
  }

  // Cleanup speech recognition on unmount
  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  // ── AI description ─────────────────────────────────────
  async function generateAI() {
    setAiLoading(true);
    try {
      const res = await fetch("/api/ai-describe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, technique, dimensions: `${dimW}x${dimH} cm`, year }),
      });
      if (!res.ok) throw new Error("AI description failed");
      const data = await res.json();
      if (data.description) setDescription(data.description);
    } catch {}
    finally { setAiLoading(false); }
  }

  // ── Compression cote client (evite 413 sur Vercel 4.5MB) ──
  // Photos Xiaomi = 3-8MB chacune, 4-5 photos = 15-40MB.
  // Cible : 2048x2048 max, JPEG 0.85 → 600-1500KB par photo.
  async function compressFile(file: File, maxDim = 2048, quality = 0.85): Promise<File> {
    if (file.size < 1_200_000) return file; // deja leger
    const dataUrl: string = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error("read fail"));
      reader.readAsDataURL(file);
    });
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          const r = Math.min(maxDim / width, maxDim / height);
          width = Math.round(width * r);
          height = Math.round(height * r);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("canvas 2D indisponible"));
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (!blob) return reject(new Error("compression echouee"));
            resolve(new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" }));
          },
          "image/jpeg",
          quality
        );
      };
      img.onerror = () => reject(new Error("image illisible"));
      img.src = dataUrl;
    });
  }

  // ── Submit ─────────────────────────────────────────────
  async function handleSubmit() {
    setStep("submitting");
    setLoading(true);
    try {
      // Compresse toutes les photos avant submit pour rester sous 4.5MB (limite Vercel)
      const compressed: Record<string, File | null> = {};
      const toCompress: Array<[string, { file: File; url: string } | null]> = [
        ["photo1", photo1], ["photo2", photo2], ["photo2b", photo2b],
        ["photo2c", photo2c], ["photo3", photo3], ["photoCreation", photoCreation],
      ];
      for (const [key, ph] of toCompress) {
        if (!ph) { compressed[key] = null; continue; }
        try {
          compressed[key] = await compressFile(ph.file);
        } catch (e) {
          console.warn(`[certifier] compression ${key} failed, sending original:`, e);
          compressed[key] = ph.file;
        }
      }
      const totalKB = Math.round(
        Object.values(compressed).reduce((s, f) => s + (f?.size || 0), 0) / 1024
      );
      console.log(`[certifier] total payload compressed : ${totalKB} KB`);

      const fd = new FormData();
      fd.append("title", title);
      fd.append("technique", technique);
      fd.append("dimensions", `${dimW} x ${dimH} cm`);
      fd.append("year", year);
      fd.append("description", description);
      fd.append("price", price || "0");
      fd.append("macro_zone", JSON.stringify(macroZone));
      fd.append("macro_position", `${macroZone.x},${macroZone.y},${macroZone.w},${macroZone.h}`);
      fd.append("macro_quality_score", String(qualityScore?.score || 0));
      if (compressed.photo1) fd.append("main_photo", compressed.photo1);
      if (compressed.photo2) fd.append("macro_photo", compressed.photo2);
      if (compressed.photo2b) fd.append("macro_photos", compressed.photo2b);
      if (compressed.photo2c) fd.append("macro_photos", compressed.photo2c);
      if (compressed.photo3) fd.append("extra_photos", compressed.photo3);
      if (compressed.photoCreation) fd.append("extra_photos", compressed.photoCreation);

      // ── Identification (auto-signup si pas de session existante) ──
      // Si l'utilisateur est déjà connecté (authUser présent), ces champs
      // sont quand même envoyés mais l'API ignore car artistId est déjà résolu.
      if (identEmail) fd.append("user_email", identEmail);
      if (identName)  fd.append("user_name", identName);
      if (identPhone) fd.append("user_phone", identPhone);
      if (identRole)  fd.append("user_role", identRole);
      if (isProRole) {
        if (merchantRaisonSociale) fd.append("merchant_raison_sociale", merchantRaisonSociale);
        if (merchantSiret)         fd.append("merchant_siret", merchantSiret);
        if (merchantActivite)      fd.append("merchant_activite", merchantActivite);
        if (merchantNomGerant)     fd.append("merchant_nom_gerant", merchantNomGerant);
        if (merchantAdresse)       fd.append("merchant_adresse", merchantAdresse);
        if (merchantCodePostal)    fd.append("merchant_code_postal", merchantCodePostal);
        if (merchantVille)         fd.append("merchant_ville", merchantVille);
      }

      const res = await fetch("/api/certify", { method: "POST", body: fd });
      if (!res.ok) {
        let errMsg = `Erreur serveur (${res.status})`;
        if (res.status === 413) {
          errMsg = `Photos trop volumineuses apres compression (${totalKB} KB). Reessayez avec des zooms moins larges.`;
        } else {
          try { const errData = await res.json(); errMsg = errData.error || errMsg; } catch { /* ignore */ }
        }
        throw new Error(errMsg);
      }
      const data = await res.json();
      setResult(data);
      setStep("done");
    } catch (err: any) {
      alert("Erreur: " + err.message);
      setStep("review");
    } finally { setLoading(false); }
  }

  // ── Nav helpers ────────────────────────────────────────
  function NavButtons({ back, next, nextDisabled, nextLabel }: { back?: Step; next?: () => void; nextDisabled?: boolean; nextLabel?: string }) {
    // If we came from review, show "Retour au résumé" instead of normal navigation
    const goBackToReview = () => { setReturnToReview(false); setStep("review"); };

    return (
      <div className="flex gap-3 mt-8">
        {returnToReview ? (
          <button onClick={goBackToReview}
            className="flex-1 py-4 rounded-xl border border-[#C9A84C]/30 text-[#C9A84C] font-medium flex items-center justify-center gap-2 active:bg-[#C9A84C]/10">
            <ChevronLeft className="size-4" /> Retour au resume
          </button>
        ) : back ? (
          <button onClick={() => setStep(back)} className="flex-1 py-4 rounded-xl border border-white/10 text-white/50 font-medium flex items-center justify-center gap-2 active:bg-white/5">
            <ChevronLeft className="size-4" /> Retour
          </button>
        ) : null}
        {returnToReview ? (
          <button onClick={goBackToReview} disabled={nextDisabled}
            className="flex-1 py-4 rounded-xl bg-[#C9A84C] text-navy-DEFAULT font-semibold disabled:opacity-30 active:brightness-90 flex items-center justify-center gap-2">
            Valider <Check className="size-5" />
          </button>
        ) : next ? (
          <button onClick={next} disabled={nextDisabled}
            className="flex-1 py-4 rounded-xl bg-[#C9A84C] text-navy-DEFAULT font-semibold disabled:opacity-30 active:brightness-90 flex items-center justify-center gap-2">
            {nextLabel || "Continuer"} <ChevronRight className="size-5" />
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 min-h-[calc(100vh-4rem)] pb-24">
      {/* ═══ OVERLAY CAMERA LIVE (jauge temps reel pour les 3 macros) ═══ */}
      {liveCapture && (
        <CaptureStep
          title={
            liveCapture === "photo2" ? "Macro 1/3 — Vue frontale" :
            liveCapture === "photo2b" ? "Macro 2/3 — Lumière rasante" :
            "Macro 3/3 — Ultra-détail"
          }
          subtitle={
            liveCapture === "photo2" ? "5-10 cm, bien en face de la zone" :
            liveCapture === "photo2b" ? "Inclinez à 30° pour révéler les reliefs" :
            "2-3 cm, pigments et micro-textures"
          }
          onCapture={handleLiveCapture}
          onCancel={() => setLiveCapture(null)}
        />
      )}

      {/* Progress bar */}
      {step !== "intro" && step !== "done" && (
        <div className="h-1 bg-white/5 rounded-full mb-6 overflow-hidden">
          <div className="h-full bg-[#C9A84C] rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      )}

      {/* ═══ AUTH LOADING ═══ */}
      {step === "intro" && authUser === "loading" && (
        <div className="animate-fade-in text-center pt-20">
          <Loader2 className="size-8 text-[#C9A84C] animate-spin mx-auto mb-3" />
          <p className="text-white/50 text-sm">Chargement…</p>
        </div>
      )}

      {/* ═══ INTRO ═══ (connecté OU non — on identifie au step f_identification si null) */}
      {step === "intro" && authUser !== "loading" && (
        <div className="animate-fade-in text-center pt-6">
          <div className="w-20 h-20 rounded-full bg-[#C9A84C]/10 border border-[#C9A84C]/30 flex items-center justify-center mx-auto mb-6">
            <ShieldCheck className="size-10 text-[#C9A84C]" />
          </div>
          {authUser?.email
            ? <p className="text-xs text-[#C9A84C]/70 mb-2">Connecté en tant que {authUser.name || authUser.email}</p>
            : <p className="text-xs text-white/40 mb-2">Pas de compte ? Pas de problème — on le crée à la fin.</p>}
          <h1 className="font-display text-2xl font-semibold text-white mb-3">Certifiez votre œuvre en 5 minutes</h1>
          <p className="text-white/40 text-sm mb-8 leading-relaxed">
            ART-CORE vérifie que votre œuvre est originale. Ce processus protège votre travail et rassure les acheteurs.
          </p>
          <div className="space-y-3 text-left mb-10">
            {[
              { icon: Award, text: "Badge certifié visible sur votre fiche", c: "text-green-400 bg-green-500/10" },
              { icon: TrendingUp, text: "Les œuvres certifiées se vendent 40% plus cher", c: "text-[#C9A84C] bg-[#C9A84C]/10" },
              { icon: Lock, text: "Protection contre la contrefaçon", c: "text-blue-400 bg-blue-500/10" },
            ].map(b => (
              <div key={b.text} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/5">
                <div className={`w-9 h-9 rounded-lg ${b.c.split(" ")[1]} flex items-center justify-center shrink-0`}>
                  <b.icon className={`size-5 ${b.c.split(" ")[0]}`} />
                </div>
                <p className="text-sm text-white/70">{b.text}</p>
              </div>
            ))}
          </div>
          <button onClick={() => setStep("photo1")} className="w-full py-4 rounded-xl bg-[#C9A84C] text-navy-DEFAULT font-semibold text-base active:brightness-90 flex items-center justify-center gap-2">
            Commencer <ChevronRight className="size-5" />
          </button>
        </div>
      )}

      {/* ═══ PHOTO 1 — Vue complète ═══ */}
      {step === "photo1" && (
        <div className="animate-fade-in">
          <p className="text-xs text-[#C9A84C] font-medium mb-1">PHOTO 1 / 5</p>
          <h2 className="text-xl font-semibold text-white mb-1">Vue complète de face</h2>
          <p className="text-white/35 text-sm mb-6">Reculez à 1 mètre — l&apos;œuvre doit remplir 80% du cadre</p>

          {photo1 ? (
            <div className="relative rounded-2xl overflow-hidden mb-4">
              <img src={photo1.url} alt="" className="w-full" />
              <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-medium">
                <Check className="size-3" /> Capturée
              </div>
              <button onClick={() => capturePhoto(setPhoto1)} className="absolute bottom-3 right-3 px-3 py-1.5 rounded-lg bg-black/60 text-white text-xs">Reprendre</button>
            </div>
          ) : (
            <button onClick={() => capturePhoto(setPhoto1)}
              className="w-full aspect-[3/4] rounded-2xl border-2 border-dashed border-[#C9A84C]/30 flex flex-col items-center justify-center gap-4 bg-[#C9A84C]/5 active:bg-[#C9A84C]/10 mb-4">
              {/* Golden frame overlay guide */}
              <div className="absolute inset-[15%] border-2 border-[#C9A84C]/40 rounded-xl" />
              <Camera className="size-12 text-[#C9A84C]" />
              <p className="text-[#C9A84C] font-medium">Prendre la photo</p>
              <p className="text-white/20 text-xs">Lumiere naturelle, pas de reflet</p>
            </button>
          )}

          {/* Quality feedback */}
          {photo1 && qualityScore && (
            <div className={`rounded-xl p-3 mb-4 ${qualityScore.score >= 70 ? "bg-green-500/10 border border-green-500/20" : "bg-yellow-500/10 border border-yellow-500/20"}`}>
              <p className={`text-sm font-medium ${qualityScore.score >= 70 ? "text-green-400" : "text-yellow-400"}`}>
                Qualité : {qualityScore.score}/100 — {qualityScore.message}
              </p>
            </div>
          )}

          {photo1 && !qualityScore && !analyzingPhoto && (
            <button onClick={() => analyzePhoto(photo1.file)} className="w-full py-3 rounded-xl bg-white/5 border border-white/10 text-white/50 text-sm mb-4">
              <Eye className="size-4 inline mr-2" />Vérifier la qualité
            </button>
          )}
          {analyzingPhoto && <p className="text-center text-white/30 text-sm mb-4"><Loader2 className="size-4 inline animate-spin mr-2" />Analyse en cours...</p>}

          <NavButtons back="intro" next={() => setStep("zone_select")} nextDisabled={!photo1} />
        </div>
      )}

      {/* ═══ ZONE SELECT — Position macro sur Photo 1 ═══ */}
      {step === "zone_select" && photo1 && (
        <div className="animate-fade-in">
          <p className="text-xs text-[#C9A84C] font-medium mb-1">ZONE MACRO</p>
          <h2 className="text-xl font-semibold text-white mb-1">Où allez-vous prendre le détail ?</h2>
          <p className="text-white/35 text-sm mb-4">Déplacez le cadre rouge sur la zone que vous allez photographier en gros plan</p>

          <div ref={zoneRef} className="relative rounded-2xl overflow-hidden mb-4 touch-none"
            onTouchMove={handleZoneTouch}>
            <img src={photo1.url} alt="" className="w-full" />
            {/* Macro zone overlay */}
            <div className="absolute border-[3px] border-red-500 bg-red-500/15 rounded-lg shadow-[0_0_15px_rgba(239,68,68,0.3)] transition-all"
              style={{ left: `${macroZone.x}%`, top: `${macroZone.y}%`, width: `${macroZone.w}%`, height: `${macroZone.h}%` }}>
              <div className="absolute inset-0 flex items-center justify-center">
                <Move className="size-5 text-red-400/60" />
              </div>
              <span className="absolute -top-6 left-0 text-[10px] text-red-400 bg-black/70 px-2 py-0.5 rounded font-medium">
                Zone détail
              </span>
            </div>
            {/* Grid overlay */}
            <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="border border-white/[0.06]" />
              ))}
            </div>
          </div>

          <div className="rounded-xl bg-white/[0.03] border border-white/5 p-3 mb-4">
            <p className="text-[11px] text-white/35">
              <Fingerprint className="size-3 inline mr-1 text-[#C9A84C]" />
              Cette zone sera votre empreinte de certification. Elle sera enregistrée et visible sur la fiche de l&apos;œuvre.
            </p>
          </div>

          <NavButtons back="photo1" next={() => setStep("photo2")} />
        </div>
      )}

      {/* ═══ PHOTO 2 — Macro 1 : Gros plan frontal ═══ */}
      {step === "photo2" && (
        <div className="animate-fade-in">
          <p className="text-xs text-[#C9A84C] font-medium mb-1">MACRO 1 / 3</p>
          <h2 className="text-xl font-semibold text-white mb-1">Macro — Vue frontale</h2>
          <p className="text-white/35 text-sm mb-4">Rapprochez-vous à 5-10cm de la zone, bien en face</p>

          {/* Reference: miniature photo1 + zone */}
          {photo1 && (
            <div className="relative w-20 h-20 rounded-lg overflow-hidden mb-4 border border-white/10">
              <img src={photo1.url} alt="" className="w-full h-full object-cover" />
              <div className="absolute border-2 border-red-500 rounded-sm animate-pulse"
                style={{ left: `${macroZone.x}%`, top: `${macroZone.y}%`, width: `${macroZone.w}%`, height: `${macroZone.h}%` }} />
              <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-[8px] text-red-400 text-center py-0.5">Zone cible</span>
            </div>
          )}

          {photo2 ? (
            <div className="relative rounded-2xl overflow-hidden border-2 border-[#C9A84C]/30 mb-4">
              <img src={photo2.url} alt="" className="w-full" />
              <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-medium">
                <Check className="size-3" /> Macro frontale
              </div>
              <button onClick={() => { setQualityScore2(null); setLiveCapture("photo2"); }} className="absolute bottom-3 right-3 px-3 py-1.5 rounded-lg bg-black/60 text-white text-xs">Reprendre</button>
            </div>
          ) : (
            <button onClick={() => setLiveCapture("photo2")}
              className="w-full aspect-square rounded-2xl border-2 border-dashed border-[#C9A84C]/40 flex flex-col items-center justify-center gap-3 bg-[#C9A84C]/5 active:bg-[#C9A84C]/10 mb-4">
              <ZoomIn className="size-12 text-[#C9A84C]" />
              <p className="text-[#C9A84C] font-medium">Photo macro frontale</p>
              <p className="text-white/20 text-xs">5-10cm, bien en face de la zone</p>
              <p className="text-[11px] text-white/40 mt-1">Caméra live + jauge temps réel</p>
            </button>
          )}

          {/* Quality gauge — macro 1 */}
          {photo2 && qualityScore2 && (
            <div className={`rounded-xl p-3 mb-4 ${qualityScore2.score >= 70 ? "bg-green-500/10 border border-green-500/20" : "bg-yellow-500/10 border border-yellow-500/20"}`}>
              <div className="flex items-center justify-between mb-2">
                <p className={`text-sm font-medium ${qualityScore2.score >= 70 ? "text-green-400" : "text-yellow-400"}`}>
                  Qualité macro : {qualityScore2.score}/100
                </p>
                <span className={`text-xs px-2 py-0.5 rounded-full ${qualityScore2.score >= 70 ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"}`}>
                  {qualityScore2.score >= 70 ? "Validée" : "Insuffisante"}
                </span>
              </div>
              <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-700 ${qualityScore2.score >= 70 ? "bg-green-500" : "bg-yellow-500"}`}
                  style={{ width: `${qualityScore2.score}%` }} />
              </div>
              {qualityScore2.message && <p className="text-[11px] text-white/30 mt-1">{qualityScore2.message}</p>}
            </div>
          )}
          {photo2 && !qualityScore2 && (
            <div className="flex items-center justify-center gap-2 py-3 mb-4 text-white/30 text-sm">
              <Loader2 className="size-4 animate-spin text-[#C9A84C]" />Analyse qualité en cours...
            </div>
          )}

          <NavButtons back="zone_select" next={() => setStep("photo2b")} nextDisabled={!photo2} />
        </div>
      )}

      {/* ═══ PHOTO 2B — Macro 2 : Angle rasant ═══ */}
      {step === "photo2b" && (
        <div className="animate-fade-in">
          <p className="text-xs text-[#C9A84C] font-medium mb-1">MACRO 2 / 3</p>
          <h2 className="text-xl font-semibold text-white mb-1">Macro — Lumière rasante</h2>
          <p className="text-white/35 text-sm mb-4">Même zone, inclinez le téléphone à 30° pour révéler les textures et reliefs</p>

          {/* Reference: miniature photo1 + zone */}
          {photo1 && (
            <div className="relative w-20 h-20 rounded-lg overflow-hidden mb-4 border border-white/10">
              <img src={photo1.url} alt="" className="w-full h-full object-cover" />
              <div className="absolute border-2 border-red-500 rounded-sm"
                style={{ left: `${macroZone.x}%`, top: `${macroZone.y}%`, width: `${macroZone.w}%`, height: `${macroZone.h}%` }} />
              <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-[8px] text-red-400 text-center py-0.5">Même zone</span>
            </div>
          )}

          {photo2b ? (
            <div className="relative rounded-2xl overflow-hidden border-2 border-[#C9A84C]/30 mb-4">
              <img src={photo2b.url} alt="" className="w-full" />
              <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-medium">
                <Check className="size-3" /> Lumière rasante
              </div>
              <button onClick={() => { setQualityScore2b(null); setLiveCapture("photo2b"); }} className="absolute bottom-3 right-3 px-3 py-1.5 rounded-lg bg-black/60 text-white text-xs">Reprendre</button>
            </div>
          ) : (
            <button onClick={() => setLiveCapture("photo2b")}
              className="w-full aspect-square rounded-2xl border-2 border-dashed border-[#C9A84C]/40 flex flex-col items-center justify-center gap-3 bg-[#C9A84C]/5 active:bg-[#C9A84C]/10 mb-4">
              <ZoomIn className="size-12 text-[#C9A84C]" />
              <p className="text-[#C9A84C] font-medium">Macro angle rasant</p>
              <p className="text-white/20 text-xs">Inclinez à 30° pour les reliefs</p>
              <p className="text-[11px] text-white/40 mt-1">Caméra live + jauge temps réel</p>
            </button>
          )}

          {/* Quality gauge — macro 2 */}
          {photo2b && qualityScore2b && (
            <div className={`rounded-xl p-3 mb-4 ${qualityScore2b.score >= 70 ? "bg-green-500/10 border border-green-500/20" : "bg-yellow-500/10 border border-yellow-500/20"}`}>
              <div className="flex items-center justify-between mb-2">
                <p className={`text-sm font-medium ${qualityScore2b.score >= 70 ? "text-green-400" : "text-yellow-400"}`}>
                  Qualité macro : {qualityScore2b.score}/100
                </p>
                <span className={`text-xs px-2 py-0.5 rounded-full ${qualityScore2b.score >= 70 ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"}`}>
                  {qualityScore2b.score >= 70 ? "Validée" : "Insuffisante"}
                </span>
              </div>
              <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-700 ${qualityScore2b.score >= 70 ? "bg-green-500" : "bg-yellow-500"}`}
                  style={{ width: `${qualityScore2b.score}%` }} />
              </div>
              {qualityScore2b.message && <p className="text-[11px] text-white/30 mt-1">{qualityScore2b.message}</p>}
            </div>
          )}
          {photo2b && !qualityScore2b && (
            <div className="flex items-center justify-center gap-2 py-3 mb-4 text-white/30 text-sm">
              <Loader2 className="size-4 animate-spin text-[#C9A84C]" />Analyse qualité en cours...
            </div>
          )}

          <NavButtons back="photo2" next={() => setStep("photo2c")} nextDisabled={!photo2b} />
        </div>
      )}

      {/* ═══ PHOTO 2C — Macro 3 : Ultra-détail ═══ */}
      {step === "photo2c" && (
        <div className="animate-fade-in">
          <p className="text-xs text-[#C9A84C] font-medium mb-1">MACRO 3 / 3</p>
          <h2 className="text-xl font-semibold text-white mb-1">Macro — Ultra-détail</h2>
          <p className="text-white/35 text-sm mb-4">Collez le téléphone à 2-3cm pour capturer les micro-détails (pigments, craquelures, coups de pinceau)</p>

          {/* Reference: miniature photo1 + zone */}
          {photo1 && (
            <div className="relative w-20 h-20 rounded-lg overflow-hidden mb-4 border border-white/10">
              <img src={photo1.url} alt="" className="w-full h-full object-cover" />
              <div className="absolute border-2 border-red-500 rounded-sm"
                style={{ left: `${macroZone.x}%`, top: `${macroZone.y}%`, width: `${macroZone.w}%`, height: `${macroZone.h}%` }} />
              <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-[8px] text-red-400 text-center py-0.5">Même zone</span>
            </div>
          )}

          {photo2c ? (
            <div className="relative rounded-2xl overflow-hidden border-2 border-[#C9A84C]/30 mb-4">
              <img src={photo2c.url} alt="" className="w-full" />
              <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-medium">
                <Check className="size-3" /> Ultra-détail
              </div>
              <button onClick={() => { setQualityScore2c(null); setLiveCapture("photo2c"); }} className="absolute bottom-3 right-3 px-3 py-1.5 rounded-lg bg-black/60 text-white text-xs">Reprendre</button>
            </div>
          ) : (
            <button onClick={() => setLiveCapture("photo2c")}
              className="w-full aspect-square rounded-2xl border-2 border-dashed border-[#C9A84C]/40 flex flex-col items-center justify-center gap-3 bg-[#C9A84C]/5 active:bg-[#C9A84C]/10 mb-4">
              <ZoomIn className="size-12 text-[#C9A84C]" />
              <p className="text-[#C9A84C] font-medium">Ultra-détail</p>
              <p className="text-white/20 text-xs">2-3cm, pigments et micro-textures</p>
              <p className="text-[11px] text-white/40 mt-1">Caméra live + jauge temps réel</p>
            </button>
          )}

          {/* Quality gauge — macro 3 */}
          {photo2c && qualityScore2c && (
            <div className={`rounded-xl p-3 mb-4 ${qualityScore2c.score >= 70 ? "bg-green-500/10 border border-green-500/20" : "bg-yellow-500/10 border border-yellow-500/20"}`}>
              <div className="flex items-center justify-between mb-2">
                <p className={`text-sm font-medium ${qualityScore2c.score >= 70 ? "text-green-400" : "text-yellow-400"}`}>
                  Qualité macro : {qualityScore2c.score}/100
                </p>
                <span className={`text-xs px-2 py-0.5 rounded-full ${qualityScore2c.score >= 70 ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"}`}>
                  {qualityScore2c.score >= 70 ? "Validée" : "Insuffisante"}
                </span>
              </div>
              <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-700 ${qualityScore2c.score >= 70 ? "bg-green-500" : "bg-yellow-500"}`}
                  style={{ width: `${qualityScore2c.score}%` }} />
              </div>
              {qualityScore2c.message && <p className="text-[11px] text-white/30 mt-1">{qualityScore2c.message}</p>}
            </div>
          )}
          {photo2c && !qualityScore2c && (
            <p className="text-center text-white/30 text-sm mb-4"><Loader2 className="size-4 inline animate-spin mr-2" />Analyse en cours...</p>
          )}
          {/* Quality gauge appears instantly via instantQuality() — no manual button needed */}

          <NavButtons back="photo2b" next={() => setStep("photo3")} nextDisabled={!photo2c} />
        </div>
      )}

      {/* ═══ PHOTO 3 — Vue de côté ═══ */}
      {step === "photo3" && (
        <div className="animate-fade-in">
          <p className="text-xs text-[#C9A84C] font-medium mb-1">PHOTO 5 / 5</p>
          <h2 className="text-xl font-semibold text-white mb-1">Vue de côté (30-45 degrés)</h2>
          <p className="text-white/35 text-sm mb-6">Photographiez l&apos;œuvre légèrement de côté pour voir l&apos;épaisseur et la texture</p>

          {photo3 ? (
            <div className="relative rounded-2xl overflow-hidden mb-4">
              <img src={photo3.url} alt="" className="w-full" />
              <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-medium">
                <Check className="size-3" /> Vue latérale
              </div>
              <button onClick={() => capturePhoto(setPhoto3)} className="absolute bottom-3 right-3 px-3 py-1.5 rounded-lg bg-black/60 text-white text-xs">Reprendre</button>
            </div>
          ) : (
            <button onClick={() => capturePhoto(setPhoto3)}
              className="w-full aspect-[4/3] rounded-2xl border-2 border-dashed border-white/15 flex flex-col items-center justify-center gap-3 bg-white/[0.02] active:bg-white/5 mb-4">
              <RotateCcw className="size-10 text-white/30" />
              <p className="text-white/50 font-medium">Vue de côté</p>
            </button>
          )}

          {/* Optional: photo en cours de creation */}
          <div className="rounded-xl bg-white/[0.02] border border-white/5 p-4 mb-4">
            <p className="text-sm text-white/50 mb-2">Photo en cours de creation (optionnel)</p>
            {photoCreation ? (
              <div className="relative w-20 h-20 rounded-lg overflow-hidden inline-block">
                <img src={photoCreation.url} alt="" className="w-full h-full object-cover" />
                <button onClick={() => setPhotoCreation(null)} className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center"><X className="size-3 text-white" /></button>
              </div>
            ) : (
              <button onClick={() => capturePhoto(setPhotoCreation)} className="text-[#C9A84C] text-xs">+ Ajouter une photo</button>
            )}
          </div>

          <NavButtons back="photo2" next={() => setStep("f_title")} nextDisabled={!photo3} />
        </div>
      )}

      {/* ═══ TYPEFORM — Titre ═══ */}
      {step === "f_title" && (
        <div className="animate-fade-in flex flex-col justify-center min-h-[50vh]">
          <h2 className="font-display text-2xl font-semibold text-white mb-2">Quel est le titre de votre oeuvre ?</h2>
          <p className="text-white/30 text-sm mb-6">Le titre apparaitra sur votre fiche de vente</p>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Crepuscule Dore" autoFocus
            className="w-full h-14 rounded-xl bg-white/5 border border-white/10 text-white text-lg px-4 focus:outline-none focus:border-[#C9A84C]/40" />
          <NavButtons back="photo3" next={() => setStep("f_technique")} nextDisabled={!title.trim()} />
        </div>
      )}

      {/* ═══ TYPEFORM — Technique ═══ */}
      {step === "f_technique" && (
        <div className="animate-fade-in flex flex-col justify-center min-h-[50vh]">
          <h2 className="font-display text-2xl font-semibold text-white mb-2">Quelle technique ?</h2>
          <p className="text-white/30 text-sm mb-6">Sélectionnez la technique principale</p>
          <div className="grid grid-cols-2 gap-2">
            {TECHNIQUES.map(t => (
              <button key={t} onClick={() => setTechnique(t)}
                className={`py-3.5 rounded-xl text-sm font-medium transition-all ${technique === t ? "bg-[#C9A84C] text-navy-DEFAULT" : "bg-white/5 text-white/50 active:bg-white/10"}`}>
                {t}
              </button>
            ))}
          </div>
          <NavButtons back="f_title" next={() => setStep("f_dimensions")} nextDisabled={!technique} />
        </div>
      )}

      {/* ═══ TYPEFORM — Dimensions ═══ */}
      {step === "f_dimensions" && (
        <div className="animate-fade-in flex flex-col justify-center min-h-[50vh]">
          <h2 className="font-display text-2xl font-semibold text-white mb-2">Dimensions ?</h2>
          <p className="text-white/30 text-sm mb-6">Mesurez le bord extérieur du châssis</p>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="text-xs text-white/30 mb-1 block">Largeur</label>
              <input type="number" inputMode="numeric" value={dimW} onChange={e => setDimW(e.target.value)} placeholder="80"
                className="w-full h-14 rounded-xl bg-white/5 border border-white/10 text-white text-xl text-center focus:outline-none focus:border-[#C9A84C]/40" />
            </div>
            <span className="text-white/20 text-2xl mt-5">x</span>
            <div className="flex-1">
              <label className="text-xs text-white/30 mb-1 block">Hauteur</label>
              <input type="number" inputMode="numeric" value={dimH} onChange={e => setDimH(e.target.value)} placeholder="120"
                className="w-full h-14 rounded-xl bg-white/5 border border-white/10 text-white text-xl text-center focus:outline-none focus:border-[#C9A84C]/40" />
            </div>
            <span className="text-white/30 text-sm mt-5">cm</span>
          </div>
          <NavButtons back="f_technique" next={() => setStep("f_year")} nextDisabled={!dimW || !dimH} />
        </div>
      )}

      {/* ═══ TYPEFORM — Annee ═══ */}
      {step === "f_year" && (
        <div className="animate-fade-in flex flex-col justify-center min-h-[50vh]">
          <h2 className="font-display text-2xl font-semibold text-white mb-2">Annee de creation ?</h2>
          <input type="number" inputMode="numeric" value={year} onChange={e => setYear(e.target.value)} placeholder="2024"
            className="w-full h-14 rounded-xl bg-white/5 border border-white/10 text-white text-xl text-center focus:outline-none focus:border-[#C9A84C]/40" />
          <NavButtons back="f_dimensions" next={() => setStep("f_description")} nextDisabled={!year} />
        </div>
      )}

      {/* ═══ TYPEFORM — Description ═══ */}
      {step === "f_description" && (
        <div className="animate-fade-in flex flex-col justify-center min-h-[50vh]">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-display text-2xl font-semibold text-white">Description</h2>
            <div className="flex items-center gap-2">
              <button onClick={toggleListening}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  isListening
                    ? "bg-red-500/20 text-red-400 animate-pulse"
                    : "bg-white/5 text-white/50 active:bg-white/10"
                }`}>
                {isListening ? <MicOff className="size-3" /> : <Mic className="size-3" />}
                {isListening ? "Stop" : "Dicter"}
              </button>
              <button onClick={generateAI} disabled={aiLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#C9A84C]/10 text-[#C9A84C] text-xs font-medium active:bg-[#C9A84C]/20 disabled:opacity-30">
                {aiLoading ? <Loader2 className="size-3 animate-spin" /> : <Sparkles className="size-3" />}
                IA
              </button>
            </div>
          </div>
          <p className="text-white/30 text-sm mb-4">
            {isListening ? "Parlez maintenant..." : "150 mots max — décrivez votre œuvre ou dictez"}
          </p>
          <div className="relative">
            <textarea value={description} onChange={e => setDescription(e.target.value.slice(0, 600))} rows={5}
              placeholder="Décrivez votre œuvre ou appuyez sur Dicter..."
              className={`w-full rounded-xl bg-white/5 border text-white text-sm p-4 resize-none focus:outline-none ${
                isListening ? "border-red-500/40 bg-red-500/5" : "border-white/10 focus:border-[#C9A84C]/40"
              }`} />
            {isListening && (
              <div className="absolute top-3 right-3 flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-red-400 text-[10px] font-medium">REC</span>
              </div>
            )}
          </div>
          <p className="text-[10px] text-white/15 mt-1">{description.length}/600</p>
          <NavButtons back="f_year" next={() => setStep("f_price")} />
        </div>
      )}

      {/* ═══ TYPEFORM — Prix ═══ */}
      {step === "f_price" && (
        <div className="animate-fade-in flex flex-col justify-center min-h-[50vh]">
          <h2 className="font-display text-2xl font-semibold text-white mb-2">Prix de vente ?</h2>
          <p className="text-white/30 text-sm mb-6">Optionnel — vous pourrez le modifier plus tard</p>
          <div className="relative">
            <input type="number" inputMode="numeric" value={price} onChange={e => setPrice(e.target.value)} placeholder="1500"
              className="w-full h-14 rounded-xl bg-white/5 border border-white/10 text-white text-xl text-center pr-10 focus:outline-none focus:border-[#C9A84C]/40" />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 text-lg">EUR</span>
          </div>
          <NavButtons back="f_description" next={() => setStep(authUser?.id ? "review" : "f_identification")} nextLabel={authUser?.id ? "Verifier" : "Identifier"} />
        </div>
      )}

      {/* ═══ IDENTIFICATION (auto-signup pour non-connectés) ═══ */}
      {step === "f_identification" && (
        <div className="animate-fade-in flex flex-col min-h-[50vh] pb-8">
          <h2 className="font-display text-2xl font-semibold text-white mb-2">Identification</h2>
          <p className="text-white/50 text-sm mb-5">
            Pour valider la certification, on a besoin de quelques informations. Un compte sera créé automatiquement.
          </p>

          <div className="space-y-3">
            <div>
              <label className="block text-white/60 text-xs mb-1.5">Nom complet *</label>
              <input
                type="text" value={identName} onChange={(e) => setIdentName(e.target.value)}
                placeholder="Jean Dupont"
                className="w-full h-11 rounded-xl bg-white/5 border border-white/10 text-white px-3 focus:outline-none focus:border-[#C9A84C]/40"
              />
            </div>

            <div>
              <label className="block text-white/60 text-xs mb-1.5">Email *</label>
              <input
                type="email" value={identEmail} onChange={(e) => setIdentEmail(e.target.value)}
                placeholder="jean@exemple.com"
                className="w-full h-11 rounded-xl bg-white/5 border border-white/10 text-white px-3 focus:outline-none focus:border-[#C9A84C]/40"
              />
            </div>

            <div>
              <label className="block text-white/60 text-xs mb-1.5">Téléphone</label>
              <input
                type="tel" value={identPhone} onChange={(e) => setIdentPhone(e.target.value)}
                placeholder="+33 6 12 34 56 78"
                className="w-full h-11 rounded-xl bg-white/5 border border-white/10 text-white px-3 focus:outline-none focus:border-[#C9A84C]/40"
              />
            </div>

            <div>
              <label className="block text-white/60 text-xs mb-2">Vous êtes ? *</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { v: "artist", label: "Artiste" },
                  { v: "galeriste", label: "Galeriste" },
                  { v: "antiquaire", label: "Antiquaire" },
                  { v: "brocanteur", label: "Brocanteur" },
                  { v: "depot_vente", label: "Dépôt-vente" },
                  { v: "client", label: "Particulier" },
                ].map((r) => (
                  <button
                    key={r.v} type="button"
                    onClick={() => setIdentRole(r.v as any)}
                    className={`px-2 py-2 rounded-lg text-xs font-medium transition-colors ${
                      identRole === r.v
                        ? "bg-[#C9A84C]/20 border border-[#C9A84C]/50 text-[#C9A84C]"
                        : "bg-white/5 border border-white/10 text-white/60 hover:text-white"
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            {isProRole && (
              <div className="mt-4 p-4 rounded-xl bg-[#C9A84C]/5 border border-[#C9A84C]/20 space-y-3">
                <p className="text-[#C9A84C] text-xs font-semibold uppercase tracking-wider">
                  Informations professionnelles (obligatoires pour fiche de police)
                </p>
                <div>
                  <label className="block text-white/60 text-xs mb-1.5">Raison sociale *</label>
                  <input type="text" value={merchantRaisonSociale} onChange={(e) => setMerchantRaisonSociale(e.target.value)} placeholder="Galerie Dupont SARL" className="w-full h-11 rounded-xl bg-white/5 border border-white/10 text-white px-3 focus:outline-none focus:border-[#C9A84C]/40" />
                </div>
                <div>
                  <label className="block text-white/60 text-xs mb-1.5">SIRET (14 chiffres) *</label>
                  <input type="text" maxLength={14} value={merchantSiret} onChange={(e) => setMerchantSiret(e.target.value.replace(/\D/g, ""))} placeholder="12345678901234" className="w-full h-11 rounded-xl bg-white/5 border border-white/10 text-white px-3 font-mono focus:outline-none focus:border-[#C9A84C]/40" />
                </div>
                <div>
                  <label className="block text-white/60 text-xs mb-1.5">Activité *</label>
                  <input type="text" value={merchantActivite} onChange={(e) => setMerchantActivite(e.target.value)} placeholder="Galerie d'art / Antiquités" className="w-full h-11 rounded-xl bg-white/5 border border-white/10 text-white px-3 focus:outline-none focus:border-[#C9A84C]/40" />
                </div>
                <div>
                  <label className="block text-white/60 text-xs mb-1.5">Nom du gérant *</label>
                  <input type="text" value={merchantNomGerant} onChange={(e) => setMerchantNomGerant(e.target.value)} placeholder="Jean Dupont" className="w-full h-11 rounded-xl bg-white/5 border border-white/10 text-white px-3 focus:outline-none focus:border-[#C9A84C]/40" />
                </div>
                <div>
                  <label className="block text-white/60 text-xs mb-1.5">Adresse *</label>
                  <input type="text" value={merchantAdresse} onChange={(e) => setMerchantAdresse(e.target.value)} placeholder="12 rue des Arts" className="w-full h-11 rounded-xl bg-white/5 border border-white/10 text-white px-3 focus:outline-none focus:border-[#C9A84C]/40" />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-1">
                    <label className="block text-white/60 text-xs mb-1.5">CP *</label>
                    <input type="text" maxLength={5} value={merchantCodePostal} onChange={(e) => setMerchantCodePostal(e.target.value.replace(/\D/g, ""))} placeholder="75001" className="w-full h-11 rounded-xl bg-white/5 border border-white/10 text-white px-3 focus:outline-none focus:border-[#C9A84C]/40" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-white/60 text-xs mb-1.5">Ville *</label>
                    <input type="text" value={merchantVille} onChange={(e) => setMerchantVille(e.target.value)} placeholder="Paris" className="w-full h-11 rounded-xl bg-white/5 border border-white/10 text-white px-3 focus:outline-none focus:border-[#C9A84C]/40" />
                  </div>
                </div>
                <p className="text-white/40 text-[11px] leading-relaxed">
                  Une fiche de police sera générée automatiquement et archivée (obligation légale Art. R.321-1 Code pénal).
                </p>
              </div>
            )}
          </div>

          <NavButtons
            back="f_price"
            next={() => {
              if (!identEmail || !identName) { alert("Nom et email requis"); return; }
              if (isProRole && (!merchantRaisonSociale || !merchantSiret || merchantSiret.length !== 14 || !merchantActivite || !merchantNomGerant || !merchantAdresse || !merchantCodePostal || !merchantVille)) {
                alert("Tous les champs pro sont requis (SIRET exactement 14 chiffres)");
                return;
              }
              setStep("review");
            }}
            nextLabel="Verifier"
          />
        </div>
      )}

      {/* ═══ REVIEW ═══ */}
      {step === "review" && (
        <div className="animate-fade-in">
          <h2 className="font-display text-2xl font-semibold text-white mb-6">Verification</h2>

          {/* Photos recap */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            {[
              { p: photo1, label: "Vue complète" },
              { p: photo2, label: "Macro 1" },
              { p: photo2b, label: "Macro 2" },
            ].filter(x => x.p).map((x, i) => (
              <div key={i} className="relative rounded-xl overflow-hidden aspect-square">
                <img src={x.p!.url} alt="" className="w-full h-full object-cover" />
                {i === 0 && (
                  <div className="absolute border-2 border-[#C9A84C] rounded-sm"
                    style={{ left: `${macroZone.x}%`, top: `${macroZone.y}%`, width: `${macroZone.w}%`, height: `${macroZone.h}%` }} />
                )}
                <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-[8px] text-white/70 text-center py-0.5">{x.label}</span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2 mb-6">
            {[
              { p: photo2c, label: "Macro 3" },
              { p: photo3, label: "Vue côté" },
              { p: photoCreation, label: "Création" },
            ].filter(x => x.p).map((x, i) => (
              <div key={i} className="relative rounded-xl overflow-hidden aspect-square">
                <img src={x.p!.url} alt="" className="w-full h-full object-cover" />
                <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-[8px] text-white/70 text-center py-0.5">{x.label}</span>
              </div>
            ))}
          </div>

          {/* Info recap — each row is clickable to jump to that step */}
          <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4 space-y-0 mb-6 text-sm">
            {[
              { label: "Titre", value: title, target: "f_title" as Step, required: true },
              { label: "Technique", value: technique, target: "f_technique" as Step, required: true },
              { label: "Dimensions", value: dimW && dimH ? `${dimW} x ${dimH} cm` : "", target: "f_dimensions" as Step, required: true },
              { label: "Annee", value: year, target: "f_year" as Step, required: true },
              { label: "Description", value: description, target: "f_description" as Step, required: false },
              { label: "Prix", value: price ? `${price} EUR` : "", target: "f_price" as Step, required: false },
            ].map((field) => (
              <button key={field.label} onClick={() => { setReturnToReview(true); setStep(field.target); }}
                className="flex items-center justify-between w-full py-2.5 px-1 rounded-lg hover:bg-white/5 active:bg-white/10 transition-colors text-left">
                <span className="text-white/30">{field.label}</span>
                {field.value ? (
                  <span className={field.label === "Prix" ? "text-[#C9A84C] font-semibold" : "text-white/70"}>
                    {field.value.length > 40 ? field.value.slice(0, 40) + "..." : field.value}
                  </span>
                ) : (
                  <span className={`text-xs px-2 py-0.5 rounded-md ${field.required ? "bg-red-500/10 text-red-400" : "bg-white/5 text-white/20"}`}>
                    {field.required ? "Requis — Appuyez pour remplir" : "Appuyez pour remplir"}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="rounded-xl bg-[#C9A84C]/5 border border-[#C9A84C]/15 p-4 flex items-start gap-3 mb-6">
            <ShieldCheck className="size-5 text-[#C9A84C] shrink-0 mt-0.5" />
            <p className="text-[11px] text-white/40 leading-relaxed">
              Votre œuvre sera vérifiée par notre équipe sous 24h. Vous recevrez une notification dès qu&apos;elle sera certifiée.
            </p>
          </div>

          <NavButtons back="f_price" next={handleSubmit} nextLabel="Soumettre" />
        </div>
      )}

      {/* ═══ SUBMITTING ═══ */}
      {step === "submitting" && (
        <div className="animate-fade-in flex flex-col items-center justify-center min-h-[60vh]">
          <div className="relative w-24 h-24 mb-8">
            <div className="absolute inset-0 rounded-full border-2 border-[#C9A84C]/20 animate-ping" />
            <div className="w-24 h-24 rounded-full bg-[#C9A84C]/10 border-2 border-[#C9A84C]/40 flex items-center justify-center">
              <ShieldCheck className="size-12 text-[#C9A84C] animate-pulse" />
            </div>
          </div>
          <p className="text-white font-medium mb-2">Envoi en cours...</p>
          <p className="text-white/30 text-sm">Verification de vos photos</p>
        </div>
      )}

      {/* ═══ DONE ═══ */}
      {step === "done" && result && (
        <div className="animate-fade-in text-center pt-6">
          <div className="w-20 h-20 rounded-full bg-green-500/10 border-2 border-green-500/30 flex items-center justify-center mx-auto mb-6">
            <Check className="size-10 text-green-400" />
          </div>
          <h2 className="text-2xl font-display font-semibold text-white mb-2">Demande envoyee !</h2>
          <p className="text-white/40 text-sm mb-8">Verification sous 24h</p>

          {/* Timeline */}
          <div className="text-left space-y-4 mb-8">
            {[
              { done: true, text: "Photos recues", time: "A l'instant" },
              { done: false, text: "Verification en cours", time: "Sous 24h", active: true },
              { done: false, text: "Certification accordee", time: "" },
              { done: false, text: "Badge actif sur votre fiche", time: "" },
            ].map((s, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${s.done ? "bg-green-500/20" : s.active ? "bg-[#C9A84C]/20 animate-pulse" : "bg-white/5"}`}>
                  {s.done ? <Check className="size-3 text-green-400" /> : <div className={`w-2 h-2 rounded-full ${s.active ? "bg-[#C9A84C]" : "bg-white/20"}`} />}
                </div>
                <div>
                  <p className={`text-sm ${s.done ? "text-green-400" : s.active ? "text-[#C9A84C]" : "text-white/25"}`}>{s.text}</p>
                  {s.time && <p className="text-[10px] text-white/20">{s.time}</p>}
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <a href={`${process.env.NEXT_PUBLIC_ART_CORE_URL || "https://art-core.app"}/art-core/oeuvre/${result.id}`}
              className="w-full py-4 rounded-xl bg-[#C9A84C] text-navy-DEFAULT font-semibold text-center block active:brightness-90">
              Voir ma fiche oeuvre
            </a>
            <button onClick={() => { setStep("intro"); setPhoto1(null); setPhoto2(null); setPhoto2b(null); setPhoto2c(null); setPhoto3(null); setPhotoCreation(null); setTitle(""); setTechnique(""); setDimW(""); setDimH(""); setYear(""); setDescription(""); setPrice(""); setResult(null); setQualityScore(null); setQualityScore2(null); setQualityScore2b(null); setQualityScore2c(null); }}
              className="w-full py-4 rounded-xl border border-white/10 text-white/50 font-medium active:bg-white/5">
              Certifier une autre oeuvre
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
