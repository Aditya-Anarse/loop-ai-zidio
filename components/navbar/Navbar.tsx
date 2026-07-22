"use client";

import * as React from "react";
import { Sun, Moon, Menu, Bell, Search, Command } from "lucide-react";
import { useSession } from "next-auth/react";
import { useLayout } from "../layout/AppLayout";
import { motion } from "framer-motion";
import { GlobalSearchModal } from "../search/GlobalSearchModal";

export default function Navbar() {
  const { theme, toggleTheme, setIsMobileOpen } = useLayout();
  const { data: session } = useSession();
  const [isSearchOpen, setIsSearchOpen] = React.useState(false);

  const user = session?.user;
  const userInitials = user?.name
    ? user.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
    : user?.email ? user.email.slice(0, 2).toUpperCase() : "US";

  // App-wide Ctrl+K / Cmd+K shortcut listener
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      <header className="w-full px-4 sm:px-6 md:px-10 lg:px-12 pt-6 shrink-0 bg-transparent z-40">
        <div className="flex h-20 items-center justify-between px-6 rounded-[20px] border border-slate-200 bg-white/80 dark:border-white/[0.08] dark:bg-[#0f172a]/70 backdrop-blur-xl shadow-sm transition-all duration-300">
          {/* Left Side: Mobile Menu and Title */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsMobileOpen(true)}
              className="flex items-center justify-center p-2 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-[#94A3B8] dark:hover:bg-white/[0.04] dark:hover:text-[#F8FAFC] md:hidden cursor-pointer"
              aria-label="Open mobile menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            
            <div className="flex flex-col">
              <h1 className="text-xs font-black tracking-wider text-slate-800 dark:text-[#F8FAFC] uppercase">
                Feedback Intelligence
              </h1>
              <span className="hidden xs:inline-block text-[9px] font-bold text-slate-400 dark:text-[#94A3B8] tracking-widest uppercase mt-0.5">
                v1.0.0 • LOOP Core
              </span>
            </div>
          </div>

          {/* Middle Side: Search Bar Trigger (Desktop) */}
          <div className="hidden md:flex items-center w-full max-w-[500px] mx-6">
            <button
              onClick={() => setIsSearchOpen(true)}
              className="flex items-center w-full gap-2.5 px-4 py-2.5 rounded-full border border-slate-200 bg-slate-50 text-slate-400 text-xs hover:border-slate-300 hover:bg-slate-100/70 dark:border-white/[0.08] dark:bg-white/[0.02] dark:text-[#94A3B8] dark:hover:border-white/[0.15] dark:hover:bg-white/[0.04] transition-all cursor-pointer text-left"
              aria-label="Global search trigger button"
            >
              <Search className="w-3.5 h-3.5 text-slate-400 dark:text-[#94A3B8]" />
              <span className="flex-1 text-xs font-medium">Search feedback, themes, reports...</span>
              <kbd className="inline-flex h-5 select-none items-center gap-0.5 rounded-md border border-slate-200 bg-slate-100 px-1.5 font-mono text-[9px] font-bold text-slate-400 dark:border-white/[0.08] dark:bg-white/[0.05] dark:text-[#94A3B8] opacity-100">
                <Command className="w-2.5 h-2.5" /> K
              </kbd>
            </button>
          </div>

          {/* Right Side: Theme, Notifications, Mobile Search, Avatar */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Mobile Search Button */}
            <button
              onClick={() => setIsSearchOpen(true)}
              className="flex md:hidden items-center justify-center w-9 h-9 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-800 dark:border-white/[0.08] dark:bg-white/[0.02] dark:hover:bg-white/[0.06] dark:text-[#94A3B8] dark:hover:text-white transition-all cursor-pointer"
              title="Search"
              aria-label="Mobile search trigger button"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Theme Toggle */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={toggleTheme}
              className="flex items-center justify-center w-9 h-9 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-800 dark:border-white/[0.08] dark:bg-white/[0.02] dark:hover:bg-white/[0.06] dark:text-[#94A3B8] dark:hover:text-white transition-all cursor-pointer"
              title="Toggle theme"
              aria-label="Toggle dark/light theme mode"
            >
              {theme === "dark" ? (
                <Sun className="w-4 h-4 text-amber-500 animate-pulse" />
              ) : (
                <Moon className="w-4 h-4 text-blue-600" />
              )}
            </motion.button>

            {/* Notifications */}
            <div className="relative">
              <button
                className="flex items-center justify-center w-9 h-9 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-800 dark:border-white/[0.08] dark:bg-white/[0.02] dark:hover:bg-white/[0.06] dark:text-[#94A3B8] dark:hover:text-white transition-all cursor-pointer"
                aria-label="Notifications menu"
              >
                <Bell className="w-4 h-4" />
              </button>
              <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-600 dark:bg-blue-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600 dark:bg-blue-500"></span>
              </span>
            </div>

            <div className="h-5 w-[1px] bg-slate-200 dark:bg-white/[0.08] hidden sm:block mx-1" />

            {/* User Profile Avatar */}
            <div className="flex items-center">
              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800/30 flex items-center justify-center text-xs font-bold text-blue-700 dark:text-blue-400 shrink-0 select-none">
                {userInitials}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Global Search Dialog Modal */}
      <GlobalSearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
}

