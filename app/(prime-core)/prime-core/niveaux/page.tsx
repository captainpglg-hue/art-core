"use client";

import {
  Zap,
  Eye,
  Search,
  Star,
  Crown,
  Shield,
  Award,
  Target,
  Users,
  TrendingUp,
  Trophy,
  Flame,
} from "lucide-react";

const levels = [
  {
    name: "Éclaireur",
    xpMin: 0,
    xpMax: 100,
    icon: Eye,
    color: "text-gray-400",
    bgColor: "bg-gray-400/10",
    borderColor: "border-gray-400/20",
    perks: ["Accès basique", "1 pari/jour", "Leaderboard en lecture"],
  },
  {
    name: "Découvreur",
    xpMin: 100,
    xpMax: 500,
    icon: Search,
    color: "text-blue-400",
    bgColor: "bg-blue-400/10",
    borderColor: "border-blue-400/20",
    perks: ["3 paris/jour", "Statistiques artistes", "Badge Découvreur"],
  },
  {
    name: "Connaisseur",
    xpMin: 500,
    xpMax: 2000,
    icon: Star,
    color: "text-[#2ecc71]",
    bgColor: "bg-[#2ecc71]/10",
    borderColor: "border-[#2ecc71]/20",
    perks: ["10 paris/jour", "Alertes cote", "Royalties +5%", "Badge Connaisseur"],
  },
  {
    name: "Expert",
    xpMin: 2000,
    xpMax: 10000,
    icon: Shield,
    color: "text-[#D4AF37]",
    bgColor: "bg-[#D4AF37]/10",
    borderColor: "border-[#D4AF37]/20",
    perks: ["Paris illimités", "Accès anticipé", "Royalties +10%", "Badge Expert", "Scouting premium"],
  },
  {
    name: "Maître",
    xpMin: 10000,
    xpMax: Infinity,
    icon: Crown,
    color: "text-purple-400",
    bgColor: "bg-purple-400/10",
    borderColor: "border-purple-400/20",
    perks: ["Tout illimité", "Royalties +20%", "Badge Maître exclusif", "Accès VIP", "Consultation privée"],
  },
];

const achievements = [
  { id: 1, name: "Premier Scout", desc: "Scout votre premier artiste", icon: Users, earned: true },
  { id: 2, name: "Premier Pari", desc: "Placez votre premier pari", icon: Target, earned: true },
  { id: 3, name: "Pari Gagnant", desc: "Remportez un pari prédictif", icon: Trophy, earned: true },
  { id: 4, name: "10 Artistes", desc: "Scoutez 10 artistes", icon: Users, earned: true },
  { id: 5, name: "Série de 3", desc: "Gagnez 3 paris consécutifs", icon: Flame, earned: true },
  { id: 6, name: "500€ Royalties", desc: "Cumulez 500€ de royalties", icon: TrendingUp, earned: false },
  { id: 7, name: "Top 10", desc: "Atteignez le top 10 du classement", icon: Award, earned: false },
  { id: 8, name: "Recruteur", desc: "Recrutez 5 scouts", icon: Users, earned: false },
  { id: 9, name: "Maître Scout", desc: "Scoutez 50 artistes", icon: Crown, earned: false },
];

export default function NiveauxPage() {
  const currentXP = 1250;
  const currentLevelIndex = 2; // Connaisseur
  const currentLevel = levels[currentLevelIndex];
  const xpInLevel = currentXP - currentLevel.xpMin;
  const xpRange = currentLevel.xpMax - currentLevel.xpMin;
  const progress = (xpInLevel / xpRange) * 100;
  const xpToNext = currentLevel.xpMax - currentXP;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-fade-in">
      <h1 className="font-playfair text-3xl font-semibold text-white mb-2">Niveaux & Progression</h1>
      <p className="text-white/40 text-sm mb-8">Gagnez de l&apos;XP en scoutant, pariant et recrutant.</p>

      {/* Current Level Card */}
      <div className="rounded-2xl bg-gradient-to-br from-[#2ecc71]/10 to-[#D4AF37]/5 border border-[#2ecc71]/20 p-6 mb-8">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-2xl bg-[#2ecc71]/20 flex items-center justify-center">
            <Star className="size-8 text-[#2ecc71]" />
          </div>
          <div>
            <p className="text-xs text-white/40 uppercase tracking-widest">Niveau actuel</p>
            <p className="text-2xl font-bold text-white">{currentLevel.name}</p>
            <p className="text-sm text-[#2ecc71] tabular-nums">{currentXP.toLocaleString("fr-FR")} XP</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-2">
          <div className="flex justify-between text-xs text-white/30 mb-1.5">
            <span>{currentLevel.xpMin} XP</span>
            <span>{currentLevel.xpMax.toLocaleString("fr-FR")} XP</span>
          </div>
          <div className="h-3 rounded-full bg-white/[0.08] overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#2ecc71] to-[#27ae60] transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        <p className="text-xs text-white/40">
          Encore <span className="text-[#2ecc71] font-semibold">{xpToNext}</span> XP pour atteindre{" "}
          <span className="text-white/70">{levels[currentLevelIndex + 1]?.name}</span>
        </p>
      </div>

      {/* Level Tiers */}
      <h2 className="text-lg font-semibold text-white mb-4">Paliers de niveaux</h2>
      <div className="space-y-3 mb-10">
        {levels.map((level, i) => {
          const Icon = level.icon;
          const isCurrent = i === currentLevelIndex;
          const isUnlocked = i <= currentLevelIndex;
          return (
            <div
              key={level.name}
              className={`rounded-2xl border p-5 transition-colors ${
                isCurrent
                  ? `bg-${level.color.replace("text-", "")}/5 ${level.borderColor}`
                  : isUnlocked
                  ? "bg-white/[0.03] border-white/[0.08]"
                  : "bg-white/[0.01] border-white/[0.04] opacity-50"
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl ${level.bgColor} flex items-center justify-center shrink-0`}>
                  <Icon className={`size-6 ${level.color}`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className={`text-sm font-semibold ${isCurrent ? level.color : "text-white"}`}>
                      {level.name}
                    </h3>
                    {isCurrent && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#2ecc71]/20 text-[#2ecc71] font-medium">
                        Actuel
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-white/30 mt-0.5">
                    {level.xpMax === Infinity
                      ? `${level.xpMin.toLocaleString("fr-FR")}+ XP`
                      : `${level.xpMin.toLocaleString("fr-FR")} — ${level.xpMax.toLocaleString("fr-FR")} XP`}
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {level.perks.map((perk) => (
                      <span
                        key={perk}
                        className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.05] text-white/40"
                      >
                        {perk}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Achievements */}
      <h2 className="text-lg font-semibold text-white mb-4">Succès</h2>
      <div className="grid sm:grid-cols-3 gap-3">
        {achievements.map((a) => {
          const Icon = a.icon;
          return (
            <div
              key={a.id}
              className={`rounded-2xl border p-4 text-center ${
                a.earned
                  ? "bg-white/[0.03] border-[#D4AF37]/20"
                  : "bg-white/[0.01] border-white/[0.04] opacity-40"
              }`}
            >
              <div className={`w-10 h-10 rounded-xl mx-auto mb-2 flex items-center justify-center ${
                a.earned ? "bg-[#D4AF37]/10" : "bg-white/[0.05]"
              }`}>
                <Icon className={`size-5 ${a.earned ? "text-[#D4AF37]" : "text-white/20"}`} />
              </div>
              <p className={`text-xs font-semibold ${a.earned ? "text-white" : "text-white/30"}`}>
                {a.name}
              </p>
              <p className="text-[10px] text-white/25 mt-0.5">{a.desc}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
