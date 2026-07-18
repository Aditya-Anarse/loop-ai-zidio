import { z } from "zod";
import { Sentiment, FeedbackSource } from "@prisma/client";

// Schema for search queries and sorting controls
export const feedbackQuerySchema = z.object({
  search: z.string().optional().default(""),
  sentiment: z.enum(["ALL", "POSITIVE", "NEUTRAL", "NEGATIVE", "MIXED"]).optional().default("ALL"),
  source: z.enum(["ALL", "MANUAL", "CSV", "SIMULATED"]).optional().default("ALL"),
  status: z.enum(["ALL", "NEW", "REVIEWED", "ACTIONED"]).optional().default("ALL"),
  dateRange: z.enum(["ALL", "PAST_7_DAYS", "PAST_30_DAYS", "CUSTOM"]).optional().default("ALL"),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  tag: z.string().optional().default(""),
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().positive().optional().default(10),
  sortField: z.enum(["submittedAt", "sentiment", "customerName", "status"]).optional().default("submittedAt"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
});

// Schema for creating manual feedback tickets
export const feedbackCreateSchema = z.object({
  content: z.string().min(1, "Feedback content cannot be empty").max(2000, "Feedback content must not exceed 2000 characters"),
  source: z.nativeEnum(FeedbackSource).optional().default("MANUAL"),
  customerName: z.string().min(1, "Customer name is required").max(100).optional().default("Anonymous User"),
  customerEmail: z.string().email("Invalid customer email format").or(z.string().length(0)).optional().default(""),
  customerLabel: z.string().max(50).optional().default("free"),
  tags: z.array(z.string().max(30)).optional().default([]),
});

// Schema for updating and editing feedback details
export const feedbackUpdateSchema = z.object({
  content: z.string().min(1, "Feedback content cannot be empty").max(2000, "Feedback content must not exceed 2000 characters").optional(),
  customerName: z.string().min(1, "Customer name is required").max(100).optional(),
  customerEmail: z.string().email("Invalid customer email format").or(z.string().length(0)).optional(),
  customerLabel: z.string().max(50).optional(),
  status: z.enum(["NEW", "REVIEWED", "ACTIONED"]).optional(),
  tags: z.array(z.string().max(30)).optional(),
});

export const csvRowSchema = z.object({
  content: z.string().min(1, "Content field must not be empty").max(2000, "Content exceeds maximum length of 2000 characters"),
  source: z.enum(["MANUAL", "CSV", "SIMULATED"]).optional().default("CSV"),
  customerName: z.string().max(100).optional().default("Anonymous"),
  customerEmail: z.string().email("Invalid email format").or(z.string().length(0)).optional().default(""),
  customerLabel: z.string().max(50).optional().default("free"),
  tags: z.string().optional().default(""),
  submittedAt: z.string().optional(),
});
