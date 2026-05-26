import Link from "next/link";
import { Check } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Tarifs",
  description: "Tarifs PRIME-CORE — paris prédictifs sur le marché de l'art.",
};

export default function PricingPage() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      <header className="text-center mb-12">
        <h1 className="text-4xl font-bold text-white mb-3">Tarifs</h1>
        <p className="text-white/60 max-w-2xl mx-auto">
          Accès gratuit en lecture. Pass Magnat pour parier et accéder aux fonctionnalités avancées.
        </p>
      </header>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="rounded-2xl p-6 border border-white/10 bg-white/5">
          <h3 className="text-white font-semibold text-lg">Visiteur</h3>
          <div className="mt-2 mb-4 flex items-baseline gap-1">
            <span className="text-3xl text-white font-bold">0 €</span>
          </div>
          <p className="text-white/60 text-sm mb-5">
            Consultez les marchés et le leaderboard sans inscription.
          </p>
          <ul className="space-y-2 mb-6">
            {[
              "Dashboard des marchés ouverts",
              "Leaderboard anonyme",
              "Lecture des paris en cours",
            ].map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-white/80">
                <Check className="size-4 text-[#D4AF37] shrink-0 mt-0.5" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
          <Link
            href="/prime-core/dashboard"
            className="block w-full text-center py-2 rounded-lg border border-white/20 text-white hover:bg-white/5 font-medium"
          >
            Voir le dashboard
          </Link>
        </div>

        <div className="rounded-2xl p-6 border border-[#D4AF37]/40 bg-[#D4AF37]/5">
          <h3 className="text-white font-semibold text-lg">Pass Magnat</h3>
          <div className="mt-2 mb-4 flex items-baseline gap-1">
            <span className="text-3xl text-white font-bold">9,90 €</span>
            <span className="text-white/50 text-sm">/mois</span>
          </div>
          <p className="text-white/60 text-sm mb-5">
            Pariez, proposez des marchés, gagnez des commissions.
          </p>
          <ul className="space-y-2 mb-6">
            {[
              "Placement de paris sur tous les marchés",
              "Proposer vos propres marchés prédictifs",
              "Statut « Initié » visible publiquement",
              "Commissions sur les paris de vos filleuls",
              "Notifications anticipées",
              "Résiliable à tout moment",
            ].map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-white/80">
                <Check className="size-4 text-[#D4AF37] shrink-0 mt-0.5" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
          <Link
            href="/prime-core/auth/signup"
            className="block w-full text-center py-2 rounded-lg bg-[#D4AF37] text-[#0A1128] hover:opacity-90 font-bold"
          >
            Souscrire
          </Link>
        </div>
      </div>

      <p className="text-white/40 text-xs pt-12 mt-8 border-t border-white/10 max-w-2xl mx-auto text-center">
        Tarifs hors taxes. Les paris prédictifs sont des jeux d&apos;agrément à
        usage personnel ; toute exploitation commerciale doit être déclarée. Tarifs
        susceptibles d&apos;évoluer ; toute modification est notifiée 30 jours à
        l&apos;avance aux abonnés actifs.
      </p>
    </main>
  );
}
