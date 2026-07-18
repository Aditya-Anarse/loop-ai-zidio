import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";
import { WorkspaceRole } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      role: WorkspaceRole;
      workspaceId: string;
    };
  }

  interface User {
    id: string;
    email: string;
    name?: string | null;
    role: WorkspaceRole;
    workspaceId: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: WorkspaceRole;
    workspaceId: string;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Missing credentials.");
        }

        const email = credentials.email.toLowerCase().trim();
        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user) {
          console.warn(
            JSON.stringify({
              event: "AUTH_FAILURE",
              email,
              reason: "No user found with this email",
              timestamp: new Date().toISOString(),
            })
          );
          throw new Error("No user found with this email.");
        }

        const isPasswordCorrect = bcrypt.compareSync(credentials.password, user.password);
        if (!isPasswordCorrect) {
          console.warn(
            JSON.stringify({
              event: "AUTH_FAILURE",
              email,
              reason: "Incorrect password",
              timestamp: new Date().toISOString(),
            })
          );
          throw new Error("Incorrect password.");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.fullName,
          role: user.role,
          workspaceId: user.workspaceId,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.workspaceId = user.workspaceId;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.workspaceId = token.workspaceId;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    signOut: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
};
