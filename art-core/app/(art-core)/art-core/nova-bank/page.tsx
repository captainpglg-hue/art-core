"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Palette, Shield, Users, ShoppingBag, ChevronRight, Check,
  Loader2, CreditCard, MapPin, Phone, Mail, User, Calendar,
  Building, Briefcase, Link2, Globe, Star, Package, Coins, Gift,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

const ACCOUNTS = [
  {
    type: "artist" as const,
    name: "Nova Artist",
    icon: Palette,
    tagline: "Pour les créateurs",
    bonus: "15€ de crédit marketing offerts",
    bonusDetail: "Utilisables en boosts sur ART-CORE",
    color: "from-purple-500/20 to-purple-600/5",
    border: "border-purple-500/30",
    accent: "text-purple-400",
  },
  {
    type: "ambassador" as const,
    name: "Nova Ambassador",
    icon: Shield,
    tagline: "Pour les ambassadeurs",
    bonus: "Kit objectif macro offert (valeur 15€)",
    bonusDetail: "Livré à votre adresse pour photographier les oeuvres",
    color: "from-blue-500/20 to-blue-600/5",
    border: "border-blue-500/30",
    accent: "text-blue-400",
  },
  {
    type: "initiate" as const,
    name: "Nova Insider",
    icon: Users,
    tagline: "Pour les initiés",
    bonus: "15€ en points offerts",
    bonusDetail: "Pour miser sur les oeuvres ART-CORE et PRIME-CORE",
    color: "from-[#C9A84C]/20 to-[#C9A84C]/5",
    border: "border-[#C9A84C]/30",
    accent: "text-[#C9A84C]",
  },
  {
    type: "collector" as const,
    name: "Nova Collector",
    icon: ShoppingBag,
    tagline: "Pour les acheteurs",
    bonus: "15€ offerts sur les frais de port",
    bonusDetail: "Sur votre première commande ART-CORE",
    color: "from-green-500/20 to-green-600/5",
    border: "border-green-500/30",
    accent: "text-green-400",
  },
];

type AccountType = "artist" | "ambassador" | "initiate" | "collector";
type Step = "choose" | "form" | "confirm" | "success";

const SPECIALTIES = ["Peinture", "Sculpture", "Photographie", "Art numérique", "Dessin", "Gravure", "Céramique", "Technique mixte", "Installation", "Autre"];
const STYLES = ["Art contemporain", "Art moderne", "Art classique", "Street art", "Art abstrait", "Figuratif", "Minimaliste", "Art conceptuel", "Pop art", "Autre"];

export default function NovaBankPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("choose");
  const [selectedType, setSelectedType] = useState<AccountType | null>(null);
  const [existingAccount, setExistingAccount] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [checkingAccount, setCheckingAccount] = useState(true);
  const [result, setResult] = useState<any>(null);
  const [form, setForm] = useState({
    first_name: "", last_name: "", date_of_birth: "", email: "", phone: "",
    address_line1: "", address_line2: "", city: "", postal_code: "", country: "France",
    iban: "", specialty: "", portfolio_url: "", geo_zone: "", network_size: "",
    art_interests: "", preferred_styles: "",
  });

  useEffect(() => {
    fetch("/api/nova").then(r => r.json()).then(d => {
      setExistingAccount(d.account);
      setCheckingAccount(false);
    }).catch(() => setCheckingAccount(false));
  }, []);

  function updateForm(key: string, value: string) {
    setForm(f => ({ ...f, [key]: value }));
  }

  async function handleSubmit() {
    if (!selectedType || !form.first_name || !form.last_name || !form.email) {
      toast({ title: "Champs obligatoires manquants", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/nova", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account_type: selectedType, ...form, network_size: parseInt(form.network_size) || 0 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data);
      setStep("success");
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally { setLoading(false); }
  }

  if (checkingAccount) {
    return <div className="flex items-center justify-center py-24"><Loader2 className="size-8 text-[#C9A84C] animate-spin" /></div>;
  }

  // Already has account — show dashboard
  if (existingAccount) {
    const acct = ACCOUNTS.find(a => a.type === existingAccount.account_type);
    const Icon = acct?.icon || CreditCard;
    return (
      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-[#C9A84C]/10 border border-[#C9A84C]/20 flex items-center justify-center mx-auto mb-3">
            <Building className="size-7 text-[#C9A84C]" />
          </div>
          <h1 className="text-2xl font-bold text-white">Nova Bank</h1>
          <p className="text-white/30 text-xs mt-1">La banque qui valorise votre art</p>
        </div>

        <div className={`rounded-2xl border ${acct?.border || "border-[#C9A84C]/20"} bg-gradient-to-b ${acct?.color || ""} p-5 mb-6`}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-black/30 flex items-center justify-center">
              <Icon className={`size-6 ${acct?.accent || "text-[#C9A84C]"}`} />
            </div>
            <div>
              <p className="text-white font-semibold">{acct?.name}</p>
              <p className="text-white/30 text-xs">{acct?.tagline}</p>
            </div>
            <div className="ml-auto px-2.5 py-1 rounded-full bg-green-500/15 text-green-400 text-[10px] font-bold">ACTIF</div>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-white/30">N° de compte</span><span className="text-white font-mono text-xs">{existingAccount.nova_account_number}</span></div>
            <div className="flex justify-between"><span className="text-white/30">Titulaire</span><span className="text-white">{existingAccount.first_name} {existingAccount.last_name}</span></div>
            <div className="flex justify-between"><span className="text-white/30">Bonus crédité</span><span className="text-green-400 font-semibold">{existingAccount.bonus_amount}€</span></div>
            {existingAccount.kit_tracking_number && (
              <div className="flex justify-between"><span className="text-white/30">Kit macro</span><span className="text-blue-400 text-xs font-mono">{existingAccount.kit_tracking_number}</span></div>
            )}
            <div className="flex justify-between"><span className="text-white/30">Ouvert le</span><span className="text-white/60">{new Date(existingAccount.created_at).toLocaleDateString("fr-FR")}</span></div>
          </div>
        </div>

        <div className="rounded-xl bg-white/3 border border-white/5 p-4 text-xs text-white/25 text-center">
          Nova Bank a versé 80€ à ART-CORE Solutions pour votre inscription partenaire.
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 min-h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="w-14 h-14 rounded-2xl bg-[#C9A84C]/10 border border-[#C9A84C]/20 flex items-center justify-center mx-auto mb-3">
          <Building className="size-7 text-[#C9A84C]" />
        </div>
        <h1 className="text-2xl font-bold text-white">NOVA BANK</h1>
        <p className="text-[#C9A84C]/60 text-xs tracking-[0.2em] mt-1">LA BANQUE QUI VALORISE VOTRE ART</p>
      </div>

      {/* ═══ Step 1: Choose account type ═══ */}
      {step === "choose" && (
        <div className="animate-fade-in space-y-3">
          <p className="text-white/40 text-sm text-center mb-4">Choisissez votre profil pour ouvrir un compte</p>

          {ACCOUNTS.map((acct) => {
            const Icon = acct.icon;
            return (
              <button key={acct.type} onClick={() => { setSelectedType(acct.type); setStep("form"); }}
                className={`w-full p-5 rounded-2xl border ${acct.border} bg-gradient-to-r ${acct.color} text-left active:scale-[0.98] transition-all`}>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-black/20 flex items-center justify-center shrink-0">
                    <Icon className={`size-6 ${acct.accent}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold">{acct.name}</p>
                    <p className="text-white/30 text-xs mb-1">{acct.tagline}</p>
                    <div className="flex items-center gap-1.5">
                      <Gift className="size-3 text-green-400" />
                      <p className="text-green-400 text-xs font-medium">{acct.bonus}</p>
                    </div>
                  </div>
                  <ChevronRight className="size-5 text-white/20 shrink-0" />
                </div>
              </button>
            );
          })}

          <div className="rounded-xl bg-white/3 border border-white/5 p-4 mt-4">
            <p className="text-[11px] text-white/25 text-center leading-relaxed">
              En ouvrant un compte, Nova Bank verse 80€ à ART-CORE Solutions.<br />
              Vous recevez 15€ d&apos;avantages immédiats.
            </p>
          </div>
        </div>
      )}

      {/* ═══ Step 2: Form ═══ */}
      {step === "form" && selectedType && (() => {
        const acct = ACCOUNTS.find(a => a.type === selectedType)!;
        const Icon = acct.icon;
        return (
          <div className="animate-fade-in">
            <div className={`flex items-center gap-3 p-3 rounded-xl border ${acct.border} bg-gradient-to-r ${acct.color} mb-6`}>
              <Icon className={`size-5 ${acct.accent}`} />
              <span className="text-white font-medium text-sm">{acct.name}</span>
              <span className="ml-auto text-green-400 text-xs">{acct.bonus}</span>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-white/30 uppercase tracking-widest">Identité</p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-white/40 mb-1 block">Prénom *</label>
                  <input value={form.first_name} onChange={e => updateForm("first_name", e.target.value)}
                    className="w-full h-12 rounded-xl bg-white/5 border border-white/10 text-white px-3 text-sm focus:outline-none focus:border-[#C9A84C]/40" />
                </div>
                <div>
                  <label className="text-xs text-white/40 mb-1 block">Nom *</label>
                  <input value={form.last_name} onChange={e => updateForm("last_name", e.target.value)}
                    className="w-full h-12 rounded-xl bg-white/5 border border-white/10 text-white px-3 text-sm focus:outline-none focus:border-[#C9A84C]/40" />
                </div>
              </div>

              <div>
                <label className="text-xs text-white/40 mb-1 block">Date de naissance</label>
                <input type="date" value={form.date_of_birth} onChange={e => updateForm("date_of_birth", e.target.value)}
                  className="w-full h-12 rounded-xl bg-white/5 border border-white/10 text-white px-3 text-sm focus:outline-none focus:border-[#C9A84C]/40" />
              </div>

              <p className="text-xs text-white/30 uppercase tracking-widest pt-2">Contact</p>

              <div>
                <label className="text-xs text-white/40 mb-1 block">Email *</label>
                <input type="email" inputMode="email" value={form.email} onChange={e => updateForm("email", e.target.value)}
                  className="w-full h-12 rounded-xl bg-white/5 border border-white/10 text-white px-3 text-sm focus:outline-none focus:border-[#C9A84C]/40" />
              </div>

              <div>
                <label className="text-xs text-white/40 mb-1 block">Téléphone</label>
                <input type="tel" inputMode="tel" value={form.phone} onChange={e => updateForm("phone", e.target.value)}
                  placeholder="+33 6 12 34 56 78"
                  className="w-full h-12 rounded-xl bg-white/5 border border-white/10 text-white px-3 text-sm focus:outline-none focus:border-[#C9A84C]/40" />
              </div>

              <p className="text-xs text-white/30 uppercase tracking-widest pt-2">
                {selectedType === "ambassador" ? "Adresse de livraison (kit macro)" : "Adresse"}
              </p>

              <div>
                <input value={form.address_line1} onChange={e => updateForm("address_line1", e.target.value)}
                  placeholder="Adresse" className="w-full h-12 rounded-xl bg-white/5 border border-white/10 text-white px-3 text-sm focus:outline-none focus:border-[#C9A84C]/40" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <input value={form.postal_code} onChange={e => updateForm("postal_code", e.target.value)}
                  placeholder="Code postal" inputMode="numeric"
                  className="w-full h-12 rounded-xl bg-white/5 border border-white/10 text-white px-3 text-sm focus:outline-none focus:border-[#C9A84C]/40" />
                <input value={form.city} onChange={e => updateForm("city", e.target.value)}
                  placeholder="Ville" className="col-span-2 w-full h-12 rounded-xl bg-white/5 border border-white/10 text-white px-3 text-sm focus:outline-none focus:border-[#C9A84C]/40" />
              </div>

              {/* IBAN for artist, initiate, collector */}
              {["artist", "initiate", "collector"].includes(selectedType) && (
                <>
                  <p className="text-xs text-white/30 uppercase tracking-widest pt-2">Bancaire</p>
                  <div>
                    <label className="text-xs text-white/40 mb-1 block">IBAN</label>
                    <input value={form.iban} onChange={e => updateForm("iban", e.target.value)}
                      placeholder="FR76 1234 5678 9012 3456 7890 123"
                      className="w-full h-12 rounded-xl bg-white/5 border border-white/10 text-white px-3 text-sm font-mono focus:outline-none focus:border-[#C9A84C]/40" />
                  </div>
                </>
              )}

              {/* Artist-specific */}
              {selectedType === "artist" && (
                <>
                  <p className="text-xs text-white/30 uppercase tracking-widest pt-2">Profil artistique</p>
                  <div>
                    <label className="text-xs text-white/40 mb-1 block">Spécialité</label>
                    <div className="flex flex-wrap gap-2">
                      {SPECIALTIES.map(s => (
                        <button key={s} type="button" onClick={() => updateForm("specialty", s)}
                          className={`px-3 py-2 rounded-lg text-xs transition-all ${form.specialty === s ? "bg-[#C9A84C] text-black font-semibold" : "bg-white/5 text-white/50"}`}>
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-white/40 mb-1 block">Portfolio (optionnel)</label>
                    <input type="url" value={form.portfolio_url} onChange={e => updateForm("portfolio_url", e.target.value)}
                      placeholder="https://..."
                      className="w-full h-12 rounded-xl bg-white/5 border border-white/10 text-white px-3 text-sm focus:outline-none focus:border-[#C9A84C]/40" />
                  </div>
                </>
              )}

              {/* Ambassador-specific */}
              {selectedType === "ambassador" && (
                <>
                  <p className="text-xs text-white/30 uppercase tracking-widest pt-2">Profil ambassadeur</p>
                  <div>
                    <label className="text-xs text-white/40 mb-1 block">Zone géographique couverte</label>
                    <input value={form.geo_zone} onChange={e => updateForm("geo_zone", e.target.value)}
                      placeholder="Ex: Paris et Île-de-France"
                      className="w-full h-12 rounded-xl bg-white/5 border border-white/10 text-white px-3 text-sm focus:outline-none focus:border-[#C9A84C]/40" />
                  </div>
                  <div>
                    <label className="text-xs text-white/40 mb-1 block">Artistes dans votre réseau (estimation)</label>
                    <input type="number" inputMode="numeric" value={form.network_size} onChange={e => updateForm("network_size", e.target.value)}
                      placeholder="10"
                      className="w-full h-12 rounded-xl bg-white/5 border border-white/10 text-white px-3 text-sm focus:outline-none focus:border-[#C9A84C]/40" />
                  </div>
                </>
              )}

              {/* Initiate / Collector — interests */}
              {["initiate", "collector"].includes(selectedType) && (
                <>
                  <p className="text-xs text-white/30 uppercase tracking-widest pt-2">Préférences artistiques</p>
                  <div>
                    <label className="text-xs text-white/40 mb-1 block">Styles préférés</label>
                    <div className="flex flex-wrap gap-2">
                      {STYLES.map(s => (
                        <button key={s} type="button"
                          onClick={() => {
                            const current = form.preferred_styles ? form.preferred_styles.split(",") : [];
                            const updated = current.includes(s) ? current.filter(x => x !== s) : [...current, s];
                            updateForm("preferred_styles", updated.join(","));
                          }}
                          className={`px-3 py-2 rounded-lg text-xs transition-all ${
                            form.preferred_styles?.includes(s) ? "bg-[#C9A84C] text-black font-semibold" : "bg-white/5 text-white/50"
                          }`}>
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-3 mt-8 pb-4">
              <button onClick={() => { setStep("choose"); setSelectedType(null); }}
                className="flex-1 py-4 rounded-xl border border-white/10 text-white/50 font-medium active:bg-white/5">
                Retour
              </button>
              <button onClick={handleSubmit} disabled={!form.first_name || !form.last_name || !form.email || loading}
                className="flex-1 py-4 rounded-xl bg-[#C9A84C] text-[#0a0a0a] font-semibold disabled:opacity-30 active:brightness-90 flex items-center justify-center gap-2">
                {loading ? <Loader2 className="size-5 animate-spin" /> : <CreditCard className="size-5" />}
                Ouvrir le compte
              </button>
            </div>
          </div>
        );
      })()}

      {/* ═══ Step 3: Success ═══ */}
      {step === "success" && result && (() => {
        const acct = ACCOUNTS.find(a => a.type === selectedType)!;
        const Icon = acct.icon;
        return (
          <div className="animate-fade-in">
            <div className="text-center mb-8">
              <div className="w-20 h-20 rounded-full bg-green-500/10 border-2 border-green-500/30 flex items-center justify-center mx-auto mb-4">
                <Check className="size-10 text-green-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-1">Compte ouvert !</h2>
              <p className="text-white/40 text-sm">Bienvenue chez Nova Bank</p>
            </div>

            <div className={`rounded-2xl border ${acct.border} bg-gradient-to-b ${acct.color} p-5 mb-6 space-y-4`}>
              <div className="flex items-center gap-3">
                <Icon className={`size-6 ${acct.accent}`} />
                <div>
                  <p className="text-white font-semibold">{acct.name}</p>
                  <p className="text-white font-mono text-xs mt-0.5">{result.nova_account_number}</p>
                </div>
              </div>

              <div className="rounded-xl bg-green-500/10 border border-green-500/20 p-4 flex items-center gap-3">
                <Gift className="size-6 text-green-400 shrink-0" />
                <div>
                  <p className="text-green-400 font-semibold">{result.bonus_amount}€ crédités !</p>
                  <p className="text-white/30 text-xs">{acct.bonusDetail}</p>
                </div>
              </div>

              {result.kit_tracking && (
                <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-4 flex items-center gap-3">
                  <Package className="size-6 text-blue-400 shrink-0" />
                  <div>
                    <p className="text-blue-400 font-semibold">Kit macro en cours d&apos;envoi</p>
                    <p className="text-white/30 text-xs font-mono">{result.kit_tracking}</p>
                  </div>
                </div>
              )}

              <p className="text-white/20 text-[10px] text-center">
                Nova Bank a versé 80€ à ART-CORE Solutions pour votre inscription.
              </p>
            </div>

            <div className="space-y-3">
              <button onClick={() => { router.push("/art-core"); router.refresh(); }}
                className="w-full py-4 rounded-xl bg-[#C9A84C] text-[#0a0a0a] font-semibold active:brightness-90">
                Commencer sur ART-CORE
              </button>
              {selectedType === "ambassador" && (
                <a href="https://pass-core.app/pass-core/certifier"
                  className="w-full py-4 rounded-xl border border-blue-500/30 text-blue-400 font-medium text-center block active:bg-blue-500/5">
                  Certifier ma première oeuvre
                </a>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
