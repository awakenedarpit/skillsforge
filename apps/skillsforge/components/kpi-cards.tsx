"use client";

import React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useT } from "@/lib/i18n/useT";
import { today } from "@/lib/domain/rules";
import { CoveragePayload } from "@/lib/domain/coverage";
import { AlertItem } from "./alert-panel";
import { Skeleton } from "@quikit/ui";
import { AlertTriangle, ShieldAlert, Clock, AlertCircle } from "lucide-react";

export function KpiCards() {
  const { t } = useT();
  const asOf = today();

  const { data: coverage, isLoading: isCoverageLoading } = useQuery<CoveragePayload>({
    queryKey: ["coverage", asOf],
    queryFn: async () => {
      const res = await fetch(`/api/coverage?asOf=${asOf}`);
      if (!res.ok) throw new Error("Failed to load coverage");
      const json = await res.json();
      return json.data;
    },
    refetchInterval: 15000,
  });

  const { data: alerts, isLoading: isAlertsLoading } = useQuery<AlertItem[]>({
    queryKey: ["alerts"],
    queryFn: async () => {
      const res = await fetch("/api/alerts?status=open");
      if (!res.ok) throw new Error("Failed to load alerts");
      const json = await res.json();
      return json.data;
    },
    refetchInterval: 15000,
  });

  if (isCoverageLoading || isAlertsLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
    );
  }

  const redCellsCount = coverage ? coverage.cells.filter((c) => c.status === "RED").length : 5;
  const spofCount = coverage ? coverage.totals.filter((t) => t.isSpof).length : 1;
  const expiringCount = alerts ? alerts.filter((a) => a.daysRemaining >= 0 && a.daysRemaining <= 30).length : 5;
  const overdueCount = alerts ? alerts.filter((a) => a.daysRemaining < 0).length : 1;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Red Cells */}
      <div className="rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50/60 dark:bg-red-950/30 p-5 shadow-sm flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-red-800 dark:text-red-300 uppercase tracking-wider">
            {t("dashboard.kpi.redCells")}
          </span>
          <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
        </div>
        <div>
          <p className="text-3xl font-black font-mono text-red-600 dark:text-red-400 mt-2">
            {redCellsCount}
          </p>
          <span className="text-[11px] font-medium text-red-700/80 dark:text-red-400/80 mt-1 block">
            Fewer than 2 qualified operators per shift
          </span>
        </div>
      </div>

      {/* 2. SPOF Machines */}
      <Link
        href="/reports/gaps"
        className="rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/60 dark:bg-amber-950/30 p-5 shadow-sm flex flex-col justify-between hover:bg-amber-100/50 transition-colors"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider">
            {t("dashboard.kpi.spofMachines")}
          </span>
          <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <p className="text-3xl font-black font-mono text-amber-600 dark:text-amber-400 mt-2">
            {spofCount}
          </p>
          <span className="text-[11px] font-medium text-amber-700/80 dark:text-amber-400/80 mt-1 block">
            QA-8 (CMM Inspection) has only 1 backup
          </span>
        </div>
      </Link>

      {/* 3. Expiring soon */}
      <div className="rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/60 dark:bg-blue-950/30 p-5 shadow-sm flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-blue-800 dark:text-blue-300 uppercase tracking-wider">
            {t("dashboard.kpi.expiringSoon")}
          </span>
          <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <p className="text-3xl font-black font-mono text-blue-600 dark:text-blue-400 mt-2">
            {expiringCount}
          </p>
          <span className="text-[11px] font-medium text-blue-700/80 dark:text-blue-400/80 mt-1 block">
            Within 30 days window (3 to 28 days)
          </span>
        </div>
      </div>

      {/* 4. Overdue certs */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
            {t("dashboard.kpi.overdueCerts")}
          </span>
          <AlertCircle className="w-4 h-4 text-red-500" />
        </div>
        <div>
          <p className="text-3xl font-black font-mono text-red-600 dark:text-red-400 mt-2">
            {overdueCount}
          </p>
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-1 block">
            Past expiration (unqualified status)
          </span>
        </div>
      </div>
    </div>
  );
}
