"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const FAQS = [
  {
    q: "Comment fonctionne la certification ?",
    a: "Vous prenez 3 photos de votre oeuvre depuis l'app : une vue complete, un detail en gros plan et une vue de cote. Notre equipe verifie l'authenticite sous 24h. Une fois validee, votre oeuvre recoit le badge \"Certifiee\" visible par tous les acheteurs."
  },
  {
    q: "L'oeuvre est-elle vraiment originale ?",
    a: "Oui. Chaque oeuvre certifiee a ete verifiee par notre equipe. Nous verifions les photos, la coherence des informations et l'identite de l'artiste. Le badge de certification est votre garantie d'authenticite."
  },
  {
    q: "Quels sont les delais de livraison ?",
    a: "La livraison prend entre 5 et 7 jours ouvrables en France metropolitaine. Les oeuvres sont emballees avec soin (tube ou caisse bois selon le format) et assurees pendant le transport."
  },
  {
    q: "Puis-je retourner une oeuvre ?",
    a: "Oui. Vous disposez de 14 jours apres reception pour retourner l'oeuvre si elle ne vous convient pas. Le retour est gratuit et le remboursement integral."
  },
  {
    q: "Comment fixer le bon prix pour mon oeuvre ?",
    a: "Le prix est libre. Nous vous recommandons de prendre en compte la taille, la technique, votre experience et les prix du marche. Les oeuvres certifiees se vendent en moyenne 40% plus cher."
  },
  {
    q: "Comment devenir artiste sur ART-CORE ?",
    a: "Creez un compte gratuit en choisissant le profil \"Artiste\". Vous pouvez ensuite deposer vos oeuvres et les soumettre a certification. Aucune selection prealable n'est requise."
  },
  {
    q: "Qu'est-ce que PASS-CORE ?",
    a: "PASS-CORE est notre systeme de certification. Il permet de verifier l'authenticite d'une oeuvre grace a des photos detaillees et une validation par notre equipe. Chaque oeuvre certifiee est protegee contre la contrefacon."
  },
  {
    q: "Comment fonctionne PRIME-CORE ?",
    a: "PRIME-CORE est notre plateforme de prediction artistique. Les membres de la communaute peuvent parier sur le potentiel de vente d'une oeuvre. Plus une oeuvre est soutenue, plus elle gagne en visibilite."
  },
  {
    q: "L'oeuvre sera-t-elle bien emballee ?",
    a: "Absolument. Les petites oeuvres sont protegees dans un tube rigide, les grandes dans une caisse en bois sur mesure. Toutes les expeditions sont assurees a la valeur declaree de l'oeuvre."
  },
  {
    q: "Acceptez-vous les commandes personnalisees ?",
    a: "Certains artistes acceptent les commandes sur mesure. Vous pouvez les contacter directement via la messagerie integree pour discuter de votre projet."
  },
];

export default function FaqPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="font-playfair text-3xl font-semibold text-white mb-2 text-center">Questions frequentes</h1>
      <p className="text-white/40 text-sm text-center mb-10">Tout ce que vous devez savoir sur ART-CORE</p>

      <div className="space-y-2">
        {FAQS.map((faq, i) => (
          <div key={i} className="rounded-xl border border-white/5 overflow-hidden">
            <button onClick={() => setOpenIndex(openIndex === i ? null : i)}
              className="w-full flex items-center justify-between px-5 py-4 text-left active:bg-white/3 transition-colors">
              <span className="text-sm text-white font-medium pr-4">{faq.q}</span>
              <ChevronDown className={cn("size-4 text-white/30 shrink-0 transition-transform", openIndex === i && "rotate-180")} />
            </button>
            {openIndex === i && (
              <div className="px-5 pb-4">
                <p className="text-sm text-white/50 leading-relaxed">{faq.a}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
