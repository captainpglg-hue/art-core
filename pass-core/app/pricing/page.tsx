import Link from "next/link";
import { Check } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Tarifs",
  description: "Tarifs PASS-CORE — certification blockchain pour œuvres d'art.",
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
    name: "Vérification",
    price: "0,50 €",
    period: "/ consultation",
    description: "Vérifier l'authenticité d'une œuvre via son hash ou sa photo macro.",
    features: [
      "Vérification SHA-256 + empreinte photo",
      "Accès au certificat blockchain Polygon",
      "0,10 € reversés au propriétaire de l'œuvre",
      "Sans abonnement",
    ],
    cta: { label: "Vérifier une œuvre", href: "/pass-core/verifier" },
  },
  {
    name: "Propriétaire",
    price: "49 €",
    period: "puis 5 €/mois",
    description: "Faites certifier vos œuvres et percevez les royalties.",
    features: [
      "49 € d'activation puis 5 €/mois",
      "Certification illimitée de vos œuvres",
      "0,10 € reçu sur chaque consultation",
      "Galerie publique sur pass-core.app/gallery",
      "Notifications sur les vérifications de vos œuvres",
    ],
    cta: { label: "Souscrire", href: "/pass-core/certifier" },
    highlight: true,
  },
];

export default function PricingPage() {
  return (
    <main className="max-w-5xl mx-auto px-4 py-12">
      <header className="text-center mb-12">
        <h1 className="font-playfair text-4xl text-white mb-3">Tarifs</h1>
        <p className="text-white/60 max-w-2xl mx-auto">
          Certification blockchain à l&apos;acte ou par abonnement propriétaire.
        </p>
      </header>

      <div className="grid md:grid-cols-2 gap-6">
        {TIERS.map((t) => (
          <div
            key={t.name}
            className={`rounded-2xl p-6 border ${
              t.highlight
                ? "border-[#D4AF37]/40 bg-[#D4AF37]/5"
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
                  <Check className="size-4 text-[#D4AF37] shrink-0 mt-0.5" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <Link
              href={t.cta.href}
              className={`block w-full text-center py-2 rounded-lg font-medium ${
                t.highlight
                  ? "bg-[#D4AF37] text-[#0A1128] hover:opacity-90"
                  : "border border-white/20 text-white hover:bg-white/5"
              }`}
            >
              {t.cta.label}
            </Link>
          </div>
        ))}
      </div>

      <p className="text-white/40 text-xs pt-12 mt-8 border-t border-white/10 max-w-2xl mx-auto text-center">
        Tarifs hors taxes. Tarifs susceptibles d&apos;évoluer ; toute modification est
        notifiée 30 jours à l&apos;avance aux abonnés actifs.
      </p>
    </main>
  );
}
