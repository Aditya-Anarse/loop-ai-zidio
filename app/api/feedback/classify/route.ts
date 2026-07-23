import { NextResponse } from "next/server";
import { requireApiWorkspaceContext, ApiAuthError, ApiForbiddenError } from "@/services/auth/authorization";
import { AiService } from "@/lib/services/ai-service";
import { DbService } from "@/lib/services/db-service";
import { WebhookService } from "@/lib/services/webhook-service";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    // 1. Enforce Server-Side Auth/Tenant Isolation
    const { workspaceId, role } = await requireApiWorkspaceContext();

    if (role === "VIEWER") {
      return NextResponse.json(
        { success: false, message: "Permission Denied: Read-only access." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { content, source, customerName, customerEmail, customerLabel } = body;

    if (!content || !source) {
      return NextResponse.json(
        { error: "Content and source are required fields." },
        { status: 400 }
      );
    }

    // 2. Deduplication: Reuse classification results for identical content in workspace
    const duplicate = await prisma.feedback.findFirst({
      where: {
        workspaceId,
        content: { equals: content.trim(), mode: "insensitive" },
        sentiment: { not: null },
      },
      select: {
        sentiment: true,
        metadata: true,
      },
    });

    let classification;
    let reused = false;

    if (duplicate) {
      const dupMeta = duplicate.metadata as Record<string, any>;
      classification = {
        sentiment: duplicate.sentiment,
        score: dupMeta.score || 5,
        theme: dupMeta.theme || "General Feedback",
        area: dupMeta.area || "General",
        summary: dupMeta.summary || "Reused classification.",
        priority: dupMeta.priority || "MEDIUM",
        confidence: dupMeta.confidence || 0.95,
        promptVersion: dupMeta.promptVersion || "v1.1",
        modelVersion: dupMeta.modelVersion || "reused-dedup",
        severity: dupMeta.severity || "MEDIUM",
        themes: dupMeta.themes || [dupMeta.theme || "General Feedback"],
        processingTime: dupMeta.processingTime || 0,
        provider: dupMeta.provider || "Google",
      };
      reused = true;
    } else {
      classification = await AiService.classifyFeedback(content);
    }

    // 3. Save to database scoped to workspaceId
    const feedback = await DbService.ingestFeedback(
      workspaceId,
      {
        content,
        source,
        customerName,
        customerEmail,
        customerLabel,
        sentiment: classification.sentiment as any,
        score: classification.score,
        theme: classification.theme,
        area: classification.area,
        priority: classification.priority,
        confidence: classification.confidence,
        promptVersion: classification.promptVersion,
        modelVersion: classification.modelVersion,
        severity: classification.severity,
        themes: classification.themes,
        summary: classification.summary,
        processingTime: classification.processingTime,
        provider: classification.provider,
      },
      reused ? "System Ingestion (Deduplicated)" : "System Ingestion"
    );

    // 4. Trigger Asynchronous Integration Events (Non-blocking guarantee)
    const eventPayload = {
      feedbackId: feedback.id,
      customerName: customerName || "Anonymous User",
      customerEmail: customerEmail || "",
      feedback: content,
      sentiment: classification.sentiment,
      severity: classification.severity || "MEDIUM",
      priority: classification.priority || "MEDIUM",
      theme: classification.theme || "General",
      createdAt: feedback.createdAt.toISOString(),
    };

    void WebhookService.queueEvent(workspaceId, "FEEDBACK_CREATED", feedback.id, eventPayload);
    void WebhookService.queueEvent(workspaceId, "AI_CLASSIFIED", feedback.id, eventPayload);

    const isHighPriority =
      classification.severity === "HIGH" ||
      classification.severity === "CRITICAL" ||
      classification.priority === "HIGH" ||
      classification.priority === "URGENT" ||
      (classification.sentiment === "NEGATIVE" && classification.severity !== "LOW");

    if (isHighPriority) {
      void WebhookService.queueEvent(workspaceId, "HIGH_PRIORITY_FEEDBACK", feedback.id, eventPayload);
    }

    return NextResponse.json({ success: true, feedback }, { status: 201 });
  } catch (error: any) {
    if (error instanceof ApiAuthError) {
      console.warn(
        JSON.stringify({
          event: "API_AUTH_FAILURE",
          api: "POST /api/feedback/classify",
          message: error.message,
          timestamp: new Date().toISOString(),
        })
      );
      return NextResponse.json(
        { success: false, message: "Unauthorized", data: null, errors: ["UNAUTHORIZED"] },
        { status: 401 }
      );
    }
    if (error instanceof ApiForbiddenError) {
      console.warn(
        JSON.stringify({
          event: "API_FORBIDDEN_FAILURE",
          api: "POST /api/feedback/classify",
          message: error.message,
          timestamp: new Date().toISOString(),
        })
      );
      return NextResponse.json(
        { success: false, message: "Forbidden", data: null, errors: ["FORBIDDEN"] },
        { status: 403 }
      );
    }
    console.error(
      JSON.stringify({
        event: "API_ERROR",
        api: "POST /api/feedback/classify",
        error: error.message || error,
        timestamp: new Date().toISOString(),
      })
    );
    return NextResponse.json(
      { error: error.message || "An unexpected error occurred." },
      { status: 500 }
    );
  }
}

