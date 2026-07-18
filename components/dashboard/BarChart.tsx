"use client";

import * as React from "react";
import { ResponsiveContainer, BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from "recharts";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../ui/card";
import { themeDistribution } from "../feedback/mockData";

interface BarChartProps {
  data?: any[];
}

export default function BarChart({ data = themeDistribution }: BarChartProps) {
  return (
    <Card className="bg-card border border-slate-200 dark:border-white/[0.08] shadow-sm">
      <CardHeader>
        <CardTitle className="text-base font-bold text-slate-800 dark:text-[#F8FAFC]">Top Themes</CardTitle>
        <CardDescription className="text-xs text-slate-500 dark:text-[#94A3B8]">Volume of feedbacks tagged by core intelligence category</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-72 w-full mt-4 select-none">
          <ResponsiveContainer width="100%" height="100%">
            <RechartsBarChart
              data={data}
              layout="vertical"
              margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="currentColor" className="text-slate-200 dark:text-slate-800" opacity={0.5} />
              <XAxis
                type="number"
                stroke="currentColor"
                className="text-slate-400 dark:text-[#94A3B8]"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                dy={5}
              />
              <YAxis
                dataKey="name"
                type="category"
                stroke="currentColor"
                className="text-slate-400 dark:text-[#94A3B8]"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                width={85}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--card)",
                  borderColor: "var(--border)",
                  borderRadius: "10px",
                  color: "var(--foreground)",
                  fontSize: "11px",
                }}
                formatter={(value: any) => [`${value} Feedbacks`, "Volume"]}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={16}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color || "#3b82f6"} />
                ))}
              </Bar>
            </RechartsBarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
