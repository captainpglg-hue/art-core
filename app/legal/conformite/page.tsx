import type { Metadata } from "next";
import { PrintButton } from "@/components/shared/PrintButton";

export const metadata: Metadata = {
  title: "Attestation de Conformite PASS-CORE | ART-CORE",
  description:
    "Attestation de conformite reglementaire PASS-CORE — anti-blanchiment, droit de suite, metaux precieux, UNIDROIT, douanes.",
};

export default function ConformitePage() {
  return (
    <>
      {/* Print-specific styles */}
      <style>{`
        @media print {
          body { background: white !important; color: #1B2B4B !important; }
          header, footer, nav, .no-print { display: none !important; }
          .print-page { background: white !important; color: #1B2B4B !important; padding: 2rem !important; }
          .print-page h1, .print-page h2, .print-page h3 { color: #1B2B4B !important; }
          .print-page .section-card { background: #f8f6f0 !important; border-color: #B8960C !important; }
          .print-page .gold-text { color: #8B7306 !important; }
        }
      `}</style>

      <div className="print-page">
        {/* En-tete document */}
        <div className="text-center mb-12">
          <p className="text-[#B8960C] gold-text tracking-[0.3em] uppercase text-xs font-medium mb-3">
            ART-CORE GROUP LTD — Companies House UK
          </p>
          <h1
            className="text-3xl md:text-4xl font-bold mb-3 tracking-tight"
            style={{ fontFamily: "var(--font-playfair), Playfair Display, serif" }}
          >
            Attestation de Conformite
          </h1>
          <h2
            className="text-xl md:text-2xl text-[#B8960C] gold-text font-semibold mb-4"
            style={{ fontFamily: "var(--font-playfair), Playfair Display, serif" }}
          >
            Protocole PASS-CORE
          </h2>
          <div className="w-24 h-[2px] bg-[#B8960C] mx-auto mb-4" />
          <p className="text-white/40 text-sm">
            Reference : PASSCORE-CONF-2026-001 — Date : 5 avril 2026
          </p>
        </div>

        {/* Preambule */}
        <section className="mb-10">
          <div className="section-card rounded-xl bg-white/[0.03] border border-[#B8960C]/20 p-6">
            <p className="text-white/60 text-sm leading-relaxed">
              La presente attestation certifie que le protocole <strong className="text-white">PASS-CORE</strong>,
              developpe et opere par <strong className="text-white">ART-CORE GROUP LTD</strong> (immatriculee au
              Royaume-Uni — Companies House), integre les mecanismes de conformite reglementaire
              applicables au marche de l&apos;art, aux objets de collection, aux metaux precieux et aux
              biens culturels, conformement aux legislations europeennes, francaises et internationales
              en vigueur.
            </p>
          </div>
        </section>

        {/* Section I — Anti-blanchiment */}
        <Section number="I" title="Lutte contre le blanchiment et le financement du terrorisme (LCB-FT)">
          <SubSection title="Cadre reglementaire">
            <ul className="list-disc pl-5 space-y-1 text-white/50 text-sm">
              <li>Directive (UE) 2018/843 — 5e directive anti-blanchiment (AMLD5)</li>
              <li>Directive (UE) 2024/1640 — 6e directive anti-blanchiment (AMLD6)</li>
              <li>Code monetaire et financier — Art. L.561-1 et suivants</li>
              <li>Reglement (UE) 2015/847 — transferts de fonds</li>
            </ul>
          </SubSection>
          <SubSection title="Mesures implementees dans PASS-CORE">
            <ul className="list-disc pl-5 space-y-2 text-white/50 text-sm">
              <li>
                <strong className="text-white">KYC obligatoire</strong> — Verification d&apos;identite
                systematique de tout marchand ou professionnel via le module d&apos;onboarding
                (piece d&apos;identite, justificatif de domicile, numero SIRET).
              </li>
              <li>
                <strong className="text-white">Seuil de vigilance renforcee</strong> — Pour toute
                transaction superieure a 10 000 EUR, declenchement automatique d&apos;un controle
                de coherence (origine des fonds, identite du beneficiaire effectif).
              </li>
              <li>
                <strong className="text-white">Declaration de soupcon</strong> — Processus interne
                de signalement a TRACFIN (France) ou a la NCA (Royaume-Uni) en cas d&apos;operation
                suspecte detectee par le systeme ou par un operateur.
              </li>
              <li>
                <strong className="text-white">Registre des transactions</strong> — Conservation
                securisee de l&apos;ensemble des transactions pendant 5 ans minimum, conformement
                aux obligations de conservation.
              </li>
              <li>
                <strong className="text-white">Gel des avoirs</strong> — Integration des listes
                de sanctions (UE, OFAC, HM Treasury) pour le filtrage automatique des parties.
              </li>
            </ul>
          </SubSection>
        </Section>

        {/* Section II — Droit de suite */}
        <Section number="II" title="Droit de suite des artistes">
          <SubSection title="Cadre reglementaire">
            <ul className="list-disc pl-5 space-y-1 text-white/50 text-sm">
              <li>Directive 2001/84/CE — droit de suite au profit de l&apos;auteur d&apos;une oeuvre d&apos;art originale</li>
              <li>Code de la propriete intellectuelle — Art. L.122-8</li>
              <li>Artist&apos;s Resale Right Regulations 2006 (UK)</li>
            </ul>
          </SubSection>
          <SubSection title="Mesures implementees dans PASS-CORE">
            <ul className="list-disc pl-5 space-y-2 text-white/50 text-sm">
              <li>
                <strong className="text-white">Calcul automatique</strong> — Application automatique
                du droit de suite sur chaque revente d&apos;une oeuvre originale, selon le bareme
                degressif prevu par la directive (4% jusqu&apos;a 50 000 EUR, puis degressif).
              </li>
              <li>
                <strong className="text-white">Reversement trace</strong> — Chaque paiement de droit
                de suite est enregistre dans le certificat PASS-CORE de l&apos;oeuvre avec horodatage
                SHA-256 et lien vers la transaction Stripe.
              </li>
              <li>
                <strong className="text-white">Seuil minimum</strong> — Application pour toute revente
                dont le prix est egal ou superieur a 750 EUR (seuil europeen).
              </li>
              <li>
                <strong className="text-white">Notification artiste</strong> — L&apos;artiste ou ses
                ayants droit sont automatiquement notifies a chaque revente generant un droit de suite.
              </li>
            </ul>
          </SubSection>
        </Section>

        {/* Section III — Metaux precieux */}
        <Section number="III" title="Metaux precieux et pierres precieuses">
          <SubSection title="Cadre reglementaire">
            <ul className="list-disc pl-5 space-y-1 text-white/50 text-sm">
              <li>Code general des impots — Art. 150 VI et suivants (taxe forfaitaire sur les metaux precieux)</li>
              <li>Reglement (UE) 2017/821 — minerais provenant de zones de conflit</li>
              <li>Hallmarking Act 1973 (UK)</li>
              <li>Convention de Kimberley — processus de certification des diamants bruts</li>
            </ul>
          </SubSection>
          <SubSection title="Mesures implementees dans PASS-CORE">
            <ul className="list-disc pl-5 space-y-2 text-white/50 text-sm">
              <li>
                <strong className="text-white">Categorisation automatique</strong> — Detection des
                oeuvres contenant des metaux precieux (or, argent, platine) ou pierres precieuses
                lors de la certification, avec marquage specifique dans le certificat.
              </li>
              <li>
                <strong className="text-white">Taxe forfaitaire</strong> — Calcul et affichage de la
                taxe forfaitaire de 11,5% (11% + 0,5% CRDS) pour les metaux precieux, ou option pour
                le regime de plus-value reelle (36,2%).
              </li>
              <li>
                <strong className="text-white">Poincons et titres</strong> — Champ obligatoire pour
                le poincon de garantie et le titre du metal dans le formulaire de certification.
              </li>
              <li>
                <strong className="text-white">Tracabilite minerale</strong> — Engagement de conformite
                avec le reglement europeen sur les minerais de conflit pour les matieres premieres.
              </li>
            </ul>
          </SubSection>
        </Section>

        {/* Section IV — UNIDROIT */}
        <Section number="IV" title="Convention UNIDROIT — Biens culturels voles ou illicitement exportes">
          <SubSection title="Cadre reglementaire">
            <ul className="list-disc pl-5 space-y-1 text-white/50 text-sm">
              <li>Convention UNIDROIT 1995 — restitution des biens culturels voles ou illicitement exportes</li>
              <li>Convention UNESCO 1970 — mesures pour interdire l&apos;importation, l&apos;exportation et le
                transfert de propriete illicites de biens culturels</li>
              <li>Directive 2014/60/UE — restitution de biens culturels sortis illicitement du territoire</li>
              <li>Code du patrimoine — Art. L.111-1 et suivants</li>
            </ul>
          </SubSection>
          <SubSection title="Mesures implementees dans PASS-CORE">
            <ul className="list-disc pl-5 space-y-2 text-white/50 text-sm">
              <li>
                <strong className="text-white">Verification provenance</strong> — Champ obligatoire
                de provenance dans chaque certification PASS-CORE, avec historique complet des
                proprietaires connus.
              </li>
              <li>
                <strong className="text-white">Consultation bases de donnees</strong> — Engagement
                de verification systematique aupres des bases d&apos;oeuvres volees (INTERPOL,
                Art Loss Register, base Treima de l&apos;OCBC).
              </li>
              <li>
                <strong className="text-white">Due diligence renforcee</strong> — Pour toute oeuvre
                d&apos;une valeur superieure a 50 000 EUR ou datant d&apos;avant 1970, verification
                approfondie de la chaine de propriete et de la legalite de l&apos;exportation.
              </li>
              <li>
                <strong className="text-white">Clause de restitution</strong> — En cas de revendication
                legitime de restitution, gel automatique de l&apos;oeuvre sur la plateforme et cooperation
                avec les autorites competentes.
              </li>
              <li>
                <strong className="text-white">Certificat de bonne foi</strong> — Le proprietaire doit
                attester sur l&apos;honneur la legalite de l&apos;acquisition lors de chaque certification.
              </li>
            </ul>
          </SubSection>
        </Section>

        {/* Section V — Douanes */}
        <Section number="V" title="Reglementation douaniere et exportation de biens culturels">
          <SubSection title="Cadre reglementaire">
            <ul className="list-disc pl-5 space-y-1 text-white/50 text-sm">
              <li>Reglement (CE) 116/2009 — exportation de biens culturels</li>
              <li>Reglement (UE) 2019/880 — importation de biens culturels</li>
              <li>Code du patrimoine — Art. L.111-2 et L.111-4 (certificat d&apos;exportation)</li>
              <li>Export Control Act 2002 (UK) — licences d&apos;exportation</li>
              <li>Code des douanes de l&apos;Union — Reglement (UE) 952/2013</li>
            </ul>
          </SubSection>
          <SubSection title="Mesures implementees dans PASS-CORE">
            <ul className="list-disc pl-5 space-y-2 text-white/50 text-sm">
              <li>
                <strong className="text-white">Detection d&apos;export</strong> — Lorsqu&apos;une
                transaction implique un transfert transfrontalier, PASS-CORE signale automatiquement
                l&apos;obligation de certificat d&apos;exportation pour les oeuvres depassant les
                seuils reglementaires.
              </li>
              <li>
                <strong className="text-white">Seuils d&apos;exportation</strong> — Application des
                seuils europeens (peintures : 150 000 EUR, aquarelles : 30 000 EUR, sculptures :
                50 000 EUR, photographies : 15 000 EUR) et des seuils UK (valeur et anciennete).
              </li>
              <li>
                <strong className="text-white">Documentation douaniere</strong> — Generation automatique
                des informations necessaires a la declaration douaniere (codes SH, description, valeur,
                pays d&apos;origine et de destination).
              </li>
              <li>
                <strong className="text-white">TVA a l&apos;importation</strong> — Calcul et affichage
                du taux de TVA applicable selon le pays de destination (taux reduit de 5,5% en France
                pour les oeuvres d&apos;art originales).
              </li>
              <li>
                <strong className="text-white">Regime de transit</strong> — Information sur les regimes
                douaniers applicables (admission temporaire, transit communautaire) pour les expositions
                et foires internationales.
              </li>
            </ul>
          </SubSection>
        </Section>

        {/* Section VI — Engagements generaux */}
        <Section number="VI" title="Engagements generaux de conformite">
          <div className="space-y-4 text-white/50 text-sm leading-relaxed">
            <p>
              ART-CORE GROUP LTD s&apos;engage, au travers du protocole PASS-CORE, a :
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                Maintenir une <strong className="text-white">veille reglementaire permanente</strong> sur
                l&apos;evolution des legislations applicables au marche de l&apos;art dans l&apos;Union
                europeenne et au Royaume-Uni.
              </li>
              <li>
                Designer un <strong className="text-white">responsable de la conformite</strong> (Compliance
                Officer) charge de superviser l&apos;application des procedures et de former les equipes.
              </li>
              <li>
                Realiser des <strong className="text-white">audits internes annuels</strong> des
                procedures de conformite et mettre en oeuvre les actions correctives identifiees.
              </li>
              <li>
                Cooperer pleinement avec les <strong className="text-white">autorites de controle</strong>{" "}
                (TRACFIN, DGDDI, OCBC, NCA, HMRC) dans le cadre de leurs missions.
              </li>
              <li>
                Garantir la <strong className="text-white">protection des donnees personnelles</strong>{" "}
                conformement au RGPD (Reglement (UE) 2016/679) et au UK GDPR, avec designation d&apos;un
                DPO et tenue du registre des traitements.
              </li>
              <li>
                Assurer la <strong className="text-white">conservation securisee</strong> de l&apos;ensemble
                des certificats, transactions et pieces justificatives pendant une duree minimale de 5 ans
                (10 ans pour les obligations comptables).
              </li>
            </ul>
          </div>
        </Section>

        {/* Signature */}
        <div className="mt-16 pt-8 border-t border-[#B8960C]/20">
          <div className="flex flex-col md:flex-row justify-between gap-8">
            <div className="text-sm text-white/40">
              <p className="mb-1">Fait a Londres, le 5 avril 2026</p>
              <p>Pour <strong className="text-white">ART-CORE GROUP LTD</strong></p>
              <p className="mt-2 text-[#B8960C] gold-text font-semibold">Direction Generale</p>
            </div>
            <div className="text-sm text-white/40 text-right">
              <p className="mb-1">Document reference :</p>
              <p className="font-mono text-xs">PASSCORE-CONF-2026-001</p>
              <p className="mt-2">Version 1.0 — Avril 2026</p>
            </div>
          </div>
        </div>

        {/* Bouton Telecharger PDF */}
        <div className="mt-10 text-center no-print">
          <PrintButton />
        </div>
      </div>
    </>
  );
}

/* ─── Sub-components ─────────────────────────────────────── */

function Section({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-10">
      <h2
        className="text-xl font-semibold text-[#B8960C] gold-text mb-4 flex items-baseline gap-3"
        style={{ fontFamily: "var(--font-playfair), Playfair Display, serif" }}
      >
        <span className="text-white/20 text-base">{number}.</span>
        {title}
      </h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function SubSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="section-card rounded-xl bg-white/[0.03] border border-[#B8960C]/10 p-5">
      <h3 className="text-sm font-semibold text-white/80 mb-3 uppercase tracking-wider">
        {title}
      </h3>
      {children}
    </div>
  );
}
