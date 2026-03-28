import Link from "next/link";
import { TrendingUp, Target, Trophy, Users, BarChart3, ChevronRight } from "lucide-react";

export const metadata = {
  title: "PRIME-CORE — Marche predictif de l'art",
};

export default function PrimeCoreHomePage() {
  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      {/* Hero */}
      <div className="text-center mb-10">
        <div className="w-20 h-20 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center mx-auto mb-5">
          <TrendingUp className="size-10 text-[#D4AF37]" />
        </div>
        <h1 className="font-playfair text-3xl font-semibold text-white mb-3">PRIME-CORE</h1>
        <p className="text-white/40 text-sm leading-relaxed max-w-sm mx-auto">
          Predisez la valeur des oeuvres d&apos;art.<br />
          Pariez, analysez, gagnez des points et montez en ligue.
        </p>
      </div>

      {/* Actions */}
      <div className="space-y-3">
        {[
          { href: "/prime-core/dashboard", icon: BarChart3, label: "Dashboard", desc: "Vue d'ensemble de vos paris et performances" },
          { href: "/prime-core/paris", icon: Target, label: "Paris", desc: "Pariez sur la valeur future des oeuvres" },
          { href: "/prime-core/leaderboard", icon: Trophy, label: "Classement", desc: "Top des meilleurs predicteurs" },
          { href: "/prime-core/artistes", icon: Users, label: "Artistes", desc: "Decouvrez les artistes et leurs cotes" },
          { href: "/prime-core/scouts", icon: TrendingUp, label: "Scouts", desc: "Les decouvreurs de talents" },
        ].map((item) => (
          <Link key={item.href} href={item.href}
            className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-[#D4AF37]/30 hover:bg-[#D4AF37]/5 transition-all group">
            <div className="w-10 h-10 rounded-lg bg-[#D4AF37]/10 flex items-center justify-center shrink-0">
              <item.icon className="size-5 text-[#D4AF37]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium text-sm">{item.label}</p>
              <p className="text-white/30 text-xs">{item.desc}</p>
            </div>
            <ChevronRight className="size-4 text-white/20 group-hover:text-[#D4AF37] transition-colors" />
          </Link>
        ))}
      </div>
    </div>
  );
}
