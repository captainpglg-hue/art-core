import Link from "next/link";

export function Footer() {
  return (
    <footer className="no-print border-t border-white/5 bg-[#0a0a0a]/80 mt-12">
      <div className="max-w-screen-2xl mx-auto px-4 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-6 text-xs text-white/30">
            <Link href="/legal/cgu" className="hover:text-white/60 transition-colors">
              CGU
            </Link>
            <Link href="/conformite" className="hover:text-white/60 transition-colors">
              Conformité réglementaire
            </Link>
            <a href="mailto:contact@art-core.app" className="hover:text-white/60 transition-colors">
              Contact
            </a>
          </div>
          <p className="text-[10px] text-white/20">
            © {new Date().getFullYear()} ART-CORE GROUP LTD — Tous droits réservés
          </p>
        </div>
      </div>
    </footer>
  );
}
