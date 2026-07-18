"use client";

import * as React from "react";
import Sidebar from "../sidebar/Sidebar";
import Navbar from "../navbar/Navbar";

interface LayoutContextType {
  isCollapsed: boolean;
  setIsCollapsed: (val: boolean) => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (val: boolean) => void;
  theme: "light" | "dark";
  toggleTheme: () => void;
}

const LayoutContext = React.createContext<LayoutContextType | undefined>(undefined);

export function useLayout() {
  const context = React.useContext(LayoutContext);
  if (!context) {
    throw new Error("useLayout must be used within an AppLayout");
  }
  return context;
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [isMobileOpen, setIsMobileOpen] = React.useState(false);
  const [theme, setTheme] = React.useState<"light" | "dark">("dark");

  React.useEffect(() => {
    const storedTheme = localStorage.getItem("loop-theme") as "light" | "dark" | null;
    if (storedTheme) {
      setTheme(storedTheme);
    } else {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      setTheme(prefersDark ? "dark" : "light");
    }
  }, []);

  React.useEffect(() => {
    const root = window.document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("loop-theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  return (
    <LayoutContext.Provider
      value={{
        isCollapsed,
        setIsCollapsed,
        isMobileOpen,
        setIsMobileOpen,
        theme,
        toggleTheme,
      }}
    >
      <div className="w-full min-h-screen bg-[#F4F6F8] dark:bg-[#070B14] text-slate-800 dark:text-slate-100 flex items-center justify-center">
        <div className="flex h-screen w-full overflow-hidden bg-background text-foreground transition-colors duration-200 relative">
          {/* Sidebar */}
          <Sidebar />

          {/* Content Shell */}
          <div className="flex flex-col flex-1 min-w-0 overflow-hidden relative">
            {/* Navbar */}
            <Navbar />

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto px-4 sm:px-6 md:px-10 lg:px-12 py-8 relative">
              {/* Ambient Background Glow for Premium Feel */}
              <div className="absolute top-[-10%] left-[20%] w-[500px] h-[500px] bg-blue-500/5 dark:bg-[#7C3AED]/5 rounded-full blur-[130px] pointer-events-none animate-pulse" />
              <div className="absolute bottom-[-10%] right-[10%] w-[400px] h-[400px] bg-blue-600/5 dark:bg-[#6366F1]/5 rounded-full blur-[100px] pointer-events-none" />

              <div className="max-w-[1400px] mx-auto h-full relative z-10">
                {children}
              </div>
            </main>
          </div>
        </div>
      </div>
    </LayoutContext.Provider>
  );
}
