import Link from "next/link";
import {
  ShieldCheck,
  Camera,
  Cpu,
  Hash,
  Layers,
  ArrowRight,
  Award,
  TrendingUp,
  Lock,
  CheckCircle2,
} from "lucide-react";

const STEPS = [
  {
    num: "01",
    icon: Camera,
    title: "Photo macro",
    desc: "Photographiez une zone unique de votre œuvre. La texture, les craquelures ou les fibres deviennent son empreinte.",
  },
  {
    num: "02",
    icon: Cpu,
    title: "Analyse IA",
    desc: "L'intelligence artificielle analyse la photo et génère une empreinte visuelle unique (pHash) impossible à falsifier.",
  },
  {
    num: "03",
    icon: Hash,
    title: "Hash blockchain",
    desc: "Un hash SHA-256 unique est ancré sur la blockchain Polygon. Preuve immuable, horodatée, vérifiable par tous.",
  },
  {
    num: "04",
    icon: Layers,
    title: "Dépôt Art-Core",
    desc: "L'œuvre est automatiquement déposée sur le marketplace ART-CORE avec son badge Certifié et sa fiche complète.",
  },
];

const BENEFITS = [
  {
    icon: Award,
    title: "Badge Certifié visible",
    desc: "Chaque œuvre certifiée affiche un badge vert de confiance sur ART-CORE.",
    color: "text-green-400",
    bg: "bg-green-500/10",
  },
  {
    icon: TrendingUp,
    title: "+40% de valeur",
    desc: "Les œuvres certifiées se vendent en moyenne 40% plus cher sur le marketplace.",
    color: "text-[#C9A84C]",
    bg: "bg-[#C9A84C]/10",
  },
  {
    icon: Lock,
    title: "Anti-contrefaçon",
    desc: "Preuve cryptographique inaltérable. Protection contre la copie et la fraude.",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
  },
];

export default function PassCoreLanding() {
  return (
    <div className="flex flex-col">
      {/* ── Hero ────────────────────────────────────── */}
      <section className="relative flex items-center justify-center px-4 py-20 md:py-28">
        {/* Subtle radial glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[#C9A84C]/[0.04] blur-[120px]" />
        </div>

        <div className="relative max-w-2xl text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#C9A84C]/20 bg-[#C9A84C]/5 mb-8">
            <ShieldCheck className="size-4 text-[#C9A84C]" />
            <span className="text-xs uppercase tracking-[0.15em] text-[#C9A84C]/80 font-medium">
              Authenticate the Real
            </span>
          </div>

          <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-semibold text-white leading-[1.1] mb-6">
            L&apos;identité numérique{" "}
            <span className="text-[#C9A84C]">de chaque œuvre</span>
          </h1>

          <p className="text-white/50 text-base md:text-lg max-w-lg mx-auto mb-10 leading-relaxed">
            Pass-Core génère une empreinte visuelle unique à partir d&apos;une photo macro,
            ancre un certificat blockchain et dépose automatiquement l&apos;œuvre sur Art-Core.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/pass-core/certifier"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-[#C9A84C] text-[#0A1128] font-semibold text-base active:brightness-90 transition-all shadow-[0_0_30px_rgba(201,168,76,0.2)] hover:shadow-[0_0_40px_rgba(201,168,76,0.3)]"
            >
              Certifier une œuvre <ArrowRight className="size-5" />
            </Link>
            <Link
              href="/pass-core/gallery"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-white/10 text-white/60 text-sm hover:text-white hover:border-white/20 transition-all"
            >
              Voir la galerie
            </Link>
          </div>
        </div>
      </section>

      {/* ── Processus en 4 étapes ───────────────────── */}
      <section className="px-4 py-16 md:py-24">
        <p className="text-center text-[11px] uppercase tracking-[0.25em] text-white/30 mb-12">
          Le processus en 4 étapes
        </p>

        <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {STEPS.map((step) => (
            <div
              key={step.num}
              className="group rounded-2xl border border-white/5 bg-white/[0.02] p-6 hover:border-[#C9A84C]/20 hover:bg-[#C9A84C]/[0.03] transition-all duration-300"
            >
              <div className="flex items-center gap-3 mb-4">
                <span className="text-xs font-mono text-white/20">{step.num}</span>
                <div className="w-9 h-9 rounded-lg bg-[#C9A84C]/10 flex items-center justify-center">
                  <step.icon className="size-4.5 text-[#C9A84C]/70 group-hover:text-[#C9A84C] transition-colors" />
                </div>
              </div>
              <h3 className="font-display text-base font-semibold text-white mb-2">
                {step.title}
              </h3>
              <p className="text-sm text-white/40 leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Avantages ───────────────────────────────── */}
      <section className="px-4 py-16 md:py-24 border-t border-white/5">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-display text-2xl md:text-3xl font-semibold text-white text-center mb-12">
            Pourquoi certifier ?
          </h2>

          <div className="space-y-4">
            {BENEFITS.map((b) => (
              <div
                key={b.title}
                className="flex items-start gap-4 p-5 rounded-2xl border border-white/5 bg-white/[0.02]"
              >
                <div className={`w-10 h-10 rounded-xl ${b.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                  <b.icon className={`size-5 ${b.color}`} />
                </div>
                <div>
                  <h3 className="font-semibold text-white mb-1">{b.title}</h3>
                  <p className="text-sm text-white/40 leading-relaxed">{b.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats ───────────────────────────────────── */}
      <section className="px-4 py-16 border-t border-white/5">
        <div className="max-w-2xl mx-auto flex justify-center gap-10 md:gap-16">
          {[
            { value: "2 400+", label: "Œuvres certifiées" },
            { value: "5 min", label: "Temps moyen" },
            { value: "+40%", label: "Prix de vente" },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-2xl md:text-3xl font-bold text-[#C9A84C] tabular-nums">{s.value}</p>
              <p className="text-xs text-white/30 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA final ───────────────────────────────── */}
      <section className="px-4 py-16 md:py-24 border-t border-white/5">
        <div className="max-w-lg mx-auto text-center">
          <CheckCircle2 className="size-10 text-[#C9A84C]/40 mx-auto mb-6" />
          <h2 className="font-display text-2xl md:text-3xl font-semibold text-white mb-4">
            Prêt à certifier ?
          </h2>
          <p className="text-white/40 text-sm mb-8">
            Le processus prend moins de 5 minutes. Votre œuvre reçoit immédiatement
            son badge Certifié et apparaît sur ART-CORE.
          </p>
          <Link
            href="/pass-core/certifier"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-[#C9A84C] text-[#0A1128] font-semibold active:brightness-90 transition-all shadow-[0_0_30px_rgba(201,168,76,0.2)]"
          >
            Commencer la certification <ArrowRight className="size-5" />
          </Link>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────── */}
      <footer className="border-t border-white/5 px-4 py-8">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-white/25">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-[#C9A84C]/50" />
            <span>PASS-CORE — Authenticate the Real</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/pass-core/certifier" className="hover:text-white/50 transition-colors">Certifier</Link>
            <Link href="/pass-core/verifier" className="hover:text-white/50 transition-colors">Vérifier</Link>
            <Link href="/pass-core/gallery" className="hover:text-white/50 transition-colors">Galerie</Link>
          </div>
          <p>© {new Date().getFullYear()} Core Ecosystem</p>
        </div>
      </footer>
    </div>
  );
}
