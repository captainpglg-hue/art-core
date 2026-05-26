"use client";

import { useEffect, useState } from "react";

export const dynamic = "force-dynamic";

type Probe = {
  name: string;
  url: string;
  status: "checking" | "up" | "down";
  latencyMs?: number;
  code?: number;
};

const TARGETS: Pick<Probe, "name" | "url">[] = [
  { name: "art-core", url: "https://art-core.app" },
  { name: "pass-core", url: "https://pass-core.app" },
  { name: "prime-core", url: "https://prime-core.app" },
];

export default function StatusPage() {
  const [probes, setProbes] = useState<Probe[]>(
    TARGETS.map((t) => ({ ...t, status: "checking" as const })),
  );

  useEffect(() => {
    let cancelled = false;
    async function run() {
      const next: Probe[] = await Promise.all(
        TARGETS.map(async (t) => {
          const t0 = Date.now();
          try {
            const r = await fetch(t.url, { mode: "no-cors", cache: "no-store" });
            // mode no-cors → status est 0 ; on considère up si pas d'exception
            return {
              ...t,
              status: "up" as const,
              latencyMs: Date.now() - t0,
              code: r.status || undefined,
            };
          } catch {
            return { ...t, status: "down" as const, latencyMs: Date.now() - t0 };
          }
        }),
      );
      if (!cancelled) setProbes(next);
    }
    void run();
    const id = setInterval(run, 30000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  const overall = probes.every((p) => p.status === "up")
    ? "Tous les services fonctionnent"
    : probes.some((p) => p.status === "down")
      ? "Incident en cours"
      : "Vérification…";

  return (
    <main className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="font-playfair text-3xl text-white mb-2">État des services</h1>
      <p className="text-white/50 text-sm mb-8">
        Sonde toutes les 30 secondes depuis votre navigateur. Pour un monitoring
        externe officiel, voir{" "}
        <a href="https://uptimerobot.com" target="_blank" rel="noreferrer" className="underline">
          UptimeRobot
        </a>
        .
      </p>

      <div className="mb-8 p-4 rounded-xl bg-white/5 border border-white/10">
        <p className="text-lg text-white">{overall}</p>
      </div>

      <ul className="space-y-3">
        {probes.map((p) => {
          const color =
            p.status === "up" ? "text-green-400"
            : p.status === "down" ? "text-red-400"
            : "text-white/50";
          const label =
            p.status === "up" ? "Opérationnel"
            : p.status === "down" ? "Indisponible"
            : "Vérification…";
          return (
            <li
              key={p.name}
              className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10"
            >
              <div>
                <p className="text-white font-medium">{p.name}.app</p>
                <p className="text-white/40 text-xs">{p.url}</p>
              </div>
              <div className="text-right">
                <p className={`font-semibold ${color}`}>{label}</p>
                {typeof p.latencyMs === "number" && (
                  <p className="text-white/40 text-xs">{p.latencyMs} ms</p>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
