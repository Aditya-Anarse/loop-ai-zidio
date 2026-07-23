import { NextResponse } from "next/server";
import { validateCronSecret } from "@/lib/security/webhook-security";
import { WebhookService } from "@/lib/services/webhook-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    // 1. Authorization: Validate CRON_SECRET header
    if (!validateCronSecret(request)) {
      return NextResponse.json(
        { success: false, message: "Unauthorized cron execution request." },
        { status: 401 }
      );
    }

    // 2. Process pending events & retry queue
    const result = await WebhookService.processPendingEvents();

    return NextResponse.json({
      success: true,
      processedCount: result.processed,
      failedCount: result.failed,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[Cron Route] Webhook cron processing failed:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Cron execution failed." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  return GET(request);
}
