"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Check, ShieldCheck, ArrowRight } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const STATUTS = [
  { value: "artist", label: "Artiste", desc: "Je cree mes propres oeuvres", isPro: false },
  { value: "galeriste", label: "Galerie", desc: "Je gere une galerie d'art", isPro: true },
  { value: "antiquaire", label: "Antiquaire", desc: "Je vends des oeuvres anciennes", isPro: true },
  { value: "brocanteur", label: "Brocante", desc: "Brocante / vente d'art", isPro: true },
  { value: "depot_vente", label: "Depot-vente", desc: "Espace de depot-vente", isPro: true },
];

const ROLES_CAHIER_OBLIGATOIRE = ["antiquaire", "brocanteur", "depot_vente"];

function SellerProfileForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const artworkId = searchParams.get("artwork_id");

  const [authChecked, setAuthChecked] = useState(false);
  const [role, setRole] = useState<string>("");
  const [pro, setPro] = useState({
    raison_sociale: "",
    siret: "",
    nom_gerant: "",
    adresse: "",
    code_postal: "",
    ville: "",
    telephone_pro: "",
    cahier_police: false,
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (!d?.user?.id) router.replace("/auth/login?redirectTo=/art-core/deposer/seller-profile");
      })
      .finally(() => setAuthChecked(true));
  }, [router]);

  const isPro = STATUTS.find((s) => s.value === role)?.isPro || false;
  const cahierObligatoire = ROLES_CAHIER_OBLIGATOIRE.includes(role);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!role) {
      toast({ title: "Choisis un statut", variant: "destructive" });
      return;
    }
    if (isPro) {
      const missing: string[] = [];
      if (!pro.raison_sociale.trim()) missing.push("Raison sociale");
      if (!pro.siret.trim()) missing.push("SIRET");
      if (!pro.nom_gerant.trim()) missing.push("Nom du gerant");
      if (!pro.adresse.trim()) missing.push("Adresse");
      if (!pro.code_postal.trim()) missing.push("Code postal");
      if (!pro.ville.trim()) missing.push("Ville");
      if (cahierObligatoire && !pro.cahier_police) missing.push("Cahier de police (obligatoire)");
      if (missing.length > 0) {
        toast({ title: "Champs manquants", description: missing.join(", "), variant: "destructive" });
        return;
      }
      if (!/^\d{14}$/.test(pro.siret.replace(/\s/g, ""))) {
        toast({ title: "SIRET invalide", description: "14 chiffres requis", variant: "destructive" });
        return;
      }
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/seller-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role,
          ...(isPro ? pro : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur soumission");
      if (artworkId) {
        router.push(`/art-core/oeuvre/${encodeURIComponent(artworkId)}`);
      } else {
        router.push("/art-core");
      }
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  if (!authChecked) {
    return <div className="max-w-2xl mx-auto px-4 py-8 text-white/40 text-sm">Chargement...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 pb-24">
      <h1 className="font-playfair text-3xl font-semibold text-white mb-2">Vos infos vendeur</h1>
      <p className="text-white/40 text-sm mb-8">
        Une derniere etape pour publier votre oeuvre. On ne vous demandera plus ces infos pour les depots suivants.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <section>
          <label className="block text-sm font-medium text-white mb-3">Vous etes ? *</label>
          <div className="space-y-2">
            {STATUTS.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => setRole(s.value)}
                className={`w-full text-left px-4 py-3 rounded-xl border ${role === s.value ? "border-[#D4AF37] bg-[#D4AF37]/5" : "border-white/10 bg-white/[0.02]"} hover:bg-white/5 transition-colors`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium">{s.label}</p>
                    <p className="text-white/40 text-xs mt-0.5">{s.desc}</p>
                  </div>
                  {role === s.value && <Check className="size-5 text-[#D4AF37]" />}
                </div>
              </button>
            ))}
          </div>
        </section>

        {isPro && (
          <section className="rounded-xl border border-[#D4AF37]/30 bg-[#D4AF37]/5 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-[#D4AF37]" />
              <p className="text-[#D4AF37] text-sm font-medium">Infos professionnelles (obligation Art. R.321-1)</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-white/60 mb-1.5">Raison sociale *</label>
                <input value={pro.raison_sociale} onChange={(e) => setPro({ ...pro, raison_sociale: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-[#D4AF37]/50" />
              </div>
              <div>
                <label className="block text-xs text-white/60 mb-1.5">SIRET (14 chiffres) *</label>
                <input value={pro.siret} onChange={(e) => setPro({ ...pro, siret: e.target.value.replace(/\D/g, "").slice(0, 14) })}
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-[#D4AF37]/50" />
              </div>
            </div>
            <div>
              <label className="block text-xs text-white/60 mb-1.5">Nom du gerant *</label>
              <input value={pro.nom_gerant} onChange={(e) => setPro({ ...pro, nom_gerant: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-[#D4AF37]/50" />
            </div>
            <div>
              <label className="block text-xs text-white/60 mb-1.5">Adresse *</label>
              <input value={pro.adresse} onChange={(e) => setPro({ ...pro, adresse: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-[#D4AF37]/50" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-white/60 mb-1.5">Code postal *</label>
                <input value={pro.code_postal} onChange={(e) => setPro({ ...pro, code_postal: e.target.value.replace(/\D/g, "").slice(0, 5) })}
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-[#D4AF37]/50" />
              </div>
              <div>
                <label className="block text-xs text-white/60 mb-1.5">Ville *</label>
                <input value={pro.ville} onChange={(e) => setPro({ ...pro, ville: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-[#D4AF37]/50" />
              </div>
            </div>
            <div>
              <label className="block text-xs text-white/60 mb-1.5">Telephone pro</label>
              <input type="tel" value={pro.telephone_pro} onChange={(e) => setPro({ ...pro, telephone_pro: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-[#D4AF37]/50" />
            </div>
            <label className="flex items-center gap-2 mt-2 cursor-pointer">
              <input type="checkbox" checked={pro.cahier_police} onChange={(e) => setPro({ ...pro, cahier_police: e.target.checked })} className="size-4 accent-[#D4AF37]" />
              <span className="text-sm text-white/70">
                Je tiens un cahier de police {cahierObligatoire ? <span className="text-red-400">(obligatoire)</span> : <span className="text-white/40">(optionnel)</span>}
              </span>
            </label>
          </section>
        )}

        <button
          type="submit"
          disabled={submitting || !role}
          className="w-full py-3.5 rounded-xl bg-[#D4AF37] text-black font-semibold disabled:opacity-30 flex items-center justify-center gap-2"
        >
          {submitting ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
          {submitting ? "Validation..." : "Valider et publier l'oeuvre"}
        </button>
        <p className="text-xs text-white/30 text-center">
          Pour les pros (galerie / antiquaire / brocante / depot-vente), une fiche de police PDF sera generee et envoyee automatiquement par email.
        </p>
      </form>
    </div>
  );
}

export default function SellerProfilePage() {
  return (
    <Suspense fallback={<div className="max-w-2xl mx-auto px-4 py-8 text-white/40 text-sm">Chargement...</div>}>
      <SellerProfileForm />
    </Suspense>
  );
}
