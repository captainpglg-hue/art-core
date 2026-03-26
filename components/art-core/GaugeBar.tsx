"use client";

import { cn } from "@/lib/utils";
import { Lock, Zap, TrendingUp } from "lucide-react";

interface GaugeEntry {
  id: string;
  points: number;
  user?: { id: string; username: string; full_name: string; avatar_url: string | null } | null;
}

interface GaugeBarProps {
  value: number; // 0-100
  status?: "open" | "locked" | "emptied" | "sold";
  locked?: boolean;
  entries?: GaugeEntry[];
  className?: string;
  compact?: boolean;
  label?: string;
  showValue?: boolean;
}

export function GaugeBar({
  value,
  status = "open",
  locked,
  entries,
  className,
  compact = false,
}: GaugeBarProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const isLocked = locked || status === "locked" || clamped >= 100;
  const isSold = status === "sold";
  const isEmptied = status === "emptied";

  if (compact) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div className="relative flex-1 h-1.5 bg-white/8 rounded-full overflow-hidden">
          <div
            className={cn(
              "absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out",
              isLocked
                ? "bg-gradient-to-r from-[#C9A84C] via-[#F5D76E] to-[#C9A84C]"
                : isEmptied
                ? "bg-white/15"
                : "bg-gradient-to-r from-[#C9A84C]/60 to-[#C9A84C]"
            )}
            style={{ width: `${isEmptied ? 0 : clamped}%` }}
          />
        </div>
        <span className={cn(
          "text-[10px] font-semibold tabular-nums shrink-0",
          isLocked ? "text-[#C9A84C]" : isEmptied ? "text-white/25" : "text-white/40"
        )}>
          {isEmptied ? "Vidée" : isSold ? "Vendu" : `${clamped}pts`}
        </span>
        {isLocked && <Lock className="size-2.5 text-[#C9A84C]" />}
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {/* Label row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {isLocked ? (
            <span className="flex items-center gap-1 text-[11px] font-semibold text-[#C9A84C]">
              <Lock className="size-3" />
              Deal verrouillé
            </span>
          ) : isEmptied ? (
            <span className="text-[11px] font-medium text-white/30">Jauge vidée par l&apos;artiste</span>
          ) : isSold ? (
            <span className="text-[11px] font-semibold text-green-400">Vendu</span>
          ) : clamped >= 70 ? (
            <span className="flex items-center gap-1 text-[11px] font-semibold text-[#C9A84C]">
              <TrendingUp className="size-3" />
              Forte demande
            </span>
          ) : clamped >= 30 ? (
            <span className="flex items-center gap-1 text-[11px] font-medium text-white/50">
              <Zap className="size-3" />
              En tendance
            </span>
          ) : (
            <span className="text-[11px] text-white/30">Jauge ouverte</span>
          )}
        </div>
        <span className={cn(
          "text-xs font-bold tabular-nums",
          isLocked ? "text-[#C9A84C]" : "text-white/40"
        )}>
          {isEmptied ? "0" : clamped}/100
        </span>
      </div>

      {/* Bar */}
      <div
        className={cn(
          "relative h-3 rounded-full overflow-hidden",
          isLocked
            ? "ring-2 ring-[#C9A84C]/50 animate-pulse-slow bg-white/5"
            : "bg-white/8"
        )}
      >
        <div
          className={cn(
            "absolute inset-y-0 left-0 rounded-full transition-all duration-1000 ease-out",
            isLocked
              ? "bg-gradient-to-r from-[#B8860B] via-[#C9A84C] via-50% to-[#F5D76E]"
              : isEmptied
              ? "bg-white/10"
              : "bg-gradient-to-r from-[#C9A84C]/50 via-[#C9A84C] to-[#F5D76E]"
          )}
          style={{ width: `${isEmptied ? 0 : clamped}%` }}
        >
          {/* Shimmer effect */}
          {!isEmptied && clamped > 0 && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
          )}
        </div>

        {/* Entry markers */}
        {entries && entries.length > 0 && !isEmptied && (
          <div className="absolute inset-0">
            {entries.reduce<{ offset: number; items: { offset: number; points: number; name: string }[] }>(
              (acc, entry) => {
                const item = {
                  offset: acc.offset,
                  points: entry.points,
                  name: entry.user?.full_name ?? entry.user?.username ?? "",
                };
                return {
                  offset: acc.offset + entry.points,
                  items: [...acc.items, item],
                };
              },
              { offset: 0, items: [] }
            ).items.map((item, i) => (
              <div
                key={i}
                className="absolute top-0 bottom-0 border-r border-white/20"
                style={{ left: `${item.offset + item.points}%` }}
                title={`${item.name}: ${item.points}pts`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Initiés count */}
      {entries && entries.length > 0 && !isEmptied && (
        <p className="text-[10px] text-white/25">
          {entries.length} initié{entries.length > 1 ? "s" : ""} ont déposé sur cette jauge
        </p>
      )}
    </div>
  );
}
