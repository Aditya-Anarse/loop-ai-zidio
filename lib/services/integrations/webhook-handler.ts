import {
  IntegrationProviderHandler,
  IntegrationType,
  IntegrationConfig,
  ValidationResult,
  TestEventResult,
  DispatchResult,
  EventPayloadData,
} from "./provider-interface";
import { validateWebhookUrl } from "@/lib/security/webhook-security";
import { generateHmacSignature } from "@/lib/security/encryption";

export class WebhookHandler implements IntegrationProviderHandler {
  type: IntegrationType = "WEBHOOK";

  validateCredentials(config: IntegrationConfig): ValidationResult {
    const url = config.webhookUrl;
    if (!url) {
      return { valid: false, error: "Target Webhook URL is required." };
    }
    return validateWebhookUrl(url);
  }

  async sendTestEvent(config: IntegrationConfig, workspaceId: string): Promise<TestEventResult> {
    const startTime = Date.now();
    const validation = this.validateCredentials(config);
    if (!validation.valid) {
      return {
        success: false,
        message: validation.error || "Invalid Webhook configuration.",
        durationMs: Date.now() - startTime,
      };
    }

    const testPayload = {
      version: "1.0",
      eventType: "TEST_EVENT",
      timestamp: new Date().toISOString(),
      data: {
        message: "Test event dispatched from LOOP Customer Intelligence",
        workspaceId,
        timestamp: new Date().toISOString(),
      },
    };

    const dispatch = await this.executeHttpRequest(config, "TEST_EVENT", testPayload);
    return {
      success: dispatch.success,
      message: dispatch.success
        ? `Webhook test event accepted (HTTP ${dispatch.statusCode || 200}).`
        : dispatch.error || "Webhook HTTP request failed.",
      durationMs: dispatch.durationMs,
      rawResponse: dispatch.response,
    };
  }

  async dispatchFeedbackEvent(config: IntegrationConfig, eventData: EventPayloadData): Promise<DispatchResult> {
    const validation = this.validateCredentials(config);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error || "Invalid Webhook configuration.",
        durationMs: 0,
      };
    }

    const payload = {
      version: "1.0",
      eventType: "HIGH_PRIORITY_FEEDBACK",
      timestamp: new Date().toISOString(),
      data: eventData,
    };

    return await this.executeHttpRequest(config, "HIGH_PRIORITY_FEEDBACK", payload);
  }

  private async executeHttpRequest(
    config: IntegrationConfig,
    eventType: string,
    payloadObj: any
  ): Promise<DispatchResult> {
    const startTime = Date.now();
    const url = config.webhookUrl!;
    const payloadStr = JSON.stringify(payloadObj);
    const { header } = generateHmacSignature(config.secretToken || "", payloadStr);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-LOOP-Signature": header,
          "X-LOOP-Event": eventType,
          "User-Agent": "LOOP-Webhook-Dispatcher/1.0",
        },
        body: payloadStr,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const responseText = (await res.text()).slice(0, 1000);

      if (res.ok || res.status < 400) {
        return {
          success: true,
          statusCode: res.status,
          response: responseText,
          durationMs: Date.now() - startTime,
        };
      } else {
        return {
          success: false,
          statusCode: res.status,
          response: responseText,
          durationMs: Date.now() - startTime,
          error: `HTTP ${res.status}: ${res.statusText}`,
        };
      }
    } catch (err: any) {
      const errorMsg = err.name === "AbortError" ? "Request timed out after 5000ms" : err.message || "Network request failed";
      return {
        success: false,
        durationMs: Date.now() - startTime,
        error: errorMsg,
      };
    }
  }
}
