import Link from "next/link";
import { AuthForm } from "@/features/auth/components/auth-form";

export default function SignupPage() {
  return (
    <>
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
          Create an account
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Get started with your isolated AI Customer Intelligence platform.
        </p>
      </div>

      <AuthForm mode="signup" />

      <div className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400">
        Already have a workspace?{" "}
        <Link href="/login" className="font-semibold text-blue-600 hover:underline dark:text-blue-400">
          Sign in
        </Link>
      </div>
    </>
  );
}
