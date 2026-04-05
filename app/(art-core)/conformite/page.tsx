import type { Metadata } from "next";
import { PrintButton } from "./print-button";

export const metadata: Metadata = {
  title: "Conformité Réglementaire | PASS-CORE",
  description: "Attestation de conformité réglementaire PASS-CORE — Registre des Objets Mobiliers, certification blockchain, RGPD.",
};

export default function ConformitePage() {
  return (
    <div className="max-w-4xl mx-auto px-4 lg:px-8 py-10 print-section">
      {/* En-tête */}
      <div className="text-center mb-10">
        <div className="inline-block bg-[#B8960C] text-[#0D1B2A] font-bold text-xs px-4 py-1.5 rounded tracking-[0.2em] mb-4">
          PASS-CORE
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">
          Attestation de Conformité Réglementaire
        </h1>
        <p className="text-white/40 text-sm">
          Registre des Objets Mobiliers — Certification Blockchain
        </p>
        <p className="text-white/25 text-xs mt-1">
          Document mis à jour le 5 avril 2026
        </p>
        <div className="mt-6">
          <PrintButton />
        </div>
      </div>

      <article className="prose prose-invert prose-sm max-w-none space-y-10">
        {/* 1. Cadre légal */}
        <section>
          <h2 className="text-xl font-semibold text-[#D4AF37] mb-3">
            1. Cadre légal applicable
          </h2>
          <div className="rounded-xl bg-white/[0.03] border border-white/10 p-5 text-white/60 text-sm leading-relaxed space-y-3">
            <p>
              La plateforme PASS-CORE opère en conformité avec le cadre juridique français
              régissant la tenue du registre de police pour les professionnels du marché de l&apos;art
              et des objets mobiliers :
            </p>
            <ul className="list-disc pl-5 space-y-2 text-white/50">
              <li>
                <strong className="text-white">Article 321-7 du Code pénal</strong> — Obligation pour tout
                professionnel d&apos;inscrire sur un registre les objets mobiliers acquis, détenus en vue
                de la vente ou reçus en dépôt.
              </li>
              <li>
                <strong className="text-white">Décret n° 2013-287 du 3 avril 2013</strong> — Conditions
                de tenue du registre de police, mentions obligatoires, et format des inscriptions.
              </li>
              <li>
                <strong className="text-white">Articles R321-1 à R321-12 du Code pénal</strong> — Dispositions
                réglementaires détaillant les modalités d&apos;enregistrement : identification des vendeurs
                (personnes physiques et morales), description des objets, conservation des pièces justificatives.
              </li>
              <li>
                <strong className="text-white">Arrêté du 15 mai 2020</strong> — Relatif au registre de police
                dématérialisé, autorisant la tenue sous format numérique sous réserve de garanties d&apos;intégrité.
              </li>
            </ul>
            <div className="mt-4 p-4 rounded-lg bg-[#D4AF37]/5 border border-[#D4AF37]/20">
              <p className="text-[#D4AF37] text-xs font-medium uppercase tracking-wider mb-1">Sanctions</p>
              <p className="text-white/50 text-xs">
                Le non-respect de ces obligations est puni de six mois d&apos;emprisonnement et de 30 000 euros
                d&apos;amende (art. 321-7 al. 2 C. pén.). La destruction ou la falsification du registre
                constitue un délit autonome.
              </p>
            </div>
          </div>
        </section>

        {/* 2. Registre des Objets Mobiliers */}
        <section>
          <h2 className="text-xl font-semibold text-[#D4AF37] mb-3">
            2. Registre des Objets Mobiliers (ROM)
          </h2>
          <div className="text-white/60 text-sm leading-relaxed space-y-4">
            <p>
              PASS-CORE met à disposition des professionnels un registre de police numérique
              conforme aux exigences réglementaires. Chaque professionnel inscrit reçoit un
              <strong className="text-white"> numéro ROM unique</strong> (format : AAAA-VILLE-SIRET)
              qui identifie son registre.
            </p>

            <div className="rounded-xl bg-white/[0.03] border border-white/10 p-5 space-y-3">
              <p className="text-white font-medium text-sm">Mentions obligatoires par entrée :</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {[
                  "Numéro d'ordre séquentiel",
                  "Date et heure de l'opération",
                  "Nature de l'opération (achat, échange, dépôt-vente)",
                  "Description détaillée de l'objet",
                  "Signes distinctifs et marques",
                  "Prix d'achat ou valeur estimée",
                  "Identité complète du vendeur (pièce d'identité)",
                  "Mode de règlement et référence",
                  "Photographies macro (protocole 3 zones)",
                  "Hash SHA-256 chaîné (intégrité blockchain)",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-2 text-xs text-white/50">
                    <span className="text-[#D4AF37] mt-0.5 shrink-0">•</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl bg-white/[0.03] border border-white/10 p-5">
              <p className="text-white font-medium text-sm mb-2">Intégrité par chaînage cryptographique</p>
              <p className="text-white/50 text-xs leading-relaxed">
                Chaque entrée du registre est scellée par un hash SHA-256 calculé à partir des données
                de l&apos;entrée et du hash de l&apos;entrée précédente, formant une chaîne d&apos;intégrité
                comparable à une blockchain privée. Toute modification d&apos;une entrée invalide
                l&apos;ensemble de la chaîne en aval, garantissant ainsi l&apos;immuabilité du registre.
              </p>
              <div className="mt-3 font-mono text-[10px] text-[#D4AF37]/60 bg-black/30 rounded-lg p-3 overflow-x-auto">
                hash(N) = SHA-256( hash(N-1) + données_entrée(N) )
              </div>
            </div>
          </div>
        </section>

        {/* 3. Protocole de certification */}
        <section>
          <h2 className="text-xl font-semibold text-[#D4AF37] mb-3">
            3. Protocole de certification PASS-CORE
          </h2>
          <div className="text-white/60 text-sm leading-relaxed space-y-4">
            <p>
              Le système de certification PASS-CORE repose sur trois piliers complémentaires
              garantissant l&apos;authenticité et la traçabilité des œuvres :
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-xl bg-white/[0.03] border border-white/10 p-5">
                <div className="w-8 h-8 rounded-lg bg-[#D4AF37]/10 flex items-center justify-center mb-3">
                  <span className="text-[#D4AF37] font-bold text-sm">1</span>
                </div>
                <p className="text-white font-medium text-sm mb-2">Empreinte visuelle</p>
                <p className="text-white/50 text-xs leading-relaxed">
                  Hash SHA-256 calculé à partir des métadonnées de l&apos;œuvre (titre, technique,
                  dimensions, artiste) créant une empreinte numérique unique et immuable.
                </p>
              </div>

              <div className="rounded-xl bg-white/[0.03] border border-white/10 p-5">
                <div className="w-8 h-8 rounded-lg bg-[#D4AF37]/10 flex items-center justify-center mb-3">
                  <span className="text-[#D4AF37] font-bold text-sm">2</span>
                </div>
                <p className="text-white font-medium text-sm mb-2">Macro-photographie 3 zones</p>
                <p className="text-white/50 text-xs leading-relaxed">
                  Protocole propriétaire de capture macro en 3 zones distinctes. Chaque zone est analysée
                  (aHash, dHash, pHash, histogramme radial, texture LBP) pour générer une empreinte
                  biométrique de l&apos;œuvre.
                </p>
              </div>

              <div className="rounded-xl bg-white/[0.03] border border-white/10 p-5">
                <div className="w-8 h-8 rounded-lg bg-[#D4AF37]/10 flex items-center justify-center mb-3">
                  <span className="text-[#D4AF37] font-bold text-sm">3</span>
                </div>
                <p className="text-white font-medium text-sm mb-2">Ancrage blockchain</p>
                <p className="text-white/50 text-xs leading-relaxed">
                  L&apos;empreinte combinée est ancrée sur une blockchain publique (Polygon / Base),
                  créant une preuve d&apos;antériorité horodatée, vérifiable par tout tiers.
                </p>
              </div>
            </div>

            <div className="rounded-xl bg-[#D4AF37]/5 border border-[#D4AF37]/20 p-5">
              <p className="text-[#D4AF37] text-xs font-medium uppercase tracking-wider mb-2">Score qualité macro</p>
              <p className="text-white/50 text-xs leading-relaxed">
                Chaque zone macro reçoit un score de qualité de 0 à 100. Un score ≥ 80 (vert)
                garantit une empreinte exploitable pour vérification ultérieure. Un score &lt; 65 (rouge)
                nécessite une nouvelle capture. La qualité influence directement la fiabilité
                de l&apos;identification future.
              </p>
            </div>
          </div>
        </section>

        {/* 4. Protection des données */}
        <section>
          <h2 className="text-xl font-semibold text-[#D4AF37] mb-3">
            4. Protection des données personnelles
          </h2>
          <div className="text-white/60 text-sm leading-relaxed space-y-3">
            <p>
              ART-CORE GROUP LTD s&apos;engage à protéger les données personnelles conformément au
              <strong className="text-white"> Règlement Général sur la Protection des Données (RGPD)</strong> et
              au <strong className="text-white">UK Data Protection Act 2018</strong>.
            </p>

            <div className="rounded-xl bg-white/[0.03] border border-white/10 p-5 space-y-3">
              <p className="text-white font-medium text-sm">Données collectées dans le cadre du registre :</p>
              <ul className="list-disc pl-5 space-y-1 text-white/50 text-xs">
                <li>Identité du professionnel : raison sociale, SIRET, nom du gérant, adresse</li>
                <li>Identité des vendeurs/déposants : nom, prénom, adresse, pièce d&apos;identité</li>
                <li>Données des objets : descriptions, photographies, empreintes visuelles</li>
                <li>Données de transaction : prix, mode de paiement, références</li>
                <li>Hash blockchain : empreintes SHA-256 (données non réversibles)</li>
              </ul>
            </div>

            <div className="rounded-xl bg-white/[0.03] border border-white/10 p-5 space-y-3">
              <p className="text-white font-medium text-sm">Droits des personnes concernées :</p>
              <ul className="list-disc pl-5 space-y-1 text-white/50 text-xs">
                <li>Droit d&apos;accès, de rectification et de suppression</li>
                <li>Droit à la portabilité des données</li>
                <li>Droit d&apos;opposition au traitement</li>
                <li>Droit de retrait du consentement</li>
              </ul>
              <p className="text-white/40 text-xs mt-2">
                Contact DPO : <span className="text-[#D4AF37]">contact@art-core.app</span>
              </p>
            </div>

            <p className="text-white/40 text-xs">
              Les données du registre de police sont conservées pendant la durée légale de 6 ans
              à compter de la dernière inscription, conformément aux obligations réglementaires.
              Les données sont hébergées sur des serveurs sécurisés (Supabase / Vercel)
              au sein de l&apos;Union Européenne.
            </p>
          </div>
        </section>

        {/* 5. Obligations Tracfin */}
        <section>
          <h2 className="text-xl font-semibold text-[#D4AF37] mb-3">
            5. Obligations Tracfin — Lutte anti-blanchiment
          </h2>
          <div className="text-white/60 text-sm leading-relaxed space-y-3">
            <p>
              Conformément aux articles L561-2 et suivants du Code monétaire et financier,
              les professionnels du marché de l&apos;art sont assujettis aux obligations de vigilance
              en matière de lutte contre le blanchiment de capitaux et le financement du terrorisme.
            </p>

            <div className="rounded-xl bg-red-500/5 border border-red-500/20 p-5 space-y-3">
              <p className="text-red-400 text-xs font-medium uppercase tracking-wider mb-1">Seuils d&apos;alerte</p>
              <ul className="list-disc pl-5 space-y-2 text-white/50 text-xs">
                <li>
                  <strong className="text-white">Paiement en espèces &gt; 1 000 EUR</strong> — Le système PASS-CORE
                  génère automatiquement une alerte Tracfin lorsqu&apos;une transaction en espèces dépasse
                  le seuil réglementaire (art. D112-3 CMF).
                </li>
                <li>
                  <strong className="text-white">Déclaration de soupçon</strong> — En cas de suspicion de blanchiment
                  ou de financement du terrorisme, le professionnel est tenu d&apos;effectuer une déclaration
                  auprès de Tracfin (art. L561-15 CMF).
                </li>
                <li>
                  <strong className="text-white">Transaction &gt; 10 000 EUR</strong> — Obligation de vigilance
                  renforcée et identification complémentaire du client (art. L561-10 CMF).
                </li>
              </ul>
            </div>

            <p className="text-white/40 text-xs">
              Le tableau de bord professionnel PASS-CORE intègre un système d&apos;alertes automatique
              signalant les transactions dépassant les seuils réglementaires. Le professionnel
              reste seul responsable de ses obligations déclaratives auprès de Tracfin.
            </p>
          </div>
        </section>

        {/* 6. Éditeur */}
        <section>
          <h2 className="text-xl font-semibold text-[#D4AF37] mb-3">
            6. Éditeur et responsabilité
          </h2>
          <div className="rounded-xl bg-white/[0.03] border border-white/10 p-5 text-white/60 text-sm leading-relaxed space-y-2">
            <p><strong className="text-white">ART-CORE GROUP LTD</strong></p>
            <p>Société enregistrée au Royaume-Uni — Companies House</p>
            <p>Site web : <span className="text-[#D4AF37]">art-core.app</span></p>
            <p>Contact : <span className="text-[#D4AF37]">contact@art-core.app</span></p>
            <p className="mt-2">Directeur de publication : Équipe ART-CORE GROUP LTD</p>
            <p>Hébergeur : Vercel Inc., 340 S Lemon Ave #4133, Walnut, CA 91789, USA</p>
            <p className="mt-3 text-white/40 text-xs">
              PASS-CORE est un module intégré à l&apos;écosystème ART-CORE. Il fournit les outils
              de conformité réglementaire mais ne se substitue pas au conseil juridique professionnel.
              Le professionnel reste seul responsable du respect de ses obligations légales.
            </p>
          </div>
        </section>

        {/* Signature */}
        <div className="text-center pt-6 border-t border-white/10">
          <p className="text-[#D4AF37] text-xs font-medium tracking-wider">
            PASS-CORE — Authenticate the Real
          </p>
          <p className="text-white/20 text-[10px] mt-1">
            ART-CORE GROUP LTD — Tous droits réservés
          </p>
        </div>
      </article>
    </div>
  );
}
