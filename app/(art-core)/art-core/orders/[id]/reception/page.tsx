"use client";

import { useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Camera, CheckCircle2, AlertTriangle, Loader2, ArrowLeft, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

type VerifyResult = { verified: boolean; dispute_opened?: boolean; message: string };

export default function ReceptionPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoBase64, setPhotoBase64] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerifyResult | null>(null);

  function handlePhoto(file: File) {
    const url = URL.createObjectURL(file);
    setPhoto(url);
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      setPhotoBase64(base64);
    };
    reader.readAsDataURL(file);
  }

  async function handleVerify() {
    if (!photoBase64) {
      toast({ title: "Photo requise", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/shipping/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shipping_id: id, reception_photo_base64: photoBase64 }),
      });
      const data = await res.json();
      setResult(data);
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  if (result) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12 text-center animate-fade-in">
        {result.verified ? (
          <>
            <div className="w-20 h-20 rounded-full bg-green-500/10 border-2 border-green-500/30 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="size-10 text-green-400" />
            </div>
            <h1 className="font-playfair text-2xl font-semibold text-white mb-2">Oeuvre authentifiee</h1>
            <p className="text-white/50 text-sm mb-8">Le paiement a ete libere au vendeur. L&apos;oeuvre est enregistree a votre nom dans Pass-Core.</p>
            <div className="rounded-xl bg-green-500/5 border border-green-500/20 p-4 mb-8">
              <div className="flex items-center gap-2 text-green-400 text-sm font-medium">
                <ShieldCheck className="size-4" />
                Verification Pass-Core reussie
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="w-20 h-20 rounded-full bg-red-500/10 border-2 border-red-500/30 flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="size-10 text-red-400" />
            </div>
            <h1 className="font-playfair text-2xl font-semibold text-white mb-2">Difference detectee</h1>
            <p className="text-white/50 text-sm mb-8">Un litige a ete ouvert automatiquement. Notre equipe vous contactera sous 24h.</p>
            <div className="rounded-xl bg-red-500/5 border border-red-500/20 p-4 mb-8">
              <div className="flex items-center gap-2 text-red-400 text-sm font-medium">
                <AlertTriangle className="size-4" />
                Litige ouvert — paiement bloque
              </div>
            </div>
          </>
        )}
        <Button onClick={() => router.push("/art-core/orders")} className="w-full">
          Retour aux commandes
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8 animate-fade-in">
      <button onClick={() => router.back()} className="flex items-center gap-1.5 text-white/40 text-sm mb-6 hover:text-white/60">
        <ArrowLeft className="size-4" /> Retour
      </button>

      <h1 className="font-playfair text-2xl font-semibold text-white mb-2">Verification de reception</h1>
      <p className="text-white/40 text-sm mb-8">Photographiez l&apos;oeuvre recue pour verifier son authenticite Pass-Core.</p>

      <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden"
        onChange={(e) => { if (e.target.files?.[0]) handlePhoto(e.target.files[0]); }} />

      {photo ? (
        <div className="relative rounded-2xl overflow-hidden mb-6 border-2 border-gold/30">
          <img src={photo} alt="Reception" className="w-full aspect-[4/3] object-cover" />
          <button onClick={() => fileRef.current?.click()}
            className="absolute bottom-3 right-3 px-3 py-1.5 rounded-lg bg-black/60 text-white text-xs">
            Reprendre
          </button>
        </div>
      ) : (
        <button onClick={() => fileRef.current?.click()}
          className="w-full py-16 rounded-2xl border-2 border-dashed border-white/15 flex flex-col items-center gap-3 text-white/30 hover:border-gold/40 hover:text-gold/60 transition-colors mb-6">
          <Camera className="size-10" />
          <span className="text-sm font-medium">Photographier l&apos;oeuvre recue</span>
          <span className="text-[11px]">Prenez une photo claire de l&apos;oeuvre complete</span>
        </button>
      )}

      <div className="rounded-xl bg-white/[0.03] border border-white/8 p-4 mb-6">
        <h3 className="text-sm font-medium text-white mb-2">Comment ca marche ?</h3>
        <ol className="space-y-2 text-xs text-white/40">
          <li>1. Photographiez l&apos;oeuvre recue</li>
          <li>2. Le hash est compare avec celui enregistre avant expedition</li>
          <li>3. Si identique → paiement libere automatiquement</li>
          <li>4. Si different → litige ouvert pour investigation</li>
        </ol>
      </div>

      <Button onClick={handleVerify} size="lg" className="w-full gap-2" disabled={loading || !photo}>
        {loading ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
        Verifier l&apos;authenticite
      </Button>
    </div>
  );
}
