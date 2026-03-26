"use client";

import { useState } from "react";
import {
  Crown,
  Check,
  X,
  Zap,
  Shield,
  TrendingUp,
  Trophy,
  Star,
  Award,
} from "lucide-react";

const plans = [
  {
    id: "gratuit",
    name: "Gratuit",
    price: "0 €",
    period: "",
    description: "Découvrez PRIME-CORE avec un accès limité",
    features: [
      { text: "Accès au leaderboard en lecture seule", included: true },
      { text: "1 pari par jour", included: true },
      { text: "Scouting basique", included: true },
      { text: "Paris illimités", included: false },
      { text: "Scouting premium", included: false },
      { text: "Leaderboard complet", included: false },
      { text: "Royalties majorées", included: false },
      { text: "Badge exclusif", included: false },
    ],
    current: true,
    cta: "Plan actuel",
    accent: false,
  },
  {
    id: "magnat",
    name: "Pass Magnat Initié",
    price: "9,90 €",
    period: "/mois",
    description: "L'expérience PRIME-CORE complète pour les vrais Initiés",
    features: [
      { text: "Accès au leaderboard complet", included: true },
      { text: "Paris prédictifs illimités", included: true },
      { text: "Scouting premium & alertes", included: true },
      { text: "Royalties majorées (+10%)", included: true },
      { text: "Statistiques avancées", included: true },
      { text: "Badge Magnat exclusif", included: true },
      { text: "Accès anticipé aux marchés", included: true },
      { text: "Support prioritaire", included: true },
    ],
    current: false,
    cta: "Devenir Magnat",
    accent: true,
  },
];

export default function AbonnementPage() {
  const [selectedPlan, setSelectedPlan] = useState("gratuit");

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-fade-in">
      <div className="text-center mb-10">
        <h1 className="font-playfair text-3xl font-semibold text-white mb-2">Abonnement</h1>
        <p className="text-white/40 text-sm max-w-md mx-auto">
          Choisissez votre niveau d&apos;accès à PRIME-CORE et débloquez tout le potentiel du scouting.
        </p>
      </div>

      {/* Plans */}
      <div className="grid md:grid-cols-2 gap-6 mb-10">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`relative rounded-2xl border p-6 transition-colors ${
              plan.accent
                ? "bg-gradient-to-br from-[#2ecc71]/10 to-[#D4AF37]/5 border-[#2ecc71]/30"
                : "bg-white/[0.03] border-white/[0.08]"
            }`}
          >
            {plan.accent && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-[#2ecc71] text-white text-[10px] font-bold uppercase tracking-widest">
                Recommandé
              </div>
            )}

            <div className="flex items-center gap-3 mb-4 mt-1">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                plan.accent ? "bg-[#2ecc71]/20" : "bg-white/[0.05]"
              }`}>
                {plan.accent ? (
                  <Crown className="size-6 text-[#D4AF37]" />
                ) : (
                  <Star className="size-6 text-white/30" />
                )}
              </div>
              <div>
                <h3 className={`text-lg font-semibold ${plan.accent ? "text-white" : "text-white/70"}`}>
                  {plan.name}
                </h3>
                <p className="text-xs text-white/30">{plan.description}</p>
              </div>
            </div>

            <div className="mb-6">
              <span className={`text-3xl font-bold ${plan.accent ? "text-[#2ecc71]" : "text-white/60"}`}>
                {plan.price}
              </span>
              {plan.period && <span className="text-sm text-white/30">{plan.period}</span>}
            </div>

            <div className="space-y-3 mb-6">
              {plan.features.map((f, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  {f.included ? (
                    <div className="w-5 h-5 rounded-full bg-[#2ecc71]/10 flex items-center justify-center shrink-0">
                      <Check className="size-3 text-[#2ecc71]" />
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-white/[0.05] flex items-center justify-center shrink-0">
                      <X className="size-3 text-white/15" />
                    </div>
                  )}
                  <span className={`text-sm ${f.included ? "text-white/70" : "text-white/20"}`}>
                    {f.text}
                  </span>
                </div>
              ))}
            </div>

            <button
              className={`w-full py-3 rounded-xl text-sm font-semibold transition-colors ${
                plan.current
                  ? "bg-white/[0.05] border border-white/[0.08] text-white/40 cursor-default"
                  : plan.accent
                  ? "bg-[#2ecc71] text-white hover:bg-[#27ae60]"
                  : "bg-white/[0.05] border border-white/[0.08] text-white/60 hover:bg-white/[0.08]"
              }`}
              disabled={plan.current}
            >
              {plan.cta}
            </button>
          </div>
        ))}
      </div>

      {/* Perks highlight */}
      <div className="rounded-2xl bg-white/[0.03] border border-white/[0.08] p-6">
        <h2 className="text-lg font-semibold text-white mb-4 text-center">
          Pourquoi passer au Pass Magnat ?
        </h2>
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="w-10 h-10 rounded-xl bg-[#2ecc71]/10 flex items-center justify-center mx-auto mb-2">
              <Zap className="size-5 text-[#2ecc71]" />
            </div>
            <p className="text-sm font-medium text-white">Paris illimités</p>
            <p className="text-[11px] text-white/30 mt-0.5">Pariez sans limite sur tous les marchés</p>
          </div>
          <div className="text-center">
            <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/10 flex items-center justify-center mx-auto mb-2">
              <TrendingUp className="size-5 text-[#D4AF37]" />
            </div>
            <p className="text-sm font-medium text-white">Royalties +10%</p>
            <p className="text-[11px] text-white/30 mt-0.5">Commissions majorées sur vos artistes</p>
          </div>
          <div className="text-center">
            <div className="w-10 h-10 rounded-xl bg-purple-400/10 flex items-center justify-center mx-auto mb-2">
              <Award className="size-5 text-purple-400" />
            </div>
            <p className="text-sm font-medium text-white">Badge exclusif</p>
            <p className="text-[11px] text-white/30 mt-0.5">Distinguez-vous dans le classement</p>
          </div>
        </div>
      </div>
    </div>
  );
}
