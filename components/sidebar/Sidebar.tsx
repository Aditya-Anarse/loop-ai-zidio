"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Inbox,
  LayoutDashboard,
  BarChart3,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  MessageSquare,
  X,
  LogOut,
} from "lucide-react";
import { useLayout } from "../layout/AppLayout";

const navItems = [
  { label: "Dashboard Overview", icon: LayoutDashboard, href: "/app" },
  { label: "Feedback Inbox", icon: Inbox, href: "/app/feedback" },
  { label: "Sentiment Analytics", icon: BarChart3, href: "/app/sentiment" },
  { label: "Integrations", icon: Users, href: "/app/integrations" },
  { label: "Voice of Customer", icon: Sparkles, href: "/app/reports" },
  { label: "Settings", icon: Settings, href: "/app/settings" },
];

export default function Sidebar() {
  const { isCollapsed, setIsCollapsed, isMobileOpen, setIsMobileOpen } = useLayout();
  const pathname = usePathname();
  const { data: session } = useSession();

  const user = session?.user;
  const userInitials = user?.name
    ? user.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
    : user?.email ? user.email.slice(0, 2).toUpperCase() : "US";

  const isActive = (itemHref: string) => {
    if (itemHref === "/app") {
      return pathname === "/app";
    }
    return pathname.startsWith(itemHref);
  };

  const sidebarVariants = {
    expanded: { width: 280 },
    collapsed: { width: 88 },
  };

  const SidebarContent = (
    <div className="flex flex-col h-full text-slate-200 bg-white dark:bg-[#0b1120] border-r border-slate-200 dark:border-white/[0.08]">
      {/* Sidebar Header */}
      <div className={`flex items-center justify-between ${isCollapsed ? "px-4" : "px-6"} h-20 border-b border-slate-200 dark:border-white/[0.08]`}>
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-600 text-white shrink-0 shadow-md shadow-blue-600/20">
            <Sparkles className="w-4 h-4" />
          </div>
          {!isCollapsed && (
            <motion.span
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-base font-extrabold tracking-tight text-[#0C447C] dark:text-[#3b82f6] font-sans"
            >
              LOOP AI
            </motion.span>
          )}
        </div>
        {/* Mobile close button */}
        <button
          onClick={() => setIsMobileOpen(false)}
          className="md:hidden text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white p-1 rounded-lg cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation Links */}
      <nav className={`flex-1 ${isCollapsed ? "px-3" : "px-4"} py-6 space-y-1.5 overflow-y-auto`}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.label}
              href={item.href as any}
              onClick={() => setIsMobileOpen(false)}
              className={`flex items-center gap-3 px-3 rounded-xl text-sm font-medium transition-all duration-150 group relative cursor-pointer h-12 ${
                active
                  ? "bg-blue-50 text-blue-800 dark:bg-blue-950/30 dark:text-blue-400 border border-blue-100/50 dark:border-blue-900/30"
                  : "text-slate-600 dark:text-[#94A3B8] hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/[0.03]"
              }`}
            >
              {active && (
                <motion.div
                  layoutId="sidebar-active-indicator"
                  className="absolute left-0 top-3 bottom-3 w-[4px] bg-blue-600 dark:bg-blue-500 rounded-r-full"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}

              <Icon className={`w-4.5 h-4.5 shrink-0 transition-colors duration-150 ${active ? "text-blue-600 dark:text-blue-400" : "text-slate-500 dark:text-[#94A3B8] group-hover:text-slate-800 dark:group-hover:text-white"}`} />
              {!isCollapsed && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="truncate whitespace-nowrap text-xs tracking-wide"
                >
                  {item.label}
                </motion.span>
              )}

              {isCollapsed && (
                <div className="absolute left-[88px] z-50 scale-0 group-hover:scale-100 transition-all origin-left bg-slate-950 border border-white/[0.08] text-white text-[10px] font-bold px-2.5 py-1.5 rounded-md pointer-events-none shadow-md">
                  {item.label}
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Sidebar Footer (Profile / Collapse) */}
      <div className={`border-t border-slate-200 dark:border-white/[0.08] flex flex-col gap-3 ${isCollapsed ? "p-3" : "p-4"}`}>
        {/* Profile Card */}
        <div className="flex items-center gap-3 overflow-hidden p-1.5 rounded-xl hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors group relative">
          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-950/50 border border-blue-200/50 dark:border-blue-800/30 flex items-center justify-center text-xs font-bold text-blue-700 dark:text-blue-400 shrink-0">
            {userInitials}
          </div>
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col min-w-0 flex-1"
            >
              <span className="text-xs font-semibold text-slate-800 dark:text-[#F8FAFC] truncate">
                {user?.name || "User Profile"}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-[#94A3B8] truncate">
                {user?.email || "loading..."}
              </span>
            </motion.div>
          )}

          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-slate-400 hover:text-rose-600 dark:text-slate-500 dark:hover:text-rose-400 p-1 rounded-lg cursor-pointer shrink-0 transition-colors"
            title="Log out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        {/* Desktop Collapse Trigger */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden md:flex items-center justify-center w-full py-2 bg-slate-50 hover:bg-slate-100 dark:bg-white/[0.02] dark:hover:bg-white/[0.04] border border-slate-200 dark:border-white/[0.05] rounded-xl text-slate-500 dark:text-[#94A3B8] hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer"
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <motion.aside
        initial="expanded"
        animate={isCollapsed ? "collapsed" : "expanded"}
        variants={sidebarVariants}
        transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1.0] }}
        className="hidden md:block h-screen shrink-0 overflow-hidden select-none"
      >
        <div className="h-full flex flex-col">
          {SidebarContent}
        </div>
      </motion.aside>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {isMobileOpen && (
          <div className="fixed inset-0 z-50 flex md:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileOpen(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs dark:bg-black/60"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative w-[280px] max-w-[85vw] h-full z-10 flex-col flex overflow-hidden shadow-2xl"
            >
              {SidebarContent}
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
