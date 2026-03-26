"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Upload, Loader2, Image as ImageIcon, X, Package, Shield, Truck, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { calculateShipping, type Fragility, type ShippingResult } from "@/lib/shipping";

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
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const certHash = searchParams.get("hash") || "";
  const certDate = searchParams.get("date") || "";
  const [form, setForm] = useState({
    title: searchParams.get("title") || "",
    description: "",
    technique: searchParams.get("technique") || "",
    dimensions: searchParams.get("dimensions") || "",
    creation_date: "", category: "painting",
    price: searchParams.get("price") || "",
    weight_kg: "", fragility: "standard" as Fragility,
  });
  const [shippingPreview, setShippingPreview] = useState<ShippingResult | null>(null);

  useEffect(() => {
    const w = parseFloat(form.weight_kg) || 1;
    const dimMatch = form.dimensions.match(/(\d+)/);
    const maxDim = dimMatch ? parseInt(dimMatch[1]) : 50;
    const value = parseFloat(form.price) || 0;
    if (value > 0) {
      setShippingPreview(calculateShipping({ weight_kg: w, max_dimension_cm: maxDim, fragility: form.fragility, declared_value: value }));
    }
  }, [form.weight_kg, form.dimensions, form.price, form.fragility]);

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
      <h1 className="font-playfair text-3xl font-semibold text-white mb-2">Déposer une œuvre</h1>
      <p className="text-white/40 text-sm mb-8">En 3 clics : photo, titre, prix.</p>

      {/* Certification info from Pass-Core */}
      {certHash && (
        <div className="rounded-xl bg-green-500/5 border border-green-500/15 p-4 mb-6 flex items-start gap-3">
          <ShieldCheck className="size-5 text-green-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-green-400 font-medium">Œuvre certifiée via Pass-Core</p>
            <p className="text-[11px] text-white/35 mt-1">Hash : <span className="font-mono text-white/50">{certHash.slice(0, 20)}...</span></p>
            {certDate && <p className="text-[11px] text-white/35">Certifiée le : {certDate}</p>}
          </div>
        </div>
      )}

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

        {/* ── Transport & Livraison ────────────────────── */}
        <div className="pt-4 border-t border-white/8">
          <div className="flex items-center gap-2 mb-4">
            <Package className="size-5 text-gold" />
            <h2 className="text-lg font-semibold text-white">Transport & Livraison</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="weight">Poids (kg)</Label>
              <Input id="weight" type="number" step="0.1" min="0.1" value={form.weight_kg} onChange={(e) => setForm({ ...form, weight_kg: e.target.value })} placeholder="2.5" className="mt-1.5" />
            </div>
            <div>
              <Label>Fragilité</Label>
              <div className="flex gap-2 mt-1.5">
                {([
                  { v: "standard", l: "Standard" },
                  { v: "fragile", l: "Fragile" },
                  { v: "tres_fragile", l: "Très fragile" },
                ] as const).map((f) => (
                  <button key={f.v} type="button" onClick={() => setForm({ ...form, fragility: f.v })}
                    className={`flex-1 px-2 py-2 rounded-lg text-xs transition-all ${form.fragility === f.v ? "bg-gold text-black font-semibold" : "bg-white/5 text-white/50 hover:bg-white/10"}`}>
                    {f.l}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Shipping preview */}
          {shippingPreview && !shippingPreview.on_quote && (
            <div className="mt-4 rounded-xl bg-white/[0.03] border border-white/8 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Truck className="size-4 text-gold" />
                <span className="text-sm font-medium text-white">Frais de livraison estimés (Niveau {shippingPreview.level})</span>
              </div>
              <div className="space-y-1.5">
                {shippingPreview.zones.map((z) => (
                  <div key={z.zone} className="flex justify-between text-xs">
                    <span className="text-white/50">{z.label} ({z.days})</span>
                    <span className="text-white font-medium">{z.cost > 0 ? `${z.cost.toFixed(2)}€` : "Sur devis"}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-[10px] text-gold/70">
                <Shield className="size-3" />
                Assurance incluse {shippingPreview.insurance_included}
              </div>
            </div>
          )}
          {shippingPreview?.on_quote && (
            <div className="mt-4 rounded-xl bg-gold/5 border border-gold/20 p-4 text-center">
              <p className="text-sm text-gold font-medium">Valeur &gt; 50 000€ — Transport sur devis</p>
              <p className="text-xs text-white/40 mt-1">Contactez notre service transport dédié</p>
            </div>
          )}
        </div>

        <Button type="submit" size="lg" className="w-full gap-2" disabled={loading}>
          {loading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
          Déposer l&apos;oeuvre
        </Button>
      </form>
    </div>
  );
}
