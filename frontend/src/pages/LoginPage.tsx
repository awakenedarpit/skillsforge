import { useState } from "react";
import { useApp } from "../context/AppContext";
import { useLang } from "../context/LangContext";

export function LoginPage() {
  const { login } = useApp();
  const { t } = useLang();

  const [role, setRole]         = useState<"employee" | "manager">("employee");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !password) { setError(t("fillFields")); return; }
    setLoading(true);
    await new Promise(r => setTimeout(r, 600));
    const result = login(email, password);
    setLoading(false);
    if (result === "bad-creds") setError(t("badCreds"));
  };

  const fillDemo = () => {
    if (role === "manager") {
      setEmail("manager@skillforge.in");
      setPassword("manager123");
    } else {
      setEmail("rajesh@skillforge.in");
      setPassword("rajesh123");
    }
    setError("");
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px",
    }}>
      {/* Decorative blobs */}
      <div style={{ position: "fixed", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 0 }}>
        <div style={{
          position: "absolute", top: "-20%", left: "-10%",
          width: "600px", height: "600px", borderRadius: "50%",
          background: "radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)",
        }} />
        <div style={{
          position: "absolute", bottom: "-20%", right: "-10%",
          width: "500px", height: "500px", borderRadius: "50%",
          background: "radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)",
        }} />
      </div>

      <div className="animate-in" style={{ width: "100%", maxWidth: "440px", position: "relative", zIndex: 1 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            width: "64px", height: "64px", borderRadius: "18px",
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            boxShadow: "0 8px 32px rgba(99,102,241,0.4)",
            marginBottom: "16px",
            fontSize: "28px",
          }}>⚡</div>
          <h1 className="gradient-text" style={{ fontSize: "28px", fontWeight: 800, margin: 0 }}>
            {t("appName")}
          </h1>
          <p style={{ color: "var(--text-muted)", marginTop: "6px", fontSize: "14px" }}>
            {t("appTagline")}
          </p>
        </div>

        {/* Role tabs */}
        <div style={{
          display: "flex",
          background: "rgba(255,255,255,0.04)",
          borderRadius: "12px", padding: "4px", marginBottom: "24px",
          border: "1px solid rgba(255,255,255,0.08)",
        }}>
          {(["employee", "manager"] as const).map(r => (
            <button
              key={r}
              onClick={() => { setRole(r); setError(""); setEmail(""); setPassword(""); }}
              style={{
                flex: 1, padding: "10px", border: "none", borderRadius: "9px",
                cursor: "pointer", fontFamily: "inherit", fontWeight: 600, fontSize: "14px",
                transition: "all 0.2s",
                background: role === r ? "linear-gradient(135deg, #6366f1, #8b5cf6)" : "transparent",
                color: role === r ? "#fff" : "var(--text-muted)",
                boxShadow: role === r ? "0 4px 12px rgba(99,102,241,0.4)" : "none",
              }}
            >
              {r === "employee" ? t("employeeLogin") : t("managerLogin")}
            </button>
          ))}
        </div>

        {/* Card */}
        <div className="glass" style={{ padding: "32px" }}>
          <h2 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "6px" }}>
            {role === "employee" ? t("loginToAccount") : t("openMgrPanel")}
          </h2>
          <p style={{ color: "var(--text-muted)", fontSize: "13px", marginBottom: "28px" }}>
            {role === "employee" ? t("enterCreds") : t("enterMgrCreds")}
          </p>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            <div>
              <label className="form-label">{t("emailLabel")}</label>
              <input
                type="email"
                className="input-field"
                placeholder={role === "employee" ? "rajesh@skillforge.in" : "manager@skillforge.in"}
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>

            <div>
              <label className="form-label">{t("passwordLabel")}</label>
              <input
                type="password"
                className="input-field"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div style={{
                padding: "12px 14px", borderRadius: "10px",
                background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)",
                color: "#fca5a5", fontSize: "13px", fontWeight: 500,
              }}>
                ⚠️ {error}
              </div>
            )}

            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{ width: "100%", padding: "12px", fontSize: "15px" }}
            >
              {loading ? <span className="spin">⏳</span> : null}
              {loading ? t("loading") : t("loginBtn")}
            </button>
          </form>

          {/* Demo hint */}
          <div style={{
            marginTop: "20px", padding: "14px",
            background: "rgba(99,102,241,0.08)", borderRadius: "10px",
            border: "1px solid rgba(99,102,241,0.15)",
          }}>
            <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: "0 0 8px 0", fontWeight: 600 }}>
              🔑 {t("demoHint")}
            </p>
            <p style={{ fontSize: "12px", color: "#a5b4fc", margin: 0 }}>
              {role === "employee"
                ? "rajesh@skillforge.in | rajesh123"
                : "manager@skillforge.in | manager123"}
            </p>
            <button
              onClick={fillDemo}
              style={{
                marginTop: "8px", background: "rgba(99,102,241,0.2)",
                border: "1px solid rgba(99,102,241,0.3)", borderRadius: "6px",
                color: "#a5b4fc", fontSize: "11px", fontWeight: 700,
                padding: "4px 10px", cursor: "pointer", fontFamily: "inherit",
              }}
            >
              {t("fillDemo")}
            </button>
          </div>
        </div>

        <p style={{ textAlign: "center", color: "var(--text-muted)", fontSize: "12px", marginTop: "20px" }}>
          {t("allDataSafe")}
        </p>
      </div>
    </div>
  );
}
