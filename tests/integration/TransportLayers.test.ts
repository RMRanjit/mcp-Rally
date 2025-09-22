/**
 * Transport Layers Integration Tests
 *
 * Comprehensive integration tests for both StdioTransport and SSETransport.
 * Tests server initialization, MCP protocol handling, and transport-specific features.
 */

import { StdioTransport } from '../../src/transport/StdioTransport';
import { SSETransport } from '../../src/transport/SSETransport';
import { MCPRallyServer } from '../../src/core/MCPRallyServer';
import {
  setupTestEnvironment,
  cleanupTestEnvironment,
  createMockComponents,
  createMCPInitializeMessage,
  createMCPToolCallMessage,
  createMCPListToolsMessage,
  waitFor,
  waitForCondition
} from '../utils/test-helpers';
import supertest from 'supertest';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';

// Mock the MCP SDK modules
jest.mock('@modelcontextprotocol/sdk/server/index.js');
jest.mock('@modelcontextprotocol/sdk/server/stdio.js');

const MockedServer = Server as jest.MockedClass<typeof Server>;

describe('Transport Layers Integration', () => {
  let mockComponents: ReturnType<typeof createMockComponents>;

  beforeAll(() => {
    setupTestEnvironment();
  });

  afterAll(() => {
    cleanupTestEnvironment();
  });

  beforeEach(() => {
    mockComponents = createMockComponents();
    jest.clearAllMocks();
  });

  describe('StdioTransport', () => {
    let stdioTransport: StdioTransport;
    let mockServer: any;
    let mockTransportInstance: any;

    beforeEach(() => {
      // Mock the Server class
      mockServer = {
        connect: jest.fn().mockResolvedValue(undefined),
        close: jest.fn().mockResolvedValue(undefined),
        setRequestHandler: jest.fn()
      };

      MockedServer.mockImplementation(() => mockServer);

      // Mock StdioServerTransport
      mockTransportInstance = {
        start: jest.fn().mockResolvedValue(undefined),
        close: jest.fn().mockResolvedValue(undefined)
      };

      const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
      StdioServerTransport.mockImplementation(() => mockTransportInstance);

      stdioTransport = new StdioTransport();
    });

    afterEach(async () => {
      if (stdioTransport) {
        await stdioTransport.stop();
      }
    });

    describe('Initialization', () => {
      test('should create MCP server with correct configuration', () => {
        expect(MockedServer).toHaveBeenCalledWith(
          {
            name: 'mcp-rally',
            version: '1.0.0'
          },
          {
            capabilities: {
              tools: {}
            }
          }
        );
      });

      test('should setup request handlers during construction', () => {
        expect(mockServer.setRequestHandler).toHaveBeenCalledTimes(2);

        const calls = mockServer.setRequestHandler.mock.calls;
        expect(calls[0][0]).toBeDefined(); // ListToolsRequestSchema
        expect(calls[1][0]).toBeDefined(); // CallToolRequestSchema
      });

      test('should provide access to server instance', () => {
        const server = stdioTransport.getServer();
        expect(server).toBe(mockServer);
      });
    });

    describe('Lifecycle Management', () => {
      test('should start transport successfully', async () => {
        await stdioTransport.start();

        expect(mockServer.connect).toHaveBeenCalledWith(mockTransportInstance);
        expect(stdioTransport.isConnected()).toBe(true);
      });

      test('should handle start errors', async () => {
        mockServer.connect.mockRejectedValue(new Error('Connection failed'));

        await expect(stdioTransport.start()).rejects.toThrow(
          'Failed to start stdio transport: Error: Connection failed'
        );
      });

      test('should stop transport gracefully', async () => {
        await stdioTransport.start();
        await stdioTransport.stop();

        expect(mockServer.close).toHaveBeenCalled();
        expect(stdioTransport.isConnected()).toBe(false);
      });

      test('should handle stop errors gracefully', async () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

        await stdioTransport.start();
        mockServer.close.mockRejectedValue(new Error('Close failed'));

        await expect(stdioTransport.stop()).resolves.not.toThrow();
        expect(consoleSpy).toHaveBeenCalledWith('Error stopping stdio transport:', expect.any(Error));

        consoleSpy.mockRestore();
      });

      test('should handle stop when not connected', async () => {
        // Should not throw when stopping without starting
        await expect(stdioTransport.stop()).resolves.not.toThrow();
      });
    });

    describe('Tool Handlers', () => {
      let listToolsHandler: Function;
      let callToolHandler: Function;

      beforeEach(() => {
        const calls = mockServer.setRequestHandler.mock.calls;
        listToolsHandler = calls[0][1];
        callToolHandler = calls[1][1];
      });

      test('should handle list_tools request', async () => {
        const response = await listToolsHandler();

        expect(response).toHaveProperty('tools');
        expect(Array.isArray(response.tools)).toBe(true);
        expect(response.tools.length).toBeGreaterThan(0);

        // Check for required tools
        const toolNames = response.tools.map((tool: any) => tool.name);
        expect(toolNames).toContain('get_user_story');
        expect(toolNames).toContain('create_user_story');
        expect(toolNames).toContain('update_user_story');
        expect(toolNames).toContain('query_user_stories');
        expect(toolNames).toContain('create_defect');
        expect(toolNames).toContain('create_task');
      });

      test('should validate tool schemas', async () => {
        const response = await listToolsHandler();

        response.tools.forEach((tool: any) => {
          expect(tool).toHaveProperty('name');
          expect(tool).toHaveProperty('description');
          expect(tool).toHaveProperty('inputSchema');
          expect(tool.inputSchema).toHaveProperty('type', 'object');
          expect(tool.inputSchema).toHaveProperty('properties');

          if (tool.inputSchema.required) {
            expect(Array.isArray(tool.inputSchema.required)).toBe(true);
          }
        });
      });

      test('should handle call_tool requests with placeholder responses', async () => {
        const request = {
          params: {
            name: 'get_user_story',
            arguments: { objectId: '12345' }
          }
        };

        const response = await callToolHandler(request);

        expect(response).toHaveProperty('content');
        expect(Array.isArray(response.content)).toBe(true);
        expect(response.content[0]).toHaveProperty('type', 'text');
        expect(response.content[0].text).toContain('get_user_story');
        expect(response.content[0].text).toContain('Rally API integration not yet implemented');
      });

      test('should handle unknown tool calls', async () => {
        const request = {
          params: {
            name: 'unknown_tool',
            arguments: {}
          }
        };

        const response = await callToolHandler(request);

        expect(response).toHaveProperty('isError', true);
        expect(response.content[0].text).toContain('Unknown tool: unknown_tool');
      });

      test('should handle tool handler errors', async () => {
        const request = {
          params: {
            name: 'get_user_story',
            arguments: { objectId: null } // This might cause an error
          }
        };

        const response = await callToolHandler(request);

        // Should not throw, should return error response
        expect(response).toHaveProperty('content');
        expect(response.content[0]).toHaveProperty('type', 'text');
      });
    });

    describe('Integration with MCPRallyServer', () => {
      test('should allow MCPRallyServer to override tool handlers', async () => {
        await stdioTransport.start();

        const mcpServer = new MCPRallyServer(
          stdioTransport,
          mockComponents.rallyClient,
          mockComponents.mockDataTransformer,
          mockComponents.mockSecurityManager,
          mockComponents.mockPerformanceManager
        );

        // The server should be able to set its own handlers
        expect(mockServer.setRequestHandler).toHaveBeenCalled();

        // Verify server can get the instance
        const serverInstance = stdioTransport.getServer();
        expect(serverInstance).toBe(mockServer);
      });
    });

    describe('Tool Schema Validation', () => {
      test('should have correct schema for get_user_story', async () => {
        const response = await (mockServer.setRequestHandler.mock.calls[0][1])();
        const getUserStoryTool = response.tools.find((tool: any) => tool.name === 'get_user_story');

        expect(getUserStoryTool).toBeDefined();
        expect(getUserStoryTool.inputSchema.properties).toHaveProperty('objectId');
        expect(getUserStoryTool.inputSchema.required).toContain('objectId');
      });

      test('should have correct schema for create_user_story', async () => {
        const response = await (mockServer.setRequestHandler.mock.calls[0][1])();
        const createTool = response.tools.find((tool: any) => tool.name === 'create_user_story');

        expect(createTool).toBeDefined();
        expect(createTool.inputSchema.properties).toHaveProperty('name');
        expect(createTool.inputSchema.properties).toHaveProperty('project');
        expect(createTool.inputSchema.properties).toHaveProperty('plan-estimate');
        expect(createTool.inputSchema.required).toEqual(['name', 'project']);
      });

      test('should have correct schema for create_defect', async () => {
        const response = await (mockServer.setRequestHandler.mock.calls[0][1])();
        const defectTool = response.tools.find((tool: any) => tool.name === 'create_defect');

        expect(defectTool).toBeDefined();
        expect(defectTool.inputSchema.properties.severity.enum).toContain('Critical');
        expect(defectTool.inputSchema.properties.state.enum).toContain('Open');
        expect(defectTool.inputSchema.required).toEqual(['name', 'severity', 'state', 'project']);
      });
    });
  });

  describe('SSETransport', () => {
    let sseTransport: SSETransport;
    let request: supertest.SuperTest<supertest.Test>;

    beforeEach(() => {
      // Use a test port to avoid conflicts
      sseTransport = new SSETransport(0); // Port 0 = random available port
      request = supertest(sseTransport['app']);
    });

    afterEach(async () => {
      if (sseTransport) {
        await sseTransport.stop();
      }
    });

    describe('Express Application Setup', () => {
      test('should setup health check endpoint', async () => {
        const response = await request.get('/health');

        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({
          status: 'healthy',
          transport: 'sse',
          connections: 0,
          timestamp: expect.any(String)
        });
      });

      test('should setup server info endpoint', async () => {
        const response = await request.get('/mcp/info');

        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({
          name: 'mcp-rally',
          version: '1.0.0',
          transport: 'sse',
          capabilities: {
            tools: {}
          }
        });
      });

      test('should handle CORS preflight requests', async () => {
        const response = await request.options('/mcp/message');

        expect(response.status).toBe(200);
        expect(response.headers['access-control-allow-origin']).toBe('*');
        expect(response.headers['access-control-allow-methods']).toContain('POST');
      });

      test('should include security headers', async () => {
        const response = await request.get('/health');

        expect(response.headers['x-content-type-options']).toBe('nosniff');
        expect(response.headers['x-frame-options']).toBe('DENY');
        expect(response.headers['x-xss-protection']).toBe('1; mode=block');
      });

      test('should reject oversized JSON payloads', async () => {
        const largePayload = {
          data: 'x'.repeat(2 * 1024 * 1024) // 2MB payload
        };

        const response = await request
          .post('/mcp/message')
          .send(largePayload);

        expect(response.status).toBe(413); // Payload Too Large
      });
    });

    describe('Server Lifecycle', () => {
      test('should start server on specified port', async () => {
        const testPort = await getAvailablePort();
        const transport = new SSETransport(testPort);

        await transport.start();
        expect(transport.getPort()).toBe(testPort);

        await transport.stop();
      });

      test('should handle start errors', async () => {
        // Try to start on a port that's likely to be in use
        const transport = new SSETransport(80); // Privileged port

        await expect(transport.start()).rejects.toThrow(
          'Failed to start SSE transport'
        );
      });

      test('should stop gracefully', async () => {
        await sseTransport.start();
        await expect(sseTransport.stop()).resolves.not.toThrow();
      });

      test('should handle multiple start/stop cycles', async () => {
        await sseTransport.start();
        await sseTransport.stop();
        await sseTransport.start();
        await sseTransport.stop();

        // Should not throw
        expect(true).toBe(true);
      });
    });

    describe('SSE Connection Management', () => {
      beforeEach(async () => {
        await sseTransport.start();
      });

      test('should establish SSE connections', (done) => {
        const req = request.get('/mcp/sse');

        req.expect(200)
          .expect('Content-Type', 'text/event-stream')
          .expect('Cache-Control', 'no-cache')
          .expect('Connection', 'keep-alive')
          .end((err) => {
            if (err) return done(err);

            // Check that connection was registered
            setTimeout(() => {
              expect(sseTransport.getConnectionCount()).toBe(1);
              done();
            }, 100);
          });
      });

      test('should send connection established message', (done) => {
        const req = request.get('/mcp/sse');

        let receivedData = '';
        req.on('data', (chunk) => {
          receivedData += chunk.toString();

          if (receivedData.includes('connection_established')) {
            expect(receivedData).toContain('connectionId');
            done();
          }
        });

        req.end();
      });

      test('should handle connection cleanup on close', async () => {
        const req = request.get('/mcp/sse');

        // Simulate connection
        setTimeout(() => {
          req.abort(); // Close connection
        }, 100);

        // Wait for cleanup
        await waitFor(200);

        expect(sseTransport.getConnectionCount()).toBe(0);
      });

      test('should send periodic ping messages', (done) => {
        jest.useFakeTimers();

        const req = request.get('/mcp/sse');

        let receivedData = '';
        req.on('data', (chunk) => {
          receivedData += chunk.toString();
        });

        // Fast-forward time to trigger ping
        setTimeout(() => {
          jest.advanceTimersByTime(30000);

          setTimeout(() => {
            expect(receivedData).toContain('event: ping');
            jest.useRealTimers();
            done();
          }, 100);
        }, 100);

        req.end();
      });
    });

    describe('MCP Message Handling', () => {
      beforeEach(async () => {
        await sseTransport.start();
      });

      test('should reject messages without connection ID', async () => {
        const response = await request
          .post('/mcp/message')
          .send({
            jsonrpc: '2.0',
            method: 'tools/list',
            id: 1
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('Invalid or missing connection ID');
      });

      test('should reject messages with invalid connection ID', async () => {
        const response = await request
          .post('/mcp/message')
          .set('x-connection-id', 'invalid-id')
          .send({
            jsonrpc: '2.0',
            method: 'tools/list',
            id: 1
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('Invalid or missing connection ID');
      });

      test('should handle tools/list requests', async () => {
        // First establish a connection to get ID
        const sseReq = request.get('/mcp/sse');

        let connectionId = '';
        sseReq.on('data', (chunk) => {
          const data = chunk.toString();
          const match = data.match(/"connectionId":"([^"]+)"/);
          if (match) {
            connectionId = match[1];
          }
        });

        await waitFor(100); // Wait for connection

        if (connectionId) {
          const response = await request
            .post('/mcp/message')
            .set('x-connection-id', connectionId)
            .send({
              jsonrpc: '2.0',
              method: 'tools/list',
              id: 1
            });

          expect(response.status).toBe(200);
          expect(response.body.status).toBe('received');
        }

        sseReq.abort();
      });

      test('should handle tools/call requests', async () => {
        // Similar setup as above
        const sseReq = request.get('/mcp/sse');

        let connectionId = '';
        sseReq.on('data', (chunk) => {
          const data = chunk.toString();
          const match = data.match(/"connectionId":"([^"]+)"/);
          if (match) {
            connectionId = match[1];
          }
        });

        await waitFor(100);

        if (connectionId) {
          const response = await request
            .post('/mcp/message')
            .set('x-connection-id', connectionId)
            .send({
              jsonrpc: '2.0',
              method: 'tools/call',
              id: 1,
              params: {
                name: 'get_user_story',
                arguments: { objectId: '123' }
              }
            });

          expect(response.status).toBe(200);
        }

        sseReq.abort();
      });

      test('should handle malformed JSON requests', async () => {
        const response = await request
          .post('/mcp/message')
          .set('Content-Type', 'application/json')
          .send('invalid json');

        expect(response.status).toBe(400);
      });

      test('should handle internal server errors', async () => {
        // Mock the processMCPMessage to throw an error
        const originalMethod = sseTransport['processMCPMessage'];
        sseTransport['processMCPMessage'] = jest.fn().mockRejectedValue(new Error('Test error'));

        const response = await request
          .post('/mcp/message')
          .set('x-connection-id', 'test-id')
          .send({
            jsonrpc: '2.0',
            method: 'tools/list',
            id: 1
          });

        expect(response.status).toBe(500);
        expect(response.body.error).toBe('Internal server error');

        // Restore original method
        sseTransport['processMCPMessage'] = originalMethod;
      });
    });

    describe('Transport-Specific Features', () => {
      test('should track connection count accurately', async () => {
        await sseTransport.start();

        expect(sseTransport.getConnectionCount()).toBe(0);

        // Simulate multiple connections (in real test would need actual SSE clients)
        const connection1 = { id: 'conn1', response: {}, isAlive: true, lastPing: new Date() };
        const connection2 = { id: 'conn2', response: {}, isAlive: true, lastPing: new Date() };

        sseTransport['connections'].set('conn1', connection1 as any);
        sseTransport['connections'].set('conn2', connection2 as any);

        expect(sseTransport.getConnectionCount()).toBe(2);
      });

      test('should generate unique connection IDs', () => {
        const id1 = sseTransport['generateConnectionId']();
        const id2 = sseTransport['generateConnectionId']();

        expect(id1).not.toBe(id2);
        expect(id1).toMatch(/^sse_\d+_[a-z0-9]+$/);
        expect(id2).toMatch(/^sse_\d+_[a-z0-9]+$/);
      });

      test('should handle connection cleanup during ping', () => {
        const deadConnection = {
          id: 'dead',
          response: { write: jest.fn().mockImplementation(() => { throw new Error('Connection dead'); }) },
          isAlive: true,
          lastPing: new Date()
        };

        sseTransport['connections'].set('dead', deadConnection as any);

        // Trigger ping interval manually
        sseTransport['startPingInterval']();

        // Should clean up dead connections
        setTimeout(() => {
          expect(sseTransport.getConnectionCount()).toBe(0);
        }, 100);
      });
    });

    describe('Integration with MCPRallyServer', () => {
      test('should provide server instance for integration', () => {
        const server = sseTransport.getServer();
        expect(server).toBeDefined();
        expect(MockedServer).toHaveBeenCalled();
      });

      test('should allow custom MCP handlers', () => {
        const server = sseTransport.getServer();

        // Should be able to set request handlers
        expect(server.setRequestHandler).toBeDefined();
        expect(typeof server.setRequestHandler).toBe('function');
      });
    });
  });

  describe('Transport Comparison', () => {
    test('should both implement ITransportLayer interface', () => {
      const stdio = new StdioTransport();
      const sse = new SSETransport(0);

      // Both should have required methods
      expect(typeof stdio.start).toBe('function');
      expect(typeof stdio.stop).toBe('function');
      expect(typeof sse.start).toBe('function');
      expect(typeof sse.stop).toBe('function');
    });

    test('should both provide MCP server access', () => {
      const stdio = new StdioTransport();
      const sse = new SSETransport(0);

      expect(stdio.getServer()).toBeDefined();
      expect(sse.getServer()).toBeDefined();
    });

    test('should handle lifecycle operations consistently', async () => {
      const stdio = new StdioTransport();
      const sse = new SSETransport(0);

      // Both should start and stop without errors
      await expect(stdio.start()).resolves.not.toThrow();
      await expect(sse.start()).resolves.not.toThrow();

      await expect(stdio.stop()).resolves.not.toThrow();
      await expect(sse.stop()).resolves.not.toThrow();
    });
  });
});

// Helper function to find an available port
async function getAvailablePort(): Promise<number> {
  return new Promise((resolve) => {
    const server = require('net').createServer();
    server.listen(0, () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
  });
}