export type IntegrationType = "WEBHOOK" | "SLACK" | "JIRA" | "ZENDESK";

export type IntegrationConfig = {
  // Webhook
  webhookUrl?: string;
  secretToken?: string;
  triggerHighPriorityOnly?: boolean;

  // Slack
  slackWebhookUrl?: string;
  channel?: string;

  // Zendesk
  subdomain?: string;
  email?: string;
  apiToken?: string;

  // Jira
  domain?: string;
  projectKey?: string;
  jiraEmail?: string;
  jiraApiToken?: string;
};

export type EventPayloadData = {
  feedbackId?: string;
  customerName?: string;
  customerEmail?: string;
  feedback?: string;
  sentiment?: string;
  severity?: string;
  priority?: string;
  theme?: string;
  createdAt?: string;
  [key: string]: any;
};

export type ValidationResult = {
  valid: boolean;
  error?: string;
};

export type TestEventResult = {
  success: boolean;
  message: string;
  durationMs: number;
  rawResponse?: any;
};

export type DispatchResult = {
  success: boolean;
  statusCode?: number;
  response?: string;
  durationMs: number;
  error?: string;
};

export interface IntegrationProviderHandler {
  type: IntegrationType;
  validateCredentials(config: IntegrationConfig): ValidationResult;
  sendTestEvent(config: IntegrationConfig, workspaceId: string): Promise<TestEventResult>;
  dispatchFeedbackEvent(config: IntegrationConfig, eventData: EventPayloadData): Promise<DispatchResult>;
}
