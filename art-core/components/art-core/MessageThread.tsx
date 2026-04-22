"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  body: string;
  is_read: boolean;
  created_at: string;
  sender_id: string;
  sender?: {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string | null;
  } | null;
}

interface MessageThreadProps {
  conversationId: string; // format: artworkId_otherUserId
  currentUserId: string;
  otherUser: {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string | null;
  };
  artworkId: string;
}

export function MessageThread({
  conversationId,
  currentUserId,
  otherUser,
  artworkId,
}: MessageThreadProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMessages();
    // Poll every 5s for new messages
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [conversationId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  async function fetchMessages() {
    try {
      const res = await fetch(`/api/messages/${conversationId}`);
      const data = await res.json();
      if (data.messages) setMessages(data.messages);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  async function handleSend() {
    if (!newMessage.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient_id: otherUser.id,
          artwork_id: artworkId,
          message: newMessage.trim(),
        }),
      });
      if (res.ok) {
        setNewMessage("");
        await fetchMessages();
      }
    } catch {
      // silent
    } finally {
      setSending(false);
    }
  }

  const otherInitials = otherUser.full_name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) ?? "?";

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="size-5 animate-spin text-white/30" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-sm text-white/30">Commencez la conversation</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMine = msg.sender_id === currentUserId;
            return (
              <div
                key={msg.id}
                className={cn("flex gap-2", isMine ? "flex-row-reverse" : "")}
              >
                {!isMine && (
                  <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-[9px] font-medium text-white/50 shrink-0 overflow-hidden">
                    {otherUser.avatar_url ? (
                      <Image
                        src={otherUser.avatar_url}
                        alt={otherUser.full_name}
                        width={28}
                        height={28}
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      otherInitials
                    )}
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[75%] rounded-2xl px-4 py-2.5",
                    isMine
                      ? "bg-[#C9A84C]/15 text-white rounded-br-md"
                      : "bg-white/5 text-white/80 rounded-bl-md"
                  )}
                >
                  <p className="text-sm leading-relaxed">{msg.body}</p>
                  <p className={cn(
                    "text-[10px] mt-1",
                    isMine ? "text-[#C9A84C]/40 text-right" : "text-white/20"
                  )}>
                    {new Date(msg.created_at).toLocaleTimeString("fr-FR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input */}
      <div className="border-t border-white/8 p-3">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder="Votre message..."
            className="flex-1 h-10 px-4 rounded-xl bg-white/5 border border-white/8 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#C9A84C]/40 transition-colors"
          />
          <button
            onClick={handleSend}
            disabled={!newMessage.trim() || sending}
            className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
              newMessage.trim()
                ? "bg-[#C9A84C] text-black hover:bg-[#C9A84C]/80"
                : "bg-white/5 text-white/20"
            )}
          >
            {sending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
