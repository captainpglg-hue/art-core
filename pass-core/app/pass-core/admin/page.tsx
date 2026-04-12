"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  BarChart3,
  Users,
  Package,
  Download,
  Search,
  ChevronDown,
  Eye,
  Trash2,
  Edit3,
  CheckCircle,
  XCircle,
  TrendingUp,
  Shield,
  Award,
  Fingerprint,
  AlertTriangle,
  ChevronLeft,
  RefreshCw,
  LogOut,
} from "lucide-react";

interface Stats {
  totalCertifications: number;
  totalUsers: number;
  certificationsThisMonth: number;
  blockchainAnchored: number;
  recentCertifications: any[];
  monthlyCertifications: { month: string; count: number }[];
  usersByRole: { role: string; count: number }[];
  artworksByStatus: { status: string; count: number }[];
}

interface Artwork {
  id: string;
  title: string;
  artist_name: string;
  blockchain_hash: string | null;
  blockchain_tx_id: string | null;
  macro_quality_score: number | null;
  certification_date: string | null;
  status: string;
  created_at: string;
}

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  points_balance: number;
  created_at: string;
  artwork_count: number;
}

interface AllArtwork {
  id: string;
  title: string;
  artist_name: string;
  category: string;
  price: number;
  status: string;
  blockchain_hash: string | null;
  created_at: string;
  macro_photo: string | null;
}

export default function AdminPanel() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<
    "dashboard" | "certifications" | "users" | "artworks" | "export"
  >("dashboard");
  const [stats, setStats] = useState<Stats | null>(null);
  const [certifications, setCertifications] = useState<Artwork[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [allArtworks, setAllArtworks] = useState<AllArtwork[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterRole, setFilterRole] = useState<string>("");
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingUserData, setEditingUserData] = useState<any>({});
  const [expandedCertId, setExpandedCertId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/stats");
      if (!res.ok) throw new Error("Failed to fetch stats");
      const data = await res.json();
      setStats(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCertifications = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/certifications");
      if (!res.ok) throw new Error("Failed to fetch certifications");
      const data = await res.json();
      setCertifications(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/users");
      if (!res.ok) throw new Error("Failed to fetch users");
      const data = await res.json();
      setUsers(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAllArtworks = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/artworks");
      if (!res.ok) throw new Error("Failed to fetch artworks");
      const data = await res.json();
      setAllArtworks(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Check admin authentication
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/admin/auth/me");
        if (!res.ok) {
          router.push("/pass-core/admin/login");
          return;
        }
        const data = await res.json();
        setCurrentUser(data.user);
      } catch (err) {
        router.push("/pass-core/admin/login");
      }
    };
    checkAuth();
  }, [router]);

  // Handle logout
  const handleLogout = async () => {
    try {
      await fetch("/api/admin/auth/logout", { method: "POST" });
      router.push("/pass-core/admin/login");
    } catch (err: any) {
      setError("Erreur lors de la déconnexion");
    }
  };

  useEffect(() => {
    if (activeTab === "dashboard") {
      fetchStats();
    } else if (activeTab === "certifications") {
      fetchCertifications();
    } else if (activeTab === "users") {
      fetchUsers();
    } else if (activeTab === "artworks") {
      fetchAllArtworks();
    }
  }, [activeTab, fetchStats, fetchCertifications, fetchUsers, fetchAllArtworks]);

  const handleRevokeCertification = async (artworkId: string) => {
    if (!confirm("Révoquer cette certification ?")) return;
    try {
      const res = await fetch("/api/admin/certifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ artwork_id: artworkId, action: "revoke" }),
      });
      if (!res.ok) throw new Error("Failed to revoke");
      fetchCertifications();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleUpdateCertificationStatus = async (
    artworkId: string,
    newStatus: string
  ) => {
    try {
      const res = await fetch("/api/admin/certifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artwork_id: artworkId,
          action: "update_status",
          status: newStatus,
        }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      fetchCertifications();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleUpdateUser = async (userId: string) => {
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          ...editingUserData,
        }),
      });
      if (!res.ok) throw new Error("Failed to update user");
      setEditingUserId(null);
      setEditingUserData({});
      fetchUsers();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleDeleteArtwork = async (artworkId: string) => {
    if (!confirm("Supprimer cette œuvre ?")) return;
    try {
      const res = await fetch("/api/admin/artworks", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ artwork_id: artworkId }),
      });
      if (!res.ok) throw new Error("Failed to delete artwork");
      fetchAllArtworks();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleUpdateArtwork = async (
    artworkId: string,
    updates: any
  ) => {
    try {
      const res = await fetch("/api/admin/artworks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          artwork_id: artworkId,
          ...updates,
        }),
      });
      if (!res.ok) throw new Error("Failed to update artwork");
      fetchAllArtworks();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleExport = async (type: string) => {
    try {
      const res = await fetch(`/api/admin/export?type=${type}`);
      if (!res.ok) throw new Error("Failed to export");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `export_${type}_${new Date().toISOString().split("T")[0]}.json`;
      a.click();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const filteredCertifications = certifications.filter((cert) => {
    const matchesSearch =
      cert.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cert.artist_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (cert.blockchain_hash || "")
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
    const matchesStatus = !filterStatus || cert.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = !filterRole || user.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const filteredArtworks = allArtworks.filter((art) => {
    return (
      art.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      art.artist_name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className="min-h-screen bg-[#0A1128] text-white pt-20">
      {/* Header */}
      <div className="border-b border-white/10 sticky top-16 z-30 bg-[#0A1128]/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-4">
              <Link href="/pass-core" className="text-white/40 hover:text-white/60">
                <ChevronLeft className="size-5" />
              </Link>
              <h1 className="text-2xl font-display font-semibold">
                Tableau d&apos;administration
              </h1>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
            >
              <LogOut className="size-4" />
              Déconnexion
            </button>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-sm mb-4">
              <AlertTriangle className="size-4" />
              {error}
              <button
                onClick={() => setError("")}
                className="ml-auto text-red-300/60 hover:text-red-300"
              >
                ×
              </button>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {(
              [
                { id: "dashboard", label: "Tableau de bord", icon: BarChart3 },
                { id: "certifications", label: "Certifications", icon: Award },
                { id: "users", label: "Utilisateurs", icon: Users },
                { id: "artworks", label: "Œuvres", icon: Package },
                { id: "export", label: "Exporter", icon: Download },
              ] as const
            ).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => {
                  setActiveTab(id);
                  setSearchQuery("");
                  setFilterStatus("");
                  setFilterRole("");
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === id
                    ? "bg-[#D4AF37] text-[#0A1128]"
                    : "bg-white/5 text-white/60 hover:bg-white/10"
                }`}
              >
                <Icon className="size-4" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8">
        {/* Dashboard Tab */}
        {activeTab === "dashboard" && (
          <div className="space-y-8">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  label: "Certifications totales",
                  value: stats?.totalCertifications || 0,
                  icon: Award,
                  color: "#D4AF37",
                },
                {
                  label: "Utilisateurs",
                  value: stats?.totalUsers || 0,
                  icon: Users,
                  color: "#60A5FA",
                },
                {
                  label: "Ce mois-ci",
                  value: stats?.certificationsThisMonth || 0,
                  icon: TrendingUp,
                  color: "#34D399",
                },
                {
                  label: "Ancrées blockchain",
                  value: stats?.blockchainAnchored || 0,
                  icon: Fingerprint,
                  color: "#A78BFA",
                },
              ].map(({ label, value, icon: Icon, color }) => (
                <div
                  key={label}
                  className="rounded-2xl border border-white/10 bg-white/5 p-6 hover:border-white/20 transition-all"
                >
                  <div className="flex items-start justify-between mb-4">
                    <p className="text-white/50 text-sm">{label}</p>
                    <div
                      style={{ background: `${color}15` }}
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                    >
                      <Icon style={{ color }} className="size-5" />
                    </div>
                  </div>
                  <p className="text-3xl font-bold">{value}</p>
                </div>
              ))}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Monthly Certifications Chart */}
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
                <h3 className="font-display text-lg font-semibold mb-6">
                  Certifications par mois (6 derniers mois)
                </h3>
                <div className="space-y-4">
                  {stats?.monthlyCertifications.map((item) => {
                    const maxCount = Math.max(
                      ...(stats?.monthlyCertifications.map((m) => m.count) || [1])
                    );
                    const percentage = (item.count / maxCount) * 100;
                    return (
                      <div key={item.month}>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm text-white/60">{item.month}</span>
                          <span className="text-sm font-semibold">{item.count}</span>
                        </div>
                        <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                          <div
                            style={{
                              width: `${percentage}%`,
                              background: "#D4AF37",
                            }}
                            className="h-full rounded-full transition-all"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Status Distribution */}
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
                <h3 className="font-display text-lg font-semibold mb-6">
                  Distribution par statut
                </h3>
                <div className="space-y-3">
                  {stats?.artworksByStatus.map((item) => (
                    <div key={item.status} className="flex items-center justify-between">
                      <span className="text-sm text-white/60 capitalize">
                        {item.status}
                      </span>
                      <div className="flex items-center gap-3">
                        <div className="w-32 h-2 rounded-full bg-white/10 overflow-hidden">
                          <div
                            style={{
                              width: `${
                                (item.count /
                                  (stats?.totalCertifications || 1)) *
                                100
                              }%`,
                              background:
                                item.status === "certified"
                                  ? "#34D399"
                                  : item.status === "for_sale"
                                  ? "#D4AF37"
                                  : "#EF4444",
                            }}
                            className="h-full"
                          />
                        </div>
                        <span className="text-sm font-semibold w-8 text-right">
                          {item.count}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recent Certifications */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
              <h3 className="font-display text-lg font-semibold mb-6">
                Dernières certifications
              </h3>
              <div className="space-y-3">
                {stats?.recentCertifications.map((cert) => (
                  <div
                    key={cert.id}
                    className="flex items-center justify-between p-4 rounded-lg border border-white/5 bg-white/[0.02] hover:border-white/10 transition-all"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-white">{cert.title}</p>
                      <p className="text-sm text-white/40">{cert.artist_name}</p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2 justify-end mb-1">
                        <CheckCircle className="size-4 text-green-400" />
                        <span className="text-sm font-mono text-green-300">
                          {(cert.blockchain_hash || "").slice(0, 16)}...
                        </span>
                      </div>
                      <p className="text-xs text-white/40">
                        {new Date(cert.certification_date).toLocaleDateString(
                          "fr-FR"
                        )}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Certifications Tab */}
        {activeTab === "certifications" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/30" />
                <input
                  type="text"
                  placeholder="Chercher par titre, artiste ou hash..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-[#D4AF37]/50"
                />
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-[#D4AF37]/50"
              >
                <option value="">Tous les statuts</option>
                <option value="certified">Certifié</option>
                <option value="for_sale">À vendre</option>
                <option value="pending_sale">Vente en attente</option>
                <option value="sold">Vendu</option>
              </select>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-white/10 bg-white/[0.02]">
                    <tr className="text-left text-xs font-semibold text-white/60 uppercase tracking-wider">
                      <th className="px-6 py-4">Titre</th>
                      <th className="px-6 py-4">Artiste</th>
                      <th className="px-6 py-4">Hash</th>
                      <th className="px-6 py-4">TX ID</th>
                      <th className="px-6 py-4">Qualité</th>
                      <th className="px-6 py-4">Date</th>
                      <th className="px-6 py-4">Statut</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredCertifications.map((cert) => (
                      <tr
                        key={cert.id}
                        className="hover:bg-white/[0.02] transition-colors"
                      >
                        <td className="px-6 py-4">
                          <p className="font-medium text-white">{cert.title}</p>
                        </td>
                        <td className="px-6 py-4 text-sm text-white/60">
                          {cert.artist_name}
                        </td>
                        <td className="px-6 py-4">
                          <code className="text-xs font-mono text-[#D4AF37]">
                            {(cert.blockchain_hash || "").slice(0, 12)}...
                          </code>
                        </td>
                        <td className="px-6 py-4">
                          <code className="text-xs font-mono text-white/40">
                            {(cert.blockchain_tx_id || "").slice(0, 12)}...
                          </code>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-white/60">
                            {cert.macro_quality_score || "—"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-white/40">
                          {new Date(cert.certification_date || "").toLocaleDateString(
                            "fr-FR"
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <select
                            value={cert.status}
                            onChange={(e) =>
                              handleUpdateCertificationStatus(cert.id, e.target.value)
                            }
                            className="px-2 py-1 text-xs rounded bg-white/5 border border-white/10 text-white focus:outline-none focus:border-[#D4AF37]/50"
                          >
                            <option value="certified">Certifié</option>
                            <option value="for_sale">À vendre</option>
                            <option value="pending_sale">En attente</option>
                            <option value="sold">Vendu</option>
                          </select>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => setExpandedCertId(
                              expandedCertId === cert.id ? null : cert.id
                            )}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium bg-white/10 text-white/60 hover:bg-white/15 hover:text-white transition-all"
                          >
                            <Eye className="size-3" />
                            Détails
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Expanded Details */}
            {expandedCertId && (
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-display text-lg font-semibold">Détails</h3>
                  <button
                    onClick={() => setExpandedCertId(null)}
                    className="text-white/40 hover:text-white"
                  >
                    ×
                  </button>
                </div>

                {filteredCertifications
                  .filter((c) => c.id === expandedCertId)
                  .map((cert) => (
                    <div key={cert.id} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-white/50">Blockchain Hash</p>
                          <code className="font-mono text-white break-all">
                            {cert.blockchain_hash}
                          </code>
                        </div>
                        <div>
                          <p className="text-white/50">Transaction ID</p>
                          <code className="font-mono text-white break-all">
                            {cert.blockchain_tx_id}
                          </code>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <button
                          onClick={() => handleRevokeCertification(cert.id)}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-sm font-medium hover:bg-red-500/20 transition-all"
                        >
                          <Trash2 className="size-4" />
                          Révoquer
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* Users Tab */}
        {activeTab === "users" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/30" />
                <input
                  type="text"
                  placeholder="Chercher par email ou nom..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-[#D4AF37]/50"
                />
              </div>
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-[#D4AF37]/50"
              >
                <option value="">Tous les rôles</option>
                <option value="artist">Artiste</option>
                <option value="client">Client</option>
                <option value="initiate">Initié</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-white/10 bg-white/[0.02]">
                    <tr className="text-left text-xs font-semibold text-white/60 uppercase tracking-wider">
                      <th className="px-6 py-4">Nom</th>
                      <th className="px-6 py-4">Email</th>
                      <th className="px-6 py-4">Rôle</th>
                      <th className="px-6 py-4">Points</th>
                      <th className="px-6 py-4">Œuvres</th>
                      <th className="px-6 py-4">Date création</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredUsers.map((user) => (
                      <tr
                        key={user.id}
                        className="hover:bg-white/[0.02] transition-colors"
                      >
                        <td className="px-6 py-4">
                          <p className="font-medium text-white">{user.name}</p>
                        </td>
                        <td className="px-6 py-4 text-sm text-white/60">
                          {user.email}
                        </td>
                        <td className="px-6 py-4">
                          {editingUserId === user.id ? (
                            <select
                              value={editingUserData.role || user.role}
                              onChange={(e) =>
                                setEditingUserData({
                                  ...editingUserData,
                                  role: e.target.value,
                                })
                              }
                              className="px-2 py-1 text-xs rounded bg-white/5 border border-white/10 text-white focus:outline-none focus:border-[#D4AF37]/50"
                            >
                              <option value="artist">Artiste</option>
                              <option value="client">Client</option>
                              <option value="initiate">Initié</option>
                              <option value="admin">Admin</option>
                            </select>
                          ) : (
                            <span className="px-2 py-1 text-xs rounded-full bg-[#D4AF37]/10 text-[#D4AF37]">
                              {user.role}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-white/60">
                          {editingUserId === user.id ? (
                            <input
                              type="number"
                              value={editingUserData.points_balance !== undefined ? editingUserData.points_balance : user.points_balance}
                              onChange={(e) =>
                                setEditingUserData({
                                  ...editingUserData,
                                  points_balance: parseInt(e.target.value),
                                })
                              }
                              className="w-20 px-2 py-1 text-xs rounded bg-white/5 border border-white/10 text-white focus:outline-none focus:border-[#D4AF37]/50"
                            />
                          ) : (
                            user.points_balance
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-white/60">
                          {user.artwork_count}
                        </td>
                        <td className="px-6 py-4 text-sm text-white/40">
                          {new Date(user.created_at).toLocaleDateString("fr-FR")}
                        </td>
                        <td className="px-6 py-4 text-right">
                          {editingUserId === user.id ? (
                            <div className="flex gap-2 justify-end">
                              <button
                                onClick={() => handleUpdateUser(user.id)}
                                className="px-3 py-1.5 rounded text-xs font-medium bg-green-500/10 text-green-300 hover:bg-green-500/20 transition-all"
                              >
                                Enregistrer
                              </button>
                              <button
                                onClick={() => {
                                  setEditingUserId(null);
                                  setEditingUserData({});
                                }}
                                className="px-3 py-1.5 rounded text-xs font-medium bg-white/10 text-white/60 hover:bg-white/15 transition-all"
                              >
                                Annuler
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setEditingUserId(user.id);
                                setEditingUserData({
                                  role: user.role,
                                  points_balance: user.points_balance,
                                });
                              }}
                              className="inline-flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium bg-white/10 text-white/60 hover:bg-white/15 hover:text-white transition-all"
                            >
                              <Edit3 className="size-3" />
                              Éditer
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Artworks Tab */}
        {activeTab === "artworks" && (
          <div className="space-y-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/30" />
              <input
                type="text"
                placeholder="Chercher par titre ou artiste..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-[#D4AF37]/50"
              />
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-white/10 bg-white/[0.02]">
                    <tr className="text-left text-xs font-semibold text-white/60 uppercase tracking-wider">
                      <th className="px-6 py-4">Titre</th>
                      <th className="px-6 py-4">Artiste</th>
                      <th className="px-6 py-4">Catégorie</th>
                      <th className="px-6 py-4">Prix</th>
                      <th className="px-6 py-4">Statut</th>
                      <th className="px-6 py-4">Certifié</th>
                      <th className="px-6 py-4">Créée</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredArtworks.map((art) => (
                      <tr key={art.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-6 py-4">
                          <p className="font-medium text-white">{art.title}</p>
                        </td>
                        <td className="px-6 py-4 text-sm text-white/60">
                          {art.artist_name}
                        </td>
                        <td className="px-6 py-4 text-sm text-white/60 capitalize">
                          {art.category}
                        </td>
                        <td className="px-6 py-4 text-sm text-white/60">
                          {art.price ? `€${art.price}` : "—"}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-2 py-1 text-xs rounded-full font-medium ${
                              art.status === "certified"
                                ? "bg-green-500/10 text-green-300"
                                : art.status === "for_sale"
                                ? "bg-[#D4AF37]/10 text-[#D4AF37]"
                                : "bg-white/5 text-white/60"
                            }`}
                          >
                            {art.status === "for_sale"
                              ? "À vendre"
                              : art.status === "certified"
                              ? "Certifié"
                              : art.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {art.blockchain_hash ? (
                            <CheckCircle className="size-4 text-green-400" />
                          ) : (
                            <XCircle className="size-4 text-white/20" />
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-white/40">
                          {new Date(art.created_at).toLocaleDateString("fr-FR")}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleDeleteArtwork(art.id)}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium bg-red-500/10 text-red-300 hover:bg-red-500/20 transition-all"
                          >
                            <Trash2 className="size-3" />
                            Supprimer
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Export Tab */}
        {activeTab === "export" && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8">
              <h3 className="font-display text-lg font-semibold mb-6">
                Exporter les données
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  {
                    label: "Certifications",
                    desc: "Toutes les œuvres certifiées",
                    icon: Award,
                    type: "certifications",
                  },
                  {
                    label: "Utilisateurs",
                    desc: "Tous les utilisateurs du système",
                    icon: Users,
                    type: "users",
                  },
                  {
                    label: "Œuvres",
                    desc: "Toutes les œuvres",
                    icon: Package,
                    type: "artworks",
                  },
                  {
                    label: "Données complètes",
                    desc: "Export total du système",
                    icon: Download,
                    type: "all",
                  },
                ].map(({ label, desc, icon: Icon, type }) => (
                  <button
                    key={type}
                    onClick={() => handleExport(type)}
                    className="flex flex-col items-start gap-3 p-6 rounded-xl border border-white/10 bg-white/[0.02] hover:border-[#D4AF37]/50 hover:bg-white/[0.04] transition-all text-left"
                  >
                    <div className="p-2 rounded-lg bg-[#D4AF37]/10">
                      <Icon className="size-5 text-[#D4AF37]" />
                    </div>
                    <div>
                      <p className="font-medium text-white">{label}</p>
                      <p className="text-sm text-white/40 mt-1">{desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-blue-500/[0.02] p-6 flex items-start gap-4">
              <div className="p-2 rounded-lg bg-blue-500/10 shrink-0 mt-1">
                <AlertTriangle className="size-5 text-blue-400" />
              </div>
              <div>
                <p className="font-medium text-blue-200">Format d'export</p>
                <p className="text-sm text-blue-200/60 mt-1">
                  Les données sont exportées au format JSON. Les fichiers incluent
                  tous les champs et peuvent être importés ultérieurement dans d'autres
                  systèmes.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
