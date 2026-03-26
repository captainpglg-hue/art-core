"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ShieldCheck, Lock, CreditCard, ArrowLeft, Loader2, Package, Truck, CheckCircle2 } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Artwork {
  id: string;
  title: string;
  artist_name: string;
  price: number;
  photos: string[];
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-24"><div className="w-8 h-8 border-2 border-[#D4AF37]/30 border-t-[#D4AF37] rounded-full animate-spin" /></div>}>
      <CheckoutContent />
    </Suspense>
  );
}

function CheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const artworkId = searchParams.get("artwork");

  const [artwork, setArtwork] = useState<Artwork | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: "",
    address: "",
    city: "",
    postal: "",
    country: "France",
  });
  const [shippingZone, setShippingZone] = useState<"FR" | "EU" | "INT">("FR");

  const shippingRates: Record<string, { label: string; cost: number; days: string }> = {
    FR: { label: "France", cost: 4.90, days: "2-5 jours" },
    EU: { label: "Europe", cost: 12.90, days: "3-10 jours" },
    INT: { label: "International", cost: 39.90, days: "7-21 jours" },
  };
  const shippingCost = shippingRates[shippingZone].cost;

  useEffect(() => {
    if (!artworkId) { setLoading(false); return; }
    fetch(`/api/artworks/${artworkId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.artwork) {
          const a = d.artwork;
          setArtwork({
            ...a,
            photos: typeof a.photos === "string" ? JSON.parse(a.photos) : a.photos || [],
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [artworkId]);

  async function handleSimulatedPayment() {
    if (!artwork) return;
    if (!form.name || !form.address || !form.city || !form.postal) {
      toast({ title: "Veuillez remplir tous les champs", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/sale/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artwork_id: artwork.id,
          payment_intent_id: `sim_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          simulation: true,
          shipping: {
            name: form.name,
            address: form.address,
            city: form.city,
            postal: form.postal,
            country: form.country,
            zone: shippingZone,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.push(`/art-core/checkout/success?session_id=${data.transactionId}`);
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
      setSubmitting(false);
    }
  }

  const commission = artwork ? artwork.price * 0.10 : 0;
  const total = artwork ? artwork.price + shippingCost : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-2 border-[#D4AF37]/30 border-t-[#D4AF37] rounded-full animate-spin" />
      </div>
    );
  }

  if (!artwork) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <p className="text-white/40 mb-4">Aucune oeuvre selectionnee</p>
        <Link href="/art-core" className="text-[#D4AF37] text-sm hover:underline">
          Retour au marketplace
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 animate-fade-in">
      <Link href={`/art-core/oeuvre/${artwork.id}`} className="inline-flex items-center gap-1 text-white/40 hover:text-white text-sm mb-8 transition-colors">
        <ArrowLeft className="size-4" />
        Retour a l&apos;oeuvre
      </Link>

      <h1 className="font-playfair text-3xl font-semibold text-white mb-8">Finaliser l&apos;achat</h1>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8">
        {/* Left — Form */}
        <div className="space-y-6">
          {/* Shipping */}
          <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Adresse de livraison</h2>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name" className="text-white/60 text-sm">Nom complet</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="mt-1 bg-white/[0.03] border-white/10 text-white placeholder:text-white/20"
                  placeholder="Jean Dupont"
                />
              </div>
              <div>
                <Label htmlFor="address" className="text-white/60 text-sm">Adresse</Label>
                <Input
                  id="address"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="mt-1 bg-white/[0.03] border-white/10 text-white placeholder:text-white/20"
                  placeholder="12 Rue de la Paix"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="city" className="text-white/60 text-sm">Ville</Label>
                  <Input
                    id="city"
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    className="mt-1 bg-white/[0.03] border-white/10 text-white placeholder:text-white/20"
                    placeholder="Paris"
                  />
                </div>
                <div>
                  <Label htmlFor="postal" className="text-white/60 text-sm">Code postal</Label>
                  <Input
                    id="postal"
                    value={form.postal}
                    onChange={(e) => setForm({ ...form, postal: e.target.value })}
                    className="mt-1 bg-white/[0.03] border-white/10 text-white placeholder:text-white/20"
                    placeholder="75001"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="country" className="text-white/60 text-sm">Pays</Label>
                <Input
                  id="country"
                  value={form.country}
                  onChange={(e) => setForm({ ...form, country: e.target.value })}
                  className="mt-1 bg-white/[0.03] border-white/10 text-white placeholder:text-white/20"
                />
              </div>
            </div>
          </div>

          {/* Shipping Zone Selection */}
          <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Truck className="size-5 text-[#D4AF37]" />
              <h2 className="text-lg font-semibold text-white">Zone de livraison</h2>
            </div>
            <div className="space-y-2">
              {(Object.entries(shippingRates) as [string, { label: string; cost: number; days: string }][]).map(([key, rate]) => (
                <label
                  key={key}
                  className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                    shippingZone === key
                      ? "border-[#D4AF37]/50 bg-[#D4AF37]/5"
                      : "border-white/10 bg-white/[0.02] hover:border-white/20"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="shipping_zone"
                      value={key}
                      checked={shippingZone === key}
                      onChange={() => setShippingZone(key as "FR" | "EU" | "INT")}
                      className="accent-[#D4AF37]"
                    />
                    <div>
                      <p className="text-sm text-white font-medium">{rate.label}</p>
                      <p className="text-[11px] text-white/30">{rate.days}</p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-[#D4AF37]">{formatPrice(rate.cost)}</span>
                </label>
              ))}
            </div>
            <p className="text-[10px] text-white/30 mt-3 flex items-center gap-1">
              <Package className="size-3" />
              Tracking et assurance inclus — Livraison securisee Pass-Core
            </p>
          </div>

          {/* Payment */}
          <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-6">
            <div className="flex items-center gap-2 mb-4">
              <CreditCard className="size-5 text-[#D4AF37]" />
              <h2 className="text-lg font-semibold text-white">Paiement</h2>
            </div>

            {/* Simulated card display */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-[#1a1a2e] to-[#16213e] border border-white/10 mb-4">
              <div className="flex justify-between items-start mb-6">
                <div className="text-[10px] uppercase tracking-widest text-white/40">Mode test</div>
                <CreditCard className="size-5 text-[#D4AF37]" />
              </div>
              <div className="font-mono text-white/60 text-sm tracking-widest mb-4">
                4242 •••• •••• 4242
              </div>
              <div className="flex justify-between text-[11px] text-white/30">
                <span>SIMULATION</span>
                <span>12/28</span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-white/30 text-xs mb-4">
              <Lock className="size-3" />
              <span>Mode test — aucun paiement reel ne sera effectue</span>
            </div>

            <Button
              onClick={handleSimulatedPayment}
              disabled={submitting || !form.name || !form.address || !form.city || !form.postal}
              className="w-full bg-[#D4AF37] hover:bg-[#c9a432] text-black font-semibold py-3 h-12 rounded-xl text-base"
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin" />
                  Traitement...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="size-5" />
                  Confirmer l&apos;achat — {formatPrice(total)}
                </span>
              )}
            </Button>
          </div>
        </div>

        {/* Right — Order Summary */}
        <div className="lg:sticky lg:top-24 h-fit">
          <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-6 space-y-5">
            <h2 className="text-lg font-semibold text-white">Recapitulatif</h2>

            <div className="flex gap-4">
              <div className="w-20 h-20 rounded-xl bg-[#111] overflow-hidden shrink-0">
                {artwork.photos[0] && (
                  <img src={artwork.photos[0]} alt={artwork.title} className="w-full h-full object-cover" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white line-clamp-2">{artwork.title}</p>
                <p className="text-xs text-white/40 mt-0.5">{artwork.artist_name}</p>
              </div>
            </div>

            <div className="space-y-2 text-sm border-t border-white/5 pt-4">
              <div className="flex justify-between text-white/50">
                <span>Prix de l&apos;oeuvre</span>
                <span className="text-white">{formatPrice(artwork.price)}</span>
              </div>
              <div className="flex justify-between text-white/50">
                <span>Commission plateforme (10%)</span>
                <span className="text-white">{formatPrice(commission)}</span>
              </div>
              <div className="flex justify-between text-white/50">
                <span>Livraison ({shippingRates[shippingZone].label})</span>
                <span className="text-white">{formatPrice(shippingCost)}</span>
              </div>
            </div>

            <div className="flex justify-between items-center border-t border-white/5 pt-4">
              <span className="text-white font-semibold">Total</span>
              <span className="text-[#D4AF37] text-xl font-bold">{formatPrice(total)}</span>
            </div>

            <div className="flex items-center gap-2 text-xs text-green-400/70 pt-2">
              <ShieldCheck className="size-4" />
              <span>Protection acheteur ART-CORE</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
