import Link from "next/link";

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-20 border-t border-white/10 bg-black/40">
      <div className="max-w-screen-xl mx-auto px-4 lg:px-8 py-10 grid grid-cols-2 md:grid-cols-4 gap-8 text-sm">
        <div>
          <h4 className="text-gold font-semibold mb-3">ART-CORE</h4>
          <p className="text-white/50 text-xs leading-relaxed">
            Marketplace d&apos;art avec certification blockchain.
          </p>
        </div>
        <div>
          <h4 className="text-white/70 font-medium mb-3">Produit</h4>
          <ul className="space-y-2 text-white/50">
            <li><Link href="/art-core" className="hover:text-white">Marketplace</Link></li>
            <li><Link href="/art-core/about" className="hover:text-white">À propos</Link></li>
            <li><Link href="/art-core/faq" className="hover:text-white">FAQ</Link></li>
            <li><Link href="/pricing" className="hover:text-white">Tarifs</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-white/70 font-medium mb-3">Support</h4>
          <ul className="space-y-2 text-white/50">
            <li><Link href="/contact" className="hover:text-white">Nous contacter</Link></li>
            <li><Link href="/status" className="hover:text-white">État des services</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-white/70 font-medium mb-3">Légal</h4>
          <ul className="space-y-2 text-white/50">
            <li><Link href="/legal/cgu" className="hover:text-white">CGU</Link></li>
            <li><Link href="/legal/cgv" className="hover:text-white">CGV</Link></li>
            <li><Link href="/legal/mentions" className="hover:text-white">Mentions légales</Link></li>
            <li><Link href="/legal/confidentialite" className="hover:text-white">Confidentialité</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/5 py-4 text-center text-white/30 text-xs">
        © {year} ART-CORE — Écosystème core
      </div>
    </footer>
  );
}
