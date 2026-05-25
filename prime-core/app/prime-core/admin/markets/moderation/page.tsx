"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export const dynamic = "force-dynamic";

type PendingMarket = {
  id: string;
  question: string;
  market_type: "time" | "value";
  threshold_value?: number | null;
  threshold_days?: number | null;
  artwork_title?: string | null;
  proposer_username?: string | null;
  created_at?: string;
};

export default function ModerationPage() {
  const router = useRouter();
  const [markets, setMarkets] = useState<PendingMarket[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setErr(null);
    try {
      const r = await fetch("/api/admin/markets/pending", { cache: "no-store" });
      if (r.status === 401 || r.status === 403) {
        router.push("/prime-core/auth/login?next=/prime-core/admin/markets/moderation");
        return;
      }
      const j = await r.json();
      setMarkets(Array.isArray(j.markets) ? j.markets : []);
    } catch (e: any) {
      setErr(e?.message || "Erreur réseau");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { void load(); }, [load]);

  async function decide(id: string, decision: "approved" | "rejected") {
    setActing(id);
    try {
      const r = await fetch(`/api/admin/markets/${encodeURIComponent(id)}/moderate`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        setErr(j?.error || `Erreur ${r.status}`);
        return;
      }
      setMarkets((m) => m.filter((x) => x.id !== id));
    } finally {
      setActing(null);
    }
  }

  return (
    <main className="min-h-screen bg-[#0A1128] text-white px-4 py-10">
      <div className="max-w-3xl mx-auto">
        <Link href="/prime-core/dashboard" className="text-[#D4AF37] text-sm hover:underline">
          ← Dashboard
        </Link>
        <h1 className="text-3xl font-bold text-[#D4AF37] mt-2 mb-6">
          Modération — marchés en attente
        </h1>
        {loading && <p className="text-white/60">Chargement…</p>}
        {err && <p className="text-red-400" role="alert">{err}</p>}
        {!loading && markets.length === 0 && !err && (
          <p className="text-white/60">Aucun marché en attente.</p>
        )}
        <ul className="space-y-4">
          {markets.map((m) => (
            <li key={m.id} className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p className="text-white font-semibold">{m.question}</p>
                  <p className="text-white/50 text-sm mt-1">
                    {m.market_type === "value"
                      ? `Seuil : ${m.threshold_value} €`
                      : `Délai : ${m.threshold_days} jours`}
                  </p>
                  <p className="text-white/40 text-xs mt-1">
                    Œuvre : {m.artwork_title || m.id}
                    {m.proposer_username && ` · proposé par @${m.proposer_username}`}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => decide(m.id, "approved")}
                    disabled={acting === m.id}
                    className="px-3 py-1.5 bg-[#D4AF37] text-[#0A1128] font-bold rounded-lg hover:bg-[#C9A84C] disabled:opacity-50 text-sm"
                  >
                    Approuver
                  </button>
                  <button
                    onClick={() => decide(m.id, "rejected")}
                    disabled={acting === m.id}
                    className="px-3 py-1.5 bg-white/10 text-white rounded-lg hover:bg-white/20 disabled:opacity-50 text-sm"
                  >
                    Rejeter
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
