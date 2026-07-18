"use client";

import * as React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { CheckCircle2, AlertCircle, MessageSquare, Ticket, Layers, ArrowUpRight } from "lucide-react";

export default function IntegrationsPage() {
  const [slackEnabled, setSlackEnabled] = React.useState(false);
  const [zendeskEnabled, setZendeskEnabled] = React.useState(false);
  const [jiraEnabled, setJiraEnabled] = React.useState(false);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-[#F8FAFC]">
          Integrations & Actions
        </h2>
        <p className="text-sm text-slate-500 dark:text-[#94A3B8]">
          Automate routing workflows by piping classified feedback directly to third-party endpoints.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Slack Card */}
        <Card className="border border-slate-200 dark:border-white/[0.08] bg-card p-6 flex flex-col justify-between h-[300px]">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400">
                <MessageSquare className="h-5 w-5" />
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                slackEnabled
                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                  : "bg-slate-100 text-slate-500 border-slate-200"
              }`}>
                {slackEnabled ? "Connected" : "Disconnected"}
              </span>
            </div>
            <h3 className="mt-4 text-sm font-bold text-slate-800 dark:text-slate-100">
              Slack Notifications
            </h3>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Broadcast critical complaints to engineering Slack channels as soon as they are auto-classified.
            </p>
          </div>
          <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-4">
            <span className="text-xs text-slate-500 font-medium">Automatic Alerts</span>
            <button
              onClick={() => setSlackEnabled(!slackEnabled)}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none ${
                slackEnabled ? "bg-blue-600" : "bg-slate-200 dark:bg-slate-800"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  slackEnabled ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </Card>

        {/* Zendesk Card */}
        <Card className="border border-slate-200 dark:border-white/[0.08] bg-card p-6 flex flex-col justify-between h-[300px]">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400">
                <Ticket className="h-5 w-5" />
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                zendeskEnabled
                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                  : "bg-slate-100 text-slate-500 border-slate-200"
              }`}>
                {zendeskEnabled ? "Connected" : "Disconnected"}
              </span>
            </div>
            <h3 className="mt-4 text-sm font-bold text-slate-800 dark:text-slate-100">
              Zendesk Ticket Sync
            </h3>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Auto-generate Zendesk support tickets when customers leave feedback with a happiness score lower than 3.
            </p>
          </div>
          <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-4">
            <span className="text-xs text-slate-500 font-medium">Auto-dispatch Tickets</span>
            <button
              onClick={() => setZendeskEnabled(!zendeskEnabled)}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none ${
                zendeskEnabled ? "bg-blue-600" : "bg-slate-200 dark:bg-slate-800"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  zendeskEnabled ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </Card>

        {/* Jira Card */}
        <Card className="border border-slate-200 dark:border-white/[0.08] bg-card p-6 flex flex-col justify-between h-[300px]">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
                <Layers className="h-5 w-5" />
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                jiraEnabled
                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                  : "bg-slate-100 text-slate-500 border-slate-200"
              }`}>
                {jiraEnabled ? "Connected" : "Disconnected"}
              </span>
            </div>
            <h3 className="mt-4 text-sm font-bold text-slate-800 dark:text-slate-100">
              Jira Issue Routing
            </h3>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Create and assign Jira sub-tasks automatically inside engineering boards whenever bugs are classified.
            </p>
          </div>
          <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-4">
            <span className="text-xs text-slate-500 font-medium">Log Engineering Tasks</span>
            <button
              onClick={() => setJiraEnabled(!jiraEnabled)}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none ${
                jiraEnabled ? "bg-blue-600" : "bg-slate-200 dark:bg-slate-800"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  jiraEnabled ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </Card>
      </div>

      {/* Connection Instructions */}
      <Card className="border border-slate-200 dark:border-white/[0.08] bg-card p-6">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-blue-600" />
          <span>Webhook Dispatch Telemetry</span>
        </h3>
        <p className="mt-2 text-xs text-slate-500 dark:text-[#94A3B8] leading-relaxed">
          LOOP triggers standard webhook web-service payloads to dispatch ticket integrations.
          Configure custom target URLs inside Settings page to pipe classification JSON structures to arbitrary target tools.
        </p>
      </Card>
    </div>
  );
}
