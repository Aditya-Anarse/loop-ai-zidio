import { NextResponse } from "next/server";
import { requireApiWorkspaceContext, ApiAuthError, ApiForbiddenError } from "@/services/auth/authorization";
import { IntegrationService } from "@/lib/services/integration-service";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const { workspaceId } = await requireApiWorkspaceContext();
    const integrations = await IntegrationService.getWorkspaceIntegrations(workspaceId);
    return NextResponse.json({ success: true, integrations });
  } catch (error: any) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: error.message || "Failed to fetch integrations" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { workspaceId, userId, role } = await requireApiWorkspaceContext();

    if (role === "VIEWER") {
      return NextResponse.json(
        { success: false, message: "Permission Denied: Read-only access." },
        { status: 403 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { fullName: true, email: true },
    });

    const body = await request.json();
    const { type, enabled, status, config } = body;

    if (!type) {
      return NextResponse.json({ success: false, error: "Integration type is required." }, { status: 400 });
    }

    const updated = await IntegrationService.updateIntegration(
      workspaceId,
      userId,
      user?.fullName || "Workspace Admin",
      user?.email || "admin@workspace.com",
      type,
      { enabled, status, config }
    );

    return NextResponse.json({ success: true, integration: updated });
  } catch (error: any) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof ApiForbiddenError) {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json({ success: false, error: error.message || "Failed to update integration" }, { status: 500 });
  }
}
