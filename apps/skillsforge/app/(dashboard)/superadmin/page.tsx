"use client";

import React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useT } from "@/lib/i18n/useT";
import { Badge, Button, EmptyState, Skeleton } from "@quikit/ui";
import { ShieldCheck, ShieldAlert, Building2, Users, Wrench, AlertTriangle, Clock } from "lucide-react";

interface SuperadminOrgSummary {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  operatorCount: number;
  machineCount: number;
  shiftCount: number;
  openAlertsCount: number;
}

export default function SuperadminPage() {
  const { t } = useT();
  const { data: session } = useSession();
  const isSuperAdmin = Boolean(session?.user?.isSuperAdmin);

  // Fetch multi-org summaries
  const { data: orgsData, isLoading } = useQuery<SuperadminOrgSummary[]>({
    queryKey: ["superadmin-orgs"],
    enabled: isSuperAdmin,
    queryFn: async () => {
      const res = await fetch("/api/superadmin/orgs");
      if (!res.ok) throw new Error("Failed to load organizations");
      const json = await res.json();
      return json.data || [];
    },
  });

  // Client-side guard for non-superadmins
  if (!isSuperAdmin) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 flex items-center justify-center mx-auto mb-4 shadow-sm">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
          {t("superadmin.accessRestricted")}
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
          {t("superadmin.accessRestrictedDesc")}
        </p>
        <Link href="/">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white">
            {t("nav.dashboard")}
          </Button>
        </Link>
      </div>
    );
  }

  const orgs = orgsData || [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
          <ShieldCheck className="w-7 h-7 text-blue-600 dark:text-blue-400" />
          {t("superadmin.title")}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {t("superadmin.subtitle")}
        </p>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : orgs.length > 0 ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500">
              <tr>
                <th className="p-3 font-semibold">{t("superadmin.orgName")}</th>
                <th className="p-3 font-semibold">{t("superadmin.slug")}</th>
                <th className="p-3 font-semibold text-center">{t("superadmin.operators")}</th>
                <th className="p-3 font-semibold text-center">{t("superadmin.machines")}</th>
                <th className="p-3 font-semibold text-center">{t("superadmin.shifts")}</th>
                <th className="p-3 font-semibold text-center">{t("superadmin.openAlerts")}</th>
                <th className="p-3 font-semibold text-right">{t("superadmin.created")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {orgs.map((org) => (
                <tr key={org.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/50">
                  <td className="p-3 font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-blue-600" />
                    {org.name}
                  </td>
                  <td className="p-3 font-mono text-slate-500 text-[11px]">
                    {org.slug}
                  </td>
                  <td className="p-3 text-center font-semibold text-slate-800 dark:text-slate-200">
                    <span className="inline-flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      {org.operatorCount}
                    </span>
                  </td>
                  <td className="p-3 text-center font-semibold text-slate-800 dark:text-slate-200">
                    <span className="inline-flex items-center gap-1">
                      <Wrench className="w-3.5 h-3.5 text-slate-400" />
                      {org.machineCount}
                    </span>
                  </td>
                  <td className="p-3 text-center font-semibold text-slate-800 dark:text-slate-200">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {org.shiftCount}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <Badge variant={org.openAlertsCount > 0 ? "amber" : "green"}>
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      {org.openAlertsCount}
                    </Badge>
                  </td>
                  <td className="p-3 text-right font-mono text-slate-500 text-[11px]">
                    {new Date(org.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState
          title="No Organizations Found"
          description="There are currently no registered tenant organizations in the platform database."
        />
      )}
    </div>
  );
}
