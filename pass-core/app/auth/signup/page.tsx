"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft, ArrowRight, Building2, CheckCircle2, Eye, EyeOff,
  Hash, Landmark, Loader2, Lock, Mail, MapPin, Package, Palette,
  Phone, ShieldCheck, Store, User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";

type Role = "artist" | "galeriste" | "antiquaire" | "brocanteur" | "depot_vente";
const PRO_ROLES: Role[] = ["galeriste", "antiquaire", "brocanteur", "depot_vente"];
const ROLES_OBLIG_CDP: Role[] = ["antiquaire", "brocanteur", "depot_vente"];

const ROLE_CARDS: { value: Role; label: string; tagline: string; icon: any }[] = [
  { value: "artist",      label: "Artiste",     tagline: "Je crée mes œuvres",                         icon: Palette },
  { value: "galeriste",   label: "Galeriste",   tagline: "Je vends pour des artistes",                 icon: Building2 },
  { value: "antiquaire",  label: "Antiquaire",  tagline: "J'achète et je revends des objets anciens",  icon: Landmark },
  { value: "brocanteur",  label: "Brocanteur",  tagline: "J'achète et je revends de l'occasion",       icon: Store },
  { value: "depot_vente", label: "Dépôt-vente", tagline: "Je revends pour le compte de tiers",         icon: Package },
];

interface FormState {
  role: Role | null;
  email: string;
  password: string;
  confirmPassword: string;
  full_name: string;
  // artiste
  nom_artiste: string;
  technique_artistique: string;
  // pro
  raison_sociale: string;
  siret: string;
  numero_rom: string;
  regime_tva: "" | "marge" | "reel" | "franchise";
  nom_gerant: string;
  telephone: string;
  adresse: string;
  code_postal: string;
  ville: string;
  cahier_police_accepte: boolean;
}

const EMPTY_FORM: FormState = {
  role: null,
  email: "",
  password: "",
  confirmPassword: "",
  full_name: "",
  nom_artiste: "",
  technique_artistique: "",
  raison_sociale: "",
  siret: "",
  numero_rom: "",
  regime_tva: "",
  nom_gerant: "",
  telephone: "",
  adresse: "",
  code_postal: "",
  ville: "",
  cahier_police_accepte: false,
};

function SignupInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialRole = useMemo<Role | null>(() => {
    const q = searchParams.get("role");
    if (q === "pro") return "galeriste";
    if (q && ROLE_CARDS.some((r) => r.value === q)) return q as Role;
    return null;
  }, [searchParams]);

  const [step, setStep] = useState<1 | 2 | 3>(initialRole ? 2 : 1);
  const [form, setForm] = useState<FormState>({ ...EMPTY_FORM, role: initialRole });
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const isPro = form.role !== null && PRO_ROLES.includes(form.role);
  const isArtist = form.role === "artist";
  const cdpObligatoire = form.role !== null && ROLES_OBLIG_CDP.includes(form.role);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => { const n = { ...e }; delete n[key]; return n; });
  }

  function validateStep2(): boolean {
    const e: Partial<Record<keyof FormState, string>> = {};
    if (!form.email.trim()) e.email = "Obligatoire";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Email invalide";
    if (!form.password) e.password = "Obligatoire";
    else if (form.password.length < 8) e.password = "Minimum 8 caractères";
    if (form.confirmPassword !== form.password) e.confirmPassword = "Les mots de passe diffèrent";
    if (!form.full_name.trim()) e.full_name = "Obligatoire";

    if (isArtist) {
      if (!form.nom_artiste.trim()) e.nom_artiste = "Obligatoire";
      if (!form.technique_artistique.trim()) e.technique_artistique = "Obligatoire";
    }

    if (isPro) {
      if (!form.raison_sociale.trim()) e.raison_sociale = "Obligatoire";
      const cleanSiret = form.siret.replace(/\s/g, "");
      if (!cleanSiret) e.siret = "Obligatoire";
      else if (!/^\d{14}$/.test(cleanSiret)) e.siret = "14 chiffres requis";
      if (cdpObligatoire && !form.numero_rom.trim()) e.numero_rom = "ROM obligatoire (Art. 321-7)";
      if (!form.nom_gerant.trim()) e.nom_gerant = "Obligatoire";
      if (!form.telephone.trim()) e.telephone = "Obligatoire";
      if (!form.adresse.trim()) e.adresse = "Obligatoire";
      if (!form.code_postal.trim()) e.code_postal = "Obligatoire";
      else if (!/^\d{5}$/.test(form.code_postal.trim())) e.code_postal = "5 chiffres";
      if (!form.ville.trim()) e.ville = "Obligatoire";
      if (cdpObligatoire && !form.cahier_police_accepte) e.cahier_police_accepte = "Acceptation requise";
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const payload: any = {
        role: form.role,
        email: form.email.trim().toLowerCase(),
        password: form.password,
        full_name: form.full_name.trim(),
      };
      if (isArtist) {
        payload.nom_artiste = form.nom_artiste.trim();
        payload.technique_artistique = form.technique_artistique.trim();
      }
      if (isPro) {
        payload.merchant = {
          raison_sociale: form.raison_sociale.trim(),
          siret: form.siret.replace(/\s/g, ""),
          numero_rom: form.numero_rom.trim() || null,
          regime_tva: form.regime_tva || null,
          nom_gerant: form.nom_gerant.trim(),
          telephone: form.telephone.trim(),
          adresse: form.adresse.trim(),
          code_postal: form.code_postal.trim(),
          ville: form.ville.trim(),
        };
        payload.cahier_police_accepte = form.cahier_police_accepte;
      }

      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Inscription refusée", description: data.error || "Erreur inconnue", variant: "destructive" });
        return;
      }
      toast({ title: "Compte créé", description: "Bienvenue sur Pass-Core." });
      router.push(data.redirect_to || "/pass-core/certifier");
      router.refresh();
    } catch (err: any) {
      toast({ title: "Erreur", description: err?.message || "Une erreur est survenue", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  const selectedCard = ROLE_CARDS.find((r) => r.value === form.role);

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-white">Créer un compte déposant</h2>
        <p className="text-white/50 text-sm mt-1">
          Identification + obligations légales avant le premier dépôt
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex gap-1.5 mb-6">
        {[1, 2, 3].map((n) => (
          <div
            key={n}
            className={`h-1 flex-1 rounded-full transition-colors ${
              n <= step ? "bg-gold" : "bg-white/10"
            }`}
          />
        ))}
      </div>

      {/* STEP 1 — choix du statut */}
      {step === 1 && (
        <div className="space-y-3">
          <Label className="block">Votre statut</Label>
          {ROLE_CARDS.map((r) => {
            const Icon = r.icon;
            const isSel = form.role === r.value;
            return (
              <button
                key={r.value}
                type="button"
                data-role={r.value}
                aria-selected={isSel}
                onClick={() => update("role", r.value)}
                className={`w-full text-left p-3 rounded-xl border transition-all flex items-center gap-3 ${
                  isSel
                    ? "border-gold bg-gold/10"
                    : "border-white/10 hover:border-white/20"
                }`}
              >
                <div className={`size-10 rounded-lg flex items-center justify-center shrink-0 ${
                  isSel ? "bg-gold/20 text-gold" : "bg-white/5 text-white/40"
                }`}>
                  <Icon className="size-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-medium ${isSel ? "text-gold" : "text-white"}`}>{r.label}</p>
                  <p className="text-xs text-white/40 mt-0.5">{r.tagline}</p>
                </div>
                {isSel && <CheckCircle2 className="size-5 text-gold shrink-0" />}
              </button>
            );
          })}

          <Button
            size="lg"
            className="w-full mt-4"
            disabled={!form.role}
            onClick={() => setStep(2)}
          >
            Continuer
            <ArrowRight className="size-4 ml-1" />
          </Button>

          <p className="text-center text-sm text-white/40 mt-4">
            Déjà un compte ?{" "}
            <Link href="/auth/login" className="text-gold hover:text-gold/80 font-medium">
              Se connecter
            </Link>
          </p>
        </div>
      )}

      {/* STEP 2 — champs */}
      {step === 2 && (
        <div className="space-y-4">
          {selectedCard && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
              <selectedCard.icon className="size-5 text-gold" />
              <div className="flex-1">
                <p className="text-sm text-white font-medium">{selectedCard.label}</p>
                <p className="text-xs text-white/40">{selectedCard.tagline}</p>
              </div>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-xs text-gold hover:underline"
              >
                Modifier
              </button>
            </div>
          )}

          {/* Communs */}
          <Field label="Email" error={errors.email}>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/30" />
              <Input
                type="email"
                placeholder="votre@email.com"
                className="pl-9"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
              />
            </div>
          </Field>

          <Field label="Mot de passe (8 caractères min)" error={errors.password}>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/30" />
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                className="pl-9 pr-10"
                value={form.password}
                onChange={(e) => update("password", e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </Field>

          <Field label="Confirmer le mot de passe" error={errors.confirmPassword}>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/30" />
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                className="pl-9"
                value={form.confirmPassword}
                onChange={(e) => update("confirmPassword", e.target.value)}
              />
            </div>
          </Field>

          <Field label="Nom complet" error={errors.full_name}>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/30" />
              <Input
                placeholder="Jean Dupont"
                className="pl-9"
                value={form.full_name}
                onChange={(e) => update("full_name", e.target.value)}
              />
            </div>
          </Field>

          {/* Artiste */}
          {isArtist && (
            <>
              <div className="pt-2 border-t border-white/5">
                <p className="text-xs text-white/40 mb-3 uppercase tracking-wider">Profil artiste</p>
              </div>
              <Field label="Nom d'artiste / pseudonyme" error={errors.nom_artiste}>
                <Input
                  placeholder="Mona L."
                  value={form.nom_artiste}
                  onChange={(e) => update("nom_artiste", e.target.value)}
                />
              </Field>
              <Field label="Technique principale" error={errors.technique_artistique}>
                <Input
                  placeholder="Huile sur toile, photographie argentique..."
                  value={form.technique_artistique}
                  onChange={(e) => update("technique_artistique", e.target.value)}
                />
              </Field>
            </>
          )}

          {/* Pro */}
          {isPro && (
            <>
              <div className="pt-2 border-t border-white/5">
                <p className="text-xs text-white/40 mb-3 uppercase tracking-wider">Profil professionnel</p>
              </div>

              <Field label="Raison sociale" error={errors.raison_sociale}>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/30" />
                  <Input
                    placeholder="Galerie Dupont SARL"
                    className="pl-9"
                    value={form.raison_sociale}
                    onChange={(e) => update("raison_sociale", e.target.value)}
                  />
                </div>
              </Field>

              <Field label="SIRET (14 chiffres)" error={errors.siret}>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/30" />
                  <Input
                    placeholder="12345678901234"
                    className="pl-9"
                    maxLength={14}
                    value={form.siret}
                    onChange={(e) => update("siret", e.target.value.replace(/\D/g, ""))}
                  />
                </div>
              </Field>

              <Field
                label={cdpObligatoire ? "N° ROM (Registre des Objets Mobiliers)" : "N° ROM (optionnel pour galeriste)"}
                error={errors.numero_rom}
              >
                <Input
                  placeholder="0001-2025"
                  value={form.numero_rom}
                  onChange={(e) => update("numero_rom", e.target.value)}
                />
              </Field>

              <Field label="Régime TVA (optionnel)">
                <select
                  className="flex h-10 w-full rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-gold"
                  value={form.regime_tva}
                  onChange={(e) => update("regime_tva", e.target.value as FormState["regime_tva"])}
                >
                  <option value="">— Choisir —</option>
                  <option value="marge">TVA sur la marge</option>
                  <option value="reel">Régime réel normal</option>
                  <option value="franchise">Franchise en base</option>
                </select>
              </Field>

              <Field label="Nom du gérant" error={errors.nom_gerant}>
                <Input
                  placeholder="Jean Dupont"
                  value={form.nom_gerant}
                  onChange={(e) => update("nom_gerant", e.target.value)}
                />
              </Field>

              <Field label="Téléphone" error={errors.telephone}>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/30" />
                  <Input
                    placeholder="+33 6 12 34 56 78"
                    className="pl-9"
                    value={form.telephone}
                    onChange={(e) => update("telephone", e.target.value)}
                  />
                </div>
              </Field>

              <Field label="Adresse" error={errors.adresse}>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/30" />
                  <Input
                    placeholder="12 rue des Arts"
                    className="pl-9"
                    value={form.adresse}
                    onChange={(e) => update("adresse", e.target.value)}
                  />
                </div>
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Code postal" error={errors.code_postal}>
                  <Input
                    placeholder="75001"
                    maxLength={5}
                    value={form.code_postal}
                    onChange={(e) => update("code_postal", e.target.value.replace(/\D/g, ""))}
                  />
                </Field>
                <Field label="Ville" error={errors.ville}>
                  <Input
                    placeholder="Paris"
                    value={form.ville}
                    onChange={(e) => update("ville", e.target.value)}
                  />
                </Field>
              </div>

              {/* Cahier de police checkbox */}
              <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                errors.cahier_police_accepte ? "border-red-500/50 bg-red-500/5" : "border-white/10 bg-white/[0.03]"
              }`}>
                <input
                  type="checkbox"
                  className="mt-0.5 accent-gold"
                  checked={form.cahier_police_accepte}
                  onChange={(e) => update("cahier_police_accepte", e.target.checked)}
                />
                <div className="text-xs text-white/70 leading-relaxed">
                  <span className="text-white">
                    Je m'engage à tenir le cahier de police prévu par l'Art. 321-7 du Code pénal
                  </span>
                  {cdpObligatoire ? (
                    <span className="text-red-400"> *</span>
                  ) : (
                    <span className="text-white/40"> (optionnel pour galeriste)</span>
                  )}
                </div>
              </label>
              {errors.cahier_police_accepte && (
                <p className="text-xs text-red-400 -mt-2">{errors.cahier_police_accepte}</p>
              )}
            </>
          )}

          <div className="flex gap-2 pt-2">
            <Button variant="outline" size="lg" onClick={() => setStep(1)}>
              <ArrowLeft className="size-4 mr-1" />
              Retour
            </Button>
            <Button
              size="lg"
              className="flex-1"
              onClick={() => { if (validateStep2()) setStep(3); }}
            >
              Récapitulatif
              <ArrowRight className="size-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* STEP 3 — récap */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl border border-gold/30 bg-gold/5">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="size-5 text-gold" />
              <p className="text-sm font-medium text-white">Vérifiez vos informations</p>
            </div>
            <dl className="space-y-2 text-xs">
              <Row k="Statut" v={selectedCard?.label || "—"} />
              <Row k="Email" v={form.email} />
              <Row k="Nom" v={form.full_name} />
              {isArtist && <Row k="Nom d'artiste" v={form.nom_artiste} />}
              {isArtist && <Row k="Technique" v={form.technique_artistique} />}
              {isPro && <Row k="Raison sociale" v={form.raison_sociale} />}
              {isPro && <Row k="SIRET" v={form.siret} />}
              {isPro && form.numero_rom && <Row k="N° ROM" v={form.numero_rom} />}
              {isPro && form.regime_tva && <Row k="Régime TVA" v={form.regime_tva} />}
              {isPro && <Row k="Adresse" v={`${form.adresse}, ${form.code_postal} ${form.ville}`} />}
              {isPro && form.cahier_police_accepte && (
                <Row k="Cahier de police" v="✅ Accepté" />
              )}
            </dl>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="lg" onClick={() => setStep(2)} disabled={submitting}>
              <ArrowLeft className="size-4 mr-1" />
              Modifier
            </Button>
            <Button
              size="lg"
              className="flex-1"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting && <Loader2 className="size-4 animate-spin mr-1" />}
              Créer mon compte
            </Button>
          </div>

          <p className="text-center text-xs text-white/30">
            Après inscription, vous serez redirigé vers le formulaire de certification.
          </p>
        </div>
      )}
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-white/40 shrink-0">{k}</dt>
      <dd className="text-white text-right truncate">{v}</dd>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense>
      <SignupInner />
    </Suspense>
  );
}
