"use client";

import Link from "next/link";
import { Inbox, ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#090D16] p-6 text-slate-800 dark:text-slate-100">
      <Card className="w-full max-w-md border border-slate-200 dark:border-white/[0.08] bg-card p-10 text-center rounded-[24px] shadow-2xl">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 select-none">
          <Inbox className="h-6 w-6 animate-pulse" />
        </div>
        <h3 className="mt-6 text-xl font-bold">404 — Page Not Found</h3>
        <p className="mx-auto mt-2 max-w-xs text-xs text-slate-500 dark:text-[#94A3B8] leading-relaxed">
          The requested dashboard view or system telemetry is not found or has been moved.
        </p>
        <div className="mt-8 flex justify-center">
          <Link
            href="/app"
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-xs font-semibold text-white shadow-md hover:bg-blue-700 transition-all active:scale-[0.98] dark:shadow-none"
          >
            <span>Back to Safety</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </Card>
    </div>
  );
}
