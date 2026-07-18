import Link from "next/link";
import { AuthForm } from "@/features/auth/components/auth-form";

export default function LoginPage() {
  return (
    <>
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
          Welcome back
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Sign in to your LOOP AI Customer Intelligence workspace.
        </p>
      </div>

      <AuthForm mode="login" />

      <div className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="font-semibold text-blue-600 hover:underline dark:text-blue-400">
          Create an account
        </Link>
      </div>
    </>
  );
}
