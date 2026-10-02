"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useT } from "@/lib/i18n/useT";
import { today } from "@/lib/domain/rules";
import { VerdictPayload } from "@/lib/domain/verdict";
import { Badge, Button, Card, DateInput, Field, Select, Skeleton } from "@quikit/ui";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Printer,
  UserCheck,
  ShieldAlert,
  ArrowRight,
} from "lucide-react";

export default function AssignPage() {
  const { t, locale } = useT();
  const queryClient = useQueryClient();

  const [operatorId, setOperatorId] = useState<string>("");
  const [skillId, setSkillId] = useState<string>("");
  const [assignmentDate, setAssignmentDate] = useState<string>(today());
  const [shiftId, setShiftId] = useState<string>("");
  const [actionMessage, setActionMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // 1. Fetch operators
  const { data: opData, isLoading: opsLoading } = useQuery({
    queryKey: ["operators"],
    queryFn: async () => {
      const res = await fetch("/api/operators?limit=100");
      if (!res.ok) throw new Error("Failed to load operators");
      const json = await res.json();
      return json.data.data;
    },
  });

  // 2. Fetch machines
  const { data: skillData, isLoading: skillsLoading } = useQuery({
    queryKey: ["skills"],
    queryFn: async () => {
      const res = await fetch("/api/skills?limit=100");
      if (!res.ok) throw new Error("Failed to load machines");
      const json = await res.json();
      return json.data.data;
    },
  });

  // Default selection once loaded
  useEffect(() => {
    if (opData && opData.length > 0 && !operatorId) {
      setOperatorId(opData[0].id);
      setShiftId(opData[0].shiftId);
    }
  }, [opData, operatorId]);

  useEffect(() => {
    if (skillData && skillData.length > 0 && !skillId) {
      setSkillId(skillData[0].id);
    }
  }, [skillData, skillId]);

  // Update shiftId when operator changes
  const handleOperatorChange = (newOpId: string) => {
    setOperatorId(newOpId);
    const op = opData?.find((o: any) => o.id === newOpId);
    if (op) setShiftId(op.shiftId);
  };

  // 3. Live qualification check query
  const checkUrl = `/api/assignments/check?operatorId=${operatorId}&skillId=${skillId}&assignmentDate=${assignmentDate}&shiftId=${shiftId}`;
  const {
    data: verdict,
    isLoading: checkLoading,
    isFetching: checkFetching,
  } = useQuery<VerdictPayload>({
    queryKey: ["assignment-check", operatorId, skillId, assignmentDate, shiftId],
    queryFn: async () => {
      const res = await fetch(checkUrl);
      if (!res.ok) throw new Error("Failed to check assignment");
      const json = await res.json();
      return json.data;
    },
    enabled: Boolean(operatorId && skillId),
  });

  // 4. Mutation to create assignment
  const assignMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operatorId,
          skillId,
          assignmentDate,
          shiftId,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || t("assign.assignRejected"));
      }
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coverage"] });
      queryClient.invalidateQueries({ queryKey: ["workload"] });
      setActionMessage({
        type: "success",
        text: t("assign.assignSuccess"),
      });
      setTimeout(() => setActionMessage(null), 5000);
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : t("assign.assignRejected");
      setActionMessage({
        type: "error",
        text: msg,
      });
    },
  });

  if (opsLoading || skillsLoading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto p-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const selectedOp = opData?.find((o: any) => o.id === operatorId);
  const selectedMachine = skillData?.find((s: any) => s.id === skillId);
  const isGreen = verdict?.verdict === "green";

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
          {t("assign.title")}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {t("assign.subtitle")}
        </p>
      </div>

      {/* Action Notification */}
      {actionMessage && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between gap-3 animate-fade-in ${
            actionMessage.type === "success"
              ? "bg-emerald-50 border-emerald-300 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300"
              : "bg-red-50 border-red-300 text-red-800 dark:bg-red-950/40 dark:border-red-800 dark:text-red-300"
          }`}
        >
          <div className="flex items-center gap-2">
            {actionMessage.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <XCircle className="w-5 h-5 text-red-600 shrink-0" />
            )}
            <span className="text-sm font-semibold">{actionMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionMessage(null)}
            className="text-xs font-bold hover:underline"
          >
            {t("common.close")}
          </button>
        </div>
      )}

      {/* Input Selection Form */}
      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Field label={t("assign.selectOperator")}>
            <Select
              value={operatorId}
              onChange={(e) => handleOperatorChange(e.target.value)}
            >
              {opData?.map((op: any) => (
                <option key={op.id} value={op.id}>
                  {op.name} ({op.employeeCode})
                </option>
              ))}
            </Select>
          </Field>

          <Field label={t("assign.selectMachine")}>
            <Select
              value={skillId}
              onChange={(e) => setSkillId(e.target.value)}
            >
              {skillData?.map((sk: any) => {
                const displayName = locale === "hi" && sk.nameHi ? sk.nameHi : sk.name;
                return (
                  <option key={sk.id} value={sk.id}>
                    {sk.code} - {displayName}
                  </option>
                );
              })}
            </Select>
          </Field>

          <Field label={t("assign.selectDate")}>
            <DateInput
              value={assignmentDate}
              onChange={(e) => setAssignmentDate(e.target.value)}
            />
          </Field>

          <Field label={t("assign.selectShift")}>
            <Select
              value={shiftId}
              onChange={(e) => setShiftId(e.target.value)}
            >
              <option value="shift-a">Shift A (06:00 - 14:00)</option>
              <option value="shift-b">Shift B (14:00 - 22:00)</option>
              <option value="shift-c">Shift C (22:00 - 06:00)</option>
            </Select>
          </Field>
        </div>
      </Card>

      {/* Qualification Verdict Card */}
      {checkLoading ? (
        <Skeleton className="h-56 w-full rounded-xl" />
      ) : verdict ? (
        <div
          className={`rounded-2xl border p-6 transition-all shadow-md ${
            isGreen
              ? "bg-gradient-to-br from-emerald-50 to-emerald-100/60 border-emerald-300 dark:from-emerald-950/40 dark:to-emerald-900/20 dark:border-emerald-800"
              : "bg-gradient-to-br from-red-50 to-red-100/60 border-red-300 dark:from-red-950/40 dark:to-red-900/20 dark:border-red-800"
          }`}
        >
          {/* Verdict Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-5 border-b border-black/10 dark:border-white/10 gap-3">
            <div className="flex items-center gap-3">
              <div
                className={`p-3 rounded-xl shrink-0 ${
                  isGreen
                    ? "bg-emerald-600 text-white shadow-emerald-200"
                    : "bg-red-600 text-white shadow-red-200"
                }`}
              >
                {isGreen ? (
                  <CheckCircle2 className="w-8 h-8" />
                ) : (
                  <XCircle className="w-8 h-8" />
                )}
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  {t("assign.verdictTitle")}
                </span>
                <h2
                  className={`text-2xl font-black tracking-tight ${
                    isGreen
                      ? "text-emerald-800 dark:text-emerald-300"
                      : "text-red-800 dark:text-red-300"
                  }`}
                >
                  {isGreen ? t("assign.verdict.green") : t("assign.verdict.red")}
                </h2>
              </div>
            </div>

            {/* Actions: Deploy button and Print verdict */}
            <div className="flex items-center gap-2">
              <Link
                href={`/reports/verdict?operatorId=${operatorId}&skillId=${skillId}&assignmentDate=${assignmentDate}&shiftId=${shiftId}`}
                target="_blank"
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <Printer className="w-3.5 h-3.5" />
                {t("assign.printVerdict")}
              </Link>

              <Button
                variant={isGreen ? "primary" : "destructive"}
                size="md"
                onClick={() => assignMutation.mutate()}
                disabled={assignMutation.isPending}
              >
                <UserCheck className="w-4 h-4 mr-1.5" />
                {assignMutation.isPending ? t("common.loading") : t("assign.assignBtn")}
              </Button>
            </div>
          </div>

          {/* Blocking Reasons & Warnings */}
          <div className="pt-5 space-y-4">
            {/* Blocking reasons */}
            {verdict.blocking.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-red-800 dark:text-red-300 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4" />
                  {t("assign.blockingReasons")} ({verdict.blocking.length})
                </h3>
                <div className="space-y-1.5">
                  {verdict.blocking.map((reason, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg bg-red-100/80 text-red-900 text-sm font-medium dark:bg-red-950/60 dark:text-red-200 border border-red-200 dark:border-red-900 flex items-center gap-2"
                    >
                      <XCircle className="w-4 h-4 text-red-600 shrink-0" />
                      <span>{reason.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Warnings */}
            {verdict.warnings.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" />
                  {t("assign.warnings")} ({verdict.warnings.length})
                </h3>
                <div className="space-y-1.5">
                  {verdict.warnings.map((warn, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg bg-amber-100/80 text-amber-900 text-sm font-medium dark:bg-amber-950/60 dark:text-amber-200 border border-amber-200 dark:border-amber-900 flex items-center gap-2"
                    >
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>{warn.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Approved Details if Green */}
            {isGreen && verdict.warnings.length === 0 && (
              <div className="p-3 rounded-lg bg-emerald-100/70 text-emerald-900 text-sm font-medium dark:bg-emerald-950/40 dark:text-emerald-200 border border-emerald-200 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  All operator qualification criteria, certification validity, shift alignment, and workload fairness constraints are satisfied.
                </span>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* Smart Recommended Alternatives (MVP-3) */}
      {verdict && verdict.alternatives && verdict.alternatives.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-accent-600 dark:text-accent-400" />
              {t("assign.alternativesTitle")}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Ranked by same shift first, lowest trailing 14-day workload, valid unexpired certification, and higher proficiency
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {verdict.alternatives.map((alt) => (
              <div
                key={alt.operatorId}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-100/60 dark:border-slate-800 dark:bg-slate-850/50 dark:hover:bg-slate-800/80 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                      {alt.name}
                    </span>
                    <Badge variant={alt.level >= 4 ? "blue" : "green"}>
                      Level {alt.level}
                    </Badge>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 mb-3">
                    {alt.why}
                  </p>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setOperatorId(alt.operatorId);
                    setShiftId(alt.shiftId);
                  }}
                  className="w-full justify-center"
                >
                  {t("assign.assignInstead")} <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
