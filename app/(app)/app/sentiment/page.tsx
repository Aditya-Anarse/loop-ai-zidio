import * as React from "react";
import { requireWorkspaceContext } from "@/services/auth/authorization";
import { DbService } from "@/lib/services/db-service";
import dynamic from "next/dynamic";

const BarChart = dynamic(() => import("@/components/dashboard/BarChart"), { ssr: false });
const PieChart = dynamic(() => import("@/components/dashboard/PieChart"), { ssr: false });
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Sparkles, Smile, Frown, AlertCircle } from "lucide-react";

export default async function SentimentPage() {
  const { workspaceId } = await requireWorkspaceContext();

  const stats = await DbService.getOverviewStats(workspaceId);
  const negativeTopics = await DbService.getNegativeTopics(workspaceId, 5);
  const recentFeedback = await DbService.getRecentFeedback(workspaceId, 10);

  const total = stats.totalFeedback;
  const positive = stats.positiveCount;
  const neutral = stats.neutralCount;
  const negative = stats.negativeCount;

  const sentimentBreakdown = [
    { name: "Positive", value: total > 0 ? Math.round((positive / total) * 100) : 0, color: "#10b981" },
    { name: "Neutral", value: total > 0 ? Math.round((neutral / total) * 100) : 0, color: "#64748b" },
    { name: "Negative", value: total > 0 ? Math.round((negative / total) * 100) : 0, color: "#ef4444" },
  ];

  const mappedThemeData = negativeTopics.map((topic) => ({
    name: topic.name,
    value: topic.count,
    color: "#ef4444",
  }));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-[#F8FAFC]">
          Sentiment Analytics
        </h2>
        <p className="text-sm text-slate-500 dark:text-[#94A3B8]">
          Detailed feedback categorization and thematic sentiment distributions.
        </p>
      </div>

      {stats.totalFeedback === 0 ? (
        <Card className="border border-slate-200 dark:border-white/[0.08] bg-card p-10 text-center rounded-[24px]">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
            <Smile className="h-6 w-6 animate-pulse" />
          </div>
          <h3 className="mt-6 text-sm font-bold text-slate-800 dark:text-[#F8FAFC]">
            No Telemetry Available
          </h3>
          <p className="mx-auto mt-2 max-w-sm text-xs text-slate-500 dark:text-[#94A3B8]">
            Telemetry dashboard will populate once customer feedback is processed inside the inbox.
          </p>
        </Card>
      ) : (
        <>
          {/* Sentiment Highlights Grid */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="p-6 border border-slate-200 dark:border-white/[0.08] bg-card flex items-center gap-4">
              <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-xl">
                <Smile className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Positive Volume</span>
                <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{positive} entries</p>
              </div>
            </Card>
            <Card className="p-6 border border-slate-200 dark:border-white/[0.08] bg-card flex items-center gap-4">
              <div className="p-3 bg-slate-500/10 text-slate-600 rounded-xl">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Neutral Volume</span>
                <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{neutral} entries</p>
              </div>
            </Card>
            <Card className="p-6 border border-slate-200 dark:border-white/[0.08] bg-card flex items-center gap-4">
              <div className="p-3 bg-rose-500/10 text-rose-600 rounded-xl">
                <Frown className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Negative Volume</span>
                <p className="text-xl font-bold text-slate-800 dark:text-rose-400">{negative} entries</p>
              </div>
            </Card>
          </div>

          {/* Visual Breakdown Panels */}
          <div className="grid gap-6 md:grid-cols-2">
            <PieChart data={sentimentBreakdown} />
            <BarChart data={mappedThemeData.length > 0 ? mappedThemeData : undefined} />
          </div>

          {/* Detailed thematic analysis list */}
          <Card className="border border-slate-200 dark:border-white/[0.08] bg-card">
            <CardHeader>
              <CardTitle className="text-base font-bold text-slate-800 dark:text-[#F8FAFC]">
                Top Complaint Sub-Themes
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 dark:text-[#94A3B8]">
                Drill-down breakdown of categories associated with negative customer feedback.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-bold text-slate-400 dark:border-white/[0.08] dark:bg-slate-900/30 uppercase tracking-wider">
                      <th className="p-4 pl-6">Theme Title</th>
                      <th className="p-4">Negative Volume</th>
                      <th className="p-4 pr-6">Severity Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/[0.08]">
                    {negativeTopics.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="p-4 text-center text-xs text-slate-400">
                          No negative sub-themes recorded.
                        </td>
                      </tr>
                    ) : (
                      negativeTopics.map((topic, i) => (
                        <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.01]">
                          <td className="p-4 pl-6 text-xs font-semibold text-slate-700 dark:text-slate-200">
                            {topic.name}
                          </td>
                          <td className="p-4 text-xs text-slate-600 dark:text-slate-400">
                            {topic.count} items
                          </td>
                          <td className="p-4 pr-6">
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 w-24 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                                <div
                                  className="h-full bg-rose-500 rounded-full"
                                  style={{ width: `${topic.ratio}%` }}
                                />
                              </div>
                              <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400">
                                {topic.ratio}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
