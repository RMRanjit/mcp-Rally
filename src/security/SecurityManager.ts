/**
 * Security Manager Implementation
 *
 * Handles API key authentication, secure headers, and data sanitization.
 * Implements security requirements for Rally API integration.
 *
 * Requirements: req-011 (API Key Authentication), req-012 (Secure Communication), req-013 (Integration Headers)
 */

import { ISecurityManager } from '../core/interfaces';

export class SecurityManager implements ISecurityManager {
  private apiKey: string | undefined;
  private integrationVendor: string;
  private integrationVersion: string;

  constructor() {
    this.apiKey = process.env['RALLY_API_KEY'];
    this.integrationVendor = process.env['RALLY_INTEGRATION_VENDOR'] || 'AI-Assistant';
    this.integrationVersion = process.env['npm_package_version'] || '1.0.0';
  }

  async validateApiKey(providedApiKey?: string): Promise<boolean> {
    const keyToValidate = providedApiKey || this.apiKey;

    if (!keyToValidate) {
      throw new Error('RALLY_API_KEY environment variable is required but not set');
    }

    if (keyToValidate.length < 10) {
      throw new Error('RALLY_API_KEY appears to be invalid (too short)');
    }

    // API key format validation (Rally API keys are typically long alphanumeric strings)
    const apiKeyPattern = /^[A-Za-z0-9_-]+$/;
    if (!apiKeyPattern.test(keyToValidate)) {
      throw new Error('RALLY_API_KEY contains invalid characters');
    }

    return true;
  }

  getAuthHeaders(providedApiKey?: string): Record<string, string> {
    const keyToUse = providedApiKey || this.apiKey;

    if (!keyToUse) {
      throw new Error('API key not available. Provide an API key or set RALLY_API_KEY environment variable.');
    }

    return {
      'zsessionid': keyToUse,
      'X-RallyIntegrationName': 'mcp-rally',
      'X-RallyIntegrationVendor': this.integrationVendor,
      'X-RallyIntegrationVersion': this.integrationVersion,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
  }

  sanitizeLogData(data: unknown): unknown {
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeLogData(item));
    }

    const sanitized: Record<string, unknown> = {};
    const sensitiveFields = [
      'authorization',
      'apikey',
      'api_key',
      'password',
      'token',
      'secret',
      'zsessionid'
    ];

    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      const lowerKey = key.toLowerCase();

      if (sensitiveFields.some(field => lowerKey.includes(field))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeLogData(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Validates that required environment variables are present for secure operation
   */
  validateEnvironment(): void {
    const requiredEnvVars = ['RALLY_API_KEY'];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

    if (missingVars.length > 0) {
      throw new Error(
        `Missing required environment variables: ${missingVars.join(', ')}. ` +
        'Please configure your environment before starting the server.'
      );
    }
  }

  /**
   * Gets the configured Rally base URL (defaults to Rally's production instance)
   */
  getRallyBaseUrl(): string {
    return process.env['RALLY_BASE_URL'] || 'https://rally1.rallydev.com';
  }
}