"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Check } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  color?: string; // Hex or CSS color name for custom tags
}

export interface SelectProps {
  label?: string;
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  className?: string;
}

export function Select({
  label,
  options,
  value,
  onChange,
  placeholder = "Select an option",
  error,
  className = "",
}: SelectProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  // Close dropdown on click outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
  };

  return (
    <div className={`flex flex-col gap-1.5 w-full relative ${className}`} ref={containerRef}>
      {label && (
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {label}
        </label>
      )}

      {/* Dropdown Toggle Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex h-[52px] w-full items-center justify-between rounded-[14px] border border-white/[0.08] bg-[#0F172A]/50 px-4 py-3 text-sm text-[#F8FAFC] ring-offset-background placeholder:text-[#94A3B8]/50 focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30 focus:border-[#7C3AED] transition-all text-left cursor-pointer ${
          error ? "border-[#EF4444] focus:ring-[#EF4444]/30 focus:border-[#EF4444]" : ""
        }`}
      >
        {selectedOption ? (
          <span className="flex items-center gap-2">
            {selectedOption.icon && (
              <span className="text-[#94A3B8]">{selectedOption.icon}</span>
            )}
            {selectedOption.color && (
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: selectedOption.color }}
              />
            )}
            <span>{selectedOption.label}</span>
          </span>
        ) : (
          <span className="text-[#94A3B8]/50">{placeholder}</span>
        )}
        <ChevronDown
          className={`h-4 w-4 text-[#94A3B8] transition-transform duration-200 ${
            isOpen ? "transform rotate-180" : ""
          }`}
        />
      </button>

      {/* Options Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute z-50 left-0 right-0 top-[calc(100%+4px)] max-h-60 overflow-auto rounded-[14px] border border-white/[0.08] bg-[#0F172A] p-1 shadow-lg shadow-black/50 backdrop-blur-xl"
          >
            {options.map((option) => {
              const isSelected = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleSelect(option.value)}
                  className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-colors text-left cursor-pointer ${
                    isSelected
                      ? "bg-[#7C3AED] text-[#F8FAFC] font-medium"
                      : "text-[#F8FAFC] hover:bg-white/[0.04]"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    {option.icon && (
                      <span className={isSelected ? "text-white" : "text-muted-foreground"}>
                        {option.icon}
                      </span>
                    )}
                    {option.color && (
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: option.color }}
                      />
                    )}
                    <span>{option.label}</span>
                  </span>
                  {isSelected && <Check className="h-4 w-4 text-white" />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <span className="text-xs text-destructive font-medium mt-0.5">
          {error}
        </span>
      )}
    </div>
  );
}
