"use client";

import * as React from "react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../ui/card";
import { trendData } from "../feedback/mockData";

interface LineChartProps {
  data?: any[];
}

export default function LineChart({ data = trendData }: LineChartProps) {
  return (
    <Card className="bg-card border border-slate-200 dark:border-white/[0.08] shadow-sm">
      <CardHeader>
        <CardTitle className="text-base font-bold text-slate-800 dark:text-[#F8FAFC]">Feedback Trends</CardTitle>
        <CardDescription className="text-xs text-slate-500 dark:text-[#94A3B8]">Daily volume breakdown by positive, negative, and neutral sentiment</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-72 w-full mt-4 select-none">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorPositive" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorNegative" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-slate-200 dark:text-slate-800" opacity={0.5} />
              <XAxis
                dataKey="date"
                stroke="currentColor"
                className="text-slate-400 dark:text-[#94A3B8]"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                dy={10}
              />
              <YAxis
                stroke="currentColor"
                className="text-slate-400 dark:text-[#94A3B8]"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                dx={-10}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--card)",
                  borderColor: "var(--border)",
                  borderRadius: "10px",
                  color: "var(--foreground)",
                  fontSize: "11px",
                }}
                labelStyle={{ fontWeight: "bold", marginBottom: "4px" }}
              />
              <Legend
                verticalAlign="top"
                height={36}
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: "11px", paddingBottom: "10px" }}
              />
              <Area
                name="Total Volume"
                type="monotone"
                dataKey="volume"
                stroke="#3b82f6"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorVolume)"
              />
              <Area
                name="Positive"
                type="monotone"
                dataKey="positive"
                stroke="#10b981"
                strokeWidth={1.5}
                fillOpacity={1}
                fill="url(#colorPositive)"
              />
              <Area
                name="Negative"
                type="monotone"
                dataKey="negative"
                stroke="#ef4444"
                strokeWidth={1.5}
                fillOpacity={1}
                fill="url(#colorNegative)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
