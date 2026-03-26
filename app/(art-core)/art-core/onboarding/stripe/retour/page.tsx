"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, AlertTriangle, ArrowRight, RotateCcw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type Status = "loading" | "complete" | "incomplete";

export default function StripeRetourPage() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    checkStatus();
  }, []);

  async function checkStatus() {
    setStatus("loading");
    try {
      const res = await fetch("/api/stripe?action=status");
      const data = await res.json();
      if (data.charges_enabled || data.status === "complete") {
        setStatus("complete");
      } else {
        setStatus("incomplete");
      }
    } catch {
      // Check searchParams as fallback
      const success = searchParams.get("success");
      setStatus(success === "true" ? "complete" : "incomplete");
    }
  }

  if (status === "loading") {
    return (
      <div className="max-w-lg mx-auto px-4 py-24 text-center animate-fade-in">
        <Loader2 className="size-10 text-[#D4AF37] animate-spin mx-auto mb-4" />
        <p className="text-white/40 text-sm">Vérification de votre compte en cours...</p>
      </div>
    );
  }

  if (status === "complete") {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center animate-fade-in">
        {/* Success */}
        <div className="relative w-20 h-20 mx-auto mb-6">
          <div className="absolute inset-0 rounded-full bg-green-500/10 animate-ping" />
          <div className="relative w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center">
            <CheckCircle2 className="size-10 text-green-400" />
          </div>
        </div>

        <h1 className="font-playfair text-3xl font-semibold text-white mb-3">
          Compte vendeur activé !
        </h1>
        <p className="text-white/40 text-sm mb-8">
          Votre compte Stripe Connect est maintenant configuré. Vous pouvez recevoir des paiements pour vos ventes.
        </p>

        <div className="rounded-xl bg-green-500/5 border border-green-500/20 p-4 mb-8">
          <p className="text-green-400/80 text-sm">
            Les paiements de vos ventes seront désormais virés automatiquement sur votre compte bancaire.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/art-core/dashboard">
            <Button className="w-full sm:w-auto bg-[#D4AF37] hover:bg-[#c9a432] text-black font-semibold px-6">
              Aller au dashboard
              <ArrowRight className="size-4 ml-2" />
            </Button>
          </Link>
          <Link href="/art-core/deposer">
            <Button variant="outline" className="w-full sm:w-auto border-white/10 text-white/60 hover:text-white hover:bg-white/5 px-6">
              Déposer une oeuvre
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Incomplete
  return (
    <div className="max-w-lg mx-auto px-4 py-16 text-center animate-fade-in">
      <div className="w-20 h-20 rounded-full bg-yellow-500/10 flex items-center justify-center mx-auto mb-6">
        <AlertTriangle className="size-10 text-yellow-400" />
      </div>

      <h1 className="font-playfair text-3xl font-semibold text-white mb-3">
        Configuration incomplète
      </h1>
      <p className="text-white/40 text-sm mb-8">
        La vérification de votre compte n&apos;est pas encore terminée. Veuillez compléter toutes les étapes requises.
      </p>

      <div className="rounded-xl bg-yellow-500/5 border border-yellow-500/20 p-4 mb-8">
        <p className="text-yellow-400/80 text-sm">
          Certaines informations sont manquantes. Reprenez la vérification pour finaliser votre inscription vendeur.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link href="/art-core/onboarding/stripe">
          <Button className="w-full sm:w-auto bg-[#D4AF37] hover:bg-[#c9a432] text-black font-semibold px-6">
            <RotateCcw className="size-4 mr-2" />
            Reprendre la vérification
          </Button>
        </Link>
        <Link href="/art-core/dashboard">
          <Button variant="outline" className="w-full sm:w-auto border-white/10 text-white/60 hover:text-white hover:bg-white/5 px-6">
            Retour au dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}
