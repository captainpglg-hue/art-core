import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Conditions Generales d'Utilisation | ART-CORE",
};

export default function CGUPage() {
  return (
    <article className="prose prose-invert prose-sm max-w-none">
      <h1 className="text-3xl font-bold text-white mb-2">Conditions Generales d&apos;Utilisation</h1>
      <p className="text-white/30 text-sm mb-8">Derniere mise a jour : 23 mars 2026</p>

      <section className="mb-10">
        <h2 className="text-xl font-semibold text-[#D4AF37] mb-3">1. Editeur</h2>
        <div className="rounded-xl bg-white/[0.03] border border-white/10 p-5 text-white/60 text-sm leading-relaxed">
          <p className="mb-2"><strong className="text-white">ART-CORE GROUP LTD</strong></p>
          <p>Societe enregistree au Royaume-Uni — Companies House</p>
          <p>Site web : <a href="https://art-core.app" className="text-[#D4AF37] hover:underline">art-core.app</a></p>
          <p>Contact : <a href="mailto:contact@art-core.app" className="text-[#D4AF37] hover:underline">contact@art-core.app</a></p>
          <p className="mt-2">Directeur de publication : Equipe ART-CORE GROUP LTD</p>
          <p>Hebergeur : Vercel Inc., 340 S Lemon Ave #4133, Walnut, CA 91789, USA</p>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-semibold text-[#D4AF37] mb-3">2. Objet du service</h2>
        <div className="text-white/60 text-sm leading-relaxed space-y-3">
          <p>
            ART-CORE est une plateforme numerique de mise en relation entre artistes, collectionneurs,
            galeries et amateurs d&apos;art. Elle permet la certification, l&apos;exposition, la vente
            et l&apos;acquisition d&apos;oeuvres d&apos;art originales.
          </p>
          <p>
            La plateforme integre trois modules complementaires :
          </p>
          <ul className="list-disc pl-5 space-y-1 text-white/50">
            <li><strong className="text-white">ART-CORE</strong> : Marketplace d&apos;oeuvres certifiees</li>
            <li><strong className="text-white">Pass-Core</strong> : Systeme de certification et d&apos;authentification des oeuvres</li>
            <li><strong className="text-white">Prime-Core</strong> : Programme de fidelite, parrainage et investissement</li>
          </ul>
          <p>
            L&apos;utilisation de la plateforme implique l&apos;acceptation sans reserve des presentes CGU.
          </p>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-semibold text-[#D4AF37] mb-3">3. Inscription et comptes</h2>
        <div className="text-white/60 text-sm leading-relaxed space-y-3">
          <p>L&apos;inscription est gratuite et ouverte a toute personne physique agee de 18 ans minimum.</p>
          <p>Cinq types de comptes sont disponibles :</p>
          <ul className="list-disc pl-5 space-y-1 text-white/50">
            <li><strong className="text-white">Artiste</strong> : Peut deposer, certifier et vendre ses oeuvres. Gratuit a vie.</li>
            <li><strong className="text-white">Initie</strong> : Peut investir via le systeme de jauge et parier sur les oeuvres.</li>
            <li><strong className="text-white">Client</strong> : Peut acheter des oeuvres et consulter les Pass-Core.</li>
            <li><strong className="text-white">Ambassadeur</strong> : Peut certifier les oeuvres pour le compte des artistes.</li>
            <li><strong className="text-white">Galerie</strong> : Peut gerer un catalogue d&apos;artistes et organiser des expositions virtuelles.</li>
          </ul>
          <p>
            L&apos;utilisateur est responsable de la confidentialite de ses identifiants.
            Toute activite realisee depuis son compte est presumee etre de son fait.
          </p>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-semibold text-[#D4AF37] mb-3">4. Commission et royalties</h2>
        <div className="text-white/60 text-sm leading-relaxed space-y-3">
          <p>ART-CORE preleve une commission sur chaque vente realisee via la plateforme :</p>
          <div className="rounded-xl bg-white/[0.03] border border-white/10 p-5 space-y-2">
            <div className="flex justify-between items-center">
              <span>Commission plateforme sur vente</span>
              <span className="text-[#D4AF37] font-semibold">25%</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Consultation Pass-Core (par tiers)</span>
              <span className="text-[#D4AF37] font-semibold">0,50 EUR</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Royalty reversee au proprietaire du Pass-Core</span>
              <span className="text-[#D4AF37] font-semibold">0,10 EUR par consultation</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Pass-Core proprietaire</span>
              <span className="text-[#D4AF37] font-semibold">49 EUR + 5 EUR/mois</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Pass Magnat Initie</span>
              <span className="text-[#D4AF37] font-semibold">9,90 EUR/mois</span>
            </div>
          </div>
          <p>
            L&apos;artiste recoit le produit de la vente deduction faite de la commission.
            Les paiements sont traites par Stripe et verses sous 7 jours ouvrables.
          </p>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-semibold text-[#D4AF37] mb-3">5. Pass-Core — Certification</h2>
        <div className="text-white/60 text-sm leading-relaxed space-y-3">
          <p>
            Le Pass-Core est un certificat numerique d&apos;authenticite genere par empreinte SHA-256
            a partir des photos de l&apos;oeuvre. Il ne constitue pas un titre de propriete au sens juridique
            mais un outil de tracabilite et de confiance.
          </p>
          <p>
            La certification est soumise a validation par l&apos;equipe ART-CORE ou un ambassadeur agree.
            L&apos;oeuvre doit etre originale et les photos conformes aux standards requis.
          </p>
          <p>
            ART-CORE se reserve le droit de refuser ou revoquer une certification en cas de fraude,
            contrefacon ou non-respect des presentes conditions.
          </p>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-semibold text-[#D4AF37] mb-3">6. Prime-Core — Programme de fidelite</h2>
        <div className="text-white/60 text-sm leading-relaxed space-y-3">
          <p>
            Prime-Core est le programme de fidelite et d&apos;investissement integre a la plateforme.
            Il permet aux utilisateurs d&apos;accumuler des points, de participer a des paris sur
            la valorisation des oeuvres et de beneficier d&apos;avantages exclusifs.
          </p>
          <p>
            Les points n&apos;ont pas de valeur monetaire directe et ne sont pas echangeables
            contre de l&apos;argent. Ils donnent acces a des promotions, des badges et des
            fonctionnalites premium sur la plateforme.
          </p>
          <p>
            Le parrainage bancaire via Nova Bank genere une commission de 70 EUR net + 15 EUR
            d&apos;avantages pour le filleul.
          </p>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-semibold text-[#D4AF37] mb-3">7. Protection des donnees (RGPD)</h2>
        <div className="text-white/60 text-sm leading-relaxed space-y-3">
          <p>
            ART-CORE GROUP LTD s&apos;engage a proteger les donnees personnelles de ses utilisateurs
            conformement au Reglement General sur la Protection des Donnees (RGPD) et au UK Data Protection Act 2018.
          </p>
          <p><strong className="text-white">Donnees collectees :</strong></p>
          <ul className="list-disc pl-5 space-y-1 text-white/50">
            <li>Identite : nom, prenom, email, nom d&apos;utilisateur</li>
            <li>Coordonnees : adresse de livraison, telephone (optionnel)</li>
            <li>Contenu : photos des oeuvres, descriptions, certificats</li>
            <li>Transactions : historique d&apos;achats, commissions, points</li>
            <li>Navigation : cookies fonctionnels et analytiques</li>
          </ul>
          <p><strong className="text-white">Droits de l&apos;utilisateur :</strong></p>
          <ul className="list-disc pl-5 space-y-1 text-white/50">
            <li>Droit d&apos;acces, de rectification et de suppression</li>
            <li>Droit a la portabilite des donnees</li>
            <li>Droit d&apos;opposition au traitement</li>
            <li>Droit de retrait du consentement</li>
          </ul>
          <p>
            Pour exercer ces droits, contactez : <a href="mailto:contact@art-core.app" className="text-[#D4AF37] hover:underline">contact@art-core.app</a>
          </p>
          <p>
            Les donnees sont stockees sur des serveurs securises (Supabase / Vercel) et conservees
            pour la duree necessaire au fonctionnement du service. L&apos;utilisateur peut demander
            la suppression de son compte et de ses donnees a tout moment.
          </p>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-semibold text-[#D4AF37] mb-3">8. Responsabilites</h2>
        <div className="text-white/60 text-sm leading-relaxed space-y-3">
          <p>
            ART-CORE agit en tant qu&apos;intermediaire technique. La plateforme ne garantit pas
            la valeur artistique ou marchande des oeuvres exposees.
          </p>
          <p>
            L&apos;artiste garantit etre l&apos;auteur original de l&apos;oeuvre deposee et dispose
            de tous les droits necessaires a sa commercialisation. En cas de contrefacon averee,
            le compte de l&apos;artiste pourra etre suspendu et les transactions annulees.
          </p>
          <p>
            L&apos;acheteur beneficie d&apos;un droit de retractation de 14 jours a compter de la
            reception de l&apos;oeuvre, sous reserve que celle-ci soit retournee dans son etat d&apos;origine.
          </p>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-semibold text-[#D4AF37] mb-3">9. Droit applicable</h2>
        <div className="text-white/60 text-sm leading-relaxed space-y-3">
          <p>
            Les presentes CGU sont regies par le droit anglais (laws of England and Wales).
            Tout litige sera soumis a la competence exclusive des tribunaux anglais,
            sans prejudice du droit du consommateur europeen de saisir les juridictions
            de son domicile.
          </p>
          <p>
            Pour les utilisateurs residant dans l&apos;Union Europeenne, les dispositions
            du droit europeen de la consommation s&apos;appliquent en complement.
          </p>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-semibold text-[#D4AF37] mb-3">10. Contact</h2>
        <div className="rounded-xl bg-white/[0.03] border border-white/10 p-5 text-white/60 text-sm leading-relaxed">
          <p><strong className="text-white">ART-CORE GROUP LTD</strong></p>
          <p>Email : <a href="mailto:contact@art-core.app" className="text-[#D4AF37] hover:underline">contact@art-core.app</a></p>
          <p>Site : <a href="https://art-core.app" className="text-[#D4AF37] hover:underline">https://art-core.app</a></p>
          <p className="mt-2 text-white/30">
            Enregistree au Registre des societes du Royaume-Uni (Companies House)
          </p>
        </div>
      </section>
    </article>
  );
}
