"use client";

import { useState, useEffect, useCallback } from "react";
import { Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  content: string;
  created_at: string;
  is_owner: boolean; // true = sent by current_owner_id side, false = sent by initié
  sender_tag: string; // e.g. "Initié_A3F2" or "Propriétaire_B1E9"
}

interface PassCoreMessagesProps {
  passCoreId: string;
  currentUserId: string;
}

export function PassCoreMessages({ passCoreId, currentUserId }: PassCoreMessagesProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/pass-core/messages?pass_core_id=${passCoreId}`);
      if (!res.ok) return;
      const data = await res.json();
      setMessages(data.messages ?? []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [passCoreId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;

    setSending(true);
    try {
      const res = await fetch("/api/pass-core/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pass_core_id: passCoreId, content: trimmed }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Erreur envoi");
      }
      setText("");
      await fetchMessages();
    } catch (err) {
      toast({
        title: "Erreur",
        description: err instanceof Error ? err.message : "Réessayez.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="size-5 animate-spin text-white/20" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Message list */}
      <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
        {messages.length === 0 ? (
          <p className="text-center text-xs text-white/25 py-6">
            Aucun message pour l&apos;instant. Soyez le premier à écrire.
          </p>
        ) : (
          messages.map((msg) => {
            const isMine = msg.sender_tag.includes(currentUserId.replace(/-/g, "").slice(0, 4).toUpperCase());
            return (
              <div
                key={msg.id}
                className={cn("flex flex-col gap-1", isMine ? "items-end" : "items-start")}
              >
                <span className="text-[9px] uppercase tracking-widest text-white/25 px-1">
                  {msg.sender_tag}
                </span>
                <div
                  className={cn(
                    "rounded-xl px-3.5 py-2.5 text-sm max-w-[80%] leading-relaxed",
                    isMine
                      ? "bg-gold/15 border border-gold/25 text-white/80"
                      : "bg-white/5 border border-white/8 text-white/60"
                  )}
                >
                  {msg.content}
                </div>
                <span className="text-[9px] text-white/20 px-1">
                  {new Date(msg.created_at).toLocaleDateString("fr-FR", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            );
          })
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="flex gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Message anonyme…"
          maxLength={500}
          className={cn(
            "flex-1 rounded-lg border border-white/10 bg-white/5 px-3.5 py-2 text-sm text-white placeholder:text-white/25",
            "focus:outline-none focus:ring-1 focus:ring-gold/40 focus:border-gold/40 transition-colors"
          )}
        />
        <Button
          type="submit"
          size="sm"
          disabled={sending || !text.trim()}
          className="bg-gold/90 hover:bg-gold text-dark font-semibold shrink-0"
        >
          {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        </Button>
      </form>
    </div>
  );
}
