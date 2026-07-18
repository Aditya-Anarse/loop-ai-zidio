"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sliders,
  Link2,
  GitMerge,
  Cpu,
  Plus,
  Trash2,
  Send,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  CheckCircle,
  AlertCircle,
  Shield,
} from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Select, SelectOption } from "../ui/select";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../ui/card";
import { useToast } from "../ui/toast";

// Types
interface Webhook {
  id: string;
  name: string;
  url: string;
  platform: "slack" | "discord" | "custom";
  status: "active" | "failed";
  lastTested?: string;
}

interface RoutingRule {
  id: string;
  triggerField: "customerLabel" | "sentiment" | "theme";
  triggerValue: string;
  routeTo: string;
}

const classifierOptions: SelectOption[] = [
  { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro (Recommended)", icon: <Sparkles className="w-3.5 h-3.5" /> },
  { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash", icon: <Cpu className="w-3.5 h-3.5" /> },
  { value: "gpt-4o", label: "GPT-4o Classifier", icon: <Cpu className="w-3.5 h-3.5" /> },
];

const platformOptions: SelectOption[] = [
  { value: "slack", label: "Slack Incoming Webhook" },
  { value: "discord", label: "Discord Channel Link" },
  { value: "custom", label: "Custom Endpoint URL" },
];

const triggerFieldOptions: SelectOption[] = [
  { value: "customerLabel", label: "Customer Segment" },
  { value: "sentiment", label: "Sentiment Category" },
  { value: "theme", label: "Feedback Theme" },
];

const segmentOptions: SelectOption[] = [
  { value: "vip", label: "VIP Customer" },
  { value: "enterprise", label: "Enterprise Tier" },
  { value: "growth", label: "Growth Client" },
  { value: "churn_risk", label: "High Churn Risk" },
];

const sentimentOptions: SelectOption[] = [
  { value: "positive", label: "Positive" },
  { value: "neutral", label: "Neutral" },
  { value: "negative", label: "Negative" },
];

const themeOptions: SelectOption[] = [
  { value: "Performance", label: "Performance" },
  { value: "Bug", label: "Bug Fixes" },
  { value: "Billing", label: "Billing" },
  { value: "AI Features", label: "AI Features" },
  { value: "UI/UX", label: "UI/UX" },
];

export default function SystemSettings() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = React.useState<"ai" | "webhooks" | "routing">("ai");

  // --- AI Settings States ---
  const [confidenceThreshold, setConfidenceThreshold] = React.useState(75);
  const [selectedClassifier, setSelectedClassifier] = React.useState("gemini-2.5-pro");
  const [autoTagThemes, setAutoTagThemes] = React.useState(true);
  const [autoReplyDrafts, setAutoReplyDrafts] = React.useState(false);
  const [isSavingAI, setIsSavingAI] = React.useState(false);

  // --- Webhooks States ---
  const [webhooks, setWebhooks] = React.useState<Webhook[]>([
    {
      id: "wh-1",
      name: "Slack Critical Alerts",
      url: "https://example.com/webhooks/slack/critical-alerts",
      platform: "slack",
      status: "active",
      lastTested: "2 hours ago",
    },
    {
      id: "wh-2",
      name: "Discord Logs",
      url: "https://discord.com/api/webhooks/1234567890/abc123xyz",
      platform: "discord",
      status: "active",
      lastTested: "1 day ago",
    },
  ]);
  const [webhookName, setWebhookName] = React.useState("");
  const [webhookUrl, setWebhookUrl] = React.useState("");
  const [webhookPlatform, setWebhookPlatform] = React.useState("slack");
  const [isAddingWebhook, setIsAddingWebhook] = React.useState(false);
  const [webhookErrors, setWebhookErrors] = React.useState<{ name?: string; url?: string }>({});

  // --- Routing Rules States ---
  const [rules, setRules] = React.useState<RoutingRule[]>([
    {
      id: "rule-1",
      triggerField: "customerLabel",
      triggerValue: "vip",
      routeTo: "VIP Escalation Desk",
    },
    {
      id: "rule-2",
      triggerField: "sentiment",
      triggerValue: "negative",
      routeTo: "Urgent Priority Queue",
    },
  ]);
  const [ruleTriggerField, setRuleTriggerField] = React.useState<"customerLabel" | "sentiment" | "theme">(
    "customerLabel"
  );
  const [ruleTriggerValue, setRuleTriggerValue] = React.useState("vip");
  const [ruleRouteTo, setRuleRouteTo] = React.useState("");
  const [ruleErrors, setRuleErrors] = React.useState<{ routeTo?: string }>({});

  // Force trigger value resets when trigger field alters
  React.useEffect(() => {
    if (ruleTriggerField === "customerLabel") {
      setRuleTriggerValue("vip");
    } else if (ruleTriggerField === "sentiment") {
      setRuleTriggerValue("negative");
    } else {
      setRuleTriggerValue("Bug");
    }
  }, [ruleTriggerField]);

  // AI Configuration Save
  const handleSaveAISettings = async () => {
    setIsSavingAI(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast({
        title: "AI Configuration Saved",
        description: "Classification thresholds and active model updated.",
        variant: "success",
      });
    } catch (err) {
      toast({
        title: "Save Failed",
        description: "Unable to store settings. Please try again.",
        variant: "error",
      });
    } finally {
      setIsSavingAI(false);
    }
  };

  // Webhooks Handlers
  const validateWebhook = () => {
    const errs: typeof webhookErrors = {};
    if (!webhookName.trim()) errs.name = "Webhook label/name is required.";
    if (!webhookUrl.trim()) {
      errs.url = "Webhook Endpoint URL is required.";
    } else if (!/^https?:\/\/\S+/.test(webhookUrl)) {
      errs.url = "Must be a valid endpoint starting with http:// or https://";
    }
    setWebhookErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleAddWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateWebhook()) return;

    setIsAddingWebhook(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 800));

      const newWH: Webhook = {
        id: `wh-${Math.random().toString(36).substring(2, 9)}`,
        name: webhookName,
        url: webhookUrl,
        platform: webhookPlatform as any,
        status: "active",
      };

      setWebhooks((prev) => [...prev, newWH]);
      toast({
        title: "Webhook Configured",
        description: `Successfully linked webhook: ${webhookName}`,
        variant: "success",
      });

      // Clear Form
      setWebhookName("");
      setWebhookUrl("");
      setWebhookPlatform("slack");
      setWebhookErrors({});
    } catch (err) {
      toast({
        title: "Configuration Error",
        description: "Could not add webhook listener.",
        variant: "error",
      });
    } finally {
      setIsAddingWebhook(false);
    }
  };

  const handleTestWebhook = async (id: string) => {
    const target = webhooks.find((wh) => wh.id === id);
    if (!target) return;

    toast({
      title: "Testing Connection...",
      description: `Sending verification payload to ${target.name}.`,
      variant: "info",
    });

    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setWebhooks((prev) =>
        prev.map((wh) =>
          wh.id === id
            ? { ...wh, status: "active", lastTested: "Just now" }
            : wh
        )
      );
      toast({
        title: "Connection Active",
        description: `Ping acknowledged (Status code: 200) from ${target.name}.`,
        variant: "success",
      });
    } catch (err) {
      setWebhooks((prev) =>
        prev.map((wh) =>
          wh.id === id ? { ...wh, status: "failed", lastTested: "Failed just now" } : wh
        )
      );
      toast({
        title: "Ping Failed",
        description: `Ping timed out or returned error for ${target.name}.`,
        variant: "error",
      });
    }
  };

  const handleDeleteWebhook = (id: string) => {
    setWebhooks((prev) => prev.filter((wh) => wh.id !== id));
    toast({
      title: "Webhook Deleted",
      description: "Webhook alert integration removed.",
      variant: "success",
    });
  };

  // Routing Rules Handlers
  const handleAddRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleRouteTo.trim()) {
      setRuleErrors({ routeTo: "Route destination queue is required." });
      return;
    }

    const newRule: RoutingRule = {
      id: `rule-${Math.random().toString(36).substring(2, 9)}`,
      triggerField: ruleTriggerField,
      triggerValue: ruleTriggerValue,
      routeTo: ruleRouteTo,
    };

    setRules((prev) => [...prev, newRule]);
    toast({
      title: "Routing Rule Built",
      description: "Loop AI will now sort feedbacks matching this rule.",
      variant: "success",
    });

    setRuleRouteTo("");
    setRuleErrors({});
  };

  const handleDeleteRule = (id: string) => {
    setRules((prev) => prev.filter((r) => r.id !== id));
    toast({
      title: "Rule Removed",
      description: "Workspace automatic assignment rule removed.",
      variant: "success",
    });
  };

  const getTriggerFieldLabel = (field: string) => {
    switch (field) {
      case "customerLabel":
        return "Customer Segment";
      case "sentiment":
        return "Sentiment Category";
      default:
        return "Feedback Theme";
    }
  };

  const getTriggerValueLabel = (field: string, value: string) => {
    if (field === "customerLabel") {
      const match = segmentOptions.find((opt) => opt.value === value);
      return match ? match.label : value;
    }
    if (field === "sentiment") {
      const match = sentimentOptions.find((opt) => opt.value === value);
      return match ? match.label : value;
    }
    return value;
  };

  const getTabButtonStyle = (tab: typeof activeTab) => {
    const isSelected = activeTab === tab;
    return `w-full flex items-center gap-3 px-4 h-[52px] rounded-[14px] text-sm font-semibold transition-all text-left cursor-pointer ${
      isSelected
        ? "bg-[#7C3AED]/10 text-[#A78BFA] border border-[#7C3AED]/20 font-semibold shadow-xs"
        : "text-[#94A3B8] hover:bg-white/[0.04] hover:text-[#F8FAFC] border border-transparent"
    }`;
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col gap-2 mb-[24px]">
        <h1 className="text-[40px] font-bold tracking-tight text-foreground leading-tight">
          System Settings
        </h1>
        <p className="text-[16px] text-muted-foreground leading-relaxed">
          Tune classification threshold variables, set up webhook channels, and build routing triggers.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Navigation Sidebar */}
        <div className="md:col-span-3 space-y-3">
          <button onClick={() => setActiveTab("ai")} className={getTabButtonStyle("ai")}>
            <Cpu className="w-5 h-5 shrink-0" />
            <span>AI Classification</span>
          </button>
          <button onClick={() => setActiveTab("webhooks")} className={getTabButtonStyle("webhooks")}>
            <Link2 className="w-5 h-5 shrink-0" />
            <span>Webhook Integrations</span>
          </button>
          <button onClick={() => setActiveTab("routing")} className={getTabButtonStyle("routing")}>
            <GitMerge className="w-5 h-5 shrink-0" />
            <span>Auto-Assignment Rules</span>
          </button>
        </div>

        {/* Content Container */}
        <div className="md:col-span-9 w-full">
          <AnimatePresence mode="wait">
            {/* AI Classification Tab */}
            {activeTab === "ai" && (
              <motion.div
                key="ai"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <Card glass hoverGlow>
                  <CardHeader>
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <Cpu className="w-5 h-5 text-[#7C3AED]" />
                      AI Classifier Model Settings
                    </CardTitle>
                    <CardDescription>
                      Configure classification models and confidence limits for categorizing feedback.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Select Classifier */}
                    <Select
                      label="Active AI Model"
                      options={classifierOptions}
                      value={selectedClassifier}
                      onChange={setSelectedClassifier}
                    />

                    {/* Confidence Threshold Slider */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">
                          Confidence Acceptance Limit
                        </label>
                        <span className="text-sm font-bold text-[#A78BFA]">{confidenceThreshold}%</span>
                      </div>
                      <input
                        type="range"
                        min="50"
                        max="95"
                        step="5"
                        value={confidenceThreshold}
                        onChange={(e) => setConfidenceThreshold(Number(e.target.value))}
                        className="w-full h-2 bg-white/[0.04] border border-white/[0.08] rounded-lg appearance-none cursor-pointer accent-[#7C3AED]"
                      />
                      <p className="text-[10px] text-[#94A3B8]/70">
                        Values below the limit will fail auto-tagging checks and default to Neutral / General categories for review.
                      </p>
                    </div>

                    <div className="border-t border-white/[0.08] my-6" />

                    {/* Toggles */}
                    <div className="space-y-4">
                      {/* Theme Toggle */}
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-medium text-foreground">Auto-Theme Categorization</span>
                          <span className="text-xs text-muted-foreground">
                            Let Loop AI sort comments into UI/UX, Performance, Security, or Billing.
                          </span>
                        </div>
                        <button
                          onClick={() => setAutoTagThemes(!autoTagThemes)}
                          className="text-[#94A3B8] hover:text-[#F8FAFC] cursor-pointer focus:outline-none shrink-0"
                        >
                          {autoTagThemes ? (
                            <ToggleRight className="w-10 h-10 text-[#7C3AED]" />
                          ) : (
                            <ToggleLeft className="w-10 h-10" />
                          )}
                        </button>
                      </div>

                      {/* Reply Toggle */}
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-medium text-[#F8FAFC]">Auto-Draft Responses</span>
                          <span className="text-xs text-[#94A3B8]">
                            Automatically draft simulated email replies for incoming customer tickets.
                          </span>
                        </div>
                        <button
                          onClick={() => setAutoReplyDrafts(!autoReplyDrafts)}
                          className="text-[#94A3B8] hover:text-[#F8FAFC] cursor-pointer focus:outline-none shrink-0"
                        >
                          {autoReplyDrafts ? (
                            <ToggleRight className="w-10 h-10 text-[#7C3AED]" />
                          ) : (
                            <ToggleLeft className="w-10 h-10" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Action Save Button */}
                    <div className="flex justify-end pt-4">
                      <Button onClick={handleSaveAISettings} isLoading={isSavingAI} className="font-semibold">
                        Save AI Config
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Webhook Integrations Tab */}
            {activeTab === "webhooks" && (
              <motion.div
                key="webhooks"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                {/* Add Webhook card */}
                <Card glass hoverGlow>
                  <CardHeader>
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <Link2 className="w-5 h-5 text-[#7C3AED]" />
                      Configure Alert Webhook
                    </CardTitle>
                    <CardDescription>
                      Post structured JSON payloads to chat channels (Slack / Discord) when customer sentiments drop.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleAddWebhook} className="space-y-5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <Input
                          label="Integration Label"
                          placeholder="E.g. Engineering Slack Alerts"
                          value={webhookName}
                          onChange={(e) => {
                            setWebhookName(e.target.value);
                            if (webhookErrors.name) setWebhookErrors((p) => ({ ...p, name: undefined }));
                          }}
                          error={webhookErrors.name}
                          required
                        />
                        <Select
                          label="Channel Platform"
                          options={platformOptions}
                          value={webhookPlatform}
                          onChange={setWebhookPlatform}
                        />
                      </div>
                      <Input
                        label="Endpoint Target URL"
                        placeholder="E.g. https://hooks.slack.com/services/..."
                        value={webhookUrl}
                        onChange={(e) => {
                          setWebhookUrl(e.target.value);
                          if (webhookErrors.url) setWebhookErrors((p) => ({ ...p, url: undefined }));
                        }}
                        error={webhookErrors.url}
                        required
                      />
                      <div className="flex justify-end mt-5">
                        <Button type="submit" isLoading={isAddingWebhook} className="font-semibold">
                          <Plus className="w-5 h-5 shrink-0" /> Link Endpoint
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>

                {/* Linked Webhooks Card */}
                <Card glass>
                  <CardHeader>
                    <CardTitle className="text-md font-bold">Active Integration Integrations</CardTitle>
                    <CardDescription>Currently listening webhooks endpoints.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <AnimatePresence initial={false}>
                      {webhooks.map((wh) => (
                        <motion.div
                          key={wh.id}
                          layout
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="p-[28px] rounded-[20px] border border-white/[0.06] bg-[#0F172A]/30 hover:border-white/[0.1] transition-all flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-semibold text-[#F8FAFC] truncate">{wh.name}</span>
                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                                wh.platform === "slack"
                                  ? "bg-[#10B981]/15 text-[#34D399] border border-[#10B981]/25"
                                  : wh.platform === "discord"
                                  ? "bg-[#7C3AED]/15 text-[#A78BFA] border border-[#7C3AED]/25"
                                  : "bg-white/5 text-[#94A3B8] border border-white/[0.08]"
                              }`}>
                                {wh.platform}
                              </span>
                              {wh.status === "active" ? (
                                <span className="inline-flex items-center text-[10px] text-[#10B981] font-semibold gap-0.5">
                                  <CheckCircle className="w-3.5 h-3.5" /> OK
                                </span>
                              ) : (
                                <span className="inline-flex items-center text-[10px] text-[#EF4444] font-semibold gap-0.5">
                                  <AlertCircle className="w-3.5 h-3.5" /> Error
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-[#94A3B8]/70 mt-1.5 font-mono truncate max-w-lg">
                              {wh.url}
                            </p>
                            {wh.lastTested && (
                              <span className="text-[10px] text-[#94A3B8]/60 block mt-1">
                                Last checked: {wh.lastTested}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleTestWebhook(wh.id)}
                              className="text-xs !h-8"
                            >
                              <Send className="w-3 h-3" /> Test Ping
                            </Button>
                            <button
                              onClick={() => handleDeleteWebhook(wh.id)}
                              className="p-2 rounded-md text-muted-foreground hover:bg-rose-500/15 hover:text-rose-400 cursor-pointer transition-colors"
                              title="Delete Webhook"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                    {webhooks.length === 0 && (
                      <div className="text-center p-6 text-sm text-muted-foreground">
                        No webhooks configured. Create one above to alert external services.
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Auto-Assignment Routing Tab */}
            {activeTab === "routing" && (
              <motion.div
                key="routing"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                {/* Add Rule Form Card */}
                <Card glass hoverGlow>
                  <CardHeader>
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <GitMerge className="w-5 h-5 text-[#7C3AED]" />
                      Configure Routing Rules
                    </CardTitle>
                    <CardDescription>
                      Assign incoming client tickets to distinct teams based on user metadata traits or sentiment score.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleAddRule} className="space-y-5">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-end">
                        <Select
                          label="If Trigger Attribute"
                          options={triggerFieldOptions}
                          value={ruleTriggerField}
                          onChange={(val) => setRuleTriggerField(val as any)}
                        />

                        {ruleTriggerField === "customerLabel" && (
                          <Select
                            label="Equals Customer Value"
                            options={segmentOptions}
                            value={ruleTriggerValue}
                            onChange={setRuleTriggerValue}
                          />
                        )}

                        {ruleTriggerField === "sentiment" && (
                          <Select
                            label="Equals Sentiment Value"
                            options={sentimentOptions}
                            value={ruleTriggerValue}
                            onChange={setRuleTriggerValue}
                          />
                        )}

                        {ruleTriggerField === "theme" && (
                          <Select
                            label="Equals Theme Value"
                            options={themeOptions}
                            value={ruleTriggerValue}
                            onChange={setRuleTriggerValue}
                          />
                        )}

                        <Input
                          label="Route / Assign To Destination"
                          placeholder="E.g. VIP Escalations Queue"
                          value={ruleRouteTo}
                          onChange={(e) => {
                            setRuleRouteTo(e.target.value);
                            if (ruleErrors.routeTo) setRuleErrors({});
                          }}
                          error={ruleErrors.routeTo}
                          required
                        />
                      </div>
                      <div className="flex justify-end mt-5">
                        <Button type="submit" className="font-semibold">
                          <Plus className="w-5 h-5 shrink-0" /> Save Rule
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>

                {/* Routing Rules List Card */}
                <Card glass>
                  <CardHeader>
                    <CardTitle className="text-md font-bold">Active Workspace Routing Triggers</CardTitle>
                    <CardDescription>Rules executed sequentially for new incoming logs.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <AnimatePresence initial={false}>
                      {rules.map((rule) => (
                        <motion.div
                          key={rule.id}
                          layout
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="p-[28px] rounded-[20px] border border-white/[0.06] bg-[#0F172A]/30 hover:border-white/[0.1] transition-all flex items-center justify-between gap-4 text-sm"
                        >
                          <div className="min-w-0">
                            <p className="text-[#F8FAFC] leading-relaxed font-sans">
                              If <span className="font-semibold text-[#A78BFA]">{getTriggerFieldLabel(rule.triggerField)}</span> is{" "}
                              <span className="font-semibold bg-[#7C3AED]/15 px-2 py-0.5 rounded text-[#C084FC] border border-[#7C3AED]/25">
                                {getTriggerValueLabel(rule.triggerField, rule.triggerValue)}
                              </span>{" "}
                              → Route to <span className="font-semibold text-[#10B981]">{rule.routeTo}</span>
                            </p>
                          </div>
                          <button
                            onClick={() => handleDeleteRule(rule.id)}
                            className="p-2 rounded-md text-muted-foreground hover:bg-rose-500/15 hover:text-rose-400 cursor-pointer transition-colors"
                            title="Delete Rule"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                    {rules.length === 0 && (
                      <div className="text-center p-6 text-sm text-muted-foreground">
                        No custom assignment triggers configured. Set a rule above.
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
