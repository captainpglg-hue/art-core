"use client";

import { useState } from "react";
import { Loader2, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AdminSettings() {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const [settings, setSettings] = useState({
    commissionPlateforme: "10",
    royaltyRevente: "5",
    commissionScout: "2",
    passProprietaire: "49",
    passProprietaireMensuel: "5",
    passMagnat: "9.90",
    consultationPassCore: "0.50",
    maintenanceMode: false,
    companyName: "ART-CORE GROUP LTD",
    companyJurisdiction: "Companies House UK",
    contactEmail: "contact@art-core.app",
    domain: "art-core.app",
  });

  const update = (key: string, value: string | boolean) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        toast({ title: "Paramètres sauvegardés", variant: "success" });
      } else {
        toast({ title: "Erreur lors de la sauvegarde", variant: "destructive" });
      }
    } catch {
      toast({ title: "Erreur réseau", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-fade-in space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-playfair text-2xl md:text-3xl font-bold text-white">
          Paramètres
        </h1>
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#D4AF37] text-black text-sm font-medium hover:bg-[#D4AF37]/90 transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Sauvegarder
        </button>
      </div>

      {/* Commission Rates */}
      <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 space-y-5">
        <h2 className="font-playfair text-lg font-semibold text-white">
          Taux de commission
        </h2>
        <div className="grid sm:grid-cols-3 gap-4">
          <SettingInput
            label="Plateforme (%)"
            value={settings.commissionPlateforme}
            onChange={(v) => update("commissionPlateforme", v)}
          />
          <SettingInput
            label="Royalty artiste revente (%)"
            value={settings.royaltyRevente}
            onChange={(v) => update("royaltyRevente", v)}
          />
          <SettingInput
            label="Scout (%)"
            value={settings.commissionScout}
            onChange={(v) => update("commissionScout", v)}
          />
        </div>
      </div>

      {/* Subscription Prices */}
      <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 space-y-5">
        <h2 className="font-playfair text-lg font-semibold text-white">
          Tarifs abonnements
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SettingInput
            label="Pass Propriétaire (€)"
            value={settings.passProprietaire}
            onChange={(v) => update("passProprietaire", v)}
          />
          <SettingInput
            label="+ Mensuel (€/mois)"
            value={settings.passProprietaireMensuel}
            onChange={(v) => update("passProprietaireMensuel", v)}
          />
          <SettingInput
            label="Pass Magnat Initié (€/mois)"
            value={settings.passMagnat}
            onChange={(v) => update("passMagnat", v)}
          />
          <SettingInput
            label="Consultation Pass-Core (€)"
            value={settings.consultationPassCore}
            onChange={(v) => update("consultationPassCore", v)}
          />
        </div>
      </div>

      {/* Maintenance */}
      <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 space-y-5">
        <h2 className="font-playfair text-lg font-semibold text-white">
          Maintenance
        </h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-white">Mode maintenance</p>
            <p className="text-xs text-white/40 mt-0.5">
              Désactive l&apos;accès public au site
            </p>
          </div>
          <button
            onClick={() => update("maintenanceMode", !settings.maintenanceMode)}
            className={`relative w-12 h-7 rounded-full transition-colors ${
              settings.maintenanceMode ? "bg-[#ff6347]" : "bg-white/10"
            }`}
          >
            <span
              className={`absolute top-1 size-5 rounded-full bg-white transition-transform ${
                settings.maintenanceMode ? "left-6" : "left-1"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Platform Info */}
      <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 space-y-5">
        <h2 className="font-playfair text-lg font-semibold text-white">
          Informations plateforme
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <SettingInput
            label="Nom de l'entreprise"
            value={settings.companyName}
            onChange={(v) => update("companyName", v)}
          />
          <SettingInput
            label="Juridiction"
            value={settings.companyJurisdiction}
            onChange={(v) => update("companyJurisdiction", v)}
          />
          <SettingInput
            label="Email de contact"
            value={settings.contactEmail}
            onChange={(v) => update("contactEmail", v)}
          />
          <SettingInput
            label="Domaine"
            value={settings.domain}
            onChange={(v) => update("domain", v)}
          />
        </div>
      </div>
    </div>
  );
}

function SettingInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs text-white/50 font-medium">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-sm text-white focus:outline-none focus:border-[#D4AF37]/50 transition-colors"
      />
    </div>
  );
}
