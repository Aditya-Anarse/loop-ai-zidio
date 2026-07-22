"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useDebounce } from "@/hooks/use-debounce";
import { HighlightMatch } from "@/components/search/HighlightMatch";
import { motion, AnimatePresence } from "framer-motion";
import {
  Inbox,
  Search,
  Filter,
  Plus,
  FileSpreadsheet,
  Sparkles,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Mail,
  Phone,
  Globe,
  Loader2,
  AlertCircle,
  Ticket,
  UserCheck,
  CheckCircle2,
  Calendar,
  ArrowUpDown,
  Download,
  Edit,
  X,
  XCircle,
  Cpu,
  CheckSquare,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

type FeedbackItem = {
  id: string;
  content: string;
  source: string;
  sentiment: string | null;
  metadata: {
    customerName?: string;
    customerEmail?: string;
    customerLabel?: string;
    score?: number;
    area?: string;
    status?: string;
    summary?: string;
    tags?: string[];
    priority?: string;
    confidence?: number;
    promptVersion?: string;
    modelVersion?: string;
    triageState?: string;
    timeline?: Array<{
      type: string;
      user: string;
      timestamp: string;
      description?: string;
    }>;
  };
  submittedAt: string;
  createdAt: string;
  updatedAt: string;
};

type BulkUploadSummary = {
  total: number;
  imported: number;
  failed: number;
  errors: Array<{ row: number; message: string }>;
};

export default function FeedbackInboxPage() {
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const userRole = session?.user?.role || "VIEWER";
  const isReadOnly = userRole === "VIEWER";

  // URL search & id params integration from Global Search
  const searchParamQ = searchParams?.get("search") || "";
  const searchParamId = searchParams?.get("id") || "";

  // Search & Filter States
  const [search, setSearch] = React.useState(searchParamQ);
  const debouncedSearch = useDebounce(search, 300);

  const [sentiment, setSentiment] = React.useState("ALL");
  const [source, setSource] = React.useState("ALL");
  const [status, setStatus] = React.useState("ALL");
  const [dateRange, setDateRange] = React.useState("ALL");
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");
  const [tag, setTag] = React.useState("");

  // Sorting & Pagination States
  const [sortField, setSortField] = React.useState<"submittedAt" | "sentiment" | "customerName" | "status">("submittedAt");
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("desc");
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);

  // Selected feedback ID
  const [selectedId, setSelectedId] = React.useState<string | null>(searchParamId || null);

  // Bulk Row Selection State
  const [selectedRowIds, setSelectedRowIds] = React.useState<Set<string>>(new Set());

  // Listen for search parameters changes from global search navigation
  React.useEffect(() => {
    if (searchParamQ) setSearch(searchParamQ);
    if (searchParamId) setSelectedId(searchParamId);
  }, [searchParamQ, searchParamId]);

  // Modals & Forms States
  const [isManualModalOpen, setIsManualModalOpen] = React.useState(false);
  const [manualName, setManualName] = React.useState("");
  const [manualEmail, setManualEmail] = React.useState("");
  const [manualContent, setManualContent] = React.useState("");
  const [manualSource, setManualSource] = React.useState("MANUAL");
  const [manualLabel, setManualLabel] = React.useState("free");
  const [manualTags, setManualTags] = React.useState("");

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false);
  const [editContent, setEditContent] = React.useState("");
  const [editName, setEditName] = React.useState("");
  const [editEmail, setEditEmail] = React.useState("");
  const [editLabel, setEditLabel] = React.useState("free");
  const [editTags, setEditTags] = React.useState("");
  const [editStatus, setEditStatus] = React.useState<"NEW" | "REVIEWED" | "ACTIONED">("NEW");

  // CSV Import States
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = React.useState(false);
  const [uploadSummary, setUploadSummary] = React.useState<BulkUploadSummary | null>(null);
  const [showSummaryModal, setShowSummaryModal] = React.useState(false);

  // AI Triage Batch Queue states
  const [triageState, setTriageState] = React.useState<"IDLE" | "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED">("IDLE");
  const [triageRemaining, setTriageRemaining] = React.useState(0);

  // Focus management refs
  const firstManualInputRef = React.useRef<HTMLInputElement>(null);
  const firstEditInputRef = React.useRef<HTMLInputElement>(null);

  // Global action status messages
  const [actionMessage, setActionMessage] = React.useState<{ text: string; type: "success" | "error" } | null>(null);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setActionMessage({ text, type });
    setTimeout(() => setActionMessage(null), 4000);
  };

  const handleDownloadSampleCSV = () => {
    const csvContent =
      "feedback,source,customerName,customerEmail,createdAt\n" +
      '"The product is amazing, but checkout is a bit slow.",CSV,John Doe,john@example.com,2026-07-18T12:00:00Z\n' +
      '"Cannot log in using my Google account, it throws an error.",MANUAL,Alice Smith,alice@example.com,2026-07-18T13:30:00Z\n';
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "loop_sample_feedback.csv");
    link.click();
  };

  // Keyboard accessibility Esc key handlers
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsManualModalOpen(false);
        setIsEditModalOpen(false);
        setShowSummaryModal(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Autofocus modal fields when opened
  React.useEffect(() => {
    if (isManualModalOpen) {
      setTimeout(() => firstManualInputRef.current?.focus(), 50);
    }
  }, [isManualModalOpen]);

  React.useEffect(() => {
    if (isEditModalOpen) {
      setTimeout(() => firstEditInputRef.current?.focus(), 50);
    }
  }, [isEditModalOpen]);

  // Fetch Feedback list using TanStack React Query
  const { data, isLoading, isError } = useQuery({
    queryKey: [
      "feedback",
      debouncedSearch,
      sentiment,
      source,
      status,
      dateRange,
      startDate,
      endDate,
      tag,
      page,
      pageSize,
      sortField,
      sortOrder,
    ],
    queryFn: async () => {
      const params = new URLSearchParams({
        search: debouncedSearch,
        sentiment,
        source,
        status,
        dateRange,
        tag,
        page: page.toString(),
        pageSize: pageSize.toString(),
        sortField,
        sortOrder,
      });
      if (dateRange === "CUSTOM") {
        if (startDate) params.append("startDate", startDate);
        if (endDate) params.append("endDate", endDate);
      }
      const res = await fetch(`/api/feedback?${params}`);
      if (!res.ok) throw new Error("Failed to load feedbacks.");
      const responseJson = await res.json();
      if (!responseJson.success) throw new Error(responseJson.message);
      return responseJson.data;
    },
  });

  const feedbacks: FeedbackItem[] = data?.items || [];
  const totalPages = data?.totalPages || 1;
  const totalCount = data?.totalCount || 0;
  const unclassifiedCount = data?.unclassifiedCount || 0;

  // Auto-select first feedback in inbox
  React.useEffect(() => {
    if (feedbacks.length > 0 && !selectedId) {
      setSelectedId(feedbacks[0].id);
    }
  }, [feedbacks, selectedId]);

  const selectedItem = feedbacks.find(f => f.id === selectedId) || feedbacks[0];

  // Ingest Mutation
  const ingestSingleMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/feedback/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Failed Ingestion");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feedback"] });
      setIsManualModalOpen(false);
      setManualContent("");
      setManualName("");
      setManualEmail("");
      setManualTags("");
      showToast("Feedback successfully ingested and auto-classified!");
    },
    onError: (err: any) => {
      showToast(err.message || "Error during single ingestion.", "error");
    },
  });

  // Edit / Update Mutation with Optimistic UI updates and cache rollbacks
  const updateFeedbackMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await fetch("/api/feedback", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Failed update");
      return data;
    },
    onMutate: async (newFeedback: any) => {
      await queryClient.cancelQueries({ queryKey: ["feedback"] });

      const queries = queryClient.getQueryCache().findAll({ queryKey: ["feedback"] });
      const previousSnapshots = queries.map(query => ({
        queryKey: query.queryKey,
        snapshot: queryClient.getQueryData(query.queryKey),
      }));

      queries.forEach(query => {
        queryClient.setQueryData(query.queryKey, (old: any) => {
          if (!old || !old.items) return old;
          return {
            ...old,
            items: old.items.map((item: FeedbackItem) => {
              if (item.id === newFeedback.feedbackId) {
                return {
                  ...item,
                  content: newFeedback.content !== undefined ? newFeedback.content : item.content,
                  metadata: {
                    ...item.metadata,
                    customerName: newFeedback.customerName !== undefined ? newFeedback.customerName : item.metadata.customerName,
                    customerEmail: newFeedback.customerEmail !== undefined ? newFeedback.customerEmail : item.metadata.customerEmail,
                    customerLabel: newFeedback.customerLabel !== undefined ? newFeedback.customerLabel : item.metadata.customerLabel,
                    status: newFeedback.status !== undefined ? newFeedback.status : item.metadata.status,
                    tags: newFeedback.tags !== undefined ? newFeedback.tags : item.metadata.tags,
                  },
                };
              }
              return item;
            }),
          };
        });
      });

      return { previousSnapshots };
    },
    onError: (err: any, newFeedback, context: any) => {
      if (context?.previousSnapshots) {
        context.previousSnapshots.forEach((snap: any) => {
          queryClient.setQueryData(snap.queryKey, snap.snapshot);
        });
      }
      showToast(err.message || "Error updating feedback.", "error");
    },
    onSuccess: () => {
      showToast("Feedback details successfully updated.");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["feedback"] });
    },
  });

  // Execute batch queue triage sequentially
  const handleRunTriage = async () => {
    if (isReadOnly) return;
    setTriageState("QUEUED");
    try {
      setTriageState("PROCESSING");
      let remaining = unclassifiedCount;
      setTriageRemaining(remaining);

      while (remaining > 0) {
        const res = await fetch("/api/feedback/triage", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ limit: 5 }),
        });
        const resData = await res.json();
        if (!res.ok || !resData.success) {
          throw new Error(resData.message || "Triage failed");
        }
        if (resData.data.processed === 0 && resData.data.remaining > 0) {
          throw new Error("AI Triage failed to classify items. Please check Gemini API status/quota.");
        }
        remaining = resData.data.remaining;
        setTriageRemaining(remaining);
        queryClient.invalidateQueries({ queryKey: ["feedback"] });
      }

      setTriageState("COMPLETED");
      showToast("AI Triage batch processing completed successfully!");
      setTimeout(() => setTriageState("IDLE"), 3000);
    } catch (err: any) {
      setTriageState("FAILED");
      showToast(err.message || "Error running batch AI triage.", "error");
      setTimeout(() => setTriageState("IDLE"), 4000);
    }
  };

  // Trigger manual entry ingestion
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    const splitTags = manualTags
      ? manualTags.split(",").map(t => t.trim()).filter(t => t.length > 0)
      : [];

    ingestSingleMutation.mutate({
      content: manualContent,
      source: manualSource,
      customerName: manualName,
      customerEmail: manualEmail,
      customerLabel: manualLabel,
      tags: splitTags,
    });
  };

  // Open edit modal and pre-populate states
  const openEditModal = () => {
    if (!selectedItem || isReadOnly) return;
    const meta = selectedItem.metadata;
    setEditContent(selectedItem.content);
    setEditName(meta.customerName || "");
    setEditEmail(meta.customerEmail || "");
    setEditLabel(meta.customerLabel || "free");
    setEditTags(meta.tags ? meta.tags.join(", ") : "");
    setEditStatus((meta.status as any) || "NEW");
    setIsEditModalOpen(true);
  };

  // Submit edits
  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly || !selectedItem) return;
    const splitTags = editTags
      ? editTags.split(",").map(t => t.trim()).filter(t => t.length > 0)
      : [];

    updateFeedbackMutation.mutate({
      feedbackId: selectedItem.id,
      content: editContent,
      customerName: editName,
      customerEmail: editEmail,
      customerLabel: editLabel,
      status: editStatus,
      tags: splitTags,
    });
  };

  // Inbound simulated chat
  const handleSimulateChannel = () => {
    if (isReadOnly) return;
    const randomName = ["Alice Carter", "Bob Rogers", "Clara Oswald"][Math.floor(Math.random() * 3)];
    const randomEmail = ["alice.c@company.com", "bob.r@techcorp.io", "clara.o@planet.org"][Math.floor(Math.random() * 3)];
    const text = [
      "The UI looks super sleek, but billing integration doesn't accept my Visa card.",
      "Integrations with Slack are amazing. Can you add teams alerts?",
      "Very slow checkout processes. Needs fixing.",
    ][Math.floor(Math.random() * 3)];

    ingestSingleMutation.mutate({
      content: text,
      source: "SIMULATED",
      customerName: randomName,
      customerEmail: randomEmail,
      customerLabel: "growth",
    });
  };

  // Parse CSV client-side with full validation logs
  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isReadOnly) return;
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      showToast("File size exceeds 10MB limit.", "error");
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split("\n").map(l => l.trim()).filter(l => l.length > 0);

        // 1. Empty CSV Check
        if (lines.length <= 1) {
          const errorMsg = "The uploaded CSV file is empty.";
          showToast(errorMsg, "error");
          await fetch("/api/feedback", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ logValidationError: errorMsg }),
          });
          setIsUploading(false);
          return;
        }

        const parseCSVLine = (line: string): string[] => {
          const result: string[] = [];
          let current = "";
          let inQuotes = false;
          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
              if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i++;
              } else {
                inQuotes = !inQuotes;
              }
            } else if (char === "," && !inQuotes) {
              result.push(current);
              current = "";
            } else {
              current += char;
            }
          }
          result.push(current);
          return result.map(v => {
            let val = v.trim();
            if (val.startsWith('"') && val.endsWith('"')) {
              val = val.substring(1, val.length - 1);
            }
            return val.trim();
          });
        };

        const rawHeaders = parseCSVLine(lines[0]);

        // 2. Duplicate Headers Check
        const duplicateHeaders = rawHeaders.filter((item, index) => rawHeaders.indexOf(item) !== index);
        if (duplicateHeaders.length > 0) {
          const errorMsg = `Duplicate headers found: ${Array.from(new Set(duplicateHeaders)).join(", ")}`;
          showToast(errorMsg, "error");
          await fetch("/api/feedback", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ logValidationError: errorMsg }),
          });
          setIsUploading(false);
          return;
        }

        // 3. Alias mappings & Required headers checks
        const required = {
          feedback: ["feedback", "content", "message", "review"],
          customerEmail: ["customeremail", "email", "customer_email"],
          customerName: ["customername", "name", "customer_name"],
          source: ["source"],
          createdAt: ["createdat", "created_at", "date", "submittedat", "submitted_at"]
        };

        const missing: string[] = [];
        const resolvedHeaders: Record<string, string> = {};

        Object.entries(required).forEach(([key, aliases]) => {
          const foundHeader = rawHeaders.find(h => aliases.includes(h.toLowerCase().replace(/[\s_-]/g, "")));
          if (foundHeader) {
            resolvedHeaders[key] = foundHeader;
          } else {
            missing.push(key);
          }
        });

        if (missing.length > 0) {
          const errorMsg = `Missing required columns: ${missing.join(", ")}`;
          showToast(errorMsg, "error");
          await fetch("/api/feedback", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ logValidationError: errorMsg }),
          });
          setIsUploading(false);
          return;
        }

        // Support optional headers mapping
        const optional = {
          customerLabel: ["customerlabel", "label", "customer_label"],
          tags: ["tags", "tag"]
        };
        const resolvedOptional: Record<string, string> = {};
        Object.entries(optional).forEach(([key, aliases]) => {
          const foundHeader = rawHeaders.find(h => aliases.includes(h.toLowerCase().replace(/[\s_-]/g, "")));
          if (foundHeader) {
            resolvedOptional[key] = foundHeader;
          }
        });

        const items: any[] = [];
        const clientSideErrors: { row: number; message: string }[] = [];

        for (let i = 1; i < lines.length; i++) {
          const values = parseCSVLine(lines[i]);
          const item: any = {};
          rawHeaders.forEach((header, index) => {
            item[header] = values[index] || "";
          });

          const content = item[resolvedHeaders.feedback]?.trim();

          // 4. Empty Required Values Check
          if (!content) {
            clientSideErrors.push({ row: i + 1, message: "Required feedback text is empty." });
            continue;
          }

          const rawCreatedAt = item[resolvedHeaders.createdAt]?.trim();
          let parsedDateString: string | undefined = undefined;
          if (rawCreatedAt) {
            const dateTry = new Date(rawCreatedAt);
            if (!isNaN(dateTry.getTime())) {
              parsedDateString = dateTry.toISOString();
            } else {
              clientSideErrors.push({ row: i + 1, message: `Invalid date format: ${rawCreatedAt}` });
              continue;
            }
          }

          items.push({
            content,
            source: item[resolvedHeaders.source] || "CSV",
            customerName: item[resolvedHeaders.customerName] || "Anonymous",
            customerEmail: item[resolvedHeaders.customerEmail] || "",
            customerLabel: resolvedOptional.customerLabel ? item[resolvedOptional.customerLabel] : "free",
            tags: resolvedOptional.tags ? item[resolvedOptional.tags] : "",
            submittedAt: parsedDateString,
          });
        }

        if (items.length === 0 && clientSideErrors.length > 0) {
          const errorMsg = "All rows failed structural validation.";
          showToast(errorMsg, "error");
          setUploadSummary({
            total: lines.length - 1,
            imported: 0,
            failed: lines.length - 1,
            errors: clientSideErrors
          });
          setShowSummaryModal(true);
          setIsUploading(false);
          return;
        }

        const res = await fetch("/api/feedback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items }),
        });

        const dataJson = await res.json();
        setIsUploading(false);

        if (!res.ok || !dataJson.success) {
          showToast(dataJson.message || "CSV processing failed.", "error");
          return;
        }

        // Merge client-side validation errors with server-side DB validation errors
        const combinedErrors = [...clientSideErrors, ...(dataJson.data.errors || [])];

        setUploadSummary({
          total: dataJson.data.total + clientSideErrors.length,
          imported: dataJson.data.imported,
          failed: dataJson.data.failed + clientSideErrors.length,
          errors: combinedErrors,
        });
        setShowSummaryModal(true);
        queryClient.invalidateQueries({ queryKey: ["feedback"] });
      } catch (err: any) {
        setIsUploading(false);
        showToast("Error parsing file.", "error");
      }
    };
    reader.readAsText(file);
  };

  // Compile and trigger download of CSV validation errors logs report
  const downloadCSVReport = () => {
    if (!uploadSummary || uploadSummary.errors.length === 0) return;
    const header = "Row,Validation Errors\n";
    const rows = uploadSummary.errors.map(e => `${e.row},"${e.message.replace(/"/g, '""')}"`).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `loop_csv_import_errors_${Date.now()}.csv`);
    link.click();
  };

  const getSentimentBadge = (sentiment: string | null) => {
    if (!sentiment) {
      return "bg-slate-50 text-slate-400 border-slate-200 dark:bg-slate-900 dark:text-slate-500 dark:border-slate-800";
    }
    switch (sentiment.toUpperCase()) {
      case "POSITIVE":
        return "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-500/25";
      case "NEGATIVE":
        return "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border-rose-500/25";
      case "MIXED":
        return "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border-amber-500/25";
      default:
        return "bg-slate-50 text-slate-700 dark:bg-slate-500/10 dark:text-slate-400 border-slate-500/25";
    }
  };

  const cycleSorting = (field: "submittedAt" | "sentiment" | "customerName" | "status") => {
    if (sortField === field) {
      setSortOrder(o => (o === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert Notification */}
      <AnimatePresence>
        {actionMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            role="status"
            aria-live="polite"
            className={`fixed top-4 right-4 z-50 flex items-center gap-2 rounded-xl p-4 text-xs font-semibold shadow-2xl border ${
              actionMessage.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950 dark:border-emerald-900 dark:text-emerald-300"
                : "bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950 dark:border-rose-900 dark:text-rose-300"
            }`}
          >
            <AlertCircle className="h-4 w-4" />
            <span>{actionMessage.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Triage Banner Segment (AI Queue Queue states tracker) */}
      {!isReadOnly && unclassifiedCount > 0 && (
        <div className="flex flex-col gap-3 rounded-2xl border border-blue-100 bg-blue-50/40 p-4 dark:border-blue-900/30 dark:bg-blue-950/10 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-lg bg-blue-500/10 p-1.5 text-blue-600 dark:text-blue-400">
              <Cpu className="h-4 w-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-800 dark:text-[#F8FAFC]">AI Triage Queue Pending</h4>
              <p className="text-[11px] text-slate-500 dark:text-[#94A3B8]">
                There are <span className="font-bold text-blue-600 dark:text-blue-400">{unclassifiedCount}</span> items awaiting sentiment, theme, and severity categorization.
              </p>
            </div>
          </div>
          <button
            onClick={handleRunTriage}
            disabled={triageState === "PROCESSING"}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors disabled:opacity-75"
          >
            {triageState === "PROCESSING" ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Processing... ({triageRemaining} left)</span>
              </>
            ) : triageState === "QUEUED" ? (
              <span>Queued...</span>
            ) : triageState === "COMPLETED" ? (
              <span>Completed!</span>
            ) : triageState === "FAILED" ? (
              <span>Failed. Retry?</span>
            ) : (
              <span>Run AI Triage</span>
            )}
          </button>
        </div>
      )}

      {/* Top Banner Actions bar */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-[#F8FAFC]">
            Feedback Inbox
          </h2>
          <p className="text-sm text-slate-500 dark:text-[#94A3B8]">
            Browse, manage, and audit workspace feedback tickets.
          </p>
        </div>
        {!isReadOnly && (
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleSimulateChannel}
              disabled={ingestSingleMutation.isPending}
              aria-label="Simulate support chat submission"
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-all dark:border-slate-800 dark:bg-[#0f172a] dark:text-slate-300 dark:hover:bg-slate-800 disabled:opacity-50"
            >
              {ingestSingleMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5 text-blue-500" />
              )}
              <span>Simulate Chat</span>
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              aria-label="Upload feedback records in CSV format"
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-all dark:border-slate-800 dark:bg-[#0f172a] dark:text-slate-300 dark:hover:bg-slate-800 disabled:opacity-50"
            >
              {isUploading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
              )}
              <span>Upload CSV</span>
            </button>
            <button
              onClick={handleDownloadSampleCSV}
              aria-label="Download sample CSV template"
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-all dark:border-slate-800 dark:bg-[#0f172a] dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <Download className="h-3.5 w-3.5 text-blue-500" />
              <span>Download Sample CSV</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleCSVUpload}
              accept=".csv"
              className="hidden"
            />
            <button
              onClick={() => setIsManualModalOpen(true)}
              aria-label="Create new manual feedback entry"
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-md hover:bg-blue-700 transition-all active:scale-[0.98] dark:shadow-none"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>New Entry</span>
            </button>
          </div>
        )}
      </div>

      {/* CSV Ingestion Guide Card */}
      {!isReadOnly && (
        <Card glass className="p-[28px] rounded-[20px] border border-blue-500/10 bg-blue-500/5 hover:border-blue-500/20 transition-all">
          <div className="flex items-start gap-4">
            <FileSpreadsheet className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
            <div className="space-y-2">
              <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                Required CSV Format
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Before uploading, ensure your CSV file contains the following columns (headers are case-insensitive, and common aliases are automatically resolved):
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 pt-2">
                <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.05] text-center">
                  <span className="block font-semibold text-xs text-foreground">customerName</span>
                  <span className="block text-[9px] text-[#94A3B8]/60 mt-1">Aliases: name, customer_name</span>
                </div>
                <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.05] text-center">
                  <span className="block font-semibold text-xs text-foreground">customerEmail</span>
                  <span className="block text-[9px] text-[#94A3B8]/60 mt-1">Aliases: email, customer_email</span>
                </div>
                <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.05] text-center">
                  <span className="block font-semibold text-xs text-foreground">feedback</span>
                  <span className="block text-[9px] text-[#94A3B8]/60 mt-1">Aliases: content, message, review</span>
                </div>
                <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.05] text-center">
                  <span className="block font-semibold text-xs text-foreground">source</span>
                  <span className="block text-[9px] text-[#94A3B8]/60 mt-1">Expected values: CSV, MANUAL</span>
                </div>
                <div className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.05] text-center">
                  <span className="block font-semibold text-xs text-foreground">createdAt</span>
                  <span className="block text-[9px] text-[#94A3B8]/60 mt-1">Aliases: date, created_at, submitted_at</span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Advanced Filters Card Layout */}
      <Card className="border border-slate-200 dark:border-white/[0.08] bg-card p-5 rounded-[16px] space-y-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <Search className="h-4 w-4" />
            </span>
            <input
              type="text"
              aria-label="Search feedbacks content, name, or email"
              placeholder="Search content, emails, names, sources, or tags..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-4 text-xs outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-100 dark:border-slate-800 dark:bg-slate-900/50 dark:focus:border-blue-600"
            />
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Date:</span>
              <select
                value={dateRange}
                aria-label="Select date range filter criteria"
                onChange={(e) => { setDateRange(e.target.value); setPage(1); }}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs outline-none dark:border-slate-800 dark:bg-slate-900"
              >
                <option value="ALL">All Time</option>
                <option value="PAST_7_DAYS">Past 7 Days</option>
                <option value="PAST_30_DAYS">Past 30 Days</option>
                <option value="CUSTOM">Custom Range</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Tag:</span>
              <input
                type="text"
                aria-label="Query specifically tags"
                placeholder="Query custom tags..."
                value={tag}
                onChange={(e) => { setTag(e.target.value); setPage(1); }}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs outline-none w-32 dark:border-slate-800 dark:bg-slate-900"
              />
            </div>
          </div>
        </div>

        {/* Custom Date Range picker conditional segment */}
        {dateRange === "CUSTOM" && (
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 dark:border-white/[0.04]">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Calendar className="h-4 w-4" />
              <span>Start Date:</span>
            </div>
            <input
              type="date"
              aria-label="Custom Start Date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
              className="rounded-lg border border-slate-200 px-2 py-1 text-xs outline-none dark:border-slate-800 dark:bg-slate-900"
            />
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Calendar className="h-4 w-4" />
              <span>End Date:</span>
            </div>
            <input
              type="date"
              aria-label="Custom End Date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
              className="rounded-lg border border-slate-200 px-2 py-1 text-xs outline-none dark:border-slate-800 dark:bg-slate-900"
            />
          </div>
        )}

        {/* Categories filters */}
        <div className="flex flex-wrap items-center gap-6 pt-3 border-t border-slate-100 dark:border-white/[0.04] text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-bold uppercase tracking-wider">Sentiment:</span>
            <select
              value={sentiment}
              aria-label="Filter by sentiment status"
              onChange={(e) => { setSentiment(e.target.value); setPage(1); }}
              className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] outline-none dark:border-slate-800 dark:bg-slate-900"
            >
              <option value="ALL">All</option>
              <option value="POSITIVE">Positive</option>
              <option value="NEUTRAL">Neutral</option>
              <option value="NEGATIVE">Negative</option>
              <option value="MIXED">Mixed</option>
            </select>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-bold uppercase tracking-wider">Source:</span>
            <select
              value={source}
              aria-label="Filter by feedback source channels"
              onChange={(e) => { setSource(e.target.value); setPage(1); }}
              className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] outline-none dark:border-slate-800 dark:bg-slate-900"
            >
              <option value="ALL">All</option>
              <option value="MANUAL">Manual</option>
              <option value="CSV">CSV File</option>
              <option value="SIMULATED">Simulated</option>
            </select>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-bold uppercase tracking-wider">Status:</span>
            <select
              value={status}
              aria-label="Filter by feedback workflow status"
              onChange={(e) => { setStatus(e.target.value); setPage(1); }}
              className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] outline-none dark:border-slate-800 dark:bg-slate-900"
            >
              <option value="ALL">All</option>
              <option value="NEW">New</option>
              <option value="REVIEWED">Reviewed</option>
              <option value="ACTIONED">Actioned</option>
            </select>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <span className="text-slate-400 font-bold uppercase tracking-wider">Page Size:</span>
            <select
              value={pageSize}
              aria-label="Select table page sizes configuration"
              onChange={(e) => { setPageSize(parseInt(e.target.value, 10)); setPage(1); }}
              className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] outline-none dark:border-slate-800 dark:bg-slate-900"
            >
              <option value={10}>10 rows</option>
              <option value={20}>20 rows</option>
              <option value={50}>50 rows</option>
            </select>
          </div>
          {selectedRowIds.size > 0 && (
            <button
              onClick={() => {
                const selectedItems = feedbacks.filter((f) => selectedRowIds.has(f.id));
                if (selectedItems.length === 0) return;
                const headers = "ID,Customer Name,Customer Email,Sentiment,Source,Content,Submitted At\n";
                const rows = selectedItems
                  .map((f) => {
                    const meta = f.metadata;
                    const name = (meta.customerName || "").replace(/"/g, '""');
                    const email = (meta.customerEmail || "").replace(/"/g, '""');
                    const content = (f.content || "").replace(/"/g, '""');
                    return `"${f.id}","${name}","${email}","${f.sentiment || "NEUTRAL"}","${f.source}","${content}","${f.submittedAt}"`;
                  })
                  .join("\n");

                const blob = new Blob([headers + rows], { type: "text/csv;charset=utf-8;" });
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.setAttribute("href", url);
                link.setAttribute("download", `loop_selected_feedback_${Date.now()}.csv`);
                link.click();
              }}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-600 text-white text-[11px] font-bold hover:bg-blue-700 transition-colors shadow-xs"
            >
              <Download className="w-3 h-3" />
              <span>Export Selected ({selectedRowIds.size})</span>
            </button>
          )}
        </div>
      </Card>

      {/* Main Inbox Workspace split layout */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Table list column */}
        <div className="lg:col-span-7 space-y-4">
          <Card className="border border-slate-200 dark:border-white/[0.08] bg-card rounded-[18px] overflow-hidden">
            <div className="overflow-x-auto h-[550px] relative">
              <table className="w-full text-left border-collapse table-fixed" aria-label="Customer Feedback Registry Table">
                <thead className="sticky top-0 bg-slate-50 dark:bg-slate-900/95 backdrop-blur-md z-20 shadow-xs">
                  <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider dark:border-white/[0.08]">
                    <th className="p-3 pl-4 w-10">
                      <input
                        type="checkbox"
                        aria-label="Select all table rows"
                        checked={feedbacks.length > 0 && selectedRowIds.size === feedbacks.length}
                        onChange={() => {
                          if (selectedRowIds.size === feedbacks.length) {
                            setSelectedRowIds(new Set());
                          } else {
                            setSelectedRowIds(new Set(feedbacks.map((f) => f.id)));
                          }
                        }}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                    </th>
                    <th onClick={() => cycleSorting("customerName")} className="p-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 w-1/3">
                      <div className="flex items-center gap-1">
                        <span>Customer</span>
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </th>
                    <th className="p-4 w-1/3">Content Context</th>
                    <th onClick={() => cycleSorting("sentiment")} className="p-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 w-1/5">
                      <div className="flex items-center gap-1">
                        <span>Sentiment</span>
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </th>
                    <th onClick={() => cycleSorting("submittedAt")} className="p-4 pr-6 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 w-1/4">
                      <div className="flex items-center gap-1">
                        <span>Date</span>
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/[0.08]">
                  {isLoading ? (
                    // Skeleton Loading States
                    Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td className="p-4 pl-4"><div className="h-3 w-3 bg-slate-200 dark:bg-slate-800 rounded" /></td>
                        <td className="p-4">
                          <div className="h-3 w-24 bg-slate-200 dark:bg-slate-800 rounded mb-1.5" />
                          <div className="h-2 w-32 bg-slate-100 dark:bg-slate-900/60 rounded" />
                        </td>
                        <td className="p-4">
                          <div className="h-3 w-40 bg-slate-200 dark:bg-slate-800 rounded" />
                        </td>
                        <td className="p-4">
                          <div className="h-5 w-16 bg-slate-100 dark:bg-slate-900/60 rounded-full" />
                        </td>
                        <td className="p-4 pr-6">
                          <div className="h-3 w-16 bg-slate-200 dark:bg-slate-800 rounded" />
                        </td>
                      </tr>
                    ))
                  ) : isError ? (
                    <tr>
                      <td colSpan={5} className="p-12 text-center text-rose-600 dark:text-rose-400">
                        <AlertCircle className="h-6 w-6 mx-auto mb-2" />
                        <span className="text-xs font-semibold">Failed to fetch feedback. Please reload.</span>
                      </td>
                    </tr>
                  ) : feedbacks.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-12 text-center text-slate-400 text-xs font-medium">
                        <Inbox className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                        <span>No feedback matching current filters found in workspace.</span>
                      </td>
                    </tr>
                  ) : (
                    feedbacks.map((item) => {
                      const meta = item.metadata;
                      const isSelected = item.id === selectedId;
                      const isChecked = selectedRowIds.has(item.id);
                      return (
                        <tr
                          key={item.id}
                          onClick={() => setSelectedId(item.id)}
                          className={`hover:bg-slate-50/50 dark:hover:bg-white/[0.02] cursor-pointer transition-colors ${
                            isSelected ? "bg-blue-50/20 dark:bg-blue-950/10" : ""
                          }`}
                        >
                          <td className="p-3 pl-4" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              aria-label={`Select feedback item ${item.id}`}
                              checked={isChecked}
                              onChange={() => {
                                setSelectedRowIds((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(item.id)) next.delete(item.id);
                                  else next.add(item.id);
                                  return next;
                                });
                              }}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                          </td>
                          <td className="p-4 truncate">
                            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                              <HighlightMatch text={meta.customerName || "Anonymous"} query={debouncedSearch} />
                            </p>
                            <p className="text-[10px] text-slate-400 truncate">
                              <HighlightMatch text={meta.customerEmail || "anonymous@company.com"} query={debouncedSearch} />
                            </p>
                          </td>
                          <td className="p-4 text-xs text-slate-600 dark:text-[#94A3B8] truncate">
                            <HighlightMatch text={item.content} query={debouncedSearch} />
                          </td>
                          <td className="p-4">
                            <span className={`inline-block rounded-full px-2 py-0.5 text-[9px] font-bold border ${getSentimentBadge(item.sentiment)}`}>
                              {item.sentiment || "QUEUED"}
                            </span>
                          </td>
                          <td className="p-4 pr-6 text-[10px] text-slate-400">
                            {new Date(item.submittedAt).toLocaleDateString()}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination footer */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-100 dark:border-white/[0.08] p-4 px-6 bg-slate-50/20 dark:bg-slate-900/10 select-none">
                <span className="text-xs text-slate-500 font-medium">
                  Showing {feedbacks.length} of {totalCount} items (Page {page} of {totalPages})
                </span>
                <div className="flex items-center gap-2">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    aria-label="Retrieve previous table dataset page"
                    className="p-1 rounded border border-slate-200 hover:bg-slate-100 disabled:opacity-40 transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    disabled={page === totalPages}
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    aria-label="Retrieve next table dataset page"
                    className="p-1 rounded border border-slate-200 hover:bg-slate-100 disabled:opacity-40 transition-colors"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Selected feedback detail and timeline column */}
        <div className="lg:col-span-5">
          {selectedItem ? (
            <Card className="border border-slate-200 dark:border-white/[0.08] bg-card rounded-[18px]">
              <div className="p-6 border-b border-slate-100 dark:border-white/[0.08] flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-950 flex items-center justify-center font-bold text-sm text-blue-700 dark:text-blue-400 select-none">
                    {(selectedItem.metadata.customerName || "AN").slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 dark:text-[#F8FAFC]">
                      <HighlightMatch text={selectedItem.metadata.customerName || "Anonymous User"} query={debouncedSearch} />
                    </h3>
                    <p className="text-[10px] text-slate-400">
                      via {selectedItem.source} · {new Date(selectedItem.submittedAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!isReadOnly && (
                    <button
                      onClick={openEditModal}
                      className="p-1.5 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                      aria-label="Trigger editing detail panel configuration modal"
                    >
                      <Edit className="h-3.5 w-3.5 text-slate-500" />
                    </button>
                  )}
                  <span className={`rounded-full px-2.5 py-0.5 text-[9px] font-bold border ${getSentimentBadge(selectedItem.sentiment)}`}>
                    {selectedItem.sentiment || "QUEUED"}
                  </span>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Content body */}
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Feedback body
                  </h4>
                  <p className="text-xs text-slate-700 leading-relaxed dark:text-slate-200 bg-slate-50 dark:bg-slate-900/40 p-4 rounded-xl border dark:border-slate-800">
                    <HighlightMatch text={selectedItem.content} query={debouncedSearch} />
                  </p>
                </div>

                {/* AI Diagnostics details */}
                {selectedItem.sentiment && (
                  <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-[#0f172a]/30 p-4 rounded-xl border dark:border-slate-800 text-xs">
                    <div>
                      <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wider">AI Severity</span>
                      <span className={`font-semibold text-[11px] ${selectedItem.metadata.priority === "HIGH" ? "text-rose-600 font-bold dark:text-rose-400" : "text-slate-600 dark:text-slate-300"}`}>
                        {selectedItem.metadata.priority || "MEDIUM"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wider">Confidence</span>
                      <span className="font-semibold text-[11px] text-slate-600 dark:text-slate-300">
                        {selectedItem.metadata.confidence !== undefined ? `${Math.round(selectedItem.metadata.confidence * 100)}%` : "85%"}
                      </span>
                    </div>
                    <div className="col-span-2 border-t dark:border-slate-800 pt-2 mt-1 flex justify-between text-[9px] text-slate-400 font-mono">
                      <span>Model: {selectedItem.metadata.modelVersion || "claude-3-5-haiku"}</span>
                      <span>Prompt: {selectedItem.metadata.promptVersion || "v1.1"}</span>
                    </div>
                  </div>
                )}

                {/* Tags Section */}
                {selectedItem.metadata.tags && selectedItem.metadata.tags.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Tags</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedItem.metadata.tags.map((t, idx) => (
                        <span key={idx} className="rounded-lg bg-blue-50/50 border border-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-950/20 dark:border-blue-900/40 dark:text-blue-400">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Audit Timeline */}
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Audit Timeline Log</h4>
                  <div className="space-y-3.5 border-l border-slate-100 dark:border-white/[0.05] pl-4 ml-1.5">
                    {selectedItem.metadata.timeline?.map((evt, idx) => (
                      <div key={idx} className="relative text-[11px] leading-relaxed">
                        <span className="absolute -left-[20.5px] top-1 h-2 w-2 rounded-full bg-blue-500 border border-white dark:border-[#0f172a]" />
                        <div className="flex items-center justify-between text-[10px] text-slate-400">
                          <span className="font-bold text-slate-600 dark:text-slate-300">{evt.type}</span>
                          <span>{new Date(evt.timestamp).toLocaleString()}</span>
                        </div>
                        <p className="text-slate-500 mt-0.5">
                          {evt.description || "Updated parameters"} by <span className="font-semibold text-slate-700 dark:text-slate-300">{evt.user}</span>
                        </p>
                      </div>
                    )) || (
                      <p className="text-[10px] text-slate-400">No events logged.</p>
                    )}
                  </div>
                </div>

                {/* Workflow Status Actions */}
                {!isReadOnly && (
                  <div className="flex flex-wrap items-center justify-between border-t border-slate-100 dark:border-white/[0.08] pt-4 gap-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          updateFeedbackMutation.mutate({ feedbackId: selectedItem.id, status: "REVIEWED" });
                        }}
                        aria-label="Mark feedback as Reviewed"
                        className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[10px] font-bold border transition-colors ${
                          selectedItem.metadata.status === "REVIEWED"
                            ? "bg-amber-50 border-amber-300 text-amber-700"
                            : "hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500"
                        }`}
                      >
                        <UserCheck className="h-3.5 w-3.5" />
                        <span>Review</span>
                      </button>
                      <button
                        onClick={() => {
                          updateFeedbackMutation.mutate({ feedbackId: selectedItem.id, status: "ACTIONED" });
                        }}
                        aria-label="Mark feedback as Actioned"
                        className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[10px] font-bold border transition-colors ${
                          selectedItem.metadata.status === "ACTIONED"
                            ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                            : "hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500"
                        }`}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Action</span>
                      </button>
                    </div>
                    <button
                      onClick={() => alert("Simulating support ticket dispatch...")}
                      className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-[10px] font-semibold text-white hover:bg-blue-700 transition-colors"
                    >
                      <Ticket className="h-3.5 w-3.5" />
                      <span>Dispatch Ticket</span>
                    </button>
                  </div>
                )}
              </div>
            </Card>
          ) : (
            <Card className="border border-slate-200 dark:border-white/[0.08] bg-card p-6 text-center text-xs text-slate-400">
              Select a feedback entry to view detailed audit parameters.
            </Card>
          )}
        </div>
      </div>

      {/* Modal Dialog: Add Manual Entry */}
      {isManualModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs" role="dialog" aria-modal="true" aria-labelledby="manual-entry-title">
          <Card className="w-full max-w-md bg-card border border-slate-200 dark:border-slate-800 shadow-2xl p-6 rounded-2xl">
            <div className="flex items-center justify-between border-b pb-4">
              <h3 id="manual-entry-title" className="text-base font-bold">New Feedback Entry</h3>
              <button onClick={() => setIsManualModalOpen(false)} aria-label="Close dialog window" className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
            </div>
            <form onSubmit={handleManualSubmit} className="mt-4 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400" htmlFor="manualName">Customer Name</label>
                <input
                  type="text"
                  required
                  id="manualName"
                  ref={firstManualInputRef}
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  placeholder="Jordan Diaz"
                  className="w-full rounded-lg border px-3 py-2 text-xs outline-none focus:border-blue-500 dark:bg-slate-900 dark:border-slate-800"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400" htmlFor="manualEmail">Work Email</label>
                <input
                  type="email"
                  id="manualEmail"
                  value={manualEmail}
                  onChange={(e) => setManualEmail(e.target.value)}
                  placeholder="jordan@company.com"
                  className="w-full rounded-lg border px-3 py-2 text-xs outline-none focus:border-blue-500 dark:bg-slate-900 dark:border-slate-800"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400" htmlFor="manualContent">Feedback Content</label>
                <textarea
                  required
                  id="manualContent"
                  value={manualContent}
                  onChange={(e) => setManualContent(e.target.value)}
                  placeholder="Describe customer concern (max 2000 chars)..."
                  maxLength={2000}
                  rows={4}
                  className="w-full rounded-lg border px-3 py-2 text-xs outline-none focus:border-blue-500 dark:bg-slate-900 dark:border-slate-800"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400" htmlFor="manualTags">Tags (comma-separated)</label>
                <input
                  type="text"
                  id="manualTags"
                  value={manualTags}
                  onChange={(e) => setManualTags(e.target.value)}
                  placeholder="bug, billing, checkout"
                  className="w-full rounded-lg border px-3 py-2 text-xs outline-none focus:border-blue-500 dark:bg-slate-900 dark:border-slate-800"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400" htmlFor="manualSource">Source</label>
                  <select
                    id="manualSource"
                    value={manualSource}
                    onChange={(e) => setManualSource(e.target.value)}
                    className="w-full rounded-lg border px-3 py-2 text-xs outline-none dark:bg-slate-900 dark:border-slate-800"
                  >
                    <option value="MANUAL">Manual</option>
                    <option value="EMAIL">Email</option>
                    <option value="CHAT">Live Chat</option>
                    <option value="PHONE">Phone</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400" htmlFor="manualLabel">Customer Tier</label>
                  <select
                    id="manualLabel"
                    value={manualLabel}
                    onChange={(e) => setManualLabel(e.target.value)}
                    className="w-full rounded-lg border px-3 py-2 text-xs outline-none dark:bg-slate-900 dark:border-slate-800"
                  >
                    <option value="free">Free Tier</option>
                    <option value="growth">Growth</option>
                    <option value="enterprise">Enterprise</option>
                    <option value="vip">VIP</option>
                    <option value="churn_risk">Churn Risk</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={() => setIsManualModalOpen(false)} className="rounded-lg border px-4 py-2 text-xs font-semibold hover:bg-slate-50 transition-colors">Cancel</button>
                <button
                  type="submit"
                  disabled={ingestSingleMutation.isPending}
                  className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {ingestSingleMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                  <span>Submit Ingestion</span>
                </button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Modal Dialog: Edit Feedback Entry */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs" role="dialog" aria-modal="true" aria-labelledby="edit-entry-title">
          <Card className="w-full max-w-md bg-card border border-slate-200 dark:border-slate-800 shadow-2xl p-6 rounded-2xl">
            <div className="flex items-center justify-between border-b pb-4">
              <h3 id="edit-entry-title" className="text-base font-bold">Edit Feedback details</h3>
              <button onClick={() => setIsEditModalOpen(false)} aria-label="Close dialog window" className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
            </div>
            <form onSubmit={handleEditSubmit} className="mt-4 space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400" htmlFor="editName">Customer Name</label>
                <input
                  type="text"
                  required
                  id="editName"
                  ref={firstEditInputRef}
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 text-xs outline-none focus:border-blue-500 dark:bg-slate-900 dark:border-slate-800"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400" htmlFor="editEmail">Email Address</label>
                <input
                  type="email"
                  id="editEmail"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 text-xs outline-none focus:border-blue-500 dark:bg-slate-900 dark:border-slate-800"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400" htmlFor="editContent">Feedback Description</label>
                <textarea
                  required
                  id="editContent"
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  maxLength={2000}
                  rows={4}
                  className="w-full rounded-lg border px-3 py-2 text-xs outline-none focus:border-blue-500 dark:bg-slate-900 dark:border-slate-800"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400" htmlFor="editTags">Tags (comma-separated)</label>
                <input
                  type="text"
                  id="editTags"
                  value={editTags}
                  onChange={(e) => setEditTags(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 text-xs outline-none focus:border-blue-500 dark:bg-slate-900 dark:border-slate-800"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400" htmlFor="editLabel">Customer Tier</label>
                  <select
                    id="editLabel"
                    value={editLabel}
                    onChange={(e) => setEditLabel(e.target.value)}
                    className="w-full rounded-lg border px-3 py-2 text-xs outline-none dark:bg-slate-900 dark:border-slate-800"
                  >
                    <option value="free">Free Tier</option>
                    <option value="growth">Growth</option>
                    <option value="enterprise">Enterprise</option>
                    <option value="vip">VIP</option>
                    <option value="churn_risk">Churn Risk</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400" htmlFor="editStatus">Workflow Status</label>
                  <select
                    id="editStatus"
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as any)}
                    className="w-full rounded-lg border px-3 py-2 text-xs outline-none dark:bg-slate-900 dark:border-slate-800"
                  >
                    <option value="NEW">New</option>
                    <option value="REVIEWED">Reviewed</option>
                    <option value="ACTIONED">Actioned</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="rounded-lg border px-4 py-2 text-xs font-semibold hover:bg-slate-50 transition-colors">Cancel</button>
                <button
                  type="submit"
                  disabled={updateFeedbackMutation.isPending}
                  className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {updateFeedbackMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Modal Dialog: CSV Ingestion Summary & Error Download */}
      {showSummaryModal && uploadSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs" role="dialog" aria-modal="true" aria-labelledby="summary-title">
          <Card className="w-full max-w-lg bg-card border border-slate-200 dark:border-slate-800 shadow-2xl p-6 rounded-2xl">
            <div className="flex items-center justify-between border-b pb-4">
              <h3 id="summary-title" className="text-base font-bold">CSV Import Summary</h3>
              <button onClick={() => setShowSummaryModal(false)} aria-label="Close summary details" className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
            </div>
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-lg border">
                  <span className="text-[10px] text-slate-400 font-bold block">TOTAL ROWS</span>
                  <span className="text-lg font-bold text-slate-700 dark:text-slate-200">{uploadSummary.total}</span>
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-950/20 p-3 rounded-lg border border-emerald-100 dark:border-emerald-900/40">
                  <span className="text-[10px] text-emerald-600 font-bold block">SUCCESSFUL</span>
                  <span className="text-lg font-bold text-emerald-700 dark:text-emerald-400">{uploadSummary.imported}</span>
                </div>
                <div className="bg-rose-50 dark:bg-rose-950/20 p-3 rounded-lg border border-rose-100 dark:border-rose-900/40">
                  <span className="text-[10px] text-rose-600 font-bold block">FAILED</span>
                  <span className="text-lg font-bold text-rose-700 dark:text-rose-400">{uploadSummary.failed}</span>
                </div>
              </div>

              {uploadSummary.errors.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-rose-600 flex items-center gap-1">
                      <XCircle className="h-4 w-4" />
                      <span>Validation Errors</span>
                    </span>
                    <button
                      onClick={downloadCSVReport}
                      className="flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[10px] font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800 dark:text-slate-300"
                    >
                      <Download className="h-3 w-3" />
                      <span>Download Errors CSV</span>
                    </button>
                  </div>
                  <div className="max-h-40 overflow-y-auto border rounded-xl divide-y text-[10px] font-mono p-2 bg-slate-50 dark:bg-slate-900/50">
                    {uploadSummary.errors.slice(0, 10).map((err, idx) => (
                      <div key={idx} className="py-1 text-slate-600 dark:text-slate-400">
                        Row {err.row}: {err.message}
                      </div>
                    ))}
                    {uploadSummary.errors.length > 10 && (
                      <div className="py-1 text-slate-400 text-center">
                        ...and {uploadSummary.errors.length - 10} more rows. Download the full report.
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowSummaryModal(false)}
                  className="rounded-lg bg-blue-600 px-5 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition-colors"
                >
                  Close Summary
                </button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
