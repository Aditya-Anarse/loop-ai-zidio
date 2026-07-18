"use client";

import * as React from "react";
import { Sparkles, ThumbsUp, HelpCircle, AlertCircle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../ui/card";

export default function TopThemeCard() {
  return (
    <Card className="relative overflow-hidden bg-gradient-to-br from-[#7C3AED]/10 via-[#111827]/40 to-[#111827]/60 border border-[#7C3AED]/25 backdrop-blur-xl h-full flex flex-col rounded-[20px] shadow-xl">
      {/* Background glow orb */}
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-[#7C3AED]/10 rounded-full blur-2xl" />

      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#A78BFA] to-[#C084FC]">
            Top Trending Theme
          </CardTitle>
          <span className="p-1 bg-[#7C3AED]/10 rounded-xl text-[#A78BFA]">
            <Sparkles className="w-3.5 h-3.5" />
          </span>
        </div>
        <CardDescription>Highest volume AI feedback topic this week</CardDescription>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col justify-between space-y-6">
        <div className="space-y-2">
          {/* Large Title */}
          <div className="flex items-baseline gap-2.5">
            <h2 className="text-2xl font-black text-[#F8FAFC] tracking-tight">AI Features</h2>
            <span className="text-[10px] text-[#A78BFA] font-bold px-2 py-0.5 bg-[#7C3AED]/15 border border-[#7C3AED]/25 rounded-md">
              42 entries
            </span>
          </div>
          <p className="text-xs text-[#94A3B8] leading-relaxed">
            Automatic label tagging and AI summaries represent 35% of all active user discussions.
          </p>
        </div>

        {/* Sentiment Analysis Bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-[10px] font-bold text-[#94A3B8] tracking-wider uppercase">
            <span>Sentiment Breakdown</span>
            <span className="text-[#10B981]">85% Positive</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-white/[0.04] flex overflow-hidden">
            <div className="h-full bg-[#10B981]" style={{ width: "85%" }} />
            <div className="h-full bg-[#F59E0B]" style={{ width: "10%" }} />
            <div className="h-full bg-[#EF4444]" style={{ width: "5%" }} />
          </div>
        </div>

        {/* Key customer quotes / bullet observations */}
        <div className="space-y-2">
          <span className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider">
            Key Insights
          </span>
          <div className="space-y-2 text-xs text-[#F8FAFC]/90">
            <div className="flex gap-2.5 items-start">
              <ThumbsUp className="w-3.5 h-3.5 text-[#10B981] mt-0.5 shrink-0" />
              <p className="leading-relaxed">
                Users praise the automatic tag sorting accuracy, rating it as 98% accurate on ticket volume.
              </p>
            </div>
            <div className="flex gap-2.5 items-start">
              <AlertCircle className="w-3.5 h-3.5 text-[#7C3AED] mt-0.5 shrink-0" />
              <p className="leading-relaxed">
                Highly requested feature: Custom tag creation and dynamic styling rules.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
