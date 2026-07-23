import { prisma } from "@/lib/prisma";
import { encryptSecret, decryptSecret, maskSecret } from "@/lib/security/encryption";
import { checkRateLimit } from "@/lib/security/webhook-security";
import { ProviderRegistry } from "./integrations/provider-registry";
import { IntegrationType, IntegrationConfig } from "./integrations/provider-interface";

export type ConnectionStatus = "Connected" | "Disconnected" | "Testing";

export class IntegrationService {
  /**
   * Get all workspace integration states with masked sensitive credentials
   */
  static async getWorkspaceIntegrations(workspaceId: string) {
    const integrations = await prisma.integration.findMany({
      where: { workspaceId },
    });

    const defaultTypes: IntegrationType[] = ["WEBHOOK", "SLACK", "JIRA", "ZENDESK"];
    const map = new Map(integrations.map((i) => [i.type as IntegrationType, i]));

    return defaultTypes.map((type) => {
      const existing = map.get(type);
      let parsedConfig: IntegrationConfig = {};

      if (existing && existing.encryptedConfig) {
        try {
          const rawText = decryptSecret(existing.encryptedConfig);
          parsedConfig = JSON.parse(rawText || "{}");
        } catch {
          parsedConfig = {};
        }
      }

      // Mask secrets safely for UI/API response
      const safeConfig: IntegrationConfig = {
        ...parsedConfig,
        secretToken: parsedConfig.secretToken ? maskSecret(parsedConfig.secretToken) : "",
        apiToken: parsedConfig.apiToken ? maskSecret(parsedConfig.apiToken) : "",
        jiraApiToken: parsedConfig.jiraApiToken ? maskSecret(parsedConfig.jiraApiToken) : "",
      };

      return {
        type,
        enabled: existing ? existing.enabled : false,
        status: (existing ? existing.status : "Disconnected") as ConnectionStatus,
        config: safeConfig,
        updatedAt: existing ? existing.updatedAt.toISOString() : new Date().toISOString(),
      };
    });
  }

  /**
   * Get decrypted internal integration configuration for a provider
   */
  static async getRawConfig(workspaceId: string, type: IntegrationType): Promise<{
    enabled: boolean;
    status: ConnectionStatus;
    config: IntegrationConfig;
  }> {
    const record = await prisma.integration.findUnique({
      where: { workspaceId_type: { workspaceId, type } },
    });

    if (!record) {
      return { enabled: false, status: "Disconnected", config: {} };
    }

    let config: IntegrationConfig = {};
    if (record.encryptedConfig) {
      try {
        const decrypted = decryptSecret(record.encryptedConfig);
        config = JSON.parse(decrypted || "{}");
      } catch {
        config = {};
      }
    }

    return {
      enabled: record.enabled,
      status: record.status as ConnectionStatus,
      config,
    };
  }

  /**
   * Save or update integration configuration with provider validation, AES-256 encryption, and audit logging
   */
  static async updateIntegration(
    workspaceId: string,
    userId: string,
    userName: string,
    userEmail: string,
    type: IntegrationType,
    updates: {
      enabled?: boolean;
      status?: ConnectionStatus;
      config?: IntegrationConfig;
    }
  ) {
    const existing = await prisma.integration.findUnique({
      where: { workspaceId_type: { workspaceId, type } },
    });

    let currentConfig: IntegrationConfig = {};
    if (existing && existing.encryptedConfig) {
      try {
        currentConfig = JSON.parse(decryptSecret(existing.encryptedConfig) || "{}");
      } catch {
        currentConfig = {};
      }
    }

    const mergedConfig: IntegrationConfig = {
      ...currentConfig,
      ...(updates.config || {}),
    };

    // Retain original secrets if masked values (`••••`) are submitted
    if (updates.config?.secretToken && updates.config.secretToken.includes("••••")) {
      mergedConfig.secretToken = currentConfig.secretToken;
    }
    if (updates.config?.apiToken && updates.config.apiToken.includes("••••")) {
      mergedConfig.apiToken = currentConfig.apiToken;
    }
    if (updates.config?.jiraApiToken && updates.config.jiraApiToken.includes("••••")) {
      mergedConfig.jiraApiToken = currentConfig.jiraApiToken;
    }

    // Validate credentials using Provider Registry handler
    const handler = ProviderRegistry.getHandler(type);
    const validation = handler.validateCredentials(mergedConfig);
    if (!validation.valid) {
      throw new Error(validation.error || `Invalid ${type} configuration.`);
    }

    const encryptedConfig = encryptSecret(JSON.stringify(mergedConfig));
    const newStatus = updates.status || (existing?.status === "Connected" ? "Connected" : "Connected");

    const result = await prisma.integration.upsert({
      where: { workspaceId_type: { workspaceId, type } },
      update: {
        enabled: updates.enabled !== undefined ? updates.enabled : existing?.enabled ?? true,
        status: newStatus,
        encryptedConfig,
      },
      create: {
        workspaceId,
        type,
        enabled: updates.enabled !== undefined ? updates.enabled : true,
        status: newStatus,
        encryptedConfig,
      },
    });

    // Record Audit Log
    await prisma.integrationAuditLog.create({
      data: {
        workspaceId,
        integrationId: result.id,
        userId,
        userName,
        userEmail,
        action: existing ? "UPDATED_CONFIG" : "CREATED_CONFIG",
        previousState: existing ? { enabled: existing.enabled, status: existing.status } : undefined,
        newState: { enabled: result.enabled, status: result.status, type },
      },
    });

    return result;
  }

  /**
   * Test integration credentials with ProviderRegistry handler, rate limiting, and real dispatch
   */
  static async testIntegration(
    workspaceId: string,
    userId: string,
    userName: string,
    userEmail: string,
    type: IntegrationType
  ) {
    // 1. Rate limiting check
    const rateCheck = checkRateLimit(workspaceId, `test:${type}`, 5, 60000);
    if (!rateCheck.allowed) {
      throw new Error(`Rate limit exceeded for test events. Please wait ${Math.ceil((rateCheck.remainingMs || 0) / 1000)}s.`);
    }

    // 2. Fetch raw config
    const { config } = await this.getRawConfig(workspaceId, type);

    // Set temporary status to Testing
    await prisma.integration.updateMany({
      where: { workspaceId, type },
      data: { status: "Testing" },
    });

    const handler = ProviderRegistry.getHandler(type);
    const testResult = await handler.sendTestEvent(config, workspaceId);

    const finalStatus: ConnectionStatus = testResult.success ? "Connected" : "Disconnected";

    // Update status in DB
    await prisma.integration.updateMany({
      where: { workspaceId, type },
      data: { status: finalStatus, enabled: testResult.success },
    });

    const integrationRecord = await prisma.integration.findUnique({
      where: { workspaceId_type: { workspaceId, type } },
    });

    // Record Audit Log
    await prisma.integrationAuditLog.create({
      data: {
        workspaceId,
        integrationId: integrationRecord?.id,
        userId,
        userName,
        userEmail,
        action: "TESTED_CONNECTION",
        previousState: { status: "Testing" },
        newState: { status: finalStatus, success: testResult.success, durationMs: testResult.durationMs, message: testResult.message },
      },
    });

    return {
      success: testResult.success,
      status: finalStatus,
      message: testResult.message,
      durationMs: testResult.durationMs,
    };
  }

  /**
   * Get workspace audit log history
   */
  static async getAuditLogs(workspaceId: string, limit = 20) {
    return await prisma.integrationAuditLog.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  }
}
