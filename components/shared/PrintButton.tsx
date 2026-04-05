"use client";

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      type="button"
      className="inline-flex items-center gap-2 px-8 py-3 rounded-lg text-sm font-semibold transition-all duration-300 hover:scale-105"
      style={{
        background: "linear-gradient(135deg, #B8960C 0%, #D4AF37 50%, #B8960C 100%)",
        color: "#1B2B4B",
      }}
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
      Telecharger PDF
    </button>
  );
}
