import { prisma } from "@/lib/prisma";
import { FeedbackSource, Sentiment, WorkspaceRole, ReportStatus, Prisma } from "@prisma/client";
import { AiService } from "./ai-service";
import { AI_CONFIG } from "./ai-config";
import { JobService } from "./job-service";
import { WebhookService } from "./webhook-service";

export function getModelDisplayName(model: string | undefined): string {
  if (!model) return "Google Gemini AI";
  if (model.includes("gemini-2.0-flash")) return "Gemini 2.0 Flash";
  if (model.includes("gemini-2.5-flash")) return "Gemini 2.5 Flash";
  if (model.includes("gemini-2.5-pro")) return "Gemini 2.5 Pro";
  if (model.startsWith("gemini-")) {
    return model
      .split("-")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }
  return "Google Gemini AI";
}

export type IngestFeedbackInput = {
  content: string;
  source: FeedbackSource;
  customerName?: string;
  customerEmail?: string;
  customerLabel?: string;
  sentiment?: Sentiment;
  score?: number;
  theme?: string;
  area?: string;
  submittedAt?: Date;
  tags?: string[];
  priority?: string;
  confidence?: number;
  promptVersion?: string;
  modelVersion?: string;
  
  // New fields
  severity?: string;
  themes?: string[];
  summary?: string;
  processingTime?: number;
  provider?: string;
};

export class DbService {
  /**
   * Ingest a single feedback item and run transaction checks
   */
  static async ingestFeedback(workspaceId: string, input: IngestFeedbackInput, creatorName = "System Ingestion") {
    return await prisma.$transaction(async (tx) => {
      // Convert confidence to float if it is 0-100
      const confidenceVal = input.confidence !== undefined
        ? (input.confidence > 1 ? input.confidence / 100 : input.confidence)
        : 0.85;

      const normalizedSentiment = input.sentiment
        ? (DbService.getNormalizedSentiment({ sentiment: input.sentiment }) as Sentiment)
        : undefined;

      const timeline = [
        {
          type: "CREATED",
          user: creatorName,
          timestamp: new Date().toISOString(),
          description: "Feedback logged in system.",
        },
      ];

      if (normalizedSentiment) {
        timeline.push({
          type: "AI_CLASSIFIED",
          user: getModelDisplayName(input.modelVersion),
          timestamp: new Date().toISOString(),
          description: input.modelVersion === "reused-dedup"
            ? "Reused classification from duplicate item."
            : `Auto-classified (Score: ${input.score}, Priority: ${input.priority}, Confidence: ${Math.round(confidenceVal * 100)}%)`,
        });
      }

      // 1. Prepare structured metadata with audit timeline log
      const metadata = {
        customerName: input.customerName || "Anonymous User",
        customerEmail: input.customerEmail || "anonymous@company.com",
        customerLabel: input.customerLabel || "free",
        score: input.score !== undefined ? input.score : 5,
        area: input.area || "General",
        status: "NEW",
        tags: input.tags || [],
        priority: input.priority || "MEDIUM",
        confidence: confidenceVal,
        promptVersion: input.promptVersion || "v1.0",
        modelVersion: input.modelVersion || "unknown",
        
        // Requirement 9 AI Metadata fields
        model: input.modelVersion || "unknown",
        provider: input.provider || "Google",
        processingTime: input.processingTime || 0,
        themes: input.themes || (input.theme ? [input.theme] : ["General"]),
        summary: input.summary || "No summary provided.",
        severity: input.severity || "MEDIUM",
        sentiment: normalizedSentiment || "NEUTRAL",
        
        timeline,
      };

      // 2. Create the Feedback record
      const feedback = await tx.feedback.create({
        data: {
          workspaceId,
          content: input.content,
          source: input.source,
          sentiment: normalizedSentiment || null, // null indicates unclassified / queued
          metadata: metadata as any,
          submittedAt: input.submittedAt || new Date(),
        },
      });

      // 3. Handle theme linking if theme name is provided
      if (input.theme) {
        const normalizedThemeName = input.theme.trim();
        const theme = await tx.theme.upsert({
          where: {
            workspaceId_name: {
              workspaceId,
              name: normalizedThemeName,
            },
          },
          update: {},
          create: {
            workspaceId,
            name: normalizedThemeName,
            description: `Auto-generated theme for ${normalizedThemeName}`,
          },
        });

        await tx.feedbackTheme.create({
          data: {
            feedbackId: feedback.id,
            themeId: theme.id,
          },
        });
      }

      return feedback;
    });
  }

  /**
   * Get paginated feedback list with search, sorting, tag, and date range filters
   */
  static async getFeedbackInbox(
    workspaceId: string,
    params: {
      search?: string;
      sentiment?: string;
      source?: string;
      status?: string;
      dateRange?: string;
      startDate?: string;
      endDate?: string;
      tag?: string;
      page?: number;
      pageSize?: number;
      sortField?: string;
      sortOrder?: string;
    }
  ) {
    const page = params.page || 1;
    const pageSize = params.pageSize || 10;
    const skip = (page - 1) * pageSize;

    const whereClause: Prisma.FeedbackWhereInput = {
      workspaceId,
    };

    // Apply basic filter categories
    if (params.sentiment && params.sentiment !== "ALL" && params.sentiment !== "all") {
      whereClause.sentiment = params.sentiment.toUpperCase() as Sentiment;
    }

    if (params.source && params.source !== "ALL" && params.source !== "all") {
      whereClause.source = params.source.toUpperCase() as FeedbackSource;
    }

    if (params.status && params.status !== "ALL" && params.status !== "all") {
      whereClause.metadata = {
        path: ["status"],
        equals: params.status.toUpperCase(),
      };
    }

    // Apply date range filter parameters
    if (params.dateRange && params.dateRange !== "ALL" && params.dateRange !== "all") {
      const now = new Date();
      if (params.dateRange === "PAST_7_DAYS") {
        whereClause.submittedAt = {
          gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        };
      } else if (params.dateRange === "PAST_30_DAYS") {
        whereClause.submittedAt = {
          gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        };
      } else if (params.dateRange === "CUSTOM" && params.startDate) {
        whereClause.submittedAt = {
          gte: new Date(params.startDate),
          lte: params.endDate ? new Date(params.endDate) : undefined,
        };
      }
    }

    // Filter by custom tags array inside JSON metadata
    if (params.tag) {
      whereClause.metadata = {
        path: ["tags"],
        array_contains: [params.tag.trim()],
      };
    }

    // Filter by general search string
    if (params.search) {
      whereClause.OR = [
        { content: { contains: params.search, mode: "insensitive" } },
        {
          metadata: {
            path: ["customerName"],
            string_contains: params.search,
          },
        },
        {
          metadata: {
            path: ["customerEmail"],
            string_contains: params.search,
          },
        },
      ];
    }

    // Construct database sorting order parameters
    let orderBy: Prisma.FeedbackOrderByWithRelationInput = { submittedAt: "desc" };
    if (params.sortField === "submittedAt") {
      orderBy = { submittedAt: (params.sortOrder as any) || "desc" };
    } else if (params.sortField === "sentiment") {
      orderBy = { sentiment: (params.sortOrder as any) || "desc" };
    }

    const [items, totalCount] = await Promise.all([
      prisma.feedback.findMany({
        where: whereClause,
        orderBy,
        skip,
        take: pageSize,
        select: {
          id: true,
          content: true,
          source: true,
          sentiment: true,
          metadata: true,
          submittedAt: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.feedback.count({ where: whereClause }),
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
   * Edit/Update feedback details and append edit event to metadata timeline
   */
  static async updateFeedback(
    workspaceId: string,
    feedbackId: string,
    input: {
      content?: string;
      customerName?: string;
      customerEmail?: string;
      customerLabel?: string;
      status?: "NEW" | "REVIEWED" | "ACTIONED";
      tags?: string[];
      editingUser?: string;
    }
  ) {
    const feedback = await prisma.feedback.findFirst({
      where: { id: feedbackId, workspaceId },
    });

    if (!feedback) {
      throw new Error("Feedback record not found or access denied.");
    }

    const currentMeta = feedback.metadata as Record<string, any>;
    const newTimeline = [...(currentMeta.timeline || [])];
    
    const changes: string[] = [];
    if (input.content && input.content !== feedback.content) changes.push("content");
    if (input.customerName && input.customerName !== currentMeta.customerName) changes.push("customerName");
    if (input.customerEmail && input.customerEmail !== currentMeta.customerEmail) changes.push("customerEmail");
    if (input.customerLabel && input.customerLabel !== currentMeta.customerLabel) changes.push("customerLabel");
    if (input.status && input.status !== currentMeta.status) changes.push(`status to ${input.status}`);
    if (input.tags) changes.push("tags");

    if (changes.length > 0) {
      newTimeline.push({
        type: "EDITED",
        user: input.editingUser || "Agent",
        timestamp: new Date().toISOString(),
        description: `Updated fields: ${changes.join(", ")}`,
      });
    }

    const updatedMetadata = {
      ...currentMeta,
      customerName: input.customerName !== undefined ? input.customerName : currentMeta.customerName,
      customerEmail: input.customerEmail !== undefined ? input.customerEmail : currentMeta.customerEmail,
      customerLabel: input.customerLabel !== undefined ? input.customerLabel : currentMeta.customerLabel,
      status: input.status !== undefined ? input.status : currentMeta.status || "NEW",
      tags: input.tags !== undefined ? input.tags : currentMeta.tags || [],
      timeline: newTimeline,
    };

    return await prisma.feedback.update({
      where: { id: feedbackId },
      data: {
        content: input.content !== undefined ? input.content : feedback.content,
        metadata: updatedMetadata as any,
      },
    });
  }

  /**
   * Update feedback status and append audit timeline log
   */
  static async updateFeedbackStatus(
    workspaceId: string,
    feedbackId: string,
    status: "NEW" | "REVIEWED" | "ACTIONED",
    updatingUser = "Agent"
  ) {
    const feedback = await prisma.feedback.findFirst({
      where: { id: feedbackId, workspaceId },
    });

    if (!feedback) {
      throw new Error("Feedback record not found.");
    }

    const currentMeta = feedback.metadata as Record<string, any>;
    const newTimeline = [...(currentMeta.timeline || [])];
    newTimeline.push({
      type: "STATUS_CHANGED",
      user: updatingUser,
      timestamp: new Date().toISOString(),
      description: `Status changed from ${currentMeta.status || "NEW"} to ${status}`,
    });

    const updatedMetadata = {
      ...currentMeta,
      status,
      timeline: newTimeline,
    };

    return await prisma.feedback.update({
      where: { id: feedbackId },
      data: {
        metadata: updatedMetadata as any,
      },
    });
  }

  /**
   * Get count of feedbacks pending AI classification
   */
  static async getUnclassifiedCount(workspaceId: string): Promise<number> {
    return await prisma.feedback.count({
      where: {
        workspaceId,
        sentiment: null,
      },
    });
  }

  /**
   * High-Performance Batch triage queue processor with Job Lifecycle tracking.
   * Uses Gemini Batch requests, bulk deduplication, sub-batch chunking, and single-transaction bulk updates.
   */
  static async triageBatchFeedbacks(workspaceId: string, limit = 50, jobId?: string, retryFailedOnly = false) {
    const totalStart = Date.now();
    const retrievalStart = Date.now();

    if (jobId) {
      JobService.updateJobProgress(jobId, { status: "PROCESSING", stage: "Fetching feedback" });
    }

    // 1. Fetch unclassified or failed feedback items
    const whereClause: Prisma.FeedbackWhereInput = { workspaceId };

    if (retryFailedOnly) {
      whereClause.metadata = {
        path: ["triageState"],
        equals: "FAILED",
      };
    } else {
      whereClause.OR = [
        { sentiment: null },
        { metadata: { path: ["triageState"], equals: "FAILED" } },
      ];
    }

    const unclassified = await prisma.feedback.findMany({
      where: whereClause,
      take: limit,
      orderBy: { submittedAt: "asc" },
    });

    const retrievalTimeMs = Date.now() - retrievalStart;

    if (unclassified.length === 0) {
      if (jobId) {
        JobService.updateJobProgress(jobId, {
          status: "COMPLETED",
          stage: "Completed",
          processedCount: 0,
          remainingCount: 0,
        });
      }
      return {
        processed: 0,
        failed: 0,
        remaining: 0,
        totalInQueue: 0,
        telemetry: {
          modelName: AI_CONFIG.model,
          processingTimeMs: Date.now() - totalStart,
          retrievalTimeMs,
          geminiTimeMs: 0,
          dbWriteTimeMs: 0,
          feedbackCount: 0,
          successCount: 0,
          failureCount: 0,
          retryCount: 0,
        },
      };
    }

    if (jobId) {
      JobService.updateJobProgress(jobId, {
        stage: "Preparing AI context",
        totalCount: unclassified.length,
        remainingCount: unclassified.length,
      });
    }

    // 2. Bulk Deduplication Check across workspace
    const uniqueContents = Array.from(new Set(unclassified.map((i) => i.content.toLowerCase().trim())));
    const existingDuplicates = await prisma.feedback.findMany({
      where: {
        workspaceId,
        sentiment: { not: null },
        content: { in: uniqueContents, mode: "insensitive" },
      },
      select: {
        content: true,
        sentiment: true,
        metadata: true,
      },
    });

    const duplicateMap = new Map<string, { sentiment: Sentiment; metadata: any }>();
    for (const dup of existingDuplicates) {
      const key = dup.content.toLowerCase().trim();
      if (!duplicateMap.has(key)) {
        duplicateMap.set(key, { sentiment: dup.sentiment as Sentiment, metadata: dup.metadata });
      }
    }

    const itemsToClassifyWithAI: Array<{ id: string; content: string }> = [];
    const itemsToUpdate: Array<{
      id: string;
      sentiment: Sentiment;
      metadata: any;
      themeName: string;
      reused: boolean;
    }> = [];

    // Separate items into reused duplicates vs items requiring Gemini API call
    for (const item of unclassified) {
      const key = item.content.toLowerCase().trim();
      const duplicate = duplicateMap.get(key);

      if (duplicate) {
        const dupMeta = duplicate.metadata as Record<string, any>;
        const currentMeta = item.metadata as Record<string, any>;
        const result = {
          sentiment: duplicate.sentiment,
          score: dupMeta.score || 5,
          theme: dupMeta.theme || "General Feedback",
          area: dupMeta.area || "General",
          summary: dupMeta.summary || "Reused classification details.",
          priority: dupMeta.priority || "MEDIUM",
          confidence: dupMeta.confidence || 0.95,
          promptVersion: dupMeta.promptVersion || "v1.1",
          modelVersion: dupMeta.modelVersion || "reused-dedup",
          themes: dupMeta.themes || [dupMeta.theme || "General Feedback"],
          severity: dupMeta.severity || "MEDIUM",
          processingTime: 0,
          provider: dupMeta.provider || "Google",
        };

        const confidenceVal = result.confidence > 1 ? result.confidence / 100 : result.confidence;
        const timeline = [...(currentMeta.timeline || [])];
        timeline.push({
          type: "AI_CLASSIFIED",
          user: getModelDisplayName(result.modelVersion),
          timestamp: new Date().toISOString(),
          description: "Reused classification from duplicate item.",
        });

        const updatedMetadata = {
          ...currentMeta,
          score: result.score,
          area: result.area,
          theme: result.theme,
          priority: result.priority,
          confidence: confidenceVal,
          promptVersion: result.promptVersion,
          modelVersion: result.modelVersion,
          model: result.modelVersion,
          provider: result.provider,
          processingTime: 0,
          themes: result.themes,
          summary: result.summary,
          severity: result.severity,
          sentiment: result.sentiment,
          triageState: "COMPLETED",
          status: currentMeta.status || "NEW",
          timeline,
        };

        itemsToUpdate.push({
          id: item.id,
          sentiment: result.sentiment,
          metadata: updatedMetadata,
          themeName: result.theme,
          reused: true,
        });
      } else {
        itemsToClassifyWithAI.push({ id: item.id, content: item.content });
      }
    }

    let cumulativeGeminiTimeMs = 0;
    let cumulativeRetryCount = 0;
    let totalFailedCount = 0;

    // 3. Process items in sub-batches of 20 with Gemini API
    if (jobId) {
      JobService.updateJobProgress(jobId, { stage: "Gemini analysis" });
    }

    const chunkSize = 20;
    for (let i = 0; i < itemsToClassifyWithAI.length; i += chunkSize) {
      const chunk = itemsToClassifyWithAI.slice(i, i + chunkSize);
      try {
        const batchResponse = await AiService.classifyFeedbackBatch(chunk);
        cumulativeGeminiTimeMs += batchResponse.telemetry.geminiTimeMs;
        cumulativeRetryCount += batchResponse.telemetry.retryCount;

        for (const reqItem of chunk) {
          const originalItem = unclassified.find((u) => u.id === reqItem.id)!;
          const currentMeta = originalItem.metadata as Record<string, any>;
          const aiResult = batchResponse.results.get(reqItem.id);

          if (aiResult) {
            const confidenceVal = aiResult.confidence > 1 ? aiResult.confidence / 100 : aiResult.confidence;
            const timeline = [...(currentMeta.timeline || [])];
            timeline.push({
              type: "AI_CLASSIFIED",
              user: getModelDisplayName(aiResult.modelVersion),
              timestamp: new Date().toISOString(),
              description: `Auto-classified (Score: ${aiResult.score}, Priority: ${aiResult.priority}, Confidence: ${Math.round(confidenceVal * 100)}%)`,
            });

            // Clean up stale error metadata if retried item succeeds
            const { triageError, triageErrorDetail, ...cleanMeta } = currentMeta;
            const updatedMetadata = {
              ...cleanMeta,
              score: aiResult.score,
              area: aiResult.area,
              theme: aiResult.theme,
              priority: aiResult.priority,
              confidence: confidenceVal,
              promptVersion: aiResult.promptVersion,
              modelVersion: aiResult.modelVersion,
              model: aiResult.modelVersion,
              provider: aiResult.provider,
              processingTime: batchResponse.telemetry.processingTimeMs,
              themes: aiResult.themes,
              summary: aiResult.summary,
              severity: aiResult.severity,
              sentiment: aiResult.sentiment,
              triageState: "COMPLETED",
              status: currentMeta.status || "NEW",
              timeline,
            };

            itemsToUpdate.push({
              id: originalItem.id,
              sentiment: aiResult.sentiment as Sentiment,
              metadata: updatedMetadata,
              themeName: aiResult.theme,
              reused: false,
            });
          } else {
            totalFailedCount++;
            const customerName = currentMeta.customerName || "Anonymous User";
            const errorMsg = "Missing AI classification result";
            itemsToUpdate.push({
              id: originalItem.id,
              sentiment: null as any,
              metadata: {
                ...currentMeta,
                triageState: "FAILED",
                triageError: `${customerName} failed: ${errorMsg}`,
                triageErrorDetail: {
                  feedbackId: originalItem.id,
                  customerName,
                  customerEmail: currentMeta.customerEmail || "",
                  errorMessage: errorMsg,
                  timestamp: new Date().toISOString(),
                },
              },
              themeName: "",
              reused: false,
            });
          }
        }
      } catch (chunkError: any) {
        console.error(`Sub-batch of ${chunk.length} items failed:`, chunkError?.message || chunkError);
        totalFailedCount += chunk.length;

        for (const reqItem of chunk) {
          const originalItem = unclassified.find((u) => u.id === reqItem.id)!;
          const currentMeta = originalItem.metadata as Record<string, any>;
          const customerName = currentMeta.customerName || "Anonymous User";
          const errorMsg = chunkError?.message || "Sub-batch AI request failed";

          itemsToUpdate.push({
            id: originalItem.id,
            sentiment: null as any,
            metadata: {
              ...currentMeta,
              triageState: "FAILED",
              triageError: `${customerName} failed: ${errorMsg}`,
              triageErrorDetail: {
                feedbackId: originalItem.id,
                customerName,
                customerEmail: currentMeta.customerEmail || "",
                errorMessage: errorMsg,
                timestamp: new Date().toISOString(),
              },
            },
            themeName: "",
            reused: false,
          });
        }
      }

      if (jobId) {
        const currentProcessed = itemsToUpdate.filter((i) => i.metadata.triageState === "COMPLETED").length;
        JobService.updateJobProgress(jobId, {
          processedCount: currentProcessed,
          failedCount: totalFailedCount,
          remainingCount: Math.max(0, unclassified.length - (currentProcessed + totalFailedCount)),
        });
      }
    }

    // 4. Bulk Database Operations
    if (jobId) {
      JobService.updateJobProgress(jobId, { stage: "Saving results" });
    }
    const dbWriteStart = Date.now();

    // A. Collect unique non-empty themes and bulk upsert them
    const uniqueThemeNames = Array.from(
      new Set(itemsToUpdate.map((i) => i.themeName).filter((t) => t && t.trim().length > 0))
    );

    const themeMap = new Map<string, string>(); // themeName -> themeId
    if (uniqueThemeNames.length > 0) {
      const existingThemes = await prisma.theme.findMany({
        where: {
          workspaceId,
          name: { in: uniqueThemeNames },
        },
      });

      for (const t of existingThemes) {
        themeMap.set(t.name, t.id);
      }

      const missingThemeNames = uniqueThemeNames.filter((name) => !themeMap.has(name));
      for (const missingName of missingThemeNames) {
        const createdTheme = await prisma.theme.upsert({
          where: { workspaceId_name: { workspaceId, name: missingName } },
          update: {},
          create: {
            workspaceId,
            name: missingName,
            description: `Auto-generated theme for ${missingName}`,
          },
        });
        themeMap.set(missingName, createdTheme.id);
      }
    }

    // B. Group feedback updates and theme links in a single $transaction
    const feedbackThemeLinks: Array<{ feedbackId: string; themeId: string }> = [];

    const dbOperations = itemsToUpdate.map((item) => {
      if (item.themeName && themeMap.has(item.themeName)) {
        feedbackThemeLinks.push({
          feedbackId: item.id,
          themeId: themeMap.get(item.themeName)!,
        });
      }

      return prisma.feedback.update({
        where: { id: item.id },
        data: {
          sentiment: item.sentiment,
          metadata: item.metadata,
        },
      });
    });

    await prisma.$transaction(dbOperations);

    // Queue integration events asynchronously for successfully classified items
    for (const item of itemsToUpdate) {
      if (item.metadata && item.metadata.triageState === "COMPLETED") {
        const original = unclassified.find((u) => u.id === item.id);
        const eventData = {
          feedbackId: item.id,
          customerName: item.metadata.customerName || "Anonymous User",
          customerEmail: item.metadata.customerEmail || "",
          feedback: original?.content || "",
          sentiment: item.sentiment,
          severity: item.metadata.severity || "MEDIUM",
          priority: item.metadata.priority || "MEDIUM",
          theme: item.themeName || "General",
          createdAt: original?.createdAt?.toISOString() || new Date().toISOString(),
        };

        void WebhookService.queueEvent(workspaceId, "AI_CLASSIFIED", item.id, eventData);

        const isHighPriority =
          item.metadata.severity === "HIGH" ||
          item.metadata.severity === "CRITICAL" ||
          item.metadata.priority === "HIGH" ||
          item.metadata.priority === "URGENT" ||
          (item.sentiment === "NEGATIVE" && item.metadata.severity !== "LOW");

        if (isHighPriority) {
          void WebhookService.queueEvent(workspaceId, "HIGH_PRIORITY_FEEDBACK", item.id, eventData);
        }
      }
    }

    // C. Bulk create theme links
    if (feedbackThemeLinks.length > 0) {
      await prisma.feedbackTheme.createMany({
        data: feedbackThemeLinks,
        skipDuplicates: true,
      });
    }

    const dbWriteTimeMs = Date.now() - dbWriteStart;
    const totalDurationMs = Date.now() - totalStart;

    const remainingCount = await prisma.feedback.count({
      where: {
        workspaceId,
        sentiment: null,
      },
    });

    const successCount = itemsToUpdate.filter((i) => i.metadata.triageState === "COMPLETED").length;
    const failedItems = itemsToUpdate.filter((i) => i.metadata.triageState === "FAILED");
    const failedItemIds = failedItems.map((i) => i.id);
    const failedDetails = failedItems.map((i) => ({
      id: i.id,
      customerName: i.metadata.customerName || "Anonymous User",
      errorMessage: i.metadata.triageError || "Classification failed",
    }));

    const telemetry = {
      modelName: AI_CONFIG.model,
      processingTimeMs: totalDurationMs,
      retrievalTimeMs,
      geminiTimeMs: cumulativeGeminiTimeMs,
      dbWriteTimeMs,
      feedbackCount: unclassified.length,
      successCount,
      failureCount: totalFailedCount,
      retryCount: cumulativeRetryCount,
      apiCallCount: Math.ceil(itemsToClassifyWithAI.length / 20),
    };

    if (jobId) {
      JobService.updateJobProgress(jobId, {
        status: totalFailedCount > 0 && successCount === 0 ? "FAILED" : "COMPLETED",
        stage: "Completed",
        processedCount: successCount,
        failedCount: totalFailedCount,
        remainingCount,
        completedAt: new Date().toISOString(),
        failedItemIds,
        failedDetails,
        telemetry,
        error: totalFailedCount > 0 ? `${totalFailedCount} items failed processing.` : undefined,
      });
    }

    return {
      processed: successCount,
      failed: totalFailedCount,
      remaining: remainingCount,
      totalInQueue: unclassified.length,
      failedDetails,
      telemetry,
    };
  }

  /**
   * Helper to normalize sentiment string values
   */
  static getNormalizedSentiment(f: any): string | null {
    const s = f.sentiment || (f.metadata as any)?.sentiment;
    if (!s) return null;
    const upper = String(s).toUpperCase().trim();
    if (upper === "POSITIVE") return "POSITIVE";
    if (upper === "NEGATIVE") return "NEGATIVE";
    if (upper === "NEUTRAL") return "NEUTRAL";
    return null;
  }

  /**
   * Get overview dashboard stats
   */
  static async getOverviewStats(workspaceId: string) {
    const feedbacks = await prisma.feedback.findMany({
      where: { workspaceId },
      select: { id: true, source: true, sentiment: true, metadata: true, submittedAt: true, createdAt: true },
    });

    let positiveCount = 0;
    let negativeCount = 0;
    let neutralCount = 0;

    feedbacks.forEach((f: any) => {
      const norm = DbService.getNormalizedSentiment(f);
      if (norm === "POSITIVE") positiveCount++;
      else if (norm === "NEGATIVE") negativeCount++;
      else if (norm === "NEUTRAL") neutralCount++;
    });

    const totalFeedback = feedbacks.length;
    const avgSentimentVal = totalFeedback > 0 ? Math.round((positiveCount / totalFeedback) * 100) : 0;
    const avgSentiment = `${avgSentimentVal}%`;

    const activeIssuesCount = feedbacks.filter((f: any) => {
      const normSentiment = DbService.getNormalizedSentiment(f);
      const severity = String((f.metadata as any)?.severity || (f.metadata as any)?.priority || "").toUpperCase().trim();
      return normSentiment === "NEGATIVE" || severity === "HIGH" || severity === "CRITICAL";
    }).length;

    // Calculate Churn Risk Ratio
    const negativeSentimentPct = totalFeedback > 0 ? (negativeCount / totalFeedback) : 0;

    const highSeverityCount = feedbacks.filter((f: any) => {
      const severity = String((f.metadata as any)?.severity || (f.metadata as any)?.priority || "").toUpperCase().trim();
      return severity === "HIGH" || severity === "CRITICAL";
    }).length;
    const highSeverityPct = totalFeedback > 0 ? (highSeverityCount / totalFeedback) : 0;

    const customerEmailCounts: Record<string, number> = {};
    feedbacks.forEach((f: any) => {
      const email = (f.metadata as any)?.customerEmail;
      if (email && email !== "anonymous@company.com") {
        customerEmailCounts[email] = (customerEmailCounts[email] || 0) + 1;
      }
    });

    const repeatedComplaintsCount = feedbacks.filter((f: any) => {
      const email = (f.metadata as any)?.customerEmail;
      return email && email !== "anonymous@company.com" && customerEmailCounts[email] > 1;
    }).length;
    const repeatedPct = totalFeedback > 0 ? (repeatedComplaintsCount / totalFeedback) : 0;

    const churnRiskVal = Math.min(100, Math.round(((negativeSentimentPct * 0.4) + (highSeverityPct * 0.4) + (repeatedPct * 0.2) ) * 100));
    const churnRisk = `${churnRiskVal}%`;

    // A. Priority Counts
    const priorityDistribution = { HIGH: 0, MEDIUM: 0, LOW: 0 };
    // B. Channel Counts
    const channelDistribution = { MANUAL: 0, CSV: 0, SIMULATED: 0 };

    feedbacks.forEach((f: any) => {
      const meta = f.metadata as Record<string, any>;
      const prio = (meta.priority || "MEDIUM").toUpperCase();
      if (prio === "HIGH") priorityDistribution.HIGH += 1;
      else if (prio === "LOW") priorityDistribution.LOW += 1;
      else priorityDistribution.MEDIUM += 1;

      const src = f.source;
      if (src === "MANUAL") channelDistribution.MANUAL += 1;
      else if (src === "CSV") channelDistribution.CSV += 1;
      else if (src === "SIMULATED") channelDistribution.SIMULATED += 1;
    });

    // C. Monthly Trend calculations (Month over Month comparing volume and sentiment)
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    let currentMonthVolume = 0;
    let lastMonthVolume = 0;
    let currentMonthPositive = 0;
    let lastMonthPositive = 0;

    feedbacks.forEach((f: any) => {
      const date = new Date(f.submittedAt || f.createdAt);
      const m = date.getMonth();
      const y = date.getFullYear();

      if (m === currentMonth && y === currentYear) {
        currentMonthVolume += 1;
        const norm = DbService.getNormalizedSentiment(f);
        if (norm === "POSITIVE") currentMonthPositive += 1;
      } else if (m === lastMonth && y === lastMonthYear) {
        lastMonthVolume += 1;
        const norm = DbService.getNormalizedSentiment(f);
        if (norm === "POSITIVE") lastMonthPositive += 1;
      }
    });

    const volumeMoM = lastMonthVolume > 0 
      ? Math.round(((currentMonthVolume - lastMonthVolume) / lastMonthVolume) * 100) 
      : 0;

    const currentSentimentPct = currentMonthVolume > 0 ? Math.round((currentMonthPositive / currentMonthVolume) * 100) : 0;
    const lastSentimentPct = lastMonthVolume > 0 ? Math.round((lastMonthPositive / lastMonthVolume) * 100) : 0;
    const sentimentMoM = currentSentimentPct - lastSentimentPct;

    // Backend logging for dashboard stats retrieval
    console.log(
      JSON.stringify({
        event: "DASHBOARD_STATS_RETRIEVED_BACKEND",
        workspaceId,
        totalFeedback,
        sentimentCounts: {
          positive: positiveCount,
          negative: negativeCount,
          neutral: neutralCount,
        },
        priorityDistribution,
        channelDistribution,
        activeIssuesCount,
        churnRisk,
        timestamp: new Date().toISOString(),
      })
    );

    return {
      totalFeedback,
      positiveCount,
      negativeCount,
      neutralCount,
      avgSentiment,
      openIssues: activeIssuesCount,
      churnRisk,
      priorityDistribution,
      channelDistribution,
      trendComparison: {
        volumeDiff: volumeMoM >= 0 ? `+${volumeMoM}%` : `${volumeMoM}%`,
        sentimentDiff: sentimentMoM >= 0 ? `+${sentimentMoM}%` : `${sentimentMoM}%`,
        currentMonthVolume,
        lastMonthVolume,
      }
    };
  }

  /**
   * Get recent feedbacks
   */
  static async getRecentFeedback(workspaceId: string, limit = 5) {
    return await prisma.feedback.findMany({
      where: { workspaceId },
      orderBy: { submittedAt: "desc" },
      take: limit,
    });
  }

  /**
   * Get top topics driving feedback analytics (minimum 5 themes)
   */
  static async getNegativeTopics(workspaceId: string, limit = 5) {
    const themes = await prisma.theme.findMany({
      where: { workspaceId },
      include: {
        feedback: {
          include: {
            feedback: true,
          },
        },
      },
    });

    const targetLimit = Math.max(5, limit);

    const topicStats = themes
      .map((t) => {
        const negativeFeedbacks = t.feedback.filter((ft) => DbService.getNormalizedSentiment(ft.feedback) === "NEGATIVE").length;
        const totalFeedbacks = t.feedback.length;
        const ratio = totalFeedbacks > 0 ? Math.round((negativeFeedbacks / totalFeedbacks) * 100) : 0;
        return {
          name: t.name,
          ratio,
          count: negativeFeedbacks > 0 ? negativeFeedbacks : totalFeedbacks,
        };
      })
      .filter((t) => t.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, targetLimit);

    return topicStats;
  }

  /**
   * Get volume & sentiment charts data
   */
  static async getAnalyticsCharts(workspaceId: string) {
    const feedbacks = await prisma.feedback.findMany({
      where: { workspaceId },
      select: { sentiment: true, submittedAt: true, createdAt: true, metadata: true },
      orderBy: { createdAt: "asc" },
    });

    const dailyStats: Record<string, { date: string; total: number; positive: number; negative: number; neutral: number }> = {};

    feedbacks.forEach((f) => {
      const dateStr = new Date(f.createdAt || f.submittedAt).toISOString().split("T")[0];
      if (!dailyStats[dateStr]) {
        dailyStats[dateStr] = { date: dateStr, total: 0, positive: 0, negative: 0, neutral: 0 };
      }
      dailyStats[dateStr].total += 1;

      const norm = DbService.getNormalizedSentiment(f);
      if (norm === "POSITIVE") {
        dailyStats[dateStr].positive += 1;
      } else if (norm === "NEGATIVE") {
        dailyStats[dateStr].negative += 1;
      } else if (norm === "NEUTRAL") {
        dailyStats[dateStr].neutral += 1;
      }
    });

    const data = Object.values(dailyStats);
    return data.length > 0 ? data : [{ date: new Date().toISOString().split("T")[0], total: 0, positive: 0, negative: 0, neutral: 0 }];
  }

  /**
   * Global search across Feedback, Customers, Reports, Themes, and Settings
   */
  static async globalSearch(workspaceId: string, query: string) {
    const q = query.trim();
    if (!q) {
      return {
        feedback: [],
        customers: [],
        reports: [],
        themes: [],
        settings: [],
        totalResults: 0,
      };
    }

    const insensitiveQuery = q.toLowerCase();

    // 1. Search Feedback (Content, customerName, customerEmail, summary)
    const feedbackItems = await prisma.feedback.findMany({
      where: {
        workspaceId,
        OR: [
          { content: { contains: q, mode: "insensitive" } },
          { metadata: { path: ["customerName"], string_contains: q } },
          { metadata: { path: ["customerEmail"], string_contains: q } },
          { metadata: { path: ["summary"], string_contains: q } },
        ],
      },
      take: 10,
      orderBy: { submittedAt: "desc" },
    });

    // 2. Search Reports
    const reportItems = await prisma.report.findMany({
      where: {
        workspaceId,
        OR: [
          { title: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 5,
      orderBy: { createdAt: "desc" },
    });

    // 3. Search Themes
    const themeItems = await prisma.theme.findMany({
      where: {
        workspaceId,
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 5,
    });

    // 4. Extract Customers matching query from feedback metadata
    const allFeedbackMeta = await prisma.feedback.findMany({
      where: { workspaceId },
      select: { metadata: true },
      take: 100,
    });

    const customersMap = new Map<string, { name: string; email: string; label: string }>();
    allFeedbackMeta.forEach((f) => {
      const meta = f.metadata as Record<string, any>;
      const name = meta?.customerName || "";
      const email = meta?.customerEmail || "";
      const label = meta?.customerLabel || "free";

      if (
        name.toLowerCase().includes(insensitiveQuery) ||
        email.toLowerCase().includes(insensitiveQuery)
      ) {
        const key = email || name;
        if (key && !customersMap.has(key)) {
          customersMap.set(key, { name: name || "Anonymous User", email: email || "N/A", label });
        }
      }
    });
    const customerItems = Array.from(customersMap.values()).slice(0, 5);

    // 5. Settings search
    const settingsPages = [
      { id: "profile", title: "User Profile & Identity", description: "Manage full name, email, and role", href: "/app/settings?section=profile" },
      { id: "team", title: "Workspace Team Members", description: "View team members and workspace permissions", href: "/app/settings?section=team" },
      { id: "credentials", title: "AI & System Credentials", description: "Inspect DATABASE_URL and GEMINI_API_KEY environment status", href: "/app/settings?section=credentials" },
      { id: "integrations", title: "Integrations & API Connections", description: "Connect Zendesk, Intercom, and Slack channels", href: "/app/integrations" },
      { id: "sentiment", title: "Sentiment Analytics & Distribution", description: "View sentiment breakdown and negative theme telemetry", href: "/app/sentiment" },
    ];

    const settingItems = settingsPages.filter(
      (s) => s.title.toLowerCase().includes(insensitiveQuery) || s.description.toLowerCase().includes(insensitiveQuery)
    );

    const totalResults =
      feedbackItems.length + customerItems.length + reportItems.length + themeItems.length + settingItems.length;

    return {
      feedback: feedbackItems.map((item) => {
        const meta = item.metadata as Record<string, any>;
        return {
          id: item.id,
          type: "feedback",
          title: meta.customerName ? `${meta.customerName}'s Feedback` : "Customer Feedback",
          content: item.content,
          customerName: meta.customerName || "Anonymous",
          customerEmail: meta.customerEmail || "",
          summary: meta.summary || item.content.slice(0, 100),
          sentiment: item.sentiment || "NEUTRAL",
          submittedAt: item.submittedAt,
          href: `/app/feedback?search=${encodeURIComponent(q)}&id=${item.id}`,
        };
      }),
      customers: customerItems.map((c, i) => ({
        id: `customer-${i}`,
        type: "customer",
        title: c.name,
        email: c.email,
        label: c.label,
        href: `/app/feedback?search=${encodeURIComponent(c.email || c.name)}`,
      })),
      reports: reportItems.map((r) => {
        const content = r.content as any;
        return {
          id: r.id,
          type: "report",
          title: r.title,
          summary: content?.text ? content.text.slice(0, 120) + "..." : "Voice of Customer Report",
          createdAt: r.createdAt,
          href: `/app/reports?id=${r.id}`,
        };
      }),
      themes: themeItems.map((t) => ({
        id: t.id,
        type: "theme",
        title: t.name,
        description: t.description || "Workspace theme",
        href: `/app/feedback?search=${encodeURIComponent(t.name)}`,
      })),
      settings: settingItems.map((s) => ({
        id: s.id,
        type: "setting",
        title: s.title,
        description: s.description,
        href: s.href,
      })),
      totalResults,
    };
  }
}

