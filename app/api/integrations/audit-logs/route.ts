import { NextResponse } from "next/server";
import { requireApiWorkspaceContext, ApiAuthError } from "@/services/auth/authorization";
import { IntegrationService } from "@/lib/services/integration-service";

export async function GET() {
  try {
    const { workspaceId } = await requireApiWorkspaceContext();
    const auditLogs = await IntegrationService.getAuditLogs(workspaceId);
    return NextResponse.json({ success: true, auditLogs });
  } catch (error: any) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: error.message || "Failed to fetch audit logs" }, { status: 500 });
  }
}
