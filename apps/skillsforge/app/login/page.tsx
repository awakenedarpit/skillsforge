"use client";

import React, { useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useT } from "@/lib/i18n/useT";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Button, Badge } from "@quikit/ui";
import { ShieldCheck, UserCheck, Eye, Factory, ArrowRight, Loader2, Zap } from "lucide-react";
import { DEMO_USERS } from "@/lib/demo/seedData";

export default function LoginPage() {
  const { t } = useT();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const [loadingUserId, setLoadingUserId] = useState<string | null>(null);

  const ashaUser = DEMO_USERS.find((u) => u.id === "usr-asha-1") || DEMO_USERS[1];
  const vikasUser = DEMO_USERS.find((u) => u.id === "usr-vikas-3") || DEMO_USERS[2];
  const rohitUser = DEMO_USERS.find((u) => u.id === "usr-rohit-2") || DEMO_USERS[3];
  const superUser = DEMO_USERS.find((u) => u.isSuperAdmin) || DEMO_USERS[0];

  const personas = [
    {
      ...ashaUser,
      roleLabelKey: "login.roles.orgAdmin",
      badgeVariant: "blue" as const,
      icon: ShieldCheck,
      description: "Full administrative access to operators, machines, and configuration.",
      accentColor: "rgb(37 99 235)",
      accentBg: "rgb(37 99 235 / 0.08)",
      accentBorder: "rgb(37 99 235 / 0.2)",
    },
    {
      ...vikasUser,
      roleLabelKey: "login.roles.appAdmin",
      badgeVariant: "green" as const,
      icon: UserCheck,
      description: "Shift supervisor with cell editing, assignment checking, and simulation.",
      accentColor: "rgb(22 163 74)",
      accentBg: "rgb(22 163 74 / 0.08)",
      accentBorder: "rgb(22 163 74 / 0.2)",
    },
    {
      ...rohitUser,
      roleLabelKey: "login.roles.member",
      badgeVariant: "neutral" as const,
      icon: Eye,
      description: "Member portal: view duty & machine, apply leave, update certificates.",
      accentColor: "rgb(var(--accent-600))",
      accentBg: "rgb(var(--accent-500) / 0.08)",
      accentBorder: "rgb(var(--accent-500) / 0.2)",
    },
    {
      ...superUser,
      roleLabelKey: "nav.superadmin",
      badgeVariant: "blue" as const,
      icon: ShieldCheck,
      description: "Cross-organization platform administrator with tenant oversight.",
      accentColor: "rgb(147 51 234)",
      accentBg: "rgb(147 51 234 / 0.08)",
      accentBorder: "rgb(147 51 234 / 0.2)",
    },
  ];

  const handleSignIn = async (userId: string) => {
    try {
      setLoadingUserId(userId);
      const persona = personas.find((p) => p.id === userId);
      const targetUrl = persona?.role === "member" ? "/portal" : callbackUrl;
      await signIn("dev-login", { userId, callbackUrl: targetUrl });
    } catch (err) {
      console.error("Sign-in failed:", err);
      setLoadingUserId(null);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col justify-between relative overflow-hidden"
      style={{ backgroundColor: "rgb(var(--bg))" }}
    >
      {/* ── Background grid pattern ── */}
      <div
        className="absolute inset-0 grid-pattern pointer-events-none"
        aria-hidden="true"
        style={{ opacity: 0.5 }}
      />

      {/* ── Ambient glow blobs ── */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full pointer-events-none blur-[100px]"
        style={{
          background: "radial-gradient(ellipse, rgb(var(--accent-500) / 0.08) 0%, transparent 70%)",
        }}
        aria-hidden="true"
      />
      <div
        className="absolute bottom-0 left-1/4 w-[400px] h-[250px] rounded-full pointer-events-none blur-[80px]"
        style={{
          background: "radial-gradient(ellipse, rgb(37 99 235 / 0.06) 0%, transparent 70%)",
        }}
        aria-hidden="true"
      />

      {/* ── Header ── */}
      <header className="relative z-10 flex items-center justify-between max-w-lg w-full mx-auto p-6 sm:px-8 sm:pt-8">
        <div className="flex items-center gap-3">
          {/* Logo */}
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: "linear-gradient(135deg, rgb(var(--accent-500)), rgb(var(--accent-700)))",
              boxShadow: "0 4px 12px -2px rgb(var(--accent-600) / 0.4)",
            }}
          >
            <Factory className="w-5 h-5" style={{ color: "rgb(14 13 11)" }} strokeWidth={2.2} />
          </div>
          <div>
            <span
              className="font-bold text-base tracking-tight block leading-none mb-0.5"
              style={{ color: "rgb(var(--text))" }}
            >
              SkillsForge
            </span>
            <span
              className="text-[9px] font-mono tracking-widest uppercase block"
              style={{ color: "rgb(var(--text-muted))" }}
            >
              Enterprise Suite
            </span>
          </div>
        </div>

        <LanguageSwitcher />
      </header>

      {/* ── Main content ── */}
      <main className="relative z-10 max-w-lg w-full mx-auto flex-1 flex flex-col justify-center px-6 sm:px-8 py-4">
        {/* Hero text */}
        <div className="mb-8 text-center animate-fade-in">
          <div
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-semibold uppercase tracking-widest mb-4"
            style={{
              backgroundColor: "rgb(var(--accent-500) / 0.1)",
              color: "rgb(var(--accent-700))",
              border: "1px solid rgb(var(--accent-500) / 0.2)",
            }}
          >
            <span className="relative flex h-1.5 w-1.5">
              <span
                className="animate-ping-ring absolute inline-flex h-full w-full rounded-full opacity-75"
                style={{ backgroundColor: "rgb(var(--accent-600))" }}
              />
              <span
                className="relative inline-flex rounded-full h-1.5 w-1.5"
                style={{ backgroundColor: "rgb(var(--accent-600))" }}
              />
            </span>
            Operator Skill Matrix
          </div>

          <h1
            className="text-3xl font-bold tracking-tight mb-3"
            style={{ color: "rgb(var(--text))" }}
          >
            {t("login.title")}
          </h1>
          <p
            className="text-sm leading-relaxed"
            style={{ color: "rgb(var(--text-muted))" }}
          >
            {t("login.subtitle")}
          </p>
        </div>

        {/* Main card */}
        <div
          className="rounded-2xl overflow-hidden shadow-token-xl animate-slide-up"
          style={{
            backgroundColor: "rgb(var(--surface))",
            border: "1px solid rgb(var(--border))",
          }}
        >
          {/* Dev mode notice */}
          <div
            className="px-6 pt-6 pb-4"
          >
            <div
              className="rounded-xl p-3.5"
              style={{
                backgroundColor: "rgb(var(--accent-500) / 0.07)",
                border: "1px solid rgb(var(--accent-500) / 0.15)",
              }}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <Zap className="w-3 h-3" style={{ color: "rgb(var(--accent-600))" }} />
                  <span
                    className="text-[10px] font-mono font-semibold uppercase tracking-widest"
                    style={{ color: "rgb(var(--accent-700))" }}
                  >
                    {t("login.devLoginTitle")}
                  </span>
                </div>
                <span
                  className="text-[9px] font-mono px-2 py-0.5 rounded-md font-semibold"
                  style={{
                    backgroundColor: "rgb(var(--accent-500) / 0.15)",
                    color: "rgb(var(--accent-700))",
                  }}
                >
                  Mode B
                </span>
              </div>
              <p
                className="text-xs leading-relaxed"
                style={{ color: "rgb(var(--accent-700) / 0.8)" }}
              >
                {t("login.devLoginSubtitle")}
              </p>
            </div>
          </div>

          {/* Divider */}
          <div className="divider-amber mx-6 mb-4" aria-hidden="true" />

          {/* Persona buttons */}
          <div className="px-6 pb-6 space-y-2.5">
            {personas.map((p, pIdx) => {
              const Icon = p.icon;
              const isLoading = loadingUserId === p.id;

              return (
                <button
                  key={p.id}
                  id={`login-persona-${p.id}`}
                  onClick={() => handleSignIn(p.id)}
                  disabled={Boolean(loadingUserId)}
                  className="w-full text-left rounded-xl transition-all duration-[180ms] group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none animate-slide-up"
                  style={{
                    padding: "14px 16px",
                    border: "1px solid rgb(var(--border))",
                    backgroundColor: "transparent",
                    animationDelay: `${pIdx * 60 + 80}ms`,
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor = p.accentBg;
                    (e.currentTarget as HTMLElement).style.borderColor = p.accentBorder;
                    (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)";
                    (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-md)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                    (e.currentTarget as HTMLElement).style.borderColor = "rgb(var(--border))";
                    (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                    (e.currentTarget as HTMLElement).style.boxShadow = "none";
                  }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-start gap-3.5">
                      {/* Icon */}
                      <div
                        className="mt-0.5 w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-[150ms]"
                        style={{
                          backgroundColor: isLoading ? p.accentBg : "rgb(var(--surface-raised))",
                          border: "1px solid rgb(var(--border))",
                        }}
                      >
                        {isLoading ? (
                          <Loader2
                            className="w-5 h-5 animate-spin"
                            style={{ color: p.accentColor }}
                          />
                        ) : (
                          <Icon
                            className="w-5 h-5"
                            style={{ color: "rgb(var(--text-muted))" }}
                          />
                        )}
                      </div>

                      {/* Text */}
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span
                            className="font-semibold text-sm"
                            style={{ color: "rgb(var(--text))" }}
                          >
                            {p.name}
                          </span>
                          <Badge variant={p.badgeVariant}>{t(p.roleLabelKey)}</Badge>
                        </div>
                        <p
                          className="text-[11px] leading-relaxed"
                          style={{ color: "rgb(var(--text-muted))" }}
                        >
                          {p.description}
                        </p>
                        <p
                          className="text-[10px] font-mono mt-0.5"
                          style={{ color: "rgb(var(--text-muted))" }}
                        >
                          {p.email}
                        </p>
                      </div>
                    </div>

                    {/* Arrow */}
                    <ArrowRight
                      className="w-4 h-4 shrink-0 transition-transform duration-[150ms] group-hover:translate-x-1"
                      style={{ color: "rgb(var(--text-muted))" }}
                    />
                  </div>
                </button>
              );
            })}
          </div>

          {/* Footer inside card */}
          <div
            className="px-6 py-4 text-center"
            style={{ borderTop: "1px solid rgb(var(--border))" }}
          >
            <p
              className="text-[11px] font-mono"
              style={{ color: "rgb(var(--text-muted))" }}
            >
              QuikIT Monorepo · Operator Skill Matrix &amp; Certification Tracker
            </p>
          </div>
        </div>
      </main>

      {/* ── Page footer ── */}
      <footer
        className="relative z-10 text-center py-5 text-xs font-mono px-6"
        style={{ color: "rgb(var(--text-muted))" }}
      >
        <div className="divider-amber max-w-lg mx-auto mb-4" aria-hidden="true" />
        SkillsForge © 2026 · Mode B Stand-in Architecture
      </footer>
    </div>
  );
}
