"use client";

import * as React from "react";
import { ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../ui/card";
import { sentimentDistribution } from "../feedback/mockData";

interface PieChartProps {
  data?: any[];
  title?: string;
  description?: string;
  tooltipLabel?: string;
  valueSuffix?: string;
}

export default function PieChart({
  data = sentimentDistribution,
  title = "Sentiment Share",
  description = "Aggregate customer feedback sentiment distribution",
  tooltipLabel = "Share",
  valueSuffix = "%",
}: PieChartProps) {
  const localTooltipFormat = (value: any) => [`${value}${valueSuffix}`, tooltipLabel];

  return (
    <Card className="bg-card border border-slate-200 dark:border-white/[0.08] shadow-sm">
      <CardHeader>
        <CardTitle className="text-base font-bold text-slate-800 dark:text-[#F8FAFC]">{title}</CardTitle>
        <CardDescription className="text-xs text-slate-500 dark:text-[#94A3B8]">{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-72 w-full mt-4 flex items-center justify-center select-none">
          <ResponsiveContainer width="100%" height="100%">
            <RechartsPieChart>
              <Pie
                data={data}
                cx="50%"
                cy="45%"
                innerRadius={60}
                outerRadius={85}
                paddingAngle={4}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--card)",
                  borderColor: "var(--border)",
                  borderRadius: "10px",
                  color: "var(--foreground)",
                  fontSize: "11px",
                  boxShadow: "none",
                }}
                formatter={localTooltipFormat}
              />
              <Legend
                verticalAlign="bottom"
                height={36}
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }}
              />
            </RechartsPieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
