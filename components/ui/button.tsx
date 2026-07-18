"use client";

import * as React from "react";
import { motion } from "framer-motion";

import { HTMLMotionProps } from "framer-motion";

export interface ButtonProps extends Omit<HTMLMotionProps<"button">, "ref" | "children"> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "success";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  children?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className = "",
      variant = "primary",
      size = "md",
      isLoading = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    // Base styles
    let baseStyles =
      "inline-flex items-center justify-center font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer";

    // Variant styles
    let variantStyles = "";
    if (variant === "primary") {
      variantStyles =
        "bg-linear-to-r from-[#7C3AED] to-[#6366F1] hover:from-[#6D28D9] hover:to-[#4F46E5] text-white border border-[#8B5CF6]/20 shadow-md shadow-[#7C3AED]/10 hover:shadow-xl hover:shadow-[#7C3AED]/20";
    } else if (variant === "secondary") {
      variantStyles =
        "border border-white/[0.08] bg-white/[0.04] text-[#F8FAFC] hover:bg-white/[0.08] shadow-xs hover:shadow-md transition-all";
    } else if (variant === "ghost") {
      variantStyles = "text-[#94A3B8] hover:bg-white/[0.04] hover:text-[#F8FAFC] transition-all";
    } else if (variant === "danger") {
      variantStyles = "bg-[#EF4444] text-white hover:bg-[#EF4444]/90 shadow-md shadow-[#EF4444]/10 border border-[#EF4444]/20 hover:shadow-xl hover:shadow-[#EF4444]/20";
    } else if (variant === "success") {
      variantStyles =
        "bg-[#10B981] text-white hover:bg-[#10B981]/90 shadow-md shadow-[#10B981]/10 border border-[#10B981]/20 hover:shadow-xl hover:shadow-[#10B981]/20";
    }

    // Size styles
    let sizeStyles = "";
    if (size === "sm") {
      sizeStyles = "h-8 px-3 text-xs gap-1.5 rounded-lg";
    } else if (size === "md") {
      sizeStyles = "h-[52px] px-6 py-3 text-sm gap-2 rounded-[14px]";
    } else if (size === "lg") {
      sizeStyles = "h-[56px] px-8 text-base gap-3 rounded-[14px]";
    }

    return (
      <motion.button
        ref={ref}
        disabled={disabled || isLoading}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={`${baseStyles} ${variantStyles} ${sizeStyles} ${className}`}
        {...props}
      >
        {isLoading && (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </motion.button>
    );
  }
);

Button.displayName = "Button";
