"use client";

import React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useT } from "@/lib/i18n/useT";
import { today } from "@/lib/domain/rules";
import { Badge, Button, Skeleton } from "@quikit/ui";
import {
  Printer,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Award,
  ShieldCheck,
} from "lucide-react";

export default function VerdictReportPage() {
  const { t, locale } = useT();
  const searchParams = useSearchParams();

  const operatorId = searchParams.get("operatorId") || "op-001";
  const skillId = searchParams.get("skillId") || "sk-cnc-l1";
  const assignmentDate = searchParams.get("assignmentDate") || today();
  const shiftId = searchParams.get("shiftId") || "shift-a";

  const { data: cert, isLoading, isError } = useQuery({
    queryKey: ["report-verdict", operatorId, skillId, assignmentDate, shiftId],
    queryFn: async () => {
      const res = await fetch(
        `/api/reports/verdict?operatorId=${operatorId}&skillId=${skillId}&assignmentDate=${assignmentDate}&shiftId=${shiftId}`
      );
      if (!res.ok) throw new Error("Failed to load verdict certificate");
      const json = await res.json();
      return json.data;
    },
  });

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto p-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (isError || !cert) {
    return (
      <div className="p-8 text-center text-red-600 bg-red-50 rounded-xl">
        Failed to generate qualification certificate.
      </div>
    );
  }

  const isGreen = cert.verdict === "green";
  const skillDisplayName =
    locale === "hi" && cert.skill.nameHi ? cert.skill.nameHi : cert.skill.name;

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-12 print:p-0 print:max-w-none">
      {/* Top Actions */}
      <div className="flex items-center justify-between print:hidden">
        <Link
          href="/assign"
          className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 inline-flex items-center gap-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Assignment Check
        </Link>

        <Button variant="primary" size="sm" onClick={handlePrint}>
          <Printer className="w-3.5 h-3.5 mr-1.5" />
          Print Certificate
        </Button>
      </div>

      {/* Official Certificate Box */}
      <div className="rounded-2xl border-2 border-slate-300 bg-white p-8 shadow-md dark:border-slate-700 dark:bg-slate-900 space-y-6 print:border-2 print:shadow-none print:p-6">
        {/* Certificate Title Header */}
        <div className="text-center border-b-2 border-slate-200 dark:border-slate-800 pb-5">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest block font-mono">
            SKILLSFORGE QUALITY & INDUSTRIAL COMPLIANCE
          </span>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100 mt-1">
            OPERATOR DISPATCH QUALIFICATION CERTIFICATE
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Form SF-QA-22: Mandatory Safety & Proficiency Verification
          </p>
        </div>

        {/* Verdict Badge Big Banner */}
        <div
          className={`p-5 rounded-xl border flex items-center justify-between gap-4 ${
            isGreen
              ? "bg-emerald-50 border-emerald-300 text-emerald-950 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-200"
              : "bg-red-50 border-red-300 text-red-950 dark:bg-red-950/40 dark:border-red-800 dark:text-red-200"
          }`}
        >
          <div className="flex items-center gap-3">
            {isGreen ? (
              <CheckCircle2 className="w-10 h-10 text-emerald-600 shrink-0" />
            ) : (
              <XCircle className="w-10 h-10 text-red-600 shrink-0" />
            )}
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider block opacity-75">
                Official Qualification Verdict
              </span>
              <span className="text-xl font-extrabold tracking-tight">
                {isGreen ? "QUALIFIED & AUTHORIZED FOR DISPATCH" : "REJECTED - DISPATCH PROHIBITED"}
              </span>
            </div>
          </div>

          <Badge variant={isGreen ? "green" : "red"}>
            {isGreen ? "APPROVED" : "REJECTED"}
          </Badge>
        </div>

        {/* Dispatch Parameters Grid */}
        <div className="grid grid-cols-2 gap-4 text-sm bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800 font-mono text-xs">
          <div>
            <span className="text-slate-400 block uppercase font-bold text-[10px]">
              Operator:
            </span>
            <span className="font-bold text-slate-800 dark:text-slate-100 text-sm">
              {cert.operator.name}
            </span>
            <span className="text-slate-500 block">ID: {cert.operator.employeeCode}</span>
          </div>

          <div>
            <span className="text-slate-400 block uppercase font-bold text-[10px]">
              Target Machine:
            </span>
            <span className="font-bold text-slate-800 dark:text-slate-100 text-sm">
              {cert.skill.code}
            </span>
            <span className="text-slate-500 block">{skillDisplayName}</span>
          </div>

          <div>
            <span className="text-slate-400 block uppercase font-bold text-[10px]">
              Assignment Date:
            </span>
            <span className="font-bold text-slate-800 dark:text-slate-100">
              {cert.asOf}
            </span>
          </div>

          <div>
            <span className="text-slate-400 block uppercase font-bold text-[10px]">
              Shift:
            </span>
            <span className="font-bold text-slate-800 dark:text-slate-100">
              Shift {cert.shift?.code || "A"} ({cert.shift?.startTime} - {cert.shift?.endTime})
            </span>
          </div>
        </div>

        {/* Audited Rule Evaluation Criteria */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Automated Rule Check Audit
          </h3>

          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            <div className="py-2.5 flex items-center justify-between">
              <span className="text-slate-600 dark:text-slate-400">
                1. Minimum Proficiency Level (Level ≥ 2 required)
              </span>
              <span className="font-bold font-mono">
                {cert.record ? `Level ${cert.record.level}` : "Level 0 (No record)"}
              </span>
            </div>

            <div className="py-2.5 flex items-center justify-between">
              <span className="text-slate-600 dark:text-slate-400">
                2. Certification Validity on Dispatch Date
              </span>
              <span className="font-bold font-mono">
                {cert.record?.certifiedUntil ? cert.record.certifiedUntil : "No Expiry Recorded"}
              </span>
            </div>

            <div className="py-2.5 flex items-center justify-between">
              <span className="text-slate-600 dark:text-slate-400">
                3. Shift Assignment Matching
              </span>
              <span className="font-bold font-mono">
                {cert.operator.shiftId === (cert.shift?.id || cert.operator.shiftId)
                  ? "Aligned"
                  : "Cross-Shift"}
              </span>
            </div>
          </div>
        </div>

        {/* Blocking reasons if any */}
        {cert.blocking && cert.blocking.length > 0 && (
          <div className="p-4 rounded-xl bg-red-50 text-red-900 border border-red-200 dark:bg-red-950/40 dark:border-red-900 dark:text-red-200 space-y-1.5 text-xs">
            <span className="font-bold uppercase tracking-wider block">
              Blocking Qualification Infractions:
            </span>
            {cert.blocking.map((b: any, idx: number) => (
              <div key={idx} className="flex items-center gap-2">
                <XCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                <span>{b.message}</span>
              </div>
            ))}
          </div>
        )}

        {/* Signatures and Timestamp */}
        <div className="pt-8 border-t-2 border-slate-200 dark:border-slate-800 text-xs flex justify-between items-end">
          <div>
            <span className="text-[11px] text-slate-400 block font-mono">
              Generated by: {cert.generatedBy}
            </span>
            <span className="text-[11px] text-slate-400 block font-mono">
              Audit Timestamp: {cert.generatedAt}
            </span>
          </div>

          <div className="flex gap-10">
            <div className="w-36 border-t border-slate-400 text-center pt-1 font-mono text-[11px]">
              Operator Signature
            </div>
            <div className="w-36 border-t border-slate-400 text-center pt-1 font-mono text-[11px]">
              Supervisor Signoff
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
