import { ShieldCheck, Users, Award, Globe, Mail } from "lucide-react";
import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      {/* Mission */}
      <section className="text-center mb-16">
        <h1 className="font-playfair text-3xl md:text-4xl font-semibold text-white mb-4">
          Democratiser l&apos;acces a l&apos;art original certifie
        </h1>
        <p className="text-white/45 text-base leading-relaxed max-w-xl mx-auto">
          Nous avons cree ART-CORE parce que l&apos;art original merite d&apos;etre accessible.
          Pas besoin d&apos;etre collectionneur ou d&apos;aller dans une galerie intimidante.
          Ici, chaque oeuvre est verifiee, chaque artiste est reel, chaque achat est protege.
        </p>
      </section>

      {/* Histoire */}
      <section className="mb-16">
        <h2 className="font-playfair text-2xl font-semibold text-white mb-4">Notre histoire</h2>
        <p className="text-white/45 leading-relaxed mb-4">
          ART-CORE est ne d&apos;un constat simple : des milliers d&apos;artistes talentueux
          n&apos;ont pas acces aux galeries traditionnelles, et des millions d&apos;amateurs
          d&apos;art n&apos;osent pas franchir la porte de ces memes galeries.
        </p>
        <p className="text-white/45 leading-relaxed">
          Notre plateforme cree le pont : une marketplace ou l&apos;art est accessible,
          certifie et livre chez vous. Avec PASS-CORE, chaque oeuvre est authentifiee.
          Avec PRIME-CORE, la communaute participe au marche. Trois outils, une mission :
          rendre l&apos;art vivant et accessible.
        </p>
      </section>

      {/* Chiffres */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
        {[
          { value: "2 400+", label: "Oeuvres certifiees" },
          { value: "340", label: "Artistes actifs" },
          { value: "98%", label: "Clients satisfaits" },
          { value: "7j", label: "Livraison moyenne" },
        ].map(s => (
          <div key={s.label} className="rounded-2xl bg-white/[0.03] border border-white/5 p-5 text-center">
            <p className="text-2xl font-bold text-[#D4AF37] tabular-nums">{s.value}</p>
            <p className="text-xs text-white/30 mt-1">{s.label}</p>
          </div>
        ))}
      </section>

      {/* Equipe */}
      <section className="mb-16">
        <h2 className="font-playfair text-2xl font-semibold text-white mb-6">L&apos;equipe</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { name: "Alexandre Martin", role: "Fondateur & CEO", bio: "Ancien galeriste, passionne par la democratisation de l'art." },
            { name: "Claire Dubois", role: "Directrice Artistique", bio: "Curatrice avec 15 ans d'experience dans l'art contemporain." },
            { name: "Thomas Leclerc", role: "CTO", bio: "Expert blockchain et marketplace, ancien CTO de startup art-tech." },
          ].map(m => (
            <div key={m.name} className="rounded-2xl bg-white/[0.03] border border-white/5 p-5">
              <div className="w-14 h-14 rounded-full bg-[#D4AF37]/10 flex items-center justify-center mb-3">
                <span className="text-[#D4AF37] font-bold">{m.name.split(" ").map(n => n[0]).join("")}</span>
              </div>
              <h3 className="text-white font-semibold text-sm">{m.name}</h3>
              <p className="text-[#D4AF37]/60 text-xs mb-2">{m.role}</p>
              <p className="text-white/35 text-xs leading-relaxed">{m.bio}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Contact */}
      <section className="rounded-2xl bg-[#D4AF37]/5 border border-[#D4AF37]/15 p-6 text-center">
        <Mail className="size-8 text-[#D4AF37] mx-auto mb-3" />
        <h2 className="text-lg font-semibold text-white mb-2">Une question ?</h2>
        <p className="text-white/40 text-sm mb-4">Notre equipe est disponible pour vous accompagner.</p>
        <p className="text-[#D4AF37] font-medium">contact@art-core.app</p>
      </section>
    </div>
  );
}
