import Link from "next/link";

export default function PassCoreCertifierRedirect() {
  return (
    <div className="min-h-screen bg-navy flex items-center justify-center">
      <div className="text-center">
        <h1 className="font-playfair text-3xl text-white mb-4">PASS-CORE</h1>
        <p className="text-white/50 mb-6">La certification est disponible sur l&apos;application dédiée.</p>
        <a href="http://localhost:3001/pass-core/certifier" className="text-gold hover:underline">
          Accéder à PASS-CORE (port 3001)
        </a>
      </div>
    </div>
  );
}
