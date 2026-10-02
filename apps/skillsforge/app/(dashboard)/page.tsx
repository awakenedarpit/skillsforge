"use client";

import React, { useState } from "react";
import { useSession } from "next-auth/react";
import { useT } from "@/lib/i18n/useT";
import { KpiCards } from "@/components/kpi-cards";
import { CoverageHeatmap } from "@/components/heatmap";
import { AlertPanel } from "@/components/alert-panel";
import { TopRisksCard } from "@/components/top-risks-card";
import { ErrorBoundary } from "@/components/error-boundary";
import MemberPortalPage from "./portal/page";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarCheck,
  CheckSquare,
  GitCompare,
  Fingerprint,
  Award,
  ArrowRight,
  Zap,
  TrendingUp,
} from "lucide-react";
import { Button } from "@quikit/ui";
import { CertificationsModal } from "@/components/certifications-modal";

export default function DashboardPage() {
  const { t, locale } = useT();
  const { data: session } = useSession();
  const [isCertModalOpen, setIsCertModalOpen] = useState(false);

  const { data: leavesData } = useQuery({
    queryKey: ["admin-leaves"],
    queryFn: async () => {
      const res = await fetch("/api/admin/leaves");
      if (!res.ok) return { leaves: [], summary: { pending: 0 } };
      const json = await res.json();
      return json.data;
    },
  });

  const pendingLeavesCount = leavesData?.summary?.pending || 0;

  if (session?.user?.membershipRole === "member") {
    return <MemberPortalPage />;
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">

      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5 animate-fade-in">
        <div>
          {/* Eyebrow label */}
          <div className="flex items-center gap-2 mb-2">
            <span
              className="text-[10px] font-mono font-semibold uppercase tracking-[0.15em]"
              style={{ color: "rgb(var(--accent-600))" }}
            >
              {t("dashboard.operationsCommand")}
            </span>
            {/* Live pulse */}
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping-ring absolute inline-flex h-full w-full rounded-full opacity-75 bg-green-600" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-600" />
            </span>
          </div>

          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ color: "rgb(var(--text))" }}
          >
            {t("dashboard.title")}
          </h1>
          <p
            className="text-sm mt-1"
            style={{ color: "rgb(var(--text-muted))" }}
          >
            {t("dashboard.subtitle")}
          </p>
        </div>

        {/* Quick action shortcuts */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Link href="/leaves" prefetch={true}>
            <Button
              size="sm"
              variant={pendingLeavesCount > 0 ? "primary" : "outline"}
              className="gap-1.5"
            >
              <CalendarCheck className="w-3.5 h-3.5" />
              <span>{t("nav.leaves")}</span>
              {pendingLeavesCount > 0 && (
                <span
                  className="px-1.5 rounded-full text-[10px] font-bold"
                  style={{
                    backgroundColor: "rgb(14 13 11)",
                    color: "rgb(var(--accent-400))",
                  }}
                >
                  {pendingLeavesCount}
                </span>
              )}
            </Button>
          </Link>

          <Link href="/attendance" prefetch={true}>
            <Button size="sm" variant="outline" className="gap-1.5">
              <Fingerprint className="w-3.5 h-3.5" style={{ color: "rgb(var(--accent-600))" }} />
              <span>{t("nav.attendance")}</span>
            </Button>
          </Link>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsCertModalOpen(true)}
            className="gap-1.5"
          >
            <Award className="w-3.5 h-3.5 text-green-600" />
            <span>{t("dashboard.certOverview")}</span>
          </Button>

          <Link href="/assign" prefetch={true}>
            <Button size="sm" variant="outline" className="gap-1.5">
              <CheckSquare className="w-3.5 h-3.5" style={{ color: "rgb(var(--text-muted))" }} />
              <span>{t("nav.assign")}</span>
            </Button>
          </Link>

          <Link href="/simulator" prefetch={true}>
            <Button size="sm" variant="outline" className="gap-1.5">
              <GitCompare className="w-3.5 h-3.5" style={{ color: "rgb(var(--text-muted))" }} />
              <span>{t("nav.simulator")}</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* ── Pending Leaves Alert Banner ── */}
      {pendingLeavesCount > 0 && (
        <div
          className="rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in"
          style={{
            backgroundColor: "rgb(var(--accent-500) / 0.07)",
            border: "1px solid rgb(var(--accent-500) / 0.2)",
            boxShadow: "0 0 0 1px rgb(var(--accent-500) / 0.08), inset 0 1px 0 rgb(var(--accent-500) / 0.1)",
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background: "linear-gradient(135deg, rgb(var(--accent-500)), rgb(var(--accent-700)))",
                boxShadow: "0 2px 8px -2px rgb(var(--accent-600) / 0.4)",
              }}
            >
              <CalendarCheck className="w-5 h-5" style={{ color: "rgb(14 13 11)" }} />
            </div>
            <div>
              <span
                className="font-semibold text-sm block"
                style={{ color: "rgb(var(--accent-700))" }}
              >
                {t(pendingLeavesCount > 1 ? "dashboard.leavePendingMultiple" : "dashboard.leavePendingSingle", {
                  count: pendingLeavesCount,
                })}
              </span>
              <span
                className="text-xs block mt-0.5"
                style={{ color: "rgb(var(--accent-600) / 0.8)" }}
              >
                {t("dashboard.leavePendingSubtext")}
              </span>
            </div>
          </div>

          <Link href="/leaves">
            <Button size="sm" className="shrink-0 gap-1.5">
              <span>
                {t("dashboard.leaveReviewAction")}
              </span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      )}

      {/* ── KPI Cards ── */}
      <ErrorBoundary>
        <KpiCards />
      </ErrorBoundary>

      {/* ── Coverage Heatmap ── */}
      <ErrorBoundary>
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp
                  className="w-3.5 h-3.5"
                  style={{ color: "rgb(var(--accent-600))" }}
                />
                <p
                  className="text-[10px] font-mono font-semibold uppercase tracking-[0.12em]"
                  style={{ color: "rgb(var(--accent-600))" }}
                >
                  {t("dashboard.liveCoverageMatrix")}
                </p>
              </div>
              <h2
                className="text-base font-bold"
                style={{ color: "rgb(var(--text))" }}
              >
                {t("heatmap.title")}
              </h2>
            </div>
            <span
              className="text-xs font-mono hidden sm:block"
              style={{ color: "rgb(var(--text-muted))" }}
            >
              {t("heatmap.subtitle")}
            </span>
          </div>

          {/* Heatmap card */}
          <div
            className="rounded-xl overflow-hidden"
            style={{
              backgroundColor: "rgb(var(--surface))",
              border: "1px solid rgb(var(--border))",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <CoverageHeatmap />
          </div>
        </section>
      </ErrorBoundary>

      {/* ── Alerts & Top Risks ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="animate-slide-up" style={{ animationDelay: "80ms" }}>
          <ErrorBoundary>
            <AlertPanel />
          </ErrorBoundary>
        </div>
        <div className="animate-slide-up" style={{ animationDelay: "140ms" }}>
          <ErrorBoundary>
            <TopRisksCard />
          </ErrorBoundary>
        </div>
      </div>

      {/* ── Quick Nav Tiles ── */}
      <section>
        <p
          className="text-[10px] font-mono font-semibold uppercase tracking-[0.12em] mb-3"
          style={{ color: "rgb(var(--text-muted))" }}
        >
          {t("dashboard.quickActions")}
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { href: "/grid", label: t("nav.grid"), icon: "⊞" },
            { href: "/assign", label: t("nav.assign"), icon: "✓" },
            { href: "/simulator", label: t("nav.simulator"), icon: "⇄" },
            { href: "/workload", label: t("nav.workload"), icon: "▥" },
            { href: "/reports", label: t("nav.reports"), icon: "📊" },
            { href: "/history", label: t("nav.history"), icon: "⏱" },
          ].map((tile) => (
            <Link
              key={tile.href}
              href={tile.href}
              prefetch={true}
              className="group flex flex-col items-center justify-center gap-1.5 py-4 px-3 rounded-xl text-center transition-all duration-[150ms] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              style={{
                backgroundColor: "rgb(var(--surface))",
                border: "1px solid rgb(var(--border))",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = "rgb(var(--surface-raised))";
                (e.currentTarget as HTMLElement).style.borderColor = "rgb(var(--accent-500) / 0.3)";
                (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)";
                (e.currentTarget as HTMLElement).style.boxShadow = "var(--shadow-md)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = "rgb(var(--surface))";
                (e.currentTarget as HTMLElement).style.borderColor = "rgb(var(--border))";
                (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                (e.currentTarget as HTMLElement).style.boxShadow = "none";
              }}
            >
              <span className="text-lg leading-none" aria-hidden="true">{tile.icon}</span>
              <span
                className="text-[10px] font-semibold uppercase tracking-wider"
                style={{ color: "rgb(var(--text-secondary))" }}
              >
                {tile.label}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Certifications Modal */}
      <CertificationsModal
        open={isCertModalOpen}
        onOpenChange={setIsCertModalOpen}
        defaultFilter="ALL"
      />
    </div>
  );
}
