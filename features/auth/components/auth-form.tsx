"use client";

import * as React from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Infinity, Loader2, Mail, Key, User, AlertCircle, ArrowRight } from "lucide-react";

type AuthFormProps = {
  mode: "login" | "signup";
};

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [fullName, setFullName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState("");
  const [success, setSuccess] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsLoading(true);

    try {
      if (mode === "signup") {
        // Register API request
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fullName, email, password }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Registration failed.");
        }

        setSuccess("Account created successfully! Signing you in...");

        // Automatically log in after successful signup
        const signInResult = await signIn("credentials", {
          email,
          password,
          redirect: false,
        });

        if (signInResult?.error) {
          setError(signInResult.error);
          setIsLoading(false);
        } else {
          router.push("/app");
          router.refresh();
        }
      } else {
        // Log in with NextAuth CredentialsProvider
        const res = await signIn("credentials", {
          email,
          password,
          redirect: false,
        });

        if (res?.error) {
          setError(res.error || "Invalid email or password.");
          setIsLoading(false);
        } else {
          router.push("/app");
          router.refresh();
        }
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 rounded-xl border border-red-100 bg-red-50/30 p-4 text-sm text-red-700 dark:border-red-950/20 dark:bg-red-950/5 dark:text-red-400"
          >
            <AlertCircle className="h-4.5 w-4.5 shrink-0" />
            <p>{error}</p>
          </motion.div>
        )}

        {success && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50/30 p-4 text-sm text-emerald-700 dark:border-emerald-950/20 dark:bg-emerald-950/5 dark:text-emerald-400"
          >
            <AlertCircle className="h-4.5 w-4.5 shrink-0" />
            <p>{success}</p>
          </motion.div>
        )}

        {mode === "signup" && (
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider dark:text-slate-400">
              Full name
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <User className="h-4.5 w-4.5" />
              </span>
              <input
                name="fullName"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jordan Diaz"
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition-all placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-800 dark:bg-slate-900/50 dark:focus:border-blue-600 dark:focus:ring-blue-950/20"
              />
            </div>
          </div>
        )}

        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider dark:text-slate-400">
            Work email
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <Mail className="h-4.5 w-4.5" />
            </span>
            <input
              name="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition-all placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-800 dark:bg-slate-900/50 dark:focus:border-blue-600 dark:focus:ring-blue-950/20"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider dark:text-slate-400">
            Password
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <Key className="h-4.5 w-4.5" />
            </span>
            <input
              name="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition-all placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-800 dark:bg-slate-900/50 dark:focus:border-blue-600 dark:focus:ring-blue-950/20"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white shadow-md shadow-blue-100 transition-all hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50 dark:bg-blue-600 dark:shadow-none dark:hover:bg-blue-700"
        >
          {isLoading ? (
            <Loader2 className="h-4.5 w-4.5 animate-spin" />
          ) : (
            <>
              <span>{mode === "login" ? "Sign in" : "Create account"}</span>
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>
    </div>
  );
}
