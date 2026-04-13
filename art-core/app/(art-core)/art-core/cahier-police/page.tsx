"use client";

import { useState, useEffect } from "react";
import { BookOpen, Plus, Loader2, Search, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";

const CATEGORIES_OBJET = [
  "Meuble", "Tableau", "Sculpture", "Instrument de musique", "Bijou",
  "Céramique", "Argenterie", "Livre ancien", "Objet d'art", "Textile",
  "Horlogerie", "Luminaire", "Verrerie", "Autre"
];

const ETATS = [
  { label: "Excellent", value: "excellent" },
  { label: "Bon", value: "bon" },
  { label: "Correct", value: "correct" },
  { label: "À restaurer", value: "a_restaurer" },
];

interface CahierEntry {
  id: string;
  numero_ordre: number;
  date_entree: string;
  designation: string;
  description_detaillee: string;
  categorie: string;
  matiere: string;
  dimensions: string;
  etat: string;
  provenance: string;
  nom_vendeur: string;
  adresse_vendeur: string;
  piece_identite: string;
  numero_piece: string;
  prix_achat: number;
  prix_vente: number | null;
  date_vente: string | null;
  nom_acheteur: string;
  observations: string;
  photos: string[];
}

export default function CahierPolicePage() {
  const [entries, setEntries] = useState<CahierEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    designation: "", description_detaillee: "", categorie: "Autre",
    matiere: "", dimensions: "", etat: "bon", provenance: "",
    nom_vendeur: "", adresse_vendeur: "", piece_identite: "CNI",
    numero_piece: "", prix_achat: "", observations: "",
  });

  useEffect(() => {
    fetchEntries();
  }, []);

  async function fetchEntries() {
    try {
      const res = await fetch("/api/cahier-police");
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }
      setEntries(data.entries || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.designation) {
      toast({ title: "Désignation requise", variant: "destructive" });
      return;
    }
    if (!form.nom_vendeur) {
      toast({ title: "Nom du vendeur requis (obligation légale)", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/cahier-police", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          prix_achat: form.prix_achat ? parseFloat(form.prix_achat) : 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: `Entrée n°${data.numero_ordre} créée`, description: "Cahier de police mis à jour." });
      setForm({
        designation: "", description_detaillee: "", categorie: "Autre",
        matiere: "", dimensions: "", etat: "bon", provenance: "",
        nom_vendeur: "", adresse_vendeur: "", piece_identite: "CNI",
        numero_piece: "", prix_achat: "", observations: "",
      });
      setShowForm(false);
      fetchEntries();
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  const filtered = entries.filter((e) =>
    e.designation.toLowerCase().includes(search.toLowerCase()) ||
    e.nom_vendeur.toLowerCase().includes(search.toLowerCase()) ||
    e.categorie.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="size-8 animate-spin text-gold" />
    </div>
  );

  if (error) return (
    <div className="max-w-3xl mx-auto px-4 py-12 text-center">
      <BookOpen className="size-12 text-white/20 mx-auto mb-4" />
      <h2 className="text-xl font-semibold text-white mb-2">Cahier de Police</h2>
      <p className="text-white/50">{error}</p>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-playfair text-3xl font-semibold text-white flex items-center gap-3">
            <BookOpen className="size-8 text-gold" />
            Cahier de Police
          </h1>
          <p className="text-white/40 text-sm mt-1">
            Registre obligatoire — Art. 321-7 du Code pénal
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="gap-2">
          <Plus className="size-4" />
          Nouvelle entrée
        </Button>
      </div>

      {/* Formulaire nouvelle entrée */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8 space-y-5">
          <h3 className="text-lg font-semibold text-white mb-1">Enregistrer un objet</h3>
          <p className="text-white/30 text-xs mb-4">Les champs marqués * sont obligatoires par la loi.</p>

          {/* Désignation */}
          <div>
            <Label htmlFor="designation">Désignation de l&apos;objet *</Label>
            <Input id="designation" value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} placeholder="Ex: Violon ancien, table Louis XV..." className="mt-1.5" required />
          </div>

          {/* Catégorie & Matière */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Catégorie</Label>
              <select value={form.categorie} onChange={(e) => setForm({ ...form, categorie: e.target.value })} className="w-full mt-1.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white p-2.5 focus:outline-none focus:border-gold/40">
                {CATEGORIES_OBJET.map((c) => <option key={c} value={c} className="bg-[#1a1a2e]">{c}</option>)}
              </select>
            </div>
            <div>
              <Label htmlFor="matiere">Matière / Matériaux</Label>
              <Input id="matiere" value={form.matiere} onChange={(e) => setForm({ ...form, matiere: e.target.value })} placeholder="Bois, bronze, huile..." className="mt-1.5" />
            </div>
          </div>

          {/* Description & Dimensions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="dimensions">Dimensions</Label>
              <Input id="dimensions" value={form.dimensions} onChange={(e) => setForm({ ...form, dimensions: e.target.value })} placeholder="H120 x L80 x P40 cm" className="mt-1.5" />
            </div>
            <div>
              <Label>État</Label>
              <select value={form.etat} onChange={(e) => setForm({ ...form, etat: e.target.value })} className="w-full mt-1.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white p-2.5 focus:outline-none focus:border-gold/40">
                {ETATS.map((e) => <option key={e.value} value={e.value} className="bg-[#1a1a2e]">{e.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <Label htmlFor="description_detaillee">Description détaillée</Label>
            <textarea id="description_detaillee" value={form.description_detaillee} onChange={(e) => setForm({ ...form, description_detaillee: e.target.value })} rows={3} placeholder="Époque, style, marques, signatures..." className="w-full mt-1.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/30 p-3 resize-none focus:outline-none focus:border-gold/40" />
          </div>

          {/* Provenance */}
          <div className="border-t border-white/10 pt-5">
            <h4 className="text-sm font-semibold text-gold mb-3">Provenance & Vendeur</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="nom_vendeur">Nom du vendeur *</Label>
                <Input id="nom_vendeur" value={form.nom_vendeur} onChange={(e) => setForm({ ...form, nom_vendeur: e.target.value })} placeholder="Nom complet" className="mt-1.5" required />
              </div>
              <div>
                <Label htmlFor="adresse_vendeur">Adresse du vendeur</Label>
                <Input id="adresse_vendeur" value={form.adresse_vendeur} onChange={(e) => setForm({ ...form, adresse_vendeur: e.target.value })} placeholder="Adresse complète" className="mt-1.5" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <div>
                <Label>Pièce d&apos;identité</Label>
                <select value={form.piece_identite} onChange={(e) => setForm({ ...form, piece_identite: e.target.value })} className="w-full mt-1.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white p-2.5 focus:outline-none focus:border-gold/40">
                  <option value="CNI" className="bg-[#1a1a2e]">Carte nationale d&apos;identité</option>
                  <option value="Passeport" className="bg-[#1a1a2e]">Passeport</option>
                  <option value="Permis" className="bg-[#1a1a2e]">Permis de conduire</option>
                  <option value="Titre séjour" className="bg-[#1a1a2e]">Titre de séjour</option>
                </select>
              </div>
              <div>
                <Label htmlFor="numero_piece">N° de pièce</Label>
                <Input id="numero_piece" value={form.numero_piece} onChange={(e) => setForm({ ...form, numero_piece: e.target.value })} placeholder="N° de la pièce d'identité" className="mt-1.5" />
              </div>
            </div>
            <div className="mt-4">
              <Label htmlFor="provenance">Provenance</Label>
              <Input id="provenance" value={form.provenance} onChange={(e) => setForm({ ...form, provenance: e.target.value })} placeholder="Succession, vide-grenier, collection privée..." className="mt-1.5" />
            </div>
          </div>

          {/* Prix */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="prix_achat">Prix d&apos;achat (€)</Label>
              <Input id="prix_achat" type="number" min="0" step="0.01" value={form.prix_achat} onChange={(e) => setForm({ ...form, prix_achat: e.target.value })} placeholder="0" className="mt-1.5" />
            </div>
          </div>

          {/* Observations */}
          <div>
            <Label htmlFor="observations">Observations</Label>
            <textarea id="observations" value={form.observations} onChange={(e) => setForm({ ...form, observations: e.target.value })} rows={2} placeholder="Notes complémentaires..." className="w-full mt-1.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/30 p-3 resize-none focus:outline-none focus:border-gold/40" />
          </div>

          <Button type="submit" size="lg" className="w-full gap-2" disabled={submitting}>
            {submitting ? <Loader2 className="size-4 animate-spin" /> : <BookOpen className="size-4" />}
            Enregistrer dans le cahier
          </Button>
        </form>
      )}

      {/* Recherche */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/30" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher par désignation, vendeur, catégorie..." className="pl-10" />
      </div>

      {/* Liste des entrées */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <BookOpen className="size-12 text-white/10 mx-auto mb-4" />
          <p className="text-white/30">
            {entries.length === 0 ? "Aucune entrée dans le cahier de police" : "Aucun résultat pour cette recherche"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((entry) => (
            <div key={entry.id} className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
              <button onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-white/5 transition-colors">
                <div className="flex items-center gap-4">
                  <span className="text-gold font-mono text-sm font-semibold min-w-[3rem]">
                    N°{String(entry.numero_ordre).padStart(3, "0")}
                  </span>
                  <div>
                    <p className="text-white font-medium">{entry.designation}</p>
                    <p className="text-white/40 text-xs mt-0.5">
                      {entry.categorie} — {entry.date_entree} — Vendeur: {entry.nom_vendeur || "N/A"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {entry.prix_achat > 0 && (
                    <span className="text-sm text-white/50">{entry.prix_achat.toLocaleString("fr-FR")} €</span>
                  )}
                  {expandedId === entry.id ? <ChevronUp className="size-4 text-white/30" /> : <ChevronDown className="size-4 text-white/30" />}
                </div>
              </button>
              {expandedId === entry.id && (
                <div className="px-5 pb-5 border-t border-white/5 pt-4 grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                  <div><span className="text-white/30">Matière:</span> <span className="text-white/70 ml-1">{entry.matiere || "—"}</span></div>
                  <div><span className="text-white/30">Dimensions:</span> <span className="text-white/70 ml-1">{entry.dimensions || "—"}</span></div>
                  <div><span className="text-white/30">État:</span> <span className="text-white/70 ml-1">{entry.etat}</span></div>
                  <div><span className="text-white/30">Provenance:</span> <span className="text-white/70 ml-1">{entry.provenance || "—"}</span></div>
                  <div><span className="text-white/30">Adresse vendeur:</span> <span className="text-white/70 ml-1">{entry.adresse_vendeur || "—"}</span></div>
                  <div><span className="text-white/30">Pièce d&apos;identité:</span> <span className="text-white/70 ml-1">{entry.piece_identite} {entry.numero_piece}</span></div>
                  {entry.description_detaillee && (
                    <div className="col-span-2"><span className="text-white/30">Description:</span> <span className="text-white/70 ml-1">{entry.description_detaillee}</span></div>
                  )}
                  {entry.observations && (
                    <div className="col-span-2"><span className="text-white/30">Observations:</span> <span className="text-white/70 ml-1">{entry.observations}</span></div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Footer légal */}
      <div className="mt-8 p-4 bg-gold/5 border border-gold/10 rounded-xl text-xs text-white/40 leading-relaxed">
        <strong className="text-gold/60">Information légale :</strong> Conformément aux articles 321-7 et 321-8 du Code pénal et au décret n°81-255 du 3 mars 1981, tout professionnel achetant ou détenant des objets mobiliers usagés ou acquis de personnes autres que ceux qui les fabriquent ou en font le commerce est tenu de tenir un registre (cahier de police). Ce registre doit être conservé pendant 5 ans.
      </div>
    </div>
  );
}
