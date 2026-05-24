"use client";

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="max-w-screen-xl mx-auto px-4 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-white mb-2">Marchés Prédictifs</h1>
      <p className="text-white/40 text-sm mb-8">Pariez sur les ventes d&apos;oeuvres — les cotes évoluent avec la jauge de points.</p>
      <div className="rounded-2xl border border-white/10 bg-[#141720]/40 p-10 text-center">
        <p className="text-white/60 text-sm">Aucun marché ouvert pour le moment.</p>
        <button onClick={reset} className="mt-4 text-xs text-[#C9A84C] hover:underline">
          Réessayer
        </button>
      </div>
    </div>
  );
}
