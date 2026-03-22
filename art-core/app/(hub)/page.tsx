import Link from "next/link";
import { ShieldCheck, TrendingUp, Palette, ArrowRight } from "lucide-react";

const APPS = [
  {
    name: "ART-CORE",
    tagline: "Unveil the Unique",
    description: "Marketplace d'art avec jauge de points. Achetez, vendez, investissez.",
    href: "/art-core",
    icon: Palette,
    color: "#C9A84C",
    bg: "#0a0a0a",
    stats: "Marketplace",
  },
  {
    name: "PASS-CORE",
    tagline: "Authenticate the Real",
    description: "Certification blockchain. Photo macro → empreinte visuelle → hash.",
    href: "http://localhost:3001/pass-core/certifier",
    icon: ShieldCheck,
    color: "#C9A84C",
    bg: "#0A1128",
    external: true,
    stats: "Certification",
  },
  {
    name: "PRIME-CORE",
    tagline: "Stand the Unique Out",
    description: "Marchés prédictifs. Pariez sur les délais de vente et les prix finaux.",
    href: "http://localhost:3002/prime-core/dashboard",
    icon: TrendingUp,
    color: "#C9A84C",
    bg: "#0D0F14",
    external: true,
    stats: "Prédictions",
  },
];

export default function HubPage() {
  return (
    <div className="min-h-screen bg-[#0C0C0C] flex flex-col items-center justify-center px-4 py-16">
      {/* Background effect */}
      <div className="fixed inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 50% 30%, rgba(212,175,55,0.06) 0%, transparent 60%)" }} />

      <div className="relative z-10 text-center mb-16">
        <h1 className="font-playfair text-5xl md:text-6xl font-bold text-white mb-4">
          Core <span className="text-gold">Ecosystem</span>
        </h1>
        <p className="text-white/40 text-lg max-w-md mx-auto">
          Trois applications interconnectées au service de l&apos;art.
        </p>
      </div>

      <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full">
        {APPS.map((app) => {
          const Icon = app.icon;
          const Tag = app.external ? "a" : Link;
          const extraProps = app.external ? { target: "_blank", rel: "noopener" as const } : {};
          return (
            <Tag
              key={app.name}
              href={app.href}
              {...(extraProps as any)}
              className="group block rounded-3xl p-8 border border-white/8 hover:border-gold/30 transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_0_40px_rgba(212,175,55,0.08)]"
              style={{ backgroundColor: app.bg }}
            >
              <div className="w-12 h-12 rounded-2xl bg-gold/10 flex items-center justify-center mb-6 group-hover:bg-gold/20 transition-colors">
                <Icon className="size-6 text-gold" />
              </div>
              <h2 className="text-xl font-bold text-white mb-1">{app.name}</h2>
              <p className="text-[11px] uppercase tracking-[0.2em] text-gold/60 mb-3">{app.tagline}</p>
              <p className="text-sm text-white/40 leading-relaxed mb-6">{app.description}</p>
              <div className="flex items-center gap-2 text-gold text-sm font-medium group-hover:gap-3 transition-all">
                {app.stats} <ArrowRight className="size-4" />
              </div>
            </Tag>
          );
        })}
      </div>

      <div className="relative z-10 mt-16 flex gap-8 text-center">
        {[
          { value: "1", label: "Base partagée" },
          { value: "3", label: "Applications" },
          { value: "100%", label: "Local" },
        ].map((s) => (
          <div key={s.label}>
            <p className="text-2xl font-bold text-gold tabular-nums">{s.value}</p>
            <p className="text-xs text-white/30 mt-1">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
