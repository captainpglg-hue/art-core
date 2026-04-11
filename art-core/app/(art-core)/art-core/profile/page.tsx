"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", username: "", bio: "" });

  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(d => {
      if (d.user) {
        setUser(d.user);
        setForm({ name: d.user.name || "", username: d.user.username || "", bio: d.user.bio || "" });
      }
      setLoading(false);
    });
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast({ title: "Profil mis à jour" });
      router.refresh();
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally { setSaving(false); }
  }

  if (loading) return <div className="flex items-center justify-center py-24"><div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin" /></div>;

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <h1 className="font-playfair text-3xl font-semibold text-white mb-8">Mon profil</h1>

      <div className="space-y-4">
        <div>
          <Label>Nom</Label>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1.5" />
        </div>
        <div>
          <Label>Nom d&apos;utilisateur</Label>
          <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} className="mt-1.5" />
        </div>
        <div>
          <Label>Bio</Label>
          <textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} rows={4} className="w-full mt-1.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white p-3 resize-none focus:outline-none focus:border-gold/40" />
        </div>
        <div className="p-3 rounded-xl bg-white/3 border border-white/5 text-sm text-white/40">
          <p>Email: {user?.email}</p>
          <p>Rôle: {user?.role === "artist" ? "Artiste" : user?.is_initie ? "Initié" : "Client"}</p>
          <p>Points: {user?.points_balance} pts</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="w-full gap-2">
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Enregistrer
        </Button>
      </div>
    </div>
  );
}
