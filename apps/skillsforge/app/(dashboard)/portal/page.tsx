"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useT } from "@/lib/i18n/useT";
import { Card, Button, Badge, Skeleton, EmptyState } from "@quikit/ui";
import {
  Factory,
  Cpu,
  Calendar,
  Clock,
  Award,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Plus,
  RefreshCw,
  User,
  ShieldCheck,
  CheckSquare,
  CalendarCheck,
  ChevronRight,
  Upload,
  X,
  FileCheck,
  Info,
  Fingerprint,
} from "lucide-react";

interface TodayDuty {
  date: string;
  shift: {
    id: string;
    code: string;
    name: string;
    startTime: string;
    endTime: string;
    duration: string;
  };
  station: {
    bay: string;
    line: string;
    machineId: string;
    machineCode: string;
    machineName: string;
    machineNameHi?: string;
    criticality: number;
  };
  supervisor: string;
  competencyLevel: number;
  isTrainer: boolean;
  status: string;
  preOperationChecks: { id: string; label: string; passed: boolean }[];
}

interface ScheduleDay {
  date: string;
  dayName: string;
  isToday: boolean;
  isOffDay: boolean;
  shiftCode: string;
  shiftTiming: string;
  machine: {
    id: string;
    code: string;
    name: string;
    nameHi?: string;
    lineKey: string;
  } | null;
  status: string;
}

interface CertificateItem {
  machine: {
    id: string;
    code: string;
    name: string;
    nameHi?: string;
    lineKey: string;
    criticality: number;
  };
  level: number;
  isTrainer: boolean;
  issuedOn?: string | null;
  certifiedUntil?: string | null;
  daysRemaining?: number | null;
  status: "certified" | "expiring_soon" | "expired" | "not_certified";
}

interface LeaveRequest {
  id: string;
  operatorId: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  daysCount: number;
  reason: string;
  status: "APPROVED" | "PENDING" | "REJECTED";
  submittedAt: string;
}

interface CertificateSubmission {
  id: string;
  operatorId: string;
  skillId: string;
  certificateNumber: string;
  level: number;
  issuedOn: string;
  certifiedUntil: string;
  fileName?: string;
  notes?: string;
  status: string;
  submittedAt: string;
}

export default function MemberPortalPage() {
  const { t, locale } = useT();
  const { data: session } = useSession();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<"duty" | "certificates" | "leaves">("duty");
  const [selectedOperatorId, setSelectedOperatorId] = useState<string>("");
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [isCertModalOpen, setIsCertModalOpen] = useState(false);

  // Leave Form State
  const [leaveType, setLeaveType] = useState<string>("CASUAL");
  const [leaveStart, setLeaveStart] = useState<string>("");
  const [leaveEnd, setLeaveEnd] = useState<string>("");
  const [leaveReason, setLeaveReason] = useState<string>("");
  const [leaveMsg, setLeaveMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Certificate Form State
  const [certSkillId, setCertSkillId] = useState<string>("");
  const [certNumber, setCertNumber] = useState<string>("");
  const [certLevel, setCertLevel] = useState<number>(3);
  const [certIssued, setCertIssued] = useState<string>("");
  const [certUntil, setCertUntil] = useState<string>("");
  const [certNotes, setCertNotes] = useState<string>("");
  const [certFile, setCertFile] = useState<string>("");
  const [certMsg, setCertMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Safety checks interactive toggles
  const [checksStatus, setChecksStatus] = useState<Record<string, boolean>>({
    "chk-ppe": true,
    "chk-e-stop": true,
    "chk-zero": true,
    "chk-coolant": true,
  });

  // Query Portal Data
  const { data: portalData, isLoading, refetch } = useQuery({
    queryKey: ["member-portal-data", selectedOperatorId],
    queryFn: async () => {
      const q = selectedOperatorId ? `?operatorId=${selectedOperatorId}` : "";
      const res = await fetch(`/api/member/portal${q}`);
      if (!res.ok) throw new Error("Failed to load portal data");
      const json = await res.json();
      return json.data;
    },
  });

  const operator = portalData?.operator;
  const todayDuty: TodayDuty | undefined = portalData?.todayDuty;
  const scheduleDays: ScheduleDay[] = portalData?.scheduleDays || [];
  const certificates: CertificateItem[] = portalData?.certificates || [];
  const leaveSummary = portalData?.leaveSummary || { totalQuota: 14, daysTaken: 0, balance: 14, pendingCount: 0 };
  const leaves: LeaveRequest[] = portalData?.leaves || [];
  const submissions: CertificateSubmission[] = portalData?.submissions || [];
  const availableOperators = portalData?.availableOperators || [];

  // Check if authenticated user is viewing their own profile
  const sessionUserName = session?.user?.name;
  const isViewingSelf = !selectedOperatorId || (Boolean(session?.user?.operatorId) && selectedOperatorId === session?.user?.operatorId);
  const currentDisplayName = isViewingSelf
    ? (sessionUserName || operator?.name || "Operator")
    : (operator?.name || sessionUserName || "Operator");

  const avatarInitials = currentDisplayName
    .split(" ")
    .map((part: string) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || "OP";

  // Query Real-time Attendance Status
  const { data: attendanceData } = useQuery({
    queryKey: ["member-attendance", operator?.id],
    queryFn: async () => {
      const res = await fetch("/api/attendance");
      if (!res.ok) return null;
      const json = await res.json();
      return json.data;
    },
    enabled: Boolean(operator?.id),
  });

  const myAttendance = attendanceData?.records?.find(
    (r: any) => (operator?.id ? r.operatorId === operator.id : false)
  );

  // Mutation: Apply for Leave
  const applyLeaveMutation = useMutation({
    mutationFn: async () => {
      if (!leaveStart || !leaveEnd || !leaveReason) {
        throw new Error("Please fill in all leave fields");
      }
      const opId = operator?.id || selectedOperatorId;
      if (!opId) {
        throw new Error("No operator selected");
      }
      const res = await fetch("/api/member/leaves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operatorId: opId,
          leaveType,
          startDate: leaveStart,
          endDate: leaveEnd,
          reason: leaveReason,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to submit leave request");
      }
      return await res.json();
    },
    onSuccess: () => {
      setLeaveMsg({ type: "success", text: "Leave request submitted successfully! Awaiting supervisor approval." });
      setLeaveReason("");
      setLeaveStart("");
      setLeaveEnd("");
      queryClient.invalidateQueries({ queryKey: ["member-portal-data"] });
      setTimeout(() => {
        setIsLeaveModalOpen(false);
        setLeaveMsg(null);
      }, 1500);
    },
    onError: (err: any) => {
      setLeaveMsg({ type: "error", text: err.message });
    },
  });

  // Mutation: Cancel Leave
  const cancelLeaveMutation = useMutation({
    mutationFn: async (leaveId: string) => {
      const res = await fetch(`/api/member/leaves?id=${leaveId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to cancel leave request");
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["member-portal-data"] });
    },
  });

  // Mutation: Submit Certificate
  const submitCertMutation = useMutation({
    mutationFn: async () => {
      if (!certSkillId || !certNumber || !certIssued || !certUntil) {
        throw new Error("Please fill in all certificate details");
      }
      const opId = operator?.id || selectedOperatorId;
      if (!opId) {
        throw new Error("No operator selected");
      }
      const res = await fetch("/api/member/certificates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operatorId: opId,
          skillId: certSkillId,
          certificateNumber: certNumber,
          level: certLevel,
          issuedOn: certIssued,
          certifiedUntil: certUntil,
          fileName: certFile || `${certSkillId}_certificate.pdf`,
          notes: certNotes,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to submit certificate");
      }
      return await res.json();
    },
    onSuccess: () => {
      setCertMsg({ type: "success", text: "Certificate submitted and verified! Skill level updated in matrix." });
      setCertNumber("");
      setCertNotes("");
      setCertFile("");
      queryClient.invalidateQueries({ queryKey: ["member-portal-data"] });
      setTimeout(() => {
        setIsCertModalOpen(false);
        setCertMsg(null);
      }, 1500);
    },
    onError: (err: any) => {
      setCertMsg({ type: "error", text: err.message });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6">
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-12 w-96 rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* 1. Header Card & Profile Summary */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-7 shadow-sm">
        {/* Subtle industrial amber accent bar at the top */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4">
            {/* Operator Avatar with Industrial Initial Badge */}
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-black text-lg sm:text-xl flex items-center justify-center shrink-0 shadow-xs">
              {avatarInitials}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
                  {currentDisplayName}
                </h1>
                <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs px-2.5 py-0.5 rounded-md font-mono font-semibold border border-slate-200 dark:border-slate-700">
                  {operator?.employeeCode || "OP-001"}
                </span>
                <span className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs px-2.5 py-0.5 rounded-md font-semibold border border-emerald-200 dark:border-emerald-800/60 inline-flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Shift {operator?.shiftCode || "A"} · Morning
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                {operator?.plantName || "SkillsForge Manufacturing Plant"} · {operator?.department || "Precision Machining"}
              </p>
            </div>
          </div>

          {/* Operator Switcher (Demo Feature) */}
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/70 p-1.5 sm:p-2 rounded-xl border border-slate-200 dark:border-slate-700/80 self-start md:self-auto shadow-xs">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium pl-1 hidden sm:inline">
              {t("portal.viewingAs")}:
            </span>
            <select
              value={selectedOperatorId || operator?.id || ""}
              onChange={(e) => setSelectedOperatorId(e.target.value)}
              className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs rounded-lg px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500/40 font-medium cursor-pointer"
            >
              {availableOperators.map((op: any) => {
                const isThisOpSelf = Boolean(session?.user?.operatorId) && op.id === session?.user?.operatorId;
                const opLabelName = isThisOpSelf ? (session?.user?.name || op.name) : op.name;
                return (
                  <option key={op.id} value={op.id} className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white">
                    {opLabelName} ({op.employeeCode} · Shift {op.shiftCode})
                  </option>
                );
              })}
            </select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 h-8 px-2"
              title="Refresh profile data"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Quick Stat Pill Bar */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-100 dark:border-slate-800">
          <div className="bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/50 rounded-xl p-3">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              {t("portal.allottedMachine")}
            </span>
            <span className="font-bold text-sm tracking-tight text-slate-900 dark:text-slate-100 block mt-1 truncate">
              {todayDuty?.station.machineCode} · {locale === "hi" && todayDuty?.station.machineNameHi ? todayDuty?.station.machineNameHi : todayDuty?.station.machineName}
            </span>
          </div>

          <div className="bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/50 rounded-xl p-3">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              {t("portal.shiftTimings")}
            </span>
            <span className="font-bold text-sm tracking-tight text-slate-900 dark:text-slate-100 block mt-1 font-mono">
              {todayDuty?.shift.startTime} - {todayDuty?.shift.endTime} (8h)
            </span>
          </div>

          <div className="bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/50 rounded-xl p-3">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              {t("portal.balance")}
            </span>
            <span className="font-bold text-sm tracking-tight text-emerald-600 dark:text-emerald-400 block mt-1">
              {leaveSummary.balance} / {leaveSummary.totalQuota} {t("portal.days")}
            </span>
          </div>

          <div className="bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/50 rounded-xl p-3">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              {t("portal.competency")}
            </span>
            <span className="font-bold text-sm tracking-tight text-amber-600 dark:text-amber-400 block mt-1">
              Level {todayDuty?.competencyLevel} {todayDuty?.isTrainer ? "(Master Trainer)" : "(Autonomous)"}
            </span>
          </div>
        </div>

        {/* Biometric Attendance Status Banner */}
        <div className="mt-4 px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
              myAttendance?.status === "PRESENT"
                ? "bg-emerald-500 text-white shadow-xs"
                : myAttendance?.status === "ABSENT"
                ? "bg-red-500 text-white shadow-xs"
                : "bg-amber-500 text-white shadow-xs"
            }`}>
              <Fingerprint className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-slate-700 dark:text-slate-300 font-semibold">
                  {locale === "hi" ? "आज की उपस्थिति स्थिति" : "Today's Biometric Attendance"}:
                </span>
                <span className={
                  myAttendance?.status === "PRESENT"
                    ? "text-emerald-600 dark:text-emerald-400 font-bold"
                    : myAttendance?.status === "ABSENT"
                    ? "text-red-600 dark:text-red-400 font-bold"
                    : "text-amber-600 dark:text-amber-400 font-bold"
                }>
                  {myAttendance?.status === "PRESENT"
                    ? (locale === "hi" ? "उपस्थित (PRESENT)" : "PRESENT")
                    : myAttendance?.status === "ABSENT"
                    ? (locale === "hi" ? "अनुपस्थित (ABSENT)" : "ABSENT")
                    : (locale === "hi" ? "अवकाश पर (ON LEAVE)" : "ON LEAVE")}
                </span>
              </div>
              <span className="text-slate-500 dark:text-slate-400 text-[11px] block mt-0.5 font-mono">
                {myAttendance?.punchInTime
                  ? (locale === "hi"
                      ? `बायोमेट्रिक पंच समय: ${myAttendance.punchInTime} · टर्नस्टाइल गेट #1`
                      : `Biometric Punch: ${myAttendance.punchInTime} · Shop Floor Turnstile Gate #1`)
                  : (locale === "hi"
                      ? "आज कोई बायोमेट्रिक पंच दर्ज नहीं हुआ (अनुपस्थित)"
                      : "No turnstile punch registered today (Absent)")}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {myAttendance?.biometricVerified ? "RFID Synced" : "Manual Record"}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Interactive Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab("duty")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            activeTab === "duty"
              ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          }`}
        >
          <CalendarCheck className="w-4 h-4" />
          {t("portal.tabDuty")}
        </button>

        <button
          onClick={() => setActiveTab("certificates")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            activeTab === "certificates"
              ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          }`}
        >
          <Award className="w-4 h-4" />
          {t("portal.tabCertificates")}
        </button>

        <button
          onClick={() => setActiveTab("leaves")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
            activeTab === "leaves"
              ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          }`}
        >
          <Calendar className="w-4 h-4" />
          {t("portal.tabLeaves")}
          {leaveSummary.pendingCount > 0 && (
            <span className="bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
              {leaveSummary.pendingCount}
            </span>
          )}
        </button>
      </div>


      {/* 3. TAB 1: ALLOTTED DUTY & WORKSTATION */}
      {activeTab === "duty" && (
        <div className="space-y-6">
          {/* Hero Card: Today's Allotted Machine & Station */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                      CONFIRMED & ON DUTY TODAY
                    </span>
                  </div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 mt-1">
                    {t("portal.todayDutyTitle")}
                  </h2>
                </div>

                <Badge variant="blue" className="text-xs font-mono">
                  {todayDuty?.shift.code} Shift
                </Badge>
              </div>

              {/* Machine & Station Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                  <span className="text-xs text-slate-500 block">{t("portal.allottedMachine")}</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-lg font-bold font-mono text-slate-900 dark:text-slate-100">
                      {todayDuty?.station.machineCode}
                    </span>
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      {locale === "hi" && todayDuty?.station.machineNameHi ? todayDuty?.station.machineNameHi : todayDuty?.station.machineName}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                    <span className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded text-[10px] font-semibold">
                      Line: {todayDuty?.station.line}
                    </span>
                    <span className="bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 px-1.5 py-0.5 rounded text-[10px] font-semibold">
                      Crit: Level {todayDuty?.station.criticality}
                    </span>
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                  <span className="text-xs text-slate-500 block">{t("portal.workstation")}</span>
                  <span className="text-sm font-bold text-slate-900 dark:text-slate-100 block mt-1">
                    {todayDuty?.station.bay}
                  </span>
                  <div className="mt-2 text-xs text-slate-500">
                    <span>{t("portal.supervisor")}: </span>
                    <strong className="text-slate-700 dark:text-slate-300">{todayDuty?.supervisor}</strong>
                  </div>
                </div>
              </div>

              {/* Station Pre-Operation Checklist */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-3 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  {t("portal.checklist")}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {todayDuty?.preOperationChecks.map((chk) => {
                    const isChecked = checksStatus[chk.id] ?? chk.passed;
                    return (
                      <label
                        key={chk.id}
                        className={`flex items-center gap-3 p-3 rounded-xl border text-xs cursor-pointer transition-colors ${
                          isChecked
                            ? "bg-emerald-50/60 border-emerald-200 text-emerald-950 dark:bg-emerald-950/20 dark:border-emerald-900/60 dark:text-emerald-200"
                            : "bg-slate-50 border-slate-200 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) =>
                            setChecksStatus((prev) => ({ ...prev, [chk.id]: e.target.checked }))
                          }
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                        />
                        <span className="font-medium">{chk.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right Card: Quick Actions & Status */}
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-3">
                  Operator Competency & Safety
                </h3>
                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500">Operation Level:</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100">
                      Level {todayDuty?.competencyLevel} / 4
                    </span>
                  </div>
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500">Trainer Privileges:</span>
                    <Badge variant={todayDuty?.isTrainer ? "blue" : "neutral"} className="text-[10px]">
                      {todayDuty?.isTrainer ? "Master Trainer" : "Autonomous Operator"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500">Shift Handover:</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Ready for 14:00 Handover</span>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2">
                  <Button
                    onClick={() => {
                      setActiveTab("certificates");
                      setIsCertModalOpen(true);
                    }}
                    variant="outline"
                    className="w-full text-xs justify-start gap-2"
                  >
                    <Award className="w-4 h-4 text-blue-600" />
                    {t("portal.submitCert")}
                  </Button>
                  <Button
                    onClick={() => {
                      setActiveTab("leaves");
                      setIsLeaveModalOpen(true);
                    }}
                    variant="outline"
                    className="w-full text-xs justify-start gap-2"
                  >
                    <Calendar className="w-4 h-4 text-emerald-600" />
                    {t("portal.applyLeave")}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Upcoming 7-Day Duty Schedule Roster */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              {t("portal.upcomingRoster")}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
              {scheduleDays.map((day) => (
                <div
                  key={day.date}
                  className={`p-3.5 rounded-xl border text-center transition-all ${
                    day.isToday
                      ? "border-blue-500 bg-blue-50/60 dark:bg-blue-950/40 shadow-sm ring-2 ring-blue-500/20"
                      : day.isOffDay
                      ? "border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-800 dark:bg-slate-800/40"
                      : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
                  }`}
                >
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                    {day.dayName.slice(0, 3)}
                  </span>
                  <span className="text-xs font-mono text-slate-400 block mb-2">{day.date}</span>

                  {day.isOffDay ? (
                    <div className="my-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                      <span className="text-xs font-bold text-slate-500">WEEKLY OFF</span>
                    </div>
                  ) : (
                    <div className="my-2 space-y-1">
                      <Badge variant={day.isToday ? "blue" : "neutral"} className="text-[10px]">
                        Shift {day.shiftCode}
                      </Badge>
                      <div className="font-bold text-xs font-mono text-slate-900 dark:text-slate-100 truncate">
                        {day.machine?.code || "CNC-L1"}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate">
                        {locale === "hi" && day.machine?.nameHi ? day.machine?.nameHi : day.machine?.name || "CNC Lathe"}
                      </div>
                    </div>
                  )}

                  <span
                    className={`text-[10px] font-semibold block mt-2 ${
                      day.isToday ? "text-blue-600 font-bold" : "text-slate-400"
                    }`}
                  >
                    {day.isToday ? "Active Today" : day.isOffDay ? "Rest" : "Scheduled"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 4. TAB 2: MY CERTIFICATES & SKILLS */}
      {activeTab === "certificates" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                {t("portal.myCertificatesTitle")}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Your certified competency levels and validity tracking across plant machines
              </p>
            </div>

            <Button
              onClick={() => setIsCertModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              {t("portal.submitCert")}
            </Button>
          </div>

          {/* Machine Qualification Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {certificates.map((cert) => {
              const isCertified = cert.level > 0;
              return (
                <div
                  key={cert.machine.id}
                  className={`rounded-2xl border p-5 transition-all ${
                    cert.status === "expiring_soon"
                      ? "border-amber-300 bg-amber-50/40 dark:border-amber-900/60 dark:bg-amber-950/20"
                      : cert.status === "expired"
                      ? "border-red-300 bg-red-50/40 dark:border-red-900/60 dark:bg-red-950/20"
                      : isCertified
                      ? "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
                      : "border-slate-200 bg-slate-50/60 opacity-60 dark:border-slate-800 dark:bg-slate-900/40"
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <span className="font-mono font-bold text-sm text-slate-900 dark:text-slate-100 block">
                        {cert.machine.code}
                      </span>
                      <span className="text-xs text-slate-600 dark:text-slate-400 font-semibold block truncate">
                        {locale === "hi" && cert.machine.nameHi ? cert.machine.nameHi : cert.machine.name}
                      </span>
                    </div>

                    <Badge
                      variant={
                        cert.level === 4
                          ? "blue"
                          : cert.level >= 2
                          ? "green"
                          : cert.level === 1
                          ? "amber"
                          : "neutral"
                      }
                    >
                      {cert.level === 4
                        ? "L4 Trainer"
                        : cert.level > 0
                        ? `Level ${cert.level}`
                        : "Not Qualified"}
                    </Badge>
                  </div>

                  {/* Level visual progress indicator */}
                  <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden mb-3">
                    <div
                      className={`h-full transition-all ${
                        cert.level === 4
                          ? "bg-blue-600 w-full"
                          : cert.level === 3
                          ? "bg-emerald-500 w-3/4"
                          : cert.level === 2
                          ? "bg-emerald-400 w-2/4"
                          : cert.level === 1
                          ? "bg-amber-400 w-1/4"
                          : "w-0"
                      }`}
                    />
                  </div>

                  <div className="text-xs space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between text-slate-500">
                      <span>{t("portal.validUntil")}:</span>
                      <span className="font-mono font-medium text-slate-900 dark:text-slate-100">
                        {cert.certifiedUntil || "None"}
                      </span>
                    </div>

                    {cert.status === "expiring_soon" && (
                      <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-semibold">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Renewal required in {cert.daysRemaining} days</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Submissions Audit Log */}
          {submissions.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-emerald-600" />
                {t("portal.submittedCerts")}
              </h3>

              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {submissions.map((sub) => (
                  <div key={sub.id} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold font-mono text-slate-900 dark:text-slate-100 mr-2">
                        {sub.certificateNumber}
                      </span>
                      <span className="text-slate-600 dark:text-slate-400">
                        Machine: {sub.skillId} · Level {sub.level}
                      </span>
                      <span className="block text-[10px] text-slate-400 mt-0.5">
                        Valid until {sub.certifiedUntil} · File: {sub.fileName || "attached.pdf"}
                      </span>
                    </div>

                    <Badge variant="green" className="text-[10px]">
                      {sub.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 5. TAB 3: APPLY LEAVE DAYS */}
      {activeTab === "leaves" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                {t("portal.tabLeaves")}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Manage your annual and casual leave balance and view submission history
              </p>
            </div>

            <Button
              onClick={() => setIsLeaveModalOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-2 self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              {t("portal.applyLeave")}
            </Button>
          </div>

          {/* Leave Quota Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <span className="text-xs text-slate-500 font-semibold uppercase">{t("portal.balance")}</span>
              <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-2 font-mono">
                {leaveSummary.balance}{" "}
                <span className="text-sm font-normal text-slate-400">/ {leaveSummary.totalQuota} days</span>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <span className="text-xs text-slate-500 font-semibold uppercase">{t("portal.taken")}</span>
              <div className="text-3xl font-black text-slate-700 dark:text-slate-300 mt-2 font-mono">
                {leaveSummary.daysTaken} <span className="text-sm font-normal text-slate-400">days</span>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <span className="text-xs text-slate-500 font-semibold uppercase">{t("portal.pending")}</span>
              <div className="text-3xl font-black text-amber-600 dark:text-amber-400 mt-2 font-mono">
                {leaveSummary.pendingCount} <span className="text-sm font-normal text-slate-400">requests</span>
              </div>
            </div>
          </div>

          {/* Leaves History Table */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {t("portal.leaveHistory")}
              </h3>
            </div>

            {leaves.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No leave applications recorded yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="p-3.5">{t("portal.leaveType")}</th>
                      <th className="p-3.5">{t("portal.dates")}</th>
                      <th className="p-3.5 text-center">{t("portal.days")}</th>
                      <th className="p-3.5">{t("portal.reason")}</th>
                      <th className="p-3.5 text-center">{t("portal.status")}</th>
                      <th className="p-3.5 text-right">{t("portal.actions")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                    {leaves.map((l) => (
                      <tr key={l.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                        <td className="p-3.5 font-semibold text-slate-900 dark:text-slate-100">
                          {l.leaveType}
                        </td>
                        <td className="p-3.5 font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          {l.startDate} to {l.endDate}
                        </td>
                        <td className="p-3.5 text-center font-bold text-slate-900 dark:text-slate-100">
                          {l.daysCount}
                        </td>
                        <td className="p-3.5 text-slate-600 dark:text-slate-400 max-w-xs truncate">
                          {l.reason}
                        </td>
                        <td className="p-3.5 text-center">
                          <Badge
                            variant={
                              l.status === "APPROVED" ? "green" : l.status === "PENDING" ? "amber" : "red"
                            }
                          >
                            {l.status}
                          </Badge>
                        </td>
                        <td className="p-3.5 text-right">
                          {l.status === "PENDING" && (
                            <button
                              onClick={() => {
                                if (confirm(t("portal.cancelConfirm"))) {
                                  cancelLeaveMutation.mutate(l.id);
                                }
                              }}
                              className="text-red-600 hover:text-red-700 font-semibold"
                            >
                              {t("portal.cancelLeave")}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL: APPLY FOR LEAVE ── */}
      {isLeaveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setIsLeaveModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">
              {t("portal.applyLeave")}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Submit your leave dates for supervisor approval
            </p>

            {leaveMsg && (
              <div
                className={`p-3 rounded-lg text-xs mb-4 ${
                  leaveMsg.type === "success"
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "bg-red-50 text-red-800 border border-red-200"
                }`}
              >
                {leaveMsg.text}
              </div>
            )}

            <div className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  {t("portal.leaveType")}
                </label>
                <select
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white p-2.5 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                >
                  <option value="CASUAL">{t("leaveTypes.CASUAL")}</option>
                  <option value="SICK">{t("leaveTypes.SICK")}</option>
                  <option value="ANNUAL">{t("leaveTypes.ANNUAL")}</option>
                  <option value="TRAINING">{t("leaveTypes.TRAINING")}</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    {t("portal.startDate")}
                  </label>
                  <input
                    type="date"
                    value={leaveStart}
                    onChange={(e) => setLeaveStart(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white p-2.5 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    {t("portal.endDate")}
                  </label>
                  <input
                    type="date"
                    value={leaveEnd}
                    onChange={(e) => setLeaveEnd(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white p-2.5 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  {t("portal.reason")}
                </label>
                <textarea
                  rows={3}
                  value={leaveReason}
                  onChange={(e) => setLeaveReason(e.target.value)}
                  placeholder="State the reason for leave request..."
                  className="w-full rounded-lg border border-slate-300 bg-white p-2.5 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <Button variant="outline" size="sm" onClick={() => setIsLeaveModalOpen(false)}>
                  {t("portal.cancel")}
                </Button>
                <Button
                  size="sm"
                  onClick={() => applyLeaveMutation.mutate()}
                  disabled={applyLeaveMutation.isPending}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {applyLeaveMutation.isPending ? "Submitting..." : t("portal.submit")}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: SUBMIT CERTIFICATE ── */}
      {isCertModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setIsCertModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">
              {t("portal.submitCert")}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Upload new qualification or renewal certificate for verification
            </p>

            {certMsg && (
              <div
                className={`p-3 rounded-lg text-xs mb-4 ${
                  certMsg.type === "success"
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "bg-red-50 text-red-800 border border-red-200"
                }`}
              >
                {certMsg.text}
              </div>
            )}

            <div className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Machine / Skill
                </label>
                <select
                  value={certSkillId}
                  onChange={(e) => setCertSkillId(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white p-2.5 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                >
                  <option value="">{locale === "hi" ? "मशीन चुनें..." : "Select Machine..."}</option>
                  {certificates.map((c) => (
                    <option key={c.machine.id} value={c.machine.id}>
                      {c.machine.code} - {locale === "hi" && c.machine.nameHi ? c.machine.nameHi : c.machine.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    {t("portal.certNumber")}
                  </label>
                  <input
                    type="text"
                    value={certNumber}
                    onChange={(e) => setCertNumber(e.target.value)}
                    placeholder="e.g. CERT-CNC-2026-01"
                    className="w-full rounded-lg border border-slate-300 bg-white p-2.5 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    {t("portal.achievedLevel")}
                  </label>
                  <select
                    value={certLevel}
                    onChange={(e) => setCertLevel(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 bg-white p-2.5 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  >
                    <option value={1}>L1 - {t("levels.1")}</option>
                    <option value={2}>L2 - {t("levels.2")}</option>
                    <option value={3}>L3 - {t("levels.3")}</option>
                    <option value={4}>L4 - {t("levels.4")}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    {t("portal.issueDate")}
                  </label>
                  <input
                    type="date"
                    value={certIssued}
                    onChange={(e) => setCertIssued(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white p-2.5 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    {t("portal.validUntil")}
                  </label>
                  <input
                    type="date"
                    value={certUntil}
                    onChange={(e) => setCertUntil(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white p-2.5 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  {t("portal.proofDocument")}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={certFile}
                    onChange={(e) => setCertFile(e.target.value)}
                    placeholder="Attach file or enter filename e.g. cnc_certification.pdf"
                    className="flex-1 rounded-lg border border-slate-300 bg-white p-2.5 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                  />
                  <div className="p-2.5 rounded-lg border border-slate-300 bg-slate-100 dark:bg-slate-800 text-slate-500">
                    <Upload className="w-4 h-4" />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <Button variant="outline" size="sm" onClick={() => setIsCertModalOpen(false)}>
                  {t("portal.cancel")}
                </Button>
                <Button
                  size="sm"
                  onClick={() => submitCertMutation.mutate()}
                  disabled={submitCertMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {submitCertMutation.isPending ? "Submitting..." : t("portal.save")}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
