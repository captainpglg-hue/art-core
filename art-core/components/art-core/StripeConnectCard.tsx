"use client";

import { useEffect, useState } from "react";
import { CreditCard, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

type Status = {
  connected: boolean;
  charges_enabled?: boolean;
  payouts_enabled?: boolean;
  details_submitted?: boolean;
  requirements_due?: string[];
  account_id?: string;
  error?: string;
};

export default function StripeConnectCard() {
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/stripe/connect/status")
      .then((r) => r.json())
      .then((d) => { if (!alive) return; setStatus(d); if (d.error) setErr(d.error); })
      .catch(() => alive && setErr("Impossible de joindre Stripe"))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, []);

  const startOnboarding = async () => {
    setStarting(true); setErr(null);
    try {
      const r = await fetch("/api/stripe/connect/start", { method: "POST" });
      const d = await r.json();
      if (!r.ok || !d.url) { setErr(d.error || "Impossible d initier l onboarding."); setStarting(false); return; }
      window.location.href = d.url;
    } catch { setErr("Erreur reseau."); setStarting(false); }
  };

  if (loading) return (<div className="rounded-2xl bg-[#151515] border border-white/5 p-6 mb-8 flex items-center gap-3 text-white/40"><Loader2 className="size-4 animate-spin" /><span className="text-sm">Verification Stripe...</span></div>);

  if (status?.connected && status.charges_enabled && status.payouts_enabled) return (<div className="rounded-2xl bg-green-500/5 border border-green-500/15 p-4 mb-8 flex items-center gap-3"><CheckCircle2 className="size-5 text-green-400" /><div className="flex-1"><p className="text-sm text-white/80">Virements Stripe actives</p><p className="text-[11px] text-white/40">Tes ventes sont reversees automatiquement (hebdomadaire).</p></div></div>);

  if (status?.connected && !status.details_submitted) return (<div className="rounded-2xl bg-amber-500/5 border border-amber-500/20 p-5 mb-8"><div className="flex items-start gap-3"><AlertCircle className="size-5 text-amber-400 mt-0.5" /><div className="flex-1"><p className="text-white font-semibold">Onboarding Stripe a finaliser</p><p className="text-sm text-white/50 mt-1">Ton compte Stripe est cree mais le formulaire n est pas complet. Termine-le pour pouvoir recevoir tes ventes.</p>{err && <p className="text-xs text-red-400 mt-2">{err}</p>}<button onClick={startOnboarding} disabled={starting} className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gold text-black text-sm font-semibold hover:bg-gold/90 transition disabled:opacity-50">{starting ? (<><Loader2 className="size-4 animate-spin" />Redirection...</>) : (<><CreditCard className="size-4" />Reprendre l onboarding</>)}</button></div></div></div>);

  if (status?.connected && status.details_submitted && (!status.charges_enabled || !status.payouts_enabled)) return (<div className="rounded-2xl bg-blue-500/5 border border-blue-500/20 p-5 mb-8"><div className="flex items-start gap-3"><Loader2 className="size-5 text-blue-400 mt-0.5 animate-spin" /><div className="flex-1"><p className="text-white font-semibold">Verification Stripe en cours</p><p className="text-sm text-white/50 mt-1">Stripe verifie tes informations. Tu pourras recevoir tes ventes des que ce sera valide.</p>{(status.requirements_due?.length ?? 0) > 0 && (<p className="text-xs text-white/40 mt-2">Champs encore demandes : {status.requirements_due!.join(", ")}</p>)}</div></div></div>);

  return (<div className="rounded-2xl bg-gradient-to-br from-gold/10 to-transparent border border-gold/20 p-5 mb-8"><div className="flex items-start gap-3"><CreditCard className="size-5 text-gold mt-0.5" /><div className="flex-1"><p className="text-white font-semibold">Active les virements automatiques</p><p className="text-sm text-white/50 mt-1">Pour recevoir tes ventes directement sur ton compte bancaire, connecte un compte Stripe (gratuit, ~3 min).</p>{err && <p className="text-xs text-red-400 mt-2">{err}</p>}<button onClick={startOnboarding} disabled={starting} className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gold text-black text-sm font-semibold hover:bg-gold/90 transition disabled:opacity-50">{starting ? (<><Loader2 className="size-4 animate-spin" />Redirection...</>) : (<><CreditCard className="size-4" />Connecter Stripe</>)}</button></div></div></div>);
}
