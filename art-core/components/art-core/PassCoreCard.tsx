"use client";

import { useState } from "react";
import { ShieldCheck, Lock, ChevronDown } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PassCore = any;

interface PassCoreCardProps {
  passCore: PassCore;
  artworkTitle?: string;
  className?: string;
}

export function PassCoreCard({ passCore, artworkTitle, className }: PassCoreCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const isLocked = passCore.status === "locked";
  const isActive = passCore.status === "active";

  return (
    <div
      className={cn(
        "rounded-xl border overflow-hidden",
        isLocked ? "border-gold/50" : "border-gold/25",
        className
      )}
    >
      {/* ── Primary view: Christie's simplicity ── */}
      <div className={cn("px-5 py-4", isLocked ? "bg-gold/8" : "bg-[#0A1128]")}>
        <div className="flex items-center gap-3">
          {/* Status icon */}
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
            isActive ? "bg-emerald-500/15" : "bg-gold/15"
          )}>
            {isLocked
              ? <Lock className="size-5 text-gold" />
              : <ShieldCheck className="size-5 text-emerald-400" />
            }
          </div>

          {/* Human-readable status */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <p className="text-sm font-bold text-white">
                {isActive ? "Authenticité certifiée ✅" : isLocked ? "Transfert en cours" : "Certificat"}
              </p>
            </div>
            <p className="text-xs text-white/40 truncate">
              {artworkTitle
                ? `"${artworkTitle}" — Pass-Core`
                : isActive
                ? "Enregistré sur la blockchain Polygon"
                : "Pass-Core · Art-Core LTD"}
            </p>
          </div>

          {/* Date */}
          <div className="text-right shrink-0">
            <p className="text-[10px] text-white/30">{formatDate(passCore.created_at)}</p>
          </div>
        </div>
      </div>

      {/* ── Details toggle ── */}
      <button
        onClick={() => setShowDetails((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-2.5 bg-[#071022] border-t border-white/5 text-[11px] text-white/30 hover:text-white/50 transition-colors"
      >
        <span>Détails blockchain</span>
        <ChevronDown className={cn("size-3.5 transition-transform duration-200", showDetails && "rotate-180")} />
      </button>

      {/* ── Hidden by default: technical details ── */}
      {showDetails && (
        <div className="bg-[#071022] px-5 pb-4 pt-1 space-y-3 border-t border-white/5">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className="text-[9px] uppercase tracking-widest text-white/25 mb-1">Hash SHA-256</p>
              <p className="font-mono text-gold/70 break-all text-[10px] leading-relaxed">
                {passCore.hash
                  ? `${passCore.hash.slice(0, 8)}…${passCore.hash.slice(-8)}`
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-widest text-white/25 mb-1">Transaction</p>
              <p className="font-mono text-white/40 text-[10px]">
                {passCore.tx_hash
                  ? `${passCore.tx_hash.slice(0, 10)}…`
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-widest text-white/25 mb-1">Réseau</p>
              <p className="text-white/50 capitalize">{passCore.network ?? "Polygon"}</p>
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-widest text-white/25 mb-1">Bloc</p>
              <p className="text-white/50 tabular-nums">
                #{passCore.block_number?.toLocaleString("fr-FR") ?? "—"}
              </p>
            </div>
          </div>
          {passCore.verification_url && (
            <a
              href={passCore.verification_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-gold/50 hover:text-gold transition-colors flex items-center gap-1.5"
            >
              Vérifier sur la blockchain →
            </a>
          )}
        </div>
      )}
    </div>
  );
}

// Uncertified placeholder — clean and simple
export function PassCoreCardEmpty() {
  return (
    <div className="rounded-xl border border-dashed border-white/10 bg-white/2 px-5 py-6 flex items-center gap-4">
      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
        <ShieldCheck className="size-5 text-white/20" />
      </div>
      <div>
        <p className="text-sm font-medium text-white/40">Non certifiée</p>
        <p className="text-xs text-white/25 mt-0.5">L&apos;artiste n&apos;a pas encore créé de certificat.</p>
      </div>
    </div>
  );
}
