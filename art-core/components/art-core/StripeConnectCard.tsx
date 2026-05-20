"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, AlertCircle, ExternalLink, Loader2 } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// <StripeConnectCard /> — onboarding vendeur pour recevoir les paiements.
//
// Affiche l'état du compte Stripe Connect (`/api/stripe/connect/status`) et
// permet de démarrer ou reprendre l'onboarding (`/api/stripe/connect/start`).
// Tant que `can_receive_payments` est faux, la plateforme encaisse en direct
// (mode simple) ; une fois activé, /api/purchase bascule sur le split auto.
// ─────────────────────────────────────────────────────────────────────────────

type Status = {
  configured: boolean;
  account_id: string | null;
  charges_enabled?: boolean;
  payouts_enabled?: boolean;
  details_submitted?: boolean;
  requirements_due?: string[];
  can_receive_payments: boolean;
};

export default function StripeConnectCard() {
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const ctrl = new AbortController();
      const to = setTimeout(() => ctrl.abort(), 8000);
      const r = await fetch("/api/stripe/connect/status", { signal: ctrl.signal, cache: "no-store" });
      clearTimeout(to);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = (await r.json()) as Status;
      setStatus(data);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const startOnboarding = useCallback(async () => {
    setStarting(true);
    setError(null);
    try {
      const r = await fetch("/api/stripe/connect/start", { method: "POST" });
      if (!r.ok) {
        const j = (await r.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error || `HTTP ${r.status}`);
      }
      const { url } = (await r.json()) as { url: string };
      window.location.href = url;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      setStarting(false);
    }
  }, []);

  if (loading) {
    return (
      <div className="rounded-2xl bg-white/3 border border-white/5 p-6 mb-8 flex items-center gap-3 text-white/40">
        <Loader2 className="size-4 animate-spin" />
        <span className="text-sm">Chargement du statut Stripe…</span>
      </div>
    );
  }

  if (!status?.configured) {
    return (
      <div className="rounded-2xl bg-white/3 border border-white/5 p-6 mb-8">
        <p className="text-sm text-white/40">Paiements vendeur indisponibles (Stripe non configuré côté plateforme).</p>
      </div>
    );
  }

  if (status.can_receive_payments) {
    return (
      <div className="rounded-2xl bg-green-500/5 border border-green-500/20 p-6 mb-8">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="size-5 text-green-400 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-white font-semibold mb-1">Paiements vendeur activés</h3>
            <p className="text-sm text-white/50">
              Tu peux recevoir les paiements de tes ventes directement sur ton compte bancaire.
              Le split (75% vendeur / 20% plateforme / 5% Initiés) est automatique.
            </p>
            {status.account_id && (
              <p className="text-[11px] text-white/30 mt-2 font-mono">{status.account_id}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  const needsAction = status.details_submitted ? "Compléter les informations Stripe" : "Activer les paiements vendeur";
  const pending = (status.requirements_due ?? []).length;

  return (
    <div className="rounded-2xl bg-gradient-to-br from-gold/10 to-gold/5 border border-gold/20 p-6 mb-8">
      <div className="flex items-start gap-3">
        <AlertCircle className="size-5 text-gold mt-0.5" />
        <div className="flex-1">
          <h3 className="text-white font-semibold mb-1">{needsAction}</h3>
          <p className="text-sm text-white/50 mb-4">
            Pour recevoir directement les paiements de tes ventes, complète l'onboarding Stripe (KYC, RIB, etc.).
            Sans cette étape, la plateforme encaisse à ta place et te reverse ensuite.
          </p>
          {pending > 0 && (
            <p className="text-[11px] text-white/40 mb-3">
              {pending} information{pending > 1 ? "s" : ""} à compléter côté Stripe
            </p>
          )}
          {error && (
            <p className="text-xs text-red-400 mb-3">{error}</p>
          )}
          <button
            type="button"
            onClick={startOnboarding}
            disabled={starting}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gold text-black text-sm font-semibold hover:bg-gold/90 disabled:opacity-50 disabled:cursor-wait"
          >
            {starting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Redirection…
              </>
            ) : (
              <>
                <ExternalLink className="size-4" />
                {status.account_id ? "Reprendre l'onboarding" : "Configurer mon compte vendeur"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
