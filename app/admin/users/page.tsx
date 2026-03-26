"use client";

import { useState } from "react";
import { Search, Eye, Ban, Loader2, ChevronLeft, ChevronRight } from "lucide-react";

const roles = ["Tous", "Artiste", "Initié", "Client", "Propriétaire"] as const;

const mockUsers = [
  { id: 1, name: "Marie Dupont", email: "marie@art.fr", role: "Artiste", date: "2025-12-04", status: "actif", avatar: "MD" },
  { id: 2, name: "Jean-Pierre Roux", email: "jp.roux@mail.com", role: "Initié", date: "2026-01-15", status: "actif", avatar: "JR" },
  { id: 3, name: "Sophie Laurent", email: "sophie.l@mail.com", role: "Client", date: "2026-01-22", status: "actif", avatar: "SL" },
  { id: 4, name: "Thomas Bernard", email: "t.bernard@art.fr", role: "Artiste", date: "2026-02-01", status: "suspendu", avatar: "TB" },
  { id: 5, name: "Claire Moreau", email: "claire.m@mail.com", role: "Propriétaire", date: "2026-02-10", status: "actif", avatar: "CM" },
  { id: 6, name: "Lucas Petit", email: "lucas.p@mail.com", role: "Client", date: "2026-02-18", status: "actif", avatar: "LP" },
  { id: 7, name: "Emma Leroy", email: "emma.leroy@art.fr", role: "Artiste", date: "2026-03-01", status: "actif", avatar: "EL" },
  { id: 8, name: "Hugo Martin", email: "hugo.m@mail.com", role: "Initié", date: "2026-03-12", status: "suspendu", avatar: "HM" },
];

const roleBadgeColor: Record<string, string> = {
  Artiste: "bg-[#D4AF37]/20 text-[#D4AF37]",
  Initié: "bg-purple-500/20 text-purple-400",
  Client: "bg-blue-500/20 text-blue-400",
  Propriétaire: "bg-emerald-500/20 text-emerald-400",
};

export default function AdminUsers() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("Tous");

  const filtered = mockUsers.filter((u) => {
    const matchSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === "Tous" || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  return (
    <div className="animate-fade-in space-y-6">
      <h1 className="font-playfair text-2xl md:text-3xl font-bold text-white">
        Utilisateurs
      </h1>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/30" />
          <input
            type="text"
            placeholder="Rechercher par nom ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#D4AF37]/50"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {roles.map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                roleFilter === r
                  ? "bg-[#D4AF37] text-black"
                  : "bg-white/[0.03] border border-white/10 text-white/60 hover:text-white"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white/[0.03] border border-white/10 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-3 px-4 text-white/40 font-medium">Utilisateur</th>
                <th className="text-left py-3 px-4 text-white/40 font-medium hidden md:table-cell">Email</th>
                <th className="text-left py-3 px-4 text-white/40 font-medium">Rôle</th>
                <th className="text-left py-3 px-4 text-white/40 font-medium hidden lg:table-cell">Inscription</th>
                <th className="text-left py-3 px-4 text-white/40 font-medium">Status</th>
                <th className="text-right py-3 px-4 text-white/40 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr
                  key={u.id}
                  className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="size-8 rounded-full bg-[#D4AF37]/20 flex items-center justify-center text-xs font-bold text-[#D4AF37]">
                        {u.avatar}
                      </div>
                      <span className="text-white font-medium">{u.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-white/50 hidden md:table-cell">{u.email}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-md text-xs font-medium ${roleBadgeColor[u.role]}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-white/50 hidden lg:table-cell">{u.date}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-medium ${
                        u.status === "actif" ? "text-emerald-400" : "text-[#ff6347]"
                      }`}
                    >
                      <span
                        className={`size-1.5 rounded-full ${
                          u.status === "actif" ? "bg-emerald-400" : "bg-[#ff6347]"
                        }`}
                      />
                      {u.status}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-end gap-2">
                      <button className="p-1.5 rounded-lg hover:bg-white/[0.05] text-white/40 hover:text-[#D4AF37] transition-colors">
                        <Eye className="size-4" />
                      </button>
                      <button className="p-1.5 rounded-lg hover:bg-[#ff6347]/10 text-white/40 hover:text-[#ff6347] transition-colors">
                        <Ban className="size-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-white/30">
                    Aucun utilisateur trouvé
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-white/30">
          {filtered.length} utilisateur{filtered.length !== 1 ? "s" : ""}
        </p>
        <div className="flex items-center gap-2">
          <button className="p-2 rounded-lg bg-white/[0.03] border border-white/10 text-white/40 hover:text-white transition-colors">
            <ChevronLeft className="size-4" />
          </button>
          <span className="text-sm text-white/50 px-2">1 / 1</span>
          <button className="p-2 rounded-lg bg-white/[0.03] border border-white/10 text-white/40 hover:text-white transition-colors">
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
