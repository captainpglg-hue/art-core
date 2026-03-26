"use client";

import { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Users, Image, Euro, TrendingUp, Loader2 } from "lucide-react";

const salesData = [
  { mois: "Oct", ventes: 4200 },
  { mois: "Nov", ventes: 6800 },
  { mois: "Déc", ventes: 9100 },
  { mois: "Jan", ventes: 7500 },
  { mois: "Fév", ventes: 11200 },
  { mois: "Mar", ventes: 13400 },
];

const rolesData = [
  { role: "Artiste", count: 124 },
  { role: "Initié", count: 89 },
  { role: "Client", count: 312 },
  { role: "Propriétaire", count: 18 },
  { role: "Scout", count: 45 },
];

const recentActivity = [
  { id: 1, text: "Nouvelle inscription : Marie Dupont (Artiste)", time: "Il y a 5 min" },
  { id: 2, text: "Vente : 'Lumière Dorée' — 2 400 €", time: "Il y a 12 min" },
  { id: 3, text: "Certification Pass-Core #1847", time: "Il y a 23 min" },
  { id: 4, text: "Nouveau Magnat Initié : Jean-Pierre R.", time: "Il y a 1h" },
  { id: 5, text: "Export PDF transactions généré", time: "Il y a 2h" },
];

const stats = [
  { label: "Utilisateurs", value: "588", icon: Users, change: "+12%" },
  { label: "Oeuvres", value: "1 247", icon: Image, change: "+8%" },
  { label: "Ventes total", value: "52 200 €", icon: Euro, change: "+23%" },
  { label: "Commissions", value: "5 220 €", icon: TrendingUp, change: "+23%" },
];

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(t);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="size-8 text-[#D4AF37] animate-spin" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-8">
      <h1 className="font-playfair text-2xl md:text-3xl font-bold text-white">
        Dashboard
      </h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="bg-white/[0.03] border border-white/10 rounded-2xl p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <s.icon className="size-5 text-[#D4AF37]" />
              <span className="text-xs text-emerald-400 font-medium">
                {s.change}
              </span>
            </div>
            <p className="text-2xl font-bold text-white">{s.value}</p>
            <p className="text-xs text-white/50 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Line Chart — Ventes mensuelles */}
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6">
          <h2 className="font-playfair text-lg font-semibold text-white mb-4">
            Ventes mensuelles
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="mois" stroke="rgba(255,255,255,0.3)" fontSize={12} />
                <YAxis stroke="rgba(255,255,255,0.3)" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1a1a1a",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "12px",
                    color: "#fff",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="ventes"
                  stroke="#D4AF37"
                  strokeWidth={2}
                  dot={{ fill: "#D4AF37", r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bar Chart — Inscriptions par rôle */}
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6">
          <h2 className="font-playfair text-lg font-semibold text-white mb-4">
            Inscriptions par rôle
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rolesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="role" stroke="rgba(255,255,255,0.3)" fontSize={12} />
                <YAxis stroke="rgba(255,255,255,0.3)" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1a1a1a",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "12px",
                    color: "#fff",
                  }}
                />
                <Bar dataKey="count" fill="#D4AF37" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6">
        <h2 className="font-playfair text-lg font-semibold text-white mb-4">
          Activité récente
        </h2>
        <div className="space-y-3">
          {recentActivity.map((a) => (
            <div
              key={a.id}
              className="flex items-center justify-between py-2 border-b border-white/5 last:border-0"
            >
              <p className="text-sm text-white/80">{a.text}</p>
              <span className="text-xs text-white/30 shrink-0 ml-4">
                {a.time}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
