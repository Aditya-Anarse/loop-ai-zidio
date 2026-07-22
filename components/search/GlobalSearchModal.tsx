"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  X,
  Loader2,
  MessageSquare,
  User,
  FileText,
  Sparkles,
  Settings,
  ArrowRight,
  Command,
  CornerDownLeft,
} from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { HighlightMatch } from "./HighlightMatch";

interface SearchResultItem {
  id: string;
  type: "feedback" | "customer" | "report" | "theme" | "setting";
  title: string;
  content?: string;
  customerName?: string;
  customerEmail?: string;
  summary?: string;
  sentiment?: string;
  email?: string;
  label?: string;
  description?: string;
  createdAt?: string;
  href: string;
}

interface SearchResultsData {
  feedback: SearchResultItem[];
  customers: SearchResultItem[];
  reports: SearchResultItem[];
  themes: SearchResultItem[];
  settings: SearchResultItem[];
  totalResults: number;
}

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GlobalSearchModal({ isOpen, onClose }: GlobalSearchModalProps) {
  const router = useRouter();
  const inputRef = React.useRef<HTMLInputElement>(null);

  const [query, setQuery] = React.useState("");
  const debouncedQuery = useDebounce(query, 300);

  const [isLoading, setIsLoading] = React.useState(false);
  const [results, setResults] = React.useState<SearchResultsData>({
    feedback: [],
    customers: [],
    reports: [],
    themes: [],
    settings: [],
    totalResults: 0,
  });

  const [selectedIndex, setSelectedIndex] = React.useState(0);

  // Flattened list of all result items for keyboard arrow navigation
  const allFlattenedResults = React.useMemo(() => {
    return [
      ...results.feedback,
      ...results.customers,
      ...results.reports,
      ...results.themes,
      ...results.settings,
    ];
  }, [results]);

  // Autofocus input when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSelectedIndex(0);
    } else {
      setQuery("");
      setResults({
        feedback: [],
        customers: [],
        reports: [],
        themes: [],
        settings: [],
        totalResults: 0,
      });
    }
  }, [isOpen]);

  // Fetch results on debounced query change
  React.useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults({
        feedback: [],
        customers: [],
        reports: [],
        themes: [],
        settings: [],
        totalResults: 0,
      });
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    fetch(`/api/search?q=${encodeURIComponent(debouncedQuery.trim())}`)
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data.success && data.data) {
          setResults(data.data);
          setSelectedIndex(0);
        }
      })
      .catch((err) => {
        console.error("Global search error:", err);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [debouncedQuery]);

  // Handle item navigation
  const handleSelectResult = (href: string) => {
    onClose();
    router.push(href as any);
  };

  // Keyboard navigation inside modal
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (allFlattenedResults.length > 0) {
        setSelectedIndex((prev) => (prev + 1) % allFlattenedResults.length);
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (allFlattenedResults.length > 0) {
        setSelectedIndex((prev) => (prev - 1 + allFlattenedResults.length) % allFlattenedResults.length);
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (allFlattenedResults.length > 0 && allFlattenedResults[selectedIndex]) {
        handleSelectResult(allFlattenedResults[selectedIndex].href);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-slate-900/60 backdrop-blur-sm dark:bg-black/80">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: -10 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className="w-full max-w-2xl bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-white/[0.1] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
          onKeyDown={handleKeyDown}
        >
          {/* Header Search Input */}
          <div className="flex items-center px-4 py-3.5 border-b border-slate-200 dark:border-white/[0.08] gap-3">
            <Search className="w-5 h-5 text-slate-400 dark:text-[#94A3B8] shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search feedback, customers, themes, reports, settings..."
              className="flex-1 bg-transparent text-sm font-medium text-slate-800 dark:text-[#F8FAFC] placeholder-slate-400 dark:placeholder-[#94A3B8] outline-none"
              aria-label="Global search query input"
            />
            {isLoading ? (
              <Loader2 className="w-4 h-4 text-blue-500 animate-spin shrink-0" />
            ) : query ? (
              <button
                onClick={() => setQuery("")}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg cursor-pointer"
                title="Clear search query"
              >
                <X className="w-4 h-4" />
              </button>
            ) : null}
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 rounded border border-slate-200 bg-slate-100 dark:border-white/[0.08] dark:bg-white/[0.05] text-[10px] font-mono text-slate-400 dark:text-[#94A3B8]">
              ESC
            </kbd>
          </div>

          {/* Results Container */}
          <div className="flex-1 overflow-y-auto p-3 space-y-4 min-h-[220px]">
            {/* Quick Suggestions when empty */}
            {!query.trim() && (
              <div className="p-4 space-y-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-[#94A3B8]/70 block">
                  Quick Navigation Shortcuts
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { title: "Feedback Inbox", href: "/app/feedback", icon: MessageSquare },
                    { title: "Voice of Customer Reports", href: "/app/reports", icon: Sparkles },
                    { title: "Sentiment Analytics", href: "/app/sentiment", icon: Sparkles },
                    { title: "Workspace Settings", href: "/app/settings", icon: Settings },
                  ].map((item, i) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={i}
                        onClick={() => handleSelectResult(item.href)}
                        className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-100 dark:border-white/[0.04] bg-slate-50/50 dark:bg-slate-900/40 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors text-left cursor-pointer"
                      >
                        <Icon className="w-4 h-4 text-blue-500 shrink-0" />
                        <span className="truncate">{item.title}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Empty state */}
            {query.trim() && !isLoading && results.totalResults === 0 && (
              <div className="py-12 text-center space-y-2">
                <Search className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  No matching results found
                </p>
                <p className="text-xs text-slate-400 dark:text-[#94A3B8]">
                  Try searching for customer names, email addresses, themes, or feedback keywords.
                </p>
              </div>
            )}

            {/* Results Grouped by Categories */}
            {query.trim() && (
              <div className="space-y-4">
                {/* 1. Feedback Category */}
                {results.feedback.length > 0 && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-[#94A3B8]/70">
                      <span className="flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-blue-500" />
                        Feedback Tickets ({results.feedback.length})
                      </span>
                    </div>
                    {results.feedback.map((item) => {
                      const globalIdx = allFlattenedResults.findIndex((r) => r.id === item.id);
                      const isSelected = globalIdx === selectedIndex;
                      return (
                        <div
                          key={item.id}
                          onClick={() => handleSelectResult(item.href)}
                          onMouseEnter={() => setSelectedIndex(globalIdx)}
                          className={`p-3 rounded-xl cursor-pointer transition-colors flex items-start justify-between gap-3 ${
                            isSelected
                              ? "bg-blue-50 dark:bg-blue-950/40 border border-blue-200/50 dark:border-blue-900/40"
                              : "hover:bg-slate-50 dark:hover:bg-white/[0.02]"
                          }`}
                        >
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                                <HighlightMatch text={item.customerName || "Customer"} query={debouncedQuery} />
                              </span>
                              <span className="text-[10px] text-slate-400 truncate">
                                <HighlightMatch text={item.customerEmail || ""} query={debouncedQuery} />
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                              <HighlightMatch text={item.content || ""} query={debouncedQuery} />
                            </p>
                          </div>
                          <ArrowRight className={`w-4 h-4 shrink-0 transition-transform ${isSelected ? "text-blue-600 dark:text-blue-400 translate-x-0.5" : "text-slate-300 dark:text-slate-600"}`} />
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 2. Customers Category */}
                {results.customers.length > 0 && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-[#94A3B8]/70">
                      <span className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-emerald-500" />
                        Customers ({results.customers.length})
                      </span>
                    </div>
                    {results.customers.map((item) => {
                      const globalIdx = allFlattenedResults.findIndex((r) => r.id === item.id);
                      const isSelected = globalIdx === selectedIndex;
                      return (
                        <div
                          key={item.id}
                          onClick={() => handleSelectResult(item.href)}
                          onMouseEnter={() => setSelectedIndex(globalIdx)}
                          className={`p-2.5 rounded-xl cursor-pointer transition-colors flex items-center justify-between gap-3 ${
                            isSelected
                              ? "bg-blue-50 dark:bg-blue-950/40 border border-blue-200/50 dark:border-blue-900/40"
                              : "hover:bg-slate-50 dark:hover:bg-white/[0.02]"
                          }`}
                        >
                          <div className="min-w-0 flex-1 flex items-center gap-3">
                            <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 flex items-center justify-center text-xs font-bold shrink-0">
                              {item.title[0]?.toUpperCase() || "C"}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                                <HighlightMatch text={item.title} query={debouncedQuery} />
                              </p>
                              <p className="text-[10px] text-slate-400 truncate">
                                <HighlightMatch text={item.email || ""} query={debouncedQuery} />
                              </p>
                            </div>
                          </div>
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-800 text-slate-500 uppercase">
                            {item.label || "free"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 3. Reports Category */}
                {results.reports.length > 0 && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-[#94A3B8]/70">
                      <span className="flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-purple-500" />
                        Voice of Customer Reports ({results.reports.length})
                      </span>
                    </div>
                    {results.reports.map((item) => {
                      const globalIdx = allFlattenedResults.findIndex((r) => r.id === item.id);
                      const isSelected = globalIdx === selectedIndex;
                      return (
                        <div
                          key={item.id}
                          onClick={() => handleSelectResult(item.href)}
                          onMouseEnter={() => setSelectedIndex(globalIdx)}
                          className={`p-2.5 rounded-xl cursor-pointer transition-colors flex items-center justify-between gap-3 ${
                            isSelected
                              ? "bg-blue-50 dark:bg-blue-950/40 border border-blue-200/50 dark:border-blue-900/40"
                              : "hover:bg-slate-50 dark:hover:bg-white/[0.02]"
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                              <HighlightMatch text={item.title} query={debouncedQuery} />
                            </p>
                            <p className="text-[10px] text-slate-400 line-clamp-1">
                              <HighlightMatch text={item.summary || ""} query={debouncedQuery} />
                            </p>
                          </div>
                          <ArrowRight className={`w-4 h-4 shrink-0 ${isSelected ? "text-blue-500" : "text-slate-300"}`} />
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 4. Themes Category */}
                {results.themes.length > 0 && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-[#94A3B8]/70">
                      <span className="flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        Themes ({results.themes.length})
                      </span>
                    </div>
                    {results.themes.map((item) => {
                      const globalIdx = allFlattenedResults.findIndex((r) => r.id === item.id);
                      const isSelected = globalIdx === selectedIndex;
                      return (
                        <div
                          key={item.id}
                          onClick={() => handleSelectResult(item.href)}
                          onMouseEnter={() => setSelectedIndex(globalIdx)}
                          className={`p-2.5 rounded-xl cursor-pointer transition-colors flex items-center justify-between gap-3 ${
                            isSelected
                              ? "bg-blue-50 dark:bg-blue-950/40 border border-blue-200/50 dark:border-blue-900/40"
                              : "hover:bg-slate-50 dark:hover:bg-white/[0.02]"
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                              <HighlightMatch text={item.title} query={debouncedQuery} />
                            </p>
                            <p className="text-[10px] text-slate-400 truncate">
                              <HighlightMatch text={item.description || ""} query={debouncedQuery} />
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 5. Settings Category */}
                {results.settings.length > 0 && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-[#94A3B8]/70">
                      <span className="flex items-center gap-1.5">
                        <Settings className="w-3.5 h-3.5 text-slate-500" />
                        Settings & Navigation ({results.settings.length})
                      </span>
                    </div>
                    {results.settings.map((item) => {
                      const globalIdx = allFlattenedResults.findIndex((r) => r.id === item.id);
                      const isSelected = globalIdx === selectedIndex;
                      return (
                        <div
                          key={item.id}
                          onClick={() => handleSelectResult(item.href)}
                          onMouseEnter={() => setSelectedIndex(globalIdx)}
                          className={`p-2.5 rounded-xl cursor-pointer transition-colors flex items-center justify-between gap-3 ${
                            isSelected
                              ? "bg-blue-50 dark:bg-blue-950/40 border border-blue-200/50 dark:border-blue-900/40"
                              : "hover:bg-slate-50 dark:hover:bg-white/[0.02]"
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                              <HighlightMatch text={item.title} query={debouncedQuery} />
                            </p>
                            <p className="text-[10px] text-slate-400 truncate">
                              <HighlightMatch text={item.description || ""} query={debouncedQuery} />
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer Bar with Keyboard Controls */}
          <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-200 dark:border-white/[0.08] flex items-center justify-between text-[10px] text-slate-400 dark:text-[#94A3B8]">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 rounded bg-slate-200 dark:bg-white/[0.1] font-mono text-[9px]">↑↓</kbd> Navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 rounded bg-slate-200 dark:bg-white/[0.1] font-mono text-[9px]">↵</kbd> Select
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 rounded bg-slate-200 dark:bg-white/[0.1] font-mono text-[9px]">ESC</kbd> Close
              </span>
            </div>
            <span>{results.totalResults} results found</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
