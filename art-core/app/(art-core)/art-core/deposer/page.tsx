"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, Loader2, Image as ImageIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";

const CATEGORIES = [
  { label: "Peinture", value: "painting" },
  { label: "Sculpture", value: "sculpture" },
  { label: "Photographie", value: "photography" },
  { label: "Numérique", value: "digital" },
  { label: "Dessin", value: "drawing" },
  { label: "Technique mixte", value: "mixed_media" },
  { label: "Céramique", value: "ceramics" },
];

export default function DeposerPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [form, setForm] = useState({
    title: "", description: "", technique: "", dimensions: "",
    creation_date: "", category: "painting", price: "",
  });

  function addDemoPhoto() {
    const demoPhotos = [
      "https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=800",
      "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=800",
      "https://images.unsplash.com/photo-1549490349-8643362247b5?w=800",
      "https://images.unsplash.com/photo-1554188248-986adbb73be4?w=800",
    ];
    const unused = demoPhotos.filter((p) => !photos.includes(p));
    if (unused.length) setPhotos([...photos, unused[0]]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title || !form.price) {
      toast({ title: "Titre et prix requis", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/artworks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, price: parseFloat(form.price), photos }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: "Oeuvre déposée !", description: "Elle est maintenant visible sur le marketplace." });
      router.push(`/art-core/oeuvre/${data.id}`);
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally { setLoading(false); }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="font-playfair text-3xl font-semibold text-white mb-2">Déposer une oeuvre</h1>
      <p className="text-white/40 text-sm mb-8">En 3 clics : photo, titre, prix.</p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Photos */}
        <div>
          <Label>Photos</Label>
          <div className="mt-2 flex flex-wrap gap-3">
            {photos.map((p, i) => (
              <div key={i} className="relative w-24 h-24 rounded-xl overflow-hidden bg-[#111111]">
                <img src={p} alt="" className="w-full h-full object-cover" />
                <button type="button" onClick={() => setPhotos(photos.filter((_, j) => j !== i))} className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center">
                  <X className="size-3 text-white" />
                </button>
              </div>
            ))}
            <button type="button" onClick={addDemoPhoto} className="w-24 h-24 rounded-xl border-2 border-dashed border-white/15 flex flex-col items-center justify-center text-white/30 hover:border-gold/40 hover:text-gold/60 transition-colors">
              <ImageIcon className="size-6 mb-1" />
              <span className="text-[10px]">Ajouter</span>
            </button>
          </div>
          <p className="text-[11px] text-white/25 mt-1">Cliquez pour ajouter des photos démo</p>
        </div>

        {/* Title & Price */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="title">Titre *</Label>
            <Input id="title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Titre de l'oeuvre" className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="price">Prix (€) *</Label>
            <Input id="price" type="number" min="1" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="5000" className="mt-1.5" />
          </div>
        </div>

        {/* Category */}
        <div>
          <Label>Catégorie</Label>
          <div className="flex flex-wrap gap-2 mt-1.5">
            {CATEGORIES.map((c) => (
              <button key={c.value} type="button" onClick={() => setForm({ ...form, category: c.value })}
                className={`px-3 py-1.5 rounded-lg text-xs transition-all ${form.category === c.value ? "bg-gold text-black font-semibold" : "bg-white/5 text-white/50 hover:bg-white/10"}`}>
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="technique">Technique</Label>
            <Input id="technique" value={form.technique} onChange={(e) => setForm({ ...form, technique: e.target.value })} placeholder="Huile sur toile" className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="dimensions">Dimensions</Label>
            <Input id="dimensions" value={form.dimensions} onChange={(e) => setForm({ ...form, dimensions: e.target.value })} placeholder="80x120 cm" className="mt-1.5" />
          </div>
        </div>

        <div>
          <Label htmlFor="description">Description</Label>
          <textarea id="description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} placeholder="Décrivez votre oeuvre..." className="w-full mt-1.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/30 p-3 resize-none focus:outline-none focus:border-gold/40" />
        </div>

        <Button type="submit" size="lg" className="w-full gap-2" disabled={loading}>
          {loading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
          Déposer l&apos;oeuvre
        </Button>
      </form>
    </div>
  );
}
