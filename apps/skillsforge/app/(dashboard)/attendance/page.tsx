"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useT } from "@/lib/i18n/useT";
import { today } from "@/lib/domain/rules";
import { Badge, Button, Card, Skeleton } from "@quikit/ui";
import {
  Fingerprint,
  RefreshCw,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  AlertCircle,
  Users,
  ShieldCheck,
  Building2,
  ArrowRight,
  Filter,
} from "lucide-react";

interface AttendanceRecord {
  id: string;
  operatorId: string;
  date: string;
  status: "PRESENT" | "ABSENT" | "ON_LEAVE" | "HALF_DAY" | "LATE";
  punchInTime: string | null;
  punchOutTime: string | null;
  biometricDeviceId: string | null;
  biometricVerified: boolean;
  markedBy: string;
  notes?: string;
  updatedAt: string;
  operator: {
    id: string;
    name: string;
    employeeCode: string;
    shiftCode: string;
    shiftTimings: string;
  };
}

interface AttendancePayload {
  date: string;
  summary: {
    total: number;
    present: number;
    absent: number;
    onLeave: number;
    biometricSynced: number;
    biometricRate: number;
  };
  records: AttendanceRecord[];
}

export default function AttendancePage() {
  const { t, locale } = useT();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<string>(today());
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [feedback, setFeedback] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useQuery<AttendancePayload>({
    queryKey: ["attendance", selectedDate],
    queryFn: async () => {
      const res = await fetch(`/api/attendance?date=${selectedDate}`);
      if (!res.ok) throw new Error("Failed to fetch attendance data");
      const json = await res.json();
      return json.data;
    },
  });

  // Mutation to update individual attendance
  const updateMutation = useMutation({
    mutationFn: async ({
      operatorId,
      status,
      notes,
    }: {
      operatorId: string;
      status: string;
      notes?: string;
    }) => {
      const res = await fetch("/api/attendance", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operatorId, status, notes }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to update attendance");
      }
      return await res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      setFeedback(
        locale === "hi"
          ? `ऑपरेटर उपस्थिति स्थिति '${variables.status}' के रूप में अद्यतन की गई`
          : `Operator attendance updated to ${variables.status}`
      );
      setTimeout(() => setFeedback(null), 3500);
    },
    onError: (err: unknown) => {
      setFeedback(err instanceof Error ? err.message : "Error updating record");
      setTimeout(() => setFeedback(null), 3500);
    },
  });

  // Mutation to sync with physical biometric terminal
  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/attendance/sync-biometric", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: selectedDate }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to sync biometric machine");
      }
      return await res.json();
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      setFeedback(
        locale === "hi"
          ? `बायोमेट्रिक मशीन से ${res.data.totalSynced} ऑपरेटरों के पंच रिकॉर्ड सफलतापूर्वक सिंक किए गए`
          : `Successfully synchronized ${res.data.totalSynced} punch records from biometric terminal (${res.data.device})`
      );
      setTimeout(() => setFeedback(null), 4500);
    },
    onError: (err: unknown) => {
      setFeedback(err instanceof Error ? err.message : "Error syncing terminal");
      setTimeout(() => setFeedback(null), 4500);
    },
  });

  const records = data?.records || [];
  const summary = data?.summary || {
    total: 0,
    present: 0,
    absent: 0,
    onLeave: 0,
    biometricSynced: 0,
    biometricRate: 0,
  };

  const filteredRecords = records.filter((rec) => {
    const matchesSearch =
      rec.operator.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rec.operator.employeeCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rec.operator.shiftCode.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === "ALL" || rec.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in">
        <div>
          <p
            className="text-[10px] font-mono font-semibold uppercase tracking-[0.15em] mb-1"
            style={{ color: "rgb(var(--accent-600))" }}
          >
            Workforce Management
          </p>
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{
                background: "linear-gradient(135deg, rgb(var(--accent-500)), rgb(var(--accent-700)))",
                boxShadow: "0 2px 8px -2px rgb(var(--accent-600) / 0.4)",
              }}
            >
              <Fingerprint className="w-4 h-4" style={{ color: "rgb(14 13 11)" }} />
            </div>
            <div>
              <h1
                className="text-2xl font-bold tracking-tight"
                style={{ color: "rgb(var(--text))" }}
              >
                {t("attendance.title")}
              </h1>
              <p
                className="text-sm"
                style={{ color: "rgb(var(--text-muted))" }}
              >
                {t("attendance.subtitle")}
              </p>
            </div>
          </div>
        </div>

        {/* Date and Biometric Sync Action */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-mono">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {selectedDate}
            </span>
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
            className="flex items-center gap-2 font-bold shadow-sm"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${syncMutation.isPending ? "animate-spin" : ""}`}
            />
            <span>
              {syncMutation.isPending
                ? t("attendance.syncing")
                : t("attendance.syncButton")}
            </span>
          </Button>
        </div>
      </div>

      {/* Biometric Terminal Status Bar */}
      <div className="rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/70 dark:bg-emerald-950/30 p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-ping absolute" />
            <div className="w-3 h-3 rounded-full bg-emerald-600 relative" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                BioStation 3 Terminal #1 (Turnstile Gate 1 & 2)
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/80 text-emerald-800 dark:text-emerald-300 font-bold">
                {t("attendance.terminalOnline")} · 192.168.1.108:4370
              </span>
            </div>
            <span className="text-[11px] text-emerald-800/80 dark:text-emerald-300/80 block mt-0.5">
              {locale === "hi"
                ? "ऑप्टिकल फिंगरप्रिंट और आरएफआईडी बैज रीडर सक्रिय है। शॉप-फ्लोर गेट से वास्तविक समय पंच डेटा सिंक्रनाइज़ किया गया।"
                : "Optical fingerprint & RFID badge reader active. Real-time punch log synchronized with shop-floor turnstiles."}
            </span>
          </div>
        </div>

        {feedback && (
          <div className="text-xs font-bold text-emerald-800 dark:text-emerald-200 bg-white/80 dark:bg-slate-900/80 px-3 py-1.5 rounded-lg border border-emerald-300 dark:border-emerald-800 animate-fade-in flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            {feedback}
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="p-4 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
            {t("attendance.totalCount")}
          </span>
          <p className="text-3xl font-black font-mono text-slate-900 dark:text-slate-100 mt-2">
            {summary.total}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {locale === "hi" ? "सभी शिफ्ट्स (A, B, C)" : "Across Shifts A, B, C"}
          </span>
        </Card>

        <Card className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/60">
          <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider block">
            {t("attendance.presentCount")}
          </span>
          <p className="text-3xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-2">
            {summary.present}
          </p>
          <span className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80 mt-1 block">
            {locale === "hi"
              ? `${summary.biometricSynced} बायोमेट्रिक पंच सत्यापित`
              : `${summary.biometricSynced} verified via RFID punch`}
          </span>
        </Card>

        <Card className="p-4 bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-900/60">
          <span className="text-xs font-bold text-red-800 dark:text-red-300 uppercase tracking-wider block">
            {t("attendance.absentCount")}
          </span>
          <p className="text-3xl font-black font-mono text-red-600 dark:text-red-400 mt-2">
            {summary.absent}
          </p>
          <span className="text-[11px] text-red-700/80 dark:text-red-400/80 mt-1 block">
            {locale === "hi" ? "बिना पूर्व सूचना अनुपस्थित" : "Uninformed absence"}
          </span>
        </Card>

        <Card className="p-4 bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/60">
          <span className="text-xs font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider block">
            {t("attendance.onLeaveCount")}
          </span>
          <p className="text-3xl font-black font-mono text-amber-600 dark:text-amber-400 mt-2">
            {summary.onLeave}
          </p>
          <span className="text-[11px] text-amber-700/80 dark:text-amber-400/80 mt-1 block">
            {locale === "hi" ? "पोर्टल से स्वीकृत अवकाश" : "Approved via Leave Portal"}
          </span>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              locale === "hi"
                ? "ऑपरेटर नाम, कोड या शिफ्ट से खोजें..."
                : "Search by operator name, code, or shift..."
            }
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-slate-100"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { key: "ALL", label: locale === "hi" ? "सभी" : "All" },
            { key: "PRESENT", label: t("attendance.status.PRESENT") },
            { key: "ABSENT", label: t("attendance.status.ABSENT") },
            { key: "ON_LEAVE", label: t("attendance.status.ON_LEAVE") },
          ].map((pill) => (
            <button
              key={pill.key}
              type="button"
              onClick={() => setStatusFilter(pill.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                statusFilter === pill.key
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>

      {/* Operator Attendance Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Users className="w-10 h-10 mx-auto mb-2 text-slate-400" />
            <p className="font-semibold">{t("common.noRecords")}</p>
            <p className="text-xs text-slate-400 mt-1">
              No operator attendance records match the selected filter.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  <th className="p-3.5">{t("common.operator")}</th>
                  <th className="p-3.5 text-center">{t("common.shift")}</th>
                  <th className="p-3.5 text-center">{t("attendance.punchIn")}</th>
                  <th className="p-3.5 text-center">{t("attendance.punchOut")}</th>
                  <th className="p-3.5 text-center">Biometric RFID</th>
                  <th className="p-3.5 text-center">{t("common.status")}</th>
                  <th className="p-3.5 text-right">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredRecords.map((record) => {
                  const isPresent = record.status === "PRESENT";
                  const isAbsent = record.status === "ABSENT";
                  const isOnLeave = record.status === "ON_LEAVE";

                  return (
                    <tr
                      key={record.id}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-850/40 transition-colors"
                    >
                      {/* Operator Details */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center shrink-0 font-mono">
                            {record.operator.employeeCode.replace("OP-", "")}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 dark:text-slate-100 block">
                              {record.operator.name}
                            </span>
                            <span className="text-xs text-slate-500 font-mono">
                              {record.operator.employeeCode}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Shift Code & Timings */}
                      <td className="p-3.5 text-center">
                        <span className="font-bold font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs">
                          {record.operator.shiftCode}
                        </span>
                        <span className="block text-[10px] text-slate-400 font-mono mt-0.5">
                          {record.operator.shiftTimings}
                        </span>
                      </td>

                      {/* Punch In */}
                      <td className="p-3.5 text-center">
                        {record.punchInTime ? (
                          <span className="font-mono text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-900">
                            {record.punchInTime}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 font-mono">—</span>
                        )}
                      </td>

                      {/* Punch Out */}
                      <td className="p-3.5 text-center">
                        {record.punchOutTime ? (
                          <span className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                            {record.punchOutTime}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 font-mono">—</span>
                        )}
                      </td>

                      {/* Biometric Verification Badge */}
                      <td className="p-3.5 text-center">
                        {record.biometricVerified ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                            <Fingerprint className="w-3.5 h-3.5 text-emerald-600" />
                            {t("attendance.biometricVerified")}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                            {isOnLeave ? "On Leave" : t("attendance.manual")}
                          </span>
                        )}
                      </td>

                      {/* Attendance Status */}
                      <td className="p-3.5 text-center">
                        <Badge
                          variant={
                            isPresent
                              ? "green"
                              : isAbsent
                              ? "red"
                              : isOnLeave
                              ? "amber"
                              : "neutral"
                          }
                        >
                          {t(`attendance.status.${record.status}`)}
                        </Badge>
                      </td>

                      {/* Quick Action Buttons */}
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* If not absent, allow marking absent in 1 click */}
                          {record.status !== "ABSENT" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                updateMutation.mutate({
                                  operatorId: record.operatorId,
                                  status: "ABSENT",
                                  notes: "Marked absent by supervisor",
                                })
                              }
                              disabled={updateMutation.isPending}
                              className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 border-red-200 dark:border-red-900"
                            >
                              <XCircle className="w-3 h-3 mr-1" />
                              <span>{t("attendance.markAbsent")}</span>
                            </Button>
                          )}

                          {/* If absent or on leave, allow marking present in 1 click */}
                          {record.status !== "PRESENT" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                updateMutation.mutate({
                                  operatorId: record.operatorId,
                                  status: "PRESENT",
                                  notes: "Manual supervisor check-in",
                                })
                              }
                              disabled={updateMutation.isPending}
                              className="text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900"
                            >
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              <span>{t("attendance.markPresent")}</span>
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
