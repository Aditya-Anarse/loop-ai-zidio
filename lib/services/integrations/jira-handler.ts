import {
  IntegrationProviderHandler,
  IntegrationType,
  IntegrationConfig,
  ValidationResult,
  TestEventResult,
  DispatchResult,
  EventPayloadData,
} from "./provider-interface";

export class JiraHandler implements IntegrationProviderHandler {
  type: IntegrationType = "JIRA";

  validateCredentials(config: IntegrationConfig): ValidationResult {
    const domain = config.domain;
    if (!domain) {
      return { valid: false, error: "Jira Domain is required (e.g. company.atlassian.net)." };
    }
    if (!config.projectKey) {
      return { valid: false, error: "Jira Project Key is required (e.g. LOOP or ENG)." };
    }
    const email = config.jiraEmail || config.email;
    if (!email) {
      return { valid: false, error: "Jira Account Email is required." };
    }
    const token = config.jiraApiToken || config.apiToken;
    if (!token) {
      return { valid: false, error: "Jira API Token is required." };
    }
    return { valid: true };
  }

  async sendTestEvent(config: IntegrationConfig, workspaceId: string): Promise<TestEventResult> {
    const startTime = Date.now();
    const validation = this.validateCredentials(config);
    if (!validation.valid) {
      return {
        success: false,
        message: validation.error || "Invalid Jira configuration.",
        durationMs: Date.now() - startTime,
      };
    }

    const testIssuePayload = {
      fields: {
        project: { key: config.projectKey },
        summary: `[LOOP Test] Jira Connection Check for ${workspaceId}`,
        description: {
          type: "doc",
          version: 1,
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: `Jira integration connection test verified from LOOP Customer Intelligence at ${new Date().toISOString()}.`,
                },
              ],
            },
          ],
        },
        issuetype: { name: "Task" },
      },
    };

    const dispatch = await this.executeJiraRequest(config, testIssuePayload);
    return {
      success: dispatch.success,
      message: dispatch.success
        ? `Jira issue creation verified for project board ${config.projectKey}.`
        : dispatch.error || "Jira API connection failed.",
      durationMs: dispatch.durationMs,
      rawResponse: dispatch.response,
    };
  }

  async dispatchFeedbackEvent(config: IntegrationConfig, eventData: EventPayloadData): Promise<DispatchResult> {
    const validation = this.validateCredentials(config);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error || "Invalid Jira configuration.",
        durationMs: 0,
      };
    }

    const customer = eventData.customerName || "Customer";
    const theme = eventData.theme || "General";
    const summary = `[LOOP Alert] ${theme} Issue Report from ${customer}`;

    const jiraPayload = {
      fields: {
        project: { key: config.projectKey },
        summary,
        description: {
          type: "doc",
          version: 1,
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: `Customer Feedback:\n"${eventData.feedback || "No content"}"\n\nSentiment: ${eventData.sentiment || "NEGATIVE"}\nSeverity: ${eventData.severity || "HIGH"}\nCustomer: ${customer}`,
                },
              ],
            },
          ],
        },
        issuetype: { name: "Bug" },
      },
    };

    return await this.executeJiraRequest(config, jiraPayload);
  }

  private async executeJiraRequest(config: IntegrationConfig, payload: any): Promise<DispatchResult> {
    const startTime = Date.now();
    let domain = (config.domain || "").replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    if (!domain.includes(".")) domain = `${domain}.atlassian.net`;

    const url = `https://${domain}/rest/api/3/issue`;
    const email = config.jiraEmail || config.email;
    const token = config.jiraApiToken || config.apiToken;
    const authHeader = `Basic ${Buffer.from(`${email}:${token}`).toString("base64")}`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
          Accept: "application/json",
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
          error: `Jira API error HTTP ${res.status}: ${text || res.statusText}`,
        };
      }
    } catch (err: any) {
      const errorMsg = err.name === "AbortError" ? "Jira request timed out after 5000ms" : err.message || "Jira HTTP request failed";
      return {
        success: false,
        durationMs: Date.now() - startTime,
        error: errorMsg,
      };
    }
  }
}
