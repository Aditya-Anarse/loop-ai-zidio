"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import {
  Sparkles,
  Search,
  BookOpen,
  Loader2,
  Calendar,
  FileText,
  MessageSquare,
  ArrowRight,
  TrendingUp,
  Trash2,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

type ReportItem = {
  id: string;
  title: string;
  status: "DRAFT" | "GENERATING" | "READY" | "FAILED";
  content: {
    text: string;
    errorType?: "AI_UNAVAILABLE" | "NO_FEEDBACK" | "GEMINI_QUOTA_EXCEEDED" | "GENERATION_FAILED";
    errorMessage?: string;
    confidence?: number;
    metadata?: {
      provider?: string;
      modelName?: string;
      processingTime?: number;
      generatedTimestamp?: string;
      feedbackAnalyzed?: number;
    };
  } | null;
  createdAt: string;
};

// Simple helper to format synthesized markdown reports without requiring react-markdown
function formatMarkdown(text: string) {
  if (!text) return "";
  return text
    .split("\n")
    .map((line, index) => {
      const trimmed = line.trim();
      if (trimmed.startsWith("## ")) {
        return `<h3 class="text-sm font-bold text-slate-800 dark:text-slate-100 mt-6 mb-2 border-b pb-1 uppercase tracking-wide">${trimmed.replace("## ", "")}</h3>`;
      }
      if (trimmed.startsWith("- ")) {
        return `<li class="ml-4 list-disc text-xs text-slate-600 dark:text-slate-300 my-1">${trimmed.replace("- ", "")}</li>`;
      }
      if (trimmed.startsWith("> ")) {
        return `<blockquote class="border-l-2 border-blue-500 bg-slate-50 dark:bg-slate-900/40 px-3 py-2 text-xs italic my-3 text-slate-600 dark:text-slate-400 rounded-r-md">${trimmed.replace("> ", "")}</blockquote>`;
      }
      if (trimmed.length === 0) return "<br/>";
      return `<p class="text-xs leading-relaxed text-slate-600 dark:text-slate-300 my-2">${trimmed}</p>`;
    })
    .join("");
}

import { useSearchParams } from "next/navigation";

export default function ReportsPage() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const reportParamId = searchParams?.get("id") || "";

  const { data: session } = useSession();
  const userRole = session?.user?.role || "VIEWER";
  const isReadOnly = userRole === "VIEWER";

  // RAG Search State
  const [qaQuery, setQaQuery] = React.useState("");
  const [qaAnswer, setQaAnswer] = React.useState("");
  const [qaSources, setQaSources] = React.useState<any[]>([]);
  const [isQaSearching, setIsQaSearching] = React.useState(false);
  const [qaTime, setQaTime] = React.useState<number | null>(null);

  // Search input state for digests list
  const [searchQuery, setSearchQuery] = React.useState("");

  // Selected Report State
  const [selectedReportId, setSelectedReportId] = React.useState<string | null>(reportParamId || null);

  React.useEffect(() => {
    if (reportParamId) {
      setSelectedReportId(reportParamId);
    }
  }, [reportParamId]);

  // Query: Get all VoC reports
  const { data, isLoading: reportsLoading } = useQuery({
    queryKey: ["reports"],
    queryFn: async () => {
      const res = await fetch("/api/reports/voc");
      if (!res.ok) throw new Error("Failed to load reports.");
      return res.json();
    },
  });

  const reports: ReportItem[] = data?.reports || [];
  const selectedReport = reports.find((r) => r.id === selectedReportId) || reports[0];

  // Mutation: Generate or regenerate VoC Report
  const generateReportMutation = useMutation({
    mutationFn: async (reportId?: string) => {
      const url = reportId ? `/api/reports/voc?reportId=${reportId}` : "/api/reports/voc";
      const res = await fetch(url, { method: "POST" });
      if (!res.ok) throw new Error("Report synthesis failed.");
      return res.json();
    },
    onSuccess: (newData) => {
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      if (newData.report) {
        setSelectedReportId(newData.report.id);
      }
      alert("Voice-of-Customer report synthesized successfully!");
    },
    onError: (err: any) => {
      alert(err.message || "Error generating report.");
    },
  });

  // Mutation: Delete VoC Report
  const deleteReportMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/reports/voc?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete report.");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      setSelectedReportId(null);
      alert("Report deleted successfully.");
    },
    onError: (err: any) => {
      alert(err.message || "Error deleting report.");
    },
  });

  // Handle Q&A RAG Search
  const handleQaSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qaQuery.trim()) return;

    setIsQaSearching(true);
    setQaAnswer("");
    setQaSources([]);
    setQaTime(null);
    const start = Date.now();

    try {
      const res = await fetch("/api/feedback/qa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: qaQuery }),
      });
      if (!res.ok) throw new Error("Q&A search failed.");
      const result = await res.json();
      setQaAnswer(result.answer || "No answer generated.");
      setQaSources(result.sources || []);
      setQaTime(Date.now() - start);
    } catch (err: any) {
      setQaAnswer(err.message || "An error occurred during search.");
    } finally {
      setIsQaSearching(false);
    }
  };

  // Filter reports list based on search query
  const filteredReports = reports.filter((report) =>
    report.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-[#F8FAFC]">
            Voice of Customer Reports
          </h2>
          <p className="text-sm text-slate-500 dark:text-[#94A3B8]">
            Ask questions about customer feedback and synthesize overall customer trends.
          </p>
        </div>
        {!isReadOnly && (
          <button
            onClick={() => generateReportMutation.mutate(undefined)}
            disabled={generateReportMutation.isPending}
            className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-blue-100 hover:bg-blue-700 transition-all disabled:opacity-50 active:scale-[0.98] dark:shadow-none"
          >
            {generateReportMutation.isPending && !selectedReportId ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            <span>Synthesize VoC Report</span>
          </button>
        )}
      </div>

      {/* Grounded AI Ask LOOP (RAG) Panel */}
      <Card className="border border-slate-200 dark:border-white/[0.08] bg-card p-6 rounded-[20px]">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-[#F8FAFC]">Ask LOOP (RAG Search)</h3>
            <p className="text-[10px] text-slate-400 dark:text-[#94A3B8]/60">Grounded customer telemetry query agent</p>
          </div>
        </div>

        <form onSubmit={handleQaSearch} className="flex gap-2">
          <input
            type="text"
            required
            placeholder="e.g., What are the main complaints regarding checkout speed and payment pages?"
            value={qaQuery}
            onChange={(e) => setQaQuery(e.target.value)}
            className="flex-1 rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-4 text-xs outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-100 dark:border-slate-800 dark:bg-slate-900/50 dark:focus:border-blue-600"
          />
          <button
            type="submit"
            disabled={isQaSearching}
            className="flex items-center justify-center rounded-xl bg-slate-800 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-900 transition-all dark:bg-blue-600 dark:hover:bg-blue-700"
          >
            {isQaSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </button>
        </form>

        {/* Q&A Output Screen */}
        {(isQaSearching || qaAnswer) && (
          <div className="mt-4 border-t border-slate-100 dark:border-white/[0.05] pt-4 space-y-4">
            {isQaSearching ? (
              <div className="flex items-center gap-2 text-xs text-slate-400 animate-pulse">
                <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                <span>Ask LOOP is browsing workspace tickets and analyzing findings...</span>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-xl bg-slate-50/50 dark:bg-slate-900/40 p-4 border dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                      LOOP AI Telemetry Answer
                    </span>
                    {qaTime && (
                      <span className="text-[9px] font-medium text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                        Model: Gemini 2.5 Flash • Provider: Google • Latency: {qaTime}ms
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed dark:text-slate-200 whitespace-pre-line">
                    {qaAnswer}
                  </p>
                </div>

                {/* Grounded Source Citations */}
                {qaSources.length > 0 && (
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                      Grounded Evidence Sources ({qaSources.length})
                    </span>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {qaSources.map((src, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 bg-white text-[11px] dark:border-white/[0.04] dark:bg-slate-900/20"
                        >
                          <div className="min-w-0 pr-2">
                            <p className="font-semibold text-slate-700 dark:text-slate-200 truncate">{src.customerName}</p>
                            <p className="text-[9px] text-slate-400 truncate">{src.customerEmail}</p>
                          </div>
                          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full border ${
                            src.sentiment === "POSITIVE"
                              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                              : "bg-rose-500/10 text-rose-600 border-rose-500/20"
                          }`}>
                            {src.sentiment}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Reports Split Screen Layout */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left: Saved Digests List */}
        <div className="lg:col-span-4">
          <Card className="border border-slate-200 dark:border-white/[0.08] bg-card rounded-[18px]">
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Voice Digests
              </CardTitle>
              <CardDescription className="text-[11px]">
                Historical synthesized workspace summaries.
              </CardDescription>
              {/* Search Digests input */}
              <div className="relative mt-2">
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400 dark:text-[#94A3B8]/60" />
                <input
                  type="text"
                  placeholder="Search digests..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-[11px] outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-100 dark:border-slate-800 dark:bg-slate-900/50 dark:focus:border-blue-600"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {reportsLoading ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2 text-blue-500" />
                  <span>Loading reports...</span>
                </div>
              ) : filteredReports.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  {searchQuery ? "No digests matching search criteria." : "No digests synthesized yet."}
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-white/[0.05]">
                  {filteredReports.map((report) => {
                    const isSelected = report.id === selectedReportId || (!selectedReportId && report.id === reports[0].id);
                    return (
                      <div
                        key={report.id}
                        onClick={() => setSelectedReportId(report.id)}
                        className={`p-4 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-50/50 dark:hover:bg-white/[0.01] transition-colors ${
                          isSelected ? "bg-blue-50/10 dark:bg-blue-950/10" : ""
                        }`}
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="p-2 bg-blue-50/50 dark:bg-slate-900 rounded-lg text-blue-600 shrink-0">
                            <FileText className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                              {report.title}
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <p className="text-[9px] text-slate-400">
                                {new Date(report.createdAt).toLocaleDateString()}
                              </p>
                              {report.status === "FAILED" && (
                                <span className="text-[8px] bg-rose-500/10 text-rose-500 font-bold px-1.5 rounded-full">
                                  FAILED
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {!isReadOnly && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm("Are you sure you want to delete this VoC report?")) {
                                deleteReportMutation.mutate(report.id);
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition-all"
                            title="Delete Report"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Selected Digest Details */}
        <div className="lg:col-span-8">
          {selectedReport ? (
            <Card className="border border-slate-200 dark:border-white/[0.08] bg-card rounded-[18px]">
              <CardHeader className="flex flex-col border-b border-slate-100 dark:border-white/[0.05] p-6">
                <div className="flex flex-row justify-between items-start w-full">
                  <div>
                    <CardTitle className="text-base font-bold text-slate-800 dark:text-[#F8FAFC]">
                      {selectedReport.title}
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500 dark:text-[#94A3B8] flex items-center gap-1.5 mt-1">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>Synthesized on {new Date(selectedReport.createdAt).toLocaleString()}</span>
                    </CardDescription>
                  </div>
                </div>

                {/* Display detailed AI Metadata tracking bar */}
                {selectedReport.status === "READY" && selectedReport.content?.metadata && (
                  <div className="mt-4 flex flex-wrap gap-2 text-[9px] font-medium text-slate-500 dark:text-slate-400">
                    <span className="bg-slate-100 dark:bg-slate-800/60 px-2 py-0.5 rounded-full">
                      AI Provider: {selectedReport.content.metadata.provider || "Google Gemini"}
                    </span>
                    <span className="bg-slate-100 dark:bg-slate-800/60 px-2 py-0.5 rounded-full">
                      Model: {selectedReport.content.metadata.modelName || "gemini-2.5-flash"}
                    </span>
                    <span className="bg-slate-100 dark:bg-slate-800/60 px-2 py-0.5 rounded-full">
                      Latency: {selectedReport.content.metadata.processingTime || 0}ms
                    </span>
                    <span className="bg-slate-100 dark:bg-slate-800/60 px-2 py-0.5 rounded-full">
                      Analyzed: {selectedReport.content.metadata.feedbackAnalyzed || 0} tickets
                    </span>
                    <span className="bg-slate-100 dark:bg-slate-800/60 px-2 py-0.5 rounded-full">
                      Confidence: {selectedReport.content.confidence || 0}%
                    </span>
                  </div>
                )}
              </CardHeader>
              <CardContent className="p-6">
                {selectedReport.status === "FAILED" || selectedReport.content?.errorType ? (
                  <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                    <div className="h-12 w-12 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mb-4">
                      <Sparkles className="h-6 w-6" />
                    </div>
                    
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-2">
                      {selectedReport.content?.errorType === "NO_FEEDBACK"
                        ? "No feedback data available"
                        : selectedReport.content?.errorType === "GEMINI_QUOTA_EXCEEDED"
                        ? "Gemini quota exceeded"
                        : selectedReport.content?.errorType === "AI_UNAVAILABLE"
                        ? "AI service unavailable"
                        : "Report generation failed"}
                    </h3>
                    
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mb-6 leading-relaxed">
                      {selectedReport.content?.errorType === "NO_FEEDBACK"
                        ? "No feedback data available in this workspace. Please ingest customer tickets before synthesizing VoC insights."
                        : selectedReport.content?.errorType === "GEMINI_QUOTA_EXCEEDED"
                        ? "Google Gemini API returned a quota limit error (429 Rate Limit Exceeded). Please wait a moment before trying again."
                        : selectedReport.content?.errorType === "AI_UNAVAILABLE"
                        ? "The Gemini AI model is currently unreachable or could not be loaded. Please check your credentials configuration."
                        : selectedReport.content?.errorMessage || "An unexpected error occurred while compiling the Voice-of-Customer narrative."}
                    </p>

                    {!isReadOnly && (
                      <button
                        onClick={() => generateReportMutation.mutate(selectedReport.id)}
                        disabled={generateReportMutation.isPending}
                        className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-blue-100 hover:bg-blue-700 transition-all disabled:opacity-50 active:scale-[0.98] dark:shadow-none"
                      >
                        {generateReportMutation.isPending && selectedReportId === selectedReport.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Sparkles className="h-3.5 w-3.5" />
                        )}
                        <span>Retry Generation</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <div
                    className="prose prose-slate dark:prose-invert max-w-none space-y-4"
                    dangerouslySetInnerHTML={{
                      __html: formatMarkdown(selectedReport.content?.text || ""),
                    }}
                  />
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="border border-slate-200 dark:border-white/[0.08] bg-card p-6 text-center text-xs text-slate-400">
              No report digest selected. Generate one to view details.
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
