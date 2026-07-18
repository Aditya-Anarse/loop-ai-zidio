import * as React from "react";
import AppLayout from "@/components/layout/AppLayout";
import { requireWorkspaceContext } from "@/services/auth/authorization";

export default async function AppShellLayout({ children }: { children: React.ReactNode }) {
  // Protect all child pages and verify active workspace context
  await requireWorkspaceContext();

  return <AppLayout>{children}</AppLayout>;
}
