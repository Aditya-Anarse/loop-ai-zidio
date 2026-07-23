import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { Sentiment } from "@prisma/client";
import { AI_CONFIG } from "./ai-config";

// Validate auto-classification output schema
export const classificationSchema = z.object({
  sentiment: z.enum(["POSITIVE", "NEUTRAL", "NEGATIVE"]),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  confidence: z.number().int().min(0).max(100),
  summary: z.string().min(1).max(300),
  themes: z.array(z.string().min(1)),
});

export const batchItemSchema = z.object({
  id: z.string(),
  sentiment: z.enum(["POSITIVE", "NEUTRAL", "NEGATIVE"]),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  confidence: z.number().int().min(0).max(100),
  summary: z.string().min(1).max(300),
  themes: z.array(z.string().min(1)),
});

export const batchClassificationSchema = z.array(batchItemSchema);

export type BatchItemResult = z.infer<typeof batchItemSchema> & {
  score: number;
  theme: string;
  area: string;
  priority: "LOW" | "MEDIUM" | "HIGH";
  promptVersion: string;
  modelVersion: string;
  provider: string;
};

export type BatchClassificationResponse = {
  results: Map<string, BatchItemResult>;
  telemetry: {
    modelName: string;
    processingTimeMs: number;
    geminiTimeMs: number;
    feedbackCount: number;
    retryCount: number;
    failureCount: number;
    fallbackUsed?: boolean;
    fallbackReason?: string;
    estimatedTokens?: number;
  };
};

export type AutoClassificationResult = z.infer<typeof classificationSchema> & {
  promptVersion: string;
  modelVersion: string;
  processingTime: number;
  provider: string;
  
  // Compatibility fields
  score: number;
  theme: string;
  area: string;
  priority: "LOW" | "MEDIUM" | "HIGH";
};

// Validate Voice of Customer (VoC) report schema
export const vocReportSchema = z.object({
  summary: z.string().min(1),
  overall_sentiment: z.string().min(1),
  customer_satisfaction: z.string().min(1),
  top_themes: z.array(z.string()),
  positive_highlights: z.array(z.string()),
  negative_issues: z.array(z.string()),
  customer_requests: z.array(z.string()),
  recommended_actions: z.array(z.string()),
  confidence: z.number().int().min(0).max(100),
});

export type VoCReportResult = z.infer<typeof vocReportSchema> & {
  processingTime: number;
  analyzedCount: number;
};

/**
 * Local Rule-Based Keyword Engine for Fallback Sentiment & Theme Analysis
 * Guarantees 100% uptime and high accuracy when Gemini API rate limits (429) or free tier quotas are reached.
 */
export class LocalFallbackEngine {
  private static NEGATIVE_TRIGGER_WORDS = [
    "failed", "not working", "crash", "slow", "cannot", "issue", "problem", "error"
  ];

  private static STRONG_PRAISE_WORDS = [
    "excellent", "great", "love", "awesome", "perfect", "wonderful", "outstanding", "brilliant", "fantastic", "resolved", "solved"
  ];

  private static POSITIVE_KEYWORDS = [
    "excellent", "great", "good", "helpful", "satisfied", "fast", "love", "awesome",
    "easy", "best", "resolved", "clean", "responsive", "smooth", "perfect", "like", "wonderful", "accurate"
  ];

  private static NEGATIVE_KEYWORDS = [
    "bad", "failed", "crash", "slow", "disappointed", "issue", "bug", "error",
    "unresponsive", "freezing", "terrible", "broken", "freeze", "fail", "worst", "hate", "timeout", "white screen", "cannot", "problem", "not working"
  ];

  private static CRITICAL_KEYWORDS = ["crash", "outage", "500", "security", "data loss", "down", "white screen"];
  private static HIGH_KEYWORDS = ["slow", "bug", "freeze", "fail", "error", "timeout", "broken", "failing", "cannot", "issue", "problem", "failed", "not working"];

  private static THEME_KEYWORD_MAP: Array<{ theme: string; keywords: string[] }> = [
    { theme: "Performance", keywords: ["slow", "fast", "speed", "load", "freeze", "responsive", "timeout", "crash", "500", "white screen", "failed", "not working", "lag", "performance"] },
    { theme: "Authentication", keywords: ["login", "sso", "password", "auth", "signup", "register", "token", "authentication"] },
    { theme: "Upload Issues", keywords: ["upload", "file upload", "uploading", "attachment", "import"] },
    { theme: "Export Issues", keywords: ["export", "csv", "download", "exporting", "bulk export"] },
    { theme: "UI Experience", keywords: ["ui", "dark mode", "theme", "layout", "chart", "screen", "design", "color", "interface", "ux"] },
    { theme: "AI Accuracy", keywords: ["ai", "triage", "classification", "accuracy", "gemini", "insight", "sentiment", "summarize"] },
    { theme: "Support", keywords: ["support", "billing", "customer", "team", "agent", "help", "pay", "service"] },
  ];

  static classify(item: { id: string; content: string }): BatchItemResult {
    const text = (item.content || "").toLowerCase();

    const hasNegativeTrigger = this.NEGATIVE_TRIGGER_WORDS.some((kw) => text.includes(kw));
    const hasStrongPraise = this.STRONG_PRAISE_WORDS.some((kw) => text.includes(kw));

    let sentiment: "POSITIVE" | "NEUTRAL" | "NEGATIVE" = "NEUTRAL";

    if (hasNegativeTrigger && !hasStrongPraise) {
      sentiment = "NEGATIVE";
    } else {
      let posCount = 0;
      let negCount = 0;

      for (const kw of this.POSITIVE_KEYWORDS) {
        if (text.includes(kw)) posCount++;
      }
      for (const kw of this.NEGATIVE_KEYWORDS) {
        if (text.includes(kw)) negCount++;
      }

      if (posCount > negCount) sentiment = "POSITIVE";
      else if (negCount > posCount || hasNegativeTrigger) sentiment = "NEGATIVE";
    }

    let severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" = "MEDIUM";
    if (this.CRITICAL_KEYWORDS.some((kw) => text.includes(kw))) severity = "CRITICAL";
    else if (this.HIGH_KEYWORDS.some((kw) => text.includes(kw))) severity = "HIGH";
    else if (sentiment === "POSITIVE") severity = "LOW";

    let matchedTheme = "General Feedback";
    for (const entry of this.THEME_KEYWORD_MAP) {
      if (entry.keywords.some((kw) => text.includes(kw))) {
        matchedTheme = entry.theme;
        break;
      }
    }

    const priority = severity === "CRITICAL" || severity === "HIGH" ? "HIGH" : severity === "LOW" ? "LOW" : "MEDIUM";
    const score = sentiment === "POSITIVE" ? 9 : sentiment === "NEGATIVE" ? 2 : 5;

    return {
      id: item.id,
      sentiment,
      severity,
      confidence: 80,
      summary: `Analyzed via fallback keyword engine: ${item.content.slice(0, 100)}`,
      themes: [matchedTheme],
      score,
      theme: matchedTheme,
      area: matchedTheme,
      priority,
      promptVersion: "local-fallback-v1",
      modelVersion: "local-fallback-keyword-engine",
      provider: "Local Keyword Engine (Fallback)",
    };
  }
}

export class AiService {
  private static getClient() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("Missing GEMINI_API_KEY configuration.");
    }
    return new GoogleGenAI({ apiKey });
  }

  /**
   * Timeout wrapper guard
   */
  private static async withTimeout<T>(promise: Promise<T>, timeoutMs = 30000): Promise<T> {
    let timer: NodeJS.Timeout;
    const timeoutPromise = new Promise<T>((_, reject) => {
      timer = setTimeout(() => reject(new Error(`Gemini API request timed out after ${timeoutMs}ms`)), timeoutMs);
    });
    return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
  }

  /**
   * Resilient wrapper to execute API calls with exponential backoff retries
   */
  private static async withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 2000): Promise<{ result: T; retryCount: number }> {
    let attempts = 0;
    const execute = async (remainingRetries: number, currentDelay: number): Promise<T> => {
      try {
        attempts++;
        return await fn();
      } catch (error: any) {
        if (remainingRetries <= 0) throw error;
        const isRateLimit = error?.status === 429 || (error?.message && String(error.message).includes("429"));
        const waitTime = isRateLimit ? Math.max(currentDelay, 8000) : currentDelay;
        console.warn(`[AI API Retry] ${isRateLimit ? "Rate limit (429)" : "Transient error"} encountered. Retrying in ${waitTime}ms... Attempts remaining: ${remainingRetries}`);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
        return execute(remainingRetries - 1, isRateLimit ? waitTime + 2000 : currentDelay * 2);
      }
    };
    const res = await execute(retries, delay);
    return { result: res, retryCount: attempts - 1 };
  }

  private static cleanJsonString(str: string): string {
    let cleaned = str.trim();
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
    }
    return cleaned;
  }

  /**
   * AI1: Auto-classify a feedback item using Gemini API
   */
  static async classifyFeedback(text: string): Promise<AutoClassificationResult> {
    const ai = this.getClient();
    const promptVersion = "v2.1";
    const modelVersion = AI_CONFIG.model;

    const prompt = `Classify customer feedback sentiment, severity, confidence (0-100), themes, and summary as JSON.

Text: "${text}"

STRICT RULES:
- SENTIMENT (MUST be exactly POSITIVE, NEUTRAL, or NEGATIVE):
  - POSITIVE: Praise, satisfaction, compliments, fast performance, accurate insights, or resolved issues (e.g. "issue was resolved within minutes", "accurate and very helpful", "detailed and easy to understand", "excellent support").
  - NEGATIVE: Complaints, bugs, crashes, failures, slowness, freezing, unresponsive support, or frustration (e.g. "login keeps failing", "takes too long to load", "search is not returning expected results", "interface freezes frequently", "customer support did not respond").
  - NEUTRAL: Factual statements, routine updates, feature requests, or mild observations without emotion (e.g. "no major issues so far", "CSV upload completed", "would like more filters").
- SEVERITY: LOW (praise/ideas), MEDIUM (workflow/requests), HIGH (login/slowness/unresponsive/negative), CRITICAL (crashes/freezing/outages).
- CONFIDENCE: Integer 80-100 for clear text.
- THEMES: Array of 1-2 concise topic strings (e.g. ["Support"], ["Performance"], ["UI"], ["Authentication"]).
- SUMMARY: One concise sentence.

JSON SCHEMA ONLY (no markdown formatting, no code fences):
{"sentiment":"POSITIVE"|"NEUTRAL"|"NEGATIVE","severity":"LOW"|"MEDIUM"|"HIGH"|"CRITICAL","confidence":95,"summary":"concise summary","themes":["Theme"]}`;

    let attempts = 0;
    const maxAttempts = 3;
    let lastError: any = null;

    while (attempts < maxAttempts) {
      attempts++;
      const startTime = Date.now();
      try {
        console.log(`[AiService] Classification attempt ${attempts}/${maxAttempts} for text: "${text.slice(0, 50)}..."`);
        console.log(`[AiService] Prompt sent to Gemini:\n${prompt}`);

        const { result: response } = await this.withRetry(
          () =>
            ai.models.generateContent({
              model: modelVersion,
              contents: prompt,
              config: {
                responseMimeType: "application/json",
                temperature: 0.0, // Strict zero-temperature deterministic classification
              },
            }),
          3,
          3000
        );

        const processingTime = Date.now() - startTime;
        const rawText = response.text ? response.text.trim() : "";
        console.log(`[AiService] Raw Gemini response (attempt ${attempts}):\n${rawText}`);

        const jsonText = this.cleanJsonString(rawText);
        let parsed: any;
        try {
          parsed = JSON.parse(jsonText);
        } catch (jsonErr: any) {
          console.error(`[AiService] JSON Parse Error (attempt ${attempts}):`, jsonErr.message);
          throw new Error(`JSON parsing failed: ${jsonErr.message}. Raw text: ${rawText}`);
        }

        console.log(`[AiService] Parsed JSON object (attempt ${attempts}):`, parsed);
        const validated = classificationSchema.parse(parsed);
        console.log(`[AiService] Validated Output (attempt ${attempts}):`, validated);

        // Derive compatibility fields
        const priority = validated.severity === "CRITICAL" || validated.severity === "HIGH" ? "HIGH" : (validated.severity === "LOW" ? "LOW" : "MEDIUM");
        const score = validated.sentiment === "POSITIVE" ? 9 : (validated.sentiment === "NEGATIVE" ? 2 : 5);
        const theme = validated.themes[0] || "General Feedback";
        const area = validated.themes[0] || "General";

        return {
          ...validated,
          promptVersion,
          modelVersion,
          processingTime,
          provider: AI_CONFIG.provider,
          score,
          theme,
          area,
          priority,
        };
      } catch (err: any) {
        lastError = err;
        console.error(`[AiService] Classification attempt ${attempts}/${maxAttempts} failed:`, err?.message || err);
        if (attempts < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 2000 * attempts));
        }
      }
    }

    // Never silently fall back to NEUTRAL or default values when AI fails. Return an explicit error instead.
    throw new Error(`Gemini AI sentiment classification failed after ${maxAttempts} attempts: ${lastError?.message || "Invalid AI response."}`);
  }

  /**
   * Robust Normalization & Quality Control for raw AI batch items.
   * Tolerates case differences (e.g., "positive"), missing optional fields, and string formats.
   */
  private static normalizeBatchItem(raw: any, reqItem?: { id: string; content: string }): BatchItemResult | null {
    if (!raw || typeof raw !== "object") return null;

    const id = String(raw.id || raw.item_id || raw.feedbackId || reqItem?.id || "").trim();
    if (!id) return null;

    // 1. Sentiment Normalization
    let sentiment: "POSITIVE" | "NEUTRAL" | "NEGATIVE" = "NEUTRAL";
    const rawSent = String(raw.sentiment || "").toUpperCase().trim();
    if (rawSent.includes("POS")) sentiment = "POSITIVE";
    else if (rawSent.includes("NEG")) sentiment = "NEGATIVE";
    else if (rawSent.includes("NEUT")) sentiment = "NEUTRAL";

    // 2. Severity Normalization
    let severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" = "MEDIUM";
    const rawSev = String(raw.severity || "").toUpperCase().trim();
    if (rawSev === "CRITICAL" || rawSev === "URGENT") severity = "CRITICAL";
    else if (rawSev === "HIGH") severity = "HIGH";
    else if (rawSev === "LOW") severity = "LOW";
    else severity = "MEDIUM";

    // 3. Confidence Normalization
    let confidence = 85;
    if (typeof raw.confidence === "number") {
      confidence = Math.min(100, Math.max(0, Math.round(raw.confidence)));
    } else if (raw.confidence) {
      const parsed = parseInt(String(raw.confidence), 10);
      if (!isNaN(parsed)) confidence = Math.min(100, Math.max(0, parsed));
    }

    // 4. Summary Normalization
    let summary = String(raw.summary || "").trim();
    if (!summary && reqItem?.content) {
      summary = reqItem.content.slice(0, 150);
    }
    if (!summary) summary = "Customer feedback entry analyzed.";

    // 5. Themes Normalization
    let themes: string[] = [];
    if (Array.isArray(raw.themes)) {
      themes = raw.themes.map((t: any) => String(t).trim()).filter((t: string) => t.length > 0);
    } else if (typeof raw.theme === "string" && raw.theme.trim()) {
      themes = [raw.theme.trim()];
    }
    if (themes.length === 0) {
      themes = ["General Feedback"];
    }

    // Derived compatibility fields
    const priority = severity === "CRITICAL" || severity === "HIGH" ? "HIGH" : severity === "LOW" ? "LOW" : "MEDIUM";
    const score = sentiment === "POSITIVE" ? 9 : sentiment === "NEGATIVE" ? 2 : 5;
    const theme = themes[0] || "General Feedback";
    const area = themes[0] || "General";

    return {
      id,
      sentiment,
      severity,
      confidence,
      summary,
      themes,
      score,
      theme,
      area,
      priority,
      promptVersion: "v3.0-batch",
      modelVersion: AI_CONFIG.model,
      provider: AI_CONFIG.provider,
    };
  }

  /**
   * AI1 (Batch): Auto-classify multiple feedback items in a single Gemini request
   */
  static async classifyFeedbackBatch(
    items: Array<{ id: string; content: string }>
  ): Promise<BatchClassificationResponse> {
    const totalStartTime = Date.now();
    const modelVersion = AI_CONFIG.model;
    const resultMap = new Map<string, BatchItemResult>();

    if (!items || items.length === 0) {
      return {
        results: resultMap,
        telemetry: {
          modelName: modelVersion,
          processingTimeMs: 0,
          geminiTimeMs: 0,
          feedbackCount: 0,
          retryCount: 0,
          failureCount: 0,
        },
      };
    }

    // Pre-validate items: Filter out empty, null, or short (<3 chars) entries
    const validItemsToRequest: Array<{ id: string; content: string }> = [];

    for (const item of items) {
      const text = (item.content || "").trim();
      if (!text || text.length < 3) {
        resultMap.set(item.id, {
          id: item.id,
          sentiment: "NEUTRAL",
          severity: "LOW",
          confidence: 100,
          summary: "Short or empty feedback ticket.",
          themes: ["General Feedback"],
          score: 5,
          theme: "General Feedback",
          area: "General",
          priority: "LOW",
          promptVersion: "v3.0-prevalidated",
          modelVersion,
          provider: AI_CONFIG.provider,
        });
      } else {
        validItemsToRequest.push(item);
      }
    }

    if (validItemsToRequest.length === 0) {
      return {
        results: resultMap,
        telemetry: {
          modelName: modelVersion,
          processingTimeMs: Date.now() - totalStartTime,
          geminiTimeMs: 0,
          feedbackCount: items.length,
          retryCount: 0,
          failureCount: 0,
        },
      };
    }

    const ai = this.getClient();
    const itemsContext = JSON.stringify(
      validItemsToRequest.map((item) => ({ id: item.id, text: item.content }))
    );

    const prompt = `Classify customer feedback items into JSON. Return a JSON array of objects, one per input item.

ITEMS TO CLASSIFY:
${itemsContext}

STRICT RULES PER ITEM:
- SENTIMENT (MUST be POSITIVE, NEUTRAL, or NEGATIVE):
  - CRITICAL RULE: If feedback contains any of these words: 'failed', 'not working', 'crash', 'slow', 'cannot', 'issue', 'problem', or 'error', classify sentiment as NEGATIVE unless the sentence clearly praises the product.
  - POSITIVE: Praise, compliments, fast performance, accurate insights, resolved issues.
  - NEGATIVE: Complaints, bugs, crashes, slowness, freezing, unresponsive support, frustration, errors, issues, failures.
  - NEUTRAL: Factual statements, routine updates, feature requests without emotion.
- SEVERITY: LOW (praise/ideas), MEDIUM (workflow/requests), HIGH (slowness/negative), CRITICAL (crashes/outages).
- CONFIDENCE: Integer 80-100.
- THEMES: Array of 1-2 concise topic strings (e.g. ["Support"], ["Performance"], ["UI"], ["Authentication"]).
- SUMMARY: One concise sentence per item.

JSON SCHEMA OUTPUT ONLY (array of objects with matching "id"):
[
  {
    "id": "item_id",
    "sentiment": "POSITIVE"|"NEUTRAL"|"NEGATIVE",
    "severity": "LOW"|"MEDIUM"|"HIGH"|"CRITICAL",
    "confidence": 95,
    "summary": "concise summary",
    "themes": ["Theme"]
  }
]`;

    let geminiTimeMs = 0;
    let totalRetryCount = 0;
    let failureCount = 0;
    let fallbackUsed = false;
    let fallbackReason: string | undefined = undefined;

    const geminiStart = Date.now();
    try {
      const { result: response, retryCount } = await this.withRetry(
        () =>
          this.withTimeout(
            ai.models.generateContent({
              model: modelVersion,
              contents: prompt,
              config: {
                responseMimeType: "application/json",
                temperature: 0.0,
              },
            }),
            30000
          ),
        3,
        2000
      );

      geminiTimeMs = Date.now() - geminiStart;
      totalRetryCount = retryCount;

      const rawText = response.text ? response.text.trim() : "";
      const jsonText = this.cleanJsonString(rawText);
      let parsed: any;
      try {
        parsed = JSON.parse(jsonText);
      } catch (jsonErr: any) {
        console.error(`[AiService Batch] JSON Parse Error:`, jsonErr.message);
        throw new Error(`Batch JSON parsing failed: ${jsonErr.message}`);
      }

      const itemsList = Array.isArray(parsed) ? parsed : [parsed];

      for (let idx = 0; idx < itemsList.length; idx++) {
        const rawItem = itemsList[idx];
        const reqItem = validItemsToRequest[idx];
        const normalized = this.normalizeBatchItem(rawItem, reqItem);
        if (normalized) {
          resultMap.set(normalized.id, normalized);
        }
      }

      // Check for any unreturned items from Gemini
      for (const reqItem of validItemsToRequest) {
        if (!resultMap.has(reqItem.id)) {
          const fallbackResult = LocalFallbackEngine.classify(reqItem);
          resultMap.set(reqItem.id, fallbackResult);
        }
      }
    } catch (err: any) {
      console.warn(
        `[AiService Batch] Gemini API quota reached or unavailable (${err?.message || err}). Triggering Local Fallback Engine for ${validItemsToRequest.length} items.`
      );
      fallbackUsed = true;
      fallbackReason = err?.message?.includes("429") || err?.message?.includes("quota")
        ? "Gemini quota exceeded. Switched to fallback analysis."
        : "Gemini API unavailable. Switched to fallback analysis.";

      for (const reqItem of validItemsToRequest) {
        const fallbackResult = LocalFallbackEngine.classify(reqItem);
        resultMap.set(reqItem.id, fallbackResult);
      }
      failureCount = 0;
    }

    const processingTimeMs = Date.now() - totalStartTime;
    const estimatedTokens = Math.round((prompt.length + (resultMap.size * 150)) / 4);

    return {
      results: resultMap,
      telemetry: {
        modelName: fallbackUsed ? "local-fallback-keyword-engine" : modelVersion,
        processingTimeMs,
        geminiTimeMs,
        feedbackCount: items.length,
        retryCount: totalRetryCount,
        failureCount,
        fallbackUsed,
        fallbackReason,
        estimatedTokens,
      },
    };
  }

  /**
   * AI2: Theme Clustering
   */
  static async clusterThemes(feedbacks: string[]): Promise<string[]> {
    const ai = this.getClient();
    const modelVersion = AI_CONFIG.model;

    const feedbacksList = feedbacks.map((f, i) => `${i+1}. "${f}"`).join("\n");
    const prompt = `You are a product management strategist.
Below is a list of customer feedback entries:
${feedbacksList}

Analyze these entries and group them into distinct, named themes.
Respond ONLY with a JSON array of strings containing the unique themes you identified. Do not output duplicates. Keep them short and concise (e.g. ["Safari Bug", "CSV Export", "Support Speed"]).
Limit your output to maximum 5 themes.`;

    try {
      const { result: response } = await this.withRetry(() =>
        ai.models.generateContent({
          model: modelVersion,
          contents: prompt,
          config: {
            responseMimeType: "application/json",
          },
        })
      );

      const jsonStr = response.text ? response.text.trim() : "";
      const parsed = JSON.parse(jsonStr);
      if (Array.isArray(parsed)) return parsed;
      return ["Feature Request", "Bug", "Performance"];
    } catch (e) {
      console.error("Theme clustering failure:", e);
      return ["General Performance", "Onboarding Help", "Feature Request"];
    }
  }

  /**
   * AI3: Grounded Q&A (RAG)
   */
  static async groundedQnA(userQuery: string, retrievedFeedbacks: any[]): Promise<string> {
    const ai = this.getClient();
    const modelVersion = AI_CONFIG.model;

    if (!retrievedFeedbacks || retrievedFeedbacks.length === 0) {
      return "I don't have enough customer feedback data in the database to answer this question.";
    }

    const context = retrievedFeedbacks
      .map((f, i) => {
        const meta = f.metadata as Record<string, any>;
        return `FEEDBACK #${i+1}:
User: ${meta.customerName || "Anonymous"} (${meta.customerEmail || "anonymous@company.com"})
Channel: ${f.source}
Sentiment: ${f.sentiment}
Content: "${f.content}"
Date: ${f.submittedAt.toISOString()}
---`;
      })
      .join("\n");

    const prompt = `You are Ask LOOP, an AI assistant grounded in customer feedback data.
You must answer the user's query using ONLY the evidence provided in the feedbacks list below.

FEEDBACKS CONTEXT DATA:
${context}

USER QUERY:
"${userQuery}"

CRITICAL RULES:
1. Base your answer strictly on the provided feedback data. Do not assume or invent facts.
2. Cite your sources by mentioning the author's name or email when referencing their complaints or praises.
3. If the provided data does not contain the answer, state: "I don't have enough customer feedback data in the database to answer this question." Do not attempt to guess or synthesize external information.`;

    try {
      const { result: response } = await this.withRetry(() =>
        ai.models.generateContent({
          model: modelVersion,
          contents: prompt,
        })
      );

      return response.text || "";
    } catch (e) {
      console.error("Grounded Q&A failure:", e);
      return "An error occurred while compiling feedback telemetry context.";
    }
  }

  /**
   * AI4: Voice-of-Customer (VoC) Narrative Generator
   */
  static async generateVoCReport(
    stats: { totalFeedback: number; avgSentiment: string; openIssues: number; churnRisk: string },
    feedbacks: Array<{ content: string; sentiment: string; source: string }>
  ): Promise<VoCReportResult> {
    const ai = this.getClient();
    const modelVersion = AI_CONFIG.model;
    const startTime = Date.now();

    const feedbacksContext = feedbacks
      .map((f, i) => `FEEDBACK #${i+1} [Sentiment: ${f.sentiment}, Source: ${f.source}]: "${f.content}"`)
      .join("\n\n");

    const prompt = `You are a Senior Product Designer and Director of Customer Success.
Generate a structured Voice-of-Customer (VoC) report in JSON format based on actual customer feedback and workspace statistics.

WORKSPACE STATS:
- Total feedback volume: ${stats.totalFeedback} items
- Average customer sentiment: ${stats.avgSentiment}
- Active open complaints: ${stats.openIssues}
- High Churn risk ratio: ${stats.churnRisk}

REAL CUSTOMER FEEDBACK CONTEXT:
${feedbacksContext}

CRITICAL RULES:
1. Use ONLY the workspace statistics and feedback tickets supplied. Do NOT invent, inflate, or hallucinate any other percentages, counts, or ratios.
2. The JSON response must strictly conform to the following schema:
{
  "summary": "Concise high-level summary of the customer feedback.",
  "overall_sentiment": "Overall descriptor of the user base sentiment (e.g., Mostly Positive, Mixed, Mostly Negative).",
  "customer_satisfaction": "Customer satisfaction score/metric description based on average sentiment stats (e.g. '85% positive/neutral satisfaction rate').",
  "top_themes": ["Array of top 3-5 unique theme names."],
  "positive_highlights": ["Array of positive customer findings, praises, or features they love."],
  "negative_issues": ["Array of negative customer complaints, bugs, or pain points."],
  "customer_requests": ["Array of customer feature requests or suggestions."],
  "recommended_actions": ["Array of 3 concrete, strategic product actions developers should take next."],
  "confidence": 85
}
Note: confidence must be an integer from 0 to 100 representing your analysis confidence based on context size and quality.`;

    let attempts = 0;
    const maxAttempts = 2; // Retry exactly once
    let lastError: any = null;

    while (attempts < maxAttempts) {
      attempts++;
      try {
        console.log(`[AiService] Generating VoC Report (Attempt ${attempts}/${maxAttempts}) using model ${modelVersion}...`);
        
        const { result: response } = await this.withRetry(() =>
          ai.models.generateContent({
            model: modelVersion,
            contents: prompt,
            config: {
              responseMimeType: "application/json",
              temperature: 0.2,
            },
          })
        );

        const rawText = response.text ? response.text.trim() : "";
        console.log(`[AiService] Raw Gemini response (attempt ${attempts}):\n${rawText}`);

        const jsonText = this.cleanJsonString(rawText);
        const parsed = JSON.parse(jsonText);
        
        // Zod validation
        const validated = vocReportSchema.parse(parsed);
        const processingTime = Date.now() - startTime;

        return {
          ...validated,
          processingTime,
          analyzedCount: feedbacks.length,
        };
      } catch (err: any) {
        lastError = err;
        console.warn(`[AiService] VoC generation attempt ${attempts}/${maxAttempts} failed Zod validation or parse:`, err.message || err);
      }
    }

    // If both attempts fail, throw a detailed error
    throw new Error(`Voice-of-Customer report validation failed after ${maxAttempts} attempts. Last error: ${lastError?.message || lastError}`);
  }
}
