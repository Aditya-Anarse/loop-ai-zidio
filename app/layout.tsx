import { QueryProvider } from "@/components/providers/query-provider";
import SetupErrorScreen from "@/components/settings/SetupErrorScreen";
import "./globals.css";

export const metadata = {
  title: "LOOP | Customer Feedback Intelligence",
  description: "AI customer feedback intelligence platform.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const isVercel = !!process.env.VERCEL;
  const requiredVars = ["DATABASE_URL", "NEXTAUTH_SECRET", "NEXTAUTH_URL", "GEMINI_API_KEY"];
  const missingVars = requiredVars.filter((v) => !process.env[v]);

  const isLocalhostNextAuth =
    process.env.NEXTAUTH_URL &&
    (process.env.NEXTAUTH_URL.includes("localhost") || process.env.NEXTAUTH_URL.includes("127.0.0.1"));

  if (isVercel && isLocalhostNextAuth && !missingVars.includes("NEXTAUTH_URL")) {
    missingVars.push("NEXTAUTH_URL");
  }

  if (missingVars.length > 0) {
    const logMsg = isVercel && isLocalhostNextAuth
      ? "Application startup failed: NEXTAUTH_URL cannot be set to localhost in production (Vercel)."
      : `Application startup failed: Missing required environment variables: ${missingVars.join(", ")}.`;
    console.error(
      JSON.stringify({
        event: "STARTUP_CONFIGURATION_ERROR",
        message: logMsg,
        missing: missingVars,
        platform: isVercel ? "Vercel" : "Local",
        timestamp: new Date().toISOString(),
      })
    );
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        <QueryProvider>
          {missingVars.length > 0 ? (
            <SetupErrorScreen
              missingVars={missingVars}
              isVercel={isVercel}
              isLocalhostNextAuth={!!isLocalhostNextAuth}
            />
          ) : (
            children
          )}
        </QueryProvider>
      </body>
    </html>
  );
}
