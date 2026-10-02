"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useT } from "@/lib/i18n/useT";
import { Badge, Button, Modal, Skeleton } from "@quikit/ui";
import {
  Award,
  Search,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  ExternalLink,
  Calendar,
} from "lucide-react";

interface CertRecord {
  id: string;
  operatorId: string;
  operatorName: string;
  employeeCode: string;
  shiftCode: string;
  skillId: string;
  machineCode: string;
  machineName: string;
  level: number;
  certifiedUntil: string | null;
  issuedOn: string | null;
  daysRemaining: number | null;
  status: "valid" | "expiring_soon" | "overdue";
}

interface RawOperator {
  id: string;
  name: string;
  employeeCode: string;
  shiftCode?: string;
  shift?: { code: string };
}

interface RawSkill {
  id: string;
  code: string;
  name: string;
  nameHi?: string | null;
}

interface RawCell {
  operatorId: string;
  skillId: string;
  level: number;
  certifiedUntil?: string | null;
  issuedOn?: string | null;
}

interface GridApiResponse {
  operators?: RawOperator[];
  skills?: RawSkill[];
  cells?: RawCell[];
  matrix?: Record<string, Record<string, RawCell>>;
}

interface CertificationsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultFilter?: "ALL" | "EXPIRING" | "OVERDUE";
}

export function CertificationsModal({
  open,
  onOpenChange,
  defaultFilter = "ALL",
}: CertificationsModalProps) {
  const { t, locale } = useT();
  const [filter, setFilter] = useState<"ALL" | "EXPIRING" | "OVERDUE">(defaultFilter);
  const [search, setSearch] = useState("");

  React.useEffect(() => {
    if (open) {
      setFilter(defaultFilter);
    }
  }, [open, defaultFilter]);

  const { data: gridData, isLoading } = useQuery<GridApiResponse>({
    queryKey: ["grid-certifications"],
    queryFn: async () => {
      const res = await fetch("/api/grid");
      if (!res.ok) throw new Error("Failed to load certifications");
      const json = await res.json();
      return json.data;
    },
    enabled: open,
  });

  // Extract all certification records from the matrix
  const certs: CertRecord[] = React.useMemo(() => {
    if (!gridData) return [];
    const operators: RawOperator[] = Array.isArray(gridData.operators) ? gridData.operators : [];
    const skills: RawSkill[] = Array.isArray(gridData.skills) ? gridData.skills : [];
    const cells: RawCell[] = Array.isArray(gridData.cells)
      ? gridData.cells
      : gridData.matrix && typeof gridData.matrix === "object"
      ? Object.values(gridData.matrix).flatMap((row) =>
          row && typeof row === "object" ? Object.values(row) : []
        )
      : [];

    const now = new Date();
    const list: CertRecord[] = [];

    const opMap = new Map<string, RawOperator>(
      operators.map((o) => [o.id, o])
    );
    const skillMap = new Map<string, RawSkill>(
      skills.map((s) => [s.id, s])
    );

    for (const cell of cells) {
      if (cell && cell.level >= 2 && cell.certifiedUntil) {
        const op = opMap.get(cell.operatorId);
        const sk = skillMap.get(cell.skillId);
        if (!op || !sk) continue;

        const expiryDate = new Date(cell.certifiedUntil);
        const diffMs = expiryDate.getTime() - now.getTime();
        const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

        let status: "valid" | "expiring_soon" | "overdue" = "valid";
        if (daysRemaining < 0) {
          status = "overdue";
        } else if (daysRemaining <= 30) {
          status = "expiring_soon";
        }

        list.push({
          id: `${cell.operatorId}-${cell.skillId}`,
          operatorId: cell.operatorId,
          operatorName: op.name,
          employeeCode: op.employeeCode,
          shiftCode: op.shift?.code || op.shiftCode || "A",
          skillId: cell.skillId,
          machineCode: sk.code,
          machineName: locale === "hi" && sk.nameHi ? sk.nameHi : sk.name,
          level: cell.level,
          certifiedUntil: cell.certifiedUntil,
          issuedOn: cell.issuedOn || null,
          daysRemaining,
          status,
        });
      }
    }

    list.sort((a, b) => {
      if (a.daysRemaining === null) return 1;
      if (b.daysRemaining === null) return -1;
      return a.daysRemaining - b.daysRemaining;
    });

    return list;
  }, [gridData, locale]);

  const filteredCerts = certs.filter((c) => {
    const matchesSearch =
      c.operatorName.toLowerCase().includes(search.toLowerCase()) ||
      c.employeeCode.toLowerCase().includes(search.toLowerCase()) ||
      c.machineCode.toLowerCase().includes(search.toLowerCase()) ||
      c.machineName.toLowerCase().includes(search.toLowerCase());

    const matchesFilter =
      filter === "ALL" ||
      (filter === "EXPIRING" && c.status === "expiring_soon") ||
      (filter === "OVERDUE" && c.status === "overdue");

    return matchesSearch && matchesFilter;
  });

  const expiringCount = certs.filter((c) => c.status === "expiring_soon").length;
  const overdueCount = certs.filter((c) => c.status === "overdue").length;

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={
        locale === "hi"
          ? "ऑपरेटर प्रमाणन विस्तृत विवरण (Certifications Overview)"
          : "Operator Certifications Overview"
      }
      description={
        locale === "hi"
          ? "संयंत्र के सभी ऑपरेटरों की योग्यता प्रमाणपत्र वैधता, नवीनीकरण और समय सीमा स्थिति"
          : "Comprehensive audit of all active, expiring, and overdue operator competency certifications"
      }
    >
      <div className="space-y-4 max-h-[75vh] flex flex-col pt-1">
        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                locale === "hi"
                  ? "ऑपरेटर या मशीन कोड से खोजें..."
                  : "Search operator or machine..."
              }
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => setFilter("ALL")}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                filter === "ALL"
                  ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
              }`}
            >
              All ({certs.length})
            </button>

            <button
              type="button"
              onClick={() => setFilter("EXPIRING")}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                filter === "EXPIRING"
                  ? "bg-amber-600 text-white"
                  : "bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-900"
              }`}
            >
              Expiring ({expiringCount})
            </button>

            <button
              type="button"
              onClick={() => setFilter("OVERDUE")}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                filter === "OVERDUE"
                  ? "bg-red-600 text-white"
                  : "bg-red-50 text-red-800 dark:bg-red-950/60 dark:text-red-300 border border-red-200 dark:border-red-900"
              }`}
            >
              Overdue ({overdueCount})
            </button>
          </div>
        </div>

        {/* Certifications Table */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-y-auto flex-1 max-h-[460px]">
          {isLoading ? (
            <div className="p-6 space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : filteredCerts.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No certifications match the selected filter.
            </div>
          ) : (
            <table className="w-full border-collapse text-left text-xs">
              <thead className="sticky top-0 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                <tr>
                  <th className="p-2.5">Operator</th>
                  <th className="p-2.5">Workstation</th>
                  <th className="p-2.5 text-center">Level</th>
                  <th className="p-2.5 text-center">Certified Until</th>
                  <th className="p-2.5 text-center">Status</th>
                  <th className="p-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredCerts.map((cert) => {
                  return (
                    <tr
                      key={cert.id}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40"
                    >
                      <td className="p-2.5">
                        <span className="font-bold text-slate-900 dark:text-slate-100 block">
                          {cert.operatorName}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {cert.employeeCode} · Shift {cert.shiftCode}
                        </span>
                      </td>

                      <td className="p-2.5">
                        <span className="font-bold font-mono text-slate-800 dark:text-slate-200 block">
                          {cert.machineCode}
                        </span>
                        <span className="text-[11px] text-slate-500 block truncate max-w-[150px]">
                          {cert.machineName}
                        </span>
                      </td>

                      <td className="p-2.5 text-center">
                        <Badge
                          variant={
                            cert.level >= 4
                              ? "blue"
                              : cert.level === 3
                              ? "green"
                              : "neutral"
                          }
                        >
                          {cert.level >= 4 ? "L4 Trainer" : `Level ${cert.level}`}
                        </Badge>
                      </td>

                      <td className="p-2.5 text-center font-mono text-[11px]">
                        {cert.certifiedUntil || "N/A"}
                      </td>

                      <td className="p-2.5 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            cert.status === "overdue"
                              ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border border-red-300"
                              : cert.status === "expiring_soon"
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300"
                              : "bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                          }`}
                        >
                          {cert.status === "overdue"
                            ? `Overdue (${Math.abs(cert.daysRemaining || 0)}d)`
                            : cert.status === "expiring_soon"
                            ? `${cert.daysRemaining}d left`
                            : "Valid"}
                        </span>
                      </td>

                      <td className="p-2.5 text-right">
                        <Link
                          href={`/grid`}
                          onClick={() => onOpenChange(false)}
                          className="text-[11px] text-blue-600 hover:text-blue-800 dark:text-blue-400 font-semibold inline-flex items-center gap-1"
                        >
                          Open in Grid <ExternalLink className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="flex justify-end pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            {t("common.close")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
