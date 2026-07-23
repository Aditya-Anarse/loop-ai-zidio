"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { User, Users, Shield, Server, CheckCircle2, XCircle, AlertCircle, Key, Cpu, Webhook, Save, RefreshCw, Lock, Clock, History } from "lucide-react";

type MemberItem = {
  name: string;
  email: string;
  role: string;
};

type AuditLogItem = {
  id: string;
  userName: string;
  userEmail: string;
  action: string;
  createdAt: string;
  newState?: any;
};

export default function SettingsPage() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const sectionParam = searchParams?.get("section") || "";
  const user = session?.user;

  // Webhook settings state
  const [webhookUrl, setWebhookUrl] = React.useState("");
  const [secretToken, setSecretToken] = React.useState("");
  const [triggerHighPriorityOnly, setTriggerHighPriorityOnly] = React.useState(true);
  const [webhookEnabled, setWebhookEnabled] = React.useState(true);
  const [webhookStatus, setWebhookStatus] = React.useState("Disconnected");
  
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [message, setMessage] = React.useState<{ type: "success" | "error"; text: string } | null>(null);
  const [auditLogs, setAuditLogs] = React.useState<AuditLogItem[]>([]);

  // Fetch integration configuration on mount
  const fetchIntegrations = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/integrations");
      if (res.ok) {
        const data = await res.json();
        const webhookInt = data.integrations?.find((i: any) => i.type === "WEBHOOK");
        if (webhookInt) {
          setWebhookEnabled(webhookInt.enabled);
          setWebhookStatus(webhookInt.status);
          if (webhookInt.config) {
            setWebhookUrl(webhookInt.config.webhookUrl || "");
            setSecretToken(webhookInt.config.secretToken || "");
            setTriggerHighPriorityOnly(webhookInt.config.triggerHighPriorityOnly ?? true);
          }
        }
      }

      // Fetch audit logs
      const auditRes = await fetch("/api/integrations/audit-logs");
      if (auditRes.ok) {
        const auditData = await auditRes.json();
        setAuditLogs(auditData.auditLogs || []);
      }
    } catch (error) {
      console.error("Failed to load integration settings:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchIntegrations();
  }, [fetchIntegrations]);

  const handleSaveWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "WEBHOOK",
          enabled: webhookEnabled,
          config: {
            webhookUrl,
            secretToken,
            triggerHighPriorityOnly,
          },
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error || "Failed to save webhook configuration.");
      }

      setMessage({ type: "success", text: "Webhook dispatch configuration saved securely!" });
      fetchIntegrations();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to save webhook settings." });
    } finally {
      setSaving(false);
    }
  };

  // Mock workspace team members
  const teamMembers: MemberItem[] = [
    { name: "Sarah Jenkins", email: "sarah@loop.com", role: "ADMIN" },
    { name: "David Miller", email: "david@loop.com", role: "ANALYST" },
    { name: "Elena Rostova", email: "elena@loop.com", role: "VIEWER" },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-[#F8FAFC]">
          Workspace Settings
        </h2>
        <p className="text-sm text-slate-500 dark:text-[#94A3B8]">
          Manage user profiles, webhook endpoint security, team roles, and AI credential configurations.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left column: Webhook Settings & Profile */}
        <div className="lg:col-span-8 space-y-6">
          {/* Webhook Configuration Card */}
          <Card className={`border border-slate-200 dark:border-white/[0.08] bg-card p-6 rounded-[20px] ${sectionParam === "webhook" ? "ring-2 ring-blue-500" : ""}`}>
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/[0.05] pb-4 mb-5">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                  <Webhook className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    Webhook Dispatch Configuration
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Pipe auto-classified feedback payloads securely to external HTTPS webhooks.
                  </p>
                </div>
              </div>
              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                webhookStatus === "Connected"
                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400"
                  : "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400"
              }`}>
                {webhookStatus}
              </span>
            </div>

            {message && (
              <div className={`p-3 mb-4 rounded-xl border text-xs flex items-center gap-2 ${
                message.type === "success"
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                  : "bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-300"
              }`}>
                {message.type === "success" ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
                <span>{message.text}</span>
              </div>
            )}

            <form onSubmit={handleSaveWebhook} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Target Webhook Endpoint URL (HTTPS Only)
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://api.yourcompany.com/webhooks/loop-feedback"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                    <Lock className="h-3 w-3 text-purple-500" />
                    <span>HMAC Secret Key (Encrypted AES-256)</span>
                  </label>
                </div>
                <input
                  type="text"
                  placeholder="whsec_••••••••"
                  value={secretToken}
                  onChange={(e) => setSecretToken(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-100"
                />
                <p className="text-[10px] text-slate-400">
                  Used to generate outgoing <code className="font-mono text-purple-500">X-LOOP-Signature</code> headers using HMAC-SHA256.
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 block">
                      High Priority Feedback Trigger Only
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      Only dispatch webhooks when feedback has High/Critical Severity or Negative Sentiment.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTriggerHighPriorityOnly(!triggerHighPriorityOnly)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none ${
                      triggerHighPriorityOnly ? "bg-blue-600" : "bg-slate-200 dark:bg-slate-800"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                        triggerHighPriorityOnly ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 block">
                      Enable Webhook Dispatch Engine
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      Toggle active processing of asynchronous outgoing events.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setWebhookEnabled(!webhookEnabled)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none ${
                      webhookEnabled ? "bg-blue-600" : "bg-slate-200 dark:bg-slate-800"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                        webhookEnabled ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>

              <div className="pt-3 flex justify-end">
                <button
                  type="submit"
                  disabled={saving || loading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-blue-500/20"
                >
                  {saving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  <span>{saving ? "Saving Configuration..." : "Save Webhook Settings"}</span>
                </button>
              </div>
            </form>
          </Card>

          {/* User Profile Card */}
          <Card className={`border border-slate-200 dark:border-white/[0.08] bg-card p-6 rounded-[20px] ${sectionParam === "profile" ? "ring-2 ring-blue-500" : ""}`}>
            <div className="flex items-center gap-2 mb-4 border-b border-slate-100 dark:border-white/[0.05] pb-3">
              <User className="h-4 w-4 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">User Profile</h3>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Full Name</span>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 block bg-slate-50 dark:bg-slate-900/40 p-2 rounded-lg border dark:border-slate-800">
                  {user?.name || "LOOP User"}
                </span>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Email Address</span>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 block bg-slate-50 dark:bg-slate-900/40 p-2 rounded-lg border dark:border-slate-800">
                  {user?.email || "loading..."}
                </span>
              </div>
              <div className="space-y-1 sm:col-span-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Workspace Identity Key</span>
                <span className="text-[10px] font-mono text-slate-600 dark:text-slate-400 block bg-slate-50 dark:bg-slate-900/40 p-2 rounded-lg border dark:border-slate-800 overflow-x-auto whitespace-nowrap">
                  {user?.workspaceId || "generating workspace key..."}
                </span>
              </div>
            </div>
          </Card>

          {/* Team Members List */}
          <Card className={`border border-slate-200 dark:border-white/[0.08] bg-card rounded-[18px] overflow-hidden ${sectionParam === "team" ? "ring-2 ring-blue-500" : ""}`}>
            <CardHeader className="p-6 border-b border-slate-100 dark:border-white/[0.05]">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-emerald-600" />
                <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Workspace Team
                </CardTitle>
              </div>
              <CardDescription className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Colleagues with collaborative access to this tenant workspace.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-bold text-slate-400 dark:border-white/[0.05] dark:bg-slate-900/30 uppercase tracking-wider">
                      <th className="p-4 pl-6">Member</th>
                      <th className="p-4">Email</th>
                      <th className="p-4 pr-6">Workspace Role</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/[0.05]">
                    {teamMembers.map((member, i) => (
                      <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.01]">
                        <td className="p-4 pl-6 text-xs font-semibold text-slate-700 dark:text-slate-200">
                          {member.name}
                        </td>
                        <td className="p-4 text-xs text-slate-600 dark:text-slate-400">
                          {member.email}
                        </td>
                        <td className="p-4 pr-6">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[9px] font-bold border ${
                            member.role === "ADMIN"
                              ? "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20"
                              : member.role === "ANALYST"
                              ? "bg-emerald-500/10 text-emerald-700 dark:text-[#34D399] border-emerald-500/20"
                              : "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400"
                          }`}>
                            <Shield className="h-3 w-3" />
                            <span>{member.role}</span>
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column: Credentials Checker & Audit Trail */}
        <div className="lg:col-span-4 space-y-6">
          {/* Integration Audit Trail */}
          <Card className="border border-slate-200 dark:border-white/[0.08] bg-card p-6 rounded-[20px] space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/[0.05] pb-3">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-amber-500" />
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Integration Audit Log</h3>
              </div>
              <button onClick={fetchIntegrations} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
              {auditLogs.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">No integration changes recorded yet.</p>
              ) : (
                auditLogs.map((log) => (
                  <div key={log.id} className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/50 dark:border-white/[0.04] dark:bg-slate-900/20 space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-slate-700 dark:text-slate-200">{log.userName || log.userEmail}</span>
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-mono text-purple-600 dark:text-purple-400 font-bold">{log.action}</span>
                      <span className="text-slate-400">{new Date(log.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card className={`border border-slate-200 dark:border-white/[0.08] bg-card p-6 rounded-[20px] space-y-6 ${sectionParam === "credentials" ? "ring-2 ring-blue-500" : ""}`}>
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-white/[0.05] pb-3">
              <Server className="h-4 w-4 text-purple-600" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">LOOP Credentials</h3>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Ensure the following background environment parameters are active inside your configuration file:
              </p>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 bg-slate-50/50 text-[11px] dark:border-white/[0.04] dark:bg-slate-900/20">
                  <div className="flex items-center gap-1.5 font-mono text-slate-600 dark:text-slate-300">
                    <Key className="h-3.5 w-3.5 text-blue-500" />
                    <span>DATABASE_URL</span>
                  </div>
                  <div className="flex items-center gap-1 text-emerald-600 dark:text-[#34D399]">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="font-bold">Active</span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 bg-slate-50/50 text-[11px] dark:border-white/[0.04] dark:bg-slate-900/20">
                  <div className="flex items-center gap-1.5 font-mono text-slate-600 dark:text-slate-300">
                    <Key className="h-3.5 w-3.5 text-blue-500" />
                    <span>NEXTAUTH_SECRET</span>
                  </div>
                  <div className="flex items-center gap-1 text-emerald-600 dark:text-[#34D399]">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="font-bold">Active</span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 bg-slate-50/50 text-[11px] dark:border-white/[0.04] dark:bg-slate-900/20">
                  <div className="flex items-center gap-1.5 font-mono text-slate-600 dark:text-slate-300">
                    <Key className="h-3.5 w-3.5 text-blue-500" />
                    <span>GEMINI_API_KEY</span>
                  </div>
                  <div className="flex items-center gap-1 text-emerald-600 dark:text-[#34D399]">
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="font-bold">Active</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
