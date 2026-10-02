"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useT } from "@/lib/i18n/useT";
import { Badge, Button, EmptyState, Skeleton, Input } from "@quikit/ui";
import {
  Settings,
  Play,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Server,
  ShieldCheck,
  ShieldAlert,
  RotateCcw,
  Clock,
  ExternalLink,
  Users,
  Grid,
  FileSpreadsheet,
  Plus,
  Edit2,
  Trash2,
  History,
} from "lucide-react";

interface ShiftItem {
  id: string;
  code: string;
  startTime: string;
  endTime: string;
}

interface AuditLogItem {
  id: string;
  actorId: string | null;
  actorRole: string | null;
  action: string;
  entityType: string;
  entityId: string;
  changesJson: string | null;
  reason: string | null;
  createdAt: string;
}

interface JobRun {
  id: string;
  jobName: string;
  triggeredBy: string;
  startedAt: string;
  finishedAt: string;
  status: string;
  flaggedTotal: number;
  newlyFlagged: number;
  resolvedCount: number;
  errorMessage?: string | null;
}

import LeaveApprovalsPage from "../leaves/page";
import { CalendarCheck } from "lucide-react";

export default function AdminPage() {
  const { t, locale } = useT();
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [adminTab, setAdminTab] = useState<"leaves" | "jobs" | "shifts" | "audit">("leaves");

  const userRole = session?.user?.membershipRole || "member";
  const isMember = userRole === "member";

  // --- All hooks must be declared before any early return (Rules of Hooks) ---

  // Fetch pending leaves count for badge
  const { data: leavesData } = useQuery({
    queryKey: ["admin-leaves"],
    enabled: !isMember,
    queryFn: async () => {
      const res = await fetch("/api/admin/leaves");
      if (!res.ok) return { leaves: [], summary: { pending: 0 } };
      const json = await res.json();
      return json.data;
    },
  });

  const pendingLeavesCount = leavesData?.summary?.pending || 0;

  // 1. Fetch Job Runs
  const { data: runsData, isLoading: runsLoading, refetch } = useQuery({
    queryKey: ["admin-job-runs"],
    enabled: !isMember,
    queryFn: async () => {
      const res = await fetch("/api/jobs/runs?limit=10");
      if (!res.ok) throw new Error("Failed to load job runs");
      const json = await res.json();
      return json.data?.data || (Array.isArray(json.data) ? json.data : []);
    },
  });

  // 2. Run Expiry Check Job Mutation
  const runJobMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/jobs/expiry-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to trigger job");
      return json;
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["admin-job-runs"] });
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
      queryClient.invalidateQueries({ queryKey: ["coverage"] });
      setFeedback(
        `Job completed successfully! Flagged: ${res.data.flaggedTotal} (Newly: ${res.data.newlyFlagged}, Resolved: ${res.data.resolvedCount})`
      );
      setTimeout(() => setFeedback(null), 5000);
    },
    onError: (err: unknown) => {
      setFeedback(err instanceof Error ? err.message : "Job execution failed");
      setTimeout(() => setFeedback(null), 5000);
    },
  });

  // 3. Fetch Shifts
  const { data: shiftsData, isLoading: shiftsLoading, refetch: refetchShifts } = useQuery<ShiftItem[]>({
    queryKey: ["admin-shifts"],
    enabled: !isMember,
    queryFn: async () => {
      const res = await fetch("/api/shifts");
      if (!res.ok) throw new Error("Failed to load shifts");
      const json = await res.json();
      return json.data || [];
    },
  });

  const [shiftFormOpen, setShiftFormOpen] = useState(false);
  const [editingShiftId, setEditingShiftId] = useState<string | null>(null);
  const [shiftForm, setShiftForm] = useState({
    code: "",
    startTime: "06:00",
    endTime: "14:00",
  });
  const [shiftError, setShiftError] = useState<string | null>(null);

  const saveShiftMutation = useMutation({
    mutationFn: async () => {
      setShiftError(null);
      const url = editingShiftId ? `/api/shifts/${editingShiftId}` : "/api/shifts";
      const method = editingShiftId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(shiftForm),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save shift");
      return json.data;
    },
    onSuccess: () => {
      refetchShifts();
      setShiftFormOpen(false);
      setEditingShiftId(null);
      setShiftForm({ code: "", startTime: "06:00", endTime: "14:00" });
      setFeedback(editingShiftId ? t("admin.shiftUpdated") : t("admin.shiftCreated"));
      setTimeout(() => setFeedback(null), 4000);
    },
    onError: (err: unknown) => {
      setShiftError(err instanceof Error ? err.message : "Failed to save shift");
    },
  });

  const deleteShiftMutation = useMutation({
    mutationFn: async (shiftId: string) => {
      const res = await fetch(`/api/shifts/${shiftId}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to delete shift");
      return json.data;
    },
    onSuccess: () => {
      refetchShifts();
      setFeedback(t("admin.shiftDeleted"));
      setTimeout(() => setFeedback(null), 4000);
    },
    onError: (err: unknown) => {
      setFeedback(err instanceof Error ? err.message : "Failed to delete shift");
      setTimeout(() => setFeedback(null), 5000);
    },
  });

  // 4. Fetch Audit Logs
  const [auditPage, setAuditPage] = useState<number>(1);
  const [auditActionFilter, setAuditActionFilter] = useState<string>("");

  const { data: auditData, isLoading: auditLoading } = useQuery<{
    items: AuditLogItem[];
    pagination: { total: number; page: number; limit: number; totalPages: number };
  }>({
    queryKey: ["admin-audit", auditPage, auditActionFilter],
    enabled: !isMember,
    queryFn: async () => {
      const url = new URL("/api/audit-log", window.location.origin);
      url.searchParams.set("page", String(auditPage));
      url.searchParams.set("limit", "15");
      if (auditActionFilter) url.searchParams.set("action", auditActionFilter);
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error("Failed to load audit logs");
      const json = await res.json();
      return json.data;
    },
  });

  const runs: JobRun[] = Array.isArray(runsData) ? runsData : [];

  // Early return for unauthorized members — placed AFTER all hooks
  if (isMember) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 flex items-center justify-center mx-auto mb-4 shadow-sm">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
          {t("portal.accessRestricted")}
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
          {t("portal.accessRestrictedDesc")}
        </p>
        <Link href="/portal">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white">
            {t("portal.returnToPortal")}
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
          <Settings className="w-7 h-7 text-accent-600 dark:text-accent-400" />
          {t("admin.title")}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {locale === "hi"
            ? "कर्मचारी अवकाश प्रबंधन, सिस्टम स्थिति और स्वचालित पृष्ठभूमि कार्य"
            : "Employee leave approvals, background job automation, and operational administration"}
        </p>
      </div>

      {/* Admin Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        <button
          onClick={() => setAdminTab("leaves")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
            adminTab === "leaves"
              ? "bg-blue-600 text-white shadow-sm"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          }`}
        >
          <CalendarCheck className="w-4 h-4" />
          {t("leaveApprovals.title")}
          {pendingLeavesCount > 0 && (
            <span className="bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 text-[10px] px-1.5 py-0.2 rounded-full font-bold ml-1">
              {pendingLeavesCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setAdminTab("shifts")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
            adminTab === "shifts"
              ? "bg-blue-600 text-white shadow-sm"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          }`}
        >
          <Clock className="w-4 h-4" />
          {t("admin.shiftsTab")}
        </button>

        <button
          onClick={() => setAdminTab("jobs")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
            adminTab === "jobs"
              ? "bg-blue-600 text-white shadow-sm"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          }`}
        >
          <Server className="w-4 h-4" />
          {locale === "hi" ? "पृष्ठभूमि कार्य एवं सिस्टम" : "Automated Jobs & System Mode"}
        </button>

        <button
          onClick={() => setAdminTab("audit")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
            adminTab === "audit"
              ? "bg-blue-600 text-white shadow-sm"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          }`}
        >
          <History className="w-4 h-4" />
          {t("admin.auditTab")}
        </button>
      </div>

      {/* Tab Content: Leaves */}
      {adminTab === "leaves" && (
        <div className="pt-2">
          <LeaveApprovalsPage />
        </div>
      )}

      {/* Tab Content: Shifts */}
      {adminTab === "shifts" && (
        <div className="space-y-6 pt-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {t("admin.shiftsTab")}
              </h2>
              <p className="text-xs text-slate-500">
                {locale === "hi" ? "कार्य शिफ्ट समय एवं कोड प्रबंधन" : "Manage plant working shifts and operational schedules"}
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => {
                setEditingShiftId(null);
                setShiftForm({ code: "", startTime: "06:00", endTime: "14:00" });
                setShiftError(null);
                setShiftFormOpen(true);
              }}
              className="flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              {t("admin.createShift")}
            </Button>
          </div>

          {shiftError && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs">
              {shiftError}
            </div>
          )}

          {shiftFormOpen && (
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4 shadow-sm">
              <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                {editingShiftId ? t("admin.editShift") : t("admin.createShift")}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-slate-500 block mb-1">
                    {t("admin.shiftCode")}
                  </label>
                  <Input
                    value={shiftForm.code}
                    onChange={(e) => setShiftForm({ ...shiftForm, code: e.target.value })}
                    placeholder="e.g. D"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-500 block mb-1">
                    {t("admin.startTime")}
                  </label>
                  <Input
                    value={shiftForm.startTime}
                    onChange={(e) => setShiftForm({ ...shiftForm, startTime: e.target.value })}
                    placeholder="22:00"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-500 block mb-1">
                    {t("admin.endTime")}
                  </label>
                  <Input
                    value={shiftForm.endTime}
                    onChange={(e) => setShiftForm({ ...shiftForm, endTime: e.target.value })}
                    placeholder="06:00"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShiftFormOpen(false);
                    setEditingShiftId(null);
                  }}
                >
                  {t("common.cancel")}
                </Button>
                <Button
                  size="sm"
                  disabled={saveShiftMutation.isPending}
                  onClick={() => saveShiftMutation.mutate()}
                >
                  {saveShiftMutation.isPending ? t("common.loading") : t("common.save")}
                </Button>
              </div>
            </div>
          )}

          {shiftsLoading ? (
            <Skeleton className="h-48 w-full rounded-xl" />
          ) : (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500">
                  <tr>
                    <th className="p-3 font-semibold">{t("admin.shiftCode")}</th>
                    <th className="p-3 font-semibold">{t("admin.startTime")}</th>
                    <th className="p-3 font-semibold">{t("admin.endTime")}</th>
                    <th className="p-3 font-semibold text-right">{t("common.actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {(shiftsData || []).map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/50">
                      <td className="p-3 font-bold text-slate-900 dark:text-slate-100">
                        Shift {s.code}
                      </td>
                      <td className="p-3 font-mono text-slate-600 dark:text-slate-400">
                        {s.startTime}
                      </td>
                      <td className="p-3 font-mono text-slate-600 dark:text-slate-400">
                        {s.endTime}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingShiftId(s.id);
                              setShiftForm({
                                code: s.code,
                                startTime: s.startTime,
                                endTime: s.endTime,
                              });
                              setShiftError(null);
                              setShiftFormOpen(true);
                            }}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={deleteShiftMutation.isPending}
                            onClick={() => {
                              if (window.confirm(`${t("admin.deleteShift")} ${s.code}?`)) {
                                deleteShiftMutation.mutate(s.id);
                              }
                            }}
                            className="text-red-600 hover:text-red-700 dark:text-red-400"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab Content: System Audit Log */}
      {adminTab === "audit" && (
        <div className="space-y-4 pt-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {t("admin.auditTab")}
              </h2>
              <p className="text-xs text-slate-500">
                {locale === "hi"
                  ? "सभी प्रशासनिक और ऑपरेटर परिवर्तनों का अपरिवर्तनीय इतिहास"
                  : "Immutable operational audit trail of system activities and data mutations"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={auditActionFilter}
                onChange={(e) => {
                  setAuditActionFilter(e.target.value);
                  setAuditPage(1);
                }}
                className="text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1.5 text-slate-700 dark:text-slate-300"
              >
                <option value="">{t("common.all")} {t("admin.auditAction")}</option>
                <option value="CREATE">CREATE</option>
                <option value="UPDATE">UPDATE</option>
                <option value="DELETE">DELETE</option>
              </select>
            </div>
          </div>

          {auditLoading ? (
            <Skeleton className="h-64 w-full rounded-xl" />
          ) : auditData?.items && auditData.items.length > 0 ? (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500">
                  <tr>
                    <th className="p-3 font-semibold">{t("admin.auditTimestamp")}</th>
                    <th className="p-3 font-semibold">{t("admin.auditAction")}</th>
                    <th className="p-3 font-semibold">{t("admin.auditEntity")}</th>
                    <th className="p-3 font-semibold">{t("admin.auditEntityId")}</th>
                    <th className="p-3 font-semibold">{t("admin.auditActor")}</th>
                    <th className="p-3 font-semibold">{t("admin.auditReason")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {auditData.items.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/50">
                      <td className="p-3 font-mono text-slate-500 text-[11px] whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="p-3">
                        <Badge
                          variant={
                            log.action === "CREATE"
                              ? "green"
                              : log.action === "DELETE"
                              ? "red"
                              : "neutral"
                          }
                        >
                          {log.action}
                        </Badge>
                      </td>
                      <td className="p-3 font-mono text-slate-700 dark:text-slate-300">
                        {log.entityType}
                      </td>
                      <td className="p-3 font-mono text-slate-500 text-[11px]">
                        {log.entityId}
                      </td>
                      <td className="p-3 text-slate-600 dark:text-slate-400">
                        {log.actorRole || "system"}
                      </td>
                      <td className="p-3 text-slate-600 dark:text-slate-400">
                        {log.reason || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {auditData.pagination && auditData.pagination.totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                  <div className="text-xs text-slate-500">
                    {t("common.showingPage", {
                      page: auditData.pagination.page,
                      total: auditData.pagination.totalPages,
                      count: auditData.pagination.total,
                    })}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={auditData.pagination.page <= 1}
                      onClick={() => setAuditPage((p) => Math.max(1, p - 1))}
                    >
                      {t("common.previous")}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={auditData.pagination.page >= auditData.pagination.totalPages}
                      onClick={() => setAuditPage((p) => Math.min(auditData.pagination.totalPages, p + 1))}
                    >
                      {t("common.next")}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <EmptyState
              title={t("history.empty")}
              description={t("history.emptyDesc")}
            />
          )}
        </div>
      )}

      {/* Tab Content: Jobs & System */}
      {adminTab === "jobs" && (
        <div className="space-y-6 pt-2">
          {/* System Status Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Environment Status */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              System Mode
            </span>
            <Server className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-2">
            Mode B (In-Memory Fallback)
          </div>
          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 mt-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> High Performance & Active
          </span>
        </div>

        {/* User Session Persona */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Active Persona
            </span>
            <ShieldCheck className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-2">
            {session?.user?.name || "Asha Verma"}
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-1 block">
            Role: {session?.user?.membershipRole || "orgAdmin"} (Plant Head)
          </span>
        </div>

        {/* Automated Expiry Service */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Expiry Job
            </span>
            <Clock className="w-4 h-4 text-accent-600" />
          </div>
          <div className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-2">
            {runs.length > 0 ? "Daily 00:00 UTC" : "On-Demand"}
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 block">
            Evaluates 30-day certification expiries
          </span>
        </div>
      </div>

      {/* Manual Job Trigger Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Play className="w-5 h-5 text-accent-600 dark:text-accent-400" />
              {t("admin.runExpiryCheck")}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
              {t("admin.runExpiryDesc")}
            </p>
          </div>

          <Button
            variant="primary"
            onClick={() => runJobMutation.mutate()}
            disabled={runJobMutation.isPending}
            className="shrink-0 flex items-center gap-2"
          >
            <Play className={`w-4 h-4 ${runJobMutation.isPending ? "animate-spin" : ""}`} />
            {runJobMutation.isPending ? t("admin.runningCheck") : t("admin.runCheckNow")}
          </Button>
        </div>

        {feedback && (
          <div className="mt-4 p-3 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 flex items-center gap-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{feedback}</span>
          </div>
        )}
      </div>

      {/* Job Execution History Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {locale === "hi" ? "कार्य निष्पादन इतिहास" : "Job Execution Audit History"}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {locale === "hi"
                ? "स्वचालित और मैन्युअल रूप से चलाए गए पृष्ठभूमि कार्यों का रिकॉर्ड"
                : "History of automated scheduler and manual administrative trigger runs"}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            {t("common.refresh")}
          </Button>
        </div>

        {runsLoading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        ) : runs.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No previous job execution runs found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3">Job Name</th>
                  <th className="p-3">Triggered By</th>
                  <th className="p-3">Started At</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-center">Flagged Certs</th>
                  <th className="p-3 text-center">Newly Flagged</th>
                  <th className="p-3 text-center">Resolved</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {runs.map((run) => (
                  <tr key={run.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                    <td className="p-3 font-mono font-semibold text-slate-900 dark:text-slate-100">
                      {run.jobName}
                    </td>
                    <td className="p-3 capitalize text-slate-600 dark:text-slate-400">
                      {run.triggeredBy}
                    </td>
                    <td className="p-3 font-mono text-slate-500">
                      {new Date(run.startedAt).toLocaleString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </td>
                    <td className="p-3 text-center">
                      <Badge variant={run.status === "completed" ? "green" : "red"}>
                        {run.status}
                      </Badge>
                    </td>
                    <td className="p-3 text-center font-mono font-bold text-slate-900 dark:text-slate-100">
                      {run.flaggedTotal}
                    </td>
                    <td className="p-3 text-center font-mono text-amber-600 font-semibold">
                      +{run.newlyFlagged}
                    </td>
                    <td className="p-3 text-center font-mono text-emerald-600 font-semibold">
                      {run.resolvedCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Links & Shortcuts */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          href="/grid"
          className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow transition-shadow dark:border-slate-800 dark:bg-slate-900 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
              <Grid className="w-5 h-5" />
            </div>
            <div>
              <span className="font-semibold text-sm text-slate-900 dark:text-slate-100 block">
                {t("nav.grid")}
              </span>
              <span className="text-xs text-slate-500">Manage 15×8 skill matrix</span>
            </div>
          </div>
          <ExternalLink className="w-4 h-4 text-slate-400" />
        </Link>

        <Link
          href="/history"
          className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow transition-shadow dark:border-slate-800 dark:bg-slate-900 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <span className="font-semibold text-sm text-slate-900 dark:text-slate-100 block">
                {t("nav.history")}
              </span>
              <span className="text-xs text-slate-500">View certification audit trail</span>
            </div>
          </div>
          <ExternalLink className="w-4 h-4 text-slate-400" />
        </Link>

        <Link
          href="/reports/gaps"
          className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow transition-shadow dark:border-slate-800 dark:bg-slate-900 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <span className="font-semibold text-sm text-slate-900 dark:text-slate-100 block">
                {t("nav.gaps")}
              </span>
              <span className="text-xs text-slate-500">Export SPOF & risk reports</span>
            </div>
          </div>
          <ExternalLink className="w-4 h-4 text-slate-400" />
        </Link>
      </div>
    </div>
  )}
</div>
  );
}
