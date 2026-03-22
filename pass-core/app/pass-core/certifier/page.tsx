"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck, Camera, ZoomIn, RotateCcw, ChevronRight, ChevronLeft, Check,
  Loader2, Sparkles, X, Award, Lock, TrendingUp, Image as ImgIcon, Move,
  Fingerprint, Eye,
} from "lucide-react";

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════
type Step = "intro" | "photo1" | "zone_select" | "photo2" | "photo3" |
            "f_title" | "f_technique" | "f_dimensions" | "f_year" | "f_description" | "f_price" |
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
  const [qualityScore, setQualityScore] = useState<any>(null);
  const [analyzingPhoto, setAnalyzingPhoto] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);
  const zoneRef = useRef<HTMLDivElement>(null);

  // Progress
  const ALL_STEPS: Step[] = ["intro", "photo1", "zone_select", "photo2", "photo3", "f_title", "f_technique", "f_dimensions", "f_year", "f_description", "f_price", "review", "submitting", "done"];
  const stepIdx = ALL_STEPS.indexOf(step);
  const progress = Math.round((stepIdx / (ALL_STEPS.length - 1)) * 100);

  // ── Photo capture ──────────────────────────────────────
  function capturePhoto(setter: (v: { file: File; url: string }) => void) {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.capture = "environment";
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (file) setter({ file, url: URL.createObjectURL(file) });
    };
    input.click();
  }

  // ── Analyze photo quality ──────────────────────────────
  async function analyzePhoto(file: File) {
    setAnalyzingPhoto(true);
    try {
      const fd = new FormData();
      fd.append("photo", file);
      const res = await fetch("/api/analyze-photo", { method: "POST", body: fd });
      const data = await res.json();
      setQualityScore(data);
    } catch {}
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

  // ── AI description ─────────────────────────────────────
  async function generateAI() {
    setAiLoading(true);
    try {
      const res = await fetch("/api/ai-describe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, technique, dimensions: `${dimW}x${dimH} cm`, year }),
      });
      const data = await res.json();
      if (data.description) setDescription(data.description);
    } catch {}
    finally { setAiLoading(false); }
  }

  // ── Submit ─────────────────────────────────────────────
  async function handleSubmit() {
    setStep("submitting");
    setLoading(true);
    try {
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
      if (photo1) fd.append("main_photo", photo1.file);
      if (photo2) fd.append("macro_photo", photo2.file);
      if (photo3) fd.append("extra_photos", photo3.file);
      if (photoCreation) fd.append("extra_photos", photoCreation.file);

      const res = await fetch("/api/certify", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data);
      setStep("done");
    } catch (err: any) {
      alert("Erreur: " + err.message);
      setStep("review");
    } finally { setLoading(false); }
  }

  // ── Nav helpers ────────────────────────────────────────
  function NavButtons({ back, next, nextDisabled, nextLabel }: { back?: Step; next?: () => void; nextDisabled?: boolean; nextLabel?: string }) {
    return (
      <div className="flex gap-3 mt-8">
        {back && (
          <button onClick={() => setStep(back)} className="flex-1 py-4 rounded-xl border border-white/10 text-white/50 font-medium flex items-center justify-center gap-2 active:bg-white/5">
            <ChevronLeft className="size-4" /> Retour
          </button>
        )}
        {next && (
          <button onClick={next} disabled={nextDisabled}
            className="flex-1 py-4 rounded-xl bg-[#C9A84C] text-navy-DEFAULT font-semibold disabled:opacity-30 active:brightness-90 flex items-center justify-center gap-2">
            {nextLabel || "Continuer"} <ChevronRight className="size-5" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 min-h-[calc(100vh-4rem)] pb-24">
      {/* Progress bar */}
      {step !== "intro" && step !== "done" && (
        <div className="h-1 bg-white/5 rounded-full mb-6 overflow-hidden">
          <div className="h-full bg-[#C9A84C] rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      )}

      {/* ═══ INTRO ═══ */}
      {step === "intro" && (
        <div className="animate-fade-in text-center pt-6">
          <div className="w-20 h-20 rounded-full bg-[#C9A84C]/10 border border-[#C9A84C]/30 flex items-center justify-center mx-auto mb-6">
            <ShieldCheck className="size-10 text-[#C9A84C]" />
          </div>
          <h1 className="font-display text-2xl font-semibold text-white mb-3">Certifiez votre oeuvre en 5 minutes</h1>
          <p className="text-white/40 text-sm mb-8 leading-relaxed">
            ART-CORE verifie que votre oeuvre est originale. Ce processus protege votre travail et rassure les acheteurs.
          </p>
          <div className="space-y-3 text-left mb-10">
            {[
              { icon: Award, text: "Badge certifie visible sur votre fiche", c: "text-green-400 bg-green-500/10" },
              { icon: TrendingUp, text: "Les oeuvres certifiees se vendent 40% plus cher", c: "text-[#C9A84C] bg-[#C9A84C]/10" },
              { icon: Lock, text: "Protection contre la contrefacon", c: "text-blue-400 bg-blue-500/10" },
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

      {/* ═══ PHOTO 1 — Vue complete ═══ */}
      {step === "photo1" && (
        <div className="animate-fade-in">
          <p className="text-xs text-[#C9A84C] font-medium mb-1">PHOTO 1 / 3</p>
          <h2 className="text-xl font-semibold text-white mb-1">Vue complete de face</h2>
          <p className="text-white/35 text-sm mb-6">Reculez a 1 metre — l&apos;oeuvre doit remplir 80% du cadre</p>

          {photo1 ? (
            <div className="relative rounded-2xl overflow-hidden mb-4">
              <img src={photo1.url} alt="" className="w-full" />
              <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-medium">
                <Check className="size-3" /> Capturee
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
                Qualite : {qualityScore.score}/100 — {qualityScore.message}
              </p>
            </div>
          )}

          {photo1 && !qualityScore && !analyzingPhoto && (
            <button onClick={() => analyzePhoto(photo1.file)} className="w-full py-3 rounded-xl bg-white/5 border border-white/10 text-white/50 text-sm mb-4">
              <Eye className="size-4 inline mr-2" />Verifier la qualite
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
          <h2 className="text-xl font-semibold text-white mb-1">Ou allez-vous prendre le detail ?</h2>
          <p className="text-white/35 text-sm mb-4">Deplacez le cadre rouge sur la zone que vous allez photographier en gros plan</p>

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
                Zone detail
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
              Cette zone sera votre empreinte de certification. Elle sera enregistree et visible sur la fiche de l&apos;oeuvre.
            </p>
          </div>

          <NavButtons back="photo1" next={() => setStep("photo2")} />
        </div>
      )}

      {/* ═══ PHOTO 2 — Detail macro ═══ */}
      {step === "photo2" && (
        <div className="animate-fade-in">
          <p className="text-xs text-[#C9A84C] font-medium mb-1">PHOTO 2 / 3</p>
          <h2 className="text-xl font-semibold text-white mb-1">Detail en gros plan</h2>
          <p className="text-white/35 text-sm mb-4">Rapprochez-vous a 5-10cm de la zone selectionnee</p>

          {/* Reference: miniature photo1 + zone */}
          {photo1 && (
            <div className="relative w-20 h-20 rounded-lg overflow-hidden mb-4 border border-white/10">
              <img src={photo1.url} alt="" className="w-full h-full object-cover" />
              <div className="absolute border-2 border-red-500 rounded-sm animate-pulse"
                style={{ left: `${macroZone.x}%`, top: `${macroZone.y}%`, width: `${macroZone.w}%`, height: `${macroZone.h}%` }} />
              <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-[8px] text-red-400 text-center py-0.5">Photographiez cette zone</span>
            </div>
          )}

          {photo2 ? (
            <div className="relative rounded-2xl overflow-hidden border-2 border-[#C9A84C]/30 mb-4">
              <img src={photo2.url} alt="" className="w-full" />
              <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-medium">
                <Check className="size-3" /> Detail capture
              </div>
              <button onClick={() => capturePhoto(setPhoto2)} className="absolute bottom-3 right-3 px-3 py-1.5 rounded-lg bg-black/60 text-white text-xs">Reprendre</button>
            </div>
          ) : (
            <button onClick={() => capturePhoto(setPhoto2)}
              className="w-full aspect-square rounded-2xl border-2 border-dashed border-[#C9A84C]/40 flex flex-col items-center justify-center gap-3 bg-[#C9A84C]/5 active:bg-[#C9A84C]/10 mb-4">
              <ZoomIn className="size-12 text-[#C9A84C]" />
              <p className="text-[#C9A84C] font-medium">Photo detail / macro</p>
              <p className="text-white/20 text-xs">5-10cm de la surface</p>
            </button>
          )}

          <NavButtons back="zone_select" next={() => setStep("photo3")} nextDisabled={!photo2} />
        </div>
      )}

      {/* ═══ PHOTO 3 — Vue de cote ═══ */}
      {step === "photo3" && (
        <div className="animate-fade-in">
          <p className="text-xs text-[#C9A84C] font-medium mb-1">PHOTO 3 / 3</p>
          <h2 className="text-xl font-semibold text-white mb-1">Vue de cote (30-45 degres)</h2>
          <p className="text-white/35 text-sm mb-6">Photographiez l&apos;oeuvre legerement de cote pour voir l&apos;epaisseur et la texture</p>

          {photo3 ? (
            <div className="relative rounded-2xl overflow-hidden mb-4">
              <img src={photo3.url} alt="" className="w-full" />
              <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-medium">
                <Check className="size-3" /> Vue laterale
              </div>
              <button onClick={() => capturePhoto(setPhoto3)} className="absolute bottom-3 right-3 px-3 py-1.5 rounded-lg bg-black/60 text-white text-xs">Reprendre</button>
            </div>
          ) : (
            <button onClick={() => capturePhoto(setPhoto3)}
              className="w-full aspect-[4/3] rounded-2xl border-2 border-dashed border-white/15 flex flex-col items-center justify-center gap-3 bg-white/[0.02] active:bg-white/5 mb-4">
              <RotateCcw className="size-10 text-white/30" />
              <p className="text-white/50 font-medium">Vue de cote</p>
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
          <p className="text-white/30 text-sm mb-6">Selectionnez la technique principale</p>
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
          <p className="text-white/30 text-sm mb-6">Mesurez le bord exterieur du chassis</p>
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
            <button onClick={generateAI} disabled={aiLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#C9A84C]/10 text-[#C9A84C] text-xs font-medium active:bg-[#C9A84C]/20 disabled:opacity-30">
              {aiLoading ? <Loader2 className="size-3 animate-spin" /> : <Sparkles className="size-3" />}
              Generer par IA
            </button>
          </div>
          <p className="text-white/30 text-sm mb-4">150 mots max — decrivez votre oeuvre</p>
          <textarea value={description} onChange={e => setDescription(e.target.value.slice(0, 600))} rows={5}
            placeholder="Decrivez votre oeuvre..."
            className="w-full rounded-xl bg-white/5 border border-white/10 text-white text-sm p-4 resize-none focus:outline-none focus:border-[#C9A84C]/40" />
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
          <NavButtons back="f_description" next={() => setStep("review")} nextLabel="Verifier" />
        </div>
      )}

      {/* ═══ REVIEW ═══ */}
      {step === "review" && (
        <div className="animate-fade-in">
          <h2 className="font-display text-2xl font-semibold text-white mb-6">Verification</h2>

          {/* Photos recap */}
          <div className="grid grid-cols-3 gap-2 mb-6">
            {[photo1, photo2, photo3].filter(Boolean).map((p, i) => (
              <div key={i} className="relative rounded-xl overflow-hidden aspect-square">
                <img src={p!.url} alt="" className="w-full h-full object-cover" />
                {i === 0 && (
                  <div className="absolute border-2 border-[#C9A84C] rounded-sm"
                    style={{ left: `${macroZone.x}%`, top: `${macroZone.y}%`, width: `${macroZone.w}%`, height: `${macroZone.h}%` }} />
                )}
              </div>
            ))}
          </div>

          {/* Info recap */}
          <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4 space-y-2 mb-6 text-sm">
            <div className="flex justify-between"><span className="text-white/30">Titre</span><span className="text-white font-medium">{title}</span></div>
            <div className="flex justify-between"><span className="text-white/30">Technique</span><span className="text-white/70">{technique}</span></div>
            <div className="flex justify-between"><span className="text-white/30">Dimensions</span><span className="text-white/70">{dimW} x {dimH} cm</span></div>
            <div className="flex justify-between"><span className="text-white/30">Annee</span><span className="text-white/70">{year}</span></div>
            {price && <div className="flex justify-between"><span className="text-white/30">Prix</span><span className="text-[#C9A84C] font-semibold">{price} EUR</span></div>}
          </div>

          <div className="rounded-xl bg-[#C9A84C]/5 border border-[#C9A84C]/15 p-4 flex items-start gap-3 mb-6">
            <ShieldCheck className="size-5 text-[#C9A84C] shrink-0 mt-0.5" />
            <p className="text-[11px] text-white/40 leading-relaxed">
              Votre oeuvre sera verifiee par notre equipe sous 24h. Vous recevrez une notification des qu&apos;elle sera certifiee.
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
            <a href={`http://192.168.1.115:3000/art-core/oeuvre/${result.id}`}
              className="w-full py-4 rounded-xl bg-[#C9A84C] text-navy-DEFAULT font-semibold text-center block active:brightness-90">
              Voir ma fiche oeuvre
            </a>
            <button onClick={() => { setStep("intro"); setPhoto1(null); setPhoto2(null); setPhoto3(null); setPhotoCreation(null); setTitle(""); setTechnique(""); setDimW(""); setDimH(""); setYear(""); setDescription(""); setPrice(""); setResult(null); setQualityScore(null); }}
              className="w-full py-4 rounded-xl border border-white/10 text-white/50 font-medium active:bg-white/5">
              Certifier une autre oeuvre
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
