"use client";

import { useState } from "react";
import {
  Users,
  Copy,
  Check,
  TrendingUp,
  Award,
  UserPlus,
  Link as LinkIcon,
} from "lucide-react";

const myStats = {
  artistesScoutes: 14,
  commissionTotale: 1280,
  niveau: "Connaisseur",
};

const recruitedScouts = [
  { id: 1, name: "Scout_Alpha", artistes: 8, commission: 320 },
  { id: 2, name: "Scout_Bravo", artistes: 5, commission: 180 },
  { id: 3, name: "Scout_Charlie", artistes: 12, commission: 450 },
  { id: 4, name: "Scout_Delta", artistes: 3, commission: 95 },
  { id: 5, name: "Scout_Echo", artistes: 7, commission: 235 },
];

export default function ScoutsPage() {
  const [copied, setCopied] = useState(false);
  const referralLink = "https://art-core.app/auth/signup?ref=MON_PSEUDO";

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-fade-in">
      <h1 className="font-playfair text-3xl font-semibold text-white mb-2">Réseau de scouts</h1>
      <p className="text-white/40 text-sm mb-8">Recrutez, développez votre réseau et gagnez des commissions.</p>

      {/* My Stats */}
      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        <div className="rounded-2xl bg-white/[0.03] border border-white/[0.08] p-5">
          <Users className="size-5 text-[#2ecc71] mb-3" />
          <p className="text-2xl font-bold text-white tabular-nums">{myStats.artistesScoutes}</p>
          <p className="text-xs text-white/30 mt-1">Artistes scoutés</p>
        </div>
        <div className="rounded-2xl bg-white/[0.03] border border-white/[0.08] p-5">
          <TrendingUp className="size-5 text-[#D4AF37] mb-3" />
          <p className="text-2xl font-bold text-white tabular-nums">{myStats.commissionTotale} €</p>
          <p className="text-xs text-white/30 mt-1">Commission totale</p>
        </div>
        <div className="rounded-2xl bg-white/[0.03] border border-white/[0.08] p-5">
          <Award className="size-5 text-[#2ecc71] mb-3" />
          <p className="text-2xl font-bold text-white">{myStats.niveau}</p>
          <p className="text-xs text-white/30 mt-1">Niveau</p>
        </div>
      </div>

      {/* Referral Link */}
      <div className="rounded-2xl bg-gradient-to-br from-[#2ecc71]/10 to-[#D4AF37]/5 border border-[#2ecc71]/20 p-6 mb-8">
        <div className="flex items-center gap-2 mb-3">
          <LinkIcon className="size-5 text-[#2ecc71]" />
          <h2 className="text-lg font-semibold text-white">Partagez ce lien pour recruter</h2>
        </div>
        <p className="text-xs text-white/40 mb-4">
          Chaque scout recruté via votre lien génère des commissions sur ses activités.
        </p>
        <div className="flex gap-2">
          <div className="flex-1 px-4 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.08] text-sm text-white/60 truncate">
            {referralLink}
          </div>
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#2ecc71] text-white text-sm font-medium hover:bg-[#27ae60] transition-colors shrink-0"
          >
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            {copied ? "Copié" : "Copier"}
          </button>
        </div>
      </div>

      {/* Recruited Scouts */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <UserPlus className="size-5 text-[#D4AF37]" />
          <h2 className="text-lg font-semibold text-white">Mon réseau</h2>
          <span className="ml-auto text-xs text-white/30">{recruitedScouts.length} scouts recrutés</span>
        </div>
        <div className="space-y-2">
          {recruitedScouts.map((scout) => (
            <div
              key={scout.id}
              className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-white/[0.08]"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#2ecc71]/10 flex items-center justify-center">
                  <span className="text-sm font-bold text-[#2ecc71]">
                    {scout.name.charAt(0)}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{scout.name}</p>
                  <p className="text-[11px] text-white/30">{scout.artistes} artistes scoutés</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-[#D4AF37] tabular-nums">{scout.commission} €</p>
                <p className="text-[10px] text-white/25">commission</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
