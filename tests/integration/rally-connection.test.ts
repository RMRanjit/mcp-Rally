/**
 * Rally Connection Integration Tests
 *
 * Tests that verify the server can actually connect to Rally API with real credentials.
 * These tests require a valid RALLY_API_KEY environment variable.
 *
 * NOTE: These tests use REAL Rally API credentials and make actual API calls.
 * They are designed to validate that the server can authenticate and communicate
 * with the Rally production instance.
 */

import { SecurityManager } from '../../src/security/SecurityManager';
import { PerformanceManager } from '../../src/utils/PerformanceManager';
import { RallyClient } from '../../src/rally/RallyClient';
import { config } from 'dotenv';

// Load environment variables (but don't override with test values)
config();

// Store original environment values to restore them after tests
const originalEnv = {
  RALLY_API_KEY: process.env.RALLY_API_KEY,
  RALLY_BASE_URL: process.env.RALLY_BASE_URL,
  RALLY_INTEGRATION_VENDOR: process.env.RALLY_INTEGRATION_VENDOR
};

describe('Rally Connection Integration Tests', () => {
  let securityManager: SecurityManager;
  let performanceManager: PerformanceManager;
  let rallyClient: RallyClient;

  beforeAll(() => {
    // The Jest setup file (tests/setup.ts) sets test environment variables
    // We need to override them for real integration testing

    // Force production Rally settings (override test setup)
    process.env.RALLY_BASE_URL = 'https://rally1.rallydev.com';
    process.env.RALLY_INTEGRATION_VENDOR = 'AI-Assistant';

    // Ensure we have the real API key from the original environment
    if (originalEnv.RALLY_API_KEY) {
      process.env.RALLY_API_KEY = originalEnv.RALLY_API_KEY;
    }

    // Create components AFTER setting environment variables
    securityManager = new SecurityManager();
    performanceManager = new PerformanceManager();
    rallyClient = new RallyClient(securityManager, performanceManager);
  });

  afterAll(() => {
    // Restore original environment
    Object.assign(process.env, originalEnv);
  });

  describe('Authentication', () => {
    test('should authenticate with real Rally API credentials', async () => {
      const apiKey = process.env['RALLY_API_KEY'];

      if (!apiKey) {
        console.warn('Skipping Rally connection test: RALLY_API_KEY not set');
        return;
      }

      // Use console.error for debugging (not mocked)
      console.error('DEBUG: Testing with API key length:', apiKey.length);
      console.error('DEBUG: API key starts with:', apiKey.substring(0, 10));
      console.error('DEBUG: Rally base URL:', rallyClient.getBaseUrl());

      // Should not throw an error
      await expect(rallyClient.authenticate(apiKey)).resolves.not.toThrow();

      // Should be authenticated after successful auth
      expect(rallyClient.isAuthenticatedClient()).toBe(true);
    }, 30000); // Longer timeout for real API calls

    test('should have correct base URL configured', () => {
      const baseUrl = rallyClient.getBaseUrl();
      expect(baseUrl).toBe('https://rally1.rallydev.com');
    });
  });

  describe('Basic API Operations', () => {
    beforeEach(async () => {
      const apiKey = process.env['RALLY_API_KEY'];
      if (!apiKey) {
        return;
      }

      // Ensure we're authenticated before each test
      if (!rallyClient.isAuthenticatedClient()) {
        await rallyClient.authenticate(apiKey);
      }
    });

    test('should query workspaces successfully', async () => {
      const apiKey = process.env['RALLY_API_KEY'];

      if (!apiKey) {
        console.warn('Skipping workspace query test: RALLY_API_KEY not set');
        return;
      }

      const response = await rallyClient.query('Workspace', {
        fetch: 'Name,State',
        pagesize: 5
      });

      expect(response.QueryResult).toBeDefined();
      expect(response.QueryResult.Errors).toHaveLength(0);
      expect(response.QueryResult.Results).toBeDefined();
      expect(Array.isArray(response.QueryResult.Results)).toBe(true);
    }, 30000);

    test('should query projects successfully', async () => {
      const apiKey = process.env['RALLY_API_KEY'];

      if (!apiKey) {
        console.warn('Skipping project query test: RALLY_API_KEY not set');
        return;
      }

      const response = await rallyClient.query('Project', {
        fetch: 'Name,State,Owner',
        pagesize: 10
      });

      expect(response.QueryResult).toBeDefined();
      expect(response.QueryResult.Errors).toHaveLength(0);
      expect(response.QueryResult.Results).toBeDefined();
      expect(Array.isArray(response.QueryResult.Results)).toBe(true);
    }, 30000);

    test('should handle authentication errors gracefully', async () => {
      const invalidApiKey = 'invalid_api_key_12345';

      // Create a new client to test invalid credentials
      const testClient = new RallyClient(securityManager, performanceManager);

      await expect(testClient.authenticate(invalidApiKey)).rejects.toThrow();
      expect(testClient.isAuthenticatedClient()).toBe(false);
    }, 30000);
  });

  describe('Error Handling', () => {
    test('should handle network timeouts gracefully', async () => {
      const apiKey = process.env['RALLY_API_KEY'];

      if (!apiKey) {
        console.warn('Skipping timeout test: RALLY_API_KEY not set');
        return;
      }

      // Create a client with very short timeout
      const shortTimeoutClient = new RallyClient(securityManager, performanceManager);
      shortTimeoutClient['httpClient'].defaults.timeout = 1; // 1ms timeout

      await expect(shortTimeoutClient.authenticate(apiKey)).rejects.toThrow();
    }, 10000);
  });
});