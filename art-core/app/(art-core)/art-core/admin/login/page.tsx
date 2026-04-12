"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Shield, AlertCircle, CheckCircle, Loader } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "code">("email");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [timeLeft, setTimeLeft] = useState(0);
  const codeInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [timeLeft]);

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin/auth/request-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), name: name.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Erreur lors de l'envoi du code");
        setLoading(false);
        return;
      }

      // In dev mode, auto-fill the code from the API response
      if (data.dev_code) {
        const digits = data.dev_code.split("");
        setCode(digits);
        setSuccess(`Code dev : ${data.dev_code}`);
      } else {
        setCode(["", "", "", "", "", ""]);
        setSuccess("Code envoyé ! Vérifiez votre email.");
      }
      setStep("code");
      setTimeLeft(600); // 10 minutes
      if (!data.dev_code) {
        codeInputRefs.current[0]?.focus();
      }
      setLoading(false);
    } catch (err: any) {
      setError(err.message || "Erreur serveur");
      setLoading(false);
    }
  };

  const handleCodeChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    if (value.length > 1) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Auto-advance to next input
    if (value && index < 5) {
      codeInputRefs.current[index + 1]?.focus();
    }
  };

  const handleCodeKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      codeInputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    const codeString = code.join("");
    if (codeString.length !== 6) {
      setError("Veuillez entrer les 6 chiffres");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/admin/auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), code: codeString }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Code invalide ou expiré");
        setLoading(false);
        return;
      }

      setSuccess("Authentification réussie ! Redirection...");
      setTimeout(() => {
        router.push("/art-core/admin");
      }, 1000);
    } catch (err: any) {
      setError(err.message || "Erreur serveur");
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin/auth/request-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), name: name.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Erreur lors du renvoi du code");
        setLoading(false);
        return;
      }

      if (data.dev_code) {
        const digits = data.dev_code.split("");
        setCode(digits);
        setSuccess(`Nouveau code dev : ${data.dev_code}`);
      } else {
        setSuccess("Nouveau code envoyé !");
        setCode(["", "", "", "", "", ""]);
        codeInputRefs.current[0]?.focus();
      }
      setTimeLeft(600);
      setLoading(false);
    } catch (err: any) {
      setError(err.message || "Erreur serveur");
      setLoading(false);
    }
  };

  const formatTimeLeft = () => {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12" style={{ backgroundColor: "#0a0a0a" }}>
      <div className="w-full max-w-md">
        {/* Card */}
        <div
          className="rounded-2xl border-2 p-8 shadow-2xl"
          style={{
            backgroundColor: "#1a1a1a",
            borderColor: "#D4AF37",
          }}
        >
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div
                className="p-3 rounded-full"
                style={{ backgroundColor: "rgba(212, 175, 55, 0.1)" }}
              >
                <Shield size={36} style={{ color: "#D4AF37" }} />
              </div>
            </div>
            <h1
              className="text-3xl font-bold mb-2"
              style={{ color: "#D4AF37" }}
            >
              ADMINISTRATION
            </h1>
            <p className="text-sm" style={{ color: "#999999" }}>
              Authentification sécurisée
            </p>
          </div>

          {/* Content */}
          {step === "email" ? (
            <form onSubmit={handleRequestCode} className="space-y-4">
              <div>
                <label
                  className="block text-sm font-medium mb-2"
                  style={{ color: "#D4AF37" }}
                >
                  Nom
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Votre nom"
                  className="w-full px-4 py-2 rounded-lg border-2 bg-black text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500 transition"
                  style={{
                    borderColor: "#D4AF37",
                    backgroundColor: "#0a0a0a",
                  }}
                  required
                />
              </div>

              <div>
                <label
                  className="block text-sm font-medium mb-2"
                  style={{ color: "#D4AF37" }}
                >
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  className="w-full px-4 py-2 rounded-lg border-2 bg-black text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500 transition"
                  style={{
                    borderColor: "#D4AF37",
                    backgroundColor: "#0a0a0a",
                  }}
                  required
                />
              </div>

              {error && (
                <div
                  className="flex items-center gap-2 p-3 rounded-lg"
                  style={{ backgroundColor: "rgba(220, 38, 38, 0.1)" }}
                >
                  <AlertCircle size={18} style={{ color: "#dc2626" }} />
                  <p style={{ color: "#fca5a5", fontSize: "14px" }}>
                    {error}
                  </p>
                </div>
              )}

              {success && (
                <div
                  className="flex items-center gap-2 p-3 rounded-lg"
                  style={{ backgroundColor: "rgba(34, 197, 94, 0.1)" }}
                >
                  <CheckCircle size={18} style={{ color: "#22c55e" }} />
                  <p style={{ color: "#86efac", fontSize: "14px" }}>
                    {success}
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !name || !email}
                className="w-full py-2 rounded-lg font-semibold transition disabled:opacity-50"
                style={{
                  backgroundColor: "#D4AF37",
                  color: "#0a0a0a",
                }}
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <Loader size={18} className="animate-spin" />
                    Envoi en cours...
                  </div>
                ) : (
                  "Envoyer le code"
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyCode} className="space-y-4">
              <p className="text-center text-sm mb-6" style={{ color: "#cccccc" }}>
                Entrez le code à 6 chiffres envoyé à:
              </p>
              <p
                className="text-center font-semibold mb-4"
                style={{ color: "#D4AF37" }}
              >
                {email}
              </p>

              {/* Code Input Boxes */}
              <div className="flex justify-center gap-2 mb-6">
                {code.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => (codeInputRefs.current[index] = el)}
                    type="text"
                    value={digit}
                    onChange={(e) => handleCodeChange(index, e.target.value)}
                    onKeyDown={(e) => handleCodeKeyDown(index, e)}
                    maxLength={1}
                    inputMode="numeric"
                    className="w-12 h-12 text-center text-2xl font-bold rounded-lg border-2 transition focus:outline-none"
                    style={{
                      borderColor: digit ? "#D4AF37" : "#333333",
                      backgroundColor: "#0a0a0a",
                      color: "#D4AF37",
                    }}
                  />
                ))}
              </div>

              {/* Timer */}
              <div className="text-center mb-4">
                {timeLeft > 0 ? (
                  <p
                    className="text-sm font-semibold"
                    style={{ color: "#D4AF37" }}
                  >
                    ⏱️ Code expire dans: {formatTimeLeft()}
                  </p>
                ) : (
                  <p className="text-sm" style={{ color: "#999999" }}>
                    Code expiré
                  </p>
                )}
              </div>

              {error && (
                <div
                  className="flex items-center gap-2 p-3 rounded-lg"
                  style={{ backgroundColor: "rgba(220, 38, 38, 0.1)" }}
                >
                  <AlertCircle size={18} style={{ color: "#dc2626" }} />
                  <p style={{ color: "#fca5a5", fontSize: "14px" }}>
                    {error}
                  </p>
                </div>
              )}

              {success && (
                <div
                  className="flex items-center gap-2 p-3 rounded-lg"
                  style={{ backgroundColor: "rgba(34, 197, 94, 0.1)" }}
                >
                  <CheckCircle size={18} style={{ color: "#22c55e" }} />
                  <p style={{ color: "#86efac", fontSize: "14px" }}>
                    {success}
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || code.join("").length !== 6}
                className="w-full py-2 rounded-lg font-semibold transition disabled:opacity-50"
                style={{
                  backgroundColor: "#D4AF37",
                  color: "#0a0a0a",
                }}
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <Loader size={18} className="animate-spin" />
                    Vérification...
                  </div>
                ) : (
                  "Vérifier"
                )}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={loading}
                  className="text-sm transition hover:underline disabled:opacity-50"
                  style={{ color: "#D4AF37" }}
                >
                  Renvoyer le code
                </button>
              </div>

              <div className="text-center pt-4 border-t" style={{ borderColor: "#333333" }}>
                <button
                  type="button"
                  onClick={() => {
                    setStep("email");
                    setError("");
                    setSuccess("");
                    setCode(["", "", "", "", "", ""]);
                  }}
                  className="text-sm transition hover:underline"
                  style={{ color: "#999999" }}
                >
                  Changer d'email
                </button>
              </div>
            </form>
          )}

          {/* Footer */}
          <div className="mt-8 pt-6 border-t text-center text-xs" style={{ borderColor: "#333333", color: "#666666" }}>
            <p>Panneau d'administration CORE Ecosystem</p>
            <p className="mt-1">Authentification par code de sécurité</p>
          </div>
        </div>
      </div>
    </div>
  );
}
