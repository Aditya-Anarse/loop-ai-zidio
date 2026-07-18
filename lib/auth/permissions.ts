import { WorkspaceRole } from "@prisma/client";

const roleRank: Record<WorkspaceRole, number> = {
  VIEWER: 0,
  ANALYST: 1,
  ADMIN: 2,
};

export function hasMinimumRole(actual: WorkspaceRole, required: WorkspaceRole): boolean {
  return roleRank[actual] >= roleRank[required];
}
