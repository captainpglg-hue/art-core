"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

function calcTimeLeft(endsAt: string) {
  const diff = new Date(endsAt).getTime() - Date.now();
  if (diff <= 0) return null;
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return { h, m, s, diff };
}

export function BetCountdown({ endsAt, className }: { endsAt: string; className?: string }) {
  const [timeLeft, setTimeLeft] = useState(() => calcTimeLeft(endsAt));

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calcTimeLeft(endsAt));
    }, 1000);
    return () => clearInterval(timer);
  }, [endsAt]);

  if (!timeLeft) {
    return (
      <span className={cn("text-xs text-white/30 flex items-center gap-1", className)}>
        <Clock className="size-3" />
        Terminé
      </span>
    );
  }

  const isUrgent = timeLeft.diff < 3600000; // < 1h
  const isCritical = timeLeft.diff < 600000; // < 10min

  return (
    <span
      className={cn(
        "flex items-center gap-1.5 text-xs font-mono font-semibold tabular-nums",
        isCritical
          ? "text-[#FF4D6A] animate-pulse"
          : isUrgent
          ? "text-orange-400"
          : "text-white/60",
        className
      )}
    >
      <Clock className="size-3 shrink-0" />
      {timeLeft.h > 0
        ? `${timeLeft.h}h ${String(timeLeft.m).padStart(2, "0")}m`
        : `${String(timeLeft.m).padStart(2, "0")}:${String(timeLeft.s).padStart(2, "0")}`}
    </span>
  );
}
