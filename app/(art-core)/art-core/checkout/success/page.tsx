"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, ArrowRight, Package, Bell, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-24"><Loader2 className="size-8 text-[#D4AF37] animate-spin" /></div>}>
      <SuccessContent />
    </Suspense>
  );
}

function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Trigger entrance animation
    const t = setTimeout(() => setShow(true), 100);
    return () => clearTimeout(t);
  }, []);

  const orderNumber = sessionId
    ? `AC-${sessionId.slice(0, 8).toUpperCase()}`
    : `AC-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;

  return (
    <div className="max-w-lg mx-auto px-4 py-16 text-center animate-fade-in">
      {/* Success animation */}
      <div className={`transition-all duration-700 ${show ? "scale-100 opacity-100" : "scale-50 opacity-0"}`}>
        <div className="relative w-24 h-24 mx-auto mb-8">
          <div className="absolute inset-0 rounded-full bg-green-500/10 animate-ping" />
          <div className="relative w-24 h-24 rounded-full bg-green-500/20 flex items-center justify-center">
            <CheckCircle2 className="size-12 text-green-400" />
          </div>
        </div>
      </div>

      <h1 className="font-playfair text-3xl sm:text-4xl font-semibold text-white mb-3">
        Commande confirmée !
      </h1>
      <p className="text-white/40 text-sm mb-8">
        Merci pour votre achat. Votre oeuvre a été réservée avec succès.
      </p>

      {/* Order details */}
      <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-6 text-left space-y-4 mb-8">
        <div className="flex items-center gap-3 pb-4 border-b border-white/5">
          <Package className="size-5 text-[#D4AF37]" />
          <div>
            <p className="text-xs text-white/30">Numéro de commande</p>
            <p className="text-sm font-semibold text-white font-mono">{orderNumber}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Bell className="size-5 text-[#D4AF37]" />
          <div>
            <p className="text-sm text-white">L&apos;artiste a été notifié</p>
            <p className="text-[11px] text-white/30">
              Vous recevrez un email de confirmation avec les détails de livraison
            </p>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="rounded-xl bg-[#D4AF37]/5 border border-[#D4AF37]/20 p-4 mb-8">
        <p className="text-[#D4AF37]/80 text-sm">
          Un email de confirmation a été envoyé. L&apos;artiste préparera votre oeuvre pour l&apos;expédition.
        </p>
      </div>

      {/* CTAs */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link href="/art-core/collection">
          <Button className="w-full sm:w-auto bg-[#D4AF37] hover:bg-[#c9a432] text-black font-semibold px-6">
            Voir ma collection
            <ArrowRight className="size-4 ml-2" />
          </Button>
        </Link>
        <Link href="/art-core">
          <Button variant="outline" className="w-full sm:w-auto border-white/10 text-white/60 hover:text-white hover:bg-white/5 px-6">
            Retour au marketplace
          </Button>
        </Link>
      </div>
    </div>
  );
}
