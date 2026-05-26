"use client";

import { useState } from "react";

export const dynamic = "force-dynamic";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setOk(false); setLoading(true);
    try {
      const r = await fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, email, subject, message, website }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setErr(j?.error || `Erreur ${r.status}`);
        return;
      }
      setOk(true);
      setName(""); setEmail(""); setSubject(""); setMessage("");
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Erreur réseau");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="font-playfair text-3xl text-white mb-2">Nous contacter</h1>
      <p className="text-white/50 text-sm mb-8">
        Question, signalement, demande commerciale. Réponse sous 48h ouvrées.
      </p>
      <form onSubmit={onSubmit} className="space-y-4">
        <input
          type="text"
          name="website"
          autoComplete="off"
          tabIndex={-1}
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          className="hidden"
          aria-hidden
        />
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-white/70 mb-1">Nom</label>
            <input
              required
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:border-gold/40 focus:outline-none text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-white/70 mb-1">Email</label>
            <input
              required
              type="email"
              maxLength={200}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:border-gold/40 focus:outline-none text-white"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm text-white/70 mb-1">Sujet</label>
          <input
            required
            maxLength={200}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:border-gold/40 focus:outline-none text-white"
          />
        </div>
        <div>
          <label className="block text-sm text-white/70 mb-1">Message</label>
          <textarea
            required
            rows={7}
            minLength={10}
            maxLength={5000}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:border-gold/40 focus:outline-none text-white"
          />
          <p className="text-xs text-white/40 mt-1">{message.length} / 5000</p>
        </div>
        {err && <p className="text-red-400 text-sm" role="alert">{err}</p>}
        {ok && (
          <p className="text-green-400 text-sm" role="status">
            Message envoyé. Nous revenons vers vous rapidement.
          </p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="px-5 py-2.5 bg-gold text-black font-semibold rounded-lg hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Envoi…" : "Envoyer"}
        </button>
      </form>
    </main>
  );
}
