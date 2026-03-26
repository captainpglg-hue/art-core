"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  TrendingUp,
  Users,
  Target,
  Trophy,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  BarChart3,
  Zap,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

const royaltiesData = [
  { month: "Oct", amount: 320 },
  { month: "Nov", amount: 580 },
  { month: "Déc", amount: 410 },
  { month: "Jan", amount: 720 },
  { month: "Fév", amount: 650 },
  { month: "Mar", amount: 890 },
];

const activeBets = [
  {
    id: 1,
    artist: "Léa Fontaine",
    direction: "hausse",
    amount: 25,
    odds: 2.4,
    potential: 60,
    timeLeft: "2j 14h",
  },
  {
    id: 2,
    artist: "Marco Bellucci",
    direction: "baisse",
    amount: 10,
    odds: 3.1,
    potential: 31,
    timeLeft: "5j 8h",
  },
  {
    id: 3,
    artist: "Nadia Kowalski",
    direction: "hausse",
    amount: 50,
    odds: 1.8,
    potential: 90,
    timeLeft: "1j 3h",
  },
];

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl bg-[#141720] border border-white/10 px-3 py-2 text-xs shadow-lg">
      <p className="text-white/40 mb-0.5">{label}</p>
      <p className="font-bold text-[#2ecc71] tabular-nums">{payload[0].value} €</p>
    </div>
  );
}

export default function PrimeCoreDashboard() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setUser(d.user))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-2 border-[#2ecc71]/30 border-t-[#2ecc71] rounded-full animate-spin" />
      </div>
    );
  }

  const kpis = [
    { label: "Revenus total", value: "3 570 €", icon: TrendingUp, color: "text-[#2ecc71]" },
    { label: "Artistes scoutés", value: "14", icon: Users, color: "text-[#D4AF37]" },
    { label: "Paris actifs", value: "3", icon: Target, color: "text-[#2ecc71]" },
    { label: "Rang classement", value: "#12", icon: Trophy, color: "text-[#D4AF37]" },
  ];

  const maxAmount = Math.max(...royaltiesData.map((d) => d.amount));

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 animate-fade-in">
      {/* Welcome */}
      <div className="mb-8">
        <h1 className="font-playfair text-3xl font-semibold text-white">
          Bienvenue{user?.name ? `, ${user.name}` : ""}
        </h1>
        <p className="text-white/40 text-sm mt-1">
          Votre tableau de bord PRIME-CORE — Scouting & Royalties
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.label}
              className="rounded-2xl bg-white/[0.03] border border-white/[0.08] p-5"
            >
              <Icon className={`size-5 ${kpi.color} mb-3`} />
              <p className="text-2xl font-bold text-white tabular-nums">{kpi.value}</p>
              <p className="text-xs text-white/30 mt-1">{kpi.label}</p>
            </div>
          );
        })}
      </div>

      {/* Royalties Chart */}
      <div className="rounded-2xl bg-white/[0.03] border border-white/[0.08] p-6 mb-8">
        <h2 className="text-lg font-semibold text-white mb-4">Royalties mensuelles</h2>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={royaltiesData} margin={{ top: 5, right: 8, left: -20, bottom: 0 }} barSize={24}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "rgba(255,255,255,0.25)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v}€`}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
            <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
              {royaltiesData.map((entry, i) => (
                <Cell
                  key={i}
                  fill={entry.amount === maxAmount ? "#2ecc71" : "rgba(46,204,113,0.3)"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Active Bets */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Paris en cours</h2>
          <Link href="/prime-core/paris" className="text-[#2ecc71] text-sm hover:underline flex items-center gap-1">
            Voir tout <ArrowRight className="size-3" />
          </Link>
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          {activeBets.map((bet) => (
            <div
              key={bet.id}
              className="rounded-2xl bg-white/[0.03] border border-white/[0.08] p-5"
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-white">{bet.artist}</p>
                {bet.direction === "hausse" ? (
                  <ArrowUpRight className="size-4 text-[#2ecc71]" />
                ) : (
                  <ArrowDownRight className="size-4 text-red-400" />
                )}
              </div>
              <div className="space-y-1.5 text-xs text-white/40">
                <div className="flex justify-between">
                  <span>Mise</span>
                  <span className="text-white/70 tabular-nums">{bet.amount} €</span>
                </div>
                <div className="flex justify-between">
                  <span>Cote</span>
                  <span className="text-[#D4AF37] tabular-nums">x{bet.odds}</span>
                </div>
                <div className="flex justify-between">
                  <span>Gain potentiel</span>
                  <span className="text-[#2ecc71] font-semibold tabular-nums">{bet.potential} €</span>
                </div>
              </div>
              <p className="text-[10px] text-white/20 mt-3">Expire dans {bet.timeLeft}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Actions rapides</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          <Link
            href="/prime-core/artistes"
            className="flex items-center gap-3 rounded-2xl bg-white/[0.03] border border-white/[0.08] p-4 hover:bg-white/[0.06] transition-colors"
          >
            <div className="w-10 h-10 rounded-xl bg-[#2ecc71]/10 flex items-center justify-center">
              <Search className="size-5 text-[#2ecc71]" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">Scout un artiste</p>
              <p className="text-[11px] text-white/30">Découvrir de nouveaux talents</p>
            </div>
          </Link>
          <Link
            href="/prime-core/paris"
            className="flex items-center gap-3 rounded-2xl bg-white/[0.03] border border-white/[0.08] p-4 hover:bg-white/[0.06] transition-colors"
          >
            <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/10 flex items-center justify-center">
              <Zap className="size-5 text-[#D4AF37]" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">Placer un pari</p>
              <p className="text-[11px] text-white/30">Marchés prédictifs</p>
            </div>
          </Link>
          <Link
            href="/prime-core/leaderboard"
            className="flex items-center gap-3 rounded-2xl bg-white/[0.03] border border-white/[0.08] p-4 hover:bg-white/[0.06] transition-colors"
          >
            <div className="w-10 h-10 rounded-xl bg-[#2ecc71]/10 flex items-center justify-center">
              <BarChart3 className="size-5 text-[#2ecc71]" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">Voir classement</p>
              <p className="text-[11px] text-white/30">Leaderboard anonyme</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
