import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { DbService } from "@/lib/services/db-service";
import {
  feedbackQuerySchema,
  feedbackUpdateSchema,
  csvRowSchema,
} from "@/lib/validation";

export async function GET(request: Request) {
  try {
    // 1. Authenticate & Resolve Workspace Context
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized", data: null, errors: ["UNAUTHORIZED"] },
        { status: 401 }
      );
    }
    const { workspaceId } = session.user;

    // 2. Parse & Validate URL filters using Zod
    const url = new URL(request.url);
    const queryObj: Record<string, string> = {};
    url.searchParams.forEach((value, key) => {
      queryObj[key] = value;
    });

    const validation = feedbackQuerySchema.safeParse(queryObj);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, message: "Invalid query filters.", data: null, errors: validation.error.errors },
        { status: 400 }
      );
    }

    // Structured server-side logging
    console.log(
      JSON.stringify({
        event: "FEEDBACK_QUERY",
        workspaceId,
        filters: {
          sentiment: validation.data.sentiment,
          source: validation.data.source,
          status: validation.data.status,
          dateRange: validation.data.dateRange,
          page: validation.data.page,
          pageSize: validation.data.pageSize,
        },
        timestamp: new Date().toISOString(),
      })
    );

    const result = await DbService.getFeedbackInbox(workspaceId, validation.data);
    const unclassifiedCount = await DbService.getUnclassifiedCount(workspaceId);

    return NextResponse.json({
      success: true,
      message: "Feedback inbox records retrieved.",
      data: {
        ...result,
        unclassifiedCount,
      },
      errors: [],
    });
  } catch (error: any) {
    console.error(
      JSON.stringify({
        event: "API_ERROR",
        api: "GET /api/feedback",
        error: error.message || error,
        timestamp: new Date().toISOString(),
      })
    );
    return NextResponse.json(
      { success: false, message: "Failed to query feedback records.", data: null, errors: ["SERVER_ERROR"] },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    // 1. Authenticate & Enforce Permissions
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized", data: null, errors: ["UNAUTHORIZED"] },
        { status: 401 }
      );
    }
    const { workspaceId, role, name: userName } = session.user;

    if (role === "VIEWER") {
      return NextResponse.json(
        { success: false, message: "Permission Denied: Read-only access.", data: null, errors: ["FORBIDDEN"] },
        { status: 403 }
      );
    }

    // 2. Validate update parameters via Zod
    const body = await request.json();
    const { feedbackId } = body;
    if (!feedbackId) {
      return NextResponse.json(
        { success: false, message: "feedbackId parameter is required.", data: null, errors: ["MISSING_ID"] },
        { status: 400 }
      );
    }

    const validation = feedbackUpdateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, message: "Input validation failed.", data: null, errors: validation.error.errors },
        { status: 400 }
      );
    }

    // Structured server-side logging
    console.log(
      JSON.stringify({
        event: "FEEDBACK_UPDATE",
        workspaceId,
        agentRole: role,
        feedbackId,
        updatedFields: Object.keys(validation.data),
        timestamp: new Date().toISOString(),
      })
    );

    const updated = await DbService.updateFeedback(workspaceId, feedbackId, {
      ...validation.data,
      editingUser: userName || "Agent",
    });

    return NextResponse.json({
      success: true,
      message: "Feedback updated successfully.",
      data: updated,
      errors: [],
    });
  } catch (error: any) {
    console.error(
      JSON.stringify({
        event: "API_ERROR",
        api: "PUT /api/feedback",
        error: error.message || error,
        timestamp: new Date().toISOString(),
      })
    );
    return NextResponse.json(
      { success: false, message: "Failed to update feedback details.", data: null, errors: ["SERVER_ERROR"] },
      { status: 500 }
    );
  }
}

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
    const { workspaceId, role, name: userName } = session.user;

    if (role === "VIEWER") {
      return NextResponse.json(
        { success: false, message: "Permission Denied: Read-only access.", data: null, errors: ["FORBIDDEN"] },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Check if this is a structural validation log request
    if (body && typeof body.logValidationError === "string") {
      console.error(
        JSON.stringify({
          event: "CLIENT_CSV_VALIDATION_ERROR",
          workspaceId,
          role,
          error: body.logValidationError,
          timestamp: new Date().toISOString(),
        })
      );
      return NextResponse.json({ success: true, message: "Client error logged successfully." });
    }

    const { items } = body;

    if (!Array.isArray(items)) {
      return NextResponse.json(
        { success: false, message: "Invalid payload layout. Expected { items: [...] }.", data: null, errors: ["BAD_REQUEST"] },
        { status: 400 }
      );
    }

    // Max limit validations: Limit uploads to 500 items to avoid network stress
    if (items.length > 500) {
      return NextResponse.json(
        { success: false, message: "Upload limit exceeded. Maximum size is 500 rows.", data: null, errors: ["LIMIT_EXCEEDED"] },
        { status: 400 }
      );
    }

    const errors: { row: number; message: string }[] = [];
    const validItems: any[] = [];
    const seenRecords = new Set<string>();

    // 2. Validate each CSV row using Zod
    for (let i = 0; i < items.length; i++) {
      const rowNum = i + 1;
      const rawRow = items[i];

      const validation = csvRowSchema.safeParse(rawRow);
      if (!validation.success) {
        const errorMsgs = validation.error.errors.map(err => `${err.path.join(".")}: ${err.message}`).join("; ");
        errors.push({ row: rowNum, message: errorMsgs });
        continue;
      }

      // Check duplicates inside the upload dataset
      const uniqueKey = `${validation.data.content.trim().toLowerCase()}-${(validation.data.customerEmail || "").trim().toLowerCase()}`;
      if (seenRecords.has(uniqueKey)) {
        errors.push({ row: rowNum, message: "Duplicate content text found inside file." });
        continue;
      }
      seenRecords.add(uniqueKey);

      const parsedTags = validation.data.tags
        ? validation.data.tags.split(",").map((t: string) => t.trim()).filter((t: string) => t.length > 0)
        : [];

      validItems.push({
        content: validation.data.content,
        source: validation.data.source,
        customerName: validation.data.customerName,
        customerEmail: validation.data.customerEmail,
        customerLabel: validation.data.customerLabel,
        tags: parsedTags,
        submittedAt: validation.data.submittedAt,
      });
    }

    // 3. Save valid records scoped to workspaceId
    const importedResults = [];
    for (const item of validItems) {
      const created = await DbService.ingestFeedback(workspaceId, {
        content: item.content,
        source: item.source,
        customerName: item.customerName,
        customerEmail: item.customerEmail,
        customerLabel: item.customerLabel,
        tags: item.tags,
        submittedAt: item.submittedAt ? new Date(item.submittedAt) : undefined,
      }, userName || "CSV Inbound");
      importedResults.push(created);
    }

    // Structured server-side logging
    console.log(
      JSON.stringify({
        event: "FEEDBACK_BULK_UPLOAD",
        workspaceId,
        agentRole: role,
        totalRows: items.length,
        importedCount: importedResults.length,
        failedCount: errors.length,
        timestamp: new Date().toISOString(),
      })
    );

    return NextResponse.json({
      success: true,
      message: "Bulk upload ingestion completed.",
      data: {
        total: items.length,
        imported: importedResults.length,
        failed: items.length - importedResults.length,
        errors,
      },
      errors: [],
    });
  } catch (error: any) {
    console.error(
      JSON.stringify({
        event: "API_ERROR",
        api: "POST /api/feedback",
        error: error.message || error,
        timestamp: new Date().toISOString(),
      })
    );
    return NextResponse.json(
      { success: false, message: "Failed to upload feedback records.", data: null, errors: ["SERVER_ERROR"] },
      { status: 500 }
    );
  }
}
