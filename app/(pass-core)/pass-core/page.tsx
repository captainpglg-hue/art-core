import Link from "next/link";
import { ShieldCheck, Camera, Search, Image as ImageIcon, CreditCard, ChevronRight } from "lucide-react";

export const metadata = {
  title: "PASS-CORE — Certifiez vos oeuvres",
};

export default function PassCoreHomePage() {
  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      {/* Hero */}
      <div className="text-center mb-10">
        <div className="w-20 h-20 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center mx-auto mb-5">
          <ShieldCheck className="size-10 text-[#D4AF37]" />
        </div>
        <h1 className="font-playfair text-3xl font-semibold text-white mb-3">PASS-CORE</h1>
        <p className="text-white/40 text-sm leading-relaxed max-w-sm mx-auto">
          Certifiez l&apos;authenticite de vos oeuvres d&apos;art.<br />
          Photo macro + empreinte SHA-256 = protection definitive.
        </p>
      </div>

      {/* Actions principales */}
      <div className="space-y-3 mb-10">
        <Link href="/pass-core/certifier"
          className="flex items-center gap-4 p-5 rounded-2xl bg-[#D4AF37] text-[#0A1128] active:brightness-90 transition-all">
          <div className="w-12 h-12 rounded-xl bg-black/10 flex items-center justify-center shrink-0">
            <Camera className="size-6" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-lg">Certifier une oeuvre</p>
            <p className="text-[#0A1128]/60 text-xs">Photo macro + hash blockchain en 5 min</p>
          </div>
          <ChevronRight className="size-6" />
        </Link>

        <Link href="/pass-core/verifier"
          className="flex items-center gap-4 p-5 rounded-2xl bg-white/[0.03] border border-white/10 active:bg-white/5 transition-all">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
            <Search className="size-6 text-blue-400" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-white">Verifier une oeuvre</p>
            <p className="text-white/30 text-xs">Scannez un QR code ou entrez un hash</p>
          </div>
          <ChevronRight className="size-5 text-white/20" />
        </Link>

        <Link href="/pass-core/gallery"
          className="flex items-center gap-4 p-5 rounded-2xl bg-white/[0.03] border border-white/10 active:bg-white/5 transition-all">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center shrink-0">
            <ImageIcon className="size-6 text-purple-400" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-white">Mes certificats</p>
            <p className="text-white/30 text-xs">Toutes vos oeuvres certifiees</p>
          </div>
          <ChevronRight className="size-5 text-white/20" />
        </Link>

        <Link href="/pass-core/abonnement"
          className="flex items-center gap-4 p-5 rounded-2xl bg-white/[0.03] border border-white/10 active:bg-white/5 transition-all">
          <div className="w-12 h-12 rounded-xl bg-[#D4AF37]/10 flex items-center justify-center shrink-0">
            <CreditCard className="size-6 text-[#D4AF37]" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-white">Abonnements</p>
            <p className="text-white/30 text-xs">Gratuit · Premium 9.90EUR/an · Galerie</p>
          </div>
          <ChevronRight className="size-5 text-white/20" />
        </Link>
      </div>

      {/* Comment ca marche */}
      <div className="rounded-2xl bg-white/[0.02] border border-white/5 p-6">
        <h2 className="text-white font-semibold text-center mb-6">Comment ca marche</h2>
        <div className="space-y-5">
          {[
            { num: "1", title: "Photographiez", desc: "Prenez une photo macro de votre oeuvre avec votre smartphone" },
            { num: "2", title: "Certifiez", desc: "Un hash SHA-256 unique est calcule a partir de l'empreinte visuelle" },
            { num: "3", title: "Vendez", desc: "L'oeuvre apparait sur Art-Core avec le badge Certifie" },
          ].map(s => (
            <div key={s.num} className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center shrink-0">
                <span className="text-[#D4AF37] font-bold text-sm">{s.num}</span>
              </div>
              <div>
                <p className="text-white font-medium text-sm">{s.title}</p>
                <p className="text-white/30 text-xs">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Lien vers Art-Core */}
      <div className="mt-6 text-center">
        <Link href="/art-core" className="text-[#D4AF37]/60 text-xs hover:text-[#D4AF37]">
          Aller sur Art-Core (marketplace) →
        </Link>
      </div>
    </div>
  );
}
