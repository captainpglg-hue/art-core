"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Building, FileText, User, Mail, Phone, MapPin, Hash, Briefcase,
  Loader2, CheckCircle, ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";

export default function ProInscriptionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [merchantInfo, setMerchantInfo] = useState<any>(null);

  const [form, setForm] = useState({
    raison_sociale: "",
    siret: "",
    activite: "",
    nom_gerant: "",
    email: "",
    telephone: "",
    adresse: "",
    code_postal: "",
    ville: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    if (errors[field]) setErrors((e) => { const n = { ...e }; delete n[field]; return n; });
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.raison_sociale.trim()) e.raison_sociale = "Obligatoire";
    if (!form.siret.trim()) e.siret = "Obligatoire";
    else if (!/^\d{14}$/.test(form.siret.replace(/\s/g, ""))) e.siret = "14 chiffres requis";
    if (!form.activite.trim()) e.activite = "Obligatoire";
    if (!form.nom_gerant.trim()) e.nom_gerant = "Obligatoire";
    if (!form.email.trim()) e.email = "Obligatoire";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Email invalide";
    if (!form.telephone.trim()) e.telephone = "Obligatoire";
    if (!form.adresse.trim()) e.adresse = "Obligatoire";
    if (!form.code_postal.trim()) e.code_postal = "Obligatoire";
    if (!form.ville.trim()) e.ville = "Obligatoire";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true);

    try {
      const res = await fetch("/api/merchants/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        toast({ title: "Erreur", description: data.error, variant: "destructive" });
        setLoading(false);
        return;
      }

      setMerchantInfo(data.merchant);
      setSuccess(true);
      toast({ title: "Inscription validee", description: `Bienvenue ${data.merchant.raison_sociale}` });
    } catch {
      toast({ title: "Erreur", description: "Une erreur est survenue.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  if (success && merchantInfo) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center animate-fade-in">
        <div className="w-16 h-16 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="size-8 text-green-400" />
        </div>
        <h1 className="font-playfair text-2xl font-bold text-white mb-2">Inscription validee</h1>
        <p className="text-white/50 mb-6">Votre compte professionnel est actif.</p>

        <div className="rounded-xl bg-white/[0.03] border border-[#C9A84C]/20 p-6 text-left mb-8">
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-white/40">Raison sociale</span>
              <span className="text-white font-medium">{merchantInfo.raison_sociale}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/40">SIRET</span>
              <span className="text-white font-mono">{merchantInfo.siret}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/40">N° ROM</span>
              <span className="text-[#C9A84C] font-semibold">{merchantInfo.numero_rom_prefix}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-3 justify-center">
          <Button asChild>
            <Link href="/pass-core/pro/dashboard">Mon espace pro</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/pass-core/certifier">Certifier une oeuvre</Link>
          </Button>
        </div>
      </div>
    );
  }

  const fields: { key: string; label: string; placeholder: string; icon: any; type: string; maxLength?: number; options?: { value: string; label: string }[] }[] = [
    { key: "raison_sociale", label: "Raison sociale", placeholder: "Galerie Dupont SARL", icon: Building, type: "text" },
    { key: "siret", label: "SIRET (14 chiffres)", placeholder: "12345678901234", icon: Hash, type: "text", maxLength: 14 },
    { key: "activite", label: "Activite", placeholder: "", icon: Briefcase, type: "select", options: [
      { value: "", label: "-- Choisir votre activité --" },
      { value: "galerie", label: "Galerie d'art" },
      { value: "antiquaire", label: "Antiquaire" },
      { value: "brocanteur", label: "Brocanteur" },
      { value: "commissaire-priseur", label: "Commissaire-priseur" },
      { value: "depot-vente", label: "Dépôt-vente" },
    ] },
    { key: "nom_gerant", label: "Nom du gerant", placeholder: "Jean Dupont", icon: User, type: "text" },
    { key: "email", label: "Email professionnel", placeholder: "contact@galerie.fr", icon: Mail, type: "email" },
    { key: "telephone", label: "Telephone", placeholder: "+33 6 12 34 56 78", icon: Phone, type: "tel" },
    { key: "adresse", label: "Adresse", placeholder: "12 rue des Arts", icon: MapPin, type: "text" },
    { key: "code_postal", label: "Code postal", placeholder: "75001", icon: MapPin, type: "text", maxLength: 5 },
    { key: "ville", label: "Ville", placeholder: "Paris", icon: MapPin, type: "text" },
  ];

  return (
    <div className="max-w-lg mx-auto px-4 py-10 animate-fade-in">
      <div className="text-center mb-8">
        <div className="w-14 h-14 rounded-2xl bg-[#C9A84C]/10 border border-[#C9A84C]/20 flex items-center justify-center mx-auto mb-4">
          <ShieldCheck className="size-7 text-[#C9A84C]" />
        </div>
        <h1 className="font-playfair text-2xl font-bold text-white mb-1">Inscription professionnelle</h1>
        <p className="text-white/40 text-sm">
          Marchands, galeries, antiquaires — creez votre compte pour tenir votre cahier de police numerique.
        </p>
      </div>

      <div className="rounded-xl bg-[#C9A84C]/5 border border-[#C9A84C]/20 p-4 mb-6">
        <div className="flex gap-3">
          <FileText className="size-5 text-[#C9A84C] shrink-0 mt-0.5" />
          <div className="text-xs text-white/50 leading-relaxed">
            <p className="text-white/70 font-medium mb-1">Obligation legale</p>
            Conformement a l&apos;article R.321-1 du Code penal, tout professionnel achetant ou vendant des objets mobiliers doit tenir un registre de police. Tous les champs ci-dessous sont obligatoires.
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {fields.map(({ key, label, placeholder, icon: Icon, type, maxLength, options }) => (
          <div key={key} className="space-y-1">
            <Label htmlFor={key} className="text-xs">
              {label} <span className="text-red-400">*</span>
            </Label>
            <div className="relative">
              <Icon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-white/25" />
              {type === "select" && options ? (
                <select
                  id={key}
                  name={key}
                  required
                  className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background pl-9 ${errors[key] ? "border-red-500/50" : ""}`}
                  value={(form as any)[key]}
                  onChange={(e) => update(key, e.target.value)}
                >
                  {options.map((opt: { value: string; label: string }) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              ) : (
                <Input
                  id={key}
                  type={type}
                  placeholder={placeholder}
                  className={`pl-9 ${errors[key] ? "border-red-500/50" : ""}`}
                  value={(form as any)[key]}
                  onChange={(e) => update(key, e.target.value)}
                  maxLength={maxLength}
                />
              )}
            </div>
            {errors[key] && <p className="text-[11px] text-red-400">{errors[key]}</p>}
          </div>
        ))}

        <div className="pt-3">
          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading && <Loader2 className="size-4 animate-spin mr-2" />}
            Creer mon compte professionnel
          </Button>
        </div>
      </form>

      <p className="text-center text-xs text-white/25 mt-6">
        En creant votre compte, vous acceptez les{" "}
        <Link href="/legal/cgu" className="text-[#C9A84C] hover:underline">CGU</Link>
        {" "}et attestez de la conformite de vos informations.
      </p>
    </div>
  );
}
