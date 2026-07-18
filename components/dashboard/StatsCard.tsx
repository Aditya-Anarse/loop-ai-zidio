"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown } from "lucide-react";
import { Card } from "../ui/card";

interface StatsCardProps {
  title: string;
  value: string | number;
  subtext: string;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  icon: React.ReactNode;
  iconBgClass?: string;
  delay?: number;
}

export default function StatsCard({
  title,
  value,
  subtext,
  trend,
  icon,
  iconBgClass = "bg-blue-500/10 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
  delay = 0,
}: StatsCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      className="w-full"
    >
      <Card className="h-[150px] p-[28px] relative overflow-hidden bg-card border border-slate-200 dark:border-white/[0.08] group hover:border-blue-500/20 dark:hover:border-blue-500/30 hover:shadow-lg dark:hover:shadow-blue-500/5 transition-all duration-300 rounded-[20px] hover:-translate-y-[4px]">
        {/* Glow ambient effect on hover */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-all pointer-events-none" />

        <div className="flex justify-between items-start h-full w-full">
          <div className="flex flex-col justify-between h-full min-w-0">
            <div className="space-y-1">
              <span className="text-[12px] font-bold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wider block">
                {title}
              </span>
              <p className="text-[11px] text-slate-400 dark:text-[#94A3B8]/60 font-medium truncate max-w-[180px] lg:max-w-none">
                {subtext}
              </p>
            </div>

            <div className="flex items-baseline gap-2.5 mt-auto">
              <span className="text-[36px] font-bold text-slate-800 dark:text-[#F8FAFC] tracking-tight leading-none">
                {value}
              </span>

              {trend && (
                <span
                  className={`text-[10px] font-bold flex items-center gap-0.5 px-2 py-0.5 rounded-full border shrink-0 ${
                    trend.isPositive
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-[#34D399] border-emerald-500/20"
                      : "bg-rose-500/10 text-rose-600 dark:text-[#F87171] border-rose-500/20"
                  }`}
                >
                  {trend.isPositive ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  {trend.value}
                </span>
              )}
            </div>
          </div>

          <div className={`p-3 rounded-[12px] shrink-0 border border-slate-100 dark:border-white/[0.08] ${iconBgClass}`}>
            {icon}
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
