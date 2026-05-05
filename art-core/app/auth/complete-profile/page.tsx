"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ArrowRight } from "lucide-react";

export default function CompleteProfilePage() {
  const router = useRouter();
  const [next, setNext] = useState("/art-core");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pseudo, setPseudo] = useState("");
  const [phone, setPhone] = useState("");
  const [fullName, setFullName] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const n = params.get("next");
    if (n && n.startsWith("/")) setNext(n);

    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (!data.user) {
          router.replace("/auth/login");
          return;
        }
        // si l'utilisateur a déjà un pseudo "réel" (pas de placeholder g_xxx),
        // on file directement à destination — pas de complétion à faire
        const u = data.user;
        if (u.username && !/^g_[0-9a-f]{8}$/.test(u.username)) {
          router.replace(n && n.startsWith("/") ? n : "/art-core");
          return;
        }
        setFullName(u.name || "");
        setLoading(false);
      })
      .catch(() => {
        router.replace("/auth/login");
      });
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/complete-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: pseudo.trim().toLowerCase().replace(/[^a-z0-9_]/g, ""),
          phone: phone.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Enregistrement impossible");
      router.replace(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 className="size-6 animate-spin text-white/40" />
      </div>
    );
  }

  const isValid = pseudo.length >= 3;

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <h1 className="font-playfair text-2xl font-semibold text-white mb-2">
          Finalise ton profil
        </h1>
        <p className="text-white/50 text-sm mb-6">
          {fullName ? `Bienvenue ${fullName}. ` : ""}
          Choisis ton pseudo (visible sur tes œuvres). Le téléphone est optionnel.
        </p>

        {error && (
          <div className="mb-4 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-white/60 mb-1.5">Pseudo *</label>
            <input
              type="text"
              required
              autoFocus
              autoComplete="username"
              value={pseudo}
              onChange={(e) => setPseudo(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
              placeholder="ex: marie_dubois"
              minLength={3}
              maxLength={24}
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/20 focus:outline-none focus:border-[#D4AF37]/50"
            />
            <p className="text-[10px] text-white/30 mt-1">
              Lettres, chiffres et underscore uniquement. 3 caractères minimum.
            </p>
          </div>

          <div>
            <label className="block text-xs text-white/60 mb-1.5">Téléphone</label>
            <input
              type="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="06 12 34 56 78"
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/20 focus:outline-none focus:border-[#D4AF37]/50"
            />
          </div>

          <button
            type="submit"
            disabled={submitting || !isValid}
            className="w-full py-3 rounded-xl bg-[#D4AF37] text-black font-semibold disabled:opacity-30 flex items-center justify-center gap-2"
          >
            {submitting ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
            {submitting ? "Enregistrement…" : "Continuer"}
          </button>
        </form>
      </div>
    </div>
  );
}
