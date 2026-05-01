"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Trash2, Eye, EyeOff, Edit3, Check, X, RefreshCw, Shield, AlertTriangle, Users,
  Package, Download, BarChart3, TrendingUp, Lock, Unlock, Plus, Search
} from "lucide-react";
import { resolveFirstPhoto } from "@/lib/resolve-photo";

interface Artwork {
  id: string;
  title: string;
  artist_name: string;
  artist_id: string;
  category: string;
  status: string;
  price: number;
  photos: string[];
  creation_date: string;
  created_at: string;
}

interface User {
  id: string;
  email: string;
  name: string;
  full_name?: string;
  username: string;
  role: string;
  points_balance: number;
  total_earned: number;
  is_initie: number;
  artworks_count: number;
  purchases_count: number;
  created_at: string;
}

interface Certification {
  id: string;
  title: string;
  artist_name: string;
  artist_email: string;
  blockchain_hash: string;
  blockchain_tx_id: string;
  certification_date: string;
  status: string;
  category: string;
}

interface Stats {
  totalUsers: number;
  totalArtworks: number;
  totalTransactions: number;
  totalRevenue: number;
  platformFees: number;
  artworksByStatus: { status: string; count: number }[];
  usersByRole: { role: string; count: number }[];
  recentTransactions: { id: string; artwork_title: string; buyer_name: string; seller_name: string; amount: number; created_at: string }[];
  certifications: { total: number; thisMonth: number };
  monthlyRevenue: { month: string; revenue: number }[];
}

export default function AdminPage() {
  const [tab, setTab] = useState<"dashboard" | "artworks" | "users" | "certifications" | "export">("dashboard");
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [user, setUser] = useState<any>(null);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingPoints, setEditingPoints] = useState("");
  const [showNewUserModal, setShowNewUserModal] = useState(false);

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/auth/me");
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        window.location.href = "/art-core/admin/login";
      }
    } catch {
      setError("Erreur de connexion.");
      window.location.href = "/art-core/admin/login";
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/stats");
      const data = await res.json();
      setStats(data);
    } catch {
      setError("Impossible de charger les statistiques.");
    }
  }, []);

  const fetchArtworks = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "200", offset: "0" });
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (search) params.set("search", search);
      const res = await fetch(`/api/artworks?${params}`);
      const data = await res.json();
      setArtworks(data.artworks || []);
    } catch {
      setError("Impossible de charger les oeuvres.");
    }
    setLoading(false);
  }, [statusFilter, search]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      let filteredUsers = data.users || [];
      if (search) {
        filteredUsers = filteredUsers.filter(
          (u: any) =>
            (u.full_name || u.name || "").toLowerCase().includes(search.toLowerCase()) ||
            (u.email || "").toLowerCase().includes(search.toLowerCase()) ||
            (u.username || "").toLowerCase().includes(search.toLowerCase())
        );
      }
      setUsers(filteredUsers);
    } catch {
      setError("Impossible de charger les utilisateurs.");
    }
    setLoading(false);
  }, [search]);

  const fetchCertifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/certifications");
      const data = await res.json();
      setCertifications(data.certifications || []);
    } catch {
      setError("Impossible de charger les certifications.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  useEffect(() => {
    if (user?.role === "admin") {
      if (tab === "dashboard") fetchStats();
      if (tab === "artworks") fetchArtworks();
      if (tab === "users") fetchUsers();
      if (tab === "certifications") fetchCertifications();
    }
  }, [user, tab, fetchStats, fetchArtworks, fetchUsers, fetchCertifications]);

  const showMessage = (msg: string) => {
    setActionMessage(msg);
    setTimeout(() => setActionMessage(""), 3000);
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/artworks/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setArtworks((prev) => prev.filter((a) => a.id !== id));
        showMessage(`"${data.title}" supprimee.`);
      } else {
        showMessage(`Erreur : ${data.error}`);
      }
    } catch {
      showMessage("Erreur reseau.");
    }
    setConfirmDelete(null);
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/artworks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setArtworks((prev) => prev.map((a) => a.id === id ? { ...a, status: newStatus } : a));
        showMessage("Statut mis a jour.");
      }
    } catch {
      showMessage("Erreur reseau.");
    }
  };

  const handlePriceUpdate = async (id: string) => {
    const price = parseFloat(editPrice);
    if (isNaN(price) || price < 0) {
      showMessage("Prix invalide.");
      return;
    }
    try {
      const res = await fetch(`/api/artworks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ price }),
      });
      const data = await res.json();
      if (data.success) {
        setArtworks((prev) => prev.map((a) => a.id === id ? { ...a, price } : a));
        showMessage("Prix mis a jour.");
      }
    } catch {
      showMessage("Erreur reseau.");
    }
    setEditingId(null);
  };

  const handlePointsUpdate = async (userId: string) => {
    const points = parseInt(editingPoints);
    if (isNaN(points) || points < 0) {
      showMessage("Points invalides.");
      return;
    }
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ points_balance: points }),
      });
      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) => u.id === userId ? { ...u, points_balance: points } : u)
        );
        showMessage("Points mis a jour.");
      }
    } catch {
      showMessage("Erreur reseau.");
    }
    setEditingUserId(null);
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, role: newRole }),
      });
      const data = await res.json();
      if (data.success) {
        setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role: newRole } : u));
        showMessage(`Role mis a jour.`);
      }
    } catch {
      showMessage("Erreur reseau.");
    }
  };

  const handleSuspendUser = async (userId: string) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role: "banned" } : u));
        showMessage("Utilisateur suspendu.");
      }
    } catch {
      showMessage("Erreur reseau.");
    }
  };

  const handleRevokeCertification = async (artworkId: string) => {
    try {
      const res = await fetch("/api/admin/certifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ artwork_id: artworkId, action: "revoke" }),
      });
      if (res.ok) {
        setCertifications((prev) => prev.filter((c) => c.id !== artworkId));
        showMessage("Certification revoquee.");
      }
    } catch {
      showMessage("Erreur reseau.");
    }
  };

  const handleExport = async (type: string) => {
    try {
      const res = await fetch(`/api/admin/export?type=${type}`);
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `artcore-${type}-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showMessage(`Export ${type} telecharge.`);
    } catch {
      showMessage("Erreur export.");
    }
  };

  if (error && !user) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertTriangle className="size-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">Acces restreint</h1>
          <p className="text-white/50 mb-6">{error}</p>
          <a href="/art-core" className="text-gold hover:underline">Retour au marketplace</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] pt-20 px-4 pb-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Shield className="size-6 text-gold" />
            <h1 className="text-2xl font-bold text-white">Administration</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (tab === "dashboard") fetchStats();
                if (tab === "artworks") fetchArtworks();
                if (tab === "users") fetchUsers();
                if (tab === "certifications") fetchCertifications();
              }}
              className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-all text-sm"
            >
              <RefreshCw className="size-4" /> Actualiser
            </button>
            <button
              onClick={async () => {
                try {
                  await fetch("/api/admin/auth/logout", { method: "POST" });
                  window.location.href = "/art-core/admin/login";
                } catch (err) {
                  console.error("Logout error:", err);
                }
              }}
              className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/20 transition-all text-sm"
            >
              Déconnexion
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-white/5 rounded-xl p-1 w-fit overflow-x-auto">
          {[
            { key: "dashboard" as const, icon: BarChart3, label: "Tableau de bord", count: 0 },
            { key: "artworks" as const, icon: Package, label: "Oeuvres", count: artworks.length },
            { key: "users" as const, icon: Users, label: "Utilisateurs", count: users.length },
            { key: "certifications" as const, icon: Shield, label: "Certifications", count: certifications.length },
            { key: "export" as const, icon: Download, label: "Exporter", count: 0 },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                tab === t.key ? "bg-gold text-black" : "text-white/50 hover:text-white hover:bg-white/5"
              }`}
            >
              <t.icon className="size-4" />
              {t.label}
              {t.count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${tab === t.key ? "bg-black/20" : "bg-white/10"}`}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Message flash */}
        {actionMessage && (
          <div className="mb-4 px-4 py-3 bg-gold/10 border border-gold/30 rounded-lg text-gold text-sm">
            {actionMessage}
          </div>
        )}

        {/* ═══ TABLEAU DE BORD ═══ */}
        {tab === "dashboard" && (
          <>
            {loading || !stats ? (
              <p className="text-white/30 text-center py-8">Chargement des statistiques...</p>
            ) : (
              <>
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                  {[
                    { label: "Utilisateurs", value: stats.totalUsers, icon: Users, color: "blue" },
                    { label: "Oeuvres", value: stats.totalArtworks, icon: Package, color: "purple" },
                    { label: "Transactions", value: stats.totalTransactions, icon: TrendingUp, color: "green" },
                    { label: "Revenue (€)", value: stats.totalRevenue.toFixed(2), icon: BarChart3, color: "gold" },
                  ].map((stat, i) => (
                    <div key={i} className="p-6 bg-white/[0.02] border border-white/8 rounded-2xl">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-white/40 text-sm mb-2">{stat.label}</p>
                          <p className="text-2xl font-bold text-white">{stat.value}</p>
                        </div>
                        <div className={`p-3 rounded-lg ${
                          stat.color === "gold" ? "bg-gold/10" :
                          stat.color === "blue" ? "bg-blue-500/10" :
                          stat.color === "purple" ? "bg-purple-500/10" :
                          "bg-green-500/10"
                        }`}>
                          <stat.icon className={`size-5 ${
                            stat.color === "gold" ? "text-gold" :
                            stat.color === "blue" ? "text-blue-400" :
                            stat.color === "purple" ? "text-purple-400" :
                            "text-green-400"
                          }`} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Certifications */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                  <div className="p-6 bg-white/[0.02] border border-white/8 rounded-2xl">
                    <p className="text-white/40 text-sm mb-2">Certifications totales</p>
                    <p className="text-3xl font-bold text-gold">{stats.certifications.total}</p>
                  </div>
                  <div className="p-6 bg-white/[0.02] border border-white/8 rounded-2xl">
                    <p className="text-white/40 text-sm mb-2">Ce mois-ci</p>
                    <p className="text-3xl font-bold text-gold">{stats.certifications.thisMonth}</p>
                  </div>
                </div>

                {/* Monthly Revenue Chart */}
                {stats.monthlyRevenue.length > 0 && (
                  <div className="mb-8 p-6 bg-white/[0.02] border border-white/8 rounded-2xl">
                    <h3 className="text-white font-bold mb-6">Revenue mensuelle (6 derniers mois)</h3>
                    <div className="flex items-end gap-2 h-48">
                      {stats.monthlyRevenue.map((m) => {
                        const maxRevenue = Math.max(...stats.monthlyRevenue.map(x => x.revenue));
                        const height = maxRevenue > 0 ? (m.revenue / maxRevenue) * 100 : 0;
                        return (
                          <div key={m.month} className="flex-1 flex flex-col items-center gap-2">
                            <div
                              className="w-full bg-gold/40 rounded-t-lg hover:bg-gold/60 transition-colors"
                              style={{ height: `${Math.max(height, 5)}%` }}
                              title={`€${m.revenue.toFixed(2)}`}
                            />
                            <p className="text-white/40 text-xs">{m.month}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Recent Transactions */}
                <div className="p-6 bg-white/[0.02] border border-white/8 rounded-2xl">
                  <h3 className="text-white font-bold mb-4">Transactions recentes</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/8 text-left text-white/40">
                          <th className="pb-3 font-medium">Oeuvre</th>
                          <th className="pb-3 font-medium">Acheteur</th>
                          <th className="pb-3 font-medium">Vendeur</th>
                          <th className="pb-3 font-medium">Montant</th>
                          <th className="pb-3 font-medium">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.recentTransactions.map((t) => (
                          <tr key={t.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                            <td className="py-3 text-white">{t.artwork_title}</td>
                            <td className="py-3 text-white/50">{t.buyer_name}</td>
                            <td className="py-3 text-white/50">{t.seller_name}</td>
                            <td className="py-3 text-gold">{t.amount.toFixed(2)} €</td>
                            <td className="py-3 text-white/30 text-xs">
                              {new Date(t.created_at).toLocaleDateString("fr-FR")}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {/* ═══ ONGLET OEUVRES ═══ */}
        {tab === "artworks" && (
          <>
            <div className="flex flex-wrap gap-3 mb-6">
              <input
                type="text"
                placeholder="Rechercher par titre ou artiste..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 min-w-[200px] px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-gold/40"
              />
              {["all", "for_sale", "certified", "pending_sale", "sold"].map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    statusFilter === s ? "bg-gold text-black" : "bg-white/5 text-white/50 hover:bg-white/10"
                  }`}
                >
                  {s === "all" ? "Tout" : s === "for_sale" ? "En vente" : s === "certified" ? "Certifie" : s === "pending_sale" ? "Attente" : "Vendu"}
                </button>
              ))}
            </div>

            {loading ? (
              <p className="text-white/30 text-center py-8">Chargement...</p>
            ) : (
              <div className="border border-white/8 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-white/5 text-white/40 text-left">
                      <th className="px-4 py-3 font-medium">Oeuvre</th>
                      <th className="px-4 py-3 font-medium">Artiste</th>
                      <th className="px-4 py-3 font-medium">Cat.</th>
                      <th className="px-4 py-3 font-medium">Prix</th>
                      <th className="px-4 py-3 font-medium">Statut</th>
                      <th className="px-4 py-3 font-medium">Creation</th>
                      <th className="px-4 py-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {artworks.map((art) => (
                      <tr key={art.id} className="border-t border-white/5 hover:bg-white/[0.02]">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <img
                              src={resolveFirstPhoto(art.photos)}
                              alt=""
                              className="w-10 h-10 rounded-lg object-cover bg-white/5"
                            />
                            <a
                              href={`/art-core/oeuvre/${art.id}`}
                              className="text-white hover:text-gold font-medium truncate max-w-[200px]"
                            >
                              {art.title}
                            </a>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-white/50">{art.artist_name}</td>
                        <td className="px-4 py-3 text-white/40">{art.category}</td>
                        <td className="px-4 py-3">
                          {editingId === art.id ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                value={editPrice}
                                onChange={(e) => setEditPrice(e.target.value)}
                                className="w-20 px-2 py-1 bg-white/10 border border-gold/40 rounded text-white text-xs focus:outline-none"
                                autoFocus
                              />
                              <button
                                onClick={() => handlePriceUpdate(art.id)}
                                className="p-1 text-green-400 hover:bg-green-400/10 rounded"
                              >
                                <Check className="size-3" />
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                className="p-1 text-red-400 hover:bg-red-400/10 rounded"
                              >
                                <X className="size-3" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setEditingId(art.id);
                                setEditPrice(String(art.price));
                              }}
                              className="text-gold hover:underline flex items-center gap-1"
                            >
                              {art.price} € <Edit3 className="size-3 opacity-40" />
                            </button>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={art.status}
                            onChange={(e) => handleStatusChange(art.id, e.target.value)}
                            className="bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-gold/40"
                          >
                            <option value="certified" className="bg-[#0a0a0a]">Certifie</option>
                            <option value="for_sale" className="bg-[#0a0a0a]">En vente</option>
                            <option value="pending_sale" className="bg-[#0a0a0a]">Attente</option>
                            <option value="sold" className="bg-[#0a0a0a]">Vendu</option>
                          </select>
                        </td>
                        <td className="px-4 py-3 text-white/30 text-xs">
                          {art.creation_date ? new Date(art.creation_date).toLocaleDateString("fr-FR") : "-"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            {confirmDelete === art.id ? (
                              <div className="flex items-center gap-1 bg-red-500/10 rounded-lg px-2 py-1">
                                <span className="text-red-400 text-xs">Supprimer ?</span>
                                <button onClick={() => handleDelete(art.id)} className="p-1 text-red-400">
                                  <Check className="size-3" />
                                </button>
                                <button
                                  onClick={() => setConfirmDelete(null)}
                                  className="p-1 text-white/40"
                                >
                                  <X className="size-3" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setConfirmDelete(art.id)}
                                className="p-2 rounded-lg text-red-400/50 hover:text-red-400 hover:bg-red-400/10"
                              >
                                <Trash2 className="size-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {artworks.length === 0 && <p className="text-center text-white/30 py-8">Aucune oeuvre.</p>}
              </div>
            )}
          </>
        )}

        {/* ═══ ONGLET UTILISATEURS ═══ */}
        {tab === "users" && (
          <>
            <div className="flex gap-3 mb-6">
              <input
                type="text"
                placeholder="Rechercher par nom, email ou username..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-gold/40"
              />
              <button
                onClick={() => setShowNewUserModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gold text-black rounded-lg text-sm font-medium hover:bg-gold/90 transition-all"
              >
                <Plus className="size-4" /> Nouvel utilisateur
              </button>
            </div>

            {loading ? (
              <p className="text-white/30 text-center py-8">Chargement...</p>
            ) : (
              <div className="border border-white/8 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-white/5 text-white/40 text-left">
                      <th className="px-4 py-3 font-medium">Nom</th>
                      <th className="px-4 py-3 font-medium">Email</th>
                      <th className="px-4 py-3 font-medium">Role</th>
                      <th className="px-4 py-3 font-medium">Points</th>
                      <th className="px-4 py-3 font-medium">Oeuvres</th>
                      <th className="px-4 py-3 font-medium">Achats</th>
                      <th className="px-4 py-3 font-medium">Inscrit</th>
                      <th className="px-4 py-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} className="border-t border-white/5 hover:bg-white/[0.02]">
                        <td className="px-4 py-3">
                          <div>
                            <p className="text-white font-medium">{u.full_name || u.name}</p>
                            <p className="text-white/30 text-xs">@{u.username}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-white/50 text-xs">{u.email}</td>
                        <td className="px-4 py-3">
                          <select
                            value={u.role}
                            onChange={(e) => handleRoleChange(u.id, e.target.value)}
                            className="bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-gold/40"
                          >
                            <option value="client" className="bg-[#0a0a0a]">
                              Client
                            </option>
                            <option value="artist" className="bg-[#0a0a0a]">
                              Artiste
                            </option>
                            <option value="initiate" className="bg-[#0a0a0a]">
                              Initie
                            </option>
                            <option value="admin" className="bg-[#0a0a0a]">
                              Admin
                            </option>
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          {editingUserId === u.id ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                value={editingPoints}
                                onChange={(e) => setEditingPoints(e.target.value)}
                                className="w-16 px-2 py-1 bg-white/10 border border-gold/40 rounded text-white text-xs focus:outline-none"
                                autoFocus
                              />
                              <button
                                onClick={() => handlePointsUpdate(u.id)}
                                className="p-1 text-green-400 hover:bg-green-400/10 rounded"
                              >
                                <Check className="size-3" />
                              </button>
                              <button
                                onClick={() => setEditingUserId(null)}
                                className="p-1 text-red-400 hover:bg-red-400/10 rounded"
                              >
                                <X className="size-3" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setEditingUserId(u.id);
                                setEditingPoints(String(u.points_balance));
                              }}
                              className="text-gold hover:underline flex items-center gap-1 text-xs"
                            >
                              {u.points_balance} pts <Edit3 className="size-3 opacity-40" />
                            </button>
                          )}
                        </td>
                        <td className="px-4 py-3 text-white/50 text-xs">{u.artworks_count}</td>
                        <td className="px-4 py-3 text-white/50 text-xs">{u.purchases_count}</td>
                        <td className="px-4 py-3 text-white/30 text-xs">
                          {u.created_at ? new Date(u.created_at).toLocaleDateString("fr-FR") : ""}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <a
                              href={`/art-core/profil/${u.id}`}
                              className="text-gold/60 hover:text-gold text-xs"
                            >
                              Voir
                            </a>
                            {u.role !== "banned" && (
                              <button
                                onClick={() => handleSuspendUser(u.id)}
                                title="Suspendre l'utilisateur"
                                className="p-1 text-red-400/50 hover:text-red-400 hover:bg-red-400/10 rounded"
                              >
                                <Lock className="size-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {users.length === 0 && <p className="text-center text-white/30 py-8">Aucun utilisateur.</p>}
              </div>
            )}
          </>
        )}

        {/* ═══ ONGLET CERTIFICATIONS ═══ */}
        {tab === "certifications" && (
          <>
            {loading ? (
              <p className="text-white/30 text-center py-8">Chargement...</p>
            ) : (
              <div className="border border-white/8 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-white/5 text-white/40 text-left">
                      <th className="px-4 py-3 font-medium">Oeuvre</th>
                      <th className="px-4 py-3 font-medium">Artiste</th>
                      <th className="px-4 py-3 font-medium">Categorie</th>
                      <th className="px-4 py-3 font-medium">Hash blockchain</th>
                      <th className="px-4 py-3 font-medium">TX ID</th>
                      <th className="px-4 py-3 font-medium">Date</th>
                      <th className="px-4 py-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {certifications.map((cert) => (
                      <tr key={cert.id} className="border-t border-white/5 hover:bg-white/[0.02]">
                        <td className="px-4 py-3">
                          <a
                            href={`/art-core/oeuvre/${cert.id}`}
                            className="text-white hover:text-gold font-medium"
                          >
                            {cert.title}
                          </a>
                        </td>
                        <td className="px-4 py-3 text-white/50">{cert.artist_name}</td>
                        <td className="px-4 py-3 text-white/40">{cert.category}</td>
                        <td className="px-4 py-3 text-white/30 text-xs font-mono">
                          {cert.blockchain_hash.slice(0, 16)}...
                        </td>
                        <td className="px-4 py-3 text-white/30 text-xs font-mono">
                          {cert.blockchain_tx_id?.slice(0, 16)}...
                        </td>
                        <td className="px-4 py-3 text-white/30 text-xs">
                          {new Date(cert.certification_date).toLocaleDateString("fr-FR")}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handleRevokeCertification(cert.id)}
                            className="p-2 rounded-lg text-red-400/50 hover:text-red-400 hover:bg-red-400/10"
                            title="Revoquer la certification"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {certifications.length === 0 && (
                  <p className="text-center text-white/30 py-8">Aucune oeuvre certifiee.</p>
                )}
              </div>
            )}
          </>
        )}

        {/* ═══ ONGLET EXPORT ═══ */}
        {tab === "export" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                type: "users",
                icon: Users,
                title: "Utilisateurs",
                desc: "Tous les comptes, roles, points, statistiques",
              },
              {
                type: "artworks",
                icon: Package,
                title: "Oeuvres",
                desc: "Catalogue complet avec artistes, prix, statuts",
              },
              {
                type: "all",
                icon: Download,
                title: "Export complet",
                desc: "Utilisateurs + oeuvres + transactions",
              },
            ].map((exp) => (
              <button
                key={exp.type}
                onClick={() => handleExport(exp.type)}
                className="group p-6 bg-white/[0.02] border border-white/8 rounded-2xl hover:border-gold/30 hover:bg-white/[0.04] transition-all text-left"
              >
                <exp.icon className="size-8 text-gold/60 group-hover:text-gold mb-4 transition-colors" />
                <h3 className="text-white font-bold mb-1">{exp.title}</h3>
                <p className="text-white/40 text-sm mb-4">{exp.desc}</p>
                <span className="text-gold text-sm font-medium">Telecharger JSON</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* New User Modal */}
      {showNewUserModal && (
        <NewUserModal onClose={() => setShowNewUserModal(false)} onSuccess={() => { setShowNewUserModal(false); fetchUsers(); }} />
      )}
    </div>
  );
}

function NewUserModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    username: "",
    role: "client",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.username) {
      setError("Tous les champs sont requis");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        onSuccess();
      } else {
        const data = await res.json();
        setError(data.error || "Erreur lors de la creation");
      }
    } catch {
      setError("Erreur reseau");
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-6 w-full max-w-md">
        <h2 className="text-xl font-bold text-white mb-4">Creer un nouvel utilisateur</h2>

        {error && <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-white/60 text-sm mb-2">Nom complet</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-gold/40"
              placeholder="Jean Dupont"
            />
          </div>

          <div>
            <label className="block text-white/60 text-sm mb-2">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-gold/40"
              placeholder="jean@example.com"
            />
          </div>

          <div>
            <label className="block text-white/60 text-sm mb-2">Pseudo</label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-gold/40"
              placeholder="jeandupont"
            />
          </div>

          <div>
            <label className="block text-white/60 text-sm mb-2">Role</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-gold/40"
            >
              <option value="client" className="bg-[#0a0a0a]">
                Client
              </option>
              <option value="artist" className="bg-[#0a0a0a]">
                Artiste
              </option>
              <option value="initiate" className="bg-[#0a0a0a]">
                Initie
              </option>
              <option value="admin" className="bg-[#0a0a0a]">
                Admin
              </option>
            </select>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white hover:bg-white/10 transition-all text-sm font-medium"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-gold text-black rounded-lg hover:bg-gold/90 transition-all text-sm font-medium disabled:opacity-50"
            >
              {loading ? "Creation..." : "Creer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
