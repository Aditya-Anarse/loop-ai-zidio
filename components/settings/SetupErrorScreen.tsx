import * as React from "react";
import { AlertTriangle, Database, ShieldAlert, Key, Globe } from "lucide-react";

type EnvVarStatus = {
  name: string;
  isConfigured: boolean;
  description: string;
  source: string;
};

export default function SetupErrorScreen({ missingVars }: { missingVars: string[] }) {
  const envVars: EnvVarStatus[] = [
    {
      name: "DATABASE_URL",
      isConfigured: !missingVars.includes("DATABASE_URL"),
      description: "PostgreSQL connection string (prefer Neon).",
      source: "Neon Console → Project Settings → Connection String",
    },
    {
      name: "NEXTAUTH_SECRET",
      isConfigured: !missingVars.includes("NEXTAUTH_SECRET"),
      description: "Random key for hashing login sessions and JWTs.",
      source: "Generate with: openssl rand -base64 32",
    },
    {
      name: "NEXTAUTH_URL",
      isConfigured: !missingVars.includes("NEXTAUTH_URL"),
      description: "Root URL for routing login redirects (typically http://localhost:3000).",
      source: "Manually set to http://localhost:3000 in local dev.",
    },
    {
      name: "GEMINI_API_KEY",
      isConfigured: !missingVars.includes("GEMINI_API_KEY"),
      description: "Google Gemini API key for running classification and RAG Q&A.",
      source: "Google AI Studio → Get API key",
    },
  ];

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F4F6F8] p-6 font-sans dark:bg-[#070B14]">
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-8 shadow-xl dark:border-slate-800 dark:bg-[#0f172a]">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-5 dark:border-slate-800">
          <div className="rounded-lg bg-amber-50 p-2 text-amber-600 dark:bg-amber-950/20 dark:text-amber-500">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[#0C447C] dark:text-[#3b82f6]">
              Platform Configuration Required
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Complete your environment variables setup to launch LOOP.
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          {envVars.map((item) => (
            <div
              key={item.name}
              className={`flex items-start gap-4 rounded-xl border p-4 transition-all ${
                item.isConfigured
                  ? "border-emerald-100 bg-emerald-50/20 dark:border-emerald-950/20 dark:bg-emerald-950/5"
                  : "border-rose-100 bg-rose-50/20 dark:border-rose-950/20 dark:bg-rose-950/5"
              }`}
            >
              <div className="mt-0.5">
                {item.isConfigured ? (
                  <span className="flex h-5.5 w-5.5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                    ✓
                  </span>
                ) : (
                  <span className="flex h-5.5 w-5.5 items-center justify-center rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400">
                    !
                  </span>
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-slate-800 dark:text-slate-200">
                    {item.name}
                  </h3>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      item.isConfigured
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400"
                        : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-400"
                    }`}
                  >
                    {item.isConfigured ? "Configured" : "Missing"}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  {item.description}
                </p>
                <div className="mt-2 text-xs font-mono text-slate-500 dark:text-slate-500">
                  <span className="font-semibold">Source: </span> {item.source}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 border-t border-slate-100 pt-5 dark:border-slate-800">
          <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            How to configure:
          </h4>
          <ol className="mt-2 list-decimal pl-4 text-xs text-slate-600 dark:text-slate-400 space-y-1">
            <li>Create a new file named <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-rose-600 dark:bg-slate-900">.env</code> in your root directory.</li>
            <li>Copy the keys above and supply the corresponding values.</li>
            <li>Restart your development server (<code className="font-mono bg-slate-100 px-1 py-0.5 rounded dark:bg-slate-900">npm run dev</code>).</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
