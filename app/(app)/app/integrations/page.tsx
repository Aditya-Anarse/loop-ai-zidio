"use client";

import * as React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { CheckCircle2, AlertCircle, MessageSquare, Ticket, Layers, Webhook, RefreshCw, Send, ShieldAlert, Clock, Code, X, RotateCcw, Settings, Lock, Check } from "lucide-react";

type IntegrationType = "WEBHOOK" | "SLACK" | "JIRA" | "ZENDESK";

type IntegrationState = {
  type: IntegrationType;
  enabled: boolean;
  status: "Connected" | "Disconnected" | "Testing";
  config: any;
  updatedAt: string;
};

type WebhookLogItem = {
  id: string;
  eventId?: string;
  url: string;
  event: string;
  payload: any;
  signature?: string;
  status: "SUCCESS" | "FAILED" | "RETRYING" | "DEAD_LETTER";
  statusCode?: number;
  response?: string;
  attempts: number;
  durationMs?: number;
  retryReason?: string;
  error?: string;
  createdAt: string;
};

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = React.useState<IntegrationState[]>([]);
  const [logs, setLogs] = React.useState<WebhookLogItem[]>([]);
  const [retryFailedOnly, setRetryFailedOnly] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [testingType, setTestingType] = React.useState<string | null>(null);
  const [retryingEventId, setRetryingEventId] = React.useState<string | null>(null);
  const [notification, setNotification] = React.useState<{ type: "success" | "error"; text: string } | null>(null);
  
  // Configuration Modal state
  const [activeModalType, setActiveModalType] = React.useState<IntegrationType | null>(null);
  const [formData, setFormData] = React.useState<any>({});
  const [savingConfig, setSavingConfig] = React.useState(false);
  const [modalMessage, setModalMessage] = React.useState<string | null>(null);

  // Inspector Modal
  const [selectedPayload, setSelectedPayload] = React.useState<WebhookLogItem | null>(null);

  const fetchIntegrationsData = React.useCallback(async () => {
    try {
      const res = await fetch("/api/integrations");
      if (res.ok) {
        const data = await res.json();
        setIntegrations(data.integrations || []);
      }
    } catch (err) {
      console.error("Error fetching integrations:", err);
    }
  }, []);

  const fetchWebhookLogs = React.useCallback(async () => {
    try {
      const res = await fetch(`/api/integrations/webhook/logs?retryFailedOnly=${retryFailedOnly}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.items || []);
      }
    } catch (err) {
      console.error("Error fetching webhook logs:", err);
    }
  }, [retryFailedOnly]);

  React.useEffect(() => {
    Promise.all([fetchIntegrationsData(), fetchWebhookLogs()]).finally(() => setLoading(false));
  }, [fetchIntegrationsData, fetchWebhookLogs]);

  const handleToggleIntegration = async (type: IntegrationType, currentEnabled: boolean) => {
    try {
      const res = await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, enabled: !currentEnabled }),
      });
      if (res.ok) {
        fetchIntegrationsData();
      }
    } catch (err) {
      console.error("Failed to toggle integration:", err);
    }
  };

  const handleSendTestEvent = async (type: IntegrationType) => {
    setTestingType(type);
    setNotification(null);

    setIntegrations((prev) =>
      prev.map((i) => (i.type === type ? { ...i, status: "Testing" } : i))
    );

    try {
      const res = await fetch("/api/integrations/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });

      const data = await res.json();
      if (res.ok && data.result?.success) {
        setNotification({
          type: "success",
          text: `[${type}] ${data.result.message} (${data.result.durationMs}ms)`,
        });
      } else {
        setNotification({
          type: "error",
          text: `[${type}] ${data.result?.message || data.error || "Connection test failed."}`,
        });
      }
    } catch (err: any) {
      setNotification({ type: "error", text: err.message || "Failed to execute test dispatch." });
    } finally {
      setTestingType(null);
      fetchIntegrationsData();
      fetchWebhookLogs();
    }
  };

  const handleOpenConfigModal = (type: IntegrationType) => {
    const existing = integrations.find((i) => i.type === type);
    setActiveModalType(type);
    setFormData(existing?.config || {});
    setModalMessage(null);
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeModalType) return;

    setSavingConfig(true);
    setModalMessage(null);

    try {
      const res = await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: activeModalType,
          enabled: true,
          config: formData,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error || "Failed to save configuration.");
      }

      setNotification({ type: "success", text: `${activeModalType} integration configuration saved securely!` });
      setActiveModalType(null);
      fetchIntegrationsData();
    } catch (err: any) {
      setModalMessage(err.message || "Save failed.");
    } finally {
      setSavingConfig(false);
    }
  };

  const handleRetryWebhook = async (eventId?: string) => {
    if (!eventId) return;
    setRetryingEventId(eventId);
    try {
      const res = await fetch("/api/integrations/webhook/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setNotification({ type: "success", text: "Webhook event re-queued for delivery!" });
        fetchWebhookLogs();
      } else {
        setNotification({ type: "error", text: data.error || "Failed to retry webhook event." });
      }
    } catch (err: any) {
      setNotification({ type: "error", text: err.message || "Retry failed." });
    } finally {
      setRetryingEventId(null);
    }
  };

  const getIntegrationState = (type: IntegrationType) => {
    const item = integrations.find((i) => i.type === type);
    return {
      enabled: item ? item.enabled : false,
      status: item ? item.status : "Disconnected",
    };
  };

  const renderBadge = (status: "Connected" | "Disconnected" | "Testing") => {
    if (status === "Testing") {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full border bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400">
          <RefreshCw className="h-3 w-3 animate-spin" />
          <span>Testing</span>
        </span>
      );
    }
    if (status === "Connected") {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full border bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400">
          <CheckCircle2 className="h-3 w-3" />
          <span>Connected</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full border bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400">
        <X className="h-3 w-3" />
        <span>Disconnected</span>
      </span>
    );
  };

  const webhookState = getIntegrationState("WEBHOOK");
  const slackState = getIntegrationState("SLACK");
  const zendeskState = getIntegrationState("ZENDESK");
  const jiraState = getIntegrationState("JIRA");

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-[#F8FAFC]">
          Integrations & Actions
        </h2>
        <p className="text-sm text-slate-500 dark:text-[#94A3B8]">
          Automate routing workflows by piping classified feedback directly to Slack, Zendesk, Jira, and Webhook endpoints.
        </p>
      </div>

      {notification && (
        <div className={`p-4 rounded-xl border text-xs flex items-center justify-between shadow-sm ${
          notification.type === "success"
            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300"
            : "bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-300"
        }`}>
          <div className="flex items-center gap-2">
            {notification.type === "success" ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
            <span className="font-semibold">{notification.text}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-slate-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Grid of Four Integration Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Webhook Card */}
        <Card className="border border-slate-200 dark:border-white/[0.08] bg-card p-6 flex flex-col justify-between h-[340px] rounded-[20px]">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400">
                <Webhook className="h-5 w-5" />
              </div>
              {renderBadge(webhookState.status)}
            </div>
            <h3 className="mt-4 text-sm font-bold text-slate-800 dark:text-slate-100">
              Webhook Dispatch
            </h3>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Stream HMAC-signed JSON payloads to custom endpoints with exponential retries and serverless queues.
            </p>
          </div>
          <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-4">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleOpenConfigModal("WEBHOOK")}
                className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5"
              >
                <Settings className="h-3.5 w-3.5" />
                <span>Configure</span>
              </button>
              <button
                onClick={() => handleSendTestEvent("WEBHOOK")}
                disabled={testingType === "WEBHOOK"}
                className="w-full py-2 px-3 bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {testingType === "WEBHOOK" ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                <span>Test Event</span>
              </button>
            </div>
          </div>
        </Card>

        {/* Slack Card */}
        <Card className="border border-slate-200 dark:border-white/[0.08] bg-card p-6 flex flex-col justify-between h-[340px] rounded-[20px]">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400">
                <MessageSquare className="h-5 w-5" />
              </div>
              {renderBadge(slackState.status)}
            </div>
            <h3 className="mt-4 text-sm font-bold text-slate-800 dark:text-slate-100">
              Slack Notifications
            </h3>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Broadcast critical complaints to engineering Slack channels as soon as they are auto-classified.
            </p>
          </div>
          <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-4">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleOpenConfigModal("SLACK")}
                className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5"
              >
                <Settings className="h-3.5 w-3.5" />
                <span>Configure</span>
              </button>
              <button
                onClick={() => handleSendTestEvent("SLACK")}
                disabled={testingType === "SLACK"}
                className="w-full py-2 px-3 bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 dark:text-orange-400 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {testingType === "SLACK" ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                <span>Test Event</span>
              </button>
            </div>
          </div>
        </Card>

        {/* Zendesk Card */}
        <Card className="border border-slate-200 dark:border-white/[0.08] bg-card p-6 flex flex-col justify-between h-[340px] rounded-[20px]">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400">
                <Ticket className="h-5 w-5" />
              </div>
              {renderBadge(zendeskState.status)}
            </div>
            <h3 className="mt-4 text-sm font-bold text-slate-800 dark:text-slate-100">
              Zendesk Ticket Sync
            </h3>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Auto-generate Zendesk support tickets when customers leave feedback with low satisfaction scores.
            </p>
          </div>
          <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-4">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleOpenConfigModal("ZENDESK")}
                className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5"
              >
                <Settings className="h-3.5 w-3.5" />
                <span>Configure</span>
              </button>
              <button
                onClick={() => handleSendTestEvent("ZENDESK")}
                disabled={testingType === "ZENDESK"}
                className="w-full py-2 px-3 bg-teal-500/10 hover:bg-teal-500/20 text-teal-600 dark:text-teal-400 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {testingType === "ZENDESK" ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                <span>Test Event</span>
              </button>
            </div>
          </div>
        </Card>

        {/* Jira Card */}
        <Card className="border border-slate-200 dark:border-white/[0.08] bg-card p-6 flex flex-col justify-between h-[340px] rounded-[20px]">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
                <Layers className="h-5 w-5" />
              </div>
              {renderBadge(jiraState.status)}
            </div>
            <h3 className="mt-4 text-sm font-bold text-slate-800 dark:text-slate-100">
              Jira Issue Routing
            </h3>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Create and assign Jira sub-tasks automatically inside engineering boards whenever bugs are classified.
            </p>
          </div>
          <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-4">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleOpenConfigModal("JIRA")}
                className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5"
              >
                <Settings className="h-3.5 w-3.5" />
                <span>Configure</span>
              </button>
              <button
                onClick={() => handleSendTestEvent("JIRA")}
                disabled={testingType === "JIRA"}
                className="w-full py-2 px-3 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {testingType === "JIRA" ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                <span>Test Event</span>
              </button>
            </div>
          </div>
        </Card>
      </div>

      {/* Webhook Delivery Telemetry & Logs Section */}
      <Card className="border border-slate-200 dark:border-white/[0.08] bg-card rounded-[20px] overflow-hidden">
        <CardHeader className="p-6 border-b border-slate-100 dark:border-white/[0.05] flex flex-row items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Webhook className="h-5 w-5 text-purple-600" />
              <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-100">
                Webhook & Provider Delivery Telemetry Logs
              </CardTitle>
            </div>
            <CardDescription className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Live multi-provider delivery logs, payload versioning (v1.0), HMAC signature validation, and manual retry options.
            </CardDescription>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={retryFailedOnly}
                onChange={(e) => setRetryFailedOnly(e.target.checked)}
                className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
              />
              <span>Failed / Dead Letter Only</span>
            </label>

            <button
              onClick={fetchWebhookLogs}
              className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl transition"
              title="Refresh logs"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-bold text-slate-400 dark:border-white/[0.05] dark:bg-slate-900/30 uppercase tracking-wider">
                  <th className="p-4 pl-6">Status</th>
                  <th className="p-4">Event Type</th>
                  <th className="p-4">Destination Endpoint</th>
                  <th className="p-4">Duration</th>
                  <th className="p-4">Timestamp</th>
                  <th className="p-4 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/[0.05]">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-xs text-slate-400">
                      No webhook delivery logs found matching the filter.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.01] transition">
                      <td className="p-4 pl-6">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[9px] font-bold border ${
                          log.status === "SUCCESS"
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400"
                            : log.status === "RETRYING"
                            ? "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400"
                            : log.status === "DEAD_LETTER"
                            ? "bg-purple-500/10 text-purple-600 border-purple-500/20 dark:text-purple-400"
                            : "bg-red-500/10 text-red-600 border-red-500/20 dark:text-red-400"
                        }`}>
                          {log.status === "SUCCESS" && <Check className="h-3 w-3" />}
                          {log.status === "DEAD_LETTER" && <ShieldAlert className="h-3 w-3" />}
                          {(log.status === "FAILED" || log.status === "RETRYING") && <AlertCircle className="h-3 w-3" />}
                          <span>{log.status}</span>
                        </span>
                      </td>

                      <td className="p-4 text-xs font-mono font-semibold text-slate-700 dark:text-slate-200">
                        {log.event}
                      </td>

                      <td className="p-4 text-xs font-mono text-slate-600 dark:text-slate-400 max-w-[200px] truncate">
                        {log.url}
                      </td>

                      <td className="p-4 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 pt-5">
                        <Clock className="h-3 w-3 text-slate-400" />
                        <span>{log.durationMs ? `${log.durationMs}ms` : "N/A"}</span>
                      </td>

                      <td className="p-4 text-xs text-slate-500 dark:text-slate-400">
                        {new Date(log.createdAt).toLocaleString([], { dateStyle: "short", timeStyle: "medium" })}
                      </td>

                      <td className="p-4 pr-6 text-right space-x-2">
                        <button
                          onClick={() => setSelectedPayload(log)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-[10px] font-bold transition inline-flex items-center gap-1"
                        >
                          <Code className="h-3 w-3" />
                          <span>Payload</span>
                        </button>

                        {(log.status === "FAILED" || log.status === "DEAD_LETTER" || log.status === "RETRYING") && log.eventId && (
                          <button
                            onClick={() => handleRetryWebhook(log.eventId)}
                            disabled={retryingEventId === log.eventId}
                            className="px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-[10px] font-bold transition inline-flex items-center gap-1 disabled:opacity-50 shadow-sm"
                          >
                            <RotateCcw className={`h-3 w-3 ${retryingEventId === log.eventId ? "animate-spin" : ""}`} />
                            <span>Retry</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Provider Configuration Modal */}
      {activeModalType && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-slate-200 dark:border-slate-800 rounded-[24px] max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                  Configure {activeModalType} Integration
                </h3>
              </div>
              <button onClick={() => setActiveModalType(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            {modalMessage && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{modalMessage}</span>
              </div>
            )}

            <form onSubmit={handleSaveConfig} className="space-y-4">
              {/* SLACK FORM */}
              {activeModalType === "SLACK" && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                      Slack Incoming Webhook URL
                    </label>
                    <input
                      type="url"
                      required
                      placeholder="https://hooks.slack.com/services/T00/B00/XXXX"
                      value={formData.slackWebhookUrl || formData.webhookUrl || ""}
                      onChange={(e) => setFormData({ ...formData, slackWebhookUrl: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-100"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                      Slack Channel
                    </label>
                    <input
                      type="text"
                      placeholder="#feedback-alerts"
                      value={formData.channel || ""}
                      onChange={(e) => setFormData({ ...formData, channel: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-100"
                    />
                  </div>
                </>
              )}

              {/* ZENDESK FORM */}
              {activeModalType === "ZENDESK" && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                      Zendesk Subdomain
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="yourcompany.zendesk.com"
                      value={formData.subdomain || formData.domain || ""}
                      onChange={(e) => setFormData({ ...formData, subdomain: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-100"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                      Agent Email
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="admin@yourcompany.com"
                      value={formData.email || ""}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-100"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1">
                      <Lock className="h-3 w-3 text-purple-500" />
                      <span>Zendesk API Token (Encrypted AES-256)</span>
                    </label>
                    <input
                      type="password"
                      placeholder="••••••••••••••••"
                      value={formData.apiToken || ""}
                      onChange={(e) => setFormData({ ...formData, apiToken: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-100"
                    />
                  </div>
                </>
              )}

              {/* JIRA FORM */}
              {activeModalType === "JIRA" && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                      Atlassian Jira Domain
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="yourcompany.atlassian.net"
                      value={formData.domain || ""}
                      onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-100"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                      Jira Project Key
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="LOOP or ENG"
                      value={formData.projectKey || ""}
                      onChange={(e) => setFormData({ ...formData, projectKey: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-xs font-mono uppercase focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-100"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                      Jira Account Email
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="dev@yourcompany.com"
                      value={formData.jiraEmail || formData.email || ""}
                      onChange={(e) => setFormData({ ...formData, jiraEmail: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-100"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1">
                      <Lock className="h-3 w-3 text-purple-500" />
                      <span>Jira API Token (Encrypted AES-256)</span>
                    </label>
                    <input
                      type="password"
                      placeholder="••••••••••••••••"
                      value={formData.jiraApiToken || formData.apiToken || ""}
                      onChange={(e) => setFormData({ ...formData, jiraApiToken: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-100"
                    />
                  </div>
                </>
              )}

              {/* WEBHOOK FORM */}
              {activeModalType === "WEBHOOK" && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                      Target Webhook Endpoint URL (HTTPS)
                    </label>
                    <input
                      type="url"
                      required
                      placeholder="https://api.yourcompany.com/webhooks/loop-feedback"
                      value={formData.webhookUrl || ""}
                      onChange={(e) => setFormData({ ...formData, webhookUrl: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-100"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1">
                      <Lock className="h-3 w-3 text-purple-500" />
                      <span>HMAC Secret Key (Encrypted AES-256)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="whsec_••••••••"
                      value={formData.secretToken || ""}
                      onChange={(e) => setFormData({ ...formData, secretToken: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-100"
                    />
                  </div>
                </>
              )}

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveModalType(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingConfig}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-blue-500/20"
                >
                  {savingConfig ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  <span>{savingConfig ? "Saving Credentials..." : "Save Credentials"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payload Modal */}
      {selectedPayload && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-slate-200 dark:border-slate-800 rounded-[24px] max-w-2xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Code className="h-4 w-4 text-purple-600" />
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  Webhook & Provider Payload Inspector (v1.0)
                </h3>
              </div>
              <button onClick={() => setSelectedPayload(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border dark:border-slate-800 font-mono text-[11px]">
                <span className="text-slate-400">Target Endpoint</span>
                <span className="text-purple-600 dark:text-purple-400 font-semibold truncate max-w-[300px]">
                  {selectedPayload.url}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  JSON Body Payload
                </span>
                <pre className="p-4 rounded-xl bg-slate-950 text-slate-200 font-mono text-[11px] overflow-x-auto max-h-[300px]">
                  {JSON.stringify(selectedPayload.payload, null, 2)}
                </pre>
              </div>

              {selectedPayload.error && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 text-xs">
                  <span className="font-bold block">Failure Log Detail:</span>
                  <span>{selectedPayload.error}</span>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedPayload(null)}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold hover:bg-slate-300 dark:hover:bg-slate-700 transition"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
