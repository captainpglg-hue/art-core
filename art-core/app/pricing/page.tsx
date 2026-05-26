import Link from "next/link";
import { Check } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Tarifs",
  description: "Tarifs et commissions ART-CORE — marketplace d'art certifiée.",
};

type Tier = {
  name: string;
  price: string;
  period?: string;
  description: string;
  features: string[];
  cta: { label: string; href: string };
  highlight?: boolean;
};

const TIERS: Tier[] = [
  {
    name: "Artiste",
    price: "0 €",
    period: "à vie",
    description: "Vendez vos œuvres sur ART-CORE sans frais fixes.",
    features: [
      "Inscription gratuite",
      "Dépôt illimité d'œuvres",
      "Boost gratuit via la jauge de points",
      "Commission de 25 % uniquement sur les ventes réalisées",
      "Paiement via Stripe Connect (J+14)",
    ],
    cta: { label: "Devenir artiste", href: "/auth/signup" },
    highlight: true,
  },
  {
    name: "Pass Magnat",
    price: "9,90 €",
    period: "/mois",
    description: "Statut Initié + accès aux paris prédictifs.",
    features: [
      "Statut « Initié » visible publiquement",
      "Accès aux marchés prédictifs prime-core",
      "Programme de parrainage (70 € net + 15 € flexibles)",
      "Notifications anticipées sur les nouvelles œuvres",
    ],
    cta: { label: "Souscrire", href: "https://prime-core.app/prime-core/auth/signup" },
  },
];

export default function PricingPage() {
  return (
    <main className="max-w-5xl mx-auto px-4 py-12">
      <header className="text-center mb-12">
        <h1 className="font-playfair text-4xl text-white mb-3">Tarifs</h1>
        <p className="text-white/60 max-w-2xl mx-auto">
          Gratuit pour les artistes. Commission uniquement sur les ventes.
          Tarifs spécifiques pour les rôles propriétaires et initiés.
        </p>
      </header>

      <div className="grid md:grid-cols-2 gap-6">
        {TIERS.map((t) => (
          <div
            key={t.name}
            className={`rounded-2xl p-6 border ${
              t.highlight
                ? "border-gold/40 bg-gold/5"
                : "border-white/10 bg-white/5"
            }`}
          >
            <h3 className="text-white font-semibold text-lg">{t.name}</h3>
            <div className="mt-2 mb-4 flex items-baseline gap-1">
              <span className="text-3xl text-white font-bold">{t.price}</span>
              {t.period && <span className="text-white/50 text-sm">{t.period}</span>}
            </div>
            <p className="text-white/60 text-sm mb-5">{t.description}</p>
            <ul className="space-y-2 mb-6">
              {t.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-white/80">
                  <Check className="size-4 text-gold shrink-0 mt-0.5" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <Link
              href={t.cta.href}
              className={`block w-full text-center py-2 rounded-lg font-medium ${
                t.highlight
                  ? "bg-gold text-black hover:opacity-90"
                  : "border border-white/20 text-white hover:bg-white/5"
              }`}
            >
              {t.cta.label}
            </Link>
          </div>
        ))}
      </div>

      <section className="mt-16 space-y-4 text-white/70 text-sm">
        <h2 className="text-white text-xl font-semibold">Autres barèmes</h2>
        <ul className="space-y-2">
          <li>
            <strong className="text-white">Consultation Pass-Core</strong> — 0,50 € par
            consultation de certificat (dont 0,10 € reversés au propriétaire de l&apos;œuvre).
          </li>
          <li>
            <strong className="text-white">Pass-Core propriétaire</strong> — 49 € d&apos;activation
            + 5 €/mois. Voir{" "}
            <a href="https://pass-core.app/pricing" className="underline">pass-core.app/pricing</a>.
          </li>
          <li>
            <strong className="text-white">Parrainage</strong> — 70 € net + 15 € flexibles
            versés au parrain pour chaque filleul validé.
          </li>
        </ul>
        <p className="text-white/40 text-xs pt-6 border-t border-white/10">
          Tarifs hors taxes. TVA non applicable, art. 293 B du CGI (à confirmer selon
          le statut de l&apos;entité émettrice). Tarifs susceptibles d&apos;évoluer ; toute
          modification est notifiée 30 jours à l&apos;avance aux abonnés actifs.
        </p>
      </section>
    </main>
  );
}
