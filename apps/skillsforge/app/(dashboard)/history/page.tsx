"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useT } from "@/lib/i18n/useT";
import { Badge, Button, EmptyState, Skeleton } from "@quikit/ui";
import {
  History,
  Filter,
  Calendar,
  User,
  Cpu,
  ArrowRight,
  Clock,
  RefreshCw,
  Award,
  AlertCircle,
  CheckCircle2,
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

interface HistoryItem {
  id: string;
  operatorId: string;
  skillId: string;
  action: string;
  oldLevel: number | null;
  newLevel: number;
  oldIssuedOn?: string | null;
  newIssuedOn?: string | null;
  oldCertifiedUntil?: string | null;
  newCertifiedUntil?: string | null;
  changedBy?: string;
  changedByName?: string;
  changedAt: string;
  reason?: string | null;
  operator?: {
    id: string;
    name: string;
    employeeCode: string;
    shiftId: string;
  };
  skill?: {
    id: string;
    code: string;
    name: string;
    nameHi?: string;
  };
}

export default function HistoryPage() {
  const { t, locale } = useT();
  const [operatorId, setOperatorId] = useState<string>("");
  const [skillId, setSkillId] = useState<string>("");
  const [actionFilter, setActionFilter] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const limit = 15;

  // 1. Fetch operators for filter dropdown
  const { data: operators = [] } = useQuery<OperatorOption[]>({
    queryKey: ["operators-list"],
    queryFn: async () => {
      const res = await fetch("/api/operators?limit=100");
      if (!res.ok) return [];
      const json = await res.json();
      return json.data?.data || (Array.isArray(json.data) ? json.data : []);
    },
  });

  // 2. Fetch skills for filter dropdown
  const { data: skills = [] } = useQuery<SkillOption[]>({
    queryKey: ["skills-list"],
    queryFn: async () => {
      const res = await fetch("/api/skills?limit=100");
      if (!res.ok) return [];
      const json = await res.json();
      return json.data?.data || (Array.isArray(json.data) ? json.data : []);
    },
  });

  // 3. Fetch paginated history records
  const queryParams = new URLSearchParams();
  if (operatorId) queryParams.set("operatorId", operatorId);
  if (skillId) queryParams.set("skillId", skillId);
  queryParams.set("page", String(page));
  queryParams.set("limit", String(limit));

  const {
    data: historyResponse,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["history-page", operatorId, skillId, page],
    queryFn: async () => {
      const res = await fetch(`/api/history?${queryParams.toString()}`);
      if (!res.ok) throw new Error("Failed to load audit history");
      return await res.json();
    },
  });

  const rawHistory: HistoryItem[] =
    historyResponse?.data?.data ||
    (Array.isArray(historyResponse?.data) ? historyResponse.data : []);

  const pagination = historyResponse?.data?.pagination || {
    page: 1,
    limit,
    total: rawHistory.length,
    totalPages: 1,
  };

  // Client-side action filtering if specified
  const filteredHistory = actionFilter
    ? rawHistory.filter((item) => item.action === actionFilter)
    : rawHistory;

  const getActionBadgeVariant = (action: string) => {
    switch (action.toUpperCase()) {
      case "PROMOTE":
        return "blue";
      case "CERTIFY":
        return "green";
      case "UPDATE":
      case "RENEW":
        return "amber";
      case "DELETE":
        return "red";
      default:
        return "neutral";
    }
  };

  const opMap = new Map(operators.map((o) => [o.id, o]));
  const skillMap = new Map(skills.map((s) => [s.id, s]));

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <History className="w-7 h-7 text-accent-600 dark:text-accent-400" />
            {t("history.title")}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t("history.subtitle")}
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="self-start sm:self-auto flex items-center gap-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
          {t("common.refresh")}
        </Button>
      </div>

      {/* Filter Control Bar */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Operator Filter */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5 block">
              {t("history.filterOperator")}
            </label>
            <select
              value={operatorId}
              onChange={(e) => {
                setOperatorId(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-accent-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            >
              <option value="">{t("history.allOperators")}</option>
              {operators.map((op) => (
                <option key={op.id} value={op.id}>
                  {op.name} ({op.employeeCode || op.id})
                </option>
              ))}
            </select>
          </div>

          {/* Machine Filter */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5 block">
              {t("history.filterMachine")}
            </label>
            <select
              value={skillId}
              onChange={(e) => {
                setSkillId(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-accent-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            >
              <option value="">{t("history.allMachines")}</option>
              {skills.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.code} - {locale === "hi" && s.nameHi ? s.nameHi : s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Action Filter */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5 block">
              {t("history.filterAction")}
            </label>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-accent-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            >
              <option value="">{t("history.allActions")}</option>
              <option value="PROMOTE">PROMOTE (Trainer L4)</option>
              <option value="CERTIFY">CERTIFY (Competency)</option>
              <option value="UPDATE">UPDATE (Level/Dates)</option>
              <option value="DELETE">DELETE (Revoked)</option>
              <option value="SEED">SEED (Baseline)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="p-12 text-center">
            <EmptyState
              icon={<History className="w-10 h-10 text-slate-400" />}
              title={t("history.empty")}
              description={t("history.emptyDesc")}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3.5">Timestamp</th>
                  <th className="p-3.5">{t("common.operator")}</th>
                  <th className="p-3.5">{t("common.machine")}</th>
                  <th className="p-3.5 text-center">{t("history.action")}</th>
                  <th className="p-3.5">{t("history.levelChange")}</th>
                  <th className="p-3.5">{t("history.validUntil")}</th>
                  <th className="p-3.5">{t("history.changedBy")}</th>
                  <th className="p-3.5">{t("history.reason")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredHistory.map((item) => {
                  const op = item.operator || opMap.get(item.operatorId);
                  const skill = item.skill || skillMap.get(item.skillId);
                  const dateStr = item.changedAt
                    ? new Date(item.changedAt).toLocaleString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "—";

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Timestamp */}
                      <td className="p-3.5 font-mono text-xs text-slate-500 whitespace-nowrap">
                        {dateStr}
                      </td>

                      {/* Operator */}
                      <td className="p-3.5 whitespace-nowrap">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {op?.name || item.operatorId}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] font-mono text-slate-500">
                            {op?.employeeCode || item.operatorId}
                          </span>
                          {op?.shiftId && (
                            <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1 rounded font-medium">
                              Shift {op.shiftId.replace("shift-", "").toUpperCase()}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Machine */}
                      <td className="p-3.5 whitespace-nowrap">
                        <span className="font-bold font-mono text-slate-900 dark:text-slate-100 block">
                          {skill?.code || item.skillId}
                        </span>
                        <span className="text-xs text-slate-500 block truncate max-w-[150px]">
                          {locale === "hi" && skill?.nameHi ? skill.nameHi : skill?.name || item.skillId}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="p-3.5 text-center whitespace-nowrap">
                        <Badge variant={getActionBadgeVariant(item.action)}>
                          {item.action}
                        </Badge>
                      </td>

                      {/* Level change */}
                      <td className="p-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-mono text-xs">
                          <span className="text-slate-400">
                            L{item.oldLevel ?? 0}
                          </span>
                          <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-bold text-slate-900 dark:text-slate-100">
                            L{item.newLevel}
                          </span>
                        </div>
                      </td>

                      {/* Certified Until */}
                      <td className="p-3.5 font-mono text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {item.newCertifiedUntil || "No expiry"}
                      </td>

                      {/* Changed By */}
                      <td className="p-3.5 text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{item.changedByName || "System Admin"}</span>
                        </div>
                      </td>

                      {/* Reason */}
                      <td className="p-3.5 text-xs text-slate-500 dark:text-slate-400 max-w-[200px] truncate">
                        {item.reason || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <span>
            {pagination.total} {t("history.totalRecords")}
          </span>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || isLoading}
            >
              Previous
            </Button>
            <span className="px-2 font-mono">
              {t("history.page")} {pagination.page} {t("history.of")}{" "}
              {pagination.totalPages || 1}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={page >= pagination.totalPages || isLoading}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
