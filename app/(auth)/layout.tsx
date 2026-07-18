import Link from "next/link";
import { Infinity } from "lucide-react";

export default function AuthLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F4F6F8] p-6 dark:bg-[#070B14]">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-xl dark:border-slate-800/80 dark:bg-[#0f172a] sm:p-10">
        <div className="mb-8 flex items-center justify-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
            <Infinity className="h-6 w-6" />
          </div>
          <span className="text-xl font-extrabold tracking-tight text-[#0C447C] dark:text-[#3b82f6]">
            LOOP
          </span>
        </div>
        {children}
      </section>
    </main>
  );
}
