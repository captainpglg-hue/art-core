"use client";

import { useState } from "react";
import { Copy, Check, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

export function ShareButton() {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const url = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({ title: "Certificat Pass-Core", url });
        return;
      } catch {
        // fallback to copy
      }
    }

    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast({ title: "Lien copié !", description: "Partagez ce certificat." });
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="border-white/15 text-white/60 hover:text-white gap-1.5"
      onClick={handleShare}
    >
      {copied ? <Check className="size-3.5 text-emerald-400" /> : <Share2 className="size-3.5" />}
      {copied ? "Copié !" : "Partager"}
    </Button>
  );
}
