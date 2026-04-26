import Link from "next/link";
import { ShieldCheck, TrendingUp, Lock, ArrowRight, Award, Star, Upload } from "lucide-react";

export default function PassCoreHome() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col">
      {/* Hero */}
      <section className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="max-w-lg text-center">
          <div className="w-16 h-16 rounded-full bg-[#C9A84C]/10 border border-[#C9A84C]/30 flex items-center justify-center mx-auto mb-6">
            <ShieldCheck className="size-9 text-[#C9A84C]" />
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-semibold text-white leading-tight mb-4">
            Déposez votre œuvre.<br />
            <span className="text-[#C9A84C]">Vendez-la plus cher.</span>
          </h1>
          <p className="text-white/50 text-base mb-8">
            Œuvres certifiées vendues en moyenne <span className="text-[#C9A84C] font-semibold">40% plus cher</span> sur ART-CORE
          </p>

          <Link href="/pass-core/deposer"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-[#C9A84C] text-navy-DEFAULT font-semibold text-base active:brightness-90 transition-all shadow-[0_0_30px_rgba(201,168,76,0.2)]">
            <Upload className="size-5" />
            Déposer une œuvre à vendre <ArrowRight className="size-5" />
          </Link>
          <p className="text-white/30 text-[11px] mt-3">
            Inscription + dépôt en une étape (artiste, galeriste, antiquaire, brocanteur, dépôt-vente).
          </p>

          <div className="mt-5">
            <Link href="/pass-core/certifier"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[#C9A84C]/30 text-[#C9A84C] text-sm font-medium active:bg-[#C9A84C]/10">
              <ShieldCheck className="size-4" />
              J&apos;ai déjà mon œuvre — la certifier
            </Link>
          </div>

          {/* 3 benefits */}
          <div className="mt-10 space-y-3 text-left max-w-sm mx-auto">
            {[
              { icon: Award, text: "Badge certifié visible sur votre fiche", color: "text-green-400", bg: "bg-green-500/10" },
              { icon: TrendingUp, text: "Prix de vente valorisé automatiquement", color: "text-[#C9A84C]", bg: "bg-[#C9A84C]/10" },
              { icon: Lock, text: "Protection contre la copie et la contrefaçon", color: "text-blue-400", bg: "bg-blue-500/10" },
            ].map((b) => (
              <div key={b.text} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/5">
                <div className={`w-9 h-9 rounded-lg ${b.bg} flex items-center justify-center shrink-0`}>
                  <b.icon className={`size-4.5 ${b.color}`} />
                </div>
                <p className="text-sm text-white/70">{b.text}</p>
              </div>
            ))}
          </div>

          {/* Stats */}
          <div className="flex justify-center gap-8 mt-10">
            {[
              { value: "2 400+", label: "Œuvres certifiées" },
              { value: "5 min", label: "Temps moyen" },
              { value: "+40%", label: "Prix de vente" },
            ].map(s => (
              <div key={s.label} className="text-center">
                <p className="text-xl font-bold text-[#C9A84C] tabular-nums">{s.value}</p>
                <p className="text-[10px] text-white/25 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
