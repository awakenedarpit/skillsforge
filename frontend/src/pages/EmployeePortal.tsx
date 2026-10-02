import { useState } from "react";
import { useApp } from "../context/AppContext";
import { useLang } from "../context/LangContext";
import { MACHINES, levelColor, type SkillLevel, type Certificate } from "../data/store";

type Tab = "home" | "skills" | "certificates" | "profile";

// ─────────────────────────────────────────────────────────────────────────────
// EMPLOYEE PORTAL
// ─────────────────────────────────────────────────────────────────────────────

export function EmployeePortal() {
  const { currentEmployee, logout } = useApp();
  const { t } = useLang();
  const [tab, setTab] = useState<Tab>("home");

  if (!currentEmployee) return null;
  const emp = currentEmployee;

  const tabs: { id: Tab; icon: string; labelKey: string }[] = [
    { id: "home",         icon: "🏠", labelKey: "home" },
    { id: "skills",       icon: "⚙️",  labelKey: "mySkills" },
    { id: "certificates", icon: "📜", labelKey: "certificates" },
    { id: "profile",      icon: "👤", labelKey: "profile" },
  ];

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {/* ── Sidebar ── */}
      <aside className="no-print" style={{
        width: "240px", flexShrink: 0,
        background: "rgba(255,255,255,0.03)",
        borderRight: "1px solid rgba(255,255,255,0.07)",
        display: "flex", flexDirection: "column", padding: "24px 16px",
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "32px" }}>
          <div style={{
            width: "40px", height: "40px", borderRadius: "12px",
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "18px", flexShrink: 0,
          }}>⚡</div>
          <div>
            <p style={{ margin: 0, fontWeight: 800, fontSize: "15px" }}>{t("appName")}</p>
            <p style={{ margin: 0, fontSize: "11px", color: "var(--text-muted)" }}>{t("employeePortal")}</p>
          </div>
        </div>

        {/* Employee Card */}
        <div style={{
          background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)",
          borderRadius: "12px", padding: "14px", marginBottom: "24px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{
              width: "42px", height: "42px", borderRadius: "50%",
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "14px", fontWeight: 700, color: "#fff", flexShrink: 0,
            }}>{emp.avatar}</div>
            <div style={{ minWidth: 0 }}>
              <p style={{ margin: 0, fontWeight: 700, fontSize: "13px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {emp.name}
              </p>
              <p style={{ margin: 0, fontSize: "11px", color: "var(--text-muted)" }}>{emp.employeeCode}</p>
              <p style={{ margin: 0, fontSize: "11px", color: "#a5b4fc" }}>{emp.designation}</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: "4px" }}>
          {tabs.map(tb => (
            <button
              key={tb.id}
              className={`nav-link ${tab === tb.id ? "active" : ""}`}
              onClick={() => setTab(tb.id)}
            >
              <span style={{ fontSize: "16px" }}>{tb.icon}</span>
              {t(tb.labelKey as any)}
            </button>
          ))}
        </nav>

        <button className="btn-danger" onClick={logout} style={{ width: "100%", marginTop: "16px" }}>
          🚪 {t("logout")}
        </button>
      </aside>

      {/* ── Main content ── */}
      <main style={{ flex: 1, overflow: "auto", padding: "32px" }}>
        <div className="animate-in" key={tab}>
          {tab === "home"         && <EmpHome />}
          {tab === "skills"       && <EmpSkills />}
          {tab === "certificates" && <EmpCertificates />}
          {tab === "profile"      && <EmpProfile />}
        </div>
      </main>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HOME TAB
// ─────────────────────────────────────────────────────────────────────────────

function EmpHome() {
  const { currentEmployee } = useApp();
  const { t, tLevel, lang } = useLang();
  const emp = currentEmployee!;

  const approvedCerts = emp.certificates.filter(c => c.status === "approved").length;
  const pendingCerts  = emp.certificates.filter(c => c.status === "pending").length;
  const totalSkills   = emp.skills.length;
  const expertSkills  = emp.skills.filter(s => s.level >= 3).length;

  const dateStr = new Date().toLocaleDateString(lang === "hi" ? "hi-IN" : "en-IN", {
    weekday: "long", day: "numeric", month: "long",
  });

  return (
    <div>
      <h1 style={{ fontSize: "24px", fontWeight: 800, marginBottom: "6px" }}>
        {t("greetingPrefix")} {emp.name.split(" ")[0]} 👋
      </h1>
      <p style={{ color: "var(--text-muted)", marginBottom: "28px" }}>
        {t("todaySummary")} {dateStr}
      </p>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px", marginBottom: "28px" }}>
        {[
          { label: t("mySkillsStat"), value: totalSkills,   sub: t("machines"),  icon: "⚙️", color: "#6366f1" },
          { label: t("expertSkillsStat"), value: expertSkills, sub: t("level34"), icon: "🏆", color: "#10b981" },
          { label: t("approvedCerts"), value: approvedCerts, sub: t("approved"), icon: "✅", color: "#10b981" },
          { label: t("pendingCerts"),  value: pendingCerts,  sub: t("pending"),  icon: "⏳", color: "#f59e0b" },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <p style={{ margin: 0, fontSize: "12px", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  {s.label}
                </p>
                <p style={{ margin: "6px 0 2px", fontSize: "32px", fontWeight: 800, color: s.color }}>{s.value}</p>
                <p style={{ margin: 0, fontSize: "12px", color: "var(--text-muted)" }}>{s.sub}</p>
              </div>
              <span style={{ fontSize: "28px" }}>{s.icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Skills summary */}
      <div className="glass" style={{ padding: "24px", marginBottom: "20px" }}>
        <h2 style={{ fontSize: "16px", fontWeight: 700, marginBottom: "16px" }}>{t("myMachineSkills")}</h2>
        {emp.skills.length === 0 ? (
          <p style={{ color: "var(--text-muted)" }}>{t("noSkillsYet")}</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {emp.skills.map(s => (
              <div key={s.machineId} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{ flex: 1, fontSize: "14px", fontWeight: 500 }}>{s.machineName}</span>
                <span className={`badge ${levelColor(s.level as SkillLevel)}`}>{tLevel(s.level)}</span>
                <div className="progress-bar" style={{ width: "80px" }}>
                  <div className="progress-fill" style={{ width: `${(s.level / 4) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent certificates */}
      <div className="glass" style={{ padding: "24px" }}>
        <h2 style={{ fontSize: "16px", fontWeight: 700, marginBottom: "16px" }}>{t("recentCerts")}</h2>
        {emp.certificates.length === 0 ? (
          <p style={{ color: "var(--text-muted)" }}>{t("noCertsYet")}</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {emp.certificates.slice(0, 3).map(c => (
              <div key={c.id} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "10px 14px", background: "rgba(255,255,255,0.03)", borderRadius: "10px",
              }}>
                <div>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: "13px" }}>{c.name}</p>
                  <p style={{ margin: 0, fontSize: "11px", color: "var(--text-muted)" }}>{c.issuedBy} · {c.dateEarned}</p>
                </div>
                <span className={`badge ${c.status === "approved" ? "badge-green" : c.status === "pending" ? "badge-yellow" : "badge-red"}`}>
                  {c.status === "approved" ? t("certApproved") : c.status === "pending" ? t("certPending") : t("certRejected")}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SKILLS TAB
// ─────────────────────────────────────────────────────────────────────────────

function EmpSkills() {
  const { currentEmployee, updateSkill } = useApp();
  const { t, tLevel } = useLang();
  const emp = currentEmployee!;
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved]   = useState<string | null>(null);

  const getLevel = (machineId: string): SkillLevel =>
    (emp.skills.find(s => s.machineId === machineId)?.level ?? 0) as SkillLevel;

  const handleChange = async (machineId: string, machineName: string, level: SkillLevel) => {
    setSaving(machineId);
    await new Promise(r => setTimeout(r, 400));
    updateSkill(emp.id, machineId, machineName, level);
    setSaving(null);
    setSaved(machineId);
    setTimeout(() => setSaved(null), 2000);
  };

  const levelOptions: { value: SkillLevel; labelKey: string }[] = [
    { value: 0, labelKey: "lvl0" },
    { value: 1, labelKey: "lvl1" },
    { value: 2, labelKey: "lvl2" },
    { value: 3, labelKey: "lvl3" },
    { value: 4, labelKey: "lvl4" },
  ];

  // Group by department
  const byDept = MACHINES.reduce<Record<string, typeof MACHINES>>((acc, m) => {
    acc[m.department] ??= [];
    acc[m.department].push(m);
    return acc;
  }, {});

  return (
    <div>
      <h1 style={{ fontSize: "22px", fontWeight: 800, marginBottom: "6px" }}>{t("skillsTitle")}</h1>
      <p style={{ color: "var(--text-muted)", marginBottom: "28px" }}>{t("skillsSubtitle")}</p>

      {/* Legend */}
      <div className="glass-sm" style={{ padding: "16px 20px", marginBottom: "24px", display: "flex", flexWrap: "wrap", gap: "12px" }}>
        <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-muted)", marginRight: "4px" }}>{t("levelLegend")}</span>
        {([0,1,2,3,4] as SkillLevel[]).map(l => (
          <span key={l} className={`badge ${levelColor(l)}`}>{tLevel(l)}</span>
        ))}
      </div>

      {Object.entries(byDept).map(([dept, machines]) => (
        <div key={dept} style={{ marginBottom: "24px" }}>
          <h2 style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "12px" }}>
            🏭 {dept}
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "14px" }}>
            {machines.map(machine => {
              const level = getLevel(machine.id);
              return (
                <div key={machine.id} className="glass-sm" style={{ padding: "18px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: "14px" }}>{machine.name}</p>
                    {saved === machine.id && (
                      <span style={{ fontSize: "11px", color: "#10b981", fontWeight: 700 }}>✓ {t("saved")}</span>
                    )}
                    {saving === machine.id && (
                      <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>{t("saving")}</span>
                    )}
                  </div>

                  {/* Level dots */}
                  <div style={{ display: "flex", gap: "6px", marginBottom: "12px" }}>
                    {[1,2,3,4].map(i => (
                      <span key={i} className={`skill-dot ${i <= level ? `filled level-${Math.min(level,4)}` : ""}`} />
                    ))}
                  </div>

                  <select
                    className="input-field"
                    value={level}
                    onChange={e => handleChange(machine.id, machine.name, Number(e.target.value) as SkillLevel)}
                    disabled={saving === machine.id}
                  >
                    {levelOptions.map(o => (
                      <option key={o.value} value={o.value}>{t(o.labelKey as any)}</option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CERTIFICATES TAB
// ─────────────────────────────────────────────────────────────────────────────

function EmpCertificates() {
  const { currentEmployee, addCertificate, deleteCertificate } = useApp();
  const { t } = useLang();
  const emp = currentEmployee!;
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", issuedBy: "", dateEarned: "", expiryDate: "" });
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.issuedBy || !form.dateEarned) {
      setMsg(t("fillRequired")); return;
    }
    setSubmitting(true);
    await new Promise(r => setTimeout(r, 600));
    addCertificate(emp.id, {
      name: form.name,
      issuedBy: form.issuedBy,
      dateEarned: form.dateEarned,
      ...(form.expiryDate ? { expiryDate: form.expiryDate } : {}),
    });
    setForm({ name: "", issuedBy: "", dateEarned: "", expiryDate: "" });
    setShowForm(false);
    setSubmitting(false);
    setMsg(t("certSubmitted"));
    setTimeout(() => setMsg(""), 4000);
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
        <h1 style={{ fontSize: "22px", fontWeight: 800, margin: 0 }}>{t("certsTitle")}</h1>
        <button className="btn-primary" onClick={() => { setShowForm(!showForm); setMsg(""); }}>
          {showForm ? `✕ ${t("close")}` : t("addNewCert")}
        </button>
      </div>
      <p style={{ color: "var(--text-muted)", marginBottom: "24px" }}>{t("certsSubtitle")}</p>

      {msg && (
        <div style={{
          padding: "12px 16px", marginBottom: "20px", borderRadius: "10px",
          background: msg.startsWith("✅") ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)",
          border: `1px solid ${msg.startsWith("✅") ? "rgba(16,185,129,0.25)" : "rgba(239,68,68,0.25)"}`,
          color: msg.startsWith("✅") ? "#6ee7b7" : "#fca5a5",
          fontWeight: 500, fontSize: "14px",
        }}>
          {msg}
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <div className="glass" style={{ padding: "24px", marginBottom: "24px" }}>
          <h2 style={{ fontSize: "16px", fontWeight: 700, marginBottom: "20px" }}>{t("addCertTitle")}</h2>
          <form onSubmit={handleSubmit}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
              <div>
                <label className="form-label">{t("certName")}</label>
                <input className="input-field" placeholder={t("certNamePh")} value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="form-label">{t("issuedBy")}</label>
                <input className="input-field" placeholder={t("issuedByPh")} value={form.issuedBy}
                  onChange={e => setForm(f => ({ ...f, issuedBy: e.target.value }))} />
              </div>
              <div>
                <label className="form-label">{t("dateEarned")}</label>
                <input type="date" className="input-field" value={form.dateEarned}
                  onChange={e => setForm(f => ({ ...f, dateEarned: e.target.value }))} />
              </div>
              <div>
                <label className="form-label">{t("expiryDate")}</label>
                <input type="date" className="input-field" value={form.expiryDate}
                  onChange={e => setForm(f => ({ ...f, expiryDate: e.target.value }))} />
              </div>
            </div>
            <div style={{ display: "flex", gap: "12px" }}>
              <button type="submit" className="btn-primary" disabled={submitting}>
                {submitting ? t("submitting") : t("submitCert")}
              </button>
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>
                {t("cancel")}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Certificates list */}
      {emp.certificates.length === 0 ? (
        <div className="glass" style={{ padding: "48px", textAlign: "center" }}>
          <p style={{ fontSize: "40px", marginBottom: "12px" }}>📜</p>
          <p style={{ color: "var(--text-muted)", fontSize: "15px" }}>{t("noCerts")}</p>
          <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>{t("noCertsHint")}</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {emp.certificates.map(c => (
            <CertCard key={c.id} cert={c} onDelete={() => deleteCertificate(emp.id, c.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

function CertCard({ cert, onDelete }: { cert: Certificate; onDelete: () => void }) {
  const { t } = useLang();
  const [confirming, setConfirming] = useState(false);
  const isExpired = cert.expiryDate && new Date(cert.expiryDate) < new Date();

  return (
    <div className="glass-sm" style={{ padding: "18px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px" }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px", flexWrap: "wrap" }}>
          <p style={{ margin: 0, fontWeight: 700, fontSize: "14px" }}>{cert.name}</p>
          <span className={`badge ${cert.status === "approved" ? "badge-green" : cert.status === "pending" ? "badge-yellow" : "badge-red"}`}>
            {cert.status === "approved" ? t("certApproved") : cert.status === "pending" ? t("certPending") : t("certRejected")}
          </span>
          {isExpired && <span className="badge badge-red">{t("expired")}</span>}
        </div>
        <p style={{ margin: 0, fontSize: "12px", color: "var(--text-muted)" }}>
          {cert.issuedBy} &nbsp;·&nbsp; {t("issued")} {cert.dateEarned}
          {cert.expiryDate && ` · ${t("expiry")} ${cert.expiryDate}`}
        </p>
      </div>
      <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
        {confirming ? (
          <>
            <button className="btn-danger" onClick={() => { onDelete(); setConfirming(false); }}>{t("yes")}</button>
            <button className="btn-secondary" onClick={() => setConfirming(false)}>{t("no")}</button>
          </>
        ) : (
          cert.status !== "approved" && (
            <button className="btn-danger" onClick={() => setConfirming(true)}>🗑 {t("delete")}</button>
          )
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PROFILE TAB
// ─────────────────────────────────────────────────────────────────────────────

function EmpProfile() {
  const { currentEmployee, updateProfile } = useApp();
  const { t } = useLang();
  const emp = currentEmployee!;
  const [editing, setEditing] = useState(false);
  const [form, setForm]       = useState({ email: emp.email, phone: emp.phone });
  const [saved, setSaved]     = useState(false);

  const handleSave = async () => {
    await new Promise(r => setTimeout(r, 400));
    updateProfile(emp.id, form);
    setEditing(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const infoRows: { labelKey: string; value: string }[] = [
    { labelKey: "empCode",     value: emp.employeeCode },
    { labelKey: "department",  value: emp.department },
    { labelKey: "designation", value: emp.designation },
    { labelKey: "joiningDate", value: emp.joiningDate },
  ];

  return (
    <div>
      <h1 style={{ fontSize: "22px", fontWeight: 800, marginBottom: "24px" }}>{t("profileTitle")}</h1>

      {saved && (
        <div style={{ padding: "12px 16px", marginBottom: "20px", borderRadius: "10px",
          background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.25)",
          color: "#6ee7b7", fontWeight: 500 }}>
          {t("profileSaved")}
        </div>
      )}

      {/* Avatar card */}
      <div className="glass" style={{ padding: "28px", marginBottom: "20px", display: "flex", alignItems: "center", gap: "24px" }}>
        <div style={{
          width: "80px", height: "80px", borderRadius: "50%",
          background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "28px", fontWeight: 700, color: "#fff", flexShrink: 0,
          boxShadow: "0 8px 24px rgba(99,102,241,0.4)",
        }}>{emp.avatar}</div>
        <div>
          <h2 style={{ margin: 0, fontSize: "22px", fontWeight: 800 }}>{emp.name}</h2>
          <p style={{ margin: "4px 0 0", color: "#a5b4fc", fontSize: "14px" }}>{emp.designation} · {emp.department}</p>
        </div>
      </div>

      {/* Fixed info */}
      <div className="glass" style={{ padding: "24px", marginBottom: "20px" }}>
        <h2 style={{ fontSize: "12px", fontWeight: 700, marginBottom: "16px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          {t("officeInfo")}
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          {infoRows.map(i => (
            <div key={i.labelKey as string}>
              <p style={{ margin: 0, fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                {t(i.labelKey as any)}
              </p>
              <p style={{ margin: "4px 0 0", fontSize: "14px", fontWeight: 600 }}>{i.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Editable info */}
      <div className="glass" style={{ padding: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h2 style={{ margin: 0, fontSize: "12px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            {t("contactInfo")}
          </h2>
          {!editing ? (
            <button className="btn-secondary" style={{ padding: "6px 14px", fontSize: "13px" }} onClick={() => setEditing(true)}>
              ✏️ {t("edit")}
            </button>
          ) : (
            <div style={{ display: "flex", gap: "8px" }}>
              <button className="btn-primary" style={{ padding: "6px 14px", fontSize: "13px" }} onClick={handleSave}>
                💾 {t("save")}
              </button>
              <button className="btn-secondary" style={{ padding: "6px 14px", fontSize: "13px" }} onClick={() => { setEditing(false); setForm({ email: emp.email, phone: emp.phone }); }}>
                {t("cancel")}
              </button>
            </div>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          <div>
            <label className="form-label">{t("email")}</label>
            {editing ? (
              <input type="email" className="input-field" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            ) : (
              <p style={{ margin: "4px 0 0", fontSize: "14px", fontWeight: 600 }}>{emp.email}</p>
            )}
          </div>
          <div>
            <label className="form-label">{t("phone")}</label>
            {editing ? (
              <input type="tel" className="input-field" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            ) : (
              <p style={{ margin: "4px 0 0", fontSize: "14px", fontWeight: 600 }}>{emp.phone}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
