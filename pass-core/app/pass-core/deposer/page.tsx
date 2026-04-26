"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Image as ImageIcon, X, ChevronRight, ChevronLeft, Check, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

const ART_CORE_URL = "https://art-core.app";

const CATEGORIES = [
  { label: "Peinture", value: "painting" },
  { label: "Sculpture", value: "sculpture" },
  { label: "Photographie", value: "photography" },
  { label: "Numérique", value: "digital" },
  { label: "Dessin", value: "drawing" },
  { label: "Technique mixte", value: "mixed_media" },
  { label: "Céramique", value: "ceramics" },
];

const STATUTS = [
  { value: "artist", label: "Artiste", desc: "Je crée mes propres œuvres" },
  { value: "galeriste", label: "Galeriste", desc: "Je gère une galerie d'art" },
  { value: "antiquaire", label: "Antiquaire", desc: "Je vends des œuvres anciennes" },
  { value: "brocanteur", label: "Brocanteur", desc: "Brocante / vente d'art" },
  { value: "depot_vente", label: "Dépôt-vente", desc: "Espace de dépôt-vente" },
];

const PRO_ROLES = ["galeriste", "antiquaire", "brocanteur", "depot_vente"];
const ROLES_CAHIER_OBLIGATOIRE = ["antiquaire", "brocanteur", "depot_vente"];
type Step = "identite_status" | "identite_details" | "identite_account" | "photos" | "oeuvre" | "recap" | "submitting" | "done";

async function compressImage(file: File, maxDim = 2048, quality = 0.85): Promise<Blob> {
  if (file.size < 1_500_000) return file;
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        const ratio = Math.min(maxDim / width, maxDim / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas indisponible"));
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob((out) => (out ? resolve(out) : reject(new Error("Compression échouée"))), "image/jpeg", quality);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Image illisible")); };
    img.src = url;
  });
}

export default function PassCoreDeposerPage() {
  const router = useRouter();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [authChecked, setAuthChecked] = useState(false);
  const [authedUser, setAuthedUser] = useState<{ id: string; role: string; full_name?: string; email?: string } | null>(null);
  const [step, setStep] = useState<Step>("identite_status");

  const [identity, setIdentity] = useState({ role: "", full_name: "", username: "", email: "", password: "", telephone: "" });
  const [merchant, setMerchant] = useState({ raison_sociale: "", siret: "", nom_gerant: "", adresse: "", code_postal: "", ville: "", cahier_police: false });

  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", technique: "", dimensions: "", creation_date: "", category: "painting", price: "" });

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  // Detection auth au mount.
  // ATTENTION : ne PAS sauter automatiquement les sous-etapes Identite.
  // Si un cookie de session existe, on stocke l'utilisateur, mais on laisse
  // l'ecran "identite_status" s'afficher pour qu'une banniere de confirmation
  // demande explicitement "Continuer avec ce compte" / "Ce n'est pas moi".
  // Cela evite tout rattachement silencieux d'une oeuvre a un compte demo
  // ou a une session oubliee.
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (d?.user?.id) {
          setAuthedUser(d.user);
          // Pas de setStep ici. La banniere (cf. JSX plus bas) prend le relais.
        }
      })
      .catch(() => {})
      .finally(() => setAuthChecked(true));
  }, []);

  async function handleLogoutAndContinueAsGuest() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {}
    setAuthedUser(null);
    setIdentity({ role: "", full_name: "", username: "", email: "", password: "", telephone: "" });
    setMerchant({ raison_sociale: "", siret: "", nom_gerant: "", adresse: "", code_postal: "", ville: "", cahier_police: false });
    setStep("identite_status");
  }

  const isPro = PRO_ROLES.includes(identity.role || authedUser?.role || "");
  const cahierObligatoire = ROLES_CAHIER_OBLIGATOIRE.includes(identity.role || authedUser?.role || "");

  async function handleFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const uploaded: string[] = [];
      for (const file of Array.from(files)) {
        try {
          const compressed = await compressImage(file);
          const fd = new FormData();
          fd.append("photo", compressed, file.name);
          const res = await fetch("/api/upload-photo", { method: "POST", body: fd });
          const json = await res.json();
          if (!res.ok) throw new Error(json.error || `Upload échoué`);
          uploaded.push(json.url);
        } catch (err: any) {
          toast({ title: `Upload ${file.name}`, description: err.message, variant: "destructive" });
        }
      }
      if (uploaded.length) {
        setPhotos((p) => [...p, ...uploaded]);
        toast({ title: `${uploaded.length} photo(s) ajoutée(s)` });
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleFinalSubmit() {
    setLoading(true);
    setStep("submitting");
    try {
      const body: any = {
        artwork: { ...form, price: parseFloat(form.price) || 0, photos, is_public: true },
      };
      if (!authedUser) {
        body.identity = identity;
        if (PRO_ROLES.includes(identity.role)) body.merchant = merchant;
      } else if (PRO_ROLES.includes(authedUser.role || "")) {
        if (merchant.raison_sociale || merchant.siret) body.merchant = merchant;
      }
      const res = await fetch("/api/deposit-with-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur soumission");
      setResult(data);
      setStep("done");
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
      setStep("recap");
    } finally {
      setLoading(false);
    }
  }

  function NavBar({ onBack, onNext, nextLabel = "Continuer", nextDisabled = false }: any) {
    return (
      <div className="flex gap-3 mt-6">
        {onBack && (
          <button onClick={onBack} className="flex-1 py-3 rounded-xl border border-white/10 text-white/60 font-medium flex items-center justify-center gap-2 active:bg-white/5">
            <ChevronLeft className="size-4" /> Retour
          </button>
        )}
        <button onClick={onNext} disabled={nextDisabled}
          className="flex-1 py-3 rounded-xl bg-gold-DEFAULT text-navy-DEFAULT font-semibold disabled:opacity-30 flex items-center justify-center gap-2">
          {nextLabel} <ChevronRight className="size-4" />
        </button>
      </div>
    );
  }

  if (!authChecked) {
    return <div className="max-w-2xl mx-auto px-4 py-8 text-white/40 text-sm">Chargement...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 pb-24">
      <h1 className="font-display text-3xl font-semibold text-white mb-2">Déposer une œuvre</h1>
      {!authedUser && step.startsWith("identite") && (
        <p className="text-white/40 text-sm mb-8">
          Vous n&apos;êtes pas encore inscrit. On crée votre compte en même temps que votre dépôt.
        </p>
      )}
      {(authedUser || !step.startsWith("identite")) && (
        <p className="text-white/40 text-sm mb-8">
          {authedUser ? `Bonjour ${authedUser.full_name || ""}` : ""} — déposez votre œuvre en quelques étapes.
        </p>
      )}

      {/* Banniere de confirmation d'identite (si user deja connecte) */}
      {authedUser && step.startsWith("identite") && (
        <div className="mb-6 rounded-xl border border-gold-DEFAULT/30 bg-gold-DEFAULT/5 p-4">
          <p className="text-sm text-white">
            Vous êtes connecté en tant que{" "}
            <span className="text-gold-DEFAULT font-medium">
              {authedUser.full_name || authedUser.email}
            </span>.
          </p>
          <p className="text-xs text-white/60 mt-1">
            L&apos;œuvre déposée sera attribuée à ce compte.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 mt-3">
            <button
              onClick={() => setStep("photos")}
              className="flex-1 py-2 rounded-lg bg-gold-DEFAULT text-navy-DEFAULT text-sm font-semibold"
            >
              Continuer avec ce compte
            </button>
            <button
              onClick={handleLogoutAndContinueAsGuest}
              className="flex-1 py-2 rounded-lg border border-white/15 text-white/70 text-sm hover:bg-white/5"
            >
              Ce n&apos;est pas moi — déposer en visiteur
            </button>
          </div>
        </div>
      )}

      {step === "identite_status" && !authedUser && (
        <div>
          <h2 className="text-xl font-semibold text-white mb-1">Quel est votre statut ?</h2>
          <p className="text-white/40 text-sm mb-6">5 statuts possibles. Choisissez celui qui correspond.</p>
          <div className="space-y-2">
            {STATUTS.map((s) => (
              <button key={s.value} onClick={() => { setIdentity({ ...identity, role: s.value }); setStep("identite_details"); }}
                className="w-full text-left px-4 py-4 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/5 active:bg-white/10 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium">{s.label}</p>
                    <p className="text-white/40 text-xs mt-0.5">{s.desc}</p>
                  </div>
                  <ChevronRight className="size-5 text-white/30" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === "identite_details" && !authedUser && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-white mb-1">Vos coordonnées</h2>
          <p className="text-white/40 text-sm">
            Statut : <span className="text-gold-DEFAULT">{STATUTS.find(s => s.value === identity.role)?.label}</span>
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Nom complet *</Label><Input value={identity.full_name} onChange={e => setIdentity({ ...identity, full_name: e.target.value })} className="mt-1.5" /></div>
            <div><Label>Identifiant *</Label><Input value={identity.username} onChange={e => setIdentity({ ...identity, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") })} placeholder="ex: marie_galerie" className="mt-1.5" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Email *</Label><Input type="email" value={identity.email} onChange={e => setIdentity({ ...identity, email: e.target.value })} className="mt-1.5" /></div>
            <div><Label>Téléphone</Label><Input value={identity.telephone} onChange={e => setIdentity({ ...identity, telephone: e.target.value })} className="mt-1.5" /></div>
          </div>

          {isPro && (
            <div className="rounded-xl border border-gold-DEFAULT/30 bg-gold-DEFAULT/5 p-4 space-y-3">
              <p className="text-gold-DEFAULT text-sm font-medium">Informations professionnelles (obligation légale Art. R.321-1)</p>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Raison sociale *</Label><Input value={merchant.raison_sociale} onChange={e => setMerchant({ ...merchant, raison_sociale: e.target.value })} className="mt-1.5" /></div>
                <div><Label>SIRET (14 chiffres) *</Label><Input value={merchant.siret} onChange={e => setMerchant({ ...merchant, siret: e.target.value.replace(/\D/g, "").slice(0, 14) })} className="mt-1.5" /></div>
              </div>
              <div><Label>Nom du gérant *</Label><Input value={merchant.nom_gerant} onChange={e => setMerchant({ ...merchant, nom_gerant: e.target.value })} className="mt-1.5" /></div>
              <div><Label>Adresse *</Label><Input value={merchant.adresse} onChange={e => setMerchant({ ...merchant, adresse: e.target.value })} className="mt-1.5" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Code postal *</Label><Input value={merchant.code_postal} onChange={e => setMerchant({ ...merchant, code_postal: e.target.value.replace(/\D/g, "").slice(0, 5) })} className="mt-1.5" /></div>
                <div><Label>Ville *</Label><Input value={merchant.ville} onChange={e => setMerchant({ ...merchant, ville: e.target.value })} className="mt-1.5" /></div>
              </div>
              <label className="flex items-center gap-2 mt-2 cursor-pointer">
                <input type="checkbox" checked={merchant.cahier_police} onChange={e => setMerchant({ ...merchant, cahier_police: e.target.checked })} className="size-4 accent-gold-DEFAULT" />
                <span className="text-sm text-white/70">
                  Je tiens un cahier de police {cahierObligatoire ? <span className="text-red-400">(obligatoire)</span> : <span className="text-white/40">(optionnel pour galeriste)</span>}
                </span>
              </label>
            </div>
          )}

          <NavBar
            onBack={() => setStep("identite_status")}
            onNext={() => {
              const baseOk = identity.full_name && identity.username && identity.email;
              const proOk = !isPro || (merchant.raison_sociale && merchant.siret.length === 14 && merchant.nom_gerant && merchant.adresse && merchant.code_postal && merchant.ville);
              const cahierOk = !cahierObligatoire || merchant.cahier_police;
              if (!baseOk || !proOk || !cahierOk) {
                toast({ title: "Champs manquants", description: !cahierOk ? "Cahier de police obligatoire pour ce statut" : "Complétez les champs marqués *", variant: "destructive" });
                return;
              }
              setStep("identite_account");
            }}
          />
        </div>
      )}

      {step === "identite_account" && !authedUser && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-white mb-1">Sécurité du compte</h2>
          <p className="text-white/40 text-sm mb-6">Choisissez un mot de passe pour vous reconnecter plus tard.</p>
          <div>
            <Label>Mot de passe (min. 8 caractères) *</Label>
            <Input type="password" value={identity.password} onChange={e => setIdentity({ ...identity, password: e.target.value })} className="mt-1.5" autoComplete="new-password" />
          </div>
          <NavBar
            onBack={() => setStep("identite_details")}
            onNext={() => {
              if (identity.password.length < 8) {
                toast({ title: "Mot de passe trop court", description: "Min. 8 caractères", variant: "destructive" });
                return;
              }
              setStep("photos");
            }}
          />
        </div>
      )}

      {step === "photos" && (
        <div>
          <h2 className="text-xl font-semibold text-white mb-1">Photos de l&apos;œuvre</h2>
          <p className="text-white/40 text-sm mb-6">Ajoutez vos photos. Aucune validation bloquante — toutes les photos sont acceptées.</p>
          <div className="flex flex-wrap gap-3 mb-4">
            {photos.map((p, i) => (
              <div key={i} className="relative w-24 h-24 rounded-xl overflow-hidden bg-[#111111]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p} alt="" className="w-full h-full object-cover" />
                <button type="button" onClick={() => setPhotos(photos.filter((_, j) => j !== i))}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center">
                  <X className="size-3 text-white" />
                </button>
              </div>
            ))}
            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}
              className="w-24 h-24 rounded-xl border-2 border-dashed border-white/15 flex flex-col items-center justify-center text-white/30 hover:border-gold-DEFAULT/40 hover:text-gold-DEFAULT/60 disabled:opacity-40">
              {uploading ? <Loader2 className="size-6 mb-1 animate-spin" /> : <ImageIcon className="size-6 mb-1" />}
              <span className="text-[10px]">{uploading ? "Upload..." : "Ajouter"}</span>
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFilesSelected} />
          </div>
          <NavBar onBack={authedUser ? undefined : () => setStep("identite_account")} onNext={() => setStep("oeuvre")} />
        </div>
      )}

      {step === "oeuvre" && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-white mb-1">Détails de l&apos;œuvre</h2>
          <p className="text-white/40 text-sm mb-2">Titre et prix recommandés. Tout est modifiable plus tard.</p>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Titre</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="mt-1.5" /></div>
            <div><Label>Prix (€)</Label><Input type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} className="mt-1.5" /></div>
          </div>
          <div>
            <Label>Catégorie</Label>
            <div className="flex flex-wrap gap-2 mt-1.5">
              {CATEGORIES.map((c) => (
                <button key={c.value} type="button" onClick={() => setForm({ ...form, category: c.value })}
                  className={`px-3 py-1.5 rounded-lg text-xs ${form.category === c.value ? "bg-gold-DEFAULT text-navy-DEFAULT font-semibold" : "bg-white/5 text-white/50"}`}>
                  {c.label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Technique</Label><Input value={form.technique} onChange={e => setForm({ ...form, technique: e.target.value })} placeholder="Huile sur toile" className="mt-1.5" /></div>
            <div><Label>Dimensions</Label><Input value={form.dimensions} onChange={e => setForm({ ...form, dimensions: e.target.value })} placeholder="80x120 cm" className="mt-1.5" /></div>
          </div>
          <div>
            <Label>Description</Label>
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3}
              className="w-full mt-1.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white p-3 resize-none focus:outline-none focus:border-gold-DEFAULT/40" />
          </div>
          <NavBar onBack={() => setStep("photos")} onNext={() => setStep("recap")} nextLabel="Récapitulatif" />
        </div>
      )}

      {step === "recap" && (
        <div>
          <h2 className="text-xl font-semibold text-white mb-1">Vérification</h2>
          <p className="text-white/40 text-sm mb-6">Un seul clic crée votre compte (si nouveau) et publie l&apos;œuvre sur ART-CORE.</p>

          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-2 mb-4 text-sm">
            {!authedUser && (
              <>
                <div className="flex justify-between"><span className="text-white/40">Statut</span><span className="text-white">{STATUTS.find(s => s.value === identity.role)?.label}</span></div>
                <div className="flex justify-between"><span className="text-white/40">Nom</span><span className="text-white">{identity.full_name}</span></div>
                <div className="flex justify-between"><span className="text-white/40">Email</span><span className="text-white">{identity.email}</span></div>
                {isPro && <div className="flex justify-between"><span className="text-white/40">Raison sociale</span><span className="text-white">{merchant.raison_sociale}</span></div>}
              </>
            )}
            {authedUser && <div className="flex justify-between"><span className="text-white/40">Compte</span><span className="text-white">{authedUser.full_name || authedUser.email}</span></div>}
            <div className="flex justify-between"><span className="text-white/40">Photos</span><span className="text-white">{photos.length}</span></div>
            <div className="flex justify-between"><span className="text-white/40">Titre</span><span className="text-white">{form.title || <em className="text-white/30">Sans titre</em>}</span></div>
            {form.price && <div className="flex justify-between"><span className="text-white/40">Prix</span><span className="text-gold-DEFAULT">{form.price} €</span></div>}
          </div>

          {isPro && (
            <div className="rounded-xl bg-gold-DEFAULT/5 border border-gold-DEFAULT/20 p-3 flex items-start gap-2 mb-4">
              <ShieldCheck className="size-4 text-gold-DEFAULT shrink-0 mt-0.5" />
              <p className="text-[11px] text-white/60">
                Une fiche de police PDF sera générée automatiquement et envoyée à votre email.
              </p>
            </div>
          )}

          <NavBar
            onBack={() => setStep("oeuvre")}
            onNext={handleFinalSubmit}
            nextLabel={loading ? "Envoi..." : (authedUser ? "Déposer" : "Créer compte + Déposer")}
            nextDisabled={loading}
          />
        </div>
      )}

      {step === "submitting" && (
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className="size-12 text-gold-DEFAULT animate-spin mb-4" />
          <p className="text-white/60">Création en cours...</p>
        </div>
      )}

      {step === "done" && result && (
        <div className="text-center py-8">
          <div className="w-20 h-20 rounded-full bg-green-500/10 border-2 border-green-500/30 flex items-center justify-center mx-auto mb-6">
            <Check className="size-10 text-green-400" />
          </div>
          <h2 className="text-2xl font-semibold text-white mb-2">Œuvre déposée !</h2>
          <p className="text-white/40 text-sm mb-6">
            {result.created?.user && "Compte créé. "}
            {result.created?.merchant && "Profil pro créé. "}
            Œuvre visible sur la marketplace ART-CORE.
          </p>
          {result.fiche_police?.triggered && (
            <p className="text-gold-DEFAULT text-xs mb-4">Fiche de police N°{result.fiche_police.entry_number} envoyée par email.</p>
          )}
          <div className="space-y-2">
            <a href={`${ART_CORE_URL}/art-core/oeuvre/${result.artwork_id}`}
              className="block w-full py-4 rounded-xl bg-gold-DEFAULT text-navy-DEFAULT font-semibold text-center active:brightness-90">
              Voir mon œuvre sur ART-CORE
            </a>
            <a href={`${ART_CORE_URL}/art-core`}
              className="block w-full py-3 rounded-xl border border-white/10 text-white/60 text-sm text-center">
              Voir la marketplace ART-CORE
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
