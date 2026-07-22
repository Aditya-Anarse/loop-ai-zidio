import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { Sentiment } from "@prisma/client";

// Validate auto-classification output schema
export const classificationSchema = z.object({
  sentiment: z.enum(["POSITIVE", "NEUTRAL", "NEGATIVE"]),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
  confidence: z.number().int().min(0).max(100),
  summary: z.string().min(1).max(300),
  themes: z.array(z.string().min(1)),
});

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

export class AiService {
  private static getClient() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("Missing GEMINI_API_KEY configuration.");
    }
    return new GoogleGenAI({ apiKey });
  }

  /**
   * Resilient wrapper to execute API calls with exponential backoff retries
   */
  private static async withRetry<T>(fn: () => Promise<T>, retries = 4, delay = 2000): Promise<T> {
    try {
      return await fn();
    } catch (error: any) {
      if (retries <= 0) throw error;
      const isRateLimit = error?.status === 429 || (error?.message && String(error.message).includes("429"));
      const waitTime = isRateLimit ? Math.max(delay, 8000) : delay;
      console.warn(`[AI API Retry] ${isRateLimit ? "Rate limit (429)" : "Transient error"} encountered. Retrying in ${waitTime}ms... Attempts remaining: ${retries}`);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
      return this.withRetry(fn, retries - 1, isRateLimit ? waitTime + 2000 : delay * 2);
    }
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
    const modelVersion = "gemini-2.5-flash";

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

        const response = await this.withRetry(
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
          provider: "Google Gemini AI",
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
   * AI2: Theme Clustering
   */
  static async clusterThemes(feedbacks: string[]): Promise<string[]> {
    const ai = this.getClient();
    const modelVersion = "gemini-2.0-flash";

    const feedbacksList = feedbacks.map((f, i) => `${i+1}. "${f}"`).join("\n");
    const prompt = `You are a product management strategist.
Below is a list of customer feedback entries:
${feedbacksList}

Analyze these entries and group them into distinct, named themes.
Respond ONLY with a JSON array of strings containing the unique themes you identified. Do not output duplicates. Keep them short and concise (e.g. ["Safari Bug", "CSV Export", "Support Speed"]).
Limit your output to maximum 5 themes.`;

    try {
      const response = await this.withRetry(() =>
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
    const modelVersion = "gemini-2.0-flash";

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
      const response = await this.withRetry(() =>
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
    recentNegativeFeedback: string[],
    topThemes: { name: string; count: number }[]
  ): Promise<string> {
    const ai = this.getClient();
    const modelVersion = "gemini-2.0-flash";

    const themesStr = topThemes.map(t => `- ${t.name}: ${t.count} complaints`).join("\n");
    const quotesStr = recentNegativeFeedback.map(q => `> "${q}"`).join("\n");

    const prompt = `You are a Senior Product Designer and Director of Customer Success.
Generate a structured, professional Voice-of-Customer (VoC) narrative digest based on real workspace statistics.

WORKSPACE STATS:
- Total feedback volume: ${stats.totalFeedback} items
- Average customer sentiment: ${stats.avgSentiment}
- Active open complaints: ${stats.openIssues}
- High Churn risk ratio: ${stats.churnRisk}

TOP DRIVING COMPLAINT THEMES:
${themesStr}

REPRESENTATIVE CUSTOMER QUOTES:
${quotesStr}

CRITICAL RULES:
1. Use ONLY the workspace statistics supplied. Do NOT invent, inflate, or hallucinate any other percentages, counts, or ratios.
2. Structure your narrative with the following EXACT sections in Markdown:
   - ## Executive Summary: A short summary of the state of user sentiment.
   - ## Positive Trends: Key features customer praised recently.
   - ## Negative Trends: Product aspects driving complaints.
   - ## Top Customer Pain Points: Focus on top themes.
   - ## Most Requested Features: Features users suggested.
   - ## Sentiment Analysis: Summary of scores/sentiment distributions.
   - ## Recommended Product Actions: 3 concrete, strategic actions developers should take next.
   - ## Business Impact: Expected business/customer retention outcomes if addressed.
   - ## Action Items: Quick checklist of tasks.`;

    try {
      const response = await this.withRetry(() =>
        ai.models.generateContent({
          model: modelVersion,
          contents: prompt,
        })
      );

      return response.text || "";
    } catch (e) {
      console.error("VoC report compilation failure:", e);
      return "An error occurred while compiling Voice-of-Customer narrative.";
    }
  }
}

