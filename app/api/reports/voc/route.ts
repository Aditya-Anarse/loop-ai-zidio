import { NextResponse } from "next/server";
import { requireApiWorkspaceContext, ApiAuthError, ApiForbiddenError } from "@/services/auth/authorization";
import { AiService } from "@/lib/services/ai-service";
import { DbService } from "@/lib/services/db-service";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    const { workspaceId, role } = await requireApiWorkspaceContext();

    if (role === "VIEWER") {
      return NextResponse.json(
        { error: "Permission Denied: Read-only access." },
        { status: 403 }
      );
    }

    // 1. Calculate real database figures
    const stats = await DbService.getOverviewStats(workspaceId);

    // 2. Fetch actual negative quotes
    const negativeFeedbacks = await prisma.feedback.findMany({
      where: { workspaceId, sentiment: "NEGATIVE" },
      select: { content: true },
      take: 5,
    });
    const quotes = negativeFeedbacks.map(f => f.content);
    const fallbackQuotes = quotes.length > 0 ? quotes : ["No major checkout flow complaints recorded yet."];

    // 3. Fetch top negative themes
    const negativeThemes = await DbService.getNegativeTopics(workspaceId, 3);
    const topThemes = negativeThemes.map(t => ({ name: t.name, count: t.count }));
    const fallbackThemes = topThemes.length > 0 ? topThemes : [{ name: "Performance", count: 1 }];

    // 4. Generate report narrative through Gemini AI based ONLY on the numbers above
    const narrative = await AiService.generateVoCReport(stats, fallbackQuotes, fallbackThemes);

    // 5. Save the report to database
    const reportTitle = `Voice-of-Customer Digest - ${new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })}`;

    const report = await prisma.report.create({
      data: {
        workspaceId,
        title: reportTitle,
        status: "READY",
        content: { text: narrative } as any,
        generatedAt: new Date(),
      },
    });

    console.log(
      JSON.stringify({
        event: "VOC_REPORT_GENERATED",
        workspaceId,
        reportId: report.id,
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
    console.error(
      JSON.stringify({
        event: "VOC_REPORT_GENERATED_ERROR",
        message: error.message || error,
        timestamp: new Date().toISOString(),
      })
    );
    return NextResponse.json(
      { error: error.message || "An unexpected error occurred." },
      { status: 500 }
    );
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

