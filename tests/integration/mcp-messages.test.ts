/**
 * MCP Message Handling Integration Tests
 *
 * Tests that verify the server can handle MCP protocol messages correctly.
 * These tests use mocked Rally API responses to focus on MCP protocol compliance.
 */

import { ComponentFactory } from '../../src/core/ComponentFactory';
import { StdioTransport } from '../../src/transport/StdioTransport';
import { setupTestEnvironment, cleanupTestEnvironment } from '../utils/test-helpers';

describe('MCP Message Handling Integration Tests', () => {
  let factory: ComponentFactory;

  beforeAll(() => {
    setupTestEnvironment();
    factory = new ComponentFactory();
  });

  afterAll(() => {
    cleanupTestEnvironment();
  });

  describe('Server Initialization', () => {
    test('should create server without errors', () => {
      expect(() => {
        const server = factory.createServer('stdio');
        expect(server).toBeDefined();
      }).not.toThrow();
    });

    test('should validate configuration', () => {
      const config = factory.getConfigurationSummary();

      expect(config.rallyBaseUrl).toBe('https://test.rallydev.com');
      expect(config.transportType).toBe('stdio');
      expect(config.hasApiKey).toBe(true);
      expect(config.nodeEnv).toBe('test');
    });
  });

  describe('Transport Layer Setup', () => {
    test('should create StdioTransport with proper MCP server', () => {
      const transport = new StdioTransport();
      const mcpServer = transport.getServer();

      expect(mcpServer).toBeDefined();
      expect(mcpServer.setRequestHandler).toBeDefined();
      expect(typeof mcpServer.setRequestHandler).toBe('function');
    });

    test('should handle server lifecycle', async () => {
      const server = factory.createServer('stdio');

      // Should not throw during initialization (environment validation will pass in test mode)
      await expect(server.initialize()).resolves.not.toThrow();

      // Should not throw during shutdown
      await expect(server.shutdown()).resolves.not.toThrow();
    });
  });

  describe('Tool Handler Registration', () => {
    test('should register MCP tool handlers without errors', async () => {
      const server = factory.createServer('stdio');

      // Initialize should set up all tool handlers
      await expect(server.initialize()).resolves.not.toThrow();

      // Clean shutdown
      await server.shutdown();
    });
  });
});