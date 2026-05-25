"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export const dynamic = "force-dynamic";

export default function NewMarketPage() {
  const router = useRouter();
  const [artworkId, setArtworkId] = useState("");
  const [marketType, setMarketType] = useState<"time" | "value">("time");
  const [question, setQuestion] = useState("");
  const [thresholdValue, setThresholdValue] = useState("");
  const [thresholdDays, setThresholdDays] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setOk(false); setLoading(true);
    try {
      const r = await fetch("/api/markets", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          artwork_id: artworkId,
          market_type: marketType,
          question,
          threshold_value: marketType === "value" ? Number(thresholdValue) : null,
          threshold_days: marketType === "time" ? Number(thresholdDays) : null,
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (r.status === 401) {
        router.push("/prime-core/auth/login?next=/prime-core/markets/new");
        return;
      }
      if (!r.ok) {
        setErr(j?.error || `Erreur ${r.status}`);
        return;
      }
      setOk(true);
      setQuestion("");
      setThresholdValue("");
      setThresholdDays("");
    } catch (e: any) {
      setErr(e?.message || "Erreur réseau");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#0A1128] text-white px-4 py-10">
      <div className="max-w-xl mx-auto">
        <Link href="/prime-core/dashboard" className="text-[#D4AF37] text-sm hover:underline">
          ← Dashboard
        </Link>
        <h1 className="text-3xl font-bold text-[#D4AF37] mt-2 mb-2">Proposer un marché</h1>
        <p className="text-white/60 mb-6">
          Ta proposition sera examinée par un modérateur avant d&apos;être visible
          publiquement sur le dashboard.
        </p>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-white/70 mb-1">
              ID de l&apos;œuvre (UUID)
            </label>
            <input
              type="text"
              required
              value={artworkId}
              onChange={(e) => setArtworkId(e.target.value.trim())}
              placeholder="ex: 7d2b8f1a-…"
              className="w-full px-3 py-2 bg-[#0A1128] border border-white/20 rounded-lg focus:border-[#D4AF37] focus:outline-none font-mono text-sm"
            />
            <p className="text-xs text-white/40 mt-1">
              Visible dans l&apos;URL de la page art-core de l&apos;œuvre.
            </p>
          </div>
          <div>
            <label className="block text-sm text-white/70 mb-1">Type de pari</label>
            <select
              value={marketType}
              onChange={(e) => setMarketType(e.target.value as "time" | "value")}
              className="w-full px-3 py-2 bg-[#0A1128] border border-white/20 rounded-lg focus:border-[#D4AF37] focus:outline-none"
            >
              <option value="time">Sur le temps (l&apos;œuvre sera-t-elle vendue avant X jours ?)</option>
              <option value="value">Sur la valeur (dépassera-t-elle X € ?)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-white/70 mb-1">Question (8-280 caractères)</label>
            <textarea
              required
              minLength={8}
              maxLength={280}
              rows={3}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="ex: Cette céramique sera-t-elle vendue avant 30 jours ?"
              className="w-full px-3 py-2 bg-[#0A1128] border border-white/20 rounded-lg focus:border-[#D4AF37] focus:outline-none"
            />
            <p className="text-xs text-white/40 mt-1">{question.length} / 280</p>
          </div>
          {marketType === "value" && (
            <div>
              <label className="block text-sm text-white/70 mb-1">Seuil (€)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={thresholdValue}
                onChange={(e) => setThresholdValue(e.target.value)}
                className="w-full px-3 py-2 bg-[#0A1128] border border-white/20 rounded-lg focus:border-[#D4AF37] focus:outline-none"
              />
            </div>
          )}
          {marketType === "time" && (
            <div>
              <label className="block text-sm text-white/70 mb-1">Délai (jours)</label>
              <input
                type="number"
                min="1"
                step="1"
                required
                value={thresholdDays}
                onChange={(e) => setThresholdDays(e.target.value)}
                className="w-full px-3 py-2 bg-[#0A1128] border border-white/20 rounded-lg focus:border-[#D4AF37] focus:outline-none"
              />
            </div>
          )}
          {err && <p className="text-red-400 text-sm" role="alert">{err}</p>}
          {ok && (
            <p className="text-green-400 text-sm" role="status">
              Proposition envoyée ! En attente de modération.
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-[#D4AF37] text-[#0A1128] font-bold rounded-lg hover:bg-[#C9A84C] disabled:opacity-50"
          >
            {loading ? "Envoi…" : "Proposer le marché"}
          </button>
        </form>
      </div>
    </main>
  );
}
