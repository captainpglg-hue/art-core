"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

interface GaugeEntry {
  id: string;
  points: number;
  created_at: string;
  user?: {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string | null;
  } | null;
}

interface GaugeInitieListProps {
  entries: GaugeEntry[];
  totalPoints: number;
  className?: string;
}

export function GaugeInitieList({ entries, totalPoints, className }: GaugeInitieListProps) {
  if (!entries || entries.length === 0) {
    return (
      <div className={cn("text-center py-6", className)}>
        <p className="text-xs text-white/25">Aucun initie n&apos;a encore depose sur cette jauge</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-xs uppercase tracking-widest text-white/25 mb-3">
        Inities ({entries.length})
      </p>
      {entries.map((entry) => {
        const percentage = totalPoints > 0 ? ((entry.points / totalPoints) * 100).toFixed(1) : "0";
        const name = entry.user?.full_name ?? entry.user?.username ?? "Anonyme";
        const initials = name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

        return (
          <div
            key={entry.id}
            className="flex items-center gap-3 py-2.5 px-3 rounded-xl bg-white/3 hover:bg-white/5 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-white/10 border border-white/10 flex items-center justify-center text-[10px] font-medium text-white/60 overflow-hidden shrink-0">
              {entry.user?.avatar_url ? (
                <Image
                  src={entry.user.avatar_url}
                  alt={name}
                  width={32}
                  height={32}
                  className="object-cover w-full h-full"
                />
              ) : (
                initials
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm text-white/70 font-medium truncate">{name}</p>
              <p className="text-[10px] text-white/25">
                {new Date(entry.created_at).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "short",
                })}
              </p>
            </div>

            <div className="text-right shrink-0">
              <p className="text-sm font-bold text-[#C9A84C] tabular-nums">{entry.points} pts</p>
              <p className="text-[10px] text-white/25 tabular-nums">{percentage}%</p>
            </div>

            {/* Mini bar */}
            <div className="w-12 h-1.5 rounded-full bg-white/8 overflow-hidden shrink-0">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#C9A84C]/60 to-[#C9A84C]"
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
