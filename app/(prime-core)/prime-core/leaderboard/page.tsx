"use client";

import { useState } from "react";
import {
  Trophy,
  TrendingUp,
  TrendingDown,
  Minus,
  Crown,
  Medal,
  Award,
} from "lucide-react";

type Period = "semaine" | "mois" | "tout";

const mockEntries = [
  { rank: 1, pseudo: "Phantom_X", score: 9820, artistes: 31, trend: "up" as const },
  { rank: 2, pseudo: "Nova_Scout", score: 8750, artistes: 27, trend: "up" as const },
  { rank: 3, pseudo: "ArtHunter_99", score: 8210, artistes: 24, trend: "down" as const },
  { rank: 4, pseudo: "SilentEye", score: 7640, artistes: 22, trend: "up" as const },
  { rank: 5, pseudo: "CryptoMuse", score: 7120, artistes: 20, trend: "stable" as const },
  { rank: 6, pseudo: "DarkCanvas", score: 6890, artistes: 19, trend: "down" as const },
  { rank: 7, pseudo: "Visionnaire", score: 6340, artistes: 18, trend: "up" as const },
  { rank: 8, pseudo: "Éclaireur_7", score: 5980, artistes: 17, trend: "up" as const },
  { rank: 9, pseudo: "GoldEye", score: 5620, artistes: 16, trend: "down" as const },
  { rank: 10, pseudo: "NightOwl", score: 5210, artistes: 15, trend: "stable" as const },
  { rank: 11, pseudo: "ArtPulse", score: 4870, artistes: 14, trend: "up" as const },
  { rank: 12, pseudo: "Initié_Prime", score: 4530, artistes: 14, trend: "up" as const },
  { rank: 13, pseudo: "ShadowScout", score: 4210, artistes: 13, trend: "down" as const },
  { rank: 14, pseudo: "Lumière_3", score: 3890, artistes: 12, trend: "stable" as const },
  { rank: 15, pseudo: "ZenArt", score: 3540, artistes: 11, trend: "up" as const },
  { rank: 16, pseudo: "MysticEye", score: 3210, artistes: 10, trend: "down" as const },
  { rank: 17, pseudo: "PrimeHunter", score: 2870, artistes: 9, trend: "up" as const },
  { rank: 18, pseudo: "ArtNova_X", score: 2540, artistes: 8, trend: "stable" as const },
  { rank: 19, pseudo: "Scout_Zero", score: 2210, artistes: 7, trend: "down" as const },
  { rank: 20, pseudo: "OeilDoré", score: 1890, artistes: 6, trend: "up" as const },
];

const podiumIcons = [Crown, Medal, Award];
const podiumColors = ["text-[#D4AF37]", "text-gray-300", "text-amber-600"];
const podiumBorders = ["border-[#D4AF37]/30", "border-gray-400/20", "border-amber-600/20"];

export default function LeaderboardPage() {
  const [period, setPeriod] = useState<Period>("mois");

  const top3 = mockEntries.slice(0, 3);
  const rest = mockEntries.slice(3);
  const myRank = 12;

  const TrendIcon = ({ trend }: { trend: "up" | "down" | "stable" }) => {
    if (trend === "up") return <TrendingUp className="size-3.5 text-[#2ecc71]" />;
    if (trend === "down") return <TrendingDown className="size-3.5 text-red-400" />;
    return <Minus className="size-3.5 text-white/20" />;
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-fade-in">
      <div className="flex items-center gap-3 mb-2">
        <Trophy className="size-7 text-[#D4AF37]" />
        <h1 className="font-playfair text-3xl font-semibold text-white">Classement</h1>
      </div>
      <p className="text-white/40 text-sm mb-6">Leaderboard anonyme des meilleurs scouts</p>

      {/* Period Filter */}
      <div className="flex gap-2 mb-8">
        {([
          { key: "semaine" as Period, label: "Cette semaine" },
          { key: "mois" as Period, label: "Ce mois" },
          { key: "tout" as Period, label: "Tout temps" },
        ]).map((p) => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              period === p.key
                ? "bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30"
                : "bg-white/[0.05] text-white/40 border border-white/[0.08] hover:text-white/60"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Podium Top 3 */}
      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        {top3.map((entry, i) => {
          const Icon = podiumIcons[i];
          return (
            <div
              key={entry.rank}
              className={`rounded-2xl bg-white/[0.03] border ${podiumBorders[i]} p-6 text-center ${i === 0 ? "sm:order-2" : i === 1 ? "sm:order-1" : "sm:order-3"}`}
            >
              <Icon className={`size-8 ${podiumColors[i]} mx-auto mb-3`} />
              <p className="text-xs text-white/30 mb-1">#{entry.rank}</p>
              <p className="text-lg font-bold text-white mb-1">{entry.pseudo}</p>
              <p className="text-2xl font-bold text-[#D4AF37] tabular-nums mb-2">
                {entry.score.toLocaleString("fr-FR")}
              </p>
              <div className="flex items-center justify-center gap-1 text-xs text-white/40">
                <span>{entry.artistes} artistes</span>
                <TrendIcon trend={entry.trend} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Table Ranks 4-20 */}
      <div className="rounded-2xl bg-white/[0.03] border border-white/[0.08] overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[60px_1fr_100px_80px_40px] px-4 py-3 border-b border-white/[0.06] text-xs text-white/30">
          <span>Rang</span>
          <span>Pseudo</span>
          <span className="text-right">Score</span>
          <span className="text-right">Artistes</span>
          <span />
        </div>
        {/* Rows */}
        {rest.map((entry) => (
          <div
            key={entry.rank}
            className={`grid grid-cols-[60px_1fr_100px_80px_40px] items-center px-4 py-3 border-b border-white/[0.03] ${
              entry.rank === myRank ? "bg-[#2ecc71]/5" : "hover:bg-white/[0.02]"
            }`}
          >
            <span className={`text-sm font-semibold tabular-nums ${entry.rank === myRank ? "text-[#2ecc71]" : "text-white/50"}`}>
              #{entry.rank}
            </span>
            <span className={`text-sm ${entry.rank === myRank ? "text-[#2ecc71] font-semibold" : "text-white/70"}`}>
              {entry.pseudo}
              {entry.rank === myRank && <span className="ml-2 text-[10px] text-[#2ecc71]/60">(vous)</span>}
            </span>
            <span className="text-sm text-right text-white/60 tabular-nums font-medium">
              {entry.score.toLocaleString("fr-FR")}
            </span>
            <span className="text-sm text-right text-white/40 tabular-nums">{entry.artistes}</span>
            <span className="flex justify-end">
              <TrendIcon trend={entry.trend} />
            </span>
          </div>
        ))}
      </div>

      {/* Sticky bottom bar — your position */}
      <div className="sticky bottom-16 md:bottom-4 mt-4 rounded-2xl bg-[#2ecc71]/10 border border-[#2ecc71]/20 px-6 py-4 flex items-center justify-between backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <span className="text-2xl font-bold text-[#2ecc71] tabular-nums">#{myRank}</span>
          <div>
            <p className="text-sm font-semibold text-white">Votre position</p>
            <p className="text-xs text-white/40">Initié_Prime — 4 530 pts</p>
          </div>
        </div>
        <TrendingUp className="size-5 text-[#2ecc71]" />
      </div>
    </div>
  );
}
