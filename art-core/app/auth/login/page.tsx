"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Mail, ArrowRight } from "lucide-react";

const ERROR_MESSAGES: Record<string, string> = {
  missing_token: "Le lien est incomplet. Redemande un nouveau lien.",
  invalid_or_expired: "Ce lien a expire ou a deja ete utilise. Redemande un nouveau lien.",
  no_account: "Aucun compte trouve pour cette adresse. Cree un compte d'abord.",
  user_resolution_failed: "Impossible de retrouver le compte. Reessaye.",
  user_creation_failed: "Creation du compte impossible. Reessaye.",
  pseudo_taken: "Ce pseudo est deja pris. Recommence l'inscription.",
};

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // useSearchParams() impose un <Suspense> englobant et fait planter le rendu si
  // ce wrapper bloque (cas vu en prod : fallback "Chargement..." figé). On lit
  // window.location.search côté client, sans Suspense.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const initialError = params.get("error");
    if (initialError) {
      setErrorBanner(ERROR_MESSAGES[initialError] || "Une erreur est survenue.");
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/magic-link/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, intent: "login" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Envoi impossible");
      setSent(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {sent ? (
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center mx-auto mb-6">
              <Mail className="size-8 text-[#D4AF37]" />
            </div>
            <h1 className="font-playfair text-2xl font-semibold text-white mb-3">Verifie ta boite mail</h1>
            <p className="text-white/50 text-sm mb-2">
              Si un compte existe pour <span className="text-white font-medium">{email}</span>, tu vas recevoir un lien de connexion dans quelques secondes.
            </p>
            <p className="text-white/30 text-xs mb-8">
              Pense a verifier les spams. Le lien est valable 15 minutes.
            </p>
            <button
              onClick={() => { setSent(false); setEmail(""); }}
              className="text-sm text-[#D4AF37] hover:underline"
            >
              Utiliser une autre adresse
            </button>
          </div>
        ) : (
          <>
            <h1 className="font-playfair text-2xl font-semibold text-white mb-2">Me connecter</h1>
            <p className="text-white/50 text-sm mb-6">
              On t&apos;envoie un lien de connexion par email. Pas de mot de passe a retenir.
            </p>

            {errorBanner && (
              <div className="mb-4 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
                {errorBanner}
              </div>
            )}
            {error && (
              <div className="mb-4 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs text-white/60 mb-1.5">Adresse email</label>
                <input
                  type="email"
                  required
                  autoFocus
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ton@email.com"
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/20 focus:outline-none focus:border-[#D4AF37]/50"
                />
              </div>
              <button
                type="submit"
                disabled={loading || !email}
                className="w-full py-3 rounded-xl bg-[#D4AF37] text-black font-semibold disabled:opacity-30 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
                {loading ? "Envoi..." : "Recevoir mon lien"}
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-white/5 text-center">
              <p className="text-xs text-white/40">
                Pas encore de compte ?{" "}
                <Link href="/auth/signup" className="text-[#D4AF37] hover:underline">Creer un compte</Link>
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
