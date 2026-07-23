import { prisma } from "@/lib/prisma";
import { IntegrationService } from "./integration-service";
import { ProviderRegistry } from "./integrations/provider-registry";
import { IntegrationType } from "./integrations/provider-interface";

export type EventType = "FEEDBACK_CREATED" | "AI_CLASSIFIED" | "HIGH_PRIORITY_FEEDBACK" | "TEST_EVENT";

export class WebhookService {
  /**
   * Asynchronously queue an integration event with idempotency check
   */
  static async queueEvent(
    workspaceId: string,
    eventType: EventType,
    feedbackId?: string,
    eventData: Record<string, any> = {}
  ): Promise<string | null> {
    try {
      // Generate deterministic idempotencyKey (per workspace, eventType, feedbackId, and 1-minute window)
      const minuteWindow = Math.floor(Date.now() / 60000);
      const idempotencyKey = `${workspaceId}:${eventType}:${feedbackId || "global"}:${minuteWindow}`;

      // Check for existing event to prevent duplicate creation
      const existing = await prisma.integrationEvent.findUnique({
        where: { idempotencyKey },
      });

      if (existing) {
        if (existing.status === "PROCESSED" || existing.status === "PROCESSING") {
          return existing.id;
        }
        return existing.id;
      }

      // Formulate Version 1.0 Webhook Payload
      const payload = {
        version: "1.0",
        eventType,
        timestamp: new Date().toISOString(),
        data: {
          feedbackId: feedbackId || eventData.feedbackId || "",
          customerName: eventData.customerName || "Anonymous User",
          customerEmail: eventData.customerEmail || "",
          feedback: eventData.content || eventData.feedback || "",
          sentiment: eventData.sentiment || "NEUTRAL",
          severity: eventData.severity || "MEDIUM",
          priority: eventData.priority || "MEDIUM",
          theme: eventData.theme || eventData.themes?.[0] || "General",
          createdAt: eventData.createdAt || new Date().toISOString(),
          ...eventData,
        },
      };

      const event = await prisma.integrationEvent.create({
        data: {
          workspaceId,
          feedbackId: feedbackId || null,
          idempotencyKey,
          eventType,
          payload,
          status: "PENDING",
        },
      });

      // Trigger non-blocking asynchronous processing
      void this.processPendingEvents(workspaceId).catch((err) =>
        console.error("[WebhookService] Async trigger error:", err)
      );

      return event.id;
    } catch (error) {
      console.error("[WebhookService] Failed to queue integration event:", error);
      return null;
    }
  }

  /**
   * Process pending/retryable integration events with atomic concurrency locking across all providers
   */
  static async processPendingEvents(workspaceIdFilter?: string): Promise<{ processed: number; failed: number }> {
    const now = new Date();
    let processed = 0;
    let failed = 0;

    try {
      const events = await prisma.integrationEvent.findMany({
        where: {
          workspaceId: workspaceIdFilter ? workspaceIdFilter : undefined,
          status: { in: ["PENDING", "FAILED"] },
          OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: now } }],
        },
        take: 20,
        orderBy: { createdAt: "asc" },
      });

      for (const event of events) {
        // Atomic Concurrency Lock: set status to PROCESSING
        const locked = await prisma.integrationEvent.updateMany({
          where: {
            id: event.id,
            status: { in: ["PENDING", "FAILED"] },
          },
          data: {
            status: "PROCESSING",
            lastAttemptAt: now,
          },
        });

        if (locked.count === 0) {
          continue;
        }

        const dispatchResult = await this.dispatchSingleEvent(event);
        if (dispatchResult.success) {
          processed++;
        } else {
          failed++;
        }
      }

      // Run 90-day retention cleanup for SUCCESS logs asynchronously
      void this.pruneOldSuccessLogs().catch((err) =>
        console.error("[WebhookService] Prune logs error:", err)
      );
    } catch (error) {
      console.error("[WebhookService] Error processing pending events:", error);
    }

    return { processed, failed };
  }

  /**
   * Dispatch an IntegrationEvent to all enabled integration providers (SLACK, ZENDESK, JIRA, WEBHOOK)
   */
  private static async dispatchSingleEvent(event: any): Promise<{ success: boolean; error?: string }> {
    const startTime = Date.now();
    const attempts = event.attempts + 1;
    const providerTypes: IntegrationType[] = ["WEBHOOK", "SLACK", "ZENDESK", "JIRA"];

    let overallSuccess = false;
    let lastError = "";

    for (const type of providerTypes) {
      try {
        const { enabled, config } = await IntegrationService.getRawConfig(event.workspaceId, type);
        if (!enabled) continue;

        const handler = ProviderRegistry.getHandler(type);
        const result = await handler.dispatchFeedbackEvent(config, event.payload.data || {});

        const urlDisplay = config.webhookUrl || config.slackWebhookUrl || config.domain || config.subdomain || type;

        await prisma.webhookLog.create({
          data: {
            workspaceId: event.workspaceId,
            eventId: event.id,
            feedbackId: event.feedbackId,
            url: urlDisplay,
            event: `${event.eventType}:${type}`,
            payload: event.payload,
            status: result.success ? "SUCCESS" : "FAILED",
            statusCode: result.statusCode || (result.success ? 200 : 500),
            response: result.response || result.error || "",
            attempts,
            durationMs: result.durationMs,
            error: result.error || null,
          },
        });

        if (result.success) {
          overallSuccess = true;
        } else {
          lastError = result.error || `${type} dispatch failed`;
        }
      } catch (providerErr: any) {
        lastError = providerErr.message || `${type} exception`;
      }
    }

    if (overallSuccess) {
      await prisma.integrationEvent.update({
        where: { id: event.id },
        data: {
          status: "PROCESSED",
          processedAt: new Date(),
          attempts,
          error: null,
        },
      });
      return { success: true };
    } else {
      const isDeadLetter = attempts >= event.maxAttempts;
      const nextStatus = isDeadLetter ? "DEAD_LETTER" : "FAILED";
      const backoffMs = Math.pow(2, attempts) * 1000;
      const nextAttemptAt = isDeadLetter ? null : new Date(Date.now() + backoffMs);

      await prisma.integrationEvent.update({
        where: { id: event.id },
        data: {
          status: nextStatus,
          attempts,
          nextAttemptAt,
          error: lastError || "No active integrations responded successfully.",
        },
      });

      return { success: false, error: lastError || "Dispatch failed across providers." };
    }
  }

  /**
   * Manually retry a failed or dead-letter event
   */
  static async retryFailedEvent(workspaceId: string, eventId: string) {
    const event = await prisma.integrationEvent.findFirst({
      where: { id: eventId, workspaceId },
    });

    if (!event) {
      throw new Error("Event not found or access denied.");
    }

    await prisma.integrationEvent.update({
      where: { id: eventId },
      data: {
        status: "PENDING",
        nextAttemptAt: new Date(),
        error: null,
      },
    });

    return await this.processPendingEvents(workspaceId);
  }

  /**
   * Fetch Webhook delivery telemetry logs for workspace
   */
  static async getWebhookLogs(
    workspaceId: string,
    params: { retryFailedOnly?: boolean; page?: number; pageSize?: number } = {}
  ) {
    const page = params.page || 1;
    const pageSize = params.pageSize || 15;
    const skip = (page - 1) * pageSize;

    const whereClause: any = { workspaceId };
    if (params.retryFailedOnly) {
      whereClause.status = { in: ["FAILED", "RETRYING", "DEAD_LETTER"] };
    }

    const [items, totalCount] = await Promise.all([
      prisma.webhookLog.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      prisma.webhookLog.count({ where: whereClause }),
    ]);

    return {
      items,
      totalCount,
      page,
      pageSize,
      totalPages: Math.ceil(totalCount / pageSize),
    };
  }

  /**
   * Prune SUCCESS logs older than 90 days
   */
  private static async pruneOldSuccessLogs() {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    await prisma.webhookLog.deleteMany({
      where: {
        status: "SUCCESS",
        createdAt: { lt: ninetyDaysAgo },
      },
    });
  }
}
