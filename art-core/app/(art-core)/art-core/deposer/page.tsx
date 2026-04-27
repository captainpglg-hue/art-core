"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Image as ImageIcon, X, ArrowRight, Fingerprint, MapPin } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const CATEGORIES = [
  { label: "Peinture", value: "painting" },
  { label: "Sculpture", value: "sculpture" },
  { label: "Photographie", value: "photography" },
  { label: "Numerique", value: "digital" },
  { label: "Dessin", value: "drawing" },
  { label: "Technique mixte", value: "mixed_media" },
  { label: "Ceramique", value: "ceramics" },
  { label: "Mobilier", value: "furniture" },
];

async function compressImage(file: File, maxDim = 2048, quality = 0.85): Promise<Blob> {
  if (file.size < 1_500_000) return file;
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        const ratio = Math.min(maxDim / width, maxDim / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas indisponible"));
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob((out) => (out ? resolve(out) : reject(new Error("Compression echouee"))), "image/jpeg", quality);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Image illisible")); };
    img.src = url;
  });
}

async function uploadOne(file: File): Promise<string> {
  const compressed = await compressImage(file);
  const fd = new FormData();
  fd.append("photo", compressed, file.name);
  const res = await fetch("/api/upload-photo", { method: "POST", body: fd });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Upload echoue");
  return json.url as string;
}

export default function DeposerPage() {
  const router = useRouter();
  const photosInputRef = useRef<HTMLInputElement>(null);
  const macroInputRef = useRef<HTMLInputElement>(null);

  const [authChecked, setAuthChecked] = useState(false);
  const [authedUser, setAuthedUser] = useState<{ id: string; full_name?: string; email?: string } | null>(null);

  // Photos generales (vue d'ensemble)
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);

  // Photo macro pour identification visuelle
  const [macroPhoto, setMacroPhoto] = useState<string | null>(null);
  const [macroPosition, setMacroPosition] = useState<string>("");
  const [uploadingMacro, setUploadingMacro] = useState(false);

  // Geolocalisation (capture metadata)
  const [geo, setGeo] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [geoStatus, setGeoStatus] = useState<"idle" | "loading" | "ok" | "denied">("idle");

  const [form, setForm] = useState({
    title: "",
    price: "",
    category: "painting",
    technique: "",
    dimensions: "",
    description: "",
  });

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d?.user?.id) setAuthedUser(d.user);
        else router.replace("/auth/login?redirectTo=/art-core/deposer");
      })
      .catch(() => router.replace("/auth/login?redirectTo=/art-core/deposer"))
      .finally(() => setAuthChecked(true));
  }, [router]);

  function captureGeo() {
    if (!navigator.geolocation) {
      setGeoStatus("denied");
      toast({ title: "Geolocalisation indisponible", variant: "destructive" });
      return;
    }
    setGeoStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeo({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: Math.round(pos.coords.accuracy) });
        setGeoStatus("ok");
      },
      () => {
        setGeoStatus("denied");
        toast({ title: "Geolocalisation refusee", description: "Tu peux continuer, mais elle est recommandee.", variant: "destructive" });
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  }

  async function handlePhotosSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadingPhotos(true);
    try {
      const uploaded: string[] = [];
      for (const file of Array.from(files)) {
        try { uploaded.push(await uploadOne(file)); }
        catch (err: any) { toast({ title: "Upload " + file.name, description: err.message, variant: "destructive" }); }
      }
      if (uploaded.length) setPhotos((p) => [...p, ...uploaded]);
    } finally {
      setUploadingPhotos(false);
      if (photosInputRef.current) photosInputRef.current.value = "";
    }
  }

  async function handleMacroSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingMacro(true);
    try {
      const url = await uploadOne(file);
      setMacroPhoto(url);
      toast({ title: "Photo macro enregistree" });
    } catch (err: any) {
      toast({ title: "Upload macro echoue", description: err.message, variant: "destructive" });
    } finally {
      setUploadingMacro(false);
      if (macroInputRef.current) macroInputRef.current.value = "";
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (photos.length === 0) {
      toast({ title: "Photos manquantes", description: "Ajoute au moins une photo de l'oeuvre.", variant: "destructive" });
      return;
    }
    if (!macroPhoto) {
      toast({ title: "Photo macro requise", description: "L'identification visuelle exige une photo macro.", variant: "destructive" });
      return;
    }
    if (!form.title.trim() || !form.price) {
      toast({ title: "Champs manquants", description: "Titre et prix sont obligatoires.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/artworks/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          price: parseFloat(form.price) || 0,
          category: form.category,
          technique: form.technique.trim(),
          dimensions: form.dimensions.trim(),
          description: form.description.trim(),
          photos,
          macro_photo: macroPhoto,
          macro_position: macroPosition || null,
          geolocation: geo,
          is_public: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.code === "DUPLICATE_FINGERPRINT") {
          throw new Error("Cette oeuvre a deja ete certifiee. Empreinte similaire detectee : " + (data.duplicates?.[0]?.title || "œuvre existante") + ".");
        }
        throw new Error(data.error || "Erreur soumission");
      }
      toast({ title: "Oeuvre certifiee", description: "Empreinte visuelle enregistree." });
      if (data.next_step === "seller_profile") {
        router.push("/art-core/deposer/seller-profile?artwork_id=" + encodeURIComponent(data.artwork_id));
      } else {
        router.push("/art-core/oeuvre/" + encodeURIComponent(data.artwork_id));
      }
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  if (!authChecked) {
    return <div className="max-w-2xl mx-auto px-4 py-8 text-white/40 text-sm">Chargement...</div>;
  }
  if (!authedUser) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 pb-24">
      <h1 className="font-playfair text-3xl font-semibold text-white mb-2">Deposer une oeuvre</h1>
      <p className="text-white/40 text-sm mb-8">
        Bonjour {authedUser.full_name || authedUser.email}. L&apos;identification visuelle de l&apos;oeuvre la rend infalsifiable.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Photos generales */}
        <section>
          <label className="block text-sm font-medium text-white mb-2">Photos de l&apos;oeuvre *</label>
          <p className="text-xs text-white/40 mb-3">Vue d&apos;ensemble. JPG/PNG/WEBP, max 10 Mo chacune. Au moins 1 photo.</p>
          <div className="flex flex-wrap gap-3">
            {photos.map((p, i) => (
              <div key={i} className="relative w-24 h-24 rounded-xl overflow-hidden bg-[#111111]">
                <img src={p} alt="" className="w-full h-full object-cover" />
                <button type="button" onClick={() => setPhotos(photos.filter((_, j) => j !== i))}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center">
                  <X className="size-3 text-white" />
                </button>
              </div>
            ))}
            <button type="button" onClick={() => photosInputRef.current?.click()} disabled={uploadingPhotos}
              className="w-24 h-24 rounded-xl border-2 border-dashed border-white/15 flex flex-col items-center justify-center text-white/30 hover:border-[#D4AF37]/40 hover:text-[#D4AF37]/60 disabled:opacity-40">
              {uploadingPhotos ? <Loader2 className="size-6 mb-1 animate-spin" /> : <ImageIcon className="size-6 mb-1" />}
              <span className="text-[10px]">{uploadingPhotos ? "Upload..." : "Ajouter"}</span>
            </button>
            <input ref={photosInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotosSelected} />
          </div>
        </section>

        {/* Photo macro identification visuelle */}
        <section className="rounded-2xl border border-[#D4AF37]/40 bg-[#D4AF37]/5 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Fingerprint className="size-5 text-[#D4AF37]" />
            <h3 className="text-sm font-semibold text-[#D4AF37]">Identification visuelle (obligatoire)</h3>
          </div>
          <p className="text-xs text-white/50 leading-relaxed">
            Prends une photo macro tres rapprochee d&apos;une zone unique de l&apos;oeuvre (texture, signature, defaut, marque). Cette photo sert a generer l&apos;empreinte numerique infalsifiable de l&apos;oeuvre.
          </p>
          {macroPhoto ? (
            <div className="flex items-start gap-3">
              <div className="relative w-32 h-32 rounded-xl overflow-hidden bg-black/50">
                <img src={macroPhoto} alt="" className="w-full h-full object-cover" />
                <button type="button" onClick={() => setMacroPhoto(null)}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 flex items-center justify-center">
                  <X className="size-3 text-white" />
                </button>
              </div>
              <div className="flex-1 space-y-2">
                <label className="block text-[11px] text-white/60">Position de la macro (optionnel — ex: angle bas-gauche, signature)</label>
                <input
                  type="text"
                  value={macroPosition}
                  onChange={(e) => setMacroPosition(e.target.value)}
                  placeholder="ex: signature angle bas-droit"
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-[#D4AF37]/50"
                />
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => macroInputRef.current?.click()} disabled={uploadingMacro}
              className="w-full py-4 rounded-xl border-2 border-dashed border-[#D4AF37]/40 flex flex-col items-center justify-center text-[#D4AF37]/80 hover:bg-[#D4AF37]/10 disabled:opacity-40">
              {uploadingMacro ? <Loader2 className="size-6 mb-1 animate-spin" /> : <Fingerprint className="size-6 mb-1" />}
              <span className="text-xs font-medium">{uploadingMacro ? "Calcul de l'empreinte..." : "Ajouter ma photo macro"}</span>
            </button>
          )}
          <input ref={macroInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleMacroSelected} />
        </section>

        {/* Geolocalisation metadata */}
        <section className="rounded-xl border border-white/10 bg-white/[0.02] p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className={"size-4 " + (geoStatus === "ok" ? "text-green-400" : "text-white/40")} />
            <div>
              <p className="text-xs text-white">Geolocalisation (recommandee)</p>
              <p className="text-[10px] text-white/40">
                {geoStatus === "ok" && geo ? "OK : " + geo.lat.toFixed(4) + ", " + geo.lng.toFixed(4) + " (+/-" + geo.accuracy + "m)" :
                 geoStatus === "loading" ? "Recherche..." :
                 geoStatus === "denied" ? "Refusee — non bloquant" :
                 "Lie l'oeuvre au lieu de capture"}
              </p>
            </div>
          </div>
          {geoStatus !== "ok" && (
            <button type="button" onClick={captureGeo} disabled={geoStatus === "loading"}
              className="px-3 py-1.5 rounded-lg text-xs border border-white/15 text-white/70 hover:bg-white/5">
              {geoStatus === "loading" ? "..." : "Activer"}
            </button>
          )}
        </section>

        {/* Identite oeuvre */}
        <section className="grid grid-cols-2 gap-3">
          <div className="col-span-2 sm:col-span-1">
            <label className="block text-sm font-medium text-white mb-2">Titre *</label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-[#D4AF37]/50"
            />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <label className="block text-sm font-medium text-white mb-2">Prix (EUR) *</label>
            <input
              type="number"
              min="0"
              required
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-[#D4AF37]/50"
            />
          </div>
        </section>

        <section>
          <label className="block text-sm font-medium text-white mb-2">Categorie</label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setForm({ ...form, category: c.value })}
                className={"px-3 py-1.5 rounded-lg text-xs " + (form.category === c.value ? "bg-[#D4AF37] text-black font-semibold" : "bg-white/5 text-white/50")}
              >
                {c.label}
              </button>
            ))}
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-white mb-2">Technique</label>
            <input
              type="text"
              value={form.technique}
              onChange={(e) => setForm({ ...form, technique: e.target.value })}
              placeholder="Huile sur toile"
              className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/20 focus:outline-none focus:border-[#D4AF37]/50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-white mb-2">Dimensions</label>
            <input
              type="text"
              value={form.dimensions}
              onChange={(e) => setForm({ ...form, dimensions: e.target.value })}
              placeholder="80 x 120 cm"
              className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/20 focus:outline-none focus:border-[#D4AF37]/50"
            />
          </div>
        </section>

        <section>
          <label className="block text-sm font-medium text-white mb-2">Description</label>
          <textarea
            rows={4}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Histoire, contexte, materiaux..."
            className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/20 resize-none focus:outline-none focus:border-[#D4AF37]/50"
          />
        </section>

        <button
          type="submit"
          disabled={submitting || photos.length === 0 || !macroPhoto || !form.title || !form.price}
          className="w-full py-3.5 rounded-xl bg-[#D4AF37] text-black font-semibold disabled:opacity-30 flex items-center justify-center gap-2"
        >
          {submitting ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
          {submitting ? "Certification..." : "Certifier et continuer"}
        </button>
        <p className="text-xs text-white/30 text-center">
          On calcule l&apos;empreinte de la macro, on verifie qu&apos;elle n&apos;existe pas deja, puis on inscrit le hash sur la blockchain. Si premier depot, on te demandera ensuite tes infos vendeur.
        </p>
      </form>
    </div>
  );
}
