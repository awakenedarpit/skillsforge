"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useT } from "@/lib/i18n/useT";
import { CoverageHeatmap } from "@/components/heatmap";
import { Button, Badge, Skeleton } from "@quikit/ui";
import {
  UserMinus,
  AlertTriangle,
  ArrowRight,
  TrendingDown,
  GraduationCap,
  ShieldAlert,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";

interface OperatorOption {
  id: string;
  name: string;
  employeeCode?: string;
  shiftId: string;
}

interface SkillOption {
  id: string;
  code: string;
  name: string;
  nameHi?: string;
}

export default function SimulatorPage() {
  const { t, locale } = useT();
  const [selectedOperatorId, setSelectedOperatorId] = useState<string>("op-001");
  const [selectedSkillId, setSelectedSkillId] = useState<string>("");

  // Fetch operators list
  const { data: operators = [], isLoading: isLoadingOps } = useQuery<OperatorOption[]>({
    queryKey: ["operators-list"],
    queryFn: async () => {
      const res = await fetch("/api/operators");
      if (!res.ok) throw new Error("Failed to load operators");
      const json = await res.json();
      return json.data;
    },
  });

  // Fetch skills list
  const { data: skills = [], isLoading: isLoadingSkills } = useQuery<SkillOption[]>({
    queryKey: ["skills-list"],
    queryFn: async () => {
      const res = await fetch("/api/skills");
      if (!res.ok) throw new Error("Failed to load skills");
      const json = await res.json();
      return json.data;
    },
  });

  // Run simulation query
  const simUrl = `/api/simulate/resignation?operatorId=${selectedOperatorId}${
    selectedSkillId ? `&skillId=${selectedSkillId}` : ""
  }`;

  const { data: simData, isLoading: isLoadingSim } = useQuery({
    queryKey: ["simulation", selectedOperatorId, selectedSkillId],
    queryFn: async () => {
      const res = await fetch(simUrl);
      if (!res.ok) throw new Error("Failed to run simulation");
      const json = await res.json();
      return json.data;
    },
    enabled: Boolean(selectedOperatorId),
  });

  const selectedOp = operators.find((op) => op.id === selectedOperatorId);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
          <UserMinus className="w-7 h-7 text-red-600 dark:text-red-400" />
          {t("simulator.title")}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {t("simulator.subtitle")}
        </p>
      </div>

      {/* Control Bar: Operator & Skill Selection */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          {/* Operator Select */}
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              {t("simulator.selectOperator")}
            </label>
            <select
              value={selectedOperatorId}
              onChange={(e) => setSelectedOperatorId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 shadow-sm focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            >
              {isLoadingOps ? (
                <option value="">Loading operators...</option>
              ) : (
                operators.map((op) => (
                  <option key={op.id} value={op.id}>
                    {op.name} ({op.employeeCode || op.id}) - Shift {op.shiftId?.toUpperCase()}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Skill Filter (Optional) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              {t("common.machine")} ({locale === "hi" ? "वैकल्पिक" : "Optional"})
            </label>
            <select
              value={selectedSkillId}
              onChange={(e) => setSelectedSkillId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 shadow-sm focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            >
              <option value="">
                {locale === "hi"
                  ? "सभी मशीनें (पूर्ण त्यागपत्र)"
                  : "All Machines (Full Resignation)"}
              </option>
              {skills.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code} - {locale === "hi" && s.nameHi ? s.nameHi : s.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Simulation Result */}
      {isLoadingSim || !simData ? (
        <div className="space-y-4">
          <Skeleton className="h-28 w-full rounded-xl" />
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <Skeleton className="h-96 w-full rounded-xl" />
            <Skeleton className="h-96 w-full rounded-xl" />
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Impact Summary Banner */}
          <div className="rounded-xl border border-red-200 bg-gradient-to-r from-red-50 to-amber-50 p-6 shadow-sm dark:border-red-900/50 dark:from-red-950/30 dark:to-amber-950/20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-red-700 dark:text-red-400 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4" />
                  {t("simulator.summary")}
                </span>
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                  {t("simulator.impactText", {
                    name: selectedOp?.name || simData.operator.name,
                    count: simData.summary.newlyRedCount,
                  })}
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  {locale === "hi"
                    ? "यह सिमुलेशन केवल दृश्य प्रभाव दिखाता है और डेटाबेस को नहीं बदलता है।"
                    : "This simulation is read-only and does not modify the operational database."}
                </p>
              </div>

              {/* Action Button to Admin */}
              <Link href="/admin">
                <Button variant="outline" className="border-red-300 text-red-800 hover:bg-red-100 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/50 flex items-center gap-2">
                  <ExternalLink className="w-4 h-4" />
                  {t("simulator.takeAction")}
                </Button>
              </Link>
            </div>

            {/* Impact Metric Chips */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5 pt-5 border-t border-red-200/60 dark:border-red-900/40">
              <div className="bg-white/80 dark:bg-slate-900/80 rounded-lg p-3 border border-red-200 dark:border-red-900/50 flex items-center gap-3">
                <div className="p-2 rounded-md bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-lg font-bold text-red-600 dark:text-red-400">
                    {simData.summary.newlyRedCount}
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-400">
                    {t("simulator.newlyRedTitle")}
                  </div>
                </div>
              </div>

              <div className="bg-white/80 dark:bg-slate-900/80 rounded-lg p-3 border border-amber-200 dark:border-amber-900/50 flex items-center gap-3">
                <div className="p-2 rounded-md bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400">
                  <TrendingDown className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-lg font-bold text-amber-600 dark:text-amber-400">
                    {simData.summary.worsenedCount}
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-400">
                    {t("simulator.worsenedTitle")}
                  </div>
                </div>
              </div>

              <div className="bg-white/80 dark:bg-slate-900/80 rounded-lg p-3 border border-blue-200 dark:border-blue-900/50 flex items-center gap-3">
                <div className="p-2 rounded-md bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                    {simData.summary.lostTrainersCount}
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-400">
                    {t("simulator.lostTrainersTitle")}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Breakdown of Specific Vulnerabilities */}
          {(simData.newlyRed.length > 0 || simData.lostAllTrainers.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Newly Red List */}
              {simData.newlyRed.length > 0 && (
                <div className="rounded-xl border border-red-200 bg-white p-4 shadow-sm dark:border-red-900/50 dark:bg-slate-900">
                  <h3 className="text-sm font-bold text-red-700 dark:text-red-400 mb-3 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" />
                    {t("simulator.newlyRedTitle")} ({simData.newlyRed.length})
                  </h3>
                  <div className="space-y-2">
                    {simData.newlyRed.map((nr: any, idx: number) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2.5 rounded-lg bg-red-50/70 border border-red-100 text-xs dark:bg-red-950/20 dark:border-red-900/40"
                      >
                        <div>
                          <span className="font-bold font-mono text-slate-900 dark:text-slate-100 mr-2">
                            {nr.skill?.code}
                          </span>
                          <span className="text-slate-600 dark:text-slate-400">
                            {locale === "hi" && nr.skill?.nameHi ? nr.skill.nameHi : nr.skill?.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="neutral">Shift {nr.shift?.code || nr.shiftId}</Badge>
                          <span className="text-red-600 font-bold font-mono">
                            {nr.beforeCount} → {nr.afterCount} qualified
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Lost All Trainers List */}
              {simData.lostAllTrainers.length > 0 && (
                <div className="rounded-xl border border-blue-200 bg-white p-4 shadow-sm dark:border-blue-900/50 dark:bg-slate-900">
                  <h3 className="text-sm font-bold text-blue-700 dark:text-blue-400 mb-3 flex items-center gap-1.5">
                    <GraduationCap className="w-4 h-4" />
                    {t("simulator.lostTrainersTitle")} ({simData.lostAllTrainers.length})
                  </h3>
                  <div className="space-y-2">
                    {simData.lostAllTrainers.map((s: any) => (
                      <div
                        key={s.id}
                        className="flex items-center justify-between p-2.5 rounded-lg bg-blue-50/70 border border-blue-100 text-xs dark:bg-blue-950/20 dark:border-blue-900/40"
                      >
                        <div>
                          <span className="font-bold font-mono text-slate-900 dark:text-slate-100 mr-2">
                            {s.code}
                          </span>
                          <span className="text-slate-600 dark:text-slate-400">
                            {locale === "hi" && s.nameHi ? s.nameHi : s.name}
                          </span>
                        </div>
                        <Badge variant="amber">0 Trainers Remaining</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Side-by-Side Heatmaps (Before vs After) */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 pt-2">
            {/* Before */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  {t("simulator.before")}
                </span>
                <Badge variant="neutral">Active Production Baseline</Badge>
              </div>
              <CoverageHeatmap
                overrideData={simData.before}
                compact={true}
                showForecastSlider={false}
              />
            </div>

            {/* After */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  {t("simulator.after")}
                </span>
                <Badge variant="red">Post-Departure Simulation</Badge>
              </div>
              <CoverageHeatmap
                overrideData={simData.after}
                compact={true}
                showForecastSlider={false}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
