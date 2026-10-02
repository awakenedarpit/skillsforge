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
  Users,
  Search,
  ArrowRightLeft,
  Check,
  AlertCircle,
  Sparkles,
  Clock,
  Calendar,
} from "lucide-react";
import type {
  CoveragePayload,
  ShiftCoverageForecastResult,
} from "@/lib/domain/coverage";

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

interface ReplacementAlternative {
  operatorId: string;
  name: string;
  employeeCode: string;
  shiftId: string;
  shiftCode: string;
  isSameShift: boolean;
  level: number;
  effectiveLevel: number;
  levelLabel: string;
  certifiedUntil: string | null;
  daysToExpiry: number | null;
  certStatus: "valid" | "expiring_soon" | "expired";
  recommendationTag: string;
}

interface SkillReplacementAnalysis {
  skillId: string;
  skillCode: string;
  skillName: string;
  skillNameHi?: string | null;
  lineKey: string;
  criticality: number;
  resigningOperatorLevel: number;
  resigningOperatorLevelLabel: string;
  sameShiftCount: number;
  totalQualifiedCount: number;
  status: "COVERED" | "CROSS_SHIFT_ONLY" | "CRITICAL_UNCOVERED";
  alternatives: ReplacementAlternative[];
  trainingCandidates: ReplacementAlternative[];
}

interface ReplacementSummary {
  affectedSkillsCount: number;
  coveredSameShiftCount: number;
  crossShiftOnlyCount: number;
  criticalUncoveredCount: number;
  totalAlternativesAvailable: number;
}

interface SimulationResult {
  asOf: string;
  operator: OperatorOption;
  skill: SkillOption | null;
  summary: {
    newlyRedCount: number;
    worsenedCount: number;
    lostTrainersCount: number;
    affectedSkillsCount?: number;
    coveredSameShiftCount?: number;
    crossShiftOnlyCount?: number;
    criticalUncoveredCount?: number;
    totalAlternativesAvailable?: number;
  };
  replacementSummary?: ReplacementSummary;
  replacements?: SkillReplacementAnalysis[];
  newlyRed: Array<{
    skillId: string;
    shiftId: string;
    beforeCount: number;
    afterCount: number;
    skill?: { code: string; name: string; nameHi?: string | null };
    shift?: { code: string };
  }>;
  worsened: Array<{
    skillId: string;
    shiftId: string;
    beforeStatus: string;
    afterStatus: string;
    beforeCount: number;
    afterCount: number;
    skill?: { code: string; name: string; nameHi?: string | null };
    shift?: { code: string };
  }>;
  lostAllTrainers: Array<{
    id: string;
    code: string;
    name: string;
    nameHi?: string | null;
  }>;
  before: CoveragePayload;
  after: CoveragePayload;
}

export default function SimulatorPage() {
  const { t, locale } = useT();
  const [activeTab, setActiveTab] = useState<"departure" | "forecast">("departure");
  const [horizon, setHorizon] = useState<number>(30);
  const [selectedOperatorId, setSelectedOperatorId] = useState<string>("op-001");
  const [selectedSkillId, setSelectedSkillId] = useState<string>("");
  const [replacementFilter, setReplacementFilter] = useState<"ALL" | "SAME_SHIFT" | "BOTTLENECK">("ALL");
  const [replacementSearch, setReplacementSearch] = useState<string>("");

  // Fetch forecast data
  const {
    data: forecastData,
    isLoading: isLoadingForecast,
    isError: isErrorForecast,
  } = useQuery<ShiftCoverageForecastResult>({
    queryKey: ["simulation-forecast", horizon],
    queryFn: async () => {
      const res = await fetch(`/api/simulate/forecast?horizon=${horizon}`);
      if (!res.ok) throw new Error("Failed to load coverage forecast");
      const json = await res.json();
      return json.data;
    },
    enabled: activeTab === "forecast",
  });

  // Fetch operators list
  const { data: operators = [], isLoading: isLoadingOps } = useQuery<OperatorOption[]>({
    queryKey: ["operators-list"],
    queryFn: async () => {
      const res = await fetch("/api/operators?limit=100");
      if (!res.ok) throw new Error("Failed to load operators");
      const json = await res.json();
      return json.data?.data || (Array.isArray(json.data) ? json.data : []);
    },
  });

  // Fetch skills list
  const { data: skills = [], isLoading: isLoadingSkills } = useQuery<SkillOption[]>({
    queryKey: ["skills-list"],
    queryFn: async () => {
      const res = await fetch("/api/skills?limit=100");
      if (!res.ok) throw new Error("Failed to load skills");
      const json = await res.json();
      return json.data?.data || (Array.isArray(json.data) ? json.data : []);
    },
  });

  // Default selection when operators list loads
  React.useEffect(() => {
    if (Array.isArray(operators) && operators.length > 0) {
      if (!selectedOperatorId || !operators.some((o) => o.id === selectedOperatorId)) {
        setSelectedOperatorId(operators[0].id);
      }
    }
  }, [operators, selectedOperatorId]);

  // Run simulation query
  const simUrl = `/api/simulate/resignation?operatorId=${selectedOperatorId}${
    selectedSkillId ? `&skillId=${selectedSkillId}` : ""
  }`;

  const { data: simData, isLoading: isLoadingSim, isError: isErrorSim } = useQuery<SimulationResult>({
    queryKey: ["simulation", selectedOperatorId, selectedSkillId],
    queryFn: async () => {
      const res = await fetch(simUrl);
      if (!res.ok) throw new Error("Failed to run simulation");
      const json = await res.json();
      return json.data;
    },
    enabled: Boolean(selectedOperatorId),
  });

  const selectedOp = Array.isArray(operators)
    ? operators.find((op) => op.id === selectedOperatorId)
    : undefined;

  const replacementsList: SkillReplacementAnalysis[] = simData?.replacements || [];
  const filteredReplacements = replacementsList.filter((item) => {
    const query = replacementSearch.trim().toLowerCase();
    const matchesSearch =
      query === "" ||
      item.skillCode.toLowerCase().includes(query) ||
      item.skillName.toLowerCase().includes(query) ||
      item.alternatives.some(
        (alt) =>
          alt.name.toLowerCase().includes(query) ||
          alt.employeeCode.toLowerCase().includes(query)
      );

    if (!matchesSearch) return false;

    if (replacementFilter === "SAME_SHIFT") {
      return item.status === "COVERED";
    }
    if (replacementFilter === "BOTTLENECK") {
      return item.status === "CRITICAL_UNCOVERED" || item.status === "CROSS_SHIFT_ONLY";
    }
    return true;
  });

  const replacementSummary = simData?.replacementSummary || {
    affectedSkillsCount: replacementsList.length,
    coveredSameShiftCount: replacementsList.filter((r) => r.status === "COVERED").length,
    crossShiftOnlyCount: replacementsList.filter((r) => r.status === "CROSS_SHIFT_ONLY").length,
    criticalUncoveredCount: replacementsList.filter((r) => r.status === "CRITICAL_UNCOVERED").length,
    totalAlternativesAvailable: replacementsList.reduce((sum, r) => sum + r.totalQualifiedCount, 0),
  };

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

      {/* Mode Switcher Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("departure")}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === "departure"
              ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm"
              : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          }`}
        >
          <UserMinus className="w-4 h-4" />
          {t("simulator.tabDeparture")}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("forecast")}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === "forecast"
              ? "bg-blue-600 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          }`}
        >
          <Clock className="w-4 h-4" />
          {t("simulator.tabForecast")}
        </button>
      </div>

      {activeTab === "forecast" ? (
        <div className="space-y-6">
          {/* Horizon Selector and Controls */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
                  {t("simulator.horizon")}
                </span>
                <div className="flex items-center gap-2" data-testid="horizon-selector">
                  {[30, 60, 90].map((days) => (
                    <button
                      key={days}
                      type="button"
                      data-testid={`horizon-${days}`}
                      onClick={() => setHorizon(days)}
                      className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                        horizon === days
                          ? "bg-blue-600 text-white shadow-sm"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                      }`}
                    >
                      {t(`simulator.days${days}`)}
                    </button>
                  ))}
                </div>
              </div>

              {forecastData?.projectedDate && (
                <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700">
                  <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>
                    {t("simulator.projectedDate")}:{" "}
                    <strong className="text-slate-900 dark:text-slate-100 font-mono">
                      {forecastData.projectedDate}
                    </strong>
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Loading or Error State */}
          {isErrorForecast ? (
            <div className="p-8 text-center rounded-xl border border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-400">
              <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
              <p className="font-bold">{t("common.error")}</p>
              <p className="text-sm">Unable to compute shift coverage forecast.</p>
            </div>
          ) : isLoadingForecast || !forecastData ? (
            <div className="space-y-4">
              <Skeleton className="h-28 w-full rounded-xl" />
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <Skeleton className="h-96 w-full rounded-xl" />
                <Skeleton className="h-96 w-full rounded-xl" />
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Forecast Summary Metrics */}
              <div className="rounded-xl border border-slate-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-6 shadow-sm dark:border-slate-800 dark:from-slate-900 dark:to-slate-850">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
                      <Clock className="w-4 h-4" />
                      {t("simulator.forecastSummary")}
                    </span>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                      {forecastData.summary.totalDropsBelowMinimum > 0
                        ? `${forecastData.summary.totalDropsBelowMinimum} workstation/shift cells drop below safe coverage within ${horizon} days`
                        : `Safe coverage maintained across all machines for the next ${horizon} days`}
                    </h2>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-blue-200/60 dark:border-slate-700">
                  <div className="bg-white/80 dark:bg-slate-900/80 rounded-lg p-3 border border-red-200 dark:border-red-900/50">
                    <div className="text-lg font-bold text-red-600 dark:text-red-400">
                      {forecastData.summary.totalDropsBelowMinimum}
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-400">
                      {t("simulator.criticalDropsCount")}
                    </div>
                  </div>

                  <div className="bg-white/80 dark:bg-slate-900/80 rounded-lg p-3 border border-amber-200 dark:border-amber-900/50">
                    <div className="text-lg font-bold text-amber-600 dark:text-amber-400">
                      {forecastData.summary.totalWorsened}
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-400">
                      {t("simulator.worsenedTitle")}
                    </div>
                  </div>

                  <div className="bg-white/80 dark:bg-slate-900/80 rounded-lg p-3 border border-slate-200 dark:border-slate-800">
                    <div className="text-lg font-bold text-slate-900 dark:text-slate-100">
                      {forecastData.summary.skillsAffected}
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-400">
                      {t("simulator.skillsAtRisk")}
                    </div>
                  </div>

                  <div className="bg-white/80 dark:bg-slate-900/80 rounded-lg p-3 border border-slate-200 dark:border-slate-800">
                    <div className="text-lg font-bold text-slate-900 dark:text-slate-100">
                      {forecastData.summary.shiftsAffected}
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-400">
                      {t("simulator.shiftsAtRisk")}
                    </div>
                  </div>
                </div>
              </div>

              {/* Drops Below Minimum Highlight Section */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="p-1.5 rounded-lg bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                      {t("simulator.dropsBelowMinimum")}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {t("simulator.dropsBelowMinimumDesc")}
                    </p>
                  </div>
                </div>

                {forecastData.dropsBelowMinimum.length === 0 ? (
                  <div className="p-8 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-500 text-xs">
                    <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-600" />
                    {t("simulator.noDropsFound")}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {forecastData.dropsBelowMinimum.map((drop, idx) => (
                      <div
                        key={`${drop.skillId}_${drop.shiftId}_${idx}`}
                        className="p-4 rounded-xl border border-red-200 bg-red-50/30 dark:border-red-900/50 dark:bg-red-950/10 space-y-2.5"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-mono font-bold text-xs bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 mr-2">
                              {drop.skillCode}
                            </span>
                            <span className="font-bold text-xs text-slate-900 dark:text-slate-100">
                              {locale === "hi" && drop.skillNameHi ? drop.skillNameHi : drop.skillName}
                            </span>
                          </div>
                          <Badge variant="neutral">Shift {drop.shiftCode}</Badge>
                        </div>

                        <div className="flex items-center justify-between text-xs pt-1 border-t border-red-100 dark:border-red-900/40">
                          <span className="text-slate-600 dark:text-slate-400">
                            {t("simulator.currentQualified")}: <strong>{drop.currentCount}</strong>
                          </span>
                          <span className="text-red-600 font-bold">
                            {t("simulator.projectedQualified")}: {drop.projectedCount} (CRITICAL)
                          </span>
                        </div>

                        {drop.expiringOperators.length > 0 && (
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 bg-white/70 dark:bg-slate-900/70 p-2 rounded-lg border border-red-100 dark:border-red-900/30">
                            <span className="font-semibold text-red-700 dark:text-red-400 block mb-1">
                              {t("simulator.expiringOperators")}:
                            </span>
                            {drop.expiringOperators.map((op) => (
                              <div key={op.id} className="flex items-center justify-between">
                                <span>{op.name} (L{op.level})</span>
                                <span className="font-mono">{op.certifiedUntil || "N/A"}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Side-by-Side Heatmaps */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 pt-2">
                {/* Baseline */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      {t("simulator.currentHeatmap")}
                    </span>
                    <Badge variant="neutral">Baseline (Today)</Badge>
                  </div>
                  <CoverageHeatmap
                    overrideData={forecastData.currentCoverage}
                    compact={true}
                    showForecastSlider={false}
                  />
                </div>

                {/* Projected */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-blue-600 dark:text-blue-400 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-600" />
                      {t("simulator.viewProjectedHeatmap")} (+{horizon}d)
                    </span>
                    <Badge variant="blue">Projected Horizon</Badge>
                  </div>
                  <CoverageHeatmap
                    overrideData={forecastData.projectedCoverage}
                    compact={true}
                    showForecastSlider={false}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* 3-Step Easy Explainer Guide */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800/80 dark:to-slate-850/60 border border-blue-200/80 dark:border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
            💡
          </span>
          <span className="text-xs font-bold text-blue-900 dark:text-blue-200 uppercase tracking-wider">
            {t("simulatorHelper.howItWorks")}
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-white/80 dark:bg-slate-900/60 p-3 rounded-xl border border-blue-100 dark:border-slate-800">
            <span className="font-bold text-slate-900 dark:text-slate-100 text-xs block">
              {t("simulatorHelper.step1")}
            </span>
            <span className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 block">
              {t("simulatorHelper.step1Desc")}
            </span>
          </div>

          <div className="bg-white/80 dark:bg-slate-900/60 p-3 rounded-xl border border-blue-100 dark:border-slate-800">
            <span className="font-bold text-slate-900 dark:text-slate-100 text-xs block">
              {t("simulatorHelper.step2")}
            </span>
            <span className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 block">
              {t("simulatorHelper.step2Desc")}
            </span>
          </div>

          <div className="bg-white/80 dark:bg-slate-900/60 p-3 rounded-xl border border-blue-100 dark:border-slate-800">
            <span className="font-bold text-slate-900 dark:text-slate-100 text-xs block">
              {t("simulatorHelper.step3")}
            </span>
            <span className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 block">
              {t("simulatorHelper.step3Desc")}
            </span>
          </div>
        </div>
      </div>

      {/* Control Bar: Operator & Skill Selection */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
        {/* Quick Scenario Preset Chips */}
        <div>
          <span className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-2">
            {locale === "hi" ? "त्वरित परिदृश्य चुनें:" : "Quick Scenarios (Try clicking one):"}
          </span>
          <div className="flex flex-wrap gap-2">
            {[
              { id: "op-001", label: "Ravi Kumar (CNC Lathe Lead)" },
              { id: "op-002", label: "Anita Sharma (CNC Milling)" },
              { id: "op-003", label: "Suresh Patil (Hydraulic Press)" },
              { id: "op-004", label: "Meena Iyer (Forming)" },
            ].map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => {
                  setSelectedOperatorId(preset.id);
                  setSelectedSkillId("");
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  selectedOperatorId === preset.id
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end pt-1 border-t border-slate-100 dark:border-slate-800">
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
                (Array.isArray(operators) ? operators : []).map((op) => (
                  <option key={op.id} value={op.id}>
                    {op.name} ({op.employeeCode || op.id}) - Shift {op.shiftId?.replace("shift-", "").toUpperCase()}
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
                {locale === "hi" ? "सभी उत्पादन मशीनें" : "All Machines (Full Resignation)"}
              </option>
              {(Array.isArray(skills) ? skills : []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code} - {locale === "hi" && s.nameHi ? s.nameHi : s.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Simulation Result */}
      {isErrorSim ? (
        <div className="p-8 text-center rounded-xl border border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-400">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
          <p className="font-bold">{t("common.error")}</p>
          <p className="text-sm">Unable to run simulation for this operator.</p>
        </div>
      ) : isLoadingSim || !simData ? (
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
                    name: selectedOp?.name || simData?.operator?.name || "Operator",
                    count: simData?.summary?.newlyRedCount ?? 0,
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
          {((simData?.newlyRed && simData.newlyRed.length > 0) || (simData?.lostAllTrainers && simData.lostAllTrainers.length > 0)) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Newly Red List */}
              {simData?.newlyRed && simData.newlyRed.length > 0 && (
                <div className="rounded-xl border border-red-200 bg-white p-4 shadow-sm dark:border-red-900/50 dark:bg-slate-900">
                  <h3 className="text-sm font-bold text-red-700 dark:text-red-400 mb-3 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" />
                    {t("simulator.newlyRedTitle")} ({simData.newlyRed.length})
                  </h3>
                  <div className="space-y-2">
                    {simData.newlyRed.map((nr, idx) => (
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
              {simData?.lostAllTrainers && simData.lostAllTrainers.length > 0 && (
                <div className="rounded-xl border border-blue-200 bg-white p-4 shadow-sm dark:border-blue-900/50 dark:bg-slate-900">
                  <h3 className="text-sm font-bold text-blue-700 dark:text-blue-400 mb-3 flex items-center gap-1.5">
                    <GraduationCap className="w-4 h-4" />
                    {t("simulator.lostTrainersTitle")} ({simData.lostAllTrainers.length})
                  </h3>
                  <div className="space-y-2">
                    {simData.lostAllTrainers.map((s) => (
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

          {/* ========================================================================= */}
          {/* NEW FEATURE: WHO CAN DO THEIR WORK? (WORK REPLACEMENT & ALL ALTERNATIVES) */}
          {/* ========================================================================= */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                    <Users className="w-5 h-5" />
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                    {t("simulator.replacementsTitle")}
                  </h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {t("simulator.replacementsSubtitle")}
                </p>
              </div>

              {/* Metric Summary Badges */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <span className="text-slate-400 mr-1.5">{t("simulator.affectedWorkstations")}:</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">{replacementSummary.affectedSkillsCount}</span>
                </div>

                <div className="px-3 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                  <span className="opacity-80 mr-1.5">{t("simulator.coveredSameShift")}:</span>
                  <span className="font-bold">{replacementSummary.coveredSameShiftCount}</span>
                </div>

                {replacementSummary.criticalUncoveredCount > 0 && (
                  <div className="px-3 py-1 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-xs font-bold text-red-700 dark:text-red-300 animate-pulse">
                    <span className="mr-1.5">{t("simulator.criticalBottlenecks")}:</span>
                    <span>{replacementSummary.criticalUncoveredCount}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Filter & Search Toolbar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={replacementSearch}
                  onChange={(e) => setReplacementSearch(e.target.value)}
                  placeholder={locale === "hi" ? "मशीन या ऑपरेटर खोजें..." : "Filter machine or replacement..."}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => setReplacementFilter("ALL")}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                    replacementFilter === "ALL"
                      ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                  }`}
                >
                  {t("simulator.filterAll")} ({replacementsList.length})
                </button>

                <button
                  type="button"
                  onClick={() => setReplacementFilter("SAME_SHIFT")}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                    replacementFilter === "SAME_SHIFT"
                      ? "bg-emerald-600 text-white"
                      : "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900"
                  }`}
                >
                  {t("simulator.filterSameShiftOnly")} ({replacementSummary.coveredSameShiftCount})
                </button>

                <button
                  type="button"
                  onClick={() => setReplacementFilter("BOTTLENECK")}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                    replacementFilter === "BOTTLENECK"
                      ? "bg-red-600 text-white"
                      : "bg-red-50 text-red-800 dark:bg-red-950/60 dark:text-red-300 border border-red-200 dark:border-red-900"
                  }`}
                >
                  {t("simulator.filterBottlenecks")} ({replacementSummary.criticalUncoveredCount + replacementSummary.crossShiftOnlyCount})
                </button>
              </div>
            </div>

            {/* Workstation Replacement Cards */}
            {filteredReplacements.length === 0 ? (
              <div className="p-8 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
                {locale === "hi"
                  ? "चयनित फिल्टर के लिए कोई कार्यस्थान नहीं मिला।"
                  : "No workstations match the selected filter."}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredReplacements.map((item) => (
                  <div
                    key={item.skillId}
                    className={`rounded-xl border transition-all ${
                      item.status === "CRITICAL_UNCOVERED"
                        ? "border-red-300 bg-red-50/20 dark:border-red-900/60 dark:bg-red-950/10"
                        : item.status === "CROSS_SHIFT_ONLY"
                        ? "border-amber-200 bg-amber-50/20 dark:border-amber-900/40 dark:bg-amber-950/10"
                        : "border-slate-200 bg-slate-50/40 dark:border-slate-800 dark:bg-slate-800/20"
                    } p-4 sm:p-5`}
                  >
                    {/* Card Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/60 dark:border-slate-800/80">
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold text-sm bg-white dark:bg-slate-900 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 shadow-sm">
                          {item.skillCode}
                        </span>
                        <div>
                          <span className="font-bold text-sm text-slate-900 dark:text-slate-100 block">
                            {locale === "hi" && item.skillNameHi ? item.skillNameHi : item.skillName}
                          </span>
                          <span className="text-[11px] text-slate-500 font-mono">
                            Line: {item.lineKey} · Criticality C{item.criticality}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-xs px-2.5 py-1 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                          <span className="text-slate-400 mr-1.5">{t("simulator.resigningRole")}:</span>
                          <span className="font-bold text-slate-900 dark:text-slate-100">
                            {item.resigningOperatorLevelLabel}
                          </span>
                        </div>

                        {item.status === "COVERED" ? (
                          <span className="px-2.5 py-1 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold text-xs flex items-center gap-1.5">
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            {t("simulator.coveredSameShift")} ({item.sameShiftCount})
                          </span>
                        ) : item.status === "CROSS_SHIFT_ONLY" ? (
                          <span className="px-2.5 py-1 rounded-md bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold text-xs flex items-center gap-1.5">
                            <ArrowRightLeft className="w-3.5 h-3.5 text-amber-600" />
                            {t("simulator.crossShiftCover")} ({item.totalQualifiedCount})
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-md bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300 font-bold text-xs flex items-center gap-1.5 animate-pulse">
                            <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                            {t("simulator.criticalBottlenecks")}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Alternatives Content */}
                    <div className="pt-3 space-y-3">
                      {item.alternatives.length === 0 ? (
                        <div className="p-4 rounded-lg bg-red-100/60 dark:bg-red-950/40 border border-red-200 dark:border-red-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                          <div className="flex items-center gap-2 text-red-800 dark:text-red-300 font-semibold">
                            <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                            <span>{t("simulator.noAlternativesFound")}</span>
                          </div>
                          <Link href="/grid">
                            <Button size="sm" variant="outline" className="border-red-300 text-red-800 hover:bg-red-200/50 dark:border-red-800 dark:text-red-300 text-xs">
                              {locale === "hi" ? "कौशल मैट्रिक्स खोलें" : "Open Skill Grid"}
                            </Button>
                          </Link>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                          {item.alternatives.map((alt) => (
                            <div
                              key={alt.operatorId}
                              className={`p-3 rounded-lg border bg-white dark:bg-slate-900 flex flex-col justify-between gap-2 text-xs shadow-xs ${
                                alt.isSameShift
                                  ? "border-blue-200 dark:border-blue-900/60"
                                  : "border-slate-200 dark:border-slate-800"
                              }`}
                            >
                              <div className="space-y-1">
                                <div className="flex items-center justify-between gap-1">
                                  <span className="font-bold text-slate-900 dark:text-slate-100 truncate">
                                    {alt.name}
                                  </span>
                                  <Badge
                                    variant={
                                      alt.level >= 4
                                        ? "blue"
                                        : alt.level === 3
                                        ? "green"
                                        : "neutral"
                                    }
                                  >
                                    {alt.level >= 4 ? "L4 Trainer" : `Level ${alt.level}`}
                                  </Badge>
                                </div>

                                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono">
                                  <span>{alt.employeeCode}</span>
                                  <span>·</span>
                                  <span
                                    className={`font-semibold ${
                                      alt.isSameShift
                                        ? "text-blue-600 dark:text-blue-400"
                                        : "text-slate-600 dark:text-slate-400"
                                    }`}
                                  >
                                    Shift {alt.shiftCode} ({alt.isSameShift ? t("simulator.sameShiftBadge") : t("simulator.crossShiftBadge")})
                                  </span>
                                </div>
                              </div>

                              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                                <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 truncate max-w-[140px]">
                                  {alt.recommendationTag}
                                </span>

                                <Link
                                  href={`/assign?operatorId=${alt.operatorId}&skillId=${item.skillId}&shiftId=${alt.shiftId}`}
                                  className="text-[11px] text-blue-600 hover:text-blue-800 dark:text-blue-400 font-bold inline-flex items-center gap-1 shrink-0"
                                >
                                  {t("simulator.assignReplacement")} <ArrowRight className="w-3 h-3" />
                                </Link>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Fast-Track Training Candidates */}
                      {item.trainingCandidates.length > 0 && (
                        <div className="pt-2">
                          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
                            <Sparkles className="w-3 h-3 text-amber-500" />
                            {t("simulator.trainingCandidates")} ({item.trainingCandidates.length})
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {item.trainingCandidates.map((cand) => (
                              <span
                                key={cand.operatorId}
                                className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[11px] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-medium"
                              >
                                {cand.name} (Shift {cand.shiftCode} · L1)
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

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
      )}
    </div>
  );
}
