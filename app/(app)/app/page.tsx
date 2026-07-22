import * as React from "react";
import Link from "next/link";
import { requireWorkspaceContext } from "@/services/auth/authorization";
import { DbService } from "@/lib/services/db-service";
import StatsCard from "@/components/dashboard/StatsCard";
import dynamic from "next/dynamic";

const LineChart = dynamic(() => import("@/components/dashboard/LineChart"), { ssr: false });
const PieChart = dynamic(() => import("@/components/dashboard/PieChart"), { ssr: false });
const BarChart = dynamic(() => import("@/components/dashboard/BarChart"), { ssr: false });
import {
  MessageSquare,
  TrendingUp,
  AlertTriangle,
  ArrowUpRight,
  Sparkles,
  Inbox,
  ArrowRight,
  Layers,
  CheckCircle,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

export default async function AppPage() {
  const { workspaceId } = await requireWorkspaceContext();

  // 1. Fetch real statistics from PostgreSQL
  const stats = await DbService.getOverviewStats(workspaceId);
  const recentFeedback = await DbService.getRecentFeedback(workspaceId, 4);
  const negativeTopics = await DbService.getNegativeTopics(workspaceId, 3);
  const chartData = await DbService.getAnalyticsCharts(workspaceId);

  // Map database chart data to fit Recharts expected schemas
  const mappedTrendData = chartData.map((item) => ({
    date: item.name,
    volume: item.count,
    positive: item.positive,
    negative: Math.max(0, item.count - item.positive),
  }));

  // Fetch sentiment records to calculate exact percentages
  const totalCount = stats.totalFeedback;
  const positivePct = totalCount > 0 ? Math.round((recentFeedback.filter(f => f.sentiment === "POSITIVE").length / Math.max(recentFeedback.length, 1)) * 100) : 0;
  const negativePct = totalCount > 0 ? Math.round((recentFeedback.filter(f => f.sentiment === "NEGATIVE").length / Math.max(recentFeedback.length, 1)) * 100) : 0;
  const neutralPct = totalCount > 0 ? Math.max(0, 100 - positivePct - negativePct) : 0;

  const sentimentBreakdown = [
    { name: "Positive", value: positivePct || 1, color: "#10b981" },
    { name: "Neutral", value: neutralPct || 1, color: "#64748b" },
    { name: "Negative", value: negativePct || 1, color: "#ef4444" },
  ];

  // Dynamic Priority Distribution from metadata
  const totalPriority = (stats.priorityDistribution.HIGH || 0) + (stats.priorityDistribution.MEDIUM || 0) + (stats.priorityDistribution.LOW || 0);
  const highPriorityPct = totalPriority > 0 ? Math.round(((stats.priorityDistribution.HIGH || 0) / totalPriority) * 100) : 0;
  const lowPriorityPct = totalPriority > 0 ? Math.round(((stats.priorityDistribution.LOW || 0) / totalPriority) * 100) : 0;
  const medPriorityPct = totalPriority > 0 ? Math.max(0, 100 - highPriorityPct - lowPriorityPct) : 0;

  const priorityBreakdown = [
    { name: "High Severity", value: highPriorityPct || 1, color: "#ef4444" },
    { name: "Medium Severity", value: medPriorityPct || 1, color: "#f59e0b" },
    { name: "Low Severity", value: lowPriorityPct || 1, color: "#10b981" },
  ];

  // Dynamic Ingestion Channel Distribution
  const totalChannels = (stats.channelDistribution.MANUAL || 0) + (stats.channelDistribution.CSV || 0) + (stats.channelDistribution.SIMULATED || 0);
  const manualPct = totalChannels > 0 ? Math.round(((stats.channelDistribution.MANUAL || 0) / totalChannels) * 100) : 0;
  const csvPct = totalChannels > 0 ? Math.round(((stats.channelDistribution.CSV || 0) / totalChannels) * 100) : 0;
  const simPct = totalChannels > 0 ? Math.max(0, 100 - manualPct - csvPct) : 0;

  const channelBreakdown = [
    { name: "Manual Logs", value: manualPct || 1, color: "#3b82f6" },
    { name: "CSV Bulk Import", value: csvPct || 1, color: "#10b981" },
    { name: "Simulated Feeds", value: simPct || 1, color: "#8b5cf6" },
  ];

  const mappedThemeData = negativeTopics.map((topic) => ({
    name: topic.name,
    value: topic.count,
    color: "#ef4444",
  }));

  const showEmptyState = stats.totalFeedback === 0;

  // Determine trend icon indicator directions
  const volumeDiffPositive = !stats.trendComparison.volumeDiff.startsWith("-");
  const sentimentDiffPositive = !stats.trendComparison.sentimentDiff.startsWith("-");

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-[#F8FAFC]">
            Overview
          </h2>
          <p className="text-sm text-slate-500 dark:text-[#94A3B8]">
            Customer intelligence diagnostics and feedback telemetry.
          </p>
        </div>
        <div className="flex items-center gap-3 mt-4 md:mt-0">
          <Link
            href={"/app/feedback" as any}
            className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-blue-100 hover:bg-blue-700 transition-all active:scale-[0.98] dark:shadow-none dark:bg-blue-600 dark:hover:bg-blue-700"
          >
            <span>Ingest Feedback</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* Grid: Stat Cards with real MoM trends comparisons */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Feedback"
          value={stats.totalFeedback}
          subtext="Cumulative ticket submissions"
          icon={<Inbox className="h-5 w-5" />}
          iconBgClass="bg-blue-500/10 text-blue-600 dark:text-blue-400"
          delay={0.05}
          trend={{ value: stats.trendComparison.volumeDiff, isPositive: volumeDiffPositive }}
        />
        <StatsCard
          title="Avg Sentiment"
          value={stats.avgSentiment}
          subtext="Weighted positive ratio"
          icon={<TrendingUp className="h-5 w-5" />}
          iconBgClass="bg-emerald-500/10 text-emerald-600 dark:text-[#34D399]"
          delay={0.1}
          trend={{ value: stats.trendComparison.sentimentDiff, isPositive: sentimentDiffPositive }}
        />
        <StatsCard
          title="Active Issues"
          value={stats.openIssues}
          subtext="Items marked as NEW"
          icon={<AlertTriangle className="h-5 w-5" />}
          iconBgClass="bg-amber-500/10 text-amber-600 dark:text-[#FBBF24]"
          delay={0.15}
        />
        <StatsCard
          title="Churn Risk Ratio"
          value={stats.churnRisk}
          subtext="Volume from at-risk tiers"
          icon={<Layers className="h-5 w-5" />}
          iconBgClass="bg-rose-500/10 text-rose-600 dark:text-[#F87171]"
          delay={0.2}
        />
      </div>

      {showEmptyState ? (
        /* Premium Empty State Dashboard Card */
        <Card className="border border-slate-200 dark:border-white/[0.08] bg-card p-10 text-center rounded-[24px]">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
            <Sparkles className="h-6 w-6 animate-pulse" />
          </div>
          <h3 className="mt-6 text-lg font-bold text-slate-800 dark:text-[#F8FAFC]">
            No Feedback Ingested Yet
          </h3>
          <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500 dark:text-[#94A3B8]">
            Your LOOP workspace is ready. Populate your workspace with customer data to unlock analytics and AI classification.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href={"/app/feedback" as any}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-blue-100 hover:bg-blue-700 transition-all dark:shadow-none"
            >
              <span>Add First Feedback</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </Card>
      ) : (
        /* Real Stats Visualization Panels */
        <>
          {/* Trends and Sentiment breakdowns */}
          <div className="grid gap-6 lg:grid-cols-12">
            <div className="lg:col-span-8">
              <LineChart data={mappedTrendData} />
            </div>
            <div className="lg:col-span-4">
              <PieChart data={sentimentBreakdown} />
            </div>
          </div>

          {/* Priority and Channels Share breakdowns */}
          <div className="grid gap-6 lg:grid-cols-2">
            <PieChart
              data={priorityBreakdown}
              title="Priority distribution"
              description="Feedback severity tier distribution analyzed by Gemini AI"
              tooltipLabel="Severity Share"
              valueSuffix="%"
            />
            <PieChart
              data={channelBreakdown}
              title="Ingestion channels share"
              description="Comparing entry volumes across feedback sources"
              tooltipLabel="Channel Share"
              valueSuffix="%"
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Top Themes */}
            <BarChart data={mappedThemeData.length > 0 ? mappedThemeData : undefined} />

            {/* Recent Feedbacks */}
            <Card className="border border-slate-200 dark:border-white/[0.08] bg-card">
              <CardHeader>
                <CardTitle className="text-base font-bold text-slate-800 dark:text-[#F8FAFC]">
                  Recent Feedback
                </CardTitle>
                <CardDescription className="text-xs text-slate-500 dark:text-[#94A3B8]">
                  Latest customer complaints and suggestions.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {recentFeedback.map((item) => {
                  const meta = item.metadata as Record<string, any>;
                  return (
                    <div
                      key={item.id}
                      className="flex items-start justify-between border-b border-slate-100 dark:border-white/[0.08] pb-3 last:border-b-0 last:pb-0"
                    >
                      <div className="min-w-0 pr-4">
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                          {meta.customerName || "Anonymous"}
                        </p>
                        <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                          {item.content}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                          item.sentiment === "POSITIVE"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-[#34D399]"
                            : item.sentiment === "NEGATIVE"
                            ? "bg-rose-500/10 text-rose-600 dark:text-[#F87171]"
                            : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                        }`}
                      >
                        {item.sentiment}
                      </span>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
