import * as React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  glass?: boolean;
  hoverGlow?: boolean;
}

export function Card({
  className = "",
  glass = false,
  hoverGlow = false,
  ...props
}: CardProps) {
  const baseClasses =
    "rounded-[20px] border border-slate-200 dark:border-white/[0.08] bg-card text-card-foreground shadow-sm transition-all duration-300 relative overflow-hidden";
  const glassClasses = glass ? "glass" : "";
  const hoverClasses = hoverGlow
    ? "hover:shadow-lg dark:hover:shadow-blue-500/5 hover:border-blue-500/20 dark:hover:border-blue-500/30 hover:-translate-y-[4px]"
    : "";

  return (
    <div
      className={`${baseClasses} ${glassClasses} ${hoverClasses} ${className}`}
      {...props}
    />
  );
}

export function CardHeader({
  className = "",
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`flex flex-col space-y-1.5 p-6 border-b border-slate-100 dark:border-white/[0.08] ${className}`}
      {...props}
    />
  );
}

export function CardTitle({
  className = "",
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={`text-lg font-bold leading-none tracking-tight text-slate-800 dark:text-[#F8FAFC] ${className}`}
      {...props}
    />
  );
}

export function CardDescription({
  className = "",
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={`text-sm text-slate-500 dark:text-[#94A3B8] ${className}`}
      {...props}
    />
  );
}

export function CardContent({
  className = "",
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`p-6 ${className}`} {...props} />;
}

export function CardFooter({
  className = "",
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`flex items-center p-6 pt-0 border-t border-slate-100 dark:border-white/[0.08] mt-6 ${className}`}
      {...props}
    />
  );
}
