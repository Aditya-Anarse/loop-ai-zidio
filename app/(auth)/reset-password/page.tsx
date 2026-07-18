import Link from "next/link";
import { AlertCircle, ArrowLeft } from "lucide-react";

export default function ResetPasswordPage() {
  return (
    <>
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
          Reset password
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Choose a new password for your account.
        </p>
      </div>

      <div className="rounded-xl border border-blue-100 bg-blue-50/20 p-5 text-sm text-slate-700 dark:border-blue-950/20 dark:bg-blue-950/5 dark:text-slate-300 space-y-3">
        <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 font-semibold">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>Security Notice</span>
        </div>
        <p className="leading-relaxed">
          Password updates are restricted to active authenticated sessions inside the settings page or via direct workspace administrator overrides.
        </p>
      </div>

      <div className="mt-6 text-center text-xs">
        <Link href="/login" className="inline-flex items-center gap-1.5 font-semibold text-blue-600 hover:underline dark:text-blue-400">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to sign in
        </Link>
      </div>
    </>
  );
}
