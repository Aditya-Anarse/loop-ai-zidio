import { NextResponse } from "next/server";
import { requireApiWorkspaceContext, ApiAuthError, ApiForbiddenError } from "@/services/auth/authorization";
import { AiService } from "@/lib/services/ai-service";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    const { workspaceId } = await requireApiWorkspaceContext();

    // Fetch the 15 most recent feedbacks to perform theme clustering on
    const feedbacks = await prisma.feedback.findMany({
      where: { workspaceId },
      orderBy: { submittedAt: "desc" },
      take: 15,
      select: { content: true },
    });

    if (feedbacks.length === 0) {
      return NextResponse.json({ themes: [] });
    }

    const texts = feedbacks.map(f => f.content);
    const themes = await AiService.clusterThemes(texts);

    return NextResponse.json({ success: true, themes });
  } catch (error: any) {
    if (error instanceof ApiAuthError) {
      console.warn(
        JSON.stringify({
          event: "API_AUTH_FAILURE",
          api: "POST /api/feedback/cluster",
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
          api: "POST /api/feedback/cluster",
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
        api: "POST /api/feedback/cluster",
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

