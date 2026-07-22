import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { DbService } from "@/lib/services/db-service";

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
    const url = new URL(request.url);
    const query = url.searchParams.get("q") || url.searchParams.get("query") || "";

    const searchResults = await DbService.globalSearch(workspaceId, query);

    return NextResponse.json({
      success: true,
      message: "Search query executed successfully.",
      data: searchResults,
      errors: [],
    });
  } catch (error: any) {
    console.error("GET /api/search error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to perform global search.",
        data: null,
        errors: [error.message || "SERVER_ERROR"],
      },
      { status: 500 }
    );
  }
}
