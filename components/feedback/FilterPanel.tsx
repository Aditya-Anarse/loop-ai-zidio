"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Filter, X, RotateCcw } from "lucide-react";
import { Select } from "../ui/select";
import { Button } from "../ui/button";

export interface FilterState {
  channel: string;
  sentiment: string;
  theme: string;
  status: string;
  dateRange: string;
}

interface FilterPanelProps {
  isOpen: boolean;
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  onClear: () => void;
}

const channelOptions = [
  { value: "all", label: "All Channels" },
  { value: "email", label: "Email" },
  { value: "chat", label: "Live Chat" },
  { value: "social", label: "Social Media" },
  { value: "phone", label: "Phone Support" },
  { value: "other", label: "Web Portal" },
];

const sentimentOptions = [
  { value: "all", label: "All Sentiments" },
  { value: "positive", label: "Positive" },
  { value: "neutral", label: "Neutral" },
  { value: "negative", label: "Negative" },
];

const statusOptions = [
  { value: "all", label: "All Statuses" },
  { value: "NEW", label: "New" },
  { value: "REVIEWED", label: "Reviewed" },
  { value: "ACTIONED", label: "Actioned" },
];

const themeOptions = [
  { value: "all", label: "All Themes" },
  { value: "Performance", label: "Performance" },
  { value: "Bug", label: "Bug" },
  { value: "Billing", label: "Billing" },
  { value: "AI Features", label: "AI Features" },
  { value: "UI/UX", label: "UI/UX" },
  { value: "Security", label: "Security" },
  { value: "General", label: "General" },
];

const dateOptions = [
  { value: "all", label: "All Time" },
  { value: "today", label: "Today" },
  { value: "7days", label: "Last 7 Days" },
  { value: "30days", label: "Last 30 Days" },
];

export default function FilterPanel({ isOpen, filters, onChange, onClear }: FilterPanelProps) {
  const handleFilterChange = (key: keyof FilterState, value: string) => {
    onChange({
      ...filters,
      [key]: value,
    });
  };

  const hasActiveFilters = Object.values(filters).some((val) => val && val !== "all");

  return (
    <motion.div
      initial={false}
      animate={isOpen ? { height: "auto", opacity: 1, marginTop: 16 } : { height: 0, opacity: 0, marginTop: 0 }}
      transition={{ duration: 0.25, ease: "easeInOut" }}
      className="overflow-hidden w-full"
    >
      <div className="p-[28px] rounded-[20px] border border-white/[0.08] bg-[#111827]/30 backdrop-blur-xl space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#F8FAFC]">
            <Filter className="w-4 h-4 text-[#7C3AED]" />
            <span>Advanced Filters</span>
          </div>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClear}
              className="text-xs flex items-center gap-1 hover:text-[#7C3AED]"
            >
              <RotateCcw className="w-3 h-3" /> Reset Filters
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-6">
          {/* Channel Filter */}
          <Select
            label="Channel"
            options={channelOptions}
            value={filters.channel || "all"}
            onChange={(val) => handleFilterChange("channel", val)}
          />

          {/* Sentiment Filter */}
          <Select
            label="Sentiment"
            options={sentimentOptions}
            value={filters.sentiment || "all"}
            onChange={(val) => handleFilterChange("sentiment", val)}
          />

          {/* Theme Filter */}
          <Select
            label="Theme"
            options={themeOptions}
            value={filters.theme || "all"}
            onChange={(val) => handleFilterChange("theme", val)}
          />

          {/* Status Filter */}
          <Select
            label="Status"
            options={statusOptions}
            value={filters.status || "all"}
            onChange={(val) => handleFilterChange("status", val)}
          />

          {/* Date Filter */}
          <Select
            label="Date Range"
            options={dateOptions}
            value={filters.dateRange || "all"}
            onChange={(val) => handleFilterChange("dateRange", val)}
          />
        </div>
      </div>
    </motion.div>
  );
}
