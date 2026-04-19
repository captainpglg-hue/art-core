"use client";

import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { X, CheckCircle2, AlertCircle, Info } from "lucide-react";

export function Toaster() {
  const { toasts, dismiss } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-full max-w-sm">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            "relative flex items-start gap-3 rounded-xl border p-4 shadow-card-dark animate-fade-in-scale",
            toast.variant === "destructive"
              ? "bg-red-950/90 border-red-800/50 text-red-100"
              : toast.variant === "success"
              ? "bg-emerald-950/90 border-emerald-800/50 text-emerald-100"
              : "bg-dark-100 border-white/10 text-white"
          )}
        >
          <span className="mt-0.5 shrink-0">
            {toast.variant === "destructive" ? (
              <AlertCircle className="size-4 text-red-400" />
            ) : toast.variant === "success" ? (
              <CheckCircle2 className="size-4 text-emerald-400" />
            ) : (
              <Info className="size-4 text-gold" />
            )}
          </span>
          <div className="flex-1 min-w-0">
            {toast.title && (
              <p className="text-sm font-medium leading-tight">{toast.title}</p>
            )}
            {toast.description && (
              <p className="text-xs text-white/60 mt-0.5">{toast.description}</p>
            )}
          </div>
          <button
            onClick={() => dismiss(toast.id)}
            className="shrink-0 opacity-50 hover:opacity-100 transition-opacity"
          >
            <X className="size-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}
