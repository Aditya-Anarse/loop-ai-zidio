"use client";

import * as React from "react";
import { Mail, MessageSquare, Share2, Phone, Globe, Calendar } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../ui/card";
import { FeedbackItem, ChannelType } from "../feedback/mockData";
import StatusBadge from "../feedback/StatusBadge";

interface RecentFeedbackProps {
  feedbacks: FeedbackItem[];
}

const getChannelDetails = (channel: ChannelType) => {
  switch (channel) {
    case "email":
      return { icon: <Mail className="w-3 h-3" />, colorClass: "bg-[#6366F1]/10 text-[#818CF8] border-[#6366F1]/20" };
    case "chat":
      return { icon: <MessageSquare className="w-3 h-3" />, colorClass: "bg-[#10B981]/10 text-[#34D399] border-[#10B981]/20" };
    case "social":
      return { icon: <Share2 className="w-3 h-3" />, colorClass: "bg-[#7C3AED]/10 text-[#C084FC] border-[#7C3AED]/20" };
    case "phone":
      return { icon: <Phone className="w-3 h-3" />, colorClass: "bg-[#F59E0B]/10 text-[#FBBF24] border-[#F59E0B]/20" };
    default:
      return { icon: <Globe className="w-3 h-3" />, colorClass: "bg-white/5 text-[#94A3B8] border-white/[0.08]" };
  }
};

export default function RecentFeedback({ feedbacks }: RecentFeedbackProps) {
  // Grab the top 4 most recent feedbacks
  const items = feedbacks.slice(0, 4);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle className="text-base font-bold">Recent Submissions</CardTitle>
        <CardDescription>Real-time view of latest incoming customer feedback entries</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 space-y-4 overflow-y-auto pr-1">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <span className="text-xs text-[#94A3B8]">No recent feedbacks logged.</span>
          </div>
        ) : (
          items.map((item) => {
            const chan = getChannelDetails(item.channel);
            return (
              <div
                key={item.id}
                className="p-6 rounded-[14px] border border-white/[0.06] bg-[#0F172A]/30 hover:bg-[#0F172A]/60 hover:border-[#7C3AED]/25 transition-all duration-300 space-y-3"
              >
                <div className="flex justify-between items-start gap-4">
                  {/* User Profile */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={item.customerAvatar}
                      alt={item.customerName}
                      className="w-8 h-8 rounded-full border border-white/[0.08] object-cover shrink-0"
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-semibold text-[#F8FAFC] truncate">
                        {item.customerName}
                      </span>
                      <div className="flex items-center gap-1.5 mt-0.5 text-[9px] text-[#94A3B8]">
                        <Calendar className="w-2.5 h-2.5" />
                        <span>{item.date}</span>
                      </div>
                    </div>
                  </div>

                  {/* Badges */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`p-2 rounded-lg border shrink-0 ${chan.colorClass}`}>
                      {chan.icon}
                    </span>
                    <StatusBadge status={item.status} />
                  </div>
                </div>

                {/* Snippet */}
                <p className="text-xs text-[#F8FAFC]/80 leading-relaxed font-sans break-words max-h-12 overflow-hidden line-clamp-2">
                  {item.text}
                </p>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
