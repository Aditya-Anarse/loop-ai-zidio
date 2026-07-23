import { NextResponse } from "next/server";
import { requireApiWorkspaceContext, ApiAuthError, ApiForbiddenError } from "@/services/auth/authorization";
import { AiService } from "@/lib/services/ai-service";
import { DbService } from "@/lib/services/db-service";
import { prisma } from "@/lib/prisma";
import { AI_CONFIG } from "@/lib/services/ai-config";

export async function POST(request: Request) {
  const url = new URL(request.url);
  const reportId = url.searchParams.get("reportId") || undefined;
  
  let workspaceId = "";
  let role = "";
  
  try {
    const authContext = await requireApiWorkspaceContext();
    workspaceId = authContext.workspaceId;
    role = authContext.role;

    // Log API request received
    console.log(
      JSON.stringify({
        event: "VOC_REPORT_REQUEST_RECEIVED",
        workspaceId,
        reportId,
        timestamp: new Date().toISOString(),
      })
    );

    if (role === "VIEWER") {
      return NextResponse.json(
        { error: "Permission Denied: Read-only access." },
        { status: 403 }
      );
    }

    // 1. Calculate database stats
    const stats = await DbService.getOverviewStats(workspaceId);

    // 2. Check if there are any feedbacks in the database
    if (stats.totalFeedback === 0) {
      console.log(
        JSON.stringify({
          event: "VOC_REPORT_EMPTY_WORKSPACE",
          workspaceId,
          timestamp: new Date().toISOString(),
        })
      );
      
      const failedContent = {
        text: "No feedback data available to generate insights.",
        errorType: "NO_FEEDBACK",
        errorMessage: "No feedback data available to generate insights.",
      };

      const reportTitle = `Voice-of-Customer Digest - ${new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })}`;

      let report;
      if (reportId) {
        report = await prisma.report.update({
          where: { id: reportId, workspaceId },
          data: {
            status: "FAILED",
            content: failedContent as any,
            generatedAt: new Date(),
          },
        });
      } else {
        report = await prisma.report.create({
          data: {
            workspaceId,
            title: reportTitle,
            status: "FAILED",
            content: failedContent as any,
            generatedAt: new Date(),
          },
        });
      }

      return NextResponse.json({ success: true, report });
    }

    // 3. Fetch up to 50 feedbacks, and deduplicate them in-memory
    const feedbacks = await prisma.feedback.findMany({
      where: { workspaceId },
      orderBy: { submittedAt: "desc" },
      take: 50,
      select: { content: true, sentiment: true, source: true },
    });

    const seen = new Set<string>();
    const uniqueFeedbacks: Array<{ content: string; sentiment: string; source: string }> = [];
    for (const f of feedbacks) {
      const contentTrimmed = f.content.trim().toLowerCase();
      if (!seen.has(contentTrimmed)) {
        seen.add(contentTrimmed);
        uniqueFeedbacks.push({
          content: f.content,
          sentiment: f.sentiment || "NEUTRAL",
          source: f.source,
        });
      }
    }

    console.log(
      JSON.stringify({
        event: "VOC_FEEDBACK_RETRIEVED",
        workspaceId,
        retrievedCount: feedbacks.length,
        uniqueCount: uniqueFeedbacks.length,
        timestamp: new Date().toISOString(),
      })
    );

    // If all feedbacks were somehow filtered out
    if (uniqueFeedbacks.length === 0) {
      const failedContent = {
        text: "No feedback data available to generate insights.",
        errorType: "NO_FEEDBACK",
        errorMessage: "No unique feedback data available to generate insights.",
      };

      const reportTitle = `Voice-of-Customer Digest - ${new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })}`;

      let report;
      if (reportId) {
        report = await prisma.report.update({
          where: { id: reportId, workspaceId },
          data: {
            status: "FAILED",
            content: failedContent as any,
            generatedAt: new Date(),
          },
        });
      } else {
        report = await prisma.report.create({
          data: {
            workspaceId,
            title: reportTitle,
            status: "FAILED",
            content: failedContent as any,
            generatedAt: new Date(),
          },
        });
      }

      return NextResponse.json({ success: true, report });
    }

    // Log Gemini execution intent
    console.log(
      JSON.stringify({
        event: "VOC_GEMINI_CALL_START",
        workspaceId,
        model: AI_CONFIG.model,
        provider: AI_CONFIG.provider,
        timestamp: new Date().toISOString(),
      })
    );

    // 4. Generate VoC Report Structured JSON via Gemini AI
    const result = await AiService.generateVoCReport(stats, uniqueFeedbacks);

    // Log raw Gemini success metadata
    console.log(
      JSON.stringify({
        event: "VOC_GEMINI_CALL_SUCCESS",
        workspaceId,
        confidence: result.confidence,
        processingTimeMs: result.processingTime,
        timestamp: new Date().toISOString(),
      })
    );

    // 5. Generate formatted Markdown text for the frontend renderer
    const markdownText = `## Executive Summary
${result.summary}

## Sentiment Analysis
Average Customer Sentiment: ${stats.avgSentiment}
Overall Tone: ${result.overall_sentiment}
Customer Satisfaction Level: ${result.customer_satisfaction}

## Top Customer Pain Points
${result.top_themes.map((t: string) => `- ${t}`).join("\n")}

## Positive Highlights
${result.positive_highlights.map((h: string) => `- ${h}`).join("\n")}

## Negative Trends
${result.negative_issues.map((i: string) => `- ${i}`).join("\n")}

## Most Requested Features
${result.customer_requests.map((r: string) => `- ${r}`).join("\n")}

## Recommended Product Actions
${result.recommended_actions.map((a: string) => `- ${a}`).join("\n")}`;

    const reportContent = {
      text: markdownText,
      summary: result.summary,
      overall_sentiment: result.overall_sentiment,
      customer_satisfaction: result.customer_satisfaction,
      top_themes: result.top_themes,
      positive_highlights: result.positive_highlights,
      negative_issues: result.negative_issues,
      customer_requests: result.customer_requests,
      recommended_actions: result.recommended_actions,
      confidence: result.confidence,
      metadata: {
        provider: AI_CONFIG.provider,
        modelName: AI_CONFIG.model,
        processingTime: result.processingTime,
        generatedTimestamp: new Date().toISOString(),
        feedbackAnalyzed: result.analyzedCount,
      },
    };

    const reportTitle = `Voice-of-Customer Digest - ${new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })}`;

    let report;
    if (reportId) {
      report = await prisma.report.update({
        where: { id: reportId, workspaceId },
        data: {
          status: "READY",
          content: reportContent as any,
          generatedAt: new Date(),
        },
      });
    } else {
      report = await prisma.report.create({
        data: {
          workspaceId,
          title: reportTitle,
          status: "READY",
          content: reportContent as any,
          generatedAt: new Date(),
        },
      });
    }

    console.log(
      JSON.stringify({
        event: "VOC_REPORT_GENERATED",
        workspaceId,
        reportId: report.id,
        status: report.status,
        timestamp: new Date().toISOString(),
      })
    );

    return NextResponse.json({ success: true, report });
  } catch (error: any) {
    if (error instanceof ApiAuthError) {
      console.warn(
        JSON.stringify({
          event: "API_AUTH_FAILURE",
          api: "POST /api/reports/voc",
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
          api: "POST /api/reports/voc",
          message: error.message,
          timestamp: new Date().toISOString(),
        })
      );
      return NextResponse.json(
        { success: false, message: "Forbidden", data: null, errors: ["FORBIDDEN"] },
        { status: 403 }
      );
    }

    // Determine error details
    const isQuotaExceeded = error?.status === 429 || String(error.message).includes("429") || String(error.message).includes("quota");
    const errorType = isQuotaExceeded ? "GEMINI_QUOTA_EXCEEDED" : "GENERATION_FAILED";
    const errorMessage = error.message || String(error);

    console.error(
      JSON.stringify({
        event: "VOC_REPORT_GENERATION_FAILURE",
        workspaceId,
        reportId,
        errorType,
        errorMessage,
        timestamp: new Date().toISOString(),
      })
    );

    // Save failed report inside the DB
    try {
      const failedContent = {
        text: "An error occurred while compiling Voice-of-Customer narrative.",
        errorType,
        errorMessage,
      };

      const reportTitle = `Voice-of-Customer Digest - ${new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })}`;

      let report;
      if (reportId && workspaceId) {
        report = await prisma.report.update({
          where: { id: reportId, workspaceId },
          data: {
            status: "FAILED",
            content: failedContent as any,
            generatedAt: new Date(),
          },
        });
      } else if (workspaceId) {
        report = await prisma.report.create({
          data: {
            workspaceId,
            title: reportTitle,
            status: "FAILED",
            content: failedContent as any,
            generatedAt: new Date(),
          },
        });
      }

      console.log(
        JSON.stringify({
          event: "VOC_REPORT_FAILED_STATE_SAVED",
          workspaceId,
          reportId: report?.id,
          timestamp: new Date().toISOString(),
        })
      );

      return NextResponse.json({ success: true, report });
    } catch (dbErr: any) {
      console.error(
        JSON.stringify({
          event: "VOC_REPORT_FAILED_SAVE_DB_ERROR",
          workspaceId,
          message: dbErr.message || dbErr,
          timestamp: new Date().toISOString(),
        })
      );
      // Fallback response if DB insert of failed state also fails
      return NextResponse.json(
        { error: error.message || "An unexpected error occurred." },
        { status: 500 }
      );
    }
  }
}

export async function GET() {
  try {
    const { workspaceId } = await requireApiWorkspaceContext();

    const reports = await prisma.report.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, reports });
  } catch (error: any) {
    if (error instanceof ApiAuthError) {
      console.warn(
        JSON.stringify({
          event: "API_AUTH_FAILURE",
          api: "GET /api/reports/voc",
          message: error.message,
          timestamp: new Date().toISOString(),
        })
      );
      return NextResponse.json(
        { success: false, message: "Unauthorized", data: null, errors: ["UNAUTHORIZED"] },
        { status: 401 }
      );
    }
    console.error(
      JSON.stringify({
        event: "VOC_REPORT_GET_ERROR",
        message: error.message || error,
        timestamp: new Date().toISOString(),
      })
    );
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { workspaceId, role } = await requireApiWorkspaceContext();

    if (role === "VIEWER") {
      return NextResponse.json(
        { error: "Permission Denied: Read-only access." },
        { status: 403 }
      );
    }

    const url = new URL(request.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Missing report ID." },
        { status: 400 }
      );
    }

    const report = await prisma.report.findFirst({
      where: { id, workspaceId },
    });

    if (!report) {
      return NextResponse.json(
        { error: "Report not found or access denied." },
        { status: 404 }
      );
    }

    await prisma.report.delete({
      where: { id },
    });

    console.log(
      JSON.stringify({
        event: "VOC_REPORT_DELETED",
        workspaceId,
        reportId: id,
        timestamp: new Date().toISOString(),
      })
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error(
      JSON.stringify({
        event: "VOC_REPORT_DELETE_ERROR",
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
