"use client";

import React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useT } from "@/lib/i18n/useT";
import { today } from "@/lib/domain/rules";
import { CoveragePayload, CoverageCellView } from "@/lib/domain/coverage";
import { riskScore } from "@/lib/domain/risk";
import { Badge, Skeleton } from "@quikit/ui";
import { ShieldAlert, ArrowRight, Flame } from "lucide-react";

export function TopRisksCard() {
  const { t, locale } = useT();
  const asOf = today();

  const { data: coverage, isLoading } = useQuery<CoveragePayload>({
    queryKey: ["coverage", asOf],
    queryFn: async () => {
      const res = await fetch(`/api/coverage?asOf=${asOf}`);
      if (!res.ok) throw new Error("Failed to load coverage");
      const json = await res.json();
      return json.data;
    },
  });

  if (isLoading || !coverage) {
    return (
      <div
        className="rounded-xl overflow-hidden shadow-token-sm"
        style={{
          backgroundColor: "rgb(var(--surface))",
          border: "1px solid rgb(var(--border))",
        }}
      >
        <div className="p-5 space-y-3" style={{ borderBottom: "1px solid rgb(var(--border))" }}>
          <Skeleton className="h-5 w-44 rounded-lg" />
          <Skeleton className="h-3.5 w-52 rounded" />
        </div>
        <div className="p-4 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl p-4 space-y-3"
              style={{ border: "1px solid rgb(var(--border))", backgroundColor: "rgb(var(--surface-raised))" }}>
              <div className="flex justify-between">
                <Skeleton className="h-4 w-28 rounded" />
                <Skeleton className="h-6 w-12 rounded" />
              </div>
              <Skeleton className="h-1.5 w-full rounded-full" />
              <div className="flex gap-1.5">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const { skills, shifts, cells } = coverage;

  const cellMap = new Map<string, CoverageCellView>();
  for (const c of cells) {
    cellMap.set(`${c.skillId}_${c.shiftId}`, c);
  }

  const scoredMachines = skills.map((skill) => {
    const skillCells = shifts
      .map((shift) => cellMap.get(`${skill.id}_${shift.id}`))
      .filter((c): c is CoverageCellView => Boolean(c));

    const risk = riskScore(skill.criticality, skillCells);
    return { skill, risk };
  });

  scoredMachines.sort((a, b) => {
    if (b.risk.score !== a.risk.score) return b.risk.score - a.risk.score;
    if (b.risk.weighted !== a.risk.weighted) return b.risk.weighted - a.risk.weighted;
    const aTot =
      coverage.totals?.find((t) => t.skillId === a.skill.id)?.totalQualified ?? 0;
    const bTot =
      coverage.totals?.find((t) => t.skillId === b.skill.id)?.totalQualified ?? 0;
    return aTot - bTot;
  });

  const topRisks = scoredMachines.slice(0, 3);

  return (
    <div
      className="rounded-xl shadow-token-sm flex flex-col overflow-hidden"
      style={{
        backgroundColor: "rgb(var(--surface))",
        border: "1px solid rgb(var(--border))",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between p-5"
        style={{ borderBottom: "1px solid rgb(var(--border))" }}
      >
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div
              className="w-6 h-6 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: "rgb(220 38 38 / 0.1)" }}
            >
              <ShieldAlert className="w-3.5 h-3.5" style={{ color: "rgb(220 38 38)" }} />
            </div>
            <h2
              className="text-sm font-bold"
              style={{ color: "rgb(var(--text))" }}
            >
              {t("dashboard.topRisksTitle")}
            </h2>
          </div>
          <p
            className="text-xs"
            style={{ color: "rgb(var(--text-muted))" }}
          >
            Multi-factor operational risk score (0–100)
          </p>
        </div>

        <Link
          href="/reports/gaps"
          className="text-xs font-medium inline-flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded px-2.5 py-1.5 rounded-lg transition-colors duration-[120ms]"
          style={{
            color: "rgb(var(--accent-600))",
            backgroundColor: "rgb(var(--accent-500) / 0.08)",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor = "rgb(var(--accent-500) / 0.15)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor = "rgb(var(--accent-500) / 0.08)";
          }}
        >
          {t("nav.gaps")} <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Risk list */}
      <div className="p-4 flex-1 space-y-3">
        {topRisks.map(({ skill, risk }, idx) => {
          const displayName =
            locale === "hi" && skill.nameHi ? skill.nameHi : skill.name;

          const isHighRisk = risk.score >= 70;
          const isMidRisk = risk.score >= 30;

          const riskColor = isHighRisk
            ? "rgb(220 38 38)"
            : isMidRisk
            ? "rgb(var(--accent-600))"
            : "rgb(var(--text-muted))";

          const riskBg = isHighRisk
            ? "rgb(220 38 38 / 0.06)"
            : isMidRisk
            ? "rgb(var(--accent-500) / 0.05)"
            : "transparent";

          const rankColors = ["rgb(220 38 38)", "rgb(var(--accent-600))", "rgb(37 99 235)"];

          return (
            <div
              key={skill.id}
              className="rounded-xl px-4 py-3.5 transition-all duration-[120ms] group"
              style={{
                border: "1px solid rgb(var(--border))",
                backgroundColor: riskBg,
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor =
                  isHighRisk ? "rgb(220 38 38 / 0.07)" : "rgb(var(--surface-raised))";
                (e.currentTarget as HTMLElement).style.borderColor = isHighRisk
                  ? "rgb(220 38 38 / 0.25)"
                  : isMidRisk
                  ? "rgb(var(--accent-500) / 0.25)"
                  : "rgb(var(--border-strong))";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = riskBg;
                (e.currentTarget as HTMLElement).style.borderColor = "rgb(var(--border))";
              }}
            >
              {/* Top row */}
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  {/* Rank badge */}
                  <div
                    className="w-5 h-5 rounded-md flex items-center justify-center shrink-0 text-[9px] font-bold"
                    style={{
                      backgroundColor: `${rankColors[idx]} / 0.1`,
                      color: rankColors[idx],
                      border: `1px solid ${rankColors[idx]} / 0.2`,
                    }}
                  >
                    {idx + 1}
                  </div>

                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className="font-bold font-mono text-sm shrink-0"
                      style={{ color: "rgb(var(--text))" }}
                    >
                      {skill.code}
                    </span>
                    <span
                      className="text-xs truncate"
                      style={{ color: "rgb(var(--text-secondary))" }}
                    >
                      {displayName}
                    </span>
                  </div>
                </div>

                {/* Risk score */}
                <div className="flex items-baseline gap-0.5 shrink-0">
                  {isHighRisk && (
                    <Flame className="w-3.5 h-3.5 mb-0.5 shrink-0" style={{ color: riskColor }} />
                  )}
                  <span
                    className="text-xl font-bold font-mono tabular-nums leading-none"
                    style={{ color: riskColor }}
                  >
                    {risk.score}
                  </span>
                  <span
                    className="text-[10px] font-mono"
                    style={{ color: "rgb(var(--text-muted))" }}
                  >
                    /100
                  </span>
                </div>
              </div>

              {/* Score bar */}
              <div
                className="h-1.5 w-full rounded-full mb-2.5 overflow-hidden"
                style={{ backgroundColor: "rgb(var(--surface-raised))" }}
              >
                <div
                  className="h-full rounded-full risk-bar-fill"
                  style={{
                    width: `${risk.score}%`,
                    backgroundColor: riskColor,
                  }}
                />
              </div>

              {/* Breakdown tags */}
              <div className="flex flex-wrap gap-1.5">
                {risk.breakdown
                  .filter((b) => b.value > 0)
                  .map((b, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium"
                      style={{
                        backgroundColor: "rgb(var(--surface-raised))",
                        color: "rgb(var(--text-muted))",
                        border: "1px solid rgb(var(--border))",
                      }}
                    >
                      {b.detail}
                    </span>
                  ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
