"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Plus,
  Trash2,
  Shield,
  Activity,
  Mail,
  UserPlus,
  CheckCircle,
  AlertTriangle,
  UserCheck,
  Clock,
  Sparkles,
} from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Select, SelectOption } from "../ui/select";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../ui/card";
import { useToast } from "../ui/toast";

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: "admin" | "member" | "viewer";
  status: "active" | "pending";
  lastActive: string;
}

export interface ActivityLog {
  id: string;
  user: string;
  action: string;
  time: string;
  type: "invite" | "role" | "remove" | "system";
}

const roleOptions: SelectOption[] = [
  { value: "admin", label: "Admin (Full Access)", color: "#7C3AED" }, // Purple
  { value: "member", label: "Member (Edit & View)", color: "#6366F1" }, // Indigo
  { value: "viewer", label: "Viewer (Read-Only)", color: "#94a3b8" }, // Gray
];

export default function TeamWorkspace() {
  const { toast } = useToast();

  // Mock initial members
  const [members, setMembers] = React.useState<TeamMember[]>([
    {
      id: "mem-1",
      name: "Sarah Jenkins",
      email: "sarah@loop.ai",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=256&auto=format&fit=crop",
      role: "admin",
      status: "active",
      lastActive: "Active now",
    },
    {
      id: "mem-2",
      name: "Alex Rivera",
      email: "alex.rivera@acme.com",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&q=80",
      role: "member",
      status: "active",
      lastActive: "2 hours ago",
    },
    {
      id: "mem-3",
      name: "Chloe Watson",
      email: "chloe.watson@socialflow.co",
      avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&q=80",
      role: "viewer",
      status: "active",
      lastActive: "1 day ago",
    },
    {
      id: "mem-4",
      name: "Julian Vester",
      email: "julian@fintech-partners.de",
      avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=100&h=100&fit=crop&q=80",
      role: "member",
      status: "pending",
      lastActive: "Invited 1 day ago",
    },
  ]);

  // Mock initial logs
  const [logs, setLogs] = React.useState<ActivityLog[]>([
    {
      id: "log-1",
      user: "Sarah Jenkins",
      action: "invited Julian Vester to join the workspace",
      time: "1 hour ago",
      type: "invite",
    },
    {
      id: "log-2",
      user: "Sarah Jenkins",
      action: "updated role of Chloe Watson to Viewer",
      time: "3 hours ago",
      type: "role",
    },
    {
      id: "log-3",
      user: "Alex Rivera",
      action: "resolved feedback ticket fb-2 in Safari bug",
      time: "5 hours ago",
      type: "system",
    },
  ]);

  // Invite Form State
  const [inviteEmail, setInviteEmail] = React.useState("");
  const [inviteName, setInviteName] = React.useState("");
  const [inviteRole, setInviteRole] = React.useState("member");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errors, setErrors] = React.useState<{ email?: string; name?: string }>({});

  const validate = () => {
    const tempErrors: typeof errors = {};
    if (!inviteName.trim()) {
      tempErrors.name = "Name is required.";
    }
    if (!inviteEmail.trim()) {
      tempErrors.email = "Email is required.";
    } else if (!/\S+@\S+\.\S+/.test(inviteEmail)) {
      tempErrors.email = "Please enter a valid email address.";
    }
    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      toast({
        title: "Invalid Input",
        description: "Please fix the form errors before inviting.",
        variant: "error",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Simulation delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const emailLower = inviteEmail.toLowerCase();
      // Check if user already exists
      if (members.some((m) => m.email.toLowerCase() === emailLower)) {
        toast({
          title: "User Already Exists",
          description: "This email address is already part of your team workspace.",
          variant: "error",
        });
        setIsSubmitting(false);
        return;
      }

      // Add to members list
      const newMember: TeamMember = {
        id: `mem-${Math.random().toString(36).substring(2, 9)}`,
        name: inviteName,
        email: inviteEmail,
        avatar: `https://images.unsplash.com/photo-${1500000000000 + Math.floor(Math.random() * 500000)}?w=100&h=100&fit=crop&q=80`,
        role: inviteRole as any,
        status: "pending",
        lastActive: "Just invited",
      };

      setMembers((prev) => [newMember, ...prev]);

      // Add to logs
      const newLog: ActivityLog = {
        id: `log-${Math.random().toString(36).substring(2, 9)}`,
        user: "Sarah Jenkins",
        action: `invited ${inviteName} (${inviteRole}) to join the workspace`,
        time: "Just now",
        type: "invite",
      };
      setLogs((prev) => [newLog, ...prev]);

      toast({
        title: "Invitation Sent",
        description: `An invitation has been dispatched to ${inviteEmail}.`,
        variant: "success",
      });

      // Clear input fields
      setInviteName("");
      setInviteEmail("");
      setInviteRole("member");
      setErrors({});
    } catch (err) {
      toast({
        title: "Error Sending Invite",
        description: "Failed to send workspace invitation. Please try again.",
        variant: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRoleChange = (memberId: string, newRole: "admin" | "member" | "viewer") => {
    const member = members.find((m) => m.id === memberId);
    if (!member) return;

    // Prevent changing Sarah's role (main admin simulator)
    if (memberId === "mem-1") {
      toast({
        title: "Action Restricted",
        description: "You cannot change the role of the primary Workspace owner.",
        variant: "error",
      });
      return;
    }

    setMembers((prev) =>
      prev.map((m) => (m.id === memberId ? { ...m, role: newRole } : m))
    );

    // Add log entry
    const newLog: ActivityLog = {
      id: `log-${Math.random().toString(36).substring(2, 9)}`,
      user: "Sarah Jenkins",
      action: `changed role of ${member.name} to ${newRole}`,
      time: "Just now",
      type: "role",
    };
    setLogs((prev) => [newLog, ...prev]);

    toast({
      title: "Role Updated",
      description: `${member.name} is now a ${newRole.toUpperCase()} in the workspace.`,
      variant: "success",
    });
  };

  const handleDeleteMember = (memberId: string) => {
    const member = members.find((m) => m.id === memberId);
    if (!member) return;

    if (memberId === "mem-1") {
      toast({
        title: "Action Restricted",
        description: "You cannot remove the primary Workspace owner.",
        variant: "error",
      });
      return;
    }

    setMembers((prev) => prev.filter((m) => m.id !== memberId));

    // Add log entry
    const newLog: ActivityLog = {
      id: `log-${Math.random().toString(36).substring(2, 9)}`,
      user: "Sarah Jenkins",
      action: `removed ${member.name} from the workspace`,
      time: "Just now",
      type: "remove",
    };
    setLogs((prev) => [newLog, ...prev]);

    toast({
      title: "Member Removed",
      description: `${member.name} has been removed from this workspace.`,
      variant: "success",
    });
  };

  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-[#7C3AED]/10 text-[#C084FC] border-[#7C3AED]/20";
      case "member":
        return "bg-[#6366F1]/10 text-[#818CF8] border-[#6366F1]/20";
      default:
        return "bg-white/5 text-[#94A3B8] border-white/[0.08]";
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "invite":
        return <UserPlus className="w-3.5 h-3.5 text-[#818CF8]" />;
      case "role":
        return <Shield className="w-3.5 h-3.5 text-[#F59E0B]" />;
      case "remove":
        return <Trash2 className="w-3.5 h-3.5 text-[#EF4444]" />;
      default:
        return <Activity className="w-3.5 h-3.5 text-[#10B981]" />;
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col gap-2 mb-[24px]">
        <h1 className="text-[40px] font-bold tracking-tight text-foreground leading-tight">
          Team Workspace
        </h1>
        <p className="text-[16px] text-muted-foreground leading-relaxed">
          Manage team members, roles, permissions, and view recent workspace audit activity.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Invite Member Form & Activity Log */}
        <div className="lg:col-span-4 space-y-6 w-full">
          {/* Invite Form */}
          <Card glass hoverGlow className="w-full">
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-[#7C3AED]" />
                Invite Collaborator
              </CardTitle>
              <CardDescription>
                Invite a new user to collaborate in Loop AI.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleInviteSubmit} className="space-y-5">
                <Input
                  label="Collaborator Name"
                  placeholder="E.g. James Miller"
                  value={inviteName}
                  onChange={(e) => {
                    setInviteName(e.target.value);
                    if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
                  }}
                  error={errors.name}
                  required
                />
                <Input
                  label="Email Address"
                  type="email"
                  placeholder="E.g. james@acme.com"
                  value={inviteEmail}
                  onChange={(e) => {
                    setInviteEmail(e.target.value);
                    if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                  }}
                  error={errors.email}
                  required
                />
                <Select
                  label="Workspace Role"
                  placeholder="Select a role"
                  options={roleOptions}
                  value={inviteRole}
                  onChange={setInviteRole}
                />

                <Button
                  type="submit"
                  isLoading={isSubmitting}
                  className="w-full h-[56px] text-base rounded-[14px] font-semibold"
                >
                  <Plus className="w-5 h-5 shrink-0" /> Send Invite
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Audit Logs */}
          <Card glass className="w-full">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-md font-bold">Workspace Audit Log</CardTitle>
                <CardDescription>Real-time administrator audit feed</CardDescription>
              </div>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#10B981]/15 text-[#34D399] border border-[#10B981]/25">
                <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
                Active
              </span>
            </CardHeader>
            <CardContent className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
              <AnimatePresence initial={false}>
                {logs.map((log) => (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex gap-4 text-xs p-5 rounded-[14px] border border-white/[0.06] bg-[#0F172A]/30 hover:bg-[#0F172A]/70 hover:border-white/[0.1] transition-colors"
                  >
                    <div className="p-1.5 h-7 w-7 rounded-md bg-white/[0.04] flex items-center justify-center shrink-0">
                      {getActivityIcon(log.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-foreground leading-relaxed break-words font-sans">
                        <span className="font-semibold">{log.user}</span> {log.action}
                      </p>
                      <div className="flex items-center gap-1 text-[10px] text-[#94A3B8] mt-1">
                        <Clock className="w-3 h-3" />
                        <span>{log.time}</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Members Table */}
        <div className="lg:col-span-8 w-full space-y-6">
          <Card glass className="w-full rounded-[20px]">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="text-lg font-bold">Active Members</CardTitle>
                <CardDescription>
                  View and edit roles or manage access for team members.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2 text-xs text-[#94A3B8]">
                <Users className="w-4 h-4 text-[#818CF8]" />
                <span>{members.length} Workspace Members</span>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto w-full select-text">
                <table className="w-full border-collapse text-left text-sm">
                  <thead className="bg-[#0F172A]/50 border-b border-white/[0.08] text-xs font-semibold text-[#94A3B8] uppercase tracking-wider select-none">
                    <tr className="h-[64px]">
                      <th className="px-6 py-4 w-44">Name</th>
                      <th className="px-6 py-4 w-28">Status</th>
                      <th className="px-6 py-4 w-40">Role</th>
                      <th className="px-6 py-4 w-28">Last Active</th>
                      <th className="px-6 py-4 w-16 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.06] bg-transparent">
                    <AnimatePresence initial={false}>
                      {members.map((member) => (
                        <motion.tr
                          key={member.id}
                          layout
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ type: "spring", stiffness: 350, damping: 25 }}
                          className="group border-white/[0.04] hover:bg-white/[0.02] transition-all duration-200 h-[64px]"
                        >
                          {/* Member Identity */}
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <img
                                src={member.avatar}
                                alt={member.name}
                                className="w-8 h-8 rounded-full border border-white/[0.08] object-cover bg-white/[0.04] shrink-0"
                              />
                              <div className="flex flex-col min-w-0">
                                <span className="font-semibold text-[#F8FAFC] truncate text-xs">
                                  {member.name}
                                </span>
                                <span className="text-[10px] text-[#94A3B8] truncate max-w-[150px]">
                                  {member.email}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Member Status */}
                          <td className="px-6 py-4">
                            {member.status === "active" ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border border-[#10B981]/25 bg-[#10B981]/15 text-[#34D399]">
                                <CheckCircle className="w-3 h-3" /> Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border border-[#F59E0B]/25 bg-[#F59E0B]/15 text-[#FBBF24]">
                                <Clock className="w-3 h-3" /> Pending
                              </span>
                            )}
                          </td>

                          {/* Role Selector/Badge */}
                          <td className="px-6 py-4">
                            {member.id === "mem-1" ? (
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border ${getRoleBadgeStyle("admin")} uppercase`}>
                                Owner / Admin
                              </span>
                            ) : (
                              <div className="relative w-36 select-none">
                                <select
                                  value={member.role}
                                  onChange={(e) =>
                                    handleRoleChange(
                                      member.id,
                                      e.target.value as "admin" | "member" | "viewer"
                                    )
                                  }
                                  className="w-full bg-[#0F172A]/50 hover:bg-white/[0.04] text-[#F8FAFC] border border-white/[0.08] text-xs rounded-md px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30 focus:border-[#7C3AED] cursor-pointer transition-colors"
                                >
                                  <option value="admin">Admin</option>
                                  <option value="member">Member</option>
                                  <option value="viewer">Viewer</option>
                                </select>
                              </div>
                            )}
                          </td>

                          {/* Last Active */}
                          <td className="px-6 py-4">
                            <span className="text-xs text-[#94A3B8] whitespace-nowrap">
                              {member.lastActive}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="px-6 py-4 text-center">
                            {member.id !== "mem-1" ? (
                              <button
                                onClick={() => handleDeleteMember(member.id)}
                                className="p-1.5 rounded-md text-[#94A3B8] hover:bg-[#EF4444]/15 hover:text-[#F87171] transition-all cursor-pointer inline-flex items-center justify-center"
                                title="Remove team member"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <span className="text-[10px] text-[#94A3B8]">-</span>
                            )}
                          </td>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
