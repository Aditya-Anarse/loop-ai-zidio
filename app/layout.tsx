import { QueryProvider } from "@/components/providers/query-provider";
import SetupErrorScreen from "@/components/settings/SetupErrorScreen";
import "./globals.css";

export const metadata = {
  title: "LOOP | Customer Feedback Intelligence",
  description: "AI customer feedback intelligence platform.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const requiredVars = ["DATABASE_URL", "NEXTAUTH_SECRET", "NEXTAUTH_URL", "GEMINI_API_KEY"];
  const missingVars = requiredVars.filter((v) => !process.env[v]);

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
            <SetupErrorScreen missingVars={missingVars} />
          ) : (
            children
          )}
        </QueryProvider>
      </body>
    </html>
  );
}
