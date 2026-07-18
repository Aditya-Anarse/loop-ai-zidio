import { PrismaClient, WorkspaceRole } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main(): Promise<void> {
  // 1. Create baseline workspace
  const workspace = await prisma.workspace.upsert({
    where: { slug: "loop-demo-workspace" },
    update: {},
    create: {
      name: "LOOP Demo Workspace",
      slug: "loop-demo-workspace",
    },
  });

  console.info(`Workspace checked: ${workspace.name} (${workspace.id})`);

  // 2. Hash default throwaway passwords
  const adminPasswordHash = bcrypt.hashSync("adminpassword123", 10);
  const analystPasswordHash = bcrypt.hashSync("analystpassword123", 10);
  const viewerPasswordHash = bcrypt.hashSync("viewerpassword123", 10);

  // 3. Create Admin user
  await prisma.user.upsert({
    where: { email: "admin@loop.com" },
    update: {
      password: adminPasswordHash,
      workspaceId: workspace.id,
      role: WorkspaceRole.ADMIN,
    },
    create: {
      email: "admin@loop.com",
      password: adminPasswordHash,
      fullName: "Default Admin",
      workspaceId: workspace.id,
      role: WorkspaceRole.ADMIN,
    },
  });

  // 4. Create Analyst user
  await prisma.user.upsert({
    where: { email: "analyst@loop.com" },
    update: {
      password: analystPasswordHash,
      workspaceId: workspace.id,
      role: WorkspaceRole.ANALYST,
    },
    create: {
      email: "analyst@loop.com",
      password: analystPasswordHash,
      fullName: "Default Analyst",
      workspaceId: workspace.id,
      role: WorkspaceRole.ANALYST,
    },
  });

  // 5. Create Viewer user
  await prisma.user.upsert({
    where: { email: "viewer@loop.com" },
    update: {
      password: viewerPasswordHash,
      workspaceId: workspace.id,
      role: WorkspaceRole.VIEWER,
    },
    create: {
      email: "viewer@loop.com",
      password: viewerPasswordHash,
      fullName: "Default Viewer",
      workspaceId: workspace.id,
      role: WorkspaceRole.VIEWER,
    },
  });

  console.info("Seeded Admin, Analyst, and Viewer test accounts successfully.");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
