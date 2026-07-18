"use client";

import * as React from "react";
import { Search, X, Command } from "lucide-react";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function SearchBar({ value, onChange, placeholder = "Search feedback, customer name, email..." }: SearchBarProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore shortcuts if the user is typing in any input or textarea
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable
      ) {
        return;
      }

      // Focus on command+K / ctrl+K or '/'
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      } else if (e.key === "/") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="relative flex items-center w-full max-w-md group">
      {/* Search Icon */}
      <Search className="absolute left-4 w-4 h-4 text-[#94A3B8] group-focus-within:text-[#7C3AED] transition-colors pointer-events-none" />

      {/* Input Field */}
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-[52px] pl-[44px] pr-20 rounded-[14px] border border-white/[0.08] bg-[#0F172A]/50 backdrop-blur-md text-sm text-[#F8FAFC] placeholder:text-[#94A3B8]/50 focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30 focus:border-[#7C3AED] transition-all shadow-xs"
      />

      {/* Keyboard Hint & Clear Button */}
      <div className="absolute right-4 flex items-center gap-1.5">
        {value ? (
          <button
            onClick={() => onChange("")}
            className="p-1 rounded-full text-[#94A3B8] hover:bg-white/[0.08] hover:text-[#F8FAFC] transition-all cursor-pointer"
            title="Clear search"
          >
            <X className="w-3 h-3" />
          </button>
        ) : (
          <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-0.5 rounded-md border border-white/[0.08] bg-white/[0.05] px-1.5 font-mono text-[9px] font-medium text-[#94A3B8] opacity-80">
            <Command className="w-2.5 h-2.5" /> K
          </kbd>
        )}
      </div>
    </div>
  );
}
