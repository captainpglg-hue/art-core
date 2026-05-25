"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export const dynamic = "force-dynamic";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const r = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, username, password }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setErr(j?.error || `Erreur ${r.status}`);
        return;
      }
      router.push("/prime-core/dashboard");
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
        <h1 className="text-3xl font-bold text-[#D4AF37] mb-2">Créer un compte</h1>
        <p className="text-white/60 mb-6">
          Username anonyme pour les paris. Aucun lien public avec ton identité art-core.
        </p>
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
            <p className="text-xs text-white/40 mt-1">
              Non visible publiquement. Sert à récupérer ton compte.
            </p>
          </div>
          <div>
            <label className="block text-sm text-white/70 mb-1">Username</label>
            <input
              type="text"
              required
              minLength={3}
              maxLength={24}
              pattern="[a-z0-9_-]+"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              className="w-full px-3 py-2 bg-[#0A1128] border border-white/20 rounded-lg focus:border-[#D4AF37] focus:outline-none"
            />
            <p className="text-xs text-white/40 mt-1">
              3-24 caractères, [a-z0-9_-]. Visible sur le leaderboard.
            </p>
          </div>
          <div>
            <label className="block text-sm text-white/70 mb-1">Mot de passe</label>
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 bg-[#0A1128] border border-white/20 rounded-lg focus:border-[#D4AF37] focus:outline-none"
            />
            <p className="text-xs text-white/40 mt-1">8 caractères minimum.</p>
          </div>
          {err && (
            <p className="text-red-400 text-sm" role="alert">{err}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-[#D4AF37] text-[#0A1128] font-bold rounded-lg hover:bg-[#C9A84C] disabled:opacity-50"
          >
            {loading ? "Création…" : "Créer le compte"}
          </button>
        </form>
        <p className="mt-6 text-sm text-white/60 text-center">
          Déjà un compte ?{" "}
          <Link href="/prime-core/auth/login" className="text-[#D4AF37] hover:underline">
            Se connecter
          </Link>
        </p>
      </div>
    </main>
  );
}
