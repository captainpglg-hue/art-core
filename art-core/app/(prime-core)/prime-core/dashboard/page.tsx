export default function PrimeCoreRedirect() {
  return (
    <div className="min-h-screen bg-[#0D0F14] flex items-center justify-center">
      <div className="text-center">
        <h1 className="font-playfair text-3xl text-white mb-4">PRIME-CORE</h1>
        <p className="text-white/50 mb-6">Les marchés prédictifs sont disponibles sur l&apos;application dédiée.</p>
        <a href={`${process.env.NEXT_PUBLIC_PRIME_CORE_URL || "https://prime-core.app"}/prime-core/dashboard`} className="text-gold hover:underline">
          Accéder à PRIME-CORE
        </a>
      </div>
    </div>
  );
}
