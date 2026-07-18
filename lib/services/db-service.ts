import { prisma } from "@/lib/prisma";
import { FeedbackSource, Sentiment, WorkspaceRole, ReportStatus, Prisma } from "@prisma/client";
import { AiService } from "./ai-service";

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
};

export class DbService {
  /**
   * Ingest a single feedback item and run transaction checks
   */
  static async ingestFeedback(workspaceId: string, input: IngestFeedbackInput, creatorName = "System Ingestion") {
    return await prisma.$transaction(async (tx) => {
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
        confidence: input.confidence !== undefined ? input.confidence : 0.85,
        promptVersion: input.promptVersion || "v1.0",
        modelVersion: input.modelVersion || "unknown",
        timeline: [
          {
            type: "CREATED",
            user: creatorName,
            timestamp: new Date().toISOString(),
            description: "Feedback logged in system.",
          },
        ],
      };

      // 2. Create the Feedback record
      const feedback = await tx.feedback.create({
        data: {
          workspaceId,
          content: input.content,
          source: input.source,
          sentiment: input.sentiment || null, // null indicates unclassified / queued
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
   * Batch triage queue processor. Avoids Claude API duplicate requests.
   */
  static async triageBatchFeedbacks(workspaceId: string, limit = 5) {
    const unclassified = await prisma.feedback.findMany({
      where: {
        workspaceId,
        sentiment: null,
      },
      take: limit,
    });

    if (unclassified.length === 0) {
      return { processed: 0, remaining: 0 };
    }

    let processedCount = 0;

    for (const item of unclassified) {
      const currentMeta = item.metadata as Record<string, any>;

      // Move queue state to processing
      await prisma.feedback.update({
        where: { id: item.id },
        data: {
          metadata: {
            ...currentMeta,
            triageState: "PROCESSING",
          } as any,
        },
      });

      try {
        // A. Deduplication check: check if same content already exists
        const duplicate = await prisma.feedback.findFirst({
          where: {
            workspaceId,
            content: { equals: item.content, mode: "insensitive" },
            sentiment: { not: null },
          },
          select: {
            sentiment: true,
            metadata: true,
          },
        });

        let result;
        let reused = false;

        if (duplicate) {
          const dupMeta = duplicate.metadata as Record<string, any>;
          result = {
            sentiment: duplicate.sentiment as Sentiment,
            score: dupMeta.score || 5,
            theme: dupMeta.theme || "General Feedback",
            area: dupMeta.area || "General",
            summary: dupMeta.summary || "Reused classification details.",
            priority: dupMeta.priority || "MEDIUM",
            confidence: dupMeta.confidence || 0.95,
            promptVersion: dupMeta.promptVersion || "v1.1",
            modelVersion: dupMeta.modelVersion || "reused-dedup",
          };
          reused = true;
        } else {
          result = await AiService.classifyFeedback(item.content);
        }

        const timeline = [...(currentMeta.timeline || [])];
        timeline.push({
          type: "AI_CLASSIFIED",
          user: "Claude AI Processor",
          timestamp: new Date().toISOString(),
          description: reused
            ? "Reused classification from duplicate item."
            : `Auto-classified (Score: ${result.score}, Priority: ${result.priority}, Confidence: ${Math.round(result.confidence * 100)}%)`,
        });

        const updatedMetadata = {
          ...currentMeta,
          score: result.score,
          area: result.area,
          theme: result.theme,
          priority: result.priority,
          confidence: result.confidence,
          promptVersion: result.promptVersion,
          modelVersion: result.modelVersion,
          triageState: "COMPLETED",
          status: currentMeta.status || "NEW",
          timeline,
        };

        await prisma.$transaction(async (tx) => {
          await tx.feedback.update({
            where: { id: item.id },
            data: {
              sentiment: result.sentiment as Sentiment,
              metadata: updatedMetadata as any,
            },
          });

          // Link themes dynamically
          const normalizedThemeName = result.theme.trim();
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

          const existingLink = await tx.feedbackTheme.findUnique({
            where: {
              feedbackId_themeId: {
                feedbackId: item.id,
                themeId: theme.id,
              },
            },
          });

          if (!existingLink) {
            await tx.feedbackTheme.create({
              data: {
                feedbackId: item.id,
                themeId: theme.id,
              },
            });
          }
        });

        processedCount++;
      } catch (err) {
        console.error(`Batch triage item processing failure for feedback ID ${item.id}:`, err);
        await prisma.feedback.update({
          where: { id: item.id },
          data: {
            metadata: {
              ...currentMeta,
              triageState: "FAILED",
            } as any,
          },
        });
      }
    }

    const remainingCount = await prisma.feedback.count({
      where: {
        workspaceId,
        sentiment: null,
      },
    });

    return { processed: processedCount, remaining: remainingCount };
  }

  /**
   * Get overview dashboard stats
   */
  static async getOverviewStats(workspaceId: string) {
    const totalCount = await prisma.feedback.count({ where: { workspaceId } });

    const positiveCount = await prisma.feedback.count({
      where: { workspaceId, sentiment: "POSITIVE" },
    });
    const neutralCount = await prisma.feedback.count({
      where: { workspaceId, sentiment: "NEUTRAL" },
    });
    const avgSentiment = totalCount > 0 ? Math.round(((positiveCount + neutralCount * 0.5) / totalCount) * 100) : 0;

    const feedbacks = await prisma.feedback.findMany({
      where: { workspaceId },
      select: { source: true, sentiment: true, metadata: true, submittedAt: true },
    });
    const openIssues = feedbacks.filter((f: any) => {
      const meta = f.metadata as Record<string, any>;
      return !meta.status || meta.status === "NEW";
    }).length;

    const churnRiskCount = feedbacks.filter((f: any) => {
      const meta = f.metadata as Record<string, any>;
      return meta.customerLabel === "churn_risk";
    }).length;

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
      const date = new Date(f.submittedAt);
      const m = date.getMonth();
      const y = date.getFullYear();

      if (m === currentMonth && y === currentYear) {
        currentMonthVolume += 1;
        if (f.sentiment === "POSITIVE") currentMonthPositive += 1;
      } else if (m === lastMonth && y === lastMonthYear) {
        lastMonthVolume += 1;
        if (f.sentiment === "POSITIVE") lastMonthPositive += 1;
      }
    });

    const volumeMoM = lastMonthVolume > 0 
      ? Math.round(((currentMonthVolume - lastMonthVolume) / lastMonthVolume) * 100) 
      : 0;

    const currentSentimentPct = currentMonthVolume > 0 ? Math.round((currentMonthPositive / currentMonthVolume) * 100) : 0;
    const lastSentimentPct = lastMonthVolume > 0 ? Math.round((lastMonthPositive / lastMonthVolume) * 100) : 0;
    const sentimentMoM = currentSentimentPct - lastSentimentPct;

    return {
      totalFeedback: totalCount,
      avgSentiment: `${avgSentiment}%`,
      openIssues,
      churnRisk: `${totalCount > 0 ? Math.round((churnRiskCount / totalCount) * 1000) / 10 : 0}%`,
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
   * Get top topics driving negative feedback
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

    const topicStats = themes
      .map((t) => {
        const negativeFeedbacks = t.feedback.filter((ft) => ft.feedback.sentiment === "NEGATIVE").length;
        const totalFeedbacks = t.feedback.length;
        const ratio = totalFeedbacks > 0 ? Math.round((negativeFeedbacks / totalFeedbacks) * 100) : 0;
        return {
          name: t.name,
          ratio,
          count: negativeFeedbacks,
        };
      })
      .filter((t) => t.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);

    return topicStats;
  }

  /**
   * Get volume & sentiment charts data
   */
  static async getAnalyticsCharts(workspaceId: string) {
    const feedbacks = await prisma.feedback.findMany({
      where: { workspaceId },
      select: { sentiment: true, submittedAt: true },
      orderBy: { submittedAt: "asc" },
    });

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthlyStats: Record<string, { name: string; count: number; positive: number }> = {};

    feedbacks.forEach((f) => {
      const monthIndex = new Date(f.submittedAt).getMonth();
      const monthName = months[monthIndex];
      if (!monthlyStats[monthName]) {
        monthlyStats[monthName] = { name: monthName, count: 0, positive: 0 };
      }
      monthlyStats[monthName].count += 1;
      if (f.sentiment === "POSITIVE") {
        monthlyStats[monthName].positive += 1;
      }
    });

    const data = Object.values(monthlyStats);
    return data.length > 0 ? data : [{ name: "Jul", count: 12, positive: 8 }];
  }
}
