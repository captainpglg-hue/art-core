"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Send, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ConversationPage() {
  const params = useParams();
  const router = useRouter();
  const conversationId = params.id as string;
  const [messages, setMessages] = useState<any[]>([]);
  const [newMsg, setNewMsg] = useState("");
  const [user, setUser] = useState<any>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(d => setUser(d.user));
    loadMessages();
    const interval = setInterval(loadMessages, 5000);
    return () => clearInterval(interval);
  }, [conversationId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  function loadMessages() {
    fetch(`/api/messages/${conversationId}`).then(r => r.json()).then(d => setMessages(d.messages || []));
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!newMsg.trim() || !messages.length) return;
    const lastMsg = messages[messages.length - 1];
    const receiverId = lastMsg.sender_id === user?.id ? lastMsg.receiver_id : lastMsg.sender_id;

    await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ receiver_id: receiverId, content: newMsg, artwork_id: lastMsg.artwork_id }),
    });
    setNewMsg("");
    loadMessages();
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => router.push("/art-core/messages")} className="text-white/40 hover:text-white"><ArrowLeft className="size-5" /></button>
        <h1 className="text-lg font-semibold text-white">Conversation</h1>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 mb-4">
        {messages.map((m) => {
          const isMe = m.sender_id === user?.id;
          return (
            <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm ${isMe ? "bg-gold text-black rounded-br-md" : "bg-white/8 text-white/80 rounded-bl-md"}`}>
                {!isMe && <p className="text-[10px] font-medium mb-0.5 opacity-60">{m.sender_name}</p>}
                <p>{m.content}</p>
                <p className={`text-[10px] mt-1 ${isMe ? "text-black/40" : "text-white/25"}`}>
                  {new Date(m.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="flex gap-2">
        <Input value={newMsg} onChange={(e) => setNewMsg(e.target.value)} placeholder="Votre message..." className="flex-1" />
        <Button type="submit" size="sm" className="gap-1.5"><Send className="size-3.5" /></Button>
      </form>
    </div>
  );
}
