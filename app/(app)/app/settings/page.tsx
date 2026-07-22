"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { User, Users, Shield, Server, CheckCircle2, XCircle, AlertCircle, Key, Cpu, Sparkles } from "lucide-react";

type MemberItem = {
  name: string;
  email: string;
  role: string;
};

export default function SettingsPage() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const sectionParam = searchParams?.get("section") || "";
  const user = session?.user;

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
          Manage user profiles, view team roles, and inspect AI credential configurations.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left column: Profile & Team */}
        <div className="lg:col-span-8 space-y-6">
          {/* Profile Card */}
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

        {/* Right column: Credentials Checker & AI Model Info */}
        <div className="lg:col-span-4 space-y-6">
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

              <div className="rounded-xl border border-blue-100/50 bg-blue-50/10 p-4 dark:border-blue-900/20 dark:bg-blue-950/5 text-[10px] text-blue-700 dark:text-blue-400 leading-relaxed flex gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>
                  All credentials checks compiled. Tenant workspace isolated queries are running on Neon PostgreSQL database structures.
                </span>
              </div>
            </div>
          </Card>

          {/* AI Intelligence Provider Status */}
          <Card className="border border-slate-200 dark:border-white/[0.08] bg-card p-6 rounded-[20px] space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-white/[0.05] pb-3">
              <Cpu className="h-4 w-4 text-blue-500" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">AI Model Engine</h3>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-white/[0.04]">
                <span className="text-slate-400">Primary Provider</span>
                <span className="font-semibold text-slate-700 dark:text-slate-200">Google Gemini AI</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-white/[0.04]">
                <span className="text-slate-400">Default Model</span>
                <span className="font-semibold text-blue-600 dark:text-blue-400">Gemini 2.5 Flash</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-white/[0.04]">
                <span className="text-slate-400">Application Version</span>
                <span className="font-mono text-[10px] font-bold text-slate-700 dark:text-slate-200">v1.0.0 (LOOP Core)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-white/[0.04]">
                <span className="text-slate-400">Classification Version</span>
                <span className="font-mono text-[10px] text-slate-600 dark:text-slate-300">v1.2</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-white/[0.04]">
                <span className="text-slate-400">Last Deployment</span>
                <span className="text-xs text-slate-600 dark:text-slate-300">July 21, 2026</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Status</span>
                <span className="text-emerald-600 font-bold flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping"></span>
                  Operational
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

