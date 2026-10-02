"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useT } from "@/lib/i18n/useT";
import { today } from "@/lib/domain/rules";
import { CoveragePayload } from "@/lib/domain/coverage";
import { AlertItem } from "./alert-panel";
import { Skeleton } from "@quikit/ui";
import { AlertTriangle, ShieldAlert, Clock, AlertCircle, ArrowUpRight } from "lucide-react";
import { CertificationsModal } from "./certifications-modal";

// ── Color configs per accent style ──
const ACCENT_CONFIG = {
  red: {
    iconColor: "rgb(220 38 38)",
    valueColor: "rgb(220 38 38)",
    badgeBg: "rgb(220 38 38 / 0.08)",
    badgeText: "rgb(185 28 28)",
    glow: "rgb(220 38 38 / 0.15)",
    borderAccent: "rgb(220 38 38 / 0.3)",
    gradientFrom: "rgb(220 38 38 / 0.06)",
    barColor: "rgb(220 38 38)",
  },
  amber: {
    iconColor: "rgb(var(--accent-600))",
    valueColor: "rgb(var(--accent-600))",
    badgeBg: "rgb(var(--accent-500) / 0.08)",
    badgeText: "rgb(var(--accent-700))",
    glow: "rgb(var(--accent-500) / 0.15)",
    borderAccent: "rgb(var(--accent-500) / 0.3)",
    gradientFrom: "rgb(var(--accent-500) / 0.05)",
    barColor: "rgb(var(--accent-600))",
  },
  blue: {
    iconColor: "rgb(37 99 235)",
    valueColor: "rgb(37 99 235)",
    badgeBg: "rgb(37 99 235 / 0.08)",
    badgeText: "rgb(29 78 216)",
    glow: "rgb(37 99 235 / 0.15)",
    borderAccent: "rgb(37 99 235 / 0.3)",
    gradientFrom: "rgb(37 99 235 / 0.05)",
    barColor: "rgb(37 99 235)",
  },
  neutral: {
    iconColor: "rgb(var(--text-muted))",
    valueColor: "rgb(var(--text))",
    badgeBg: "rgb(var(--surface-raised))",
    badgeText: "rgb(var(--text-secondary))",
    glow: "rgb(var(--border))",
    borderAccent: "rgb(var(--border-strong))",
    gradientFrom: "transparent",
    barColor: "rgb(var(--text-muted))",
  },
} as const;

// ── Single KPI card ──
function KpiCard({
  label,
  value,
  sub,
  linkLabel,
  href,
  onClick,
  accentStyle,
  icon: Icon,
  animationDelay,
  maxValue = 20,
}: {
  label: string;
  value: number | string;
  sub: string;
  linkLabel: string;
  href?: string;
  onClick?: () => void;
  accentStyle: "red" | "amber" | "blue" | "neutral";
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  animationDelay: string;
  maxValue?: number;
}) {
  const [hovered, setHovered] = useState(false);
  const c = ACCENT_CONFIG[accentStyle];
  const numericValue = typeof value === "number" ? value : 0;
  const fillPercent = Math.min((numericValue / maxValue) * 100, 100);

  const inner = (
    <div
      className="group relative rounded-xl flex flex-col gap-0 cursor-pointer overflow-hidden animate-slide-up"
      style={{
        backgroundColor: "rgb(var(--surface))",
        border: `1px solid ${hovered ? c.borderAccent : "rgb(var(--border))"}`,
        animationDelay,
        transition: "border-color 200ms ease, box-shadow 200ms ease, transform 200ms ease",
        boxShadow: hovered
          ? `var(--shadow-md), 0 0 0 1px ${c.borderAccent}`
          : "var(--shadow-sm)",
        transform: hovered ? "translateY(-2px)" : "translateY(0)",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Top gradient wash */}
      <div
        className="absolute inset-x-0 top-0 h-20 pointer-events-none"
        style={{
          background: `linear-gradient(180deg, ${c.gradientFrom} 0%, transparent 100%)`,
          opacity: hovered ? 1 : 0.6,
          transition: "opacity 200ms ease",
        }}
        aria-hidden="true"
      />

      {/* Left accent stripe */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px] rounded-r kpi-stripe"
        style={{ backgroundColor: c.iconColor }}
        aria-hidden="true"
      />

      {/* Content */}
      <div className="relative flex flex-col gap-4 p-5 pl-6">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <span
            className="text-[10px] font-mono font-semibold uppercase tracking-[0.1em] leading-tight pt-0.5"
            style={{ color: "rgb(var(--text-muted))" }}
          >
            {label}
          </span>

          {/* Icon box */}
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all duration-[200ms]"
            style={{
              backgroundColor: c.badgeBg,
              transform: hovered ? "scale(1.1) rotate(3deg)" : "scale(1) rotate(0deg)",
            }}
          >
            <Icon className="w-4 h-4" style={{ color: c.iconColor }} />
          </div>
        </div>

        {/* Value */}
        <div>
          <p
            className="text-[2.5rem] font-bold font-mono tabular-nums leading-none animate-tick-in"
            style={{ color: c.valueColor, animationDelay }}
          >
            {value}
          </p>
          <p
            className="text-[11px] mt-1.5 leading-snug"
            style={{ color: "rgb(var(--text-muted))" }}
          >
            {sub}
          </p>
        </div>

        {/* Progress bar */}
        <div
          className="h-1 w-full rounded-full overflow-hidden"
          style={{ backgroundColor: "rgb(var(--surface-raised))" }}
        >
          <div
            className="h-full rounded-full risk-bar-fill"
            style={{
              width: `${fillPercent}%`,
              backgroundColor: c.barColor,
              animationDelay,
            }}
          />
        </div>

        {/* Footer link */}
        <div
          className="flex items-center justify-end gap-1 pt-1"
          style={{ borderTop: "1px solid rgb(var(--border))" }}
        >
          <span
            className="text-[11px] font-semibold transition-colors duration-[120ms] flex items-center gap-0.5"
            style={{ color: c.iconColor }}
          >
            {linkLabel}
            <ArrowUpRight
              className="w-3 h-3 transition-transform duration-[120ms]"
              style={{ transform: hovered ? "translate(1px, -1px)" : "translate(0, 0)" }}
            />
          </span>
        </div>
      </div>
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        prefetch={true}
        className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 rounded-xl"
      >
        {inner}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 rounded-xl"
    >
      {inner}
    </button>
  );
}

export function KpiCards() {
  const { t, locale } = useT();
  const asOf = today();
  const [certModalOpen, setCertModalOpen] = useState(false);
  const [certFilter, setCertFilter] = useState<"ALL" | "EXPIRING" | "OVERDUE">("ALL");

  const { data: coverage, isLoading: isCoverageLoading } = useQuery<CoveragePayload>({
    queryKey: ["coverage", asOf],
    queryFn: async () => {
      const res = await fetch(`/api/coverage?asOf=${asOf}`);
      if (!res.ok) throw new Error("Failed to load coverage");
      const json = await res.json();
      return json.data;
    },
  });

  const { data: alerts, isLoading: isAlertsLoading } = useQuery<AlertItem[]>({
    queryKey: ["alerts"],
    queryFn: async () => {
      const res = await fetch("/api/alerts?status=open");
      if (!res.ok) throw new Error("Failed to load alerts");
      const json = await res.json();
      return json.data;
    },
  });

  if (isCoverageLoading || isAlertsLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-xl h-44 animate-pulse"
            style={{
              backgroundColor: "rgb(var(--surface))",
              border: "1px solid rgb(var(--border))",
            }}
          >
            <div className="p-5 pl-6 space-y-4">
              <div className="flex justify-between">
                <div className="h-2.5 w-20 rounded animate-shimmer" />
                <div
                  className="w-8 h-8 rounded-lg animate-shimmer"
                  style={{ backgroundColor: "rgb(var(--surface-raised))" }}
                />
              </div>
              <div className="h-10 w-16 rounded animate-shimmer" />
              <div className="h-1 w-full rounded-full animate-shimmer" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const redCellsCount = coverage?.cells
    ? coverage.cells.filter((c) => c.status === "RED").length
    : 5;
  const spofCount = coverage?.totals
    ? coverage.totals.filter((t) => t.isSpof).length
    : 1;
  const expiringCount = Array.isArray(alerts)
    ? alerts.filter((a) => a.daysRemaining >= 0 && a.daysRemaining <= 30).length
    : 5;
  const overdueCount = Array.isArray(alerts)
    ? alerts.filter((a) => a.daysRemaining < 0).length
    : 1;

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label={t("dashboard.kpi.redCells")}
          value={redCellsCount}
          sub={locale === "hi" ? "प्रति शिफ्ट 2 से कम ऑपरेटर" : "Fewer than 2 qualified operators"}
          linkLabel={locale === "hi" ? "गैप रिपोर्ट" : "Gap Report"}
          href="/reports/gaps"
          accentStyle="red"
          icon={AlertTriangle}
          animationDelay="0ms"
          maxValue={Math.max(redCellsCount, 10)}
        />
        <KpiCard
          label={t("dashboard.kpi.spofMachines")}
          value={spofCount}
          sub={locale === "hi" ? "केवल 1 बैकअप उपलब्ध" : "Single point of failure"}
          linkLabel={locale === "hi" ? "मशीन विवरण" : "SPOF Report"}
          href="/reports/gaps"
          accentStyle="amber"
          icon={ShieldAlert}
          animationDelay="60ms"
          maxValue={Math.max(spofCount, 5)}
        />
        <KpiCard
          label={t("dashboard.kpi.expiringSoon")}
          value={expiringCount}
          sub={locale === "hi" ? "30 दिनों के भीतर समाप्त" : "Within 30-day window"}
          linkLabel={locale === "hi" ? "प्रमाणन विवरण" : "Certifications"}
          onClick={() => {
            setCertFilter("EXPIRING");
            setCertModalOpen(true);
          }}
          accentStyle="blue"
          icon={Clock}
          animationDelay="120ms"
          maxValue={Math.max(expiringCount, 10)}
        />
        <KpiCard
          label={t("dashboard.kpi.overdueCerts")}
          value={overdueCount}
          sub={locale === "hi" ? "अमान्य प्रमाण पत्र" : "Past expiration date"}
          linkLabel={locale === "hi" ? "प्रमाणन विवरण" : "Certifications"}
          onClick={() => {
            setCertFilter("OVERDUE");
            setCertModalOpen(true);
          }}
          accentStyle="red"
          icon={AlertCircle}
          animationDelay="180ms"
          maxValue={Math.max(overdueCount, 5)}
        />
      </div>

      <CertificationsModal
        open={certModalOpen}
        onOpenChange={setCertModalOpen}
        defaultFilter={certFilter}
      />
    </>
  );
}
