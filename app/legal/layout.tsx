import Link from "next/link";

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0C0C0C] text-white">
      <header className="border-b border-white/5 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/art-core" className="text-[#D4AF37] font-bold text-lg tracking-wide">
            ART-CORE
          </Link>
          <Link href="/art-core" className="text-white/40 hover:text-white text-sm transition-colors">
            Retour
          </Link>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-6 py-10">
        {children}
      </main>
      <footer className="border-t border-white/5 px-6 py-6 text-center text-white/20 text-xs">
        ART-CORE GROUP LTD — Companies House UK — contact@art-core.app
      </footer>
    </div>
  );
}
