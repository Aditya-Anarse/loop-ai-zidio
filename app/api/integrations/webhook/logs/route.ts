import { NextResponse } from "next/server";
import { requireApiWorkspaceContext, ApiAuthError } from "@/services/auth/authorization";
import { WebhookService } from "@/lib/services/webhook-service";

export async function GET(request: Request) {
  try {
    const { workspaceId } = await requireApiWorkspaceContext();
    const { searchParams } = new URL(request.url);

    const retryFailedOnly = searchParams.get("retryFailedOnly") === "true";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "15", 10);

    const logsData = await WebhookService.getWebhookLogs(workspaceId, {
      retryFailedOnly,
      page,
      pageSize,
    });

    return NextResponse.json({ success: true, ...logsData });
  } catch (error: any) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: error.message || "Failed to fetch webhook logs" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { workspaceId, role } = await requireApiWorkspaceContext();

    if (role === "VIEWER") {
      return NextResponse.json(
        { success: false, message: "Permission Denied: Read-only access." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { eventId } = body;

    if (!eventId) {
      return NextResponse.json({ success: false, error: "eventId is required for retry." }, { status: 400 });
    }

    const retryResult = await WebhookService.retryFailedEvent(workspaceId, eventId);
    return NextResponse.json({ success: true, result: retryResult });
  } catch (error: any) {
    if (error instanceof ApiAuthError) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: error.message || "Failed to retry webhook event" }, { status: 500 });
  }
}
