"use client";

import { useState } from "react";
import {
  CreditCard, Shield, Gift, TrendingUp, CheckCircle2,
  Loader2, ArrowRight, Coins
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface InitieSignupProps {
  onSuccess?: () => void;
}

const BENEFITS = [
  {
    icon: Gift,
    title: "15 points offerts",
    description: "Bonus de bienvenue credite immediatement",
  },
  {
    icon: TrendingUp,
    title: "Commissions sur les ventes",
    description: "5% du prix reparti entre les inities de la jauge",
  },
  {
    icon: Coins,
    title: "Bonus points x1.5",
    description: "Recevez 1.5x vos points en bonus a chaque vente",
  },
  {
    icon: Shield,
    title: "Acces exclusif",
    description: "Deposez sur les jauges et influencez le marche",
  },
];

export function InitieSignup({ onSuccess }: InitieSignupProps) {
  const [step, setStep] = useState<"info" | "form" | "success">("info");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ full_name: "", iban: "" });

  async function handleSubmit() {
    if (!form.full_name.trim()) {
      toast({ title: "Nom complet requis", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/initie/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setStep("success");
      toast({
        title: "Bienvenue parmi les Inities !",
        description: `${data.points_credited} points credites sur votre compte`,
      });
      onSuccess?.();
    } catch (err) {
      toast({
        title: "Erreur",
        description: err instanceof Error ? err.message : "Erreur inattendue",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  if (step === "success") {
    return (
      <div className="text-center py-12 px-4">
        <div className="w-20 h-20 rounded-2xl bg-[#C9A84C]/10 border border-[#C9A84C]/30 flex items-center justify-center mx-auto mb-5">
          <CheckCircle2 className="size-10 text-[#C9A84C]" />
        </div>
        <h2 className="font-playfair text-2xl font-semibold text-white mb-2">
          Vous etes Initie !
        </h2>
        <p className="text-white/50 text-sm mb-1">15 points ont ete credites sur votre compte.</p>
        <p className="text-white/30 text-xs">Commencez a deposer sur les jauges des oeuvres.</p>
      </div>
    );
  }

  if (step === "form") {
    return (
      <div className="max-w-md mx-auto space-y-6 py-8 px-4">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-[#C9A84C]/10 border border-[#C9A84C]/30 flex items-center justify-center mx-auto mb-4">
            <CreditCard className="size-7 text-[#C9A84C]" />
          </div>
          <h2 className="font-playfair text-2xl font-semibold text-white mb-2">
            Ouvrir un compte partenaire
          </h2>
          <p className="text-white/40 text-sm">
            Verification simplifiee — 100% en ligne
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="full_name">Nom complet</Label>
            <Input
              id="full_name"
              placeholder="Jean Dupont"
              value={form.full_name}
              onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="iban">IBAN (optionnel)</Label>
            <Input
              id="iban"
              placeholder="FR76 XXXX XXXX XXXX XXXX XXXX XXX"
              value={form.iban}
              onChange={(e) => setForm((f) => ({ ...f, iban: e.target.value }))}
            />
            <p className="text-[10px] text-white/25">Pour recevoir vos commissions. Peut etre ajoute plus tard.</p>
          </div>
        </div>

        <div className="bg-[#C9A84C]/5 border border-[#C9A84C]/15 rounded-xl p-4">
          <p className="text-xs text-[#C9A84C]/80 font-medium mb-1">Mode simulation</p>
          <p className="text-[11px] text-white/30">
            En production, cette etape connecte a la banque partenaire pour verification KYC.
            Ici, le compte est cree instantanement avec 15 points de bienvenue.
          </p>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            size="lg"
            className="flex-1"
            onClick={() => setStep("info")}
          >
            Retour
          </Button>
          <Button
            size="lg"
            className="flex-1 gap-2"
            disabled={loading || !form.full_name.trim()}
            onClick={handleSubmit}
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <>
                Confirmer
                <CheckCircle2 className="size-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  // Info step
  return (
    <div className="max-w-lg mx-auto py-8 px-4">
      <div className="text-center mb-10">
        <div className="w-16 h-16 rounded-2xl bg-[#C9A84C]/10 border border-[#C9A84C]/30 flex items-center justify-center mx-auto mb-5">
          <Shield className="size-8 text-[#C9A84C]" />
        </div>
        <h1 className="font-playfair text-3xl font-semibold text-white mb-3">
          Devenez Initie
        </h1>
        <p className="text-white/50 text-sm max-w-sm mx-auto">
          Ouvrez un compte partenaire et investissez dans les oeuvres que vous croyez prometteuses.
        </p>
      </div>

      <div className="space-y-4 mb-10">
        {BENEFITS.map((benefit) => {
          const Icon = benefit.icon;
          return (
            <div
              key={benefit.title}
              className="flex items-start gap-4 p-4 rounded-xl border border-white/8 bg-white/2 hover:border-[#C9A84C]/15 transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-[#C9A84C]/10 flex items-center justify-center shrink-0">
                <Icon className="size-5 text-[#C9A84C]" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">{benefit.title}</h3>
                <p className="text-xs text-white/40 mt-0.5">{benefit.description}</p>
              </div>
            </div>
          );
        })}
      </div>

      <Button
        size="lg"
        className="w-full gap-2"
        onClick={() => setStep("form")}
      >
        Commencer
        <ArrowRight className="size-4" />
      </Button>
    </div>
  );
}
