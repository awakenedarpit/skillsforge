import { useState } from "react";
import { useApp } from "../context/AppContext";
import { useLang } from "../context/LangContext";
import { MACHINES, levelColor, getCoverageStatus, type SkillLevel } from "../data/store";

type Tab = "dashboard" | "employees" | "grid" | "certificates" | "reports";

// ─────────────────────────────────────────────────────────────────────────────
// MANAGER DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────

export function ManagerDashboard() {
  const { logout } = useApp();
  const { t } = useLang();
  const [tab, setTab] = useState<Tab>("dashboard");
  const [search, setSearch] = useState("");

  const tabs: { id: Tab; icon: string; labelKey: string }[] = [
    { id: "dashboard",    icon: "📊", labelKey: "dashboard" },
    { id: "employees",    icon: "👥", labelKey: "allEmployees" },
    { id: "grid",         icon: "🔢", labelKey: "skillGrid" },
    { id: "certificates", icon: "📜", labelKey: "certReview" },
    { id: "reports",      icon: "📋", labelKey: "reports" },
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
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "32px" }}>
          <div style={{
            width: "40px", height: "40px", borderRadius: "12px",
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px",
          }}>⚡</div>
          <div>
            <p style={{ margin: 0, fontWeight: 800, fontSize: "15px" }}>{t("appName")}</p>
            <p style={{ margin: 0, fontSize: "11px", color: "var(--text-muted)" }}>{t("managerPanel")}</p>
          </div>
        </div>

        {/* Manager badge */}
        <div style={{
          background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)",
          borderRadius: "12px", padding: "12px 14px", marginBottom: "24px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{
              width: "40px", height: "40px", borderRadius: "50%",
              background: "linear-gradient(135deg, #10b981, #059669)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", flexShrink: 0,
            }}>🏭</div>
            <div>
              <p style={{ margin: 0, fontWeight: 700, fontSize: "13px" }}>{t("manager")}</p>
              <p style={{ margin: 0, fontSize: "11px", color: "var(--text-muted)" }}>{t("fullAccess")}</p>
            </div>
          </div>
        </div>

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

      {/* ── Main ── */}
      <main style={{ flex: 1, overflow: "auto", padding: "32px" }}>
        <div className="animate-in" key={tab}>
          {tab === "dashboard"    && <MgrDashboard />}
          {tab === "employees"    && <MgrEmployees search={search} setSearch={setSearch} />}
          {tab === "grid"         && <MgrSkillGrid />}
          {tab === "certificates" && <MgrCertificates />}
          {tab === "reports"      && <MgrReports />}
        </div>
      </main>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD TAB
// ─────────────────────────────────────────────────────────────────────────────

function MgrDashboard() {
  const { state } = useApp();
  const { t } = useLang();
  const { employees } = state;

  const totalEmp       = employees.length;
  const totalCerts     = employees.reduce((s, e) => s + e.certificates.length, 0);
  const pendingCerts   = employees.reduce((s, e) => s + e.certificates.filter(c => c.status === "pending").length, 0);
  const criticalMachines = MACHINES.filter(m => getCoverageStatus(m, employees) === "critical").length;
  const depts = [...new Set(employees.map(e => e.department))];

  return (
    <div>
      <h1 style={{ fontSize: "24px", fontWeight: 800, marginBottom: "6px" }}>{t("mgrDashTitle")}</h1>
      <p style={{ color: "var(--text-muted)", marginBottom: "28px" }}>{t("mgrDashSub")}</p>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px", marginBottom: "28px" }}>
        {[
          { label: t("totalEmployees"),   value: totalEmp,         icon: "👥", color: "#6366f1" },
          { label: t("totalCerts"),        value: totalCerts,       icon: "📜", color: "#3b82f6" },
          { label: t("pendingReview"),     value: pendingCerts,     icon: "⏳", color: "#f59e0b" },
          { label: t("criticalMachines"),  value: criticalMachines, icon: "⚠️",  color: "#ef4444" },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <p style={{ margin: 0, fontSize: "11px", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  {s.label}
                </p>
                <p style={{ margin: "6px 0 0", fontSize: "36px", fontWeight: 800, color: s.color }}>{s.value}</p>
              </div>
              <span style={{ fontSize: "28px" }}>{s.icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Machine coverage */}
      <div className="glass" style={{ padding: "24px", marginBottom: "20px" }}>
        <h2 style={{ fontSize: "16px", fontWeight: 700, marginBottom: "16px" }}>{t("machineCoverage")}</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {MACHINES.map(m => {
            const status  = getCoverageStatus(m, employees);
            const trained = employees.filter(e => e.skills.some(s => s.machineId === m.id && s.level >= 2)).length;
            return (
              <div key={m.id} style={{
                display: "flex", alignItems: "center", gap: "12px",
                padding: "12px 16px", background: "rgba(255,255,255,0.03)", borderRadius: "10px",
              }}>
                <p style={{ margin: 0, flex: 1, fontWeight: 500, fontSize: "14px" }}>{m.name}</p>
                <span style={{ color: "var(--text-muted)", fontSize: "13px" }}>
                  {trained}/{m.minCoverage} {t("operators")}
                </span>
                <div className="progress-bar" style={{ width: "80px" }}>
                  <div className="progress-fill" style={{
                    width: `${Math.min((trained / m.minCoverage) * 100, 100)}%`,
                    background: status === "ok" ? "linear-gradient(90deg,#10b981,#059669)" :
                                status === "low" ? "linear-gradient(90deg,#f59e0b,#d97706)" :
                                "linear-gradient(90deg,#ef4444,#dc2626)",
                  }} />
                </div>
                <span className={`badge ${status === "ok" ? "badge-green" : status === "low" ? "badge-yellow" : "badge-red"}`}>
                  {status === "ok" ? t("statusOk") : status === "low" ? t("statusLow") : t("statusCritical")}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Department summary */}
      <div className="glass" style={{ padding: "24px" }}>
        <h2 style={{ fontSize: "16px", fontWeight: 700, marginBottom: "16px" }}>{t("deptSummary")}</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
          {depts.map(dept => {
            const deptEmps = employees.filter(e => e.department === dept);
            const avgSkillsNum = deptEmps.length
              ? (deptEmps.reduce((s, e) => s + e.skills.length, 0) / deptEmps.length).toFixed(1)
              : "0";
            return (
              <div key={dept} style={{
                padding: "16px", background: "rgba(255,255,255,0.03)", borderRadius: "10px",
                border: "1px solid rgba(255,255,255,0.06)",
              }}>
                <p style={{ margin: "0 0 8px", fontWeight: 700, fontSize: "14px" }}>{dept}</p>
                <p style={{ margin: 0, fontSize: "24px", fontWeight: 800, color: "#6366f1" }}>{deptEmps.length}</p>
                <p style={{ margin: "4px 0 0", fontSize: "12px", color: "var(--text-muted)" }}>
                  {t("avgSkills")} {avgSkillsNum} {t("skillsUnit")}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EMPLOYEES TAB
// ─────────────────────────────────────────────────────────────────────────────

function MgrEmployees({ search, setSearch }: { search: string; setSearch: (s: string) => void }) {
  const { state } = useApp();
  const { t, tLevel } = useLang();
  const { employees } = state;
  const [selected, setSelected] = useState<string | null>(null);

  const filtered = employees.filter(e =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.employeeCode.toLowerCase().includes(search.toLowerCase()) ||
    e.department.toLowerCase().includes(search.toLowerCase()) ||
    e.designation.toLowerCase().includes(search.toLowerCase())
  );

  const emp = selected ? employees.find(e => e.id === selected) : null;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
        <h1 style={{ fontSize: "22px", fontWeight: 800, margin: 0 }}>{t("empTabTitle")}</h1>
        <input
          className="input-field"
          style={{ width: "260px" }}
          placeholder={t("search")}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>
      <p style={{ color: "var(--text-muted)", marginBottom: "24px" }}>
        {filtered.length} {t("empFound")}
      </p>

      <div style={{ display: "grid", gridTemplateColumns: emp ? "1fr 400px" : "1fr", gap: "20px" }}>
        {/* Table */}
        <div className="glass" style={{ padding: "0", overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t("employee")}</th>
                  <th>{t("empCode2")}</th>
                  <th>{t("department")}</th>
                  <th>{t("empSkills")}</th>
                  <th>{t("empCerts")}</th>
                  <th>{t("empDetail")}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(e => (
                  <tr key={e.id} style={{ cursor: "pointer", background: selected === e.id ? "rgba(99,102,241,0.08)" : undefined }}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div style={{
                          width: "36px", height: "36px", borderRadius: "50%",
                          background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: "12px", fontWeight: 700, color: "#fff", flexShrink: 0,
                        }}>{e.avatar}</div>
                        <div>
                          <p style={{ margin: 0, fontWeight: 600, fontSize: "13px" }}>{e.name}</p>
                          <p style={{ margin: 0, fontSize: "11px", color: "var(--text-muted)" }}>{e.designation}</p>
                        </div>
                      </div>
                    </td>
                    <td><span className="badge badge-blue">{e.employeeCode}</span></td>
                    <td style={{ color: "var(--text-muted)", fontSize: "13px" }}>{e.department}</td>
                    <td>
                      <span style={{ fontWeight: 700, color: "#a5b4fc" }}>{e.skills.length}</span>
                      <span style={{ color: "var(--text-muted)", fontSize: "12px" }}> {t("machines")}</span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "4px" }}>
                        {e.certificates.filter(c => c.status === "approved").length > 0 &&
                          <span className="badge badge-green">{e.certificates.filter(c => c.status === "approved").length} ✅</span>}
                        {e.certificates.filter(c => c.status === "pending").length > 0 &&
                          <span className="badge badge-yellow">{e.certificates.filter(c => c.status === "pending").length} ⏳</span>}
                        {e.certificates.length === 0 &&
                          <span style={{ color: "var(--text-muted)", fontSize: "12px" }}>—</span>}
                      </div>
                    </td>
                    <td>
                      <button
                        className="btn-secondary"
                        style={{ padding: "5px 12px", fontSize: "12px" }}
                        onClick={() => setSelected(selected === e.id ? null : e.id)}
                      >
                        {selected === e.id ? t("close") : t("view")}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detail panel */}
        {emp && (
          <div className="glass" style={{ padding: "24px", alignSelf: "start" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{
                  width: "50px", height: "50px", borderRadius: "50%",
                  background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "16px", fontWeight: 700, color: "#fff",
                }}>{emp.avatar}</div>
                <div>
                  <p style={{ margin: 0, fontWeight: 800, fontSize: "16px" }}>{emp.name}</p>
                  <p style={{ margin: 0, fontSize: "12px", color: "#a5b4fc" }}>{emp.employeeCode} · {emp.designation}</p>
                </div>
              </div>
              <button className="btn-secondary" style={{ padding: "4px 10px", fontSize: "12px" }} onClick={() => setSelected(null)}>✕</button>
            </div>

            {[
              [t("department"), emp.department],
              [t("email"),      emp.email],
              [t("mobile"),     emp.phone],
              [t("joined"),     emp.joiningDate],
            ].map(([label, val]) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <span style={{ color: "var(--text-muted)", fontSize: "12px" }}>{label}</span>
                <span style={{ fontSize: "13px", fontWeight: 500 }}>{val}</span>
              </div>
            ))}

            {/* Skills */}
            <h3 style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", margin: "16px 0 8px" }}>
              {t("skillsCount")} ({emp.skills.length})
            </h3>
            {emp.skills.length === 0 ? (
              <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>{t("noSkill")}</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "16px" }}>
                {emp.skills.map(s => (
                  <div key={s.machineId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "13px" }}>{s.machineName}</span>
                    <span className={`badge ${levelColor(s.level as SkillLevel)}`}>{tLevel(s.level)}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Certificates */}
            <h3 style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 8px" }}>
              {t("certsCount")} ({emp.certificates.length})
            </h3>
            {emp.certificates.length === 0 ? (
              <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>{t("noCert")}</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {emp.certificates.map(c => (
                  <div key={c.id} style={{ fontSize: "13px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ flex: 1, marginRight: "8px" }}>{c.name}</span>
                    <span className={`badge ${c.status === "approved" ? "badge-green" : c.status === "pending" ? "badge-yellow" : "badge-red"}`}>
                      {c.status === "approved" ? "✅" : c.status === "pending" ? "⏳" : "❌"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SKILL GRID TAB
// ─────────────────────────────────────────────────────────────────────────────

function MgrSkillGrid() {
  const { state } = useApp();
  const { t, tLevel } = useLang();
  const { employees } = state;

  return (
    <div>
      <h1 style={{ fontSize: "22px", fontWeight: 800, marginBottom: "6px" }}>{t("gridTitle")}</h1>
      <p style={{ color: "var(--text-muted)", marginBottom: "20px" }}>{t("gridSubtitle")}</p>

      {/* Legend */}
      <div className="glass-sm" style={{ padding: "12px 16px", marginBottom: "20px", display: "flex", flexWrap: "wrap", gap: "10px" }}>
        <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-muted)" }}>{t("colorLegend")}</span>
        {([0,1,2,3,4] as SkillLevel[]).map(l => (
          <span key={l} style={{ fontSize: "12px", display: "flex", alignItems: "center", gap: "4px" }}>
            <span style={{
              display: "inline-block", width: "16px", height: "16px", borderRadius: "4px",
              background: ["rgba(239,68,68,0.4)","rgba(245,158,11,0.4)","rgba(59,130,246,0.4)","rgba(16,185,129,0.4)","rgba(99,102,241,0.5)"][l],
            }} />
            {l} – {tLevel(l)}
          </span>
        ))}
      </div>

      <div className="glass" style={{ padding: "0", overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ minWidth: "140px", position: "sticky", left: 0, background: "var(--bg-mid)", zIndex: 2 }}>
                  {t("employee")}
                </th>
                {MACHINES.map(m => <th key={m.id} style={{ minWidth: "100px", textAlign: "center" }}>{m.name}</th>)}
              </tr>
            </thead>
            <tbody>
              {employees.map(emp => (
                <tr key={emp.id}>
                  <td style={{ position: "sticky", left: 0, background: "var(--bg-mid)", zIndex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <div style={{
                        width: "28px", height: "28px", borderRadius: "50%",
                        background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "10px", fontWeight: 700, color: "#fff", flexShrink: 0,
                      }}>{emp.avatar}</div>
                      <div>
                        <p style={{ margin: 0, fontWeight: 600, fontSize: "13px" }}>{emp.name}</p>
                        <p style={{ margin: 0, fontSize: "10px", color: "var(--text-muted)" }}>{emp.employeeCode}</p>
                      </div>
                    </div>
                  </td>
                  {MACHINES.map(m => {
                    const skill = emp.skills.find(s => s.machineId === m.id);
                    const level = (skill?.level ?? 0) as SkillLevel;
                    return (
                      <td key={m.id} style={{ textAlign: "center", padding: "6px" }}>
                        <span className={`badge cell-${level}`} style={{ minWidth: "70px", justifyContent: "center" }} title={tLevel(level)}>
                          {level}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CERTIFICATE REVIEW TAB
// ─────────────────────────────────────────────────────────────────────────────

function MgrCertificates() {
  const { state, updateCertStatus } = useApp();
  const { t } = useLang();
  const { employees } = state;
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");

  const allCerts = employees.flatMap(e =>
    e.certificates.map(c => ({ ...c, empName: e.name, empCode: e.employeeCode, empId: e.id, empAvatar: e.avatar }))
  );

  const filtered = allCerts.filter(c => filter === "all" || c.status === filter);
  const counts   = {
    all:      allCerts.length,
    pending:  allCerts.filter(c => c.status === "pending").length,
    approved: allCerts.filter(c => c.status === "approved").length,
    rejected: allCerts.filter(c => c.status === "rejected").length,
  };

  const filterLabels: Record<typeof filter, string> = {
    all:      `${t("filterAll")} (${counts.all})`,
    pending:  `${t("filterPending")} (${counts.pending})`,
    approved: `${t("filterApproved")} (${counts.approved})`,
    rejected: `${t("filterRejected")} (${counts.rejected})`,
  };

  return (
    <div>
      <h1 style={{ fontSize: "22px", fontWeight: 800, marginBottom: "6px" }}>{t("certReviewTitle")}</h1>
      <p style={{ color: "var(--text-muted)", marginBottom: "24px" }}>{t("certReviewSubtitle")}</p>

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "24px", flexWrap: "wrap" }}>
        {(["all", "pending", "approved", "rejected"] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: "8px 16px", borderRadius: "8px", border: "none",
              fontFamily: "inherit", fontWeight: 600, fontSize: "13px", cursor: "pointer",
              transition: "all 0.2s",
              background: filter === f ? "linear-gradient(135deg, #6366f1, #8b5cf6)" : "rgba(255,255,255,0.06)",
              color: filter === f ? "#fff" : "var(--text-muted)",
              boxShadow: filter === f ? "0 4px 12px rgba(99,102,241,0.35)" : "none",
            }}
          >
            {filterLabels[f]}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="glass" style={{ padding: "48px", textAlign: "center" }}>
          <p style={{ fontSize: "40px", marginBottom: "12px" }}>📭</p>
          <p style={{ color: "var(--text-muted)" }}>{t("noCertsFilter")}</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {filtered.map(c => (
            <div key={`${c.empId}-${c.id}`} className="glass-sm" style={{ padding: "18px 20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px", flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", flex: 1 }}>
                  <div style={{
                    width: "38px", height: "38px", borderRadius: "50%",
                    background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "12px", fontWeight: 700, color: "#fff", flexShrink: 0,
                  }}>{c.empAvatar}</div>
                  <div>
                    <p style={{ margin: "0 0 2px", fontWeight: 700, fontSize: "14px" }}>{c.name}</p>
                    <p style={{ margin: "0 0 4px", fontSize: "12px", color: "var(--text-muted)" }}>
                      {c.empName} ({c.empCode}) · {t("issuedBy")}: {c.issuedBy}
                    </p>
                    <p style={{ margin: 0, fontSize: "12px", color: "var(--text-muted)" }}>
                      {t("issueDate")} {c.dateEarned}{c.expiryDate ? ` · ${t("expiry")} ${c.expiryDate}` : ""}
                    </p>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0, flexWrap: "wrap" }}>
                  <span className={`badge ${c.status === "approved" ? "badge-green" : c.status === "pending" ? "badge-yellow" : "badge-red"}`}>
                    {c.status === "approved" ? t("certApproved") : c.status === "pending" ? t("certPending") : t("certRejected")}
                  </span>
                  {c.status === "pending" && (
                    <>
                      <button className="btn-success" onClick={() => updateCertStatus(c.empId, c.id, "approved")}>
                        {t("approveBtn")}
                      </button>
                      <button className="btn-danger" onClick={() => updateCertStatus(c.empId, c.id, "rejected")}>
                        {t("rejectBtn")}
                      </button>
                    </>
                  )}
                  {c.status !== "pending" && (
                    <button
                      className="btn-secondary"
                      style={{ padding: "6px 12px", fontSize: "12px" }}
                      onClick={() => updateCertStatus(c.empId, c.id, "pending")}
                    >
                      {t("revertBtn")}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// REPORTS TAB
// ─────────────────────────────────────────────────────────────────────────────

function MgrReports() {
  const { state } = useApp();
  const { t } = useLang();
  const { employees } = state;

  const gapMachines  = MACHINES.filter(m => getCoverageStatus(m, employees) !== "ok");
  const noSkillEmps  = employees.filter(e => e.skills.length === 0);
  const today        = new Date();

  const expiringCerts = employees.flatMap(e =>
    e.certificates
      .filter(c => c.expiryDate && c.status === "approved")
      .filter(c => {
        const diff = (new Date(c.expiryDate!).getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
        return diff >= 0 && diff <= 90;
      })
      .map(c => ({ ...c, empName: e.name, empCode: e.employeeCode }))
  );

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
        <h1 style={{ fontSize: "22px", fontWeight: 800, margin: 0 }}>{t("reportsTitle")}</h1>
        <button className="btn-secondary" onClick={() => window.print()}>{t("print")}</button>
      </div>
      <p style={{ color: "var(--text-muted)", marginBottom: "28px" }}>{t("reportsSubtitle")}</p>

      {/* Gap report */}
      <div className="glass" style={{ padding: "24px", marginBottom: "20px" }}>
        <h2 style={{ fontSize: "16px", fontWeight: 700, marginBottom: "16px" }}>
          {t("gapReport")} ({gapMachines.length})
        </h2>
        {gapMachines.length === 0 ? (
          <p style={{ color: "#10b981" }}>{t("gapOk")}</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {gapMachines.map(m => {
              const trained = employees.filter(e => e.skills.some(s => s.machineId === m.id && s.level >= 2)).length;
              const status  = getCoverageStatus(m, employees);
              return (
                <div key={m.id} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "12px 16px", background: "rgba(239,68,68,0.06)", borderRadius: "10px",
                  border: "1px solid rgba(239,68,68,0.15)",
                }}>
                  <div>
                    <p style={{ margin: 0, fontWeight: 600 }}>{m.name}</p>
                    <p style={{ margin: "2px 0 0", fontSize: "12px", color: "var(--text-muted)" }}>
                      {m.department} · {trained} {t("haveOperators")} {m.minCoverage} {t("needOperators")}
                    </p>
                  </div>
                  <span className={`badge ${status === "low" ? "badge-yellow" : "badge-red"}`}>
                    {status === "low" ? t("statusLowBadge") : t("statusDanger")}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* No skill employees */}
      <div className="glass" style={{ padding: "24px", marginBottom: "20px" }}>
        <h2 style={{ fontSize: "16px", fontWeight: 700, marginBottom: "16px" }}>
          {t("noSkillEmps")} ({noSkillEmps.length})
        </h2>
        {noSkillEmps.length === 0 ? (
          <p style={{ color: "#10b981" }}>{t("noSkillOk")}</p>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {noSkillEmps.map(e => (
              <span key={e.id} className="badge badge-yellow" style={{ padding: "6px 12px", fontSize: "12px" }}>
                {e.name} ({e.employeeCode})
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Expiring certs */}
      <div className="glass" style={{ padding: "24px" }}>
        <h2 style={{ fontSize: "16px", fontWeight: 700, marginBottom: "16px" }}>
          {t("expiringCerts")} ({expiringCerts.length})
        </h2>
        {expiringCerts.length === 0 ? (
          <p style={{ color: "#10b981" }}>{t("expiringOk")}</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {expiringCerts.map(c => {
              const daysLeft = Math.ceil((new Date(c.expiryDate!).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
              return (
                <div key={c.id} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "12px 16px", background: "rgba(245,158,11,0.06)", borderRadius: "10px",
                  border: "1px solid rgba(245,158,11,0.15)",
                }}>
                  <div>
                    <p style={{ margin: 0, fontWeight: 600 }}>{c.name}</p>
                    <p style={{ margin: "2px 0 0", fontSize: "12px", color: "var(--text-muted)" }}>
                      {c.empName} ({c.empCode}) · {t("expiry")} {c.expiryDate}
                    </p>
                  </div>
                  <span className={`badge ${daysLeft <= 30 ? "badge-red" : "badge-yellow"}`}>
                    {daysLeft} {t("daysLeft")}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
