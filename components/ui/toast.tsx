"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, CheckCircle2, AlertCircle } from "lucide-react";

export type ToastVariant = "success" | "error" | "info";

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
}

interface ToastContextType {
  toast: (message: Omit<ToastMessage, "id">) => void;
  dismiss: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastMessage[]>([]);

  const toast = React.useCallback(
    ({ title, description, variant = "info", duration = 4000 }: Omit<ToastMessage, "id">) => {
      const id = Math.random().toString(36).substring(2, 9);
      setToasts((prev) => [...prev, { id, title, description, variant, duration }]);

      if (duration > 0) {
        setTimeout(() => {
          dismiss(id);
        }, duration);
      }
    },
    []
  );

  const dismiss = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}
      {/* Toast Portal Area */}
      <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 w-full max-w-sm pointer-events-none">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.2 } }}
              className="pointer-events-auto w-full"
            >
              <div
                className={`glass flex gap-3 p-4 rounded-xl border border-border shadow-lg ${
                  t.variant === "success"
                    ? "border-emerald-500/20 dark:border-emerald-500/30"
                    : t.variant === "error"
                    ? "border-rose-500/20 dark:border-rose-500/30"
                    : ""
                }`}
              >
                {/* Variant Icon */}
                <div className="shrink-0">
                  {t.variant === "success" ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  ) : t.variant === "error" ? (
                    <AlertCircle className="h-5 w-5 text-rose-500" />
                  ) : (
                    <div className="h-5 w-5 rounded-full bg-[#7C3AED]/20 text-[#A78BFA] flex items-center justify-center text-xs font-semibold">
                      i
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-foreground">{t.title}</h4>
                  {t.description && (
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      {t.description}
                    </p>
                  )}
                </div>

                {/* Close Button */}
                <button
                  onClick={() => dismiss(t.id)}
                  className="shrink-0 text-muted-foreground hover:text-foreground h-5 w-5 rounded-md flex items-center justify-center hover:bg-muted/50 transition-colors cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
