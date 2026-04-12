"use client";

import { useState, useEffect, useCallback } from "react";
import { Trash2, Eye, EyeOff, Edit3, Check, X, RefreshCw, Shield, AlertTriangle, Users, Package, Download, UserCheck, UserX } from "lucide-react";

interface Artwork {
  id: string;
  title: string;
  artist_name: string;
  artist_id: string;
  category: string;
  status: string;
  price: number;
  photos: string[];
  created_at: string;
}

interface User {
  id: string;
  email: string;
  name: string;
  username: string;
  role: string;
  points_balance: number;
  total_earned: number;
  is_initie: number;
  artworks_count: number;
  purchases_count: number;
  created_at: string;
}

export default function AdminPage() {
  const [tab, setTab] = useState<"artworks" | "users" | "export">("artworks");
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [user, setUser] = useState<any>(null);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState("");

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        if (data.user.role !== "admin") setError("Acces reserve aux administrateurs.");
      } else {
        setError("Connectez-vous avec un compte admin.");
      }
    } catch { setError("Erreur de connexion."); }
  }, []);

  const fetchArtworks = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "200", offset: "0" });
      if (filter !== "all") params.set("status", filter);
      if (search) params.set("search", search);
      const res = await fetch(`/api/artworks?${params}`);
      const data = await res.json();
      setArtworks(data.artworks || []);
    } catch { setError("Impossible de charger les oeuvres."); }
    setLoading(false);
  }, [filter, search]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      setUsers(data.users || []);
    } catch { setError("Impossible de charger les utilisateurs."); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchUser(); }, [fetchUser]);
  useEffect(() => {
    if (user?.role === "admin") {
      if (tab === "artworks") fetchArtworks();
      if (tab === "users") fetchUsers();
    }
  }, [user, tab, fetchArtworks, fetchUsers]);

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
      } else { showMessage(`Erreur : ${data.error}`); }
    } catch { showMessage("Erreur reseau."); }
    setConfirmDelete(null);
  };

  const handleStatusToggle = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "for_sale" ? "certified" : "for_sale";
    try {
      const res = await fetch(`/api/artworks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setArtworks((prev) => prev.map((a) => a.id === id ? { ...a, status: newStatus } : a));
        showMessage(newStatus === "for_sale" ? "Remise en vente." : "Retiree du marketplace.");
      }
    } catch { showMessage("Erreur reseau."); }
  };

  const handlePriceUpdate = async (id: string) => {
    const price = parseFloat(editPrice);
    if (isNaN(price) || price < 0) { showMessage("Prix invalide."); return; }
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
    } catch { showMessage("Erreur reseau."); }
    setEditingId(null);
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
    } catch { showMessage("Erreur reseau."); }
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
    } catch { showMessage("Erreur export."); }
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
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Shield className="size-6 text-gold" />
            <h1 className="text-2xl font-bold text-white">Administration</h1>
          </div>
          <button onClick={() => tab === "artworks" ? fetchArtworks() : fetchUsers()} className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-all text-sm">
            <RefreshCw className="size-4" /> Actualiser
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-white/5 rounded-xl p-1 w-fit">
          {[
            { key: "artworks" as const, icon: Package, label: "Oeuvres", count: artworks.length },
            { key: "users" as const, icon: Users, label: "Utilisateurs", count: users.length },
            { key: "export" as const, icon: Download, label: "Exporter", count: 0 },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                tab === t.key ? "bg-gold text-black" : "text-white/50 hover:text-white hover:bg-white/5"
              }`}
            >
              <t.icon className="size-4" />
              {t.label}
              {t.count > 0 && <span className={`text-xs px-1.5 py-0.5 rounded-full ${tab === t.key ? "bg-black/20" : "bg-white/10"}`}>{t.count}</span>}
            </button>
          ))}
        </div>

        {/* Message flash */}
        {actionMessage && (
          <div className="mb-4 px-4 py-3 bg-gold/10 border border-gold/30 rounded-lg text-gold text-sm">{actionMessage}</div>
        )}

        {/* ═══ ONGLET OEUVRES ═══ */}
        {tab === "artworks" && (
          <>
            <div className="flex flex-wrap gap-3 mb-6">
              <input type="text" placeholder="Rechercher par titre ou artiste..." value={search} onChange={(e) => setSearch(e.target.value)}
                className="flex-1 min-w-[200px] px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-gold/40" />
              {["all", "for_sale", "certified", "sold"].map((s) => (
                <button key={s} onClick={() => setFilter(s)}
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${filter === s ? "bg-gold text-black" : "bg-white/5 text-white/50 hover:bg-white/10"}`}>
                  {s === "all" ? "Tout" : s === "for_sale" ? "En vente" : s === "certified" ? "Certifie" : "Vendu"}
                </button>
              ))}
            </div>

            {loading ? <p className="text-white/30 text-center py-8">Chargement...</p> : (
              <div className="border border-white/8 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-white/5 text-white/40 text-left">
                      <th className="px-4 py-3 font-medium">Oeuvre</th>
                      <th className="px-4 py-3 font-medium">Artiste</th>
                      <th className="px-4 py-3 font-medium">Cat.</th>
                      <th className="px-4 py-3 font-medium">Prix</th>
                      <th className="px-4 py-3 font-medium">Statut</th>
                      <th className="px-4 py-3 font-medium">Date</th>
                      <th className="px-4 py-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {artworks.map((art) => (
                      <tr key={art.id} className="border-t border-white/5 hover:bg-white/[0.02]">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {art.photos?.[0] ? <img src={art.photos[0]} alt="" className="w-10 h-10 rounded-lg object-cover bg-white/5" /> : <div className="w-10 h-10 rounded-lg bg-white/5" />}
                            <a href={`/art-core/oeuvre/${art.id}`} className="text-white hover:text-gold font-medium truncate max-w-[200px]">{art.title}</a>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-white/50">{art.artist_name}</td>
                        <td className="px-4 py-3 text-white/40">{art.category}</td>
                        <td className="px-4 py-3">
                          {editingId === art.id ? (
                            <div className="flex items-center gap-1">
                              <input type="number" value={editPrice} onChange={(e) => setEditPrice(e.target.value)}
                                className="w-20 px-2 py-1 bg-white/10 border border-gold/40 rounded text-white text-xs focus:outline-none" autoFocus />
                              <button onClick={() => handlePriceUpdate(art.id)} className="p-1 text-green-400 hover:bg-green-400/10 rounded"><Check className="size-3" /></button>
                              <button onClick={() => setEditingId(null)} className="p-1 text-red-400 hover:bg-red-400/10 rounded"><X className="size-3" /></button>
                            </div>
                          ) : (
                            <button onClick={() => { setEditingId(art.id); setEditPrice(String(art.price)); }} className="text-gold hover:underline flex items-center gap-1">
                              {art.price} € <Edit3 className="size-3 opacity-40" />
                            </button>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                            art.status === "for_sale" ? "bg-green-500/10 text-green-400" : art.status === "sold" ? "bg-blue-500/10 text-blue-400" : "bg-yellow-500/10 text-yellow-400"
                          }`}>
                            {art.status === "for_sale" ? "En vente" : art.status === "sold" ? "Vendu" : "Certifie"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-white/30 text-xs">{art.created_at ? new Date(art.created_at).toLocaleDateString("fr-FR") : ""}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => handleStatusToggle(art.id, art.status)}
                              title={art.status === "for_sale" ? "Retirer" : "Remettre en vente"}
                              className={`p-2 rounded-lg transition-all ${art.status === "for_sale" ? "text-yellow-400 hover:bg-yellow-400/10" : "text-green-400 hover:bg-green-400/10"}`}>
                              {art.status === "for_sale" ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                            </button>
                            {confirmDelete === art.id ? (
                              <div className="flex items-center gap-1 bg-red-500/10 rounded-lg px-2 py-1">
                                <span className="text-red-400 text-xs">Supprimer ?</span>
                                <button onClick={() => handleDelete(art.id)} className="p-1 text-red-400"><Check className="size-3" /></button>
                                <button onClick={() => setConfirmDelete(null)} className="p-1 text-white/40"><X className="size-3" /></button>
                              </div>
                            ) : (
                              <button onClick={() => setConfirmDelete(art.id)} className="p-2 rounded-lg text-red-400/50 hover:text-red-400 hover:bg-red-400/10">
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
            {loading ? <p className="text-white/30 text-center py-8">Chargement...</p> : (
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
                      <th className="px-4 py-3 font-medium">Inscrit le</th>
                      <th className="px-4 py-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} className="border-t border-white/5 hover:bg-white/[0.02]">
                        <td className="px-4 py-3">
                          <div>
                            <p className="text-white font-medium">{u.name}</p>
                            <p className="text-white/30 text-xs">@{u.username}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-white/50 text-xs">{u.email}</td>
                        <td className="px-4 py-3">
                          <select value={u.role} onChange={(e) => handleRoleChange(u.id, e.target.value)}
                            className="bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-gold/40">
                            <option value="client" className="bg-[#0a0a0a]">Client</option>
                            <option value="artist" className="bg-[#0a0a0a]">Artiste</option>
                            <option value="initiate" className="bg-[#0a0a0a]">Initie</option>
                            <option value="admin" className="bg-[#0a0a0a]">Admin</option>
                          </select>
                        </td>
                        <td className="px-4 py-3 text-gold text-xs">{u.points_balance} pts</td>
                        <td className="px-4 py-3 text-white/50 text-xs">{u.artworks_count}</td>
                        <td className="px-4 py-3 text-white/50 text-xs">{u.purchases_count}</td>
                        <td className="px-4 py-3 text-white/30 text-xs">{u.created_at ? new Date(u.created_at).toLocaleDateString("fr-FR") : ""}</td>
                        <td className="px-4 py-3 text-right">
                          <a href={`/art-core/profil/${u.id}`} className="text-gold/60 hover:text-gold text-xs">Voir profil</a>
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

        {/* ═══ ONGLET EXPORT ═══ */}
        {tab === "export" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { type: "users", icon: Users, title: "Utilisateurs", desc: "Tous les comptes, roles, points, statistiques" },
              { type: "artworks", icon: Package, title: "Oeuvres", desc: "Catalogue complet avec artistes, prix, statuts" },
              { type: "all", icon: Download, title: "Export complet", desc: "Utilisateurs + oeuvres + transactions" },
            ].map((exp) => (
              <button key={exp.type} onClick={() => handleExport(exp.type)}
                className="group p-6 bg-white/[0.02] border border-white/8 rounded-2xl hover:border-gold/30 hover:bg-white/[0.04] transition-all text-left">
                <exp.icon className="size-8 text-gold/60 group-hover:text-gold mb-4 transition-colors" />
                <h3 className="text-white font-bold mb-1">{exp.title}</h3>
                <p className="text-white/40 text-sm mb-4">{exp.desc}</p>
                <span className="text-gold text-sm font-medium">Telecharger JSON</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
