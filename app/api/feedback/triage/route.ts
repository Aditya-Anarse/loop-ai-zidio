import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { DbService } from "@/lib/services/db-service";
import { JobService } from "@/lib/services/job-service";

/**
 * GET /api/feedback/triage
 * Query current active job status or specific jobId details for real-time UI polling
 */
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized", data: null, errors: ["UNAUTHORIZED"] },
        { status: 401 }
      );
    }
    const { workspaceId } = session.user;
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("jobId");

    let job = null;
    if (jobId) {
      job = JobService.getJob(jobId);
      if (job && job.workspaceId !== workspaceId) {
        return NextResponse.json(
          { success: false, message: "Forbidden: Job belongs to another workspace.", data: null, errors: ["FORBIDDEN"] },
          { status: 403 }
        );
      }
    } else {
      job = JobService.getActiveJobForWorkspace(workspaceId);
    }

    const unclassifiedCount = await DbService.getUnclassifiedCount(workspaceId);

    return NextResponse.json({
      success: true,
      data: {
        activeJob: job,
        unclassifiedCount,
      },
    });
  } catch (error: any) {
    console.error("GET triage status error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to retrieve triage status.", data: null, errors: ["SERVER_ERROR"] },
      { status: 500 }
    );
  }
}

/**
 * POST /api/feedback/triage
 * Starts a non-blocking background AI triage job, retries failed items, or cancels active job
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized", data: null, errors: ["UNAUTHORIZED"] },
        { status: 401 }
      );
    }
    const { workspaceId, role, id: userId } = session.user;

    if (role === "VIEWER") {
      return NextResponse.json(
        { success: false, message: "Permission Denied: Read-only access.", data: null, errors: ["FORBIDDEN"] },
        { status: 403 }
      );
    }

    let limit = 50;
    let action = "start";
    let jobId: string | undefined = undefined;

    try {
      const body = await request.json();
      if (body.limit) {
        limit = Math.min(200, Math.max(1, parseInt(body.limit, 10)));
      }
      if (body.action) {
        action = String(body.action).toLowerCase();
      }
      if (body.jobId) {
        jobId = String(body.jobId);
      }
    } catch {
      // Body may be empty, proceed with defaults
    }

    // Handle job cancellation
    if (action === "cancel" && jobId) {
      const targetJob = JobService.getJob(jobId);
      if (targetJob && targetJob.workspaceId !== workspaceId) {
        return NextResponse.json(
          { success: false, message: "Forbidden: Job belongs to another workspace.", data: null, errors: ["FORBIDDEN"] },
          { status: 403 }
        );
      }
      const cancelledJob = JobService.cancelJob(jobId);
      return NextResponse.json({
        success: true,
        message: "AI Triage job cancelled.",
        data: cancelledJob,
      });
    }

    const unclassifiedCount = await DbService.getUnclassifiedCount(workspaceId);

    if (unclassifiedCount === 0 && action !== "retry_failed") {
      return NextResponse.json({
        success: true,
        message: "No feedback available for analysis.",
        data: { processed: 0, remaining: 0, totalInQueue: 0 },
      });
    }

    // Create persistent triage job record
    const job = JobService.createJob(workspaceId, userId, unclassifiedCount);

    console.log(
      JSON.stringify({
        event: "FEEDBACK_TRIAGE_JOB_START",
        jobId: job.id,
        workspaceId,
        userId,
        limit,
        action,
        timestamp: new Date().toISOString(),
      })
    );

    // Launch background asynchronous processing (non-blocking)
    DbService.triageBatchFeedbacks(workspaceId, limit, job.id, action === "retry_failed")
      .then((result) => {
        console.log(
          JSON.stringify({
            event: "FEEDBACK_TRIAGE_JOB_END",
            jobId: job.id,
            workspaceId,
            processed: result.processed,
            failed: result.failed,
            remaining: result.remaining,
            telemetry: result.telemetry,
            timestamp: new Date().toISOString(),
          })
        );
      })
      .catch((err) => {
        console.error(`[Background Triage Error - Job ${job.id}]:`, err);
        JobService.updateJobProgress(job.id, {
          status: "FAILED",
          stage: "Completed",
          error: err?.message || "Gemini service temporarily unavailable. Retry in a few seconds.",
        });
      });

    // Return 202 Accepted immediately
    return NextResponse.json(
      {
        success: true,
        message: "AI Triage started in background.",
        data: job,
        errors: [],
      },
      { status: 202 }
    );
  } catch (error: any) {
    console.error("POST triage error:", error);
    return NextResponse.json(
      { success: false, message: "Gemini service temporarily unavailable. Retry in a few seconds.", data: null, errors: ["SERVER_ERROR"] },
      { status: 500 }
    );
  }
}
