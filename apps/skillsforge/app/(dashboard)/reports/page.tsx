"use client";

import React from "react";
import Link from "next/link";
import { useT } from "@/lib/i18n/useT";
import { Card, Button } from "@quikit/ui";
import { ShieldAlert, FileText, ArrowRight } from "lucide-react";

export default function ReportsHubPage() {
  const { t, locale } = useT();

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
          {t("nav.reports")}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          {locale === "hi"
            ? "निर्यात योग्य और प्रिंट करने योग्य अनुपालन ऑडिट, अंतराल विश्लेषण और आवंटन परिणाम"
            : "Exportable and printable compliance audits, gap analyses, and dispatch verdicts"}
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
                {locale === "hi"
                  ? "सभी शिफ्टों में 2 से कम योग्य बैकअप वाली मशीनों (SPOF), कमजोर शिफ्ट सेल और जोखिम स्कोर का व्यापक ऑडिट। क्लाइंट-साइड CSV निर्यात के साथ प्रिंट करने योग्य।"
                  : "Comprehensive audit of machines with fewer than 2 qualified backups across shifts (SPOFs), thin shift cells, and risk scores. Printable with client-side CSV export."}
              </p>
            </div>
          </div>

          <div className="pt-6">
            <Link href="/reports/gaps">
              <Button variant="primary" size="md" className="w-full justify-between">
                <span>{locale === "hi" ? "अंतराल रिपोर्ट खोलें" : "Open Gap Report"}</span>
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
                {locale === "hi"
                  ? "प्रिंट करने योग्य ऑपरेटर प्रेषण योग्यता प्रमाण पत्र। ऑडिट टाइमस्टैम्प, नियम जाँच और हस्ताक्षर लाइनों के साथ आधिकारिक शॉप-फ्लोर सत्यापन फॉर्म।"
                  : "Printable operator dispatch qualification certificate. Official shop-floor verification form with audit timestamps, rule checks, and signature lines."}
              </p>
            </div>
          </div>

          <div className="pt-6">
            <Link href="/reports/verdict">
              <Button variant="outline" size="md" className="w-full justify-between">
                <span>{locale === "hi" ? "जाँच प्रमाणपत्र देखें" : "View Verdict Certificate"}</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
