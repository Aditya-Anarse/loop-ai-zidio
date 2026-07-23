import {
  IntegrationProviderHandler,
  IntegrationType,
  IntegrationConfig,
  ValidationResult,
  TestEventResult,
  DispatchResult,
  EventPayloadData,
} from "./provider-interface";

export class ZendeskHandler implements IntegrationProviderHandler {
  type: IntegrationType = "ZENDESK";

  validateCredentials(config: IntegrationConfig): ValidationResult {
    const subdomain = config.subdomain || config.domain;
    if (!subdomain) {
      return { valid: false, error: "Zendesk Subdomain is required (e.g. company.zendesk.com)." };
    }
    if (!config.email) {
      return { valid: false, error: "Zendesk Agent Email is required." };
    }
    if (!config.apiToken) {
      return { valid: false, error: "Zendesk API Token is required." };
    }
    return { valid: true };
  }

  async sendTestEvent(config: IntegrationConfig, workspaceId: string): Promise<TestEventResult> {
    const startTime = Date.now();
    const validation = this.validateCredentials(config);
    if (!validation.valid) {
      return {
        success: false,
        message: validation.error || "Invalid Zendesk configuration.",
        durationMs: Date.now() - startTime,
      };
    }

    const testTicketPayload = {
      ticket: {
        subject: `[LOOP Test] Connection Verification for ${workspaceId}`,
        comment: {
          body: `Zendesk ticket integration verified successfully from LOOP Customer Intelligence at ${new Date().toISOString()}.`,
        },
        priority: "normal",
        tags: ["loop_test_connection", "loop_ai"],
      },
    };

    const dispatch = await this.executeZendeskRequest(config, testTicketPayload);
    return {
      success: dispatch.success,
      message: dispatch.success
        ? `Zendesk ticket sync verified for ${config.subdomain}.`
        : dispatch.error || "Zendesk API connection failed.",
      durationMs: dispatch.durationMs,
      rawResponse: dispatch.response,
    };
  }

  async dispatchFeedbackEvent(config: IntegrationConfig, eventData: EventPayloadData): Promise<DispatchResult> {
    const validation = this.validateCredentials(config);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error || "Invalid Zendesk configuration.",
        durationMs: 0,
      };
    }

    const customer = eventData.customerName || "Anonymous Customer";
    const customerEmail = eventData.customerEmail || "customer@example.com";
    const severity = (eventData.severity || "MEDIUM").toLowerCase();
    const priority = severity === "critical" || severity === "high" ? "high" : "normal";

    const zendeskPayload = {
      ticket: {
        subject: `[LOOP Alert] ${eventData.theme || "Feedback"} - ${customer}`,
        requester: { name: customer, email: customerEmail },
        comment: {
          body: `High Priority Feedback Received:\n\n"${eventData.feedback || "N/A"}"\n\nSentiment: ${eventData.sentiment || "NEGATIVE"}\nSeverity: ${eventData.severity || "HIGH"}\nTheme: ${eventData.theme || "General"}`,
        },
        priority,
        tags: ["loop_feedback", "high_priority", eventData.sentiment?.toLowerCase() || "negative"],
      },
    };

    return await this.executeZendeskRequest(config, zendeskPayload);
  }

  private async executeZendeskRequest(config: IntegrationConfig, payload: any): Promise<DispatchResult> {
    const startTime = Date.now();
    let subdomain = (config.subdomain || config.domain || "").replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    if (!subdomain.includes(".")) subdomain = `${subdomain}.zendesk.com`;

    const url = `https://${subdomain}/api/v2/tickets.json`;
    const authHeader = `Basic ${Buffer.from(`${config.email}/token:${config.apiToken}`).toString("base64")}`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
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
          error: `Zendesk API error HTTP ${res.status}: ${text || res.statusText}`,
        };
      }
    } catch (err: any) {
      const errorMsg = err.name === "AbortError" ? "Zendesk request timed out after 5000ms" : err.message || "Zendesk HTTP request failed";
      return {
        success: false,
        durationMs: Date.now() - startTime,
        error: errorMsg,
      };
    }
  }
}
