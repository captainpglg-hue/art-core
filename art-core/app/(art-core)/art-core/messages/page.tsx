"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MessageSquare } from "lucide-react";

export default function MessagesPage() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/messages").then(r => r.json()).then(d => { setConversations(d.conversations || []); setLoading(false); });
  }, []);

  if (loading) return <div className="flex items-center justify-center py-24"><div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin" /></div>;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="font-playfair text-3xl font-semibold text-white mb-8">Messages</h1>

      {conversations.length === 0 ? (
        <div className="text-center py-16">
          <MessageSquare className="size-12 text-white/10 mx-auto mb-4" />
          <p className="text-white/40">Aucune conversation</p>
        </div>
      ) : (
        <div className="space-y-1">
          {conversations.map((c) => (
            <Link key={c.conversation_id} href={`/art-core/messages/${c.conversation_id}`}
              className="flex items-center gap-4 p-4 rounded-xl hover:bg-white/5 transition-colors">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-sm font-medium text-white/50 shrink-0">
                {c.other_user_name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-white truncate">{c.other_user_name}</p>
                  {c.artwork_title && <span className="text-[10px] text-white/25 truncate">— {c.artwork_title}</span>}
                </div>
                <p className="text-xs text-white/40 truncate">{c.last_message}</p>
              </div>
              {c.unread_count > 0 && (
                <span className="w-5 h-5 rounded-full bg-gold text-black text-[10px] font-bold flex items-center justify-center">{c.unread_count}</span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
