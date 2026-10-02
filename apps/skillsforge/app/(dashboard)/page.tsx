"use client";

import React from "react";
import { useT } from "@/lib/i18n/useT";
import { KpiCards } from "@/components/kpi-cards";
import { CoverageHeatmap } from "@/components/heatmap";
import { AlertPanel } from "@/components/alert-panel";
import { TopRisksCard } from "@/components/top-risks-card";

export default function DashboardPage() {
  const { t } = useT();

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
          {t("dashboard.title")}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {t("dashboard.subtitle")}
        </p>
      </div>

      {/* Top Dynamic KPI Cards */}
      <KpiCards />

      {/* Main Section: Coverage Heatmap with Forecast Slider */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            {t("heatmap.title")}
          </h2>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {t("heatmap.subtitle")}
          </span>
        </div>
        <CoverageHeatmap />
      </div>

      {/* Bottom Section: Alerts & Top Risks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AlertPanel />
        <TopRisksCard />
      </div>
    </div>
  );
}
