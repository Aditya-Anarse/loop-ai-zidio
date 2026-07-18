"use client";

import * as React from "react";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  maxLength?: number;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className = "", label, error, maxLength, value, onChange, ...props }, ref) => {
    // Keep track of characters length if value is controlled
    const currentLength = typeof value === "string" ? value.length : 0;

    return (
      <div className="flex flex-col gap-1.5 w-full">
        <div className="flex justify-between items-center">
          {label && (
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {label}
            </label>
          )}
          {maxLength && (
            <span className="text-xs text-muted-foreground">
              {currentLength} / {maxLength}
            </span>
          )}
        </div>
        <textarea
          className={`flex min-h-[180px] w-full rounded-[14px] border border-white/[0.08] bg-[#0F172A]/50 px-4 py-3 text-sm text-[#F8FAFC] ring-offset-background placeholder:text-[#94A3B8]/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED]/30 focus-visible:border-[#7C3AED] disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200 resize-y ${
            error ? "border-[#EF4444] focus-visible:ring-[#EF4444]/30 focus-visible:border-[#EF4444]" : ""
          } ${className}`}
          maxLength={maxLength}
          value={value}
          onChange={onChange}
          ref={ref}
          {...props}
        />
        {error && (
          <span className="text-xs text-destructive font-medium mt-0.5">
            {error}
          </span>
        )}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";
