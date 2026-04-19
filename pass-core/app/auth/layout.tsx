import type { Metadata } from "next";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: { default: "Authentification", template: "%s | ART-CORE" },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0C0C0C] flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 relative overflow-hidden">
        {/* Background art */}
        <div className="absolute inset-0 bg-gradient-to-br from-dark-200 via-dark to-black" />
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "radial-gradient(ellipse at 30% 50%, rgba(212,175,55,0.15) 0%, transparent 60%)",
          }}
        />

        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />

        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          {/* Logo */}
          <div>
            <span className="text-2xl font-display font-bold text-gold-gradient tracking-wide">
              ART-CORE
            </span>
            <p className="text-white/40 text-xs mt-1 tracking-[0.2em] uppercase">
              Unveil the Unique
            </p>
          </div>

          {/* Central text */}
          <div className="max-w-md">
            <h1 className="text-4xl xl:text-5xl font-display font-light text-white leading-tight mb-6">
              L&apos;art d&apos;exception,{" "}
              <span className="text-gold-gradient font-normal">certifié.</span>
            </h1>
            <p className="text-white/50 text-base leading-relaxed">
              Achetez, vendez et louez des œuvres d&apos;art uniques avec
              certification blockchain via Pass-Core.
            </p>
          </div>

          {/* Stats */}
          <div className="flex gap-10">
            {[
              { value: "2 400+", label: "Œuvres certifiées" },
              { value: "340", label: "Artistes actifs" },
              { value: "€12M", label: "Volume échangé" },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="text-2xl font-bold text-gold tabular-nums">
                  {stat.value}
                </p>
                <p className="text-xs text-white/40 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-[420px]">
          {/* Mobile logo */}
          <div className="lg:hidden mb-10 text-center">
            <span className="text-2xl font-display font-bold text-gold-gradient tracking-wide">
              ART-CORE
            </span>
          </div>
          {children}
        </div>
      </div>

      <Toaster />
    </div>
  );
}
