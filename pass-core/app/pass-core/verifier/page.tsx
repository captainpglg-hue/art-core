"use client";

import { useState, useRef } from "react";
import { Search, ShieldCheck, ShieldX, Camera, ZoomIn, Hash, Fingerprint } from "lucide-react";

type Mode = "choice" | "hash" | "photo" | "result";

export default function VerifierPage() {
  const [mode, setMode] = useState<Mode>("choice");
  const [hash, setHash] = useState("");
  const [macroFile, setMacroFile] = useState<File | null>(null);
  const [macroPreview, setMacroPreview] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const macroRef = useRef<HTMLInputElement>(null);

  async function verifyByHash() {
    if (!hash.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hash: hash.trim() }),
      });
      setResult(await res.json());
      setMode("result");
    } catch { setResult({ verified: false }); setMode("result"); }
    finally { setLoading(false); }
  }

  async function verifyByPhoto() {
    if (!macroFile) return;
    setLoading(true);
    try {
      // Generate fingerprint from the photo
      const formData = new FormData();
      formData.append("macro_photo", macroFile);
      const fpRes = await fetch("/api/fingerprint", { method: "POST", body: formData });
      const fpData = await fpRes.json();

      if (fpData.fingerprint?.blockchain_hash) {
        // Try to verify this hash
        const res = await fetch("/api/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ hash: fpData.fingerprint.blockchain_hash }),
        });
        const verifyData = await res.json();
        setResult({ ...verifyData, photo_fingerprint: fpData.fingerprint });
      } else {
        setResult({ verified: false, photo_fingerprint: fpData.fingerprint });
      }
      setMode("result");
    } catch { setResult({ verified: false }); setMode("result"); }
    finally { setLoading(false); }
  }

  function reset() {
    setMode("choice"); setHash(""); setMacroFile(null);
    setMacroPreview(""); setResult(null);
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      {/* ═══ Choice ═══ */}
      {mode === "choice" && (
        <div className="animate-fade-in">
          <div className="text-center mb-10">
            <div className="w-16 h-16 rounded-full bg-[#C9A84C]/10 border border-[#C9A84C]/30 flex items-center justify-center mx-auto mb-4">
              <ShieldCheck className="size-8 text-[#C9A84C]" />
            </div>
            <h1 className="font-display text-2xl font-semibold text-white mb-2">Vérifier une oeuvre</h1>
            <p className="text-white/40 text-sm">Deux méthodes pour authentifier.</p>
          </div>

          <div className="space-y-4">
            <button onClick={() => setMode("photo")}
              className="w-full p-6 rounded-2xl border border-[#C9A84C]/20 bg-[#C9A84C]/5 active:bg-[#C9A84C]/10 transition-colors text-left">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-[#C9A84C]/10 flex items-center justify-center shrink-0">
                  <Camera className="size-7 text-[#C9A84C]" />
                </div>
                <div>
                  <p className="text-white font-semibold mb-0.5">Photo macro</p>
                  <p className="text-white/35 text-xs leading-relaxed">
                    Reprenez la photo macro de l&apos;oeuvre. Le système compare l&apos;empreinte visuelle avec celle enregistrée.
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
                  <p className="text-white font-semibold mb-0.5">Hash blockchain</p>
                  <p className="text-white/35 text-xs leading-relaxed">
                    Entrez le hash blockchain pour vérifier l&apos;authenticité dans la base de données.
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
          <h1 className="font-display text-2xl font-semibold text-white mb-6">Vérification par hash</h1>

          <div className="mb-6">
            <input value={hash} onChange={(e) => setHash(e.target.value)}
              placeholder="0xABCDEF1234..."
              className="w-full h-14 rounded-xl bg-white/5 border border-white/10 text-sm text-white px-4 font-mono focus:outline-none focus:border-[#C9A84C]/40" />
          </div>

          {/* Demo hash */}
          <button onClick={() => setHash("0xABCDEF1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890")}
            className="w-full p-3 rounded-xl bg-white/3 border border-white/5 text-xs font-mono text-[#C9A84C]/50 break-all text-left mb-6 active:bg-white/5">
            Hash démo: 0xABCDEF1234...
          </button>

          <div className="flex gap-3">
            <button onClick={reset} className="flex-1 py-4 rounded-xl border border-white/10 text-white/50 font-medium">Retour</button>
            <button onClick={verifyByHash} disabled={!hash.trim() || loading}
              className="flex-1 py-4 rounded-xl bg-[#C9A84C] text-[#0A1128] font-semibold disabled:opacity-30 flex items-center justify-center gap-2">
              {loading ? <div className="w-5 h-5 border-2 border-[#0A1128]/30 border-t-[#0A1128] rounded-full animate-spin" /> : <Search className="size-5" />}
              Vérifier
            </button>
          </div>
        </div>
      )}

      {/* ═══ Photo mode ═══ */}
      {mode === "photo" && (
        <div className="animate-fade-in">
          <h1 className="font-display text-2xl font-semibold text-white mb-1">Vérification par photo</h1>
          <p className="text-white/40 text-sm mb-6">Reprenez la photo macro au même endroit que la certification.</p>

          <input ref={macroRef} type="file" accept="image/*" capture="environment" className="hidden"
            onChange={(e) => {
              if (e.target.files?.[0]) {
                setMacroFile(e.target.files[0]);
                setMacroPreview(URL.createObjectURL(e.target.files[0]));
              }
            }} />

          {macroPreview ? (
            <div className="relative rounded-2xl overflow-hidden border-2 border-[#C9A84C]/30 mb-6">
              <img src={macroPreview} alt="Macro" className="w-full" />
              <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#C9A84C]/20 text-[#C9A84C] text-xs font-medium">
                <Fingerprint className="size-3" /> Photo macro
              </div>
            </div>
          ) : (
            <button onClick={() => macroRef.current?.click()}
              className="w-full aspect-square rounded-2xl border-2 border-dashed border-[#C9A84C]/30 flex flex-col items-center justify-center gap-3 bg-[#C9A84C]/5 active:bg-[#C9A84C]/10 mb-6">
              <div className="w-20 h-20 rounded-full bg-[#C9A84C]/10 flex items-center justify-center">
                <ZoomIn className="size-10 text-[#C9A84C]" />
              </div>
              <p className="text-[#C9A84C] font-medium">Photo macro</p>
              <p className="text-white/25 text-xs">Même zone que lors de la certification</p>
            </button>
          )}

          <div className="flex gap-3">
            <button onClick={reset} className="flex-1 py-4 rounded-xl border border-white/10 text-white/50 font-medium">Retour</button>
            <button onClick={verifyByPhoto} disabled={!macroFile || loading}
              className="flex-1 py-4 rounded-xl bg-[#C9A84C] text-[#0A1128] font-semibold disabled:opacity-30 flex items-center justify-center gap-2">
              {loading ? <div className="w-5 h-5 border-2 border-[#0A1128]/30 border-t-[#0A1128] rounded-full animate-spin" /> : <ShieldCheck className="size-5" />}
              Analyser
            </button>
          </div>
        </div>
      )}

      {/* ═══ Result ═══ */}
      {mode === "result" && result && (
        <div className="animate-fade-in">
          {result.verified ? (
            <div className="text-center mb-8">
              <div className="w-20 h-20 rounded-full bg-green-500/10 border-2 border-green-500/30 flex items-center justify-center mx-auto mb-4">
                <ShieldCheck className="size-10 text-green-400" />
              </div>
              <h2 className="text-2xl font-display font-semibold text-white mb-1">Oeuvre authentifiée</h2>
              <p className="text-green-400/70 text-sm">Cette oeuvre est certifiée dans notre système.</p>
            </div>
          ) : (
            <div className="text-center mb-8">
              <div className="w-20 h-20 rounded-full bg-red-500/10 border-2 border-red-500/30 flex items-center justify-center mx-auto mb-4">
                <ShieldX className="size-10 text-red-400" />
              </div>
              <h2 className="text-2xl font-display font-semibold text-white mb-1">Non vérifiée</h2>
              <p className="text-red-400/70 text-sm">Aucune correspondance trouvée.</p>
            </div>
          )}

          {result.artwork && (
            <div className="rounded-2xl border border-[#C9A84C]/20 bg-[#C9A84C]/5 p-5 space-y-3 mb-6">
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
                <p className="font-mono text-[11px] text-[#C9A84C] break-all">{result.artwork.blockchain_hash}</p>
              </div>
              {result.artwork.tx_hash && (
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-white/25">Transaction</p>
                  <p className="font-mono text-[11px] text-white/40 break-all">{result.artwork.tx_hash}</p>
                </div>
              )}
              <a href={`${process.env.NEXT_PUBLIC_ART_CORE_URL || "https://art-core.app"}/art-core/oeuvre/${result.artwork.id}`}
                className="block w-full py-3 rounded-xl bg-[#C9A84C] text-[#0A1128] font-semibold text-center active:brightness-90 mt-4">
                Voir sur ART-CORE
              </a>
            </div>
          )}

          {result.photo_fingerprint && (
            <div className="rounded-xl bg-white/3 border border-white/5 p-4 mb-6">
              <p className="text-xs text-white/30 mb-2 flex items-center gap-1.5"><Fingerprint className="size-3" />Empreinte de votre photo</p>
              <p className="font-mono text-[10px] text-white/40 break-all">{result.photo_fingerprint.blockchain_hash}</p>
            </div>
          )}

          <button onClick={reset}
            className="w-full py-4 rounded-xl border border-white/10 text-white/50 font-medium active:bg-white/5">
            Nouvelle vérification
          </button>
        </div>
      )}
    </div>
  );
}
