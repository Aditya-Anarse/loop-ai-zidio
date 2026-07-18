"use client";

import * as React from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../ui/card";
import { channelDistribution } from "../feedback/mockData";

export default function ChannelChart() {
  return (
    <Card className="bg-card/60 backdrop-blur-md border border-border/50">
      <CardHeader>
        <CardTitle className="text-base font-bold">Channel Breakdown</CardTitle>
        <CardDescription>Distribution of feedback submissions across contact channels</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-72 w-full mt-4 flex items-center justify-center select-none font-sans">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={channelDistribution}
                cx="50%"
                cy="45%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={3}
                dataKey="value"
              >
                {channelDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} stroke="none" />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(11, 15, 25, 0.9)",
                  borderColor: "rgba(255, 255, 255, 0.08)",
                  borderRadius: "10px",
                  color: "#fff",
                  fontSize: "11px",
                  backdropFilter: "blur(12px)",
                }}
                formatter={(value: any) => [`${value} Submissions`, "Volume"]}
              />
              <Legend
                verticalAlign="bottom"
                height={36}
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
