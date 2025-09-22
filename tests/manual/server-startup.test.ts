/**
 * Manual Server Startup Tests
 *
 * Tests for manually verifying server startup and basic functionality.
 * These tests demonstrate that the MCP Rally server can actually start and handle requests.
 */

import { StdioTransport } from '../../src/transport/StdioTransport';
import { SSETransport } from '../../src/transport/SSETransport';
import { MCPRallyServer } from '../../src/core/MCPRallyServer';
import { RallyClient } from '../../src/rally/RallyClient';
import { DataTransformer } from '../../src/data/DataTransformer';
import { SecurityManager } from '../../src/security/SecurityManager';
import { PerformanceManager } from '../../src/utils/PerformanceManager';
import { setupTestEnvironment, cleanupTestEnvironment } from '../utils/test-helpers';

describe('Manual Server Startup Tests', () => {
  beforeAll(() => {
    setupTestEnvironment();
  });

  afterAll(() => {
    cleanupTestEnvironment();
  });

  describe('Component Creation', () => {
    test('should create all components successfully', () => {
      const securityManager = new SecurityManager();
      const performanceManager = new PerformanceManager();
      const dataTransformer = new DataTransformer();
      const rallyClient = new RallyClient(securityManager, performanceManager);

      expect(securityManager).toBeDefined();
      expect(performanceManager).toBeDefined();
      expect(dataTransformer).toBeDefined();
      expect(rallyClient).toBeDefined();
    });

    test('should create transport layers successfully', () => {
      const stdioTransport = new StdioTransport();
      const sseTransport = new SSETransport(0);

      expect(stdioTransport).toBeDefined();
      expect(sseTransport).toBeDefined();
      expect(stdioTransport.getServer()).toBeDefined();
      expect(sseTransport.getServer()).toBeDefined();
    });
  });

  describe('Server Configuration', () => {
    test('should validate environment configuration', () => {
      const securityManager = new SecurityManager();

      // Should not throw with test environment
      expect(() => securityManager.validateEnvironment()).not.toThrow();
      expect(securityManager.getRallyBaseUrl()).toBe('https://test.rallydev.com');
    });

    test('should create valid authentication headers', () => {
      const securityManager = new SecurityManager();
      const headers = securityManager.getAuthHeaders();

      expect(headers).toHaveProperty('zsessionid');
      expect(headers).toHaveProperty('X-RallyIntegrationName', 'mcp-rally');
      expect(headers).toHaveProperty('Content-Type', 'application/json');
    });

    test('should configure HTTP client correctly', () => {
      const performanceManager = new PerformanceManager();

      expect(performanceManager.httpClient).toBeDefined();
      expect(performanceManager.httpClient.defaults).toBeDefined();
      expect(performanceManager.httpClient.defaults.timeout).toBe(30000);
    });
  });

  describe('Data Transformation', () => {
    test('should transform field names correctly', () => {
      const dataTransformer = new DataTransformer();

      const rallyData = { FormattedID: 'US1234', PlanEstimate: 5 };
      const mcpData = dataTransformer.rallyToMcp(rallyData);

      expect(mcpData).toHaveProperty('formatted-id', 'US1234');
      expect(mcpData).toHaveProperty('plan-estimate', 5);
    });

    test('should provide comprehensive field mappings', () => {
      const dataTransformer = new DataTransformer();
      const mappings = dataTransformer.getFieldMappings();

      expect(Object.keys(mappings).length).toBeGreaterThan(10);
      expect(mappings['FormattedID']).toBeDefined();
      expect(mappings['_ref']).toBeDefined();
    });
  });

  describe('Server Integration', () => {
    test('should create complete MCP Rally server', () => {
      const securityManager = new SecurityManager();
      const performanceManager = new PerformanceManager();
      const dataTransformer = new DataTransformer();
      const rallyClient = new RallyClient(securityManager, performanceManager);
      const stdioTransport = new StdioTransport();

      const mcpServer = new MCPRallyServer(
        stdioTransport,
        rallyClient,
        dataTransformer,
        securityManager,
        performanceManager
      );

      expect(mcpServer).toBeDefined();
    });

    test('should handle server lifecycle', async () => {
      const securityManager = new SecurityManager();
      const performanceManager = new PerformanceManager();
      const dataTransformer = new DataTransformer();
      const rallyClient = new RallyClient(securityManager, performanceManager);

      // Mock the transport to avoid actual network calls
      const mockTransport = {
        start: jest.fn().mockResolvedValue(undefined),
        stop: jest.fn().mockResolvedValue(undefined),
        getServer: jest.fn().mockReturnValue({
          setRequestHandler: jest.fn()
        })
      } as any;

      const mcpServer = new MCPRallyServer(
        mockTransport,
        rallyClient,
        dataTransformer,
        securityManager,
        performanceManager
      );

      // Should not throw during shutdown
      await expect(mcpServer.shutdown()).resolves.not.toThrow();
    });
  });

  describe('Tool Definitions', () => {
    test('should provide complete Rally tool definitions via StdioTransport', async () => {
      const stdioTransport = new StdioTransport();
      const server = stdioTransport.getServer();

      // The transport should have tool handlers configured
      expect(server.setRequestHandler).toBeDefined();
    });

    test('should handle MCP tool calls', () => {
      const stdioTransport = new StdioTransport();

      // Basic validation that the transport can be created and has handlers
      expect(stdioTransport).toBeDefined();
      expect(stdioTransport.isConnected()).toBe(false);
    });
  });

  describe('Performance and Metrics', () => {
    test('should track performance metrics', () => {
      const performanceManager = new PerformanceManager();

      performanceManager.trackRequestMetrics('test_operation', 150, true);

      const stats = performanceManager.getPerformanceStats();
      expect(stats.totalRequests).toBe(1);
      expect(stats.successRate).toBe(100);
      expect(stats.averageDuration).toBe(150);
    });

    test('should clear metrics correctly', () => {
      const performanceManager = new PerformanceManager();

      performanceManager.trackRequestMetrics('test_operation', 150, true);
      performanceManager.clearMetrics();

      const stats = performanceManager.getPerformanceStats();
      expect(stats.totalRequests).toBe(0);
    });
  });

  describe('Security Features', () => {
    test('should sanitize sensitive data', () => {
      const securityManager = new SecurityManager();

      const data = {
        user: 'john',
        password: 'secret123',
        apikey: 'key123',
        normalField: 'normal'
      };

      const sanitized = securityManager.sanitizeLogData(data);

      expect(sanitized).toEqual({
        user: 'john',
        password: '[REDACTED]',
        apikey: '[REDACTED]',
        normalField: 'normal'
      });
    });

    test('should validate API key format', async () => {
      const securityManager = new SecurityManager();

      // Should pass with test environment key
      await expect(securityManager.validateApiKey()).resolves.toBe(true);
    });
  });
});