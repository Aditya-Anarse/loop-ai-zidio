import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";
import { z } from "zod";

const registerSchema = z.object({
  fullName: z.string().trim().min(2).max(160),
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid inputs. Name, valid email, and password of at least 8 characters are required." },
        { status: 400 }
      );
    }

    const { fullName, email, password } = parsed.data;
    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create Workspace and Admin User in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Generate clean workspace slug
      const baseSlug = normalizedEmail.split("@")[0].replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      const slug = `${baseSlug}-${randomSuffix}`;

      const workspace = await tx.workspace.create({
        data: {
          name: `${fullName}'s Workspace`,
          slug,
        },
      });

      const user = await tx.user.create({
        data: {
          email: normalizedEmail,
          password: hashedPassword,
          fullName,
          role: "ADMIN",
          workspaceId: workspace.id,
        },
      });

      return { user, workspace };
    });

    return NextResponse.json(
      { success: true, message: "User registered successfully.", userId: result.user.id },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred during registration. Please try again." },
      { status: 500 }
    );
  }
}
