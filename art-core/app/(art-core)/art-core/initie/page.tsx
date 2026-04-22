"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Coins, Shield, TrendingUp, Users, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

export default function InitiePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSignup() {
    setLoading(true);
    try {
      const res = await fetch("/api/initie/signup", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: "Bienvenue Initié !", description: "Vous avez reçu 15 points de bienvenue." });
      router.push("/art-core/wallet");
      router.refresh();
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally { setLoading(false); }
  }

  const BENEFITS = [
    { icon: Coins, title: "15 pts de bienvenue", desc: "Offerts à l'ouverture de votre compte bancaire partenaire" },
    { icon: TrendingUp, title: "Investissez sur les oeuvres", desc: "Déposez vos points sur les jauges pour soutenir les artistes" },
    { icon: Shield, title: "Commissions garanties", desc: "Quand la jauge est pleine et l'oeuvre vendue, recevez votre part" },
    { icon: Users, title: "Communauté d'experts", desc: "Rejoignez les initiés qui façonnent le marché de l'art" },
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="text-center mb-12">
        <div className="w-16 h-16 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center mx-auto mb-6">
          <Coins className="size-8 text-gold" />
        </div>
        <h1 className="font-playfair text-3xl font-semibold text-white mb-3">Devenir Initié</h1>
        <p className="text-white/50 max-w-md mx-auto">
          En ouvrant un compte bancaire partenaire, la banque verse 80€ à ART-CORE Solutions.
          Nous vous reversons <span className="text-gold font-semibold">15 points</span> pour démarrer.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        {BENEFITS.map((b) => {
          const Icon = b.icon;
          return (
            <div key={b.title} className="p-5 rounded-2xl bg-white/3 border border-white/8 space-y-2">
              <Icon className="size-6 text-gold" />
              <h3 className="text-sm font-semibold text-white">{b.title}</h3>
              <p className="text-xs text-white/40">{b.desc}</p>
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl border border-gold/20 bg-gold/5 p-6 mb-6">
        <h3 className="font-semibold text-white mb-3">Comment ça marche ?</h3>
        <div className="space-y-3">
          {[
            "Ouvrez un compte bancaire partenaire (simulé ici)",
            "Recevez 15 pts de bienvenue instantanément",
            "Déposez vos points sur les jauges des oeuvres que vous soutenez",
            "Quand la jauge atteint 100 → vente garantie → commission pour vous !",
          ].map((step, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-gold text-black text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span>
              <p className="text-sm text-white/60">{step}</p>
            </div>
          ))}
        </div>
      </div>

      <Button size="lg" onClick={handleSignup} disabled={loading} className="w-full gap-2">
        {loading ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle className="size-4" />}
        Ouvrir mon compte partenaire et devenir Initié
      </Button>
    </div>
  );
}
