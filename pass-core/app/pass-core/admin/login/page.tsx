"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Shield, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

type Step = "identify" | "verify";

export default function AdminLoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("identify");

  // Identify step
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Verify step
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutes
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState("");
  const [success, setSuccess] = useState(false);
  const codeInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Timer
  useEffect(() => {
    if (step !== "verify" || timeLeft <= 0) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [step, timeLeft]);

  // Handle request code
  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin/auth/request-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erreur lors de l'envoi du code");
      }

      // In dev mode, auto-fill the code from the API response
      if (data.dev_code) {
        const digits = data.dev_code.split("");
        setCode(digits);
      } else {
        setCode(["", "", "", "", "", ""]);
      }
      setTimeLeft(600);
      setStep("verify");
      setVerifyError("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle code digit input
  const handleCodeChange = (index: number, value: string) => {
    // Only allow digits
    const digit = value.replace(/\D/g, "").slice(-1);

    const newCode = [...code];
    newCode[index] = digit;
    setCode(newCode);

    // Auto-advance to next input
    if (digit && index < 5) {
      codeInputRefs.current[index + 1]?.focus();
    }
  };

  // Handle code digit backspace
  const handleCodeKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Backspace") {
      if (!code[index] && index > 0) {
        // Move to previous if current is empty
        codeInputRefs.current[index - 1]?.focus();
      } else {
        // Clear current
        const newCode = [...code];
        newCode[index] = "";
        setCode(newCode);
      }
    }
  };

  // Handle verify code
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifyError("");
    setVerifyLoading(true);

    const fullCode = code.join("");
    if (fullCode.length !== 6) {
      setVerifyError("Code incomplet");
      setVerifyLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/admin/auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: fullCode }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erreur de vérification");
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/pass-core/admin");
      }, 1500);
    } catch (err: any) {
      setVerifyError(err.message);
    } finally {
      setVerifyLoading(false);
    }
  };

  // Handle resend code
  const handleResendCode = async () => {
    setVerifyError("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin/auth/request-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erreur lors du renvoi du code");
      }

      if (data.dev_code) {
        const digits = data.dev_code.split("");
        setCode(digits);
      } else {
        setCode(["", "", "", "", "", ""]);
        codeInputRefs.current[0]?.focus();
      }
      setTimeLeft(600);
      setVerifyError("");
    } catch (err: any) {
      setVerifyError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div style={{ backgroundColor: "#0A1128", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <div style={{ width: "100%", maxWidth: "420px" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "60px",
              height: "60px",
              backgroundColor: "rgba(212, 175, 55, 0.15)",
              borderRadius: "12px",
              marginBottom: "20px",
              border: "1px solid rgba(212, 175, 55, 0.3)",
            }}
          >
            <Shield style={{ color: "#D4AF37", width: 32, height: 32 }} />
          </div>
          <h1 style={{ color: "#ffffff", fontSize: "28px", margin: "0 0 8px", fontWeight: "700" }}>
            ADMINISTRATION
          </h1>
          <p style={{ color: "rgba(212, 175, 55, 0.8)", fontSize: "12px", margin: 0, textTransform: "uppercase", letterSpacing: "2px", fontWeight: 600 }}>
            CORE ECOSYSTEM
          </p>
        </div>

        {/* Card */}
        <div
          style={{
            backgroundColor: "rgba(20, 25, 45, 0.8)",
            border: "1px solid rgba(212, 175, 55, 0.2)",
            borderRadius: "16px",
            padding: "32px 28px",
            backdropFilter: "blur(10px)",
          }}
        >
          {step === "identify" ? (
            // Step 1: Identification
            <form onSubmit={handleRequestCode}>
              <div style={{ marginBottom: "20px" }}>
                <label
                  htmlFor="name"
                  style={{
                    display: "block",
                    color: "rgba(255, 255, 255, 0.7)",
                    fontSize: "13px",
                    marginBottom: "8px",
                    fontWeight: "500",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  Nom complet
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Votre nom"
                  disabled={loading}
                  required
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    backgroundColor: "rgba(255, 255, 255, 0.05)",
                    border: "1px solid rgba(212, 175, 55, 0.2)",
                    borderRadius: "8px",
                    color: "#ffffff",
                    fontSize: "14px",
                    transition: "all 0.2s",
                    boxSizing: "border-box",
                    outline: "none",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "rgba(212, 175, 55, 0.5)";
                    e.target.style.backgroundColor = "rgba(255, 255, 255, 0.08)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "rgba(212, 175, 55, 0.2)";
                    e.target.style.backgroundColor = "rgba(255, 255, 255, 0.05)";
                  }}
                />
              </div>

              <div style={{ marginBottom: "24px" }}>
                <label
                  htmlFor="email"
                  style={{
                    display: "block",
                    color: "rgba(255, 255, 255, 0.7)",
                    fontSize: "13px",
                    marginBottom: "8px",
                    fontWeight: "500",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre@email.com"
                  disabled={loading}
                  required
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    backgroundColor: "rgba(255, 255, 255, 0.05)",
                    border: "1px solid rgba(212, 175, 55, 0.2)",
                    borderRadius: "8px",
                    color: "#ffffff",
                    fontSize: "14px",
                    transition: "all 0.2s",
                    boxSizing: "border-box",
                    outline: "none",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "rgba(212, 175, 55, 0.5)";
                    e.target.style.backgroundColor = "rgba(255, 255, 255, 0.08)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "rgba(212, 175, 55, 0.2)";
                    e.target.style.backgroundColor = "rgba(255, 255, 255, 0.05)";
                  }}
                />
              </div>

              {error && (
                <div
                  style={{
                    backgroundColor: "rgba(239, 68, 68, 0.15)",
                    border: "1px solid rgba(239, 68, 68, 0.3)",
                    borderRadius: "8px",
                    padding: "12px 14px",
                    marginBottom: "20px",
                    display: "flex",
                    gap: "10px",
                    alignItems: "flex-start",
                  }}
                >
                  <AlertCircle style={{ color: "#ef4444", width: 18, height: 18, flexShrink: 0, marginTop: "1px" }} />
                  <p style={{ color: "#ef4444", fontSize: "13px", margin: 0 }}>{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !name || !email}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  backgroundColor: loading ? "rgba(212, 175, 55, 0.6)" : "#D4AF37",
                  color: "#0A1128",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: loading || !name || !email ? "not-allowed" : "pointer",
                  transition: "all 0.2s",
                  opacity: loading || !name || !email ? 0.7 : 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                }}
                onHover={(e: any) => {
                  if (!loading && name && email) {
                    e.target.style.backgroundColor = "#e6c200";
                  }
                }}
                onMouseEnter={(e: any) => {
                  if (!loading && name && email) {
                    e.target.style.backgroundColor = "#e6c200";
                  }
                }}
                onMouseLeave={(e: any) => {
                  if (!loading && name && email) {
                    e.target.style.backgroundColor = "#D4AF37";
                  }
                }}
              >
                {loading ? (
                  <>
                    <Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} />
                    Envoi en cours...
                  </>
                ) : (
                  "Envoyer le code"
                )}
              </button>

              <style>{`
                @keyframes spin {
                  from { transform: rotate(0deg); }
                  to { transform: rotate(360deg); }
                }
              `}</style>
            </form>
          ) : (
            // Step 2: Verification
            <form onSubmit={handleVerifyCode}>
              <div style={{ marginBottom: "24px", textAlign: "center" }}>
                <p style={{ color: "rgba(255, 255, 255, 0.7)", fontSize: "14px", margin: "0 0 8px" }}>
                  Nous avons envoyé un code à
                </p>
                <p style={{ color: "#D4AF37", fontSize: "14px", margin: 0, fontWeight: "600" }}>
                  {email}
                </p>
              </div>

              <div style={{ marginBottom: "28px" }}>
                <p
                  style={{
                    color: "rgba(255, 255, 255, 0.6)",
                    fontSize: "12px",
                    marginBottom: "12px",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    fontWeight: "500",
                  }}
                >
                  Entrez le code
                </p>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(6, 1fr)",
                    gap: "8px",
                    marginBottom: "16px",
                  }}
                >
                  {code.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => {
                        codeInputRefs.current[index] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleCodeChange(index, e.target.value)}
                      onKeyDown={(e) => handleCodeKeyDown(index, e)}
                      disabled={verifyLoading || timeLeft === 0}
                      style={{
                        width: "100%",
                        aspectRatio: "1",
                        padding: 0,
                        fontSize: "24px",
                        fontWeight: "700",
                        textAlign: "center",
                        backgroundColor: "rgba(255, 255, 255, 0.03)",
                        border: `2px solid ${digit ? "rgba(212, 175, 55, 0.4)" : "rgba(212, 175, 55, 0.2)"}`,
                        borderRadius: "8px",
                        color: "#D4AF37",
                        transition: "all 0.2s",
                        boxSizing: "border-box",
                        outline: "none",
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = "rgba(212, 175, 55, 0.7)";
                        e.target.style.backgroundColor = "rgba(212, 175, 55, 0.08)";
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = e.target.value ? "rgba(212, 175, 55, 0.4)" : "rgba(212, 175, 55, 0.2)";
                        e.target.style.backgroundColor = "rgba(255, 255, 255, 0.03)";
                      }}
                    />
                  ))}
                </div>

                <div
                  style={{
                    textAlign: "center",
                    color: timeLeft < 60 ? "#ef4444" : "rgba(212, 175, 55, 0.8)",
                    fontSize: "13px",
                    fontWeight: "600",
                    fontFamily: "monospace",
                  }}
                >
                  {formatTime(timeLeft)}
                </div>
              </div>

              {verifyError && (
                <div
                  style={{
                    backgroundColor: "rgba(239, 68, 68, 0.15)",
                    border: "1px solid rgba(239, 68, 68, 0.3)",
                    borderRadius: "8px",
                    padding: "12px 14px",
                    marginBottom: "20px",
                    display: "flex",
                    gap: "10px",
                    alignItems: "flex-start",
                  }}
                >
                  <AlertCircle style={{ color: "#ef4444", width: 18, height: 18, flexShrink: 0, marginTop: "1px" }} />
                  <p style={{ color: "#ef4444", fontSize: "13px", margin: 0 }}>{verifyError}</p>
                </div>
              )}

              {success && (
                <div
                  style={{
                    backgroundColor: "rgba(34, 197, 94, 0.15)",
                    border: "1px solid rgba(34, 197, 94, 0.3)",
                    borderRadius: "8px",
                    padding: "12px 14px",
                    marginBottom: "20px",
                    display: "flex",
                    gap: "10px",
                    alignItems: "flex-start",
                  }}
                >
                  <CheckCircle2 style={{ color: "#22c55e", width: 18, height: 18, flexShrink: 0, marginTop: "1px" }} />
                  <p style={{ color: "#22c55e", fontSize: "13px", margin: 0 }}>Authentification réussie...</p>
                </div>
              )}

              <button
                type="submit"
                disabled={verifyLoading || code.join("").length !== 6 || success}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  backgroundColor:
                    verifyLoading || code.join("").length !== 6 || success
                      ? "rgba(212, 175, 55, 0.6)"
                      : "#D4AF37",
                  color: "#0A1128",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor:
                    verifyLoading || code.join("").length !== 6 || success
                      ? "not-allowed"
                      : "pointer",
                  transition: "all 0.2s",
                  opacity:
                    verifyLoading || code.join("").length !== 6 || success
                      ? 0.7
                      : 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  marginBottom: "12px",
                }}
                onMouseEnter={(e: any) => {
                  if (
                    !verifyLoading &&
                    code.join("").length === 6 &&
                    !success
                  ) {
                    e.target.style.backgroundColor = "#e6c200";
                  }
                }}
                onMouseLeave={(e: any) => {
                  if (
                    !verifyLoading &&
                    code.join("").length === 6 &&
                    !success
                  ) {
                    e.target.style.backgroundColor = "#D4AF37";
                  }
                }}
              >
                {verifyLoading ? (
                  <>
                    <Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} />
                    Vérification...
                  </>
                ) : success ? (
                  <>
                    <CheckCircle2 style={{ width: 16, height: 16 }} />
                    Succès!
                  </>
                ) : (
                  "Vérifier le code"
                )}
              </button>

              {!success && (
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={loading}
                  style={{
                    width: "100%",
                    padding: "10px 16px",
                    backgroundColor: "transparent",
                    color: "#D4AF37",
                    border: "1px solid rgba(212, 175, 55, 0.3)",
                    borderRadius: "8px",
                    fontSize: "13px",
                    fontWeight: "500",
                    cursor: loading ? "not-allowed" : "pointer",
                    transition: "all 0.2s",
                    opacity: loading ? 0.6 : 1,
                  }}
                  onMouseEnter={(e: any) => {
                    if (!loading) {
                      e.target.style.backgroundColor = "rgba(212, 175, 55, 0.1)";
                      e.target.style.borderColor = "rgba(212, 175, 55, 0.5)";
                    }
                  }}
                  onMouseLeave={(e: any) => {
                    if (!loading) {
                      e.target.style.backgroundColor = "transparent";
                      e.target.style.borderColor = "rgba(212, 175, 55, 0.3)";
                    }
                  }}
                >
                  {loading ? "Envoi en cours..." : "Renvoyer le code"}
                </button>
              )}

              <style>{`
                @keyframes spin {
                  from { transform: rotate(0deg); }
                  to { transform: rotate(360deg); }
                }
              `}</style>
            </form>
          )}
        </div>

        {/* Footer */}
        <p
          style={{
            color: "rgba(255, 255, 255, 0.3)",
            fontSize: "12px",
            textAlign: "center",
            marginTop: "24px",
            margin: "24px 0 0",
          }}
        >
          PASS-CORE Administration Panel
        </p>
      </div>
    </div>
  );
}
