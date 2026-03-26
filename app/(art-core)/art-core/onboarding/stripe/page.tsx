"use client";

import { useState } from "react";
import { CreditCard, ShieldCheck, Banknote, FileText, ArrowRight, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

const BENEFITS = [
  { icon: Banknote, title: "Recevez vos ventes directement", desc: "Virements automatiques sur votre compte bancaire" },
  { icon: ShieldCheck, title: "Paiement sécurisé", desc: "Transactions chiffrées et protégées par Stripe" },
  { icon: CreditCard, title: "Virements automatiques", desc: "Recevez vos gains sous 7 jours ouvrés" },
];

const REQUIREMENTS = [
  { icon: FileText, label: "Pièce d'identité", desc: "Carte d'identité ou passeport en cours de validité" },
  { icon: Banknote, label: "IBAN", desc: "Coordonnées bancaires pour recevoir vos paiements" },
  { icon: ShieldCheck, label: "Informations fiscales", desc: "Numéro fiscal ou équivalent selon votre pays" },
];

export default function StripeOnboardingPage() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "started" | "complete">("idle");

  async function startOnboarding() {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe?action=onboard", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast({ title: "Configuration en cours de préparation..." });
        setStatus("started");
      }
    } catch {
      toast({ title: "Erreur de connexion", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 animate-fade-in">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="w-16 h-16 rounded-2xl bg-[#D4AF37]/10 flex items-center justify-center mx-auto mb-4">
          <CreditCard className="size-8 text-[#D4AF37]" />
        </div>
        <h1 className="font-playfair text-3xl sm:text-4xl font-semibold text-white">
          Configurez vos paiements
        </h1>
        <p className="text-white/40 text-sm mt-2">
          Activez votre compte vendeur pour recevoir le paiement de vos ventes
        </p>
      </div>

      {/* Benefits */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        {BENEFITS.map((b) => {
          const Icon = b.icon;
          return (
            <div key={b.title} className="rounded-xl bg-white/[0.03] border border-white/10 p-5 text-center">
              <Icon className="size-6 text-[#D4AF37] mx-auto mb-3" />
              <p className="text-sm font-semibold text-white mb-1">{b.title}</p>
              <p className="text-[11px] text-white/30">{b.desc}</p>
            </div>
          );
        })}
      </div>

      {/* Requirements */}
      <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-6 mb-8">
        <h2 className="text-lg font-semibold text-white mb-4">Documents requis</h2>
        <div className="space-y-4">
          {REQUIREMENTS.map((r) => {
            const Icon = r.icon;
            return (
              <div key={r.label} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/[0.03] border border-white/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Icon className="size-4 text-[#D4AF37]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{r.label}</p>
                  <p className="text-[11px] text-white/30">{r.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Progress if started */}
      {status === "started" && (
        <div className="rounded-xl bg-[#D4AF37]/5 border border-[#D4AF37]/20 p-4 mb-6 flex items-center gap-3 animate-fade-in">
          <CheckCircle2 className="size-5 text-[#D4AF37] shrink-0" />
          <div>
            <p className="text-sm font-semibold text-[#D4AF37]">Vérification démarrée</p>
            <p className="text-[11px] text-white/30">Stripe est en train de vérifier vos informations</p>
          </div>
        </div>
      )}

      {/* CTA */}
      <div className="text-center">
        <Button
          onClick={startOnboarding}
          disabled={loading}
          className="bg-[#D4AF37] hover:bg-[#c9a432] text-black font-semibold px-8 py-3 h-12 text-base rounded-xl"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="size-4 animate-spin" />
              Chargement...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              Commencer la vérification
              <ArrowRight className="size-4" />
            </span>
          )}
        </Button>
        <p className="text-white/20 text-xs mt-3">
          Vous serez redirigé vers Stripe pour compléter la vérification
        </p>
      </div>

      {/* Stripe badge */}
      <div className="flex items-center justify-center gap-2 mt-10 text-white/15 text-xs">
        <ShieldCheck className="size-4" />
        <span>Sécurisé par Stripe — Vos données ne sont jamais stockées sur nos serveurs</span>
      </div>
    </div>
  );
}
