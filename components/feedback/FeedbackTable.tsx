"use client";

import * as React from "react";
import {
  Mail,
  MessageSquare,
  Share2,
  Phone,
  Globe,
  Trash2,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Layers,
} from "lucide-react";
import { FeedbackItem, ChannelType, StatusType, SentimentType } from "./mockData";
import StatusBadge from "./StatusBadge";
import { Button } from "../ui/button";

interface FeedbackTableProps {
  data: FeedbackItem[];
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  onStatusChange: (id: string, newStatus: StatusType) => void;
  onDelete: (id: string) => void;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
}

// Helpers for channel icons & label classes
const getChannelDetails = (channel: ChannelType) => {
  switch (channel) {
    case "email":
      return { icon: <Mail className="w-3.5 h-3.5" />, label: "Email", colorClass: "bg-[#6366F1]/10 text-[#818CF8] border-[#6366F1]/20" };
    case "chat":
      return { icon: <MessageSquare className="w-3.5 h-3.5" />, label: "Live Chat", colorClass: "bg-[#10B981]/10 text-[#34D399] border-[#10B981]/20" };
    case "social":
      return { icon: <Share2 className="w-3.5 h-3.5" />, label: "Social", colorClass: "bg-[#7C3AED]/10 text-[#C084FC] border-[#7C3AED]/20" };
    case "phone":
      return { icon: <Phone className="w-3.5 h-3.5" />, label: "Phone", colorClass: "bg-[#F59E0B]/10 text-[#FBBF24] border-[#F59E0B]/20" };
    default:
      return { icon: <Globe className="w-3.5 h-3.5" />, label: "Web Portal", colorClass: "bg-white/5 text-[#94A3B8] border-white/[0.08]" };
  }
};

const getLabelDetails = (label: string) => {
  switch (label) {
    case "vip":
      return { label: "VIP", color: "bg-[#7C3AED]/10 text-[#C084FC] border-[#7C3AED]/20" };
    case "enterprise":
      return { label: "Enterprise", color: "bg-[#6366F1]/10 text-[#818CF8] border-[#6366F1]/20" };
    case "growth":
      return { label: "Growth", color: "bg-[#10B981]/10 text-[#34D399] border-[#10B981]/20" };
    case "churn_risk":
      return { label: "Churn Risk", color: "bg-[#EF4444]/10 text-[#F87171] border-[#EF4444]/20" };
    default:
      return { label: "Free", color: "bg-white/5 text-[#94A3B8] border-white/[0.08]" };
  }
};

const getSentimentDetails = (sentiment: SentimentType) => {
  switch (sentiment) {
    case "positive":
      return { label: "Positive", badgeClass: "bg-[#10B981]/10 text-[#34D399] border-[#10B981]/20" };
    case "negative":
      return { label: "Negative", badgeClass: "bg-[#EF4444]/10 text-[#F87171] border-[#EF4444]/20" };
    default:
      return { label: "Neutral", badgeClass: "bg-[#F59E0B]/10 text-[#FBBF24] border-[#F59E0B]/20" };
  }
};

export default function FeedbackTable({
  data,
  isLoading = false,
  isError = false,
  onRetry,
  onStatusChange,
  onDelete,
  selectedIds,
  onSelectionChange,
}: FeedbackTableProps) {
  const [expandedRowId, setExpandedRowId] = React.useState<string | null>(null);

  const toggleExpandRow = (id: string) => {
    setExpandedRowId(expandedRowId === id ? null : id);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(data.map((item) => item.id));
    } else {
      onSelectionChange([]);
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedIds, id]);
    } else {
      onSelectionChange(selectedIds.filter((rowId) => rowId !== id));
    }
  };

  // Rendering loading state
  if (isLoading) {
    return (
      <div className="w-full rounded-2xl border border-white/[0.08] bg-[#111827]/30 backdrop-blur-xl overflow-hidden">
        <div className="p-4 border-b border-white/[0.08] bg-[#0F172A]/50 flex space-x-4 animate-pulse">
          <div className="h-4 w-4 bg-[#0F172A] rounded" />
          <div className="h-4 w-28 bg-[#0F172A] rounded" />
          <div className="h-4 w-44 bg-[#0F172A] rounded" />
          <div className="h-4 w-16 bg-[#0F172A] rounded" />
          <div className="h-4 w-20 bg-[#0F172A] rounded" />
          <div className="h-4 w-20 bg-[#0F172A] rounded" />
        </div>
        <div className="divide-y divide-white/[0.08]">
          {[1, 2, 3, 4, 5].map((idx) => (
            <div key={idx} className="p-4 flex space-x-4 items-center animate-pulse">
              <div className="h-4 w-4 bg-[#0F172A] rounded" />
              <div className="flex items-center space-x-3 w-32">
                <div className="w-8 h-8 rounded-full bg-[#0F172A]" />
                <div className="space-y-1 flex-1">
                  <div className="h-3 w-16 bg-[#0F172A] rounded" />
                  <div className="h-2 w-20 bg-[#0F172A] rounded" />
                </div>
              </div>
              <div className="flex-1 h-3 bg-[#0F172A] rounded" />
              <div className="h-5 w-16 bg-[#0F172A] rounded-full" />
              <div className="h-5 w-14 bg-[#0F172A] rounded-full" />
              <div className="h-5 w-20 bg-[#0F172A] rounded-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Rendering error state
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center p-12 rounded-2xl border border-[#EF4444]/20 bg-[#EF4444]/5 text-center space-y-4">
        <AlertTriangle className="w-10 h-10 text-[#EF4444]" />
        <div className="space-y-1">
          <h3 className="text-base font-bold text-[#F8FAFC]">Failed to Load Inbox</h3>
          <p className="text-sm text-[#94A3B8] max-w-sm">
            An error occurred while fetching your customer feedback. Please try again.
          </p>
        </div>
        {onRetry && (
          <Button variant="secondary" size="sm" onClick={onRetry}>
            Try Again
          </Button>
        )}
      </div>
    );
  }

  // Rendering empty state
  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-16 rounded-2xl border border-white/[0.08] bg-[#111827]/10 text-center space-y-4">
        <div className="p-4 bg-[#7C3AED]/10 rounded-full text-[#7C3AED]">
          <Layers className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-bold text-[#F8FAFC]">No Feedback Found</h3>
          <p className="text-sm text-[#94A3B8] max-w-sm">
            Try adjusting your filters, clearing your search, or adding new customer submissions.
          </p>
        </div>
      </div>
    );
  }

  const isAllSelected = data.length > 0 && selectedIds.length === data.length;
  const isSomeSelected = selectedIds.length > 0 && selectedIds.length < data.length;

  return (
    <div className="w-full overflow-hidden rounded-[20px] border border-white/[0.08] bg-[#111827]/30 backdrop-blur-xl shadow-2xl">
      <div className="overflow-x-auto w-full max-h-[600px] select-text">
        <table className="w-full border-collapse text-left text-sm">
          {/* Sticky Header */}
          <thead className="sticky top-0 z-20 bg-[#0F172A]/90 border-b border-white/[0.08] text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider select-none">
            <tr className="h-[64px]">
              <th className="px-6 py-4 w-12 text-center">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  ref={(el) => {
                    if (el) {
                      el.indeterminate = isSomeSelected;
                    }
                  }}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="w-4 h-4 rounded border-white/[0.15] text-[#7C3AED] focus:ring-[#7C3AED]/30 bg-white/[0.02] cursor-pointer accent-[#7C3AED]"
                />
              </th>
              <th className="px-6 py-4 w-44">Customer</th>
              <th className="px-6 py-4 min-w-[280px]">Feedback</th>
              <th className="px-6 py-4 w-28">Channel</th>
              <th className="px-6 py-4 w-28">Sentiment</th>
              <th className="px-6 py-4 w-28">Theme</th>
              <th className="px-6 py-4 w-32">Status</th>
              <th className="px-6 py-4 w-28">Date</th>
              <th className="px-6 py-4 w-16 text-center">Actions</th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-white/[0.06] bg-white/[0.01]">
            {data.map((item) => {
              const chan = getChannelDetails(item.channel);
              const label = getLabelDetails(item.customerLabel);
              const sent = getSentimentDetails(item.sentiment);
              const isSelected = selectedIds.includes(item.id);
              const isExpanded = expandedRowId === item.id;
              
              // Truncation calculation
              const shouldTruncate = item.text.length > 95;
              const displayText = shouldTruncate && !isExpanded 
                ? `${item.text.substring(0, 95)}...` 
                : item.text;

              return (
                <tr
                  key={item.id}
                  className={`group transition-all duration-200 border-white/[0.04] h-[64px] ${
                    isSelected ? "bg-[#7C3AED]/5" : "hover:bg-white/[0.02]"
                  }`}
                >
                  {/* Checkbox */}
                  <td className="px-6 py-4 text-center select-none">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => handleSelectRow(item.id, e.target.checked)}
                      className="w-4 h-4 rounded border-white/[0.15] text-[#7C3AED] focus:ring-[#7C3AED]/30 bg-white/[0.02] cursor-pointer accent-[#7C3AED]"
                    />
                  </td>

                  {/* Customer */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={item.customerAvatar}
                        alt={item.customerName}
                        className="w-8 h-8 rounded-full border border-white/[0.08] object-cover bg-white/[0.02] shrink-0"
                      />
                      <div className="flex flex-col min-w-0">
                        <span className="font-semibold text-[#F8FAFC] truncate text-xs">
                          {item.customerName}
                        </span>
                        <span className="text-[10px] text-[#94A3B8] truncate max-w-[120px]">
                          {item.customerEmail}
                        </span>
                        <span className={`inline-block w-max px-1.5 py-0.5 rounded text-[8px] font-bold border uppercase mt-1 ${label.color}`}>
                          {label.label}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Feedback Message */}
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1.5">
                      <p className="text-xs text-[#F8FAFC]/90 font-sans leading-relaxed break-words whitespace-pre-wrap max-w-xl">
                        {displayText}
                      </p>
                      {shouldTruncate && (
                        <button
                          onClick={() => toggleExpandRow(item.id)}
                          className="flex items-center gap-0.5 text-[10px] font-bold text-[#7C3AED] hover:text-[#6366F1] transition-colors w-max cursor-pointer mt-1"
                        >
                          {isExpanded ? (
                            <>Show Less <ChevronUp className="w-3 h-3" /></>
                          ) : (
                            <>Show More <ChevronDown className="w-3 h-3" /></>
                          )}
                        </button>
                      )}
                    </div>
                  </td>

                  {/* Channel */}
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium border ${chan.colorClass}`}>
                      {chan.icon}
                      <span className="font-semibold">{chan.label}</span>
                    </span>
                  </td>

                  {/* Sentiment */}
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${sent.badgeClass} font-semibold capitalize`}>
                      {sent.label}
                    </span>
                  </td>

                  {/* Theme */}
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#7C3AED]/5 text-[#A78BFA] border border-[#7C3AED]/10">
                      {item.theme}
                    </span>
                  </td>

                  {/* Status Toggle Badge */}
                  <td className="px-6 py-4">
                    <StatusBadge
                      status={item.status}
                      interactive
                      onStatusChange={(newStatus) => onStatusChange(item.id, newStatus)}
                    />
                  </td>

                  {/* Date */}
                  <td className="px-6 py-4">
                    <span className="text-xs text-[#94A3B8] whitespace-nowrap">
                      {item.date}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => onDelete(item.id)}
                        className="p-1.5 rounded-md text-[#94A3B8] hover:bg-[#EF4444]/15 hover:text-[#EF4444] transition-all cursor-pointer"
                        title="Delete feedback"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
