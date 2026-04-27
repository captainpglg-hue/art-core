"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, Mail, ArrowRight } from "lucide-react";

export default function SignupPage() {
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    pseudo: "",
    phone: "",
  });
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update(field: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/magic-link/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email.trim(),
          intent: "signup",
          signup_data: {
            first_name: form.first_name.trim(),
            last_name: form.last_name.trim(),
            pseudo: form.pseudo.trim().toLowerCase().replace(/[^a-z0-9_]/g, ""),
            phone: form.phone.trim(),
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Inscription impossible");
      setSent(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center mx-auto mb-6">
            <Mail className="size-8 text-[#D4AF37]" />
          </div>
          <h1 className="font-playfair text-2xl font-semibold text-white mb-3">
            Verifie ta boite mail
          </h1>
          <p className="text-white/50 text-sm mb-2">
            On vient d&apos;envoyer un lien de validation a{" "}
            <span className="text-white font-medium">{form.email}</span>.
          </p>
          <p className="text-white/30 text-xs mb-8">
            Clique sur le lien pour finaliser ton inscription. Valable 15 minutes. Pense aux spams.
          </p>
          <Link href="/" className="text-sm text-[#D4AF37] hover:underline">Retour a l&apos;accueil</Link>
        </div>
      </div>
    );
  }

  const isValid = form.first_name && form.last_name && form.email && form.pseudo;

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <h1 className="font-playfair text-2xl font-semibold text-white mb-2">Creer un compte</h1>
        <p className="text-white/50 text-sm mb-6">
          Cinq champs et c&apos;est parti. On t&apos;envoie un lien d&apos;activation par email.
        </p>

        {error && (
          <div className="mb-4 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-white/60 mb-1.5">Prenom *</label>
              <input
                type="text"
                required
                autoComplete="given-name"
                value={form.first_name}
                onChange={(e) => update("first_name", e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-[#D4AF37]/50"
              />
            </div>
            <div>
              <label className="block text-xs text-white/60 mb-1.5">Nom *</label>
              <input
                type="text"
                required
                autoComplete="family-name"
                value={form.last_name}
                onChange={(e) => update("last_name", e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-[#D4AF37]/50"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-white/60 mb-1.5">Email *</label>
            <input
              type="email"
              required
              autoComplete="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              placeholder="ton@email.com"
              className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/20 focus:outline-none focus:border-[#D4AF37]/50"
            />
          </div>

          <div>
            <label className="block text-xs text-white/60 mb-1.5">Pseudo *</label>
            <input
              type="text"
              required
              value={form.pseudo}
              onChange={(e) => update("pseudo", e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
              placeholder="ex: marie_dubois"
              className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/20 focus:outline-none focus:border-[#D4AF37]/50"
            />
            <p className="text-[10px] text-white/30 mt-1">Visible sur tes oeuvres. Lettres, chiffres et underscore uniquement.</p>
          </div>

          <div>
            <label className="block text-xs text-white/60 mb-1.5">Telephone</label>
            <input
              type="tel"
              autoComplete="tel"
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
              placeholder="06 12 34 56 78"
              className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-white/20 focus:outline-none focus:border-[#D4AF37]/50"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !isValid}
            className="w-full py-3 rounded-xl bg-[#D4AF37] text-black font-semibold disabled:opacity-30 flex items-center justify-center gap-2 mt-2"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
            {loading ? "Envoi..." : "Recevoir mon lien d'activation"}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-white/5 text-center">
          <p className="text-xs text-white/40">
            Deja un compte ?{" "}
            <Link href="/auth/login" className="text-[#D4AF37] hover:underline">Me connecter</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
