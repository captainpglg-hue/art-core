"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Image as ImageIcon, X, ArrowRight } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const CATEGORIES = [
  { label: "Peinture", value: "painting" },
  { label: "Sculpture", value: "sculpture" },
  { label: "Photographie", value: "photography" },
  { label: "Numerique", value: "digital" },
  { label: "Dessin", value: "drawing" },
  { label: "Technique mixte", value: "mixed_media" },
  { label: "Ceramique", value: "ceramics" },
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

export default function DeposerPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [authChecked, setAuthChecked] = useState(false);
  const [authedUser, setAuthedUser] = useState<{ id: string; full_name?: string; email?: string } | null>(null);

  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({
    title: "",
    price: "",
    category: "painting",
    technique: "",
    dimensions: "",
    description: "",
  });

  const [submitting, setSubmitting] = useState(false);

  // Auth check on mount
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

  async function handleFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const uploaded: string[] = [];
      for (const file of Array.from(files)) {
        try {
          const compressed = await compressImage(file);
          const fd = new FormData();
          fd.append("photo", compressed, file.name);
          const res = await fetch("/api/upload-photo", { method: "POST", body: fd });
          const json = await res.json();
          if (!res.ok) throw new Error(json.error || "Upload echoue");
          uploaded.push(json.url);
        } catch (err: any) {
          toast({ title: `Upload ${file.name}`, description: err.message, variant: "destructive" });
        }
      }
      if (uploaded.length) {
        setPhotos((p) => [...p, ...uploaded]);
        toast({ title: `${uploaded.length} photo(s) ajoutee(s)` });
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (photos.length === 0) {
      toast({ title: "Photos manquantes", description: "Ajoute au moins une photo.", variant: "destructive" });
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
          is_public: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur soumission");
      if (data.next_step === "seller_profile") {
        router.push(`/art-core/deposer/seller-profile?artwork_id=${encodeURIComponent(data.artwork_id)}`);
      } else {
        router.push(`/art-core/oeuvre/${encodeURIComponent(data.artwork_id)}`);
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
        Bonjour {authedUser.full_name || authedUser.email}. Remplis le formulaire et publie ton oeuvre en quelques secondes.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Photos */}
        <section>
          <label className="block text-sm font-medium text-white mb-2">Photos *</label>
          <p className="text-xs text-white/40 mb-3">Ajoute au moins une photo. JPG/PNG/WEBP, max 10 Mo chacune.</p>
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
            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}
              className="w-24 h-24 rounded-xl border-2 border-dashed border-white/15 flex flex-col items-center justify-center text-white/30 hover:border-[#D4AF37]/40 hover:text-[#D4AF37]/60 disabled:opacity-40">
              {uploading ? <Loader2 className="size-6 mb-1 animate-spin" /> : <ImageIcon className="size-6 mb-1" />}
              <span className="text-[10px]">{uploading ? "Upload..." : "Ajouter"}</span>
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFilesSelected} />
          </div>
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

        {/* Categorie */}
        <section>
          <label className="block text-sm font-medium text-white mb-2">Categorie</label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setForm({ ...form, category: c.value })}
                className={`px-3 py-1.5 rounded-lg text-xs ${form.category === c.value ? "bg-[#D4AF37] text-black font-semibold" : "bg-white/5 text-white/50"}`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </section>

        {/* Technique + dimensions */}
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

        {/* Description */}
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
          disabled={submitting || photos.length === 0 || !form.title || !form.price}
          className="w-full py-3.5 rounded-xl bg-[#D4AF37] text-black font-semibold disabled:opacity-30 flex items-center justify-center gap-2"
        >
          {submitting ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
          {submitting ? "Enregistrement..." : "Continuer"}
        </button>
        <p className="text-xs text-white/30 text-center">
          Si c&apos;est ta premiere oeuvre, on te demandera ensuite tes infos vendeur (artiste / pro). Sinon, publication immediate.
        </p>
      </form>
    </div>
  );
}
