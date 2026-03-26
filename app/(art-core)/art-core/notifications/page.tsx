"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadNotifs(); }, []);

  function loadNotifs() {
    fetch("/api/notifications").then(r => r.json()).then(d => { setNotifications(d.notifications || []); setLoading(false); });
  }

  async function markAllRead() {
    await fetch("/api/notifications", { method: "PUT" });
    loadNotifs();
  }

  if (loading) return <div className="flex items-center justify-center py-24"><div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin" /></div>;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-playfair text-3xl font-semibold text-white">Notifications</h1>
        {notifications.some(n => !n.read) && (
          <Button size="sm" variant="outline" onClick={markAllRead} className="gap-1.5"><Check className="size-3.5" />Tout lire</Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-16">
          <Bell className="size-12 text-white/10 mx-auto mb-4" />
          <p className="text-white/40">Aucune notification</p>
        </div>
      ) : (
        <div className="space-y-1">
          {notifications.map((n) => (
            <Link key={n.id} href={n.link || "#"} className={`block p-4 rounded-xl transition-colors ${n.read ? "hover:bg-white/3" : "bg-gold/5 hover:bg-gold/8"}`}>
              <div className="flex items-start gap-3">
                {!n.read && <div className="w-2 h-2 rounded-full bg-gold mt-1.5 shrink-0" />}
                <div>
                  <p className="text-sm font-medium text-white">{n.title}</p>
                  {n.message && <p className="text-xs text-white/40 mt-0.5">{n.message}</p>}
                  <p className="text-[10px] text-white/20 mt-1">{new Date(n.created_at).toLocaleDateString("fr-FR")}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
