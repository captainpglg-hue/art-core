import type { Metadata } from "next";
import Link from "next/link";
import { Toaster } from "@/components/ui/toaster";
import {
  LayoutDashboard,
  Users,
  Image,
  Receipt,
  Network,
  Settings,
  FileDown,
} from "lucide-react";
import { AdminMobileNav } from "./AdminMobileNav";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s | ART-CORE Admin" },
  description: "Panneau d'administration ART-CORE",
};

const navItems = [
  { href: "/admin", label: "Dashboard", icon: "LayoutDashboard" },
  { href: "/admin/users", label: "Utilisateurs", icon: "Users" },
  { href: "/admin/artworks", label: "Oeuvres", icon: "Image" },
  { href: "/admin/transactions", label: "Transactions", icon: "Receipt" },
  { href: "/admin/network", label: "Réseau", icon: "Network" },
  { href: "/admin/settings", label: "Paramètres", icon: "Settings" },
  { href: "/admin/export", label: "Export", icon: "FileDown" },
] as const;

const iconMap: Record<string, React.ReactNode> = {
  LayoutDashboard: <LayoutDashboard className="size-5" />,
  Users: <Users className="size-5" />,
  Image: <Image className="size-5" />,
  Receipt: <Receipt className="size-5" />,
  Network: <Network className="size-5" />,
  Settings: <Settings className="size-5" />,
  FileDown: <FileDown className="size-5" />,
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col bg-[#111] border-r border-white/10 fixed inset-y-0 left-0 z-40">
        <div className="p-6 border-b border-white/10">
          <Link href="/admin" className="block">
            <h1 className="font-playfair text-xl font-bold text-[#D4AF37] tracking-wider">
              ART-CORE ADMIN
            </h1>
          </Link>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-white/60 hover:text-[#D4AF37] hover:bg-white/[0.03] transition-colors group"
            >
              <span className="text-white/40 group-hover:text-[#D4AF37] transition-colors">
                {iconMap[item.icon]}
              </span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-white/10">
          <Link
            href="/"
            className="text-xs text-white/30 hover:text-white/60 transition-colors"
          >
            &larr; Retour au site
          </Link>
        </div>
      </aside>

      {/* Mobile Nav */}
      <AdminMobileNav items={navItems.map((n) => ({ href: n.href, label: n.label, icon: n.icon }))} />

      {/* Main Content */}
      <main className="flex-1 md:ml-64 min-h-screen">
        <div className="p-4 md:p-8 pt-16 md:pt-8">{children}</div>
      </main>

      <Toaster />
    </div>
  );
}
