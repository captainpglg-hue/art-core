"use client";

import { Users, Palette, Star, TrendingUp } from "lucide-react";

const stats = [
  { label: "Total utilisateurs", value: "588", icon: Users },
  { label: "Artistes actifs", value: "124", icon: Palette },
  { label: "Initiés actifs", value: "89", icon: Star },
  { label: "Taux d'engagement", value: "67%", icon: TrendingUp },
];

const topScouts = [
  { name: "Jean-Pierre Roux", scouted: 12, commission: "840 €" },
  { name: "Claire Moreau", scouted: 9, commission: "630 €" },
  { name: "Hugo Martin", scouted: 7, commission: "490 €" },
  { name: "Sophie Laurent", scouted: 5, commission: "350 €" },
  { name: "Lucas Petit", scouted: 3, commission: "210 €" },
];

const referralChain = [
  { referrer: "Jean-Pierre Roux", referred: "Marie Dupont", date: "2026-01-15", role: "Artiste" },
  { referrer: "Jean-Pierre Roux", referred: "Emma Leroy", date: "2026-02-01", role: "Artiste" },
  { referrer: "Claire Moreau", referred: "Thomas Bernard", date: "2026-02-10", role: "Artiste" },
  { referrer: "Claire Moreau", referred: "Lucas Petit", date: "2026-02-18", role: "Client" },
  { referrer: "Hugo Martin", referred: "Sophie Laurent", date: "2026-01-22", role: "Client" },
  { referrer: "Hugo Martin", referred: "Anaïs Blanc", date: "2026-03-01", role: "Initié" },
  { referrer: "Sophie Laurent", referred: "Marc Dubois", date: "2026-03-05", role: "Client" },
  { referrer: "Jean-Pierre Roux", referred: "Léa Fontaine", date: "2026-03-10", role: "Artiste" },
];

const roleBadge: Record<string, string> = {
  Artiste: "bg-[#D4AF37]/20 text-[#D4AF37]",
  Client: "bg-blue-500/20 text-blue-400",
  Initié: "bg-purple-500/20 text-purple-400",
};

export default function AdminNetwork() {
  return (
    <div className="animate-fade-in space-y-8">
      <h1 className="font-playfair text-2xl md:text-3xl font-bold text-white">
        Réseau
      </h1>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="bg-white/[0.03] border border-white/10 rounded-2xl p-5"
          >
            <s.icon className="size-5 text-[#D4AF37] mb-3" />
            <p className="text-2xl font-bold text-white">{s.value}</p>
            <p className="text-xs text-white/50 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Top Scouts */}
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6">
          <h2 className="font-playfair text-lg font-semibold text-white mb-4">
            Top Scouts
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-2 text-white/40 font-medium">#</th>
                  <th className="text-left py-2 text-white/40 font-medium">Nom</th>
                  <th className="text-right py-2 text-white/40 font-medium">Scoutés</th>
                  <th className="text-right py-2 text-white/40 font-medium">Commission</th>
                </tr>
              </thead>
              <tbody>
                {topScouts.map((s, i) => (
                  <tr
                    key={s.name}
                    className="border-b border-white/5"
                  >
                    <td className="py-3 text-[#D4AF37] font-bold">{i + 1}</td>
                    <td className="py-3 text-white font-medium">{s.name}</td>
                    <td className="py-3 text-right text-white/60">{s.scouted}</td>
                    <td className="py-3 text-right text-emerald-400 font-medium">{s.commission}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Referral Chain */}
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6">
          <h2 className="font-playfair text-lg font-semibold text-white mb-4">
            Chaîne de parrainage
          </h2>
          <div className="space-y-3">
            {referralChain.map((r, i) => (
              <div
                key={i}
                className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0"
              >
                <div className="size-7 rounded-full bg-[#D4AF37]/20 flex items-center justify-center text-[10px] font-bold text-[#D4AF37] shrink-0">
                  {r.referrer.split(" ").map((w) => w[0]).join("")}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">
                    <span className="font-medium">{r.referrer}</span>
                    <span className="text-white/30 mx-2">&rarr;</span>
                    <span className="text-white/70">{r.referred}</span>
                  </p>
                  <p className="text-xs text-white/30">{r.date}</p>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-medium shrink-0 ${roleBadge[r.role] || "bg-white/10 text-white/50"}`}>
                  {r.role}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
