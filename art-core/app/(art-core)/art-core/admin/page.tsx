"use client";

import { useState, useEffect, useCallback } from "react";
import { Trash2, Eye, EyeOff, Edit3, Check, X, RefreshCw, Shield, AlertTriangle } from "lucide-react";

interface Artwork {
  id: string;
  title: string;
  artist_name: string;
  artist_id: string;
  category: string;
  status: string;
  price: number;
  photos: string[];
  certification_status?: string;
  created_at: string;
  gauge_points?: number;
  views_count?: number;
}

export default function AdminPage() {
  const [artworks, setArtworks] = useState<Artwork[]>([]);
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
        if (data.user.role !== "admin") setError("Accès réservé aux administrateurs.");
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

  useEffect(() => { fetchUser(); }, [fetchUser]);
  useEffect(() => { if (user?.role === "admin") fetchArtworks(); }, [user, fetchArtworks]);

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
        showMessage(`"${data.title}" supprimée.`);
      } else {
        showMessage(`Erreur : ${data.error}`);
      }
    } catch { showMessage("Erreur réseau."); }
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
        showMessage(newStatus === "for_sale" ? "Remise en vente." : "Retirée du marketplace.");
      }
    } catch { showMessage("Erreur réseau."); }
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
        showMessage("Prix mis à jour.");
      }
    } catch { showMessage("Erreur réseau."); }
    setEditingId(null);
  };

  if (error && !user) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertTriangle className="size-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">Accès restreint</h1>
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
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Shield className="size-6 text-gold" />
              <h1 className="text-2xl font-bold text-white">Administration</h1>
            </div>
            <p className="text-white/40 text-sm">{artworks.length} oeuvres au total</p>
          </div>
          <button onClick={fetchArtworks} className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-all text-sm">
            <RefreshCw className="size-4" /> Actualiser
          </button>
        </div>

        {/* Message flash */}
        {actionMessage && (
          <div className="mb-4 px-4 py-3 bg-gold/10 border border-gold/30 rounded-lg text-gold text-sm">{actionMessage}</div>
        )}

        {/* Filtres */}
        <div className="flex flex-wrap gap-3 mb-6">
          <input
            type="text"
            placeholder="Rechercher par titre ou artiste..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-[200px] px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-gold/40"
          />
          {["all", "for_sale", "certified", "sold", "pending_sale"].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                filter === s ? "bg-gold text-black" : "bg-white/5 text-white/50 hover:bg-white/10"
              }`}
            >
              {s === "all" ? "Tout" : s === "for_sale" ? "En vente" : s === "certified" ? "Certifié" : s === "sold" ? "Vendu" : "En attente"}
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading && <p className="text-white/30 text-center py-8">Chargement...</p>}

        {/* Table */}
        {!loading && (
          <div className="border border-white/8 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-white/5 text-white/40 text-left">
                  <th className="px-4 py-3 font-medium">Oeuvre</th>
                  <th className="px-4 py-3 font-medium">Artiste</th>
                  <th className="px-4 py-3 font-medium">Catégorie</th>
                  <th className="px-4 py-3 font-medium">Prix</th>
                  <th className="px-4 py-3 font-medium">Statut</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {artworks.map((art) => (
                  <tr key={art.id} className="border-t border-white/5 hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {art.photos?.[0] ? (
                          <img src={art.photos[0]} alt="" className="w-10 h-10 rounded-lg object-cover bg-white/5" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-white/5" />
                        )}
                        <a href={`/art-core/oeuvre/${art.id}`} className="text-white hover:text-gold transition-colors font-medium truncate max-w-[200px]">
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
                          <button onClick={() => handlePriceUpdate(art.id)} className="p-1 text-green-400 hover:bg-green-400/10 rounded"><Check className="size-3" /></button>
                          <button onClick={() => setEditingId(null)} className="p-1 text-red-400 hover:bg-red-400/10 rounded"><X className="size-3" /></button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setEditingId(art.id); setEditPrice(String(art.price)); }}
                          className="text-gold hover:underline flex items-center gap-1"
                        >
                          {art.price} € <Edit3 className="size-3 opacity-40" />
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        art.status === "for_sale" ? "bg-green-500/10 text-green-400" :
                        art.status === "sold" ? "bg-blue-500/10 text-blue-400" :
                        art.status === "certified" ? "bg-yellow-500/10 text-yellow-400" :
                        "bg-white/5 text-white/40"
                      }`}>
                        {art.status === "for_sale" ? "En vente" : art.status === "sold" ? "Vendu" : art.status === "certified" ? "Certifié" : art.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-white/30 text-xs">
                      {art.created_at ? new Date(art.created_at).toLocaleDateString("fr-FR") : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleStatusToggle(art.id, art.status)}
                          title={art.status === "for_sale" ? "Retirer du marketplace" : "Remettre en vente"}
                          className={`p-2 rounded-lg transition-all ${
                            art.status === "for_sale"
                              ? "text-yellow-400 hover:bg-yellow-400/10"
                              : "text-green-400 hover:bg-green-400/10"
                          }`}
                        >
                          {art.status === "for_sale" ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </button>
                        {confirmDelete === art.id ? (
                          <div className="flex items-center gap-1 bg-red-500/10 rounded-lg px-2 py-1">
                            <span className="text-red-400 text-xs">Confirmer ?</span>
                            <button onClick={() => handleDelete(art.id)} className="p-1 text-red-400 hover:text-red-300"><Check className="size-3" /></button>
                            <button onClick={() => setConfirmDelete(null)} className="p-1 text-white/40 hover:text-white"><X className="size-3" /></button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDelete(art.id)}
                            title="Supprimer"
                            className="p-2 rounded-lg text-red-400/50 hover:text-red-400 hover:bg-red-400/10 transition-all"
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
            {artworks.length === 0 && !loading && (
              <p className="text-center text-white/30 py-8">Aucune oeuvre trouvée.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
