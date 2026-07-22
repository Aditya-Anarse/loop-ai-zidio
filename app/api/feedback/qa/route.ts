import { NextResponse } from "next/server";
import { requireApiWorkspaceContext, ApiAuthError, ApiForbiddenError } from "@/services/auth/authorization";
import { AiService } from "@/lib/services/ai-service";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    // 1. Enforce Server-Side Auth/Tenant Isolation
    const { workspaceId } = await requireApiWorkspaceContext();

    const body = await request.json();
    const { query } = body;

    if (!query) {
      return NextResponse.json(
        { error: "Query parameter is required." },
        { status: 400 }
      );
    }

    // 2. Keyword-based Retrieval (RAG) within the tenant boundary
    const searchWords = query
      .split(" ")
      .map((w: string) => w.trim())
      .filter((w: string) => w.length > 2);

    let retrievedFeedbacks: any[] = [];

    if (searchWords.length > 0) {
      retrievedFeedbacks = await prisma.feedback.findMany({
        where: {
          workspaceId,
          OR: [
            { content: { contains: query, mode: "insensitive" } },
            ...(searchWords.map((word: string) => ({
              content: { contains: word, mode: "insensitive" },
            }))),
          ],
          sentiment: { not: null }, // Only retrieve classified feedbacks
        },
        take: 6,
      });
    }

    // Structured server-side logging
    console.log(
      JSON.stringify({
        event: "ASK_LOOP_QUERY",
        workspaceId,
        query,
        foundMatches: retrievedFeedbacks.length,
        timestamp: new Date().toISOString(),
      })
    );

    // 3. Feed retrieved items as context to Gemini AI for grounded answer
    const answer = await AiService.groundedQnA(query, retrievedFeedbacks);

    return NextResponse.json({
      success: true,
      answer,
      sources: retrievedFeedbacks.map((f: any) => ({
        id: f.id,
        customerName: f.metadata.customerName || "Anonymous",
        customerEmail: f.metadata.customerEmail || "anonymous@company.com",
        sentiment: f.sentiment,
      })),
    });
  } catch (error: any) {
    if (error instanceof ApiAuthError) {
      console.warn(
        JSON.stringify({
          event: "API_AUTH_FAILURE",
          api: "POST /api/feedback/qa",
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
          api: "POST /api/feedback/qa",
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
        api: "POST /api/feedback/qa",
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

