"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useT } from "@/lib/i18n/useT";
import { Card, Button, Badge, Skeleton, EmptyState, Modal } from "@quikit/ui";
import {
  CalendarCheck,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Search,
  Filter,
  AlertTriangle,
  Calendar,
  ChevronRight,
  ShieldCheck,
  Check,
  X,
  FileText,
} from "lucide-react";

interface EnrichedLeave {
  id: string;
  operatorId: string;
  leaveType: "CASUAL" | "SICK" | "ANNUAL" | "TRAINING";
  startDate: string;
  endDate: string;
  daysCount: number;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  submittedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  operator: {
    id: string;
    name: string;
    employeeCode: string;
    shiftCode: string;
    shiftTimings: string;
  };
}

export default function LeaveApprovalsPage() {
  const { t, locale } = useT();
  const { data: session } = useSession();
  const queryClient = useQueryClient();

  const userRole = session?.user?.membershipRole || "member";

  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedLeaveForAction, setSelectedLeaveForAction] = useState<{
    leave: EnrichedLeave;
    action: "APPROVED" | "REJECTED";
  } | null>(null);
  const [reviewNotes, setReviewNotes] = useState<string>("");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Fetch all leaves
  const { data, isLoading, refetch } = useQuery<{
    leaves: EnrichedLeave[];
    summary: { total: number; pending: number; approved: number; rejected: number };
  }>({
    queryKey: ["admin-leaves"],
    queryFn: async () => {
      const res = await fetch("/api/admin/leaves");
      if (!res.ok) throw new Error("Failed to load leave applications");
      const json = await res.json();
      return json.data;
    },
    refetchInterval: 10000,
  });

  // Review mutation
  const reviewMutation = useMutation({
    mutationFn: async ({
      leaveId,
      status,
      notes,
    }: {
      leaveId: string;
      status: "APPROVED" | "REJECTED";
      notes?: string;
    }) => {
      const res = await fetch("/api/admin/leaves", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leaveId, status, notes }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update leave status");
      }
      return await res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-leaves"] });
      queryClient.invalidateQueries({ queryKey: ["member-portal-data"] });
      setFeedback({
        type: "success",
        text:
          variables.status === "APPROVED"
            ? locale === "hi"
              ? "अवकाश सफलतापूर्वक स्वीकृत कर दिया गया है!"
              : "Leave request approved successfully!"
            : locale === "hi"
            ? "अवकाश अनुरोध अस्वीकार कर दिया गया है।"
            : "Leave request rejected.",
      });
      setSelectedLeaveForAction(null);
      setReviewNotes("");
      setTimeout(() => setFeedback(null), 4000);
    },
    onError: (err: any) => {
      setFeedback({ type: "error", text: err.message });
      setTimeout(() => setFeedback(null), 4000);
    },
  });

  const leaves = data?.leaves || [];
  const summary = data?.summary || { total: 0, pending: 0, approved: 0, rejected: 0 };

  // Filter leaves
  const filteredLeaves = leaves.filter((leave) => {
    if (statusFilter !== "ALL" && leave.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = leave.operator.name.toLowerCase().includes(q);
      const matchCode = leave.operator.employeeCode.toLowerCase().includes(q);
      const matchReason = leave.reason.toLowerCase().includes(q);
      if (!matchName && !matchCode && !matchReason) return false;
    }
    return true;
  });

  const getLeaveTypeLabel = (type: string) => {
    switch (type) {
      case "CASUAL":
        return t("leaveTypes.CASUAL");
      case "SICK":
        return t("leaveTypes.SICK");
      case "ANNUAL":
        return t("leaveTypes.ANNUAL");
      case "TRAINING":
        return t("leaveTypes.TRAINING");
      default:
        return type;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

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
          <h1
            className="text-2xl font-bold tracking-tight flex items-center gap-2.5"
            style={{ color: "rgb(var(--text))" }}
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: "rgb(37 99 235 / 0.1)" }}
            >
              <CalendarCheck className="w-4.5 h-4.5" style={{ color: "rgb(37 99 235)" }} />
            </div>
            {t("leaveApprovals.title")}
          </h1>
          <p
            className="text-sm mt-1"
            style={{ color: "rgb(var(--text-muted))" }}
          >
            {t("leaveApprovals.subtitle")}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/admin">
            <Button variant="outline" size="sm">
              <ShieldCheck className="w-4 h-4 mr-1.5" style={{ color: "rgb(var(--text-muted))" }} />
              {t("nav.admin")}
            </Button>
          </Link>
        </div>
      </div>

      {/* Feedback banner */}
      {feedback && (
        <div
          className={`p-4 rounded-xl text-sm font-medium flex items-center gap-2.5 shadow-sm transition-all ${
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
              : "bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-300 border border-red-200 dark:border-red-800"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <XCircle className="w-5 h-5 text-red-600 shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          onClick={() => setStatusFilter("ALL")}
          className={`p-4 rounded-xl border text-left transition-all ${
            statusFilter === "ALL"
              ? "border-blue-500 bg-blue-50/70 dark:bg-blue-950/40 ring-2 ring-blue-400"
              : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900"
          }`}
        >
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
            {t("leaveApprovals.all")}
          </span>
          <span className="text-2xl font-black font-mono text-slate-900 dark:text-slate-100 mt-1 block">
            {summary.total}
          </span>
        </button>

        <button
          onClick={() => setStatusFilter("PENDING")}
          className={`p-4 rounded-xl border text-left transition-all ${
            statusFilter === "PENDING"
              ? "border-amber-500 bg-amber-50/70 dark:bg-amber-950/40 ring-2 ring-amber-400"
              : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider">
              {t("leaveApprovals.pending")}
            </span>
            {summary.pending > 0 && (
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
            )}
          </div>
          <span className="text-2xl font-black font-mono text-amber-600 dark:text-amber-400 mt-1 block">
            {summary.pending}
          </span>
        </button>

        <button
          onClick={() => setStatusFilter("APPROVED")}
          className={`p-4 rounded-xl border text-left transition-all ${
            statusFilter === "APPROVED"
              ? "border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 ring-2 ring-emerald-400"
              : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900"
          }`}
        >
          <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider block">
            {t("leaveApprovals.approved")}
          </span>
          <span className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1 block">
            {summary.approved}
          </span>
        </button>

        <button
          onClick={() => setStatusFilter("REJECTED")}
          className={`p-4 rounded-xl border text-left transition-all ${
            statusFilter === "REJECTED"
              ? "border-red-500 bg-red-50/70 dark:bg-red-950/40 ring-2 ring-red-400"
              : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900"
          }`}
        >
          <span className="text-xs font-bold text-red-700 dark:text-red-300 uppercase tracking-wider block">
            {t("leaveApprovals.rejected")}
          </span>
          <span className="text-2xl font-black font-mono text-red-600 dark:text-red-400 mt-1 block">
            {summary.rejected}
          </span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("gridHelper.searchPlaceholder")}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2">
          {["ALL", "PENDING", "APPROVED", "REJECTED"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === st
                  ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400"
              }`}
            >
              {st === "ALL"
                ? t("leaveApprovals.all")
                : st === "PENDING"
                ? t("leaveApprovals.pending")
                : st === "APPROVED"
                ? t("leaveApprovals.approved")
                : t("leaveApprovals.rejected")}
            </button>
          ))}
        </div>
      </div>

      {/* Leave Requests Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        {filteredLeaves.length === 0 ? (
          <div className="p-12 text-center">
            <EmptyState
              icon={<CalendarCheck className="w-12 h-12 text-slate-400" />}
              title={t("leaveApprovals.empty")}
              description={t("leaveApprovals.emptyDesc")}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 font-semibold text-slate-700 dark:text-slate-300">
                <tr>
                  <th className="p-3.5">{t("common.operator")}</th>
                  <th className="p-3.5">{t("common.shift")}</th>
                  <th className="p-3.5">{t("portal.leaveType")}</th>
                  <th className="p-3.5">{t("portal.startDate")} & {t("portal.endDate")}</th>
                  <th className="p-3.5">{t("portal.days")}</th>
                  <th className="p-3.5 max-w-xs">{t("portal.reason")}</th>
                  <th className="p-3.5">{t("common.status")}</th>
                  <th className="p-3.5 text-right">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredLeaves.map((leave) => {
                  const isPending = leave.status === "PENDING";
                  const isApproved = leave.status === "APPROVED";
                  const isRejected = leave.status === "REJECTED";

                  return (
                    <tr
                      key={leave.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-850/40 transition-colors"
                    >
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                          {leave.operator.name}
                        </div>
                        <span className="text-[11px] text-slate-500 font-mono">
                          {leave.operator.employeeCode}
                        </span>
                      </td>

                      <td className="p-3.5">
                        <Badge variant="blue" className="text-[11px] font-mono">
                          {t("common.shift")} {leave.operator.shiftCode}
                        </Badge>
                        <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">
                          {leave.operator.shiftTimings}
                        </span>
                      </td>

                      <td className="p-3.5">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {getLeaveTypeLabel(leave.leaveType)}
                        </span>
                      </td>

                      <td className="p-3.5 font-mono text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        <div>{leave.startDate}</div>
                        <div className="text-[10px] text-slate-400">→ {leave.endDate}</div>
                      </td>

                      <td className="p-3.5">
                        <span className="font-bold font-mono text-slate-900 dark:text-slate-100 text-sm">
                          {leave.daysCount}
                        </span>{" "}
                        <span className="text-slate-500">{t("portal.days")}</span>
                      </td>

                      <td className="p-3.5 max-w-xs text-slate-600 dark:text-slate-300">
                        <p className="line-clamp-2 leading-relaxed">
                          {leave.reason}
                        </p>
                        {leave.reviewedBy && (
                          <span className="text-[10px] text-slate-400 block mt-1">
                            Reviewed by: {leave.reviewedBy}
                          </span>
                        )}
                      </td>

                      <td className="p-3.5">
                        <Badge
                          variant={
                            isApproved
                              ? "green"
                              : isPending
                              ? "amber"
                              : "red"
                          }
                        >
                          {isPending
                            ? t("leaveApprovals.pending")
                            : isApproved
                            ? t("leaveApprovals.approved")
                            : t("leaveApprovals.rejected")}
                        </Badge>
                      </td>

                      <td className="p-3.5 text-right whitespace-nowrap">
                        {isPending ? (
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-2.5 py-1"
                              onClick={() =>
                                setSelectedLeaveForAction({ leave, action: "APPROVED" })
                              }
                            >
                              <Check className="w-3.5 h-3.5 mr-1" />
                              {t("leaveApprovals.approveBtn")}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 text-xs px-2.5 py-1"
                              onClick={() =>
                                setSelectedLeaveForAction({ leave, action: "REJECTED" })
                              }
                            >
                              <X className="w-3.5 h-3.5 mr-1" />
                              {t("leaveApprovals.rejectBtn")}
                            </Button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-medium">
                            {leave.reviewedAt?.slice(0, 10) || "Done"}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirmation & Note Modal */}
      {selectedLeaveForAction && (
        <Modal
          open={Boolean(selectedLeaveForAction)}
          onOpenChange={(open) => {
            if (!open) setSelectedLeaveForAction(null);
          }}
          title={
            selectedLeaveForAction.action === "APPROVED"
              ? locale === "hi"
                ? "अवकाश स्वीकृत करें"
                : "Approve Leave Request"
              : locale === "hi"
              ? "अवकाश अस्वीकार करें"
              : "Reject Leave Request"
          }
          description={`${selectedLeaveForAction.leave.operator.name} (${selectedLeaveForAction.leave.operator.employeeCode}) - ${getLeaveTypeLabel(selectedLeaveForAction.leave.leaveType)} (${selectedLeaveForAction.leave.daysCount} ${t("portal.days")})`}
        >
          <div className="space-y-4 text-xs mt-3">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700">
              <div className="text-slate-500 mb-1">{t("portal.reason")}:</div>
              <p className="text-slate-800 dark:text-slate-200 font-medium">
                {selectedLeaveForAction.leave.reason}
              </p>
              <div className="text-slate-400 text-[11px] mt-2 font-mono">
                {selectedLeaveForAction.leave.startDate} to {selectedLeaveForAction.leave.endDate}
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                {t("portal.notes")} ({locale === "hi" ? "वैकल्पिक" : "Optional"})
              </label>
              <textarea
                rows={2}
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder={t("leaveApprovals.notesPlaceholder")}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 p-2.5 text-xs text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedLeaveForAction(null)}
              >
                {t("common.close")}
              </Button>
              <Button
                size="sm"
                className={
                  selectedLeaveForAction.action === "APPROVED"
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                    : "bg-red-600 hover:bg-red-700 text-white"
                }
                onClick={() =>
                  reviewMutation.mutate({
                    leaveId: selectedLeaveForAction.leave.id,
                    status: selectedLeaveForAction.action,
                    notes: reviewNotes,
                  })
                }
                disabled={reviewMutation.isPending}
              >
                {selectedLeaveForAction.action === "APPROVED"
                  ? t("leaveApprovals.approveBtn")
                  : t("leaveApprovals.rejectBtn")}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
