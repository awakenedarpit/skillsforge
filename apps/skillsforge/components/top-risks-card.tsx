"use client";

import React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useT } from "@/lib/i18n/useT";
import { today } from "@/lib/domain/rules";
import { CoveragePayload, CoverageCellView } from "@/lib/domain/coverage";
import { riskScore } from "@/lib/domain/risk";
import { Badge, Skeleton } from "@quikit/ui";
import { ShieldAlert, ArrowRight, AlertTriangle } from "lucide-react";

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
    refetchInterval: 15000,
  });

  if (isLoading || !coverage) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-3">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
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
    return {
      skill,
      risk,
    };
  });

  scoredMachines.sort((a, b) => {
    if (b.risk.score !== a.risk.score) return b.risk.score - a.risk.score;
    if (b.risk.weighted !== a.risk.weighted) return b.risk.weighted - a.risk.weighted;
    const aTot = coverage.totals.find((t) => t.skillId === a.skill.id)?.totalQualified ?? 0;
    const bTot = coverage.totals.find((t) => t.skillId === b.skill.id)?.totalQualified ?? 0;
    return aTot - bTot;
  });
  const topRisks = scoredMachines.slice(0, 3);

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 flex flex-col p-5">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800/80">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-red-600 dark:text-red-400" />
            {t("dashboard.topRisksTitle")}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Ranked by explainable multi-factor operational risk score (0-100)
          </p>
        </div>

        <Link
          href="/reports/gaps"
          className="text-xs text-accent-600 hover:text-accent-800 dark:text-accent-400 font-medium inline-flex items-center gap-1"
        >
          {t("nav.gaps")} <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="divide-y divide-slate-100 dark:divide-slate-800/60 pt-2 flex-1">
        {topRisks.map(({ skill, risk }, idx) => {
          const displayName =
            locale === "hi" && skill.nameHi ? skill.nameHi : skill.name;

          return (
            <div key={skill.id} className="py-3 flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-sm text-slate-400 font-mono">
                    #{idx + 1}
                  </span>
                  <span className="font-bold font-mono text-sm text-slate-900 dark:text-slate-100">
                    {skill.code}
                  </span>
                  <span className="text-xs text-slate-600 dark:text-slate-300">
                    {displayName}
                  </span>
                </div>

                <Badge
                  variant={
                    risk.score >= 70 ? "red" : risk.score >= 30 ? "amber" : "neutral"
                  }
                >
                  Risk {risk.score}/100
                </Badge>
              </div>

              {/* Breakdown tags */}
              <div className="flex flex-wrap gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                {risk.breakdown
                  .filter((b) => b.value > 0)
                  .map((b, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300"
                    >
                      <AlertTriangle className="w-3 h-3 text-amber-500" />
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
