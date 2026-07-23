import {
  IntegrationProviderHandler,
  IntegrationType,
  IntegrationConfig,
  ValidationResult,
  TestEventResult,
  DispatchResult,
  EventPayloadData,
} from "./provider-interface";

export class SlackHandler implements IntegrationProviderHandler {
  type: IntegrationType = "SLACK";

  validateCredentials(config: IntegrationConfig): ValidationResult {
    const url = config.slackWebhookUrl || config.webhookUrl;
    if (!url) {
      return { valid: false, error: "Slack Webhook URL is required." };
    }
    if (!url.startsWith("https://")) {
      return { valid: false, error: "Slack Webhook URL must use HTTPS." };
    }
    return { valid: true };
  }

  async sendTestEvent(config: IntegrationConfig, workspaceId: string): Promise<TestEventResult> {
    const startTime = Date.now();
    const validation = this.validateCredentials(config);
    if (!validation.valid) {
      return {
        success: false,
        message: validation.error || "Invalid Slack configuration.",
        durationMs: Date.now() - startTime,
      };
    }

    const channel = config.channel || "#feedback-alerts";
    const testPayload = {
      text: "⚡ *LOOP Customer Intelligence - Slack Connection Test*",
      blocks: [
        {
          type: "header",
          text: { type: "plain_text", text: "LOOP Slack Integration Active" },
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `Successfully verified Slack webhook routing to channel *${channel}* for workspace \`${workspaceId}\`.`,
          },
        },
      ],
    };

    const dispatch = await this.executeSlackRequest(config, testPayload);
    return {
      success: dispatch.success,
      message: dispatch.success
        ? `Slack notification delivered successfully to ${channel}.`
        : dispatch.error || "Slack Webhook request failed.",
      durationMs: dispatch.durationMs,
      rawResponse: dispatch.response,
    };
  }

  async dispatchFeedbackEvent(config: IntegrationConfig, eventData: EventPayloadData): Promise<DispatchResult> {
    const validation = this.validateCredentials(config);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error || "Invalid Slack configuration.",
        durationMs: 0,
      };
    }

    const customer = eventData.customerName || "Anonymous Customer";
    const sentiment = eventData.sentiment || "NEGATIVE";
    const severity = eventData.severity || "HIGH";
    const theme = eventData.theme || "General";

    const slackPayload = {
      text: `🚨 *High Priority Feedback Alert* | ${customer}`,
      blocks: [
        {
          type: "header",
          text: { type: "plain_text", text: "🚨 High Priority Customer Feedback" },
        },
        {
          type: "section",
          fields: [
            { type: "mrkdwn", text: `*Customer:* ${customer}` },
            { type: "mrkdwn", text: `*Sentiment:* ${sentiment}` },
            { type: "mrkdwn", text: `*Severity:* ${severity}` },
            { type: "mrkdwn", text: `*Theme:* ${theme}` },
          ],
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `> "${eventData.feedback || "No feedback content provided."}"`,
          },
        },
        {
          type: "context",
          elements: [
            {
              type: "mrkdwn",
              text: `Dispatched via LOOP AI Engine at ${new Date().toLocaleTimeString()}`,
            },
          ],
        },
      ],
    };

    return await this.executeSlackRequest(config, slackPayload);
  }

  private async executeSlackRequest(config: IntegrationConfig, payload: any): Promise<DispatchResult> {
    const startTime = Date.now();
    const url = config.slackWebhookUrl || config.webhookUrl!;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const text = (await res.text()).slice(0, 500);

      if (res.ok || res.status < 400) {
        return {
          success: true,
          statusCode: res.status,
          response: text,
          durationMs: Date.now() - startTime,
        };
      } else {
        return {
          success: false,
          statusCode: res.status,
          response: text,
          durationMs: Date.now() - startTime,
          error: `Slack API error HTTP ${res.status}: ${text || res.statusText}`,
        };
      }
    } catch (err: any) {
      const errorMsg = err.name === "AbortError" ? "Slack request timed out after 5000ms" : err.message || "Slack HTTP request failed";
      return {
        success: false,
        durationMs: Date.now() - startTime,
        error: errorMsg,
      };
    }
  }
}
