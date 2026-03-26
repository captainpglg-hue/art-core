"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check, Crown, Sparkles, ShieldCheck, Star, Eye, Trophy,
  BarChart3, Users, Zap, ChevronRight, Loader2,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Plan {
  id: string;
  name: string;
  price: string;
  priceDetail?: string;
  description: string;
  icon: any;
  color: string;
  popular?: boolean;
  features: { text: string; included: boolean }[];
  cta: string;
}

const PLANS: Plan[] = [
  {
    id: "gratuit",
    name: "Gratuit",
    price: "0 EUR",
    description: "Decouvrez PASS-CORE",
    icon: Eye,
    color: "text-white/60",
    features: [
      { text: "Consultation des certificats", included: true },
      { text: "1 verification par jour", included: true },
      { text: "Acces a la galerie publique", included: true },
      { text: "Certifications illimitees", included: false },
      { text: "Badge proprietaire", included: false },
      { text: "Revenus consultation (0,10 EUR)", included: false },
      { text: "Acces leaderboard", included: false },
      { text: "Paris et scouting", included: false },
    ],
    cta: "Plan actuel",
  },
  {
    id: "proprietaire",
    name: "Proprietaire",
    price: "49 EUR",
    priceDetail: "+ 5 EUR/mois",
    description: "Pour les artistes et collectionneurs",
    icon: Crown,
    color: "text-[#D4AF37]",
    popular: true,
    features: [
      { text: "Consultation des certificats", included: true },
      { text: "Verifications illimitees", included: true },
      { text: "Acces a la galerie publique", included: true },
      { text: "Certifications illimitees", included: true },
      { text: "Badge proprietaire dore", included: true },
      { text: "Revenus consultation (0,10 EUR)", included: true },
      { text: "Consultation prioritaire", included: true },
      { text: "Paris et scouting", included: false },
    ],
    cta: "Devenir Proprietaire",
  },
  {
    id: "magnat",
    name: "Pass Magnat Initie",
    price: "9,90 EUR",
    priceDetail: "/mois",
    description: "L'experience complete ART-CORE",
    icon: Trophy,
    color: "text-purple-400",
    features: [
      { text: "Tout le plan Proprietaire", included: true },
      { text: "Verifications illimitees", included: true },
      { text: "Certifications illimitees", included: true },
      { text: "Badge proprietaire dore", included: true },
      { text: "Revenus consultation (0,10 EUR)", included: true },
      { text: "Paris sur les oeuvres", included: true },
      { text: "Leaderboard anonyme", included: true },
      { text: "Scouting de talents", included: true },
    ],
    cta: "Rejoindre les Magnats",
  },
];

export default function AbonnementPage() {
  const router = useRouter();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  async function handleSubscribe(planId: string) {
    if (planId === "gratuit") return;
    setLoadingPlan(planId);
    try {
      const res = await fetch("/api/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur lors de l'abonnement");
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        toast({ title: "Abonnement active", description: `Votre plan ${planId} est maintenant actif.` });
        router.push("/pass-core/proprietaire");
      }
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setLoadingPlan(null);
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 pb-24 animate-fade-in">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="w-16 h-16 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center mx-auto mb-4">
          <Star className="size-8 text-[#D4AF37]" />
        </div>
        <h1 className="font-playfair text-2xl md:text-3xl font-semibold text-white mb-2">Choisissez votre plan</h1>
        <p className="text-white/40 text-sm max-w-md mx-auto">
          Protegez vos oeuvres, generez des revenus et rejoignez la communaute des collectionneurs.
        </p>
      </div>

      {/* Plans grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        {PLANS.map((plan) => {
          const Icon = plan.icon;
          return (
            <div
              key={plan.id}
              className={`relative rounded-2xl border p-6 flex flex-col transition-all ${
                plan.popular
                  ? "border-[#D4AF37]/40 bg-[#D4AF37]/[0.03] scale-[1.02] md:scale-105"
                  : "border-white/8 bg-white/[0.02]"
              }`}
            >
              {/* Popular badge */}
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-[#D4AF37] text-[#0A1128] text-[11px] font-bold uppercase tracking-wider">
                  Populaire
                </div>
              )}

              {/* Plan header */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <Icon className={`size-5 ${plan.color}`} />
                  <h3 className="text-lg font-semibold text-white">{plan.name}</h3>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-white">{plan.price}</span>
                  {plan.priceDetail && (
                    <span className="text-sm text-white/30">{plan.priceDetail}</span>
                  )}
                </div>
                <p className="text-xs text-white/40 mt-1">{plan.description}</p>
              </div>

              {/* Features */}
              <div className="flex-1 space-y-2.5 mb-6">
                {plan.features.map((f, i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                      f.included ? "bg-[#D4AF37]/10" : "bg-white/5"
                    }`}>
                      <Check className={`size-2.5 ${f.included ? "text-[#D4AF37]" : "text-white/15"}`} />
                    </div>
                    <span className={`text-xs ${f.included ? "text-white/60" : "text-white/20 line-through"}`}>
                      {f.text}
                    </span>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <button
                onClick={() => handleSubscribe(plan.id)}
                disabled={plan.id === "gratuit" || loadingPlan === plan.id}
                className={`w-full py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
                  plan.popular
                    ? "bg-[#D4AF37] text-[#0A1128] active:brightness-90"
                    : plan.id === "gratuit"
                      ? "bg-white/5 text-white/30 cursor-default"
                      : "border border-[#D4AF37]/30 text-[#D4AF37] active:bg-[#D4AF37]/5"
                } disabled:opacity-50`}
              >
                {loadingPlan === plan.id ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <>
                    {plan.cta}
                    {plan.id !== "gratuit" && <ChevronRight className="size-4" />}
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Bottom info */}
      <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { icon: ShieldCheck, title: "Certification SHA-256", desc: "Chaque oeuvre recoit une empreinte numerique unique et inviolable." },
          { icon: Zap, title: "Revenus passifs", desc: "Gagnez 0,10 EUR a chaque consultation de vos certificats par des tiers." },
          { icon: Users, title: "Communaute exclusive", desc: "Rejoignez les collectionneurs et artistes les plus influents." },
        ].map((item) => (
          <div key={item.title} className="rounded-xl border border-white/8 bg-white/[0.02] p-4 flex gap-3">
            <item.icon className="size-5 text-[#D4AF37] shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-white font-medium mb-0.5">{item.title}</p>
              <p className="text-xs text-white/30">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Legal */}
      <p className="text-center text-[10px] text-white/15 mt-8">
        ART-CORE GROUP LTD — Companies House UK — art-core.app — Paiements securises par Stripe
      </p>
    </div>
  );
}
