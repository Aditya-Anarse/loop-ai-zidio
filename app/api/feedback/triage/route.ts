import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { DbService } from "@/lib/services/db-service";

export async function POST(request: Request) {
  try {
    // 1. Authenticate & Enforce Permissions
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized", data: null, errors: ["UNAUTHORIZED"] },
        { status: 401 }
      );
    }
    const { workspaceId, role } = session.user;

    if (role === "VIEWER") {
      return NextResponse.json(
        { success: false, message: "Permission Denied: Read-only access.", data: null, errors: ["FORBIDDEN"] },
        { status: 403 }
      );
    }

    // 2. Parse batch size limit parameters (max 10, default 5)
    let limit = 5;
    try {
      const body = await request.json();
      if (body.limit) {
        limit = Math.min(10, Math.max(1, parseInt(body.limit, 10)));
      }
    } catch {
      // Body may be empty, proceed with default limit
    }

    // Structured server-side logging
    console.log(
      JSON.stringify({
        event: "FEEDBACK_TRIAGE_BATCH_START",
        workspaceId,
        agentRole: role,
        limit,
        timestamp: new Date().toISOString(),
      })
    );

    const result = await DbService.triageBatchFeedbacks(workspaceId, limit);

    console.log(
      JSON.stringify({
        event: "FEEDBACK_TRIAGE_BATCH_END",
        workspaceId,
        processed: result.processed,
        remaining: result.remaining,
        timestamp: new Date().toISOString(),
      })
    );

    return NextResponse.json({
      success: true,
      message: "AI Triage batch processing completed.",
      data: result,
      errors: [],
    });
  } catch (error: any) {
    console.error("POST triage error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to triage feedback batch.", data: null, errors: ["SERVER_ERROR"] },
      { status: 500 }
    );
  }
}
