import { IntegrationType, IntegrationProviderHandler } from "./provider-interface";
import { WebhookHandler } from "./webhook-handler";
import { SlackHandler } from "./slack-handler";
import { JiraHandler } from "./jira-handler";
import { ZendeskHandler } from "./zendesk-handler";

export class ProviderRegistry {
  private static handlers = new Map<IntegrationType, IntegrationProviderHandler>([
    ["WEBHOOK", new WebhookHandler()],
    ["SLACK", new SlackHandler()],
    ["JIRA", new JiraHandler()],
    ["ZENDESK", new ZendeskHandler()],
  ]);

  static getHandler(type: IntegrationType): IntegrationProviderHandler {
    const handler = this.handlers.get(type);
    if (!handler) {
      throw new Error(`Unsupported integration provider type: ${type}`);
    }
    return handler;
  }

  static getAllHandlers(): IntegrationProviderHandler[] {
    return Array.from(this.handlers.values());
  }
}
