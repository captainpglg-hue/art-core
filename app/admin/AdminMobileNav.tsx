"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  X,
  LayoutDashboard,
  Users,
  Image,
  Receipt,
  Network,
  Settings,
  FileDown,
} from "lucide-react";

const iconMap: Record<string, React.FC<{ className?: string }>> = {
  LayoutDashboard,
  Users,
  Image,
  Receipt,
  Network,
  Settings,
  FileDown,
};

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

export function AdminMobileNav({ items }: { items: NavItem[] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="md:hidden">
      {/* Top bar */}
      <div className="fixed top-0 inset-x-0 z-50 h-14 bg-[#111] border-b border-white/10 flex items-center justify-between px-4">
        <span className="font-playfair text-sm font-bold text-[#D4AF37] tracking-wider">
          ART-CORE ADMIN
        </span>
        <button
          onClick={() => setOpen(!open)}
          className="text-white/60 hover:text-white transition-colors"
        >
          {open ? <X className="size-6" /> : <Menu className="size-6" />}
        </button>
      </div>

      {/* Mobile overlay */}
      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/60"
            onClick={() => setOpen(false)}
          />
          <nav className="fixed top-14 inset-x-0 z-50 bg-[#111] border-b border-white/10 p-4 space-y-1 animate-fade-in">
            {items.map((item) => {
              const Icon = iconMap[item.icon];
              const isActive =
                item.href === "/admin"
                  ? pathname === "/admin"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-colors ${
                    isActive
                      ? "text-[#D4AF37] bg-[#D4AF37]/10"
                      : "text-white/60 hover:text-[#D4AF37] hover:bg-white/[0.03]"
                  }`}
                >
                  {Icon && (
                    <Icon
                      className={`size-5 ${
                        isActive ? "text-[#D4AF37]" : "text-white/40"
                      }`}
                    />
                  )}
                  {item.label}
                </Link>
              );
            })}
            <Link
              href="/"
              onClick={() => setOpen(false)}
              className="block px-4 py-3 text-xs text-white/30 hover:text-white/60"
            >
              &larr; Retour au site
            </Link>
          </nav>
        </>
      )}
    </div>
  );
}
