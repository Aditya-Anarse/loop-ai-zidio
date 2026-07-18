"use client";

import * as React from "react";
import { Mail, MessageSquare, Share2, Phone, Globe, HelpCircle, Send } from "lucide-react";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { Select, SelectOption } from "../ui/select";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../ui/card";
import { useToast } from "../ui/toast";
import { motion } from "framer-motion";

const channels = [
  { value: "email", label: "Email", icon: <Mail className="w-6 h-6" /> },
  { value: "chat", label: "Live Chat", icon: <MessageSquare className="w-6 h-6" /> },
  { value: "social", label: "Social", icon: <Share2 className="w-6 h-6" /> },
  { value: "phone", label: "Phone", icon: <Phone className="w-6 h-6" /> },
  { value: "other", label: "Web Portal", icon: <Globe className="w-6 h-6" /> },
];

const customerLabels: SelectOption[] = [
  { value: "vip", label: "VIP Customer", color: "#7C3AED" }, // Purple
  { value: "enterprise", label: "Enterprise Tier", color: "#6366F1" }, // Indigo
  { value: "growth", label: "Growth Client", color: "#10b981" }, // Green
  { value: "free", label: "Free Plan User", color: "#94a3b8" }, // Gray
  { value: "churn_risk", label: "High Churn Risk", color: "#ef4444" }, // Red
];

// Interface for mock submission callback to display the new item dynamically in the parent Dashboard
interface FeedbackFormProps {
  onFeedbackAdded?: (feedback: {
    id: string;
    text: string;
    channel: string;
    customerLabel: string;
    date: string;
  }) => void;
}

export default function FeedbackForm({ onFeedbackAdded }: FeedbackFormProps) {
  const { toast } = useToast();
  const [text, setText] = React.useState("");
  const [channel, setChannel] = React.useState("");
  const [customerLabel, setCustomerLabel] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);

  // Error States
  const [errors, setErrors] = React.useState<{
    text?: string;
    channel?: string;
    customerLabel?: string;
  }>({});

  const validate = () => {
    const newErrors: typeof errors = {};
    if (!text.trim()) {
      newErrors.text = "Feedback text cannot be empty.";
    } else if (text.length < 10) {
      newErrors.text = "Feedback is too short. Please provide at least 10 characters.";
    }

    if (!channel) {
      newErrors.channel = "Please select a channel.";
    }

    if (!customerLabel) {
      newErrors.customerLabel = "Please select a customer segment label.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      toast({
        title: "Validation Failed",
        description: "Please fix the highlighted errors before submitting.",
        variant: "error",
      });
      return;
    }

    setIsLoading(true);

    // Mock API request
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const newFeedback = {
        id: Math.random().toString(36).substring(2, 9),
        text,
        channel,
        customerLabel,
        date: new Date().toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      if (onFeedbackAdded) {
        onFeedbackAdded(newFeedback);
      }

      toast({
        title: "Feedback Recorded!",
        description: "Feedback entry has been successfully logged.",
        variant: "success",
      });

      // Reset form
      setText("");
      setChannel("");
      setCustomerLabel("");
      setErrors({});
    } catch (err) {
      toast({
        title: "Error occurred",
        description: "Failed to save feedback. Please try again.",
        variant: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="w-full h-full flex flex-col"
    >
      <Card glass hoverGlow className="w-full h-full flex flex-col">
        <CardHeader>
          <CardTitle className="text-xl font-bold bg-clip-text text-transparent bg-linear-to-r from-foreground to-muted-foreground">
            Log Single Feedback
          </CardTitle>
          <CardDescription>
            Record customer sentiment, complaints, or feature requests manually.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col">
          <form onSubmit={handleSubmit} className="space-y-5 flex-1 flex flex-col justify-between">
            <div className="space-y-5 flex-1">
              {/* Feedback Text Input */}
              <Textarea
                label="Feedback Details"
                placeholder="Type customer's feedback message here... E.g., 'The new dashboard loads much faster now!'"
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  if (errors.text) setErrors((prev) => ({ ...prev, text: undefined }));
                }}
                maxLength={1000}
                error={errors.text}
                required
              />

              {/* Channel Selection Grid */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Feedback Channel
                </label>
                <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-5 gap-3">
                  {channels.map((chan) => {
                    const isSelected = channel === chan.value;
                    return (
                      <button
                        key={chan.value}
                        type="button"
                        onClick={() => {
                          setChannel(chan.value);
                          if (errors.channel) setErrors((prev) => ({ ...prev, channel: undefined }));
                        }}
                        className={`flex flex-col items-center justify-center h-[100px] rounded-[14px] border text-sm font-semibold transition-all gap-2 text-center cursor-pointer hover:-translate-y-[2px] hover:scale-[1.02] ${
                          isSelected
                            ? "border-[#7C3AED] bg-[#7C3AED]/10 text-[#A78BFA] shadow-md shadow-[#7C3AED]/10"
                            : "border-white/[0.08] bg-[#0F172A]/40 hover:bg-white/[0.04] text-[#94A3B8] hover:text-[#F8FAFC]"
                        }`}
                      >
                        <span className="shrink-0">{chan.icon}</span>
                        <span className="text-[11px] truncate max-w-full tracking-wide">{chan.label}</span>
                      </button>
                    );
                  })}
                </div>
                {errors.channel && (
                  <span className="text-xs text-destructive font-medium mt-0.5">
                    {errors.channel}
                  </span>
                )}
              </div>

              {/* Customer Label Selection */}
              <Select
                label="Customer Segment Label"
                placeholder="Choose customer classification"
                options={customerLabels}
                value={customerLabel}
                onChange={(val) => {
                  setCustomerLabel(val);
                  if (errors.customerLabel)
                    setErrors((prev) => ({ ...prev, customerLabel: undefined }));
                }}
                error={errors.customerLabel}
              />
            </div>

            {/* Submit Button */}
            <div className="mt-5">
              <Button
                type="submit"
                isLoading={isLoading}
                className="w-full h-[56px] text-base rounded-[14px] font-semibold"
              >
                <Send className="w-5 h-5 shrink-0" /> Submit Entry
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}
