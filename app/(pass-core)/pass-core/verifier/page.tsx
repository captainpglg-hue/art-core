"use client";

import { useState, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Search, ShieldCheck, ShieldX, Camera, ZoomIn, Hash, Fingerprint,
  ShoppingCart, ExternalLink, ArrowRight, Loader2, RotateCcw,
  FileText, Sparkles,
} from "lucide-react";

type Mode = "choice" | "hash" | "photo" | "result";

export default function VerifierPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="size-8 text-[#D4AF37] animate-spin" /></div>}>
      <VerifierContent />
    </Suspense>
  );
}

function VerifierContent() {
  const searchParams = useSearchParams();
  const initialHash = searchParams.get("hash") || "";

  const [mode, setMode] = useState<Mode>(initialHash ? "hash" : "choice");
  const [hash, setHash] = useState(initialHash);
  const [macroFile, setMacroFile] = useState<File | null>(null);
  const [macroPreview, setMacroPreview] = useState("");
  const [result, setResult] = useState<any>(null);
  const [artcoreArtwork, setArtcoreArtwork] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const macroRef = useRef<HTMLInputElement>(null);

  // Search artwork by blockchain hash (same app now)
  async function searchArtwork(blockchainHash: string) {
    try {
      const res = await fetch(`/api/search?hash=${encodeURIComponent(blockchainHash)}`);
      const data = await res.json();
      if (data.found && data.artwork) {
        setArtcoreArtwork(data.artwork);
      }
    } catch {}
  }

  async function verifyByHash() {
    if (!hash.trim()) return;
    setLoading(true);
    setArtcoreArtwork(null);
    try {
      const res = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hash: hash.trim() }),
      });
      const data = await res.json();
      setResult(data);
      setMode("result");

      const searchHash = data.artwork?.blockchain_hash || hash.trim();
      await searchArtwork(searchHash);
    } catch {
      setResult({ verified: false });
      setMode("result");
    } finally {
      setLoading(false);
    }
  }

  async function verifyByPhoto() {
    if (!macroFile) return;
    setLoading(true);
    setArtcoreArtwork(null);
    try {
      const formData = new FormData();
      formData.append("macro_photo", macroFile);
      const fpRes = await fetch("/api/fingerprint", { method: "POST", body: formData });
      const fpData = await fpRes.json();

      if (fpData.fingerprint?.blockchain_hash) {
        const res = await fetch("/api/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ hash: fpData.fingerprint.blockchain_hash }),
        });
        const verifyData = await res.json();
        setResult({ ...verifyData, photo_fingerprint: fpData.fingerprint });

        const searchHash = verifyData.artwork?.blockchain_hash || fpData.fingerprint.blockchain_hash;
        await searchArtwork(searchHash);
      } else {
        setResult({ verified: false, photo_fingerprint: fpData.fingerprint });
      }
      setMode("result");
    } catch {
      setResult({ verified: false });
      setMode("result");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setMode("choice");
    setHash("");
    setMacroFile(null);
    setMacroPreview("");
    setResult(null);
    setArtcoreArtwork(null);
  }

  const gold = "#D4AF37";

  return (
    <div className="max-w-lg mx-auto px-4 py-6 min-h-[calc(100vh-8rem)] pb-24">
      {/* ═══ Choice ═══ */}
      {mode === "choice" && (
        <div className="animate-fade-in">
          <div className="text-center mb-10">
            <div className="w-16 h-16 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center mx-auto mb-4">
              <ShieldCheck className="size-8 text-[#D4AF37]" />
            </div>
            <h1 className="font-playfair text-2xl font-semibold text-white mb-2">Identifier une oeuvre</h1>
            <p className="text-white/40 text-sm">Trouvez son certificat et achetez-la sur ART-CORE.</p>
          </div>

          <div className="space-y-4">
            <button onClick={() => setMode("photo")}
              className="w-full p-6 rounded-2xl border border-[#D4AF37]/20 bg-[#D4AF37]/5 active:bg-[#D4AF37]/10 transition-colors text-left">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-[#D4AF37]/10 flex items-center justify-center shrink-0">
                  <Camera className="size-7 text-[#D4AF37]" />
                </div>
                <div>
                  <p className="text-white font-semibold mb-0.5">Prendre en photo</p>
                  <p className="text-white/35 text-xs leading-relaxed">
                    Photographiez la zone macro de l&apos;oeuvre pour l&apos;identifier automatiquement.
                  </p>
                </div>
              </div>
            </button>

            <button onClick={() => setMode("hash")}
              className="w-full p-6 rounded-2xl border border-white/10 bg-white/[0.02] active:bg-white/5 transition-colors text-left">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center shrink-0">
                  <Hash className="size-7 text-white/40" />
                </div>
                <div>
                  <p className="text-white font-semibold mb-0.5">Entrer le hash blockchain</p>
                  <p className="text-white/35 text-xs leading-relaxed">
                    Collez le hash pour retrouver l&apos;oeuvre et son certificat.
                  </p>
                </div>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* ═══ Hash mode ═══ */}
      {mode === "hash" && (
        <div className="animate-fade-in">
          <h1 className="font-playfair text-2xl font-semibold text-white mb-6">Recherche par hash</h1>
          <div className="mb-6">
            <input value={hash} onChange={(e) => setHash(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && verifyByHash()}
              placeholder="0xABCDEF1234..."
              className="w-full h-14 rounded-xl bg-white/5 border border-white/10 text-sm text-white px-4 font-mono focus:outline-none focus:border-[#D4AF37]/40" />
          </div>
          <div className="flex gap-3">
            <button onClick={reset} className="flex-1 py-4 rounded-xl border border-white/10 text-white/50 font-medium">Retour</button>
            <button onClick={verifyByHash} disabled={!hash.trim() || loading}
              className="flex-1 py-4 rounded-xl bg-[#D4AF37] text-[#121212] font-semibold disabled:opacity-30 flex items-center justify-center gap-2">
              {loading ? <Loader2 className="size-5 animate-spin" /> : <Search className="size-5" />}
              Rechercher
            </button>
          </div>
        </div>
      )}

      {/* ═══ Photo mode ═══ */}
      {mode === "photo" && (
        <div className="animate-fade-in">
          <h1 className="font-playfair text-2xl font-semibold text-white mb-1">Identification par photo</h1>
          <p className="text-white/40 text-sm mb-6">Prenez la photo macro de l&apos;oeuvre pour l&apos;identifier.</p>

          <input ref={macroRef} type="file" accept="image/*" capture="environment" className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) {
                setMacroFile(e.target.files[0]);
                setMacroPreview(URL.createObjectURL(e.target.files[0]));
              }
            }} />

          {macroPreview ? (
            <div className="relative rounded-2xl overflow-hidden border-2 border-[#D4AF37]/30 mb-6">
              <img src={macroPreview} alt="Macro" className="w-full" />
              <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#D4AF37]/20 text-[#D4AF37] text-xs font-medium">
                <Fingerprint className="size-3" /> Photo macro
              </div>
              <button onClick={() => { setMacroFile(null); setMacroPreview(""); }}
                className="absolute top-3 right-3 p-1.5 rounded-full bg-black/50 text-white/70">
                <RotateCcw className="size-4" />
              </button>
            </div>
          ) : (
            <button onClick={() => macroRef.current?.click()}
              className="w-full aspect-square rounded-2xl border-2 border-dashed border-[#D4AF37]/30 flex flex-col items-center justify-center gap-3 bg-[#D4AF37]/5 active:bg-[#D4AF37]/10 mb-6">
              <div className="w-20 h-20 rounded-full bg-[#D4AF37]/10 flex items-center justify-center">
                <ZoomIn className="size-10 text-[#D4AF37]" />
              </div>
              <p className="text-[#D4AF37] font-medium">Photographier l&apos;oeuvre</p>
              <p className="text-white/25 text-xs">Zone macro pour identification</p>
            </button>
          )}

          <div className="flex gap-3">
            <button onClick={reset} className="flex-1 py-4 rounded-xl border border-white/10 text-white/50 font-medium">Retour</button>
            <button onClick={verifyByPhoto} disabled={!macroFile || loading}
              className="flex-1 py-4 rounded-xl bg-[#D4AF37] text-[#121212] font-semibold disabled:opacity-30 flex items-center justify-center gap-2">
              {loading ? <Loader2 className="size-5 animate-spin" /> : <Sparkles className="size-5" />}
              Identifier
            </button>
          </div>
        </div>
      )}

      {/* ═══ Result ═══ */}
      {mode === "result" && result && (
        <div className="animate-fade-in">
          {result.verified ? (
            <div className="text-center mb-6">
              <div className="w-20 h-20 rounded-full bg-green-500/10 border-2 border-green-500/30 flex items-center justify-center mx-auto mb-4">
                <ShieldCheck className="size-10 text-green-400" />
              </div>
              <h2 className="text-2xl font-playfair font-semibold text-white mb-1">Oeuvre identifiee !</h2>
              <p className="text-green-400/70 text-sm">Certifiee et authentifiee sur la blockchain.</p>
            </div>
          ) : (
            <div className="text-center mb-6">
              <div className="w-20 h-20 rounded-full bg-red-500/10 border-2 border-red-500/30 flex items-center justify-center mx-auto mb-4">
                <ShieldX className="size-10 text-red-400" />
              </div>
              <h2 className="text-2xl font-playfair font-semibold text-white mb-1">Non identifiee</h2>
              <p className="text-red-400/70 text-sm">Aucune correspondance trouvee.</p>
            </div>
          )}

          {result.artwork && (
            <div className="rounded-2xl border border-[#D4AF37]/20 bg-[#D4AF37]/5 p-5 space-y-3 mb-4">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-white/25">Titre</p>
                <p className="text-white font-medium text-lg">{result.artwork.title}</p>
              </div>
              {result.artwork.artist_name && (
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-white/25">Artiste</p>
                  <p className="text-white/70">{result.artwork.artist_name}</p>
                </div>
              )}
              <div>
                <p className="text-[10px] uppercase tracking-widest text-white/25">Hash blockchain</p>
                <p className="font-mono text-[11px] text-[#D4AF37] break-all">{result.artwork.blockchain_hash}</p>
              </div>
            </div>
          )}

          {/* Marketplace card */}
          {artcoreArtwork && (
            <div className="rounded-2xl border border-[#D4AF37]/30 bg-gradient-to-b from-[#D4AF37]/10 to-transparent p-5 mb-4">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="size-4 text-[#D4AF37]" />
                <p className="text-sm font-semibold text-[#D4AF37]">Disponible sur ART-CORE</p>
              </div>

              <div className="flex gap-4 mb-4">
                {artcoreArtwork.photos?.[0] && (
                  <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0 border border-white/10">
                    <img src={artcoreArtwork.photos[0]} alt="" className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-base font-semibold text-white">{artcoreArtwork.title}</p>
                  <p className="text-xs text-white/40">{artcoreArtwork.artist_name}</p>
                  {artcoreArtwork.technique && <p className="text-xs text-white/25 mt-0.5">{artcoreArtwork.technique}</p>}
                </div>
              </div>

              <div className="flex items-center justify-between mb-4 px-1">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-white/25">Prix</p>
                  <p className="text-xl font-bold text-[#D4AF37]">
                    {artcoreArtwork.price > 0 ? `${artcoreArtwork.price.toLocaleString()} EUR` : "Sur demande"}
                  </p>
                </div>
                <span className={`text-[11px] px-3 py-1 rounded-full font-medium ${
                  artcoreArtwork.status === "sold" ? "bg-red-500/10 text-red-400" : "bg-green-500/10 text-green-400"
                }`}>
                  {artcoreArtwork.status === "sold" ? "Vendue" : "En vente"}
                </span>
              </div>

              <div className="space-y-2">
                {artcoreArtwork.status !== "sold" && artcoreArtwork.price > 0 && (
                  <a href={`/art-core/checkout?artwork=${artcoreArtwork.id}`}
                    className="flex items-center justify-center gap-2 w-full py-4 rounded-xl bg-[#D4AF37] text-[#121212] font-bold text-base active:brightness-90 transition-all shadow-[0_0_30px_rgba(212,175,55,0.25)]">
                    <ShoppingCart className="size-5" />
                    Acheter maintenant
                  </a>
                )}
                <a href={`/art-core/oeuvre/${artcoreArtwork.id}`}
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border border-white/10 text-white/60 font-medium text-sm active:bg-white/5 transition-colors">
                  <ExternalLink className="size-4" />
                  Voir sur ART-CORE
                </a>
              </div>
            </div>
          )}

          {result.photo_fingerprint && (
            <div className="rounded-xl bg-white/[0.03] border border-white/5 p-4 mb-4">
              <p className="text-xs text-white/30 mb-2 flex items-center gap-1.5"><Fingerprint className="size-3" />Empreinte de votre photo</p>
              <p className="font-mono text-[10px] text-white/40 break-all">{result.photo_fingerprint.blockchain_hash}</p>
            </div>
          )}

          <button onClick={reset}
            className="w-full py-4 rounded-xl border border-white/10 text-white/50 font-medium active:bg-white/5 flex items-center justify-center gap-2">
            <RotateCcw className="size-4" />
            Nouvelle identification
          </button>
        </div>
      )}
    </div>
  );
}
