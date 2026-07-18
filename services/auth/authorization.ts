import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { WorkspaceRole } from "@prisma/client";
import { hasMinimumRole } from "@/lib/auth/permissions";

export type WorkspaceContext = { userId: string; workspaceId: string; role: WorkspaceRole };

export class ApiAuthError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "ApiAuthError";
  }
}

export class ApiForbiddenError extends Error {
  constructor(message = "Forbidden") {
    super(message);
    this.name = "ApiForbiddenError";
  }
}

export async function requireWorkspaceContext(): Promise<WorkspaceContext> {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    redirect("/login");
  }
  return {
    userId: session.user.id,
    workspaceId: session.user.workspaceId,
    role: session.user.role,
  };
}

export async function requireWorkspaceRole(required: WorkspaceRole): Promise<WorkspaceContext> {
  const context = await requireWorkspaceContext();
  if (!hasMinimumRole(context.role, required)) {
    throw new Error("Insufficient workspace permissions.");
  }
  return context;
}

export async function requireApiWorkspaceContext(): Promise<WorkspaceContext> {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    throw new ApiAuthError("Unauthorized");
  }
  return {
    userId: session.user.id,
    workspaceId: session.user.workspaceId,
    role: session.user.role,
  };
}

export async function requireApiWorkspaceRole(required: WorkspaceRole): Promise<WorkspaceContext> {
  const context = await requireApiWorkspaceContext();
  if (!hasMinimumRole(context.role, required)) {
    throw new ApiForbiddenError("Forbidden");
  }
  return context;
}

