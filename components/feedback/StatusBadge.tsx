"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Check, Clock, ShieldAlert, BadgeCheck } from "lucide-react";
import { StatusType } from "./mockData";

interface StatusBadgeProps {
  status: StatusType;
  interactive?: boolean;
  onStatusChange?: (newStatus: StatusType) => void;
}

const statusConfigs = {
  NEW: {
    label: "NEW",
    bgClass: "bg-[#7C3AED]/10 text-[#A78BFA] border-[#7C3AED]/35 hover:bg-[#7C3AED]/20 shadow-[0_0_12px_rgba(124,58,237,0.15)]",
    dotClass: "bg-[#8B5CF6]",
    icon: <ShieldAlert className="w-3.5 h-3.5" />,
  },
  REVIEWED: {
    label: "REVIEWED",
    bgClass: "bg-[#F59E0B]/10 text-[#FBBF24] border-[#F59E0B]/35 hover:bg-[#F59E0B]/20 shadow-[0_0_12px_rgba(245,158,11,0.15)]",
    dotClass: "bg-[#F59E0B]",
    icon: <Clock className="w-3.5 h-3.5" />,
  },
  ACTIONED: {
    label: "ACTIONED",
    bgClass: "bg-[#10B981]/10 text-[#34D399] border-[#10B981]/35 hover:bg-[#10B981]/20 shadow-[0_0_12px_rgba(16,185,129,0.15)]",
    dotClass: "bg-[#10B981]",
    icon: <BadgeCheck className="w-3.5 h-3.5" />,
  },
};

export default function StatusBadge({ status, interactive = false, onStatusChange }: StatusBadgeProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const config = statusConfigs[status] || statusConfigs.NEW;

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleSelectStatus = (newStatus: StatusType) => {
    if (onStatusChange && newStatus !== status) {
      onStatusChange(newStatus);
    }
    setIsOpen(false);
  };

  const badgeContent = (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold tracking-wide border cursor-pointer select-none transition-all ${config.bgClass}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dotClass}`} />
      <span className="text-[10px] uppercase font-bold">{config.label}</span>
      {interactive && <ChevronDown className="w-3 h-3 opacity-60 ml-0.5" />}
    </span>
  );

  if (!interactive) {
    return (
      <div className="inline-block">
        {badgeContent}
      </div>
    );
  }

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="focus:outline-none focus:ring-0 active:scale-95 transition-transform"
      >
        {badgeContent}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute z-50 left-0 mt-1.5 w-32 rounded-lg border border-white/[0.08] bg-[#0F172A] p-1 shadow-lg shadow-black/50 backdrop-blur-xl"
          >
            {(Object.keys(statusConfigs) as StatusType[]).map((statusKey) => {
              const isSelected = statusKey === status;
              const optionConfig = statusConfigs[statusKey];
              return (
                <button
                  key={statusKey}
                  type="button"
                  onClick={() => handleSelectStatus(statusKey)}
                  className={`flex w-full items-center justify-between rounded-md px-2.5 py-2 text-[10px] font-bold transition-all hover:bg-white/[0.04] text-left cursor-pointer ${
                    isSelected ? "text-[#7C3AED]" : "text-[#94A3B8] hover:text-[#F8FAFC]"
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${optionConfig.dotClass}`} />
                    <span>{optionConfig.label}</span>
                  </span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-[#7C3AED]" />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
