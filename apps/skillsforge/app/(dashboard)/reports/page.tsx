import React from "react";
import Link from "next/link";
import { getT } from "@/lib/i18n/getT";
import { Card, Button } from "@quikit/ui";
import { ShieldAlert, FileText, ArrowRight, Printer, Download } from "lucide-react";

export const metadata = {
  title: "Reports | SkillsForge",
  description: "Printable gap reports and operator qualification certificates",
};

export default function ReportsHubPage() {
  const { t } = getT();

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
          {t("nav.reports")}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Exportable and printable compliance audits, gap analyses, and dispatch verdicts
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Gap Report Card */}
        <Card className="p-6 flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-xl bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 flex items-center justify-center">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {t("nav.gaps")}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Comprehensive audit of machines with fewer than 2 qualified backups across shifts (SPOFs), thin shift cells, and risk scores. Printable with client-side CSV export.
              </p>
            </div>
          </div>

          <div className="pt-6">
            <Link href="/reports/gaps">
              <Button variant="primary" size="md" className="w-full justify-between">
                <span>Open Gap Report</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </Card>

        {/* Verdict Certificate Card */}
        <Card className="p-6 flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 flex items-center justify-center">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {t("nav.verdict")}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Printable operator dispatch qualification certificate. Official shop-floor verification form with audit timestamps, rule checks, and signature lines.
              </p>
            </div>
          </div>

          <div className="pt-6">
            <Link href="/reports/verdict">
              <Button variant="outline" size="md" className="w-full justify-between">
                <span>View Verdict Certificate</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
