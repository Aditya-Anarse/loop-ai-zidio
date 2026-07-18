"use client";

import * as React from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", type = "text", label, error, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {label}
          </label>
        )}
        <input
          type={type}
          className={`flex h-[52px] w-full rounded-[14px] border border-white/[0.08] bg-[#0F172A]/50 px-4 py-3 text-sm text-[#F8FAFC] ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-[#94A3B8]/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED]/30 focus-visible:border-[#7C3AED] disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-200 ${
            error ? "border-[#EF4444] focus-visible:ring-[#EF4444]/30 focus-visible:border-[#EF4444]" : ""
          } ${className}`}
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

Input.displayName = "Input";
