"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useT } from "@/lib/i18n/useT";
import { canEditSkillGrid } from "@/lib/api/skillsforgePermissions";
import {
  Button,
  Input,
  DateInput,
  Segmented,
  Tooltip,
  SlidePanel,
  Skeleton,
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@quikit/ui";
import {
  Award,
  AlertTriangle,
  History,
  CheckCircle2,
  Trash2,
  Filter,
  Search,
  Download,
} from "lucide-react";

interface GridOperator {
  id: string;
  employeeCode: string;
  name: string;
  shiftId: string;
  shift?: { code: string };
}

interface GridSkill {
  id: string;
  code: string;
  name: string;
  nameHi?: string | null;
  lineKey: string;
  criticality: number;
}

interface GridShift {
  id: string;
  code: string;
  startTime: string;
  endTime: string;
}

interface GridCellData {
  operatorId: string;
  skillId: string;
  level: number;
  effectiveLevel: number;
  issuedOn: string | null;
  certifiedUntil: string | null;
  daysToExpiry: number | null;
  isExpiringSoon: boolean;
  isExpired: boolean;
  lastChange: {
    action: string;
    by?: string | null;
    at?: string;
    reason?: string | null;
  } | null;
}

interface GridPagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

interface GridPayload {
  asOf: string;
  shifts: GridShift[];
  skills: GridSkill[];
  operators: GridOperator[];
  matrix: Record<string, Record<string, GridCellData>>;
  pagination?: GridPagination;
}

export default function SkillGridPage() {
  const { t, locale } = useT();
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const userRole = session?.user?.membershipRole || "member";
  const userCanEdit = canEditSkillGrid(userRole);

  const [shiftFilter, setShiftFilter] = useState<string>("all");
  const [operatorSearch, setOperatorSearch] = useState<string>("");
  const [lineFilter, setLineFilter] = useState<string>("all");
  const [showGuide, setShowGuide] = useState<boolean>(true);
  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(50);
  const [selectedCellForHistory, setSelectedCellForHistory] = useState<{
    operatorId: string;
    operatorName: string;
    skillId: string;
    skillName: string;
  } | null>(null);

  // Fetch Grid Data
  const { data, isLoading, error } = useQuery<GridPayload>({
    queryKey: ["grid", shiftFilter, page, pageSize],
    queryFn: async () => {
      const url = new URL("/api/grid", window.location.origin);
      if (shiftFilter !== "all") {
        url.searchParams.set("shiftId", shiftFilter);
      }
      url.searchParams.set("page", String(page));
      url.searchParams.set("pageSize", String(pageSize));
      const res = await fetch(url.toString());
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to load grid");
      return json.data;
    },
  });

  // Cell Update Mutation
  const updateCellMutation = useMutation({
    mutationFn: async (payload: {
      operatorId: string;
      skillId: string;
      level: number;
      issuedOn?: string | null;
      certifiedUntil?: string | null;
      reason?: string;
    }) => {
      const res = await fetch("/api/operator-skills", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to update skill");
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grid"] });
      queryClient.invalidateQueries({ queryKey: ["coverage"] });
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
      queryClient.invalidateQueries({ queryKey: ["history"] });
    },
  });

  // Cell Delete Mutation
  const deleteCellMutation = useMutation({
    mutationFn: async ({ operatorId, skillId }: { operatorId: string; skillId: string }) => {
      const res = await fetch(
        `/api/operator-skills?operatorId=${encodeURIComponent(operatorId)}&skillId=${encodeURIComponent(
          skillId
        )}`,
        { method: "DELETE" }
      );
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to delete record");
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grid"] });
      queryClient.invalidateQueries({ queryKey: ["coverage"] });
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
      queryClient.invalidateQueries({ queryKey: ["history"] });
    },
  });

  // Cell History Query
  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ["history", selectedCellForHistory?.operatorId, selectedCellForHistory?.skillId],
    queryFn: async () => {
      if (!selectedCellForHistory) return [];
      const res = await fetch(
        `/api/history?operatorId=${selectedCellForHistory.operatorId}&skillId=${selectedCellForHistory.skillId}&limit=20`
      );
      const json = await res.json();
      return json.data?.data || [];
    },
    enabled: Boolean(selectedCellForHistory),
  });

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-xl">
        <p className="text-sm text-red-600 dark:text-red-400">
          {error instanceof Error ? error.message : "Error loading skill matrix."}
        </p>
      </div>
    );
  }

  const { shifts, skills, operators, matrix } = data;

  // Filter options for Shift
  const shiftOptions = [
    { label: t("grid.allShifts"), value: "all" },
    ...shifts.map((s) => ({
      label: `${t("common.shift")} ${s.code}`,
      value: s.id,
    })),
  ];

  // Calculate Row Tallies (qualified skills count per operator)
  const operatorTallies: Record<string, number> = {};
  for (const op of operators) {
    let count = 0;
    for (const sk of skills) {
      const cell = matrix[op.id]?.[sk.id];
      if (cell && cell.effectiveLevel >= 2) count++;
    }
    operatorTallies[op.id] = count;
  }

  // Calculate Column Tallies (qualified operators count per machine)
  const machineTallies: Record<string, number> = {};
  for (const sk of skills) {
    let count = 0;
    for (const op of operators) {
      const cell = matrix[op.id]?.[sk.id];
      if (cell && cell.effectiveLevel >= 2) count++;
    }
    machineTallies[sk.id] = count;
  }

  // Filter skills by Line
  const displayedSkills = skills.filter((sk) => {
    if (lineFilter !== "all" && sk.lineKey !== lineFilter) return false;
    return true;
  });

  // Filter operators by search
  const displayedOperators = operators.filter((op) => {
    if (!operatorSearch.trim()) return true;
    const q = operatorSearch.toLowerCase();
    return op.name.toLowerCase().includes(q) || op.employeeCode.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto select-none">
      {/* Page Title & Shift Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {t("grid.title")}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {t("grid.subtitle")}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const exportUrl = new URL("/api/grid/export", window.location.origin);
              if (shiftFilter !== "all") {
                exportUrl.searchParams.set("shiftId", shiftFilter);
              }
              window.open(exportUrl.toString(), "_blank");
            }}
            className="flex items-center gap-1.5"
          >
            <Download className="w-4 h-4" />
            {t("grid.exportCsv")}
          </Button>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <Segmented
              options={shiftOptions}
              value={shiftFilter}
              onChange={(val) => {
                setShiftFilter(val);
                setPage(1);
              }}
            />
          </div>
        </div>
      </div>

      {/* Friendly Guide Banner */}
      {showGuide && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800/80 dark:to-slate-850/60 border border-blue-200/80 dark:border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-sm relative">
          <button
            onClick={() => setShowGuide(false)}
            className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 text-xs px-2 py-1 rounded-md"
          >
            ✕ {locale === "hi" ? "छिपाएं" : "Dismiss"}
          </button>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
              💡
            </span>
            <span className="text-xs font-bold text-blue-900 dark:text-blue-200 uppercase tracking-wider">
              {t("gridHelper.howItWorks")}
            </span>
          </div>
          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed max-w-4xl">
            {t("gridHelper.howItWorksDesc")}
          </p>
        </div>
      )}

      {/* Search & Line Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={operatorSearch}
            onChange={(e) => setOperatorSearch(e.target.value)}
            placeholder={t("gridHelper.searchPlaceholder")}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-slate-500 mr-1 font-medium">{t("gridHelper.filterLine")}:</span>
          {["all", "MACHINING", "FORMING", "JOINING", "FINISHING"].map((lk) => (
            <button
              key={lk}
              type="button"
              onClick={() => setLineFilter(lk)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                lineFilter === lk
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400"
              }`}
            >
              {lk === "all" ? t("gridHelper.allLines") : t(`lines.${lk}`)}
            </button>
          ))}
          {!showGuide && (
            <button
              type="button"
              onClick={() => setShowGuide(true)}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline ml-2"
            >
              ℹ️ {locale === "hi" ? "मार्गदर्शिका" : "Show Guide"}
            </button>
          )}
        </div>
      </div>

      {/* Legend Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex flex-wrap items-center gap-4">
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            {t("common.level")}:
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center font-bold text-[11px]">
              0
            </span>
            <span className="text-slate-600 dark:text-slate-400">{t("levels.0")}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center font-bold text-[11px]">
              1
            </span>
            <span className="text-slate-600 dark:text-slate-400">{t("levels.1")}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-[11px] border border-blue-200 dark:border-blue-800">
              2
            </span>
            <span className="text-slate-600 dark:text-slate-400 font-medium">{t("levels.2")}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded bg-blue-200 dark:bg-blue-900 text-blue-800 dark:text-blue-200 flex items-center justify-center font-bold text-[11px] border border-blue-300 dark:border-blue-700">
              3
            </span>
            <span className="text-slate-600 dark:text-slate-400 font-medium">{t("levels.3")}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded bg-blue-600 text-white flex items-center justify-center font-extrabold text-[11px] shadow-sm">
              4★
            </span>
            <span className="text-slate-600 dark:text-slate-400 font-medium">{t("levels.4")}</span>
          </span>
        </div>

        <div className="flex items-center gap-4 text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
            <span>≤30d {t("common.certifiedUntil")}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-600" />
            <span>{t("common.overdue")}</span>
          </span>
        </div>
      </div>

      {/* 2-D Skill Matrix Table */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        <div className="overflow-x-auto max-h-[640px]">
          <table className="w-full text-left border-collapse text-xs">
            {/* Header */}
            <thead className="bg-slate-50 dark:bg-slate-800/80 sticky top-0 z-30 shadow-sm">
              <tr>
                <th className="p-3.5 font-semibold text-slate-700 dark:text-slate-200 border-b border-r border-slate-200 dark:border-slate-800 sticky left-0 bg-slate-100 dark:bg-slate-800 z-40 min-w-[190px]">
                  {t("common.operator")} ({displayedOperators.length})
                </th>
                {displayedSkills.map((skill) => (
                  <th
                    key={skill.id}
                    className="p-3 text-center border-b border-r border-slate-200 dark:border-slate-800 min-w-[110px]"
                  >
                    <div className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                      {skill.code}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[100px] mx-auto font-normal">
                      {locale === "hi" && skill.nameHi ? skill.nameHi : skill.name}
                    </div>
                    <div className="mt-1 flex items-center justify-center gap-1">
                      <span className="text-[9px] uppercase px-1.5 py-0.2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded font-mono">
                        {skill.lineKey}
                      </span>
                    </div>
                  </th>
                ))}
                <th className="p-3 text-center border-b border-slate-200 dark:border-slate-800 min-w-[70px] bg-slate-100 dark:bg-slate-800/90 font-semibold text-slate-700 dark:text-slate-200">
                  {t("heatmap.total")}
                </th>
              </tr>

              {/* Column Qualified Totals Tally Row */}
              <tr className="bg-slate-100/60 dark:bg-slate-800/40 text-[11px] border-b border-slate-200 dark:border-slate-800">
                <td className="p-2.5 font-semibold text-slate-600 dark:text-slate-400 sticky left-0 bg-slate-100 dark:bg-slate-800 z-40 border-r border-slate-200 dark:border-slate-800">
                  {t("heatmap.total")} (Lvl 2+)
                </td>
                {displayedSkills.map((skill) => {
                  const count = machineTallies[skill.id] || 0;
                  const isRed = count < 2;
                  return (
                    <td
                      key={skill.id}
                      className={`p-2 text-center border-r border-slate-200 dark:border-slate-800 font-bold ${
                        isRed
                          ? "text-red-600 dark:text-red-400 bg-red-50/40 dark:bg-red-950/20"
                          : "text-slate-800 dark:text-slate-200"
                      }`}
                    >
                      {count}
                    </td>
                  );
                })}
                <td className="p-2 text-center bg-slate-200/50 dark:bg-slate-800 font-bold text-slate-800 dark:text-slate-200">
                  -
                </td>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {displayedOperators.map((op) => {
                const rowTally = operatorTallies[op.id] || 0;

                return (
                  <tr
                    key={op.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    {/* Operator Sticky Left Column */}
                    <td className="p-3 border-r border-slate-200 dark:border-slate-800 sticky left-0 bg-white dark:bg-slate-900 z-20 shadow-sm">
                      <div className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                        {op.name}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-mono text-slate-500">
                          {op.employeeCode}
                        </span>
                        <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded font-medium">
                          {t("common.shift")} {op.shift?.code || op.shiftId?.slice(-1)?.toUpperCase() || "A"}
                        </span>
                      </div>
                    </td>

                    {/* Skill Cells */}
                    {displayedSkills.map((skill) => {
                      const cell = matrix[op.id]?.[skill.id] || {
                        operatorId: op.id,
                        skillId: skill.id,
                        level: 0,
                        effectiveLevel: 0,
                        issuedOn: null,
                        certifiedUntil: null,
                        daysToExpiry: null,
                        isExpiringSoon: false,
                        isExpired: false,
                        lastChange: null,
                      };

                      return (
                        <td
                          key={skill.id}
                          className="p-1.5 border-r border-slate-200 dark:border-slate-800 text-center relative"
                        >
                          <MatrixCell
                            operator={op}
                            skill={skill}
                            cell={cell}
                            canEdit={userCanEdit}
                            onSave={(newLevel, issuedOn, certifiedUntil, reason) =>
                              updateCellMutation.mutate({
                                operatorId: op.id,
                                skillId: skill.id,
                                level: newLevel,
                                issuedOn,
                                certifiedUntil,
                                reason,
                              })
                            }
                            onDelete={() =>
                              deleteCellMutation.mutate({
                                operatorId: op.id,
                                skillId: skill.id,
                              })
                            }
                            onViewHistory={() =>
                              setSelectedCellForHistory({
                                operatorId: op.id,
                                operatorName: op.name,
                                skillId: skill.id,
                                skillName: locale === "hi" && skill.nameHi ? skill.nameHi : skill.name,
                              })
                            }
                          />
                        </td>
                      );
                    })}

                    {/* Row Qualified Tally */}
                    <td className="p-3 text-center bg-slate-50/50 dark:bg-slate-800/40 font-bold text-slate-800 dark:text-slate-200">
                      {rowTally}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {data?.pagination && data.pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            <div className="text-xs text-slate-500">
              {t("common.showingPage", {
                page: data.pagination.page,
                total: data.pagination.totalPages,
                count: data.pagination.total,
              })}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={data.pagination.page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                {t("common.previous")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={data.pagination.page >= data.pagination.totalPages}
                onClick={() => setPage((p) => Math.min(data.pagination!.totalPages, p + 1))}
              >
                {t("common.next")}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* SlidePanel for Cell History */}
      <SlidePanel
        open={Boolean(selectedCellForHistory)}
        onClose={() => setSelectedCellForHistory(null)}
        title={t("grid.historyTitle")}
      >
        <div className="space-y-4">
          <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
            <span className="text-xs text-slate-500 block uppercase font-mono">
              {t("common.operator")} & {t("common.machine")}
            </span>
            <div className="font-bold text-slate-900 dark:text-slate-100 text-sm mt-0.5">
              {selectedCellForHistory?.operatorName} × {selectedCellForHistory?.skillName}
            </div>
          </div>

          {historyLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : historyData && historyData.length > 0 ? (
            <div className="space-y-3">
              {historyData.map((h: any) => (
                <div
                  key={h.id}
                  className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs space-y-1 shadow-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {h.action} · Level {h.newLevel ?? "-"}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(h.changedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="text-slate-500">
                    By: {h.changedByName || h.changedBy || "System"}
                  </div>
                  {h.reason && (
                    <div className="text-slate-600 dark:text-slate-400 italic bg-slate-50 dark:bg-slate-800 p-1.5 rounded">
                      &ldquo;{h.reason}&rdquo;
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 text-center py-6">
              {t("common.noRecords")}
            </p>
          )}
        </div>
      </SlidePanel>
    </div>
  );
}

/**
 * Individual Interactive Matrix Cell Component
 */
function MatrixCell({
  operator,
  skill,
  cell,
  canEdit,
  onSave,
  onDelete,
  onViewHistory,
}: {
  operator: GridOperator;
  skill: GridSkill;
  cell: GridCellData;
  canEdit: boolean;
  onSave: (level: number, issuedOn?: string | null, certifiedUntil?: string | null, reason?: string) => void;
  onDelete: () => void;
  onViewHistory: () => void;
}) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [level, setLevel] = useState<number>(cell.level);
  const [issuedOn, setIssuedOn] = useState<string>(cell.issuedOn || "");
  const [certifiedUntil, setCertifiedUntil] = useState<string>(cell.certifiedUntil || "");
  const [reason, setReason] = useState<string>("");

  const handleOpen = () => {
    if (!canEdit) return;
    setLevel(cell.level);
    setIssuedOn(cell.issuedOn || "");
    setCertifiedUntil(cell.certifiedUntil || "");
    setReason("");
    setOpen(true);
  };

  const handleSave = () => {
    onSave(level, issuedOn || null, certifiedUntil || null, reason);
    setOpen(false);
  };

  const handleDelete = () => {
    onDelete();
    setOpen(false);
  };

  // Keyboard navigation when cell button is focused
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!canEdit) return;
    if (["0", "1", "2", "3", "4"].includes(e.key)) {
      e.preventDefault();
      const newLvl = parseInt(e.key, 10);
      onSave(newLvl, cell.issuedOn, cell.certifiedUntil, `Quick key '${e.key}' press`);
    }
  };

  // Level visual styles
  const getLevelStyle = (lvl: number, isExp: boolean) => {
    if (isExp) {
      return "bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 line-through border border-red-200 dark:border-red-900";
    }
    switch (lvl) {
      case 0:
        return "bg-slate-50 dark:bg-slate-900/40 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800";
      case 1:
        return "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-200 dark:hover:bg-slate-700";
      case 2:
        return "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-800 hover:bg-blue-100";
      case 3:
        return "bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 font-bold border border-blue-300 dark:border-blue-700 hover:bg-blue-200";
      case 4:
        return "bg-blue-600 text-white font-extrabold shadow-sm hover:bg-blue-700";
      default:
        return "bg-slate-50 text-slate-400";
    }
  };

  const tooltipContent = (
    <div className="space-y-1 text-left min-w-[140px]">
      <div className="font-bold">{operator.name} × {skill.code}</div>
      <div>Level: {cell.level} ({t(`levels.${cell.level}`)})</div>
      {cell.certifiedUntil && <div>Cert Until: {cell.certifiedUntil}</div>}
      {cell.daysToExpiry !== null && (
        <div className={cell.isExpired ? "text-red-400 font-semibold" : ""}>
          {cell.isExpired
            ? `Expired ${Math.abs(cell.daysToExpiry)}d ago`
            : `${cell.daysToExpiry} days left`}
        </div>
      )}
      {cell.lastChange && (
        <div className="text-[10px] text-slate-300 pt-1 border-t border-slate-700">
          Last change: {cell.lastChange.by || "Unknown"} ({new Date(cell.lastChange.at!).toLocaleDateString()})
          {cell.lastChange.reason && <div className="italic">&ldquo;{cell.lastChange.reason}&rdquo;</div>}
        </div>
      )}
    </div>
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip content={tooltipContent}>
        <PopoverTrigger asChild>
          <button
            type="button"
            onClick={handleOpen}
            onKeyDown={handleKeyDown}
            disabled={!canEdit}
            className={`w-full h-11 rounded-lg flex items-center justify-center transition-all relative outline-none focus:ring-2 focus:ring-blue-500 ${getLevelStyle(
              cell.level,
              cell.isExpired
            )} ${!canEdit ? "cursor-default" : "cursor-pointer"}`}
          >
            <span className="text-sm">
              {cell.level}
              {cell.level === 4 && <Award className="w-3 h-3 inline ml-0.5 -mt-0.5 text-amber-300" />}
            </span>

            {/* Expiring soon dot */}
            {cell.isExpiringSoon && !cell.isExpired && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            )}

            {/* Expired marker */}
            {cell.isExpired && (
              <span className="absolute top-1.5 right-1.5 text-red-600">
                <AlertTriangle className="w-3 h-3" />
              </span>
            )}
          </button>
        </PopoverTrigger>
      </Tooltip>

      {canEdit && (
        <PopoverContent align="center" className="w-80 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                {operator.name}
              </h4>
              <p className="text-xs text-slate-500">{skill.code} · {skill.name}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setOpen(false);
                onViewHistory();
              }}
              className="text-xs text-blue-600 h-7 px-2"
            >
              <History className="w-3.5 h-3.5 mr-1" />
              History
            </Button>
          </div>

          {/* Level Selector */}
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
              {t("grid.setProficiency")}
            </label>
            <Segmented
              options={[
                { label: "0", value: 0 },
                { label: "1", value: 1 },
                { label: "2", value: 2 },
                { label: "3", value: 3 },
                { label: "4★", value: 4 },
              ]}
              value={level}
              onChange={(val) => setLevel(val as number)}
              className="w-full justify-between"
            />
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              {t(`levels.${level}`)}
            </p>
          </div>

          {/* Certification Dates */}
          <div className="grid grid-cols-2 gap-2 text-left">
            <div>
              <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400 block mb-1">
                {t("common.issuedOn")}
              </label>
              <DateInput
                value={issuedOn}
                onChange={(e) => setIssuedOn(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400 block mb-1">
                {t("common.certifiedUntil")}
              </label>
              <DateInput
                value={certifiedUntil}
                onChange={(e) => setCertifiedUntil(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400 block mb-1">
              {t("common.reason")}
            </label>
            <Input
              type="text"
              placeholder="e.g. Completed retraining module"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="h-8 text-xs"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
            {cell.level > 0 ? (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                className="h-8 px-2.5 text-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOpen(false)}
                className="h-8 text-xs"
              >
                {t("common.cancel")}
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSave}
                className="h-8 text-xs gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                {t("common.save")}
              </Button>
            </div>
          </div>
        </PopoverContent>
      )}
    </Popover>
  );
}
