"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck, Camera, ZoomIn, RotateCcw, ChevronRight, Check,
  Loader2, Sparkles, X, Award, Lock, TrendingUp, Image as ImgIcon,
  AlertTriangle, User, Mail, Eye, EyeOff, LogIn, UserPlus,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

type Step = "intro" | "photos" | "info" | "review" | "done" | "identity" | "published";
type PhotoQuality = { score: number; issues: string[]; analyzing: boolean };
type AuthMode = "signup" | "login";

const TECHNIQUES = ["Huile", "Acrylique", "Aquarelle", "Mixte", "Pastel", "Encre", "Numerique", "Sculpture", "Photographie", "Autre"];

async function analyzePhotoQuality(file: File): Promise<{ score: number; issues: string[] }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const issues: string[] = [];
      let score = 100;

      const pixels = img.width * img.height;
      if (pixels < 2_000_000) {
        issues.push("Resolution insuffisante (min 2MP recommande)");
        score -= 30;
      } else if (pixels < 12_000_000) {
        score -= 5;
      }

      const canvas = document.createElement("canvas");
      const maxDim = 512;
      const scale = Math.min(maxDim / img.width, maxDim / img.height, 1);
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) { resolve({ score: 50, issues: ["Analyse impossible"] }); return; }

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      const w = canvas.width;
      const h = canvas.height;

      const gray = new Float32Array(w * h);
      let totalLuminance = 0;
      for (let i = 0; i < w * h; i++) {
        gray[i] = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
        totalLuminance += gray[i];
      }

      const avgLuminance = totalLuminance / (w * h);
      if (avgLuminance < 30) { issues.push("Photo trop sombre"); score -= 25; }
      else if (avgLuminance > 220) { issues.push("Photo trop claire"); score -= 25; }
      else if (avgLuminance < 60) { issues.push("Photo un peu sombre"); score -= 10; }
      else if (avgLuminance > 200) { issues.push("Photo un peu surexposee"); score -= 10; }

      const kernel = [-1, -1, -1, -1, 8, -1, -1, -1, -1];
      let laplacianSum = 0, laplacianSumSq = 0, count = 0;
      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          let val = 0, ki = 0;
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) val += gray[(y + dy) * w + (x + dx)] * kernel[ki++];
          laplacianSum += val; laplacianSumSq += val * val; count++;
        }
      }
      const laplacianVariance = (laplacianSumSq / count) - (laplacianSum / count) ** 2;
      if (laplacianVariance < 50) { issues.push("Photo floue"); score -= 30; }
      else if (laplacianVariance < 200) { issues.push("Photo legerement floue"); score -= 10; }

      resolve({ score: Math.max(0, Math.min(100, score)), issues });
    };
    img.onerror = () => resolve({ score: 50, issues: ["Impossible de lire l'image"] });
    img.src = URL.createObjectURL(file);
  });
}

export default function CertifierPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("intro");
  const [photos, setPhotos] = useState<{ file: File; preview: string; label: string }[]>([]);
  const [photoQualities, setPhotoQualities] = useState<(PhotoQuality | null)[]>([]);
  const [macroZone, setMacroZone] = useState({ x: 40, y: 60, w: 20, h: 25 });
  const [form, setForm] = useState({ title: "", technique: "", width: "", height: "", year: "", description: "", price: "" });
  const [aiLoading, setAiLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const fileRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Identity tunnel state
  const [authMode, setAuthMode] = useState<AuthMode>("signup");
  const [authForm, setAuthForm] = useState({ name: "", email: "", password: "", role: "artist" });
  const [showPw, setShowPw] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);

  // Check if user is already logged in
  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(d => {
      if (d.user) setIsLoggedIn(true);
    }).catch(() => {});
  }, []);

  const PHOTO_SLOTS = [
    { key: "photo_full", label: "Vue complete de face", icon: Camera, required: true, hint: "Eloignez-vous a 1m" },
    { key: "photo_detail", label: "Detail signature / zoom", icon: ZoomIn, required: true, hint: "Approchez a 5-10cm" },
    { key: "photo_angle", label: "Vue de cote (45 degres)", icon: RotateCcw, required: true, hint: "Angle lateral" },
    { key: "photo_creation", label: "En cours de creation", icon: ImgIcon, required: false, hint: "Optionnel" },
  ];

  async function handlePhotoCapture(index: number, file: File) {
    const url = URL.createObjectURL(file);
    const slot = PHOTO_SLOTS[index];
    const newPhotos = [...photos];
    newPhotos[index] = { file, preview: url, label: slot.label };
    setPhotos(newPhotos);

    const newQualities = [...photoQualities];
    newQualities[index] = { score: 0, issues: [], analyzing: true };
    setPhotoQualities(newQualities);
    try {
      const r = await analyzePhotoQuality(file);
      const updated = [...newQualities];
      updated[index] = { ...r, analyzing: false };
      setPhotoQualities(updated);
    } catch {
      const updated = [...newQualities];
      updated[index] = { score: 50, issues: ["Analyse echouee"], analyzing: false };
      setPhotoQualities(updated);
    }
  }

  async function generateDescription() {
    setAiLoading(true);
    try {
      const res = await fetch("/api/ai/describe", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: form.title, technique: form.technique, dimensions: `${form.width}x${form.height} cm`, type: "artwork" }),
      });
      const data = await res.json();
      if (data.description) setForm(f => ({ ...f, description: data.description }));
    } catch {}
    finally { setAiLoading(false); }
  }

  async function handleSubmit() {
    const mainQuality = photoQualities[0];
    if (mainQuality && !mainQuality.analyzing && mainQuality.score < 40) {
      toast({ title: "Photo principale insuffisante", description: "Veuillez reprendre la photo principale.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("title", form.title);
      fd.append("technique", form.technique);
      fd.append("dimensions", `${form.width} x ${form.height} cm`);
      fd.append("year", form.year);
      fd.append("description", form.description);
      fd.append("price", form.price);
      fd.append("macro_zone", JSON.stringify(macroZone));
      PHOTO_SLOTS.forEach((slot, i) => {
        if (photos[i]?.file) fd.append(slot.key, photos[i].file);
      });
      const res = await fetch("/api/certification", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data);
      setStep("done");
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally { setLoading(false); }
  }

  // Identity tunnel: signup or login, then claim artwork
  async function handleAuth() {
    setAuthLoading(true);
    try {
      const endpoint = authMode === "signup" ? "/api/auth/signup" : "/api/auth/login";
      const body = authMode === "signup"
        ? { name: authForm.name, email: authForm.email, password: authForm.password, role: authForm.role }
        : { email: authForm.email, password: authForm.password };

      const res = await fetch(endpoint, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur d'authentification");

      // Claim the artwork
      if (result?.id) {
        await fetch("/api/certification/claim", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ artwork_id: result.id }),
        });
      }

      setIsLoggedIn(true);
      setStep("published");
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally { setAuthLoading(false); }
  }

  // Skip identity if already logged in — claim directly
  async function handleClaimAsLoggedIn() {
    setLoading(true);
    try {
      if (result?.id) {
        await fetch("/api/certification/claim", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ artwork_id: result.id }),
        });
      }
      setStep("published");
    } catch {}
    finally { setLoading(false); }
  }

  const requiredPhotos = PHOTO_SLOTS.filter(s => s.required).length;
  const takenRequired = photos.filter((p, i) => p && PHOTO_SLOTS[i]?.required).length;
  const ALL_STEPS = [{ k: "intro" }, { k: "photos" }, { k: "info" }, { k: "review" }, { k: "done" }, { k: "identity" }, { k: "published" }];
  const si = ALL_STEPS.findIndex(s => s.k === step);

  return (
    <div className="max-w-lg mx-auto px-4 py-6 min-h-[calc(100vh-8rem)] pb-24">
      {/* Progress */}
      {step !== "intro" && step !== "published" && (
        <div className="flex gap-1 mb-6">
          {ALL_STEPS.map((_, i) => <div key={i} className={`flex-1 h-1 rounded-full ${i <= si ? "bg-[#D4AF37]" : "bg-white/8"}`} />)}
        </div>
      )}

      {/* ═══ INTRO ═══ */}
      {step === "intro" && (
        <div className="animate-fade-in text-center pt-6">
          <div className="w-20 h-20 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center mx-auto mb-6">
            <ShieldCheck className="size-10 text-[#D4AF37]" />
          </div>
          <h1 className="font-playfair text-2xl font-semibold text-white mb-3">Certifiez votre oeuvre en 5 minutes</h1>
          <p className="text-white/40 text-sm mb-8 max-w-sm mx-auto leading-relaxed">
            Protegez votre travail et rassurez les acheteurs. Aucun compte requis pour commencer.
          </p>
          <div className="space-y-3 text-left mb-10">
            {[
              { icon: Award, text: 'Badge "Oeuvre certifiee" sur votre fiche', color: "text-green-400" },
              { icon: TrendingUp, text: "Les oeuvres certifiees se vendent 40% plus cher", color: "text-[#D4AF37]" },
              { icon: Lock, text: "Protection contre la contrefacon", color: "text-blue-400" },
            ].map((b) => (
              <div key={b.text} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/5">
                <b.icon className={`size-5 ${b.color} shrink-0`} />
                <p className="text-sm text-white/70">{b.text}</p>
              </div>
            ))}
          </div>
          <button onClick={() => setStep("photos")} className="w-full py-4 rounded-xl bg-[#D4AF37] text-[#121212] font-semibold text-base active:brightness-90 flex items-center justify-center gap-2">
            Commencer <ChevronRight className="size-5" />
          </button>
        </div>
      )}

      {/* ═══ PHOTOS ═══ */}
      {step === "photos" && (
        <div className="animate-fade-in">
          <h1 className="font-playfair text-2xl font-semibold text-white mb-1">Photographiez votre oeuvre</h1>
          <p className="text-white/40 text-sm mb-6">3 photos obligatoires + 1 optionnelle</p>

          <div className="space-y-4 mb-6">
            {PHOTO_SLOTS.map((slot, i) => {
              const Icon = slot.icon;
              const photo = photos[i];
              return (
                <div key={slot.key}>
                  <input ref={el => { fileRefs.current[i] = el; }} type="file" accept="image/*" capture="environment" className="hidden"
                    onChange={(e) => { if (e.target.files?.[0]) handlePhotoCapture(i, e.target.files[0]); }} />

                  {photo ? (
                    <>
                      <div className="relative rounded-2xl overflow-hidden border-2 border-green-500/30">
                        <img src={photo.preview} alt="" className="w-full aspect-[4/3] object-cover" />
                        <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/20 text-green-400 text-[11px] font-medium">
                          <Check className="size-3" />{slot.label}
                        </div>
                        {i === 0 && (
                          <div className="absolute border-2 border-red-500/60 bg-red-500/10 rounded"
                            style={{ left: `${macroZone.x}%`, top: `${macroZone.y}%`, width: `${macroZone.w}%`, height: `${macroZone.h}%` }}>
                            <span className="absolute -top-5 left-0 text-[9px] text-red-400 bg-black/60 px-1.5 py-0.5 rounded">Zone macro</span>
                          </div>
                        )}
                        {photoQualities[i] && !photoQualities[i]!.analyzing && (
                          <div className={`absolute top-3 right-3 px-2.5 py-1 rounded-full text-[11px] font-medium flex items-center gap-1 ${
                            photoQualities[i]!.score > 70 ? "bg-green-500/20 text-green-400"
                            : photoQualities[i]!.score >= 40 ? "bg-yellow-500/20 text-yellow-400"
                            : "bg-red-500/20 text-red-400"
                          }`}>
                            {photoQualities[i]!.score > 70 ? <><Check className="size-3" />Excellente</>
                            : photoQualities[i]!.score >= 40 ? <><AlertTriangle className="size-3" />Acceptable</>
                            : <><X className="size-3" />Insuffisante</>}
                          </div>
                        )}
                        {photoQualities[i]?.analyzing && (
                          <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-white/10 text-white/50 text-[11px] flex items-center gap-1">
                            <Loader2 className="size-3 animate-spin" />Analyse...
                          </div>
                        )}
                        <button onClick={() => fileRefs.current[i]?.click()}
                          className="absolute bottom-3 right-3 px-3 py-1.5 rounded-lg bg-black/60 text-white text-xs active:bg-black/80">
                          Reprendre
                        </button>
                      </div>
                      {photoQualities[i] && !photoQualities[i]!.analyzing && photoQualities[i]!.score < 40 && (
                        <div className="mt-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
                          <p className="text-red-400 text-xs font-medium">Photo insuffisante</p>
                          {photoQualities[i]!.issues.map((issue, j) => (
                            <p key={j} className="text-red-400/60 text-[11px] mt-0.5">- {issue}</p>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <button onClick={() => fileRefs.current[i]?.click()}
                      className="w-full py-6 rounded-2xl border-2 border-dashed border-white/15 flex items-center gap-4 px-5 active:bg-white/3 transition-colors">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${slot.required ? "bg-[#D4AF37]/10" : "bg-white/5"}`}>
                        <Icon className={`size-6 ${slot.required ? "text-[#D4AF37]" : "text-white/30"}`} />
                      </div>
                      <div className="text-left">
                        <p className="text-sm text-white font-medium">{slot.label} {slot.required ? "*" : ""}</p>
                        <p className="text-[11px] text-white/30">{slot.hint}</p>
                      </div>
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {photos[0] && (
            <div className="mb-6">
              <p className="text-xs text-white/30 mb-2">Indiquez la zone du detail (photo 2) sur l&apos;oeuvre :</p>
              <div className="relative rounded-xl overflow-hidden">
                <img src={photos[0].preview} alt="" className="w-full opacity-70" />
                <div className="absolute border-2 border-[#D4AF37] bg-[#D4AF37]/10 rounded cursor-move"
                  style={{ left: `${macroZone.x}%`, top: `${macroZone.y}%`, width: `${macroZone.w}%`, height: `${macroZone.h}%` }}
                  onTouchMove={(e) => {
                    const touch = e.touches[0];
                    const rect = (e.target as HTMLElement).parentElement!.getBoundingClientRect();
                    const x = Math.max(0, Math.min(80, ((touch.clientX - rect.left) / rect.width) * 100 - macroZone.w / 2));
                    const y = Math.max(0, Math.min(75, ((touch.clientY - rect.top) / rect.height) * 100 - macroZone.h / 2));
                    setMacroZone(z => ({ ...z, x, y }));
                  }}>
                  <span className="absolute inset-0 flex items-center justify-center text-[#D4AF37] text-[10px] font-bold">MACRO</span>
                </div>
              </div>
              <p className="text-[10px] text-white/20 mt-1">Deplacez le cadre dore sur la zone photographiee en detail</p>
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={() => setStep("intro")} className="flex-1 py-4 rounded-xl border border-white/10 text-white/50 font-medium">Retour</button>
            <button onClick={() => setStep("info")} disabled={takenRequired < requiredPhotos}
              className="flex-1 py-4 rounded-xl bg-[#D4AF37] text-[#121212] font-semibold disabled:opacity-30 flex items-center justify-center gap-2">
              Continuer <ChevronRight className="size-5" />
            </button>
          </div>
        </div>
      )}

      {/* ═══ INFO ═══ */}
      {step === "info" && (
        <div className="animate-fade-in">
          <h1 className="font-playfair text-2xl font-semibold text-white mb-1">Decrivez votre oeuvre</h1>
          <p className="text-white/40 text-sm mb-6">Informations pour la fiche de vente</p>

          <div className="space-y-4">
            <div>
              <label className="text-sm text-white/60 mb-1.5 block">Titre de l&apos;oeuvre *</label>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Ex: Crepuscule Dore"
                className="w-full h-12 rounded-xl bg-white/5 border border-white/10 text-white px-4 focus:outline-none focus:border-[#D4AF37]/40" />
            </div>

            <div>
              <label className="text-sm text-white/60 mb-1.5 block">Technique *</label>
              <div className="flex flex-wrap gap-2">
                {TECHNIQUES.map(t => (
                  <button key={t} type="button" onClick={() => setForm(f => ({ ...f, technique: t }))}
                    className={`px-3 py-2 rounded-lg text-xs transition-all ${form.technique === t ? "bg-[#D4AF37] text-black font-semibold" : "bg-white/5 text-white/50"}`}>{t}</button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-sm text-white/60 mb-1.5 block">Largeur (cm) *</label>
                <input type="number" inputMode="numeric" value={form.width} onChange={e => setForm(f => ({ ...f, width: e.target.value }))} placeholder="80"
                  className="w-full h-12 rounded-xl bg-white/5 border border-white/10 text-white px-3 text-center focus:outline-none focus:border-[#D4AF37]/40" />
              </div>
              <div>
                <label className="text-sm text-white/60 mb-1.5 block">Hauteur (cm) *</label>
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
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm text-white/60">Description</label>
                <button onClick={generateDescription} disabled={aiLoading || !form.title}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#D4AF37]/10 text-[#D4AF37] text-xs font-medium active:bg-[#D4AF37]/20 disabled:opacity-30">
                  {aiLoading ? <Loader2 className="size-3 animate-spin" /> : <Sparkles className="size-3" />}
                  Generer par IA
                </button>
              </div>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value.slice(0, 300) }))}
                rows={4} placeholder="Decrivez votre oeuvre en quelques mots..."
                className="w-full rounded-xl bg-white/5 border border-white/10 text-sm text-white p-4 resize-none focus:outline-none focus:border-[#D4AF37]/40" />
              <p className="text-[10px] text-white/20 mt-1">{form.description.length}/300</p>
            </div>

            <div>
              <label className="text-sm text-white/60 mb-1.5 block">Prix souhaite (EUR) — optionnel</label>
              <input type="number" inputMode="numeric" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="1500"
                className="w-full h-12 rounded-xl bg-white/5 border border-white/10 text-white px-4 focus:outline-none focus:border-[#D4AF37]/40" />
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button onClick={() => setStep("photos")} className="flex-1 py-4 rounded-xl border border-white/10 text-white/50 font-medium">Retour</button>
            <button onClick={() => setStep("review")} disabled={!form.title || !form.technique || !form.width || !form.height || !form.year}
              className="flex-1 py-4 rounded-xl bg-[#D4AF37] text-[#121212] font-semibold disabled:opacity-30 flex items-center justify-center gap-2">
              Continuer <ChevronRight className="size-5" />
            </button>
          </div>
        </div>
      )}

      {/* ═══ REVIEW ═══ */}
      {step === "review" && (
        <div className="animate-fade-in">
          <h1 className="font-playfair text-2xl font-semibold text-white mb-6">Verification</h1>

          <div className="grid grid-cols-2 gap-2 mb-6">
            {photos.filter(Boolean).map((p, i) => (
              <div key={i} className="relative rounded-xl overflow-hidden aspect-square">
                <img src={p.preview} alt="" className="w-full h-full object-cover" />
                {i === 0 && (
                  <div className="absolute border-2 border-[#D4AF37] rounded"
                    style={{ left: `${macroZone.x}%`, top: `${macroZone.y}%`, width: `${macroZone.w}%`, height: `${macroZone.h}%` }} />
                )}
                <span className="absolute bottom-1 left-1 text-[9px] bg-black/60 text-white/70 px-1.5 py-0.5 rounded">{p.label}</span>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4 space-y-2 mb-6 text-sm">
            <div className="flex justify-between"><span className="text-white/30">Titre</span><span className="text-white font-medium">{form.title}</span></div>
            <div className="flex justify-between"><span className="text-white/30">Technique</span><span className="text-white/70">{form.technique}</span></div>
            <div className="flex justify-between"><span className="text-white/30">Dimensions</span><span className="text-white/70">{form.width} x {form.height} cm</span></div>
            <div className="flex justify-between"><span className="text-white/30">Annee</span><span className="text-white/70">{form.year}</span></div>
            {form.price && <div className="flex justify-between"><span className="text-white/30">Prix</span><span className="text-[#D4AF37] font-semibold">{form.price} EUR</span></div>}
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep("info")} className="flex-1 py-4 rounded-xl border border-white/10 text-white/50 font-medium">Modifier</button>
            <button onClick={handleSubmit} disabled={loading}
              className="flex-1 py-4 rounded-xl bg-[#D4AF37] text-[#121212] font-semibold disabled:opacity-30 flex items-center justify-center gap-2">
              {loading ? <Loader2 className="size-5 animate-spin" /> : <ShieldCheck className="size-5" />}
              Certifier
            </button>
          </div>
        </div>
      )}

      {/* ═══ DONE — Certification success, now identity tunnel ═══ */}
      {step === "done" && result && (
        <div className="animate-fade-in text-center">
          <div className="w-20 h-20 rounded-full bg-green-500/10 border-2 border-green-500/30 flex items-center justify-center mx-auto mb-6">
            <ShieldCheck className="size-10 text-green-400" />
          </div>
          <h2 className="text-2xl font-playfair font-semibold text-white mb-2">Oeuvre certifiee !</h2>
          <p className="text-white/40 text-sm mb-6">
            Votre oeuvre est protegee par un hash blockchain unique.
          </p>

          {/* Certificate preview */}
          <div className="rounded-2xl bg-gradient-to-b from-[#D4AF37]/10 to-transparent border border-[#D4AF37]/20 p-5 mb-6 text-left">
            <div className="flex items-center gap-2 text-[#D4AF37] text-xs font-medium mb-3">
              <ShieldCheck className="size-4" />CERTIFICAT PASS-CORE
            </div>
            <p className="text-white font-semibold text-lg mb-1">{form.title}</p>
            <p className="text-white/30 text-xs">{form.technique} — {form.width} x {form.height} cm — {form.year}</p>
            {result.hash && (
              <div className="mt-3 pt-3 border-t border-white/5">
                <p className="text-[10px] uppercase tracking-widest text-white/25 mb-1">Hash blockchain</p>
                <p className="font-mono text-[11px] text-[#D4AF37] break-all">{result.hash}</p>
              </div>
            )}
            {form.price && (
              <div className="mt-2">
                <p className="text-[10px] uppercase tracking-widest text-white/25 mb-1">Prix</p>
                <p className="text-white font-semibold">{Number(form.price).toLocaleString()} EUR</p>
              </div>
            )}
          </div>

          {/* CTA: identity tunnel or direct publish */}
          {isLoggedIn ? (
            <div className="space-y-3">
              <button onClick={handleClaimAsLoggedIn} disabled={loading}
                className="w-full py-4 rounded-xl bg-[#D4AF37] text-[#121212] font-semibold active:brightness-90 flex items-center justify-center gap-2">
                {loading ? <Loader2 className="size-5 animate-spin" /> : <Check className="size-5" />}
                Publier sur le marketplace
              </button>
              <button onClick={() => router.push(`/art-core/oeuvre/${result.id}`)}
                className="w-full py-3 rounded-xl border border-white/10 text-white/50 text-sm font-medium active:bg-white/5">
                Voir la fiche oeuvre
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-white/50 text-sm mb-2">
                Pour publier sur le marketplace et gerer vos ventes :
              </p>
              <button onClick={() => setStep("identity")}
                className="w-full py-4 rounded-xl bg-[#D4AF37] text-[#121212] font-semibold active:brightness-90 flex items-center justify-center gap-2">
                <UserPlus className="size-5" />
                Creer mon compte artiste
              </button>
              <button onClick={() => { setAuthMode("login"); setStep("identity"); }}
                className="w-full py-3 rounded-xl border border-white/10 text-white/50 text-sm font-medium active:bg-white/5 flex items-center justify-center gap-2">
                <LogIn className="size-4" />
                J&apos;ai deja un compte
              </button>
            </div>
          )}
        </div>
      )}

      {/* ═══ IDENTITY — Inline signup/login ═══ */}
      {step === "identity" && (
        <div className="animate-fade-in">
          {/* Toggle */}
          <div className="flex rounded-xl bg-white/5 p-1 mb-6">
            <button onClick={() => setAuthMode("signup")}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${authMode === "signup" ? "bg-[#D4AF37] text-[#121212]" : "text-white/40"}`}>
              Creer un compte
            </button>
            <button onClick={() => setAuthMode("login")}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${authMode === "login" ? "bg-[#D4AF37] text-[#121212]" : "text-white/40"}`}>
              Se connecter
            </button>
          </div>

          {/* Mini certificate reminder */}
          <div className="rounded-xl bg-green-500/5 border border-green-500/15 p-3 flex items-center gap-3 mb-6">
            <ShieldCheck className="size-5 text-green-400 shrink-0" />
            <div>
              <p className="text-sm text-white font-medium">{form.title}</p>
              <p className="text-[11px] text-green-400/60">Certifiee — en attente de publication</p>
            </div>
          </div>

          <div className="space-y-4">
            {authMode === "signup" && (
              <>
                <div>
                  <label className="text-sm text-white/60 mb-1.5 block">Votre nom complet</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/20" />
                    <input value={authForm.name} onChange={e => setAuthForm(f => ({ ...f, name: e.target.value }))} placeholder="Marie Dubois"
                      className="w-full h-12 rounded-xl bg-white/5 border border-white/10 text-white pl-10 pr-4 focus:outline-none focus:border-[#D4AF37]/40" />
                  </div>
                </div>

                <div>
                  <label className="text-sm text-white/60 mb-1.5 block">Vous etes...</label>
                  <div className="flex gap-2">
                    {[
                      { value: "artist", label: "Artiste" },
                      { value: "gallery", label: "Galerie" },
                      { value: "collector", label: "Collectionneur" },
                    ].map(r => (
                      <button key={r.value} onClick={() => setAuthForm(f => ({ ...f, role: r.value }))}
                        className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all ${
                          authForm.role === r.value ? "bg-[#D4AF37]/15 border-[#D4AF37]/40 text-[#D4AF37] border" : "bg-white/5 border border-white/10 text-white/40"
                        }`}>
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="text-sm text-white/60 mb-1.5 block">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/20" />
                <input type="email" value={authForm.email} onChange={e => setAuthForm(f => ({ ...f, email: e.target.value }))} placeholder="vous@email.com"
                  className="w-full h-12 rounded-xl bg-white/5 border border-white/10 text-white pl-10 pr-4 focus:outline-none focus:border-[#D4AF37]/40" />
              </div>
            </div>

            <div>
              <label className="text-sm text-white/60 mb-1.5 block">Mot de passe</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/20" />
                <input type={showPw ? "text" : "password"} value={authForm.password} onChange={e => setAuthForm(f => ({ ...f, password: e.target.value }))} placeholder="Min. 6 caracteres"
                  className="w-full h-12 rounded-xl bg-white/5 border border-white/10 text-white pl-10 pr-12 focus:outline-none focus:border-[#D4AF37]/40" />
                <button onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30">
                  {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button onClick={() => setStep("done")} className="flex-1 py-4 rounded-xl border border-white/10 text-white/50 font-medium">Retour</button>
            <button onClick={handleAuth} disabled={authLoading || !authForm.email || !authForm.password || (authMode === "signup" && !authForm.name)}
              className="flex-1 py-4 rounded-xl bg-[#D4AF37] text-[#121212] font-semibold disabled:opacity-30 flex items-center justify-center gap-2">
              {authLoading ? <Loader2 className="size-5 animate-spin" /> : authMode === "signup" ? <UserPlus className="size-5" /> : <LogIn className="size-5" />}
              {authMode === "signup" ? "Creer et publier" : "Connecter et publier"}
            </button>
          </div>
        </div>
      )}

      {/* ═══ PUBLISHED — Final success ═══ */}
      {step === "published" && result && (
        <div className="animate-fade-in text-center pt-6">
          <div className="w-24 h-24 rounded-full bg-green-500/10 border-2 border-green-500/30 flex items-center justify-center mx-auto mb-6">
            <Award className="size-12 text-green-400" />
          </div>
          <h2 className="text-2xl font-playfair font-semibold text-white mb-2">Publiee sur le marketplace !</h2>
          <p className="text-white/40 text-sm mb-8">
            Votre oeuvre est certifiee et visible par les acheteurs sur ART-CORE.
          </p>

          <div className="rounded-2xl bg-gradient-to-b from-[#D4AF37]/10 to-transparent border border-[#D4AF37]/20 p-5 mb-8 text-left">
            <p className="text-white font-semibold text-lg">{form.title}</p>
            <p className="text-white/30 text-xs mt-1">{form.technique} — {form.width} x {form.height} cm</p>
            {form.price && <p className="text-[#D4AF37] font-bold text-xl mt-3">{Number(form.price).toLocaleString()} EUR</p>}
            <div className="flex items-center gap-2 mt-3 text-green-400 text-xs">
              <ShieldCheck className="size-4" />
              <span>Certifiee et en vente</span>
            </div>
          </div>

          <div className="space-y-3">
            <button onClick={() => router.push(`/art-core/oeuvre/${result.id}`)}
              className="w-full py-4 rounded-xl bg-[#D4AF37] text-[#121212] font-semibold active:brightness-90">
              Voir ma fiche oeuvre
            </button>
            <button onClick={() => { setStep("intro"); setPhotos([]); setPhotoQualities([]); setForm({ title: "", technique: "", width: "", height: "", year: "", description: "", price: "" }); setResult(null); }}
              className="w-full py-4 rounded-xl border border-white/10 text-white/50 font-medium active:bg-white/5">
              Certifier une autre oeuvre
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
