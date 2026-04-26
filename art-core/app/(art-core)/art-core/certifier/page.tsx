"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck, Camera, ZoomIn, RotateCcw, ChevronRight, Check,
  Loader2, Sparkles, X, Award, Lock, TrendingUp, Image as ImgIcon,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

type Step = "intro" | "photos" | "info" | "review" | "done";

const TECHNIQUES = ["Huile", "Acrylique", "Aquarelle", "Mixte", "Pastel", "Encre", "Numerique", "Sculpture", "Photographie", "Autre"];

export default function CertifierPage() {
  const router = useRouter();
  // Kill switch : mode permissif par défaut. NEXT_PUBLIC_STRICT_CAPTURE_QUALITY=1 réactive l'ancien blocage.
  const strictQuality = process.env.NEXT_PUBLIC_STRICT_CAPTURE_QUALITY === "1";
  const block = (cond: boolean) => strictQuality && cond;

  const [step, setStep] = useState<Step>("intro");
  const [photos, setPhotos] = useState<{ file: File; preview: string; label: string }[]>([]);
  const [macroZone, setMacroZone] = useState({ x: 40, y: 60, w: 20, h: 25 });
  const [showZonePicker, setShowZonePicker] = useState(false);
  const [form, setForm] = useState({ title: "", technique: "", width: "", height: "", year: "", description: "", price: "" });
  const [aiLoading, setAiLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const fileRefs = useRef<(HTMLInputElement | null)[]>([]);

  const PHOTO_SLOTS = [
    { key: "photo_full", label: "Vue complete de face", icon: Camera, required: true, hint: "Eloignez-vous a 1m" },
    { key: "photo_detail", label: "Detail signature / zoom", icon: ZoomIn, required: true, hint: "Approchez a 5-10cm" },
    { key: "photo_angle", label: "Vue de cote (45 degres)", icon: RotateCcw, required: true, hint: "Angle lateral" },
    { key: "photo_creation", label: "En cours de creation", icon: ImgIcon, required: false, hint: "Optionnel" },
  ];

  function handlePhotoCapture(index: number, file: File) {
    const url = URL.createObjectURL(file);
    const slot = PHOTO_SLOTS[index];
    const newPhotos = [...photos];
    newPhotos[index] = { file, preview: url, label: slot.label };
    setPhotos(newPhotos);
    // After photo 1 (full), show zone picker for macro
    if (index === 0) setShowZonePicker(true);
  }

  async function generateDescription() {
    setAiLoading(true);
    try {
      const res = await fetch("/api/ai/describe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: form.title, technique: form.technique, dimensions: `${form.width}x${form.height} cm`, type: "artwork" }),
      });
      const data = await res.json();
      if (data.description) setForm(f => ({ ...f, description: data.description }));
    } catch {}
    finally { setAiLoading(false); }
  }

  async function handleSubmit() {
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

  const requiredPhotos = PHOTO_SLOTS.filter(s => s.required).length;
  const takenRequired = photos.filter((p, i) => p && PHOTO_SLOTS[i]?.required).length;
  const STEPS = [{ k: "intro" }, { k: "photos" }, { k: "info" }, { k: "review" }, { k: "done" }];
  const si = STEPS.findIndex(s => s.k === step);

  return (
    <div className="max-w-lg mx-auto px-4 py-6 min-h-[calc(100vh-8rem)] pb-24">
      {/* Progress */}
      {step !== "intro" && (
        <div className="flex gap-1 mb-6">
          {STEPS.map((_, i) => <div key={i} className={`flex-1 h-1 rounded-full ${i <= si ? "bg-[#D4AF37]" : "bg-white/8"}`} />)}
        </div>
      )}

      {/* ═══ INTRO ═══ */}
      {step === "intro" && (
        <div className="animate-fade-in text-center">
          <div className="w-20 h-20 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center mx-auto mb-6">
            <ShieldCheck className="size-10 text-[#D4AF37]" />
          </div>
          <h1 className="font-playfair text-2xl font-semibold text-white mb-3">Certifiez votre oeuvre en 5 minutes</h1>
          <p className="text-white/40 text-sm mb-8 max-w-sm mx-auto leading-relaxed">
            ART-CORE verifie que votre oeuvre est bien originale et creee par vous. Ce processus protege votre travail et rassure les acheteurs.
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
            Commencer la certification <ChevronRight className="size-5" />
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
                    <div className="relative rounded-2xl overflow-hidden border-2 border-green-500/30">
                      <img src={photo.preview} alt="" className="w-full aspect-[4/3] object-cover" />
                      <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/20 text-green-400 text-[11px] font-medium">
                        <Check className="size-3" />{slot.label}
                      </div>

                      {/* Zone macro overlay on photo 1 */}
                      {i === 0 && (
                        <div className="absolute border-2 border-red-500/60 bg-red-500/10 rounded"
                          style={{ left: `${macroZone.x}%`, top: `${macroZone.y}%`, width: `${macroZone.w}%`, height: `${macroZone.h}%` }}>
                          <span className="absolute -top-5 left-0 text-[9px] text-red-400 bg-black/60 px-1.5 py-0.5 rounded">Zone macro</span>
                        </div>
                      )}

                      <button onClick={() => fileRefs.current[i]?.click()}
                        className="absolute bottom-3 right-3 px-3 py-1.5 rounded-lg bg-black/60 text-white text-xs active:bg-black/80">
                        Reprendre
                      </button>
                    </div>
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

          {/* Zone picker for macro position */}
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
            <button onClick={() => setStep("info")} disabled={block(takenRequired < requiredPhotos)}
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
            <button onClick={() => setStep("review")} disabled={block(!form.title || !form.technique || !form.width || !form.height || !form.year)}
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

          {/* Photo grid */}
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

          {/* Info recap */}
          <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4 space-y-2 mb-6 text-sm">
            <div className="flex justify-between"><span className="text-white/30">Titre</span><span className="text-white font-medium">{form.title}</span></div>
            <div className="flex justify-between"><span className="text-white/30">Technique</span><span className="text-white/70">{form.technique}</span></div>
            <div className="flex justify-between"><span className="text-white/30">Dimensions</span><span className="text-white/70">{form.width} x {form.height} cm</span></div>
            <div className="flex justify-between"><span className="text-white/30">Annee</span><span className="text-white/70">{form.year}</span></div>
            {form.price && <div className="flex justify-between"><span className="text-white/30">Prix</span><span className="text-[#D4AF37] font-semibold">{form.price} EUR</span></div>}
          </div>

          <div className="rounded-xl bg-[#D4AF37]/5 border border-[#D4AF37]/15 p-4 flex items-start gap-3 mb-6">
            <ShieldCheck className="size-5 text-[#D4AF37] shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-white/70 font-medium">Certification en cours...</p>
              <p className="text-[11px] text-white/35">Votre oeuvre sera verifiee sous 24h. Vous recevrez une notification des qu&apos;elle sera certifiee.</p>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep("info")} className="flex-1 py-4 rounded-xl border border-white/10 text-white/50 font-medium">Modifier</button>
            <button onClick={handleSubmit} disabled={loading}
              className="flex-1 py-4 rounded-xl bg-[#D4AF37] text-[#121212] font-semibold disabled:opacity-30 flex items-center justify-center gap-2">
              {loading ? <Loader2 className="size-5 animate-spin" /> : <ShieldCheck className="size-5" />}
              Soumettre
            </button>
          </div>
        </div>
      )}

      {/* ═══ DONE ═══ */}
      {step === "done" && result && (
        <div className="animate-fade-in text-center">
          <div className="w-20 h-20 rounded-full bg-green-500/10 border-2 border-green-500/30 flex items-center justify-center mx-auto mb-6">
            <Check className="size-10 text-green-400" />
          </div>
          <h2 className="text-2xl font-playfair font-semibold text-white mb-2">Demande envoyee !</h2>
          <p className="text-white/40 text-sm mb-8">
            Votre oeuvre sera verifiee sous 24h. Vous recevrez le badge des validation.
          </p>
          <div className="rounded-xl bg-[#D4AF37]/5 border border-[#D4AF37]/15 p-4 mb-8 text-left">
            <div className="flex items-center gap-2 text-[#D4AF37] text-xs font-medium mb-2">
              <ShieldCheck className="size-4" />CERTIFICATION EN COURS
            </div>
            <p className="text-white font-medium">{form.title}</p>
            <p className="text-white/30 text-xs mt-1">{form.technique} — {form.width} x {form.height} cm</p>
          </div>
          <div className="space-y-3">
            <button onClick={() => router.push(`/art-core/oeuvre/${result.id}`)}
              className="w-full py-4 rounded-xl bg-[#D4AF37] text-[#121212] font-semibold active:brightness-90">
              Voir ma fiche oeuvre
            </button>
            <button onClick={() => { setStep("intro"); setPhotos([]); setForm({ title: "", technique: "", width: "", height: "", year: "", description: "", price: "" }); setResult(null); }}
              className="w-full py-4 rounded-xl border border-white/10 text-white/50 font-medium active:bg-white/5">
              Certifier une autre oeuvre
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
