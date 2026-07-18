import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { Sentiment } from "@prisma/client";

// Validate auto-classification output schema
export const classificationSchema = z.object({
  sentiment: z.enum(["POSITIVE", "NEUTRAL", "NEGATIVE", "MIXED"]),
  score: z.number().min(0).max(10),
  theme: z.string().min(1).max(100),
  area: z.string().min(1).max(100),
  summary: z.string().min(5).max(300),
  priority: z.enum(["HIGH", "MEDIUM", "LOW"]).default("MEDIUM"),
  confidence: z.number().min(0.0).max(1.0).default(0.85),
});

export type AutoClassificationResult = z.infer<typeof classificationSchema> & {
  promptVersion: string;
  modelVersion: string;
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
  private static async withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (retries <= 0) throw error;
      console.warn(`[AI API Retry] Transient error encountered. Retrying in ${delay}ms... Attempts remaining: ${retries}`, error);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return this.withRetry(fn, retries - 1, delay * 2);
    }
  }

  /**
   * AI1: Auto-classify a feedback item using Gemini API
   */
  static async classifyFeedback(text: string): Promise<AutoClassificationResult> {
    const ai = this.getClient();
    const promptVersion = "v1.1";
    const modelVersion = "gemini-2.0-flash";

    const prompt = `You are an expert customer feedback analyzer. 
Analyze this customer feedback and categorize it.
Feedback: "${text}"

You MUST respond ONLY with a raw JSON object containing these keys:
- sentiment: must be one of "POSITIVE", "NEUTRAL", "NEGATIVE", "MIXED"
- score: a number between 0 and 10 representing customer happiness (0=furious, 10=ecstatic)
- theme: a single short noun phrase categorizing the topic (e.g. "Checkout Speed", "Search Accuracy", "SSO Authentication", "NPS Survey")
- area: the general application module/feature area (e.g. "Performance", "Authentication", "UI/UX", "Billing", "Search", "Support")
- summary: a one-sentence summary of the main core concern of this feedback (max 200 chars)
- priority: a priority level of "HIGH", "MEDIUM", or "LOW" based on severity/impact (e.g., billing bugs, logins failures, and churn threats are "HIGH"; minor layout alignment or formatting suggestions are "LOW")
- confidence: a confidence rating of your evaluation as a float between 0.0 and 1.0

Your response must be a single parseable JSON block, with no explanation, markdown formatting, or HTML tags.`;

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
      const validated = classificationSchema.parse(parsed);

      return {
        ...validated,
        promptVersion,
        modelVersion,
      };
    } catch (e) {
      console.error("AI feedback classification failure:", e);
      // Fail-safe defaults matching schema
      return {
        sentiment: "NEUTRAL",
        score: 5,
        theme: "General Feedback",
        area: "General",
        summary: "Customer left comment regarding platform options.",
        priority: "MEDIUM",
        confidence: 0.5,
        promptVersion,
        modelVersion,
      };
    }
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

