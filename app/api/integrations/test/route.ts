import { NextResponse } from "next/server";
import { requireApiWorkspaceContext, ApiAuthError } from "@/services/auth/authorization";
import { IntegrationService } from "@/lib/services/integration-service";
import { prisma } from "@/lib/prisma";

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
    const { type } = body;

    if (!type) {
      return NextResponse.json({ success: false, error: "Integration type is required." }, { status: 400 });
    }

    const testResult = await IntegrationService.testIntegration(
      workspaceId,
      userId,
      user?.fullName || "Workspace Admin",
      user?.email || "admin@workspace.com",
      type
    );

    return NextResponse.json({ success: true, result: testResult });
  } catch (error: any) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: error.message || "Failed to execute test event" }, { status: 500 });
  }
}
