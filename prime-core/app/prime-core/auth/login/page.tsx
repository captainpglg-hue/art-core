"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  const router = useRouter();
  // Évite useSearchParams : interdit par CLAUDE.md (fallback Suspense fige le rendu).
  const [next, setNext] = useState("/prime-core/dashboard");
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const n = sp.get("next");
    if (n && n.startsWith("/")) setNext(n);
  }, []);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const r = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setErr(j?.error || `Erreur ${r.status}`);
        return;
      }
      router.push(next);
      router.refresh();
    } catch (e: any) {
      setErr(e?.message || "Erreur réseau");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#0A1128] text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white/5 border border-white/10 rounded-2xl p-8">
        <h1 className="text-3xl font-bold text-[#D4AF37] mb-2">Connexion</h1>
        <p className="text-white/60 mb-6">PRIME-CORE — paris & wallet</p>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-white/70 mb-1">Email</label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 bg-[#0A1128] border border-white/20 rounded-lg focus:border-[#D4AF37] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-white/70 mb-1">Mot de passe</label>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 bg-[#0A1128] border border-white/20 rounded-lg focus:border-[#D4AF37] focus:outline-none"
            />
          </div>
          {err && (
            <p className="text-red-400 text-sm" role="alert">{err}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-[#D4AF37] text-[#0A1128] font-bold rounded-lg hover:bg-[#C9A84C] disabled:opacity-50"
          >
            {loading ? "Connexion…" : "Se connecter"}
          </button>
        </form>
        <p className="mt-6 text-sm text-white/60 text-center">
          Pas de compte ?{" "}
          <Link href="/prime-core/auth/signup" className="text-[#D4AF37] hover:underline">
            Créer un compte
          </Link>
        </p>
      </div>
    </main>
  );
}
