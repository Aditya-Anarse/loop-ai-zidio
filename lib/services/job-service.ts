import fs from "fs";
import path from "path";

export type TriageJobStatus = "CREATED" | "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED" | "CANCELLED";

export type TriageJobStage =
  | "Fetching feedback"
  | "Preparing AI context"
  | "Gemini analysis"
  | "Saving results"
  | "Completed";

export type TriageJobTelemetry = {
  modelName: string;
  processingTimeMs: number;
  retrievalTimeMs: number;
  geminiTimeMs: number;
  dbWriteTimeMs: number;
  apiCallCount: number;
  retryCount: number;
  estimatedTokens?: number;
};

export type FailedItemDetail = {
  id: string;
  customerName: string;
  errorMessage: string;
};

export type TriageJob = {
  id: string;
  workspaceId: string;
  userId: string;
  status: TriageJobStatus;
  stage: TriageJobStage;
  totalCount: number;
  processedCount: number;
  failedCount: number;
  remainingCount: number;
  startedAt: string;
  completedAt?: string;
  error?: string;
  failedItemIds?: string[];
  failedDetails?: FailedItemDetail[];
  telemetry?: TriageJobTelemetry;
};

const JOBS_FILE_PATH = path.join(process.cwd(), ".triage-jobs.json");

export class JobService {
  private static readJobsFile(): Record<string, TriageJob> {
    try {
      if (!fs.existsSync(JOBS_FILE_PATH)) {
        return {};
      }
      const raw = fs.readFileSync(JOBS_FILE_PATH, "utf-8");
      return JSON.parse(raw) || {};
    } catch (error) {
      console.error("[JobService] Error reading jobs file:", error);
      return {};
    }
  }

  private static writeJobsFile(jobs: Record<string, TriageJob>): void {
    try {
      fs.writeFileSync(JOBS_FILE_PATH, JSON.stringify(jobs, null, 2), "utf-8");
    } catch (error) {
      console.error("[JobService] Error writing jobs file:", error);
    }
  }

  static getJob(jobId: string): TriageJob | null {
    const jobs = this.readJobsFile();
    return jobs[jobId] || null;
  }

  static getActiveJobForWorkspace(workspaceId: string): TriageJob | null {
    const jobs = this.readJobsFile();
    const activeJobs = Object.values(jobs).filter(
      (job) =>
        job.workspaceId === workspaceId &&
        (job.status === "QUEUED" || job.status === "PROCESSING" || job.status === "CREATED")
    );

    if (activeJobs.length === 0) {
      // Check for most recent completed/failed job within last 10 seconds for smooth UI transition
      const recentJobs = Object.values(jobs)
        .filter((job) => job.workspaceId === workspaceId && job.completedAt)
        .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime());

      if (recentJobs.length > 0) {
        const timeDiffSec = (Date.now() - new Date(recentJobs[0].completedAt!).getTime()) / 1000;
        if (timeDiffSec <= 10) {
          return recentJobs[0];
        }
      }
      return null;
    }

    return activeJobs.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())[0];
  }

  static createJob(workspaceId: string, userId: string, totalCount: number): TriageJob {
    const jobs = this.readJobsFile();

    // Cancel any existing active jobs for this workspace
    Object.keys(jobs).forEach((key) => {
      if (
        jobs[key].workspaceId === workspaceId &&
        (jobs[key].status === "QUEUED" || jobs[key].status === "PROCESSING" || jobs[key].status === "CREATED")
      ) {
        jobs[key].status = "CANCELLED";
        jobs[key].completedAt = new Date().toISOString();
        jobs[key].error = "Superseded by new triage job request.";
      }
    });

    const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newJob: TriageJob = {
      id: jobId,
      workspaceId,
      userId,
      status: "QUEUED",
      stage: "Fetching feedback",
      totalCount,
      processedCount: 0,
      failedCount: 0,
      remainingCount: totalCount,
      startedAt: new Date().toISOString(),
      failedItemIds: [],
    };

    jobs[jobId] = newJob;
    this.writeJobsFile(jobs);
    return newJob;
  }

  static updateJobProgress(jobId: string, updates: Partial<TriageJob>): TriageJob | null {
    const jobs = this.readJobsFile();
    const job = jobs[jobId];
    if (!job) return null;

    const updatedJob: TriageJob = {
      ...job,
      ...updates,
      telemetry: updates.telemetry ? { ...(job.telemetry || {}), ...updates.telemetry } as any : job.telemetry,
    };

    if (updatedJob.status === "COMPLETED" || updatedJob.status === "FAILED" || updatedJob.status === "CANCELLED") {
      if (!updatedJob.completedAt) {
        updatedJob.completedAt = new Date().toISOString();
      }
    }

    jobs[jobId] = updatedJob;
    this.writeJobsFile(jobs);
    return updatedJob;
  }

  static cancelJob(jobId: string): TriageJob | null {
    return this.updateJobProgress(jobId, {
      status: "CANCELLED",
      completedAt: new Date().toISOString(),
      error: "User manually cancelled job execution.",
    });
  }
}
