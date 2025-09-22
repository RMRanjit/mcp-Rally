/**
 * MCP Protocol Integration Tests
 *
 * Comprehensive integration tests for MCP protocol compliance and message handling.
 * Tests the complete MCP server implementation with mock Rally API responses.
 */

import { MCPRallyServer } from '../../src/core/MCPRallyServer';
import { StdioTransport } from '../../src/transport/StdioTransport';
import { SSETransport } from '../../src/transport/SSETransport';
import { RallyClient } from '../../src/rally/RallyClient';
import { DataTransformer } from '../../src/data/DataTransformer';
import { SecurityManager } from '../../src/security/SecurityManager';
import { PerformanceManager } from '../../src/utils/PerformanceManager';
import {
  setupTestEnvironment,
  cleanupTestEnvironment,
  createMCPInitializeMessage,
  createMCPToolCallMessage,
  createMCPListToolsMessage,
  expectValidMCPResponse,
  expectMCPError,
  generateUserStoryData,
  generateDefectData,
  generateTaskData
} from '../utils/test-helpers';
import { RallyApiMockHandler, setupAxiosMocks } from '../mocks/axios-mock';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

describe('MCP Protocol Integration', () => {
  let mcpServer: MCPRallyServer;
  let mockAxiosInstance: any;
  let rallyApiHandler: RallyApiMockHandler;
  let securityManager: SecurityManager;
  let performanceManager: PerformanceManager;
  let dataTransformer: DataTransformer;
  let rallyClient: RallyClient;

  beforeAll(() => {
    setupTestEnvironment();
  });

  afterAll(() => {
    cleanupTestEnvironment();
  });

  beforeEach(() => {
    // Setup mocked dependencies
    mockAxiosInstance = setupAxiosMocks();
    rallyApiHandler = new RallyApiMockHandler(mockAxiosInstance);

    // Create real component instances with mocked HTTP
    securityManager = new SecurityManager();
    performanceManager = new PerformanceManager();
    dataTransformer = new DataTransformer();
    rallyClient = new RallyClient(securityManager, performanceManager);

    // Mock the PerformanceManager's httpClient to use our mock
    Object.defineProperty(performanceManager, 'httpClient', {
      value: mockAxiosInstance,
      writable: false
    });
  });

  afterEach(async () => {
    if (mcpServer) {
      await mcpServer.shutdown();
    }
    rallyApiHandler.reset();
    jest.clearAllMocks();
  });

  describe('Server Initialization', () => {
    test('should initialize MCP Rally server with StdioTransport', async () => {
      const mockTransport = {
        start: jest.fn().mockResolvedValue(undefined),
        stop: jest.fn().mockResolvedValue(undefined),
        getServer: jest.fn().mockReturnValue({
          setRequestHandler: jest.fn()
        })
      } as any;

      mcpServer = new MCPRallyServer(
        mockTransport,
        rallyClient,
        dataTransformer,
        securityManager,
        performanceManager
      );

      await mcpServer.initialize();

      expect(mockTransport.start).toHaveBeenCalled();
      expect(mockTransport.getServer().setRequestHandler).toHaveBeenCalled();
    });

    test('should validate environment before initialization', async () => {
      delete process.env.RALLY_API_KEY;

      const mockTransport = {
        start: jest.fn().mockResolvedValue(undefined),
        stop: jest.fn().mockResolvedValue(undefined),
        getServer: jest.fn().mockReturnValue({
          setRequestHandler: jest.fn()
        })
      } as any;

      mcpServer = new MCPRallyServer(
        mockTransport,
        rallyClient,
        dataTransformer,
        securityManager,
        performanceManager
      );

      await expect(mcpServer.initialize()).rejects.toThrow(
        'Missing required environment variables: RALLY_API_KEY'
      );

      // Restore for other tests
      process.env.RALLY_API_KEY = 'test-api-key-12345';
    });

    test('should authenticate Rally client during initialization', async () => {
      const mockTransport = {
        start: jest.fn().mockResolvedValue(undefined),
        stop: jest.fn().mockResolvedValue(undefined),
        getServer: jest.fn().mockReturnValue({
          setRequestHandler: jest.fn()
        })
      } as any;

      mcpServer = new MCPRallyServer(
        mockTransport,
        rallyClient,
        dataTransformer,
        securityManager,
        performanceManager
      );

      await mcpServer.initialize();

      expect(rallyClient.isAuthenticatedClient()).toBe(true);
    });

    test('should handle initialization errors gracefully', async () => {
      const mockTransport = {
        start: jest.fn().mockRejectedValue(new Error('Transport startup failed')),
        stop: jest.fn().mockResolvedValue(undefined),
        getServer: jest.fn().mockReturnValue({
          setRequestHandler: jest.fn()
        })
      } as any;

      mcpServer = new MCPRallyServer(
        mockTransport,
        rallyClient,
        dataTransformer,
        securityManager,
        performanceManager
      );

      await expect(mcpServer.initialize()).rejects.toThrow(
        'Failed to initialize MCP Rally server'
      );
    });
  });

  describe('MCP Tool Handlers', () => {
    let mockServer: any;
    let toolHandlers: Map<string, Function>;

    beforeEach(async () => {
      toolHandlers = new Map();

      mockServer = {
        setRequestHandler: jest.fn().mockImplementation((schema, handler) => {
          if (schema === CallToolRequestSchema) {
            toolHandlers.set('call_tool', handler);
          } else if (schema === ListToolsRequestSchema) {
            toolHandlers.set('list_tools', handler);
          }
        })
      };

      const mockTransport = {
        start: jest.fn().mockResolvedValue(undefined),
        stop: jest.fn().mockResolvedValue(undefined),
        getServer: jest.fn().mockReturnValue(mockServer)
      } as any;

      mcpServer = new MCPRallyServer(
        mockTransport,
        rallyClient,
        dataTransformer,
        securityManager,
        performanceManager
      );

      await mcpServer.initialize();
    });

    describe('User Story Tools', () => {
      test('should handle get_user_story tool call', async () => {
        const handler = toolHandlers.get('call_tool');
        expect(handler).toBeDefined();

        const request = {
          params: {
            name: 'get_user_story',
            arguments: { objectId: '12345678901' }
          }
        };

        const response = await handler(request);

        expectValidMCPResponse(response);
        expect(response.content[0].text).toContain('User Story Retrieved');
        expect(response.content[0].text).toContain('formatted-id');
      });

      test('should handle create_user_story tool call', async () => {
        const handler = toolHandlers.get('call_tool');
        const storyData = generateUserStoryData({
          name: 'New user login feature',
          description: 'Implement OAuth login functionality'
        });

        const request = {
          params: {
            name: 'create_user_story',
            arguments: storyData
          }
        };

        const response = await handler(request);

        expectValidMCPResponse(response);
        expect(response.content[0].text).toContain('User Story Created Successfully');
        expect(response.content[0].text).toContain('New user login feature');
      });

      test('should handle update_user_story tool call', async () => {
        const handler = toolHandlers.get('call_tool');

        const request = {
          params: {
            name: 'update_user_story',
            arguments: {
              objectId: '12345678901',
              'schedule-state': 'In-Progress',
              description: 'Updated description'
            }
          }
        };

        const response = await handler(request);

        expectValidMCPResponse(response);
        expect(response.content[0].text).toContain('User Story Updated Successfully');
      });

      test('should handle query_user_stories tool call', async () => {
        const handler = toolHandlers.get('call_tool');

        const request = {
          params: {
            name: 'query_user_stories',
            arguments: {
              project: 'Authentication Module',
              'schedule-state': 'Defined'
            }
          }
        };

        const response = await handler(request);

        expectValidMCPResponse(response);
        expect(response.content[0].text).toContain('Found');
        expect(response.content[0].text).toContain('User Stories');
      });
    });

    describe('Defect Tools', () => {
      test('should handle create_defect tool call', async () => {
        const handler = toolHandlers.get('call_tool');
        const defectData = generateDefectData({
          name: 'Login button not responsive',
          severity: 'High Attention'
        });

        const request = {
          params: {
            name: 'create_defect',
            arguments: defectData
          }
        };

        const response = await handler(request);

        expectValidMCPResponse(response);
        expect(response.content[0].text).toContain('Defect Created Successfully');
        expect(response.content[0].text).toContain('Login button not responsive');
      });
    });

    describe('Task Tools', () => {
      test('should handle create_task tool call', async () => {
        const handler = toolHandlers.get('call_tool');
        const taskData = generateTaskData({
          name: 'Implement OAuth integration',
          estimate: 8
        });

        const request = {
          params: {
            name: 'create_task',
            arguments: taskData
          }
        };

        const response = await handler(request);

        expectValidMCPResponse(response);
        expect(response.content[0].text).toContain('Task Created Successfully');
        expect(response.content[0].text).toContain('Implement OAuth integration');
      });
    });

    describe('Error Handling in Tools', () => {
      test('should handle unknown tool calls', async () => {
        const handler = toolHandlers.get('call_tool');

        const request = {
          params: {
            name: 'unknown_tool',
            arguments: {}
          }
        };

        const response = await handler(request);

        expectMCPError(response);
        expect(response.content[0].text).toContain('Error executing unknown_tool');
        expect(response.content[0].text).toContain('Unknown tool');
      });

      test('should handle Rally API errors in tool calls', async () => {
        // Simulate a Rally API error
        rallyApiHandler.simulateUnauthorized();

        const handler = toolHandlers.get('call_tool');

        const request = {
          params: {
            name: 'get_user_story',
            arguments: { objectId: '12345678901' }
          }
        };

        const response = await handler(request);

        expectMCPError(response);
        expect(response.content[0].text).toContain('Error executing get_user_story');
      });

      test('should handle validation errors in tool calls', async () => {
        const handler = toolHandlers.get('call_tool');

        const request = {
          params: {
            name: 'create_user_story',
            arguments: {
              name: 'VALIDATION_ERROR' // This triggers validation error in mock
            }
          }
        };

        const response = await handler(request);

        expectMCPError(response);
        expect(response.content[0].text).toContain('Error executing create_user_story');
      });

      test('should track performance metrics for tool calls', async () => {
        const trackSpy = jest.spyOn(performanceManager, 'trackRequestMetrics');
        const handler = toolHandlers.get('call_tool');

        const request = {
          params: {
            name: 'get_user_story',
            arguments: { objectId: '12345678901' }
          }
        };

        await handler(request);

        expect(trackSpy).toHaveBeenCalledWith(
          'get_user_story',
          expect.any(Number),
          true
        );
      });

      test('should track performance metrics for failed tool calls', async () => {
        const trackSpy = jest.spyOn(performanceManager, 'trackRequestMetrics');
        rallyApiHandler.simulateServerError();

        const handler = toolHandlers.get('call_tool');

        const request = {
          params: {
            name: 'get_user_story',
            arguments: { objectId: '12345678901' }
          }
        };

        await handler(request);

        expect(trackSpy).toHaveBeenCalledWith(
          'get_user_story',
          expect.any(Number),
          false
        );
      });
    });
  });

  describe('Data Transformation Integration', () => {
    let mockServer: any;
    let toolHandlers: Map<string, Function>;

    beforeEach(async () => {
      toolHandlers = new Map();

      mockServer = {
        setRequestHandler: jest.fn().mockImplementation((schema, handler) => {
          if (schema === CallToolRequestSchema) {
            toolHandlers.set('call_tool', handler);
          }
        })
      };

      const mockTransport = {
        start: jest.fn().mockResolvedValue(undefined),
        stop: jest.fn().mockResolvedValue(undefined),
        getServer: jest.fn().mockReturnValue(mockServer)
      } as any;

      mcpServer = new MCPRallyServer(
        mockTransport,
        rallyClient,
        dataTransformer,
        securityManager,
        performanceManager
      );

      await mcpServer.initialize();
    });

    test('should transform MCP data to Rally format for create operations', async () => {
      const handler = toolHandlers.get('call_tool');

      const mcpStoryData = {
        name: 'Test Story',
        'plan-estimate': 5,
        'schedule-state': 'Defined',
        'custom-priority': 'High'
      };

      const request = {
        params: {
          name: 'create_user_story',
          arguments: mcpStoryData
        }
      };

      await handler(request);

      // Verify that the data was transformed to Rally format before API call
      const requests = rallyApiHandler.getRequestHistory();
      const createRequest = requests.find(r => r.method === 'POST' && r.url.includes('/hierarchicalrequirement'));

      expect(createRequest?.data.UserStory).toMatchObject({
        Name: 'Test Story',
        PlanEstimate: 5,
        ScheduleState: 'Defined',
        c_Priority: 'High'
      });
    });

    test('should transform Rally data to MCP format for get operations', async () => {
      const handler = toolHandlers.get('call_tool');

      const request = {
        params: {
          name: 'get_user_story',
          arguments: { objectId: '12345678901' }
        }
      };

      const response = await handler(request);

      // Parse the response to verify transformation
      const responseText = response.content[0].text;
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      expect(jsonMatch).toBeTruthy();

      const parsedData = JSON.parse(jsonMatch[0]);

      // Verify Rally fields were transformed to MCP format
      expect(parsedData['formatted-id']).toBeDefined();
      expect(parsedData['plan-estimate']).toBeDefined();
      expect(parsedData['schedule-state']).toBeDefined();
      expect(parsedData['metadata-ref']).toBeDefined();
      expect(parsedData['custom-custom-priority']).toBeDefined();
    });

    test('should transform Rally data to MCP format for query operations', async () => {
      const handler = toolHandlers.get('call_tool');

      const request = {
        params: {
          name: 'query_user_stories',
          arguments: { project: 'Test Project' }
        }
      };

      const response = await handler(request);

      // Verify that results are transformed
      const responseText = response.content[0].text;
      expect(responseText).toContain('formatted-id');
      expect(responseText).not.toContain('FormattedID'); // Should be transformed from Rally format
    });
  });

  describe('Error Propagation and Handling', () => {
    let mockServer: any;
    let toolHandlers: Map<string, Function>;

    beforeEach(async () => {
      toolHandlers = new Map();

      mockServer = {
        setRequestHandler: jest.fn().mockImplementation((schema, handler) => {
          toolHandlers.set('call_tool', handler);
        })
      };

      const mockTransport = {
        start: jest.fn().mockResolvedValue(undefined),
        stop: jest.fn().mockResolvedValue(undefined),
        getServer: jest.fn().mockReturnValue(mockServer)
      } as any;

      mcpServer = new MCPRallyServer(
        mockTransport,
        rallyClient,
        dataTransformer,
        securityManager,
        performanceManager
      );

      await mcpServer.initialize();
    });

    test('should propagate network errors properly', async () => {
      rallyApiHandler.simulateNetworkError();
      const handler = toolHandlers.get('call_tool');

      const request = {
        params: {
          name: 'get_user_story',
          arguments: { objectId: '12345678901' }
        }
      };

      const response = await handler(request);

      expectMCPError(response);
      expect(response.content[0].text).toContain('Network connection failed');
    });

    test('should propagate authentication errors properly', async () => {
      rallyApiHandler.simulateUnauthorized();
      const handler = toolHandlers.get('call_tool');

      const request = {
        params: {
          name: 'get_user_story',
          arguments: { objectId: '12345678901' }
        }
      };

      const response = await handler(request);

      expectMCPError(response);
      expect(response.content[0].text).toContain('Invalid API credentials');
    });

    test('should handle Rally API errors in response data', async () => {
      // Mock Rally API returning errors in the response
      mockAxiosInstance.get.mockResolvedValue({
        status: 200,
        data: {
          QueryResult: {
            Errors: ['Invalid object identifier'],
            Warnings: [],
            Results: []
          }
        }
      });

      const handler = toolHandlers.get('call_tool');

      const request = {
        params: {
          name: 'get_user_story',
          arguments: { objectId: 'invalid-id' }
        }
      };

      const response = await handler(request);

      expectMCPError(response);
      expect(response.content[0].text).toContain('Invalid object identifier');
    });
  });

  describe('Server Shutdown', () => {
    test('should shutdown gracefully', async () => {
      const mockTransport = {
        start: jest.fn().mockResolvedValue(undefined),
        stop: jest.fn().mockResolvedValue(undefined),
        getServer: jest.fn().mockReturnValue({
          setRequestHandler: jest.fn()
        })
      } as any;

      mcpServer = new MCPRallyServer(
        mockTransport,
        rallyClient,
        dataTransformer,
        securityManager,
        performanceManager
      );

      await mcpServer.initialize();
      await mcpServer.shutdown();

      expect(mockTransport.stop).toHaveBeenCalled();
    });

    test('should handle shutdown errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const mockTransport = {
        start: jest.fn().mockResolvedValue(undefined),
        stop: jest.fn().mockRejectedValue(new Error('Shutdown failed')),
        getServer: jest.fn().mockReturnValue({
          setRequestHandler: jest.fn()
        })
      } as any;

      mcpServer = new MCPRallyServer(
        mockTransport,
        rallyClient,
        dataTransformer,
        securityManager,
        performanceManager
      );

      await mcpServer.initialize();

      // Should not throw, but should log error
      await expect(mcpServer.shutdown()).resolves.not.toThrow();
      expect(consoleSpy).toHaveBeenCalledWith('Error during shutdown:', expect.any(Error));

      consoleSpy.mockRestore();
    });
  });

  describe('Query Building Integration', () => {
    let mockServer: any;
    let toolHandlers: Map<string, Function>;

    beforeEach(async () => {
      toolHandlers = new Map();

      mockServer = {
        setRequestHandler: jest.fn().mockImplementation((schema, handler) => {
          toolHandlers.set('call_tool', handler);
        })
      };

      const mockTransport = {
        start: jest.fn().mockResolvedValue(undefined),
        stop: jest.fn().mockResolvedValue(undefined),
        getServer: jest.fn().mockReturnValue(mockServer)
      } as any;

      mcpServer = new MCPRallyServer(
        mockTransport,
        rallyClient,
        dataTransformer,
        securityManager,
        performanceManager
      );

      await mcpServer.initialize();
    });

    test('should build Rally queries from MCP parameters', async () => {
      const handler = toolHandlers.get('call_tool');

      const request = {
        params: {
          name: 'query_user_stories',
          arguments: {
            project: 'Test Project',
            owner: 'John Doe',
            'schedule-state': 'Defined',
            iteration: 'Sprint 1'
          }
        }
      };

      await handler(request);

      const requests = rallyApiHandler.getRequestHistory();
      const queryRequest = requests.find(r => r.method === 'GET' && r.url === '/hierarchicalrequirement');

      expect(queryRequest?.params.query).toContain('(Project.Name = "Test Project")');
      expect(queryRequest?.params.query).toContain('(Owner.Name = "John Doe")');
      expect(queryRequest?.params.query).toContain('(ScheduleState = "Defined")');
      expect(queryRequest?.params.query).toContain('(Iteration.Name = "Sprint 1")');
      expect(queryRequest?.params.query).toContain(' AND ');
    });

    test('should handle custom queries', async () => {
      const handler = toolHandlers.get('call_tool');

      const request = {
        params: {
          name: 'query_user_stories',
          arguments: {
            query: '(CreationDate > "2024-01-01")',
            project: 'Test Project'
          }
        }
      };

      await handler(request);

      const requests = rallyApiHandler.getRequestHistory();
      const queryRequest = requests.find(r => r.method === 'GET');

      expect(queryRequest?.params.query).toContain('(CreationDate > "2024-01-01")');
      expect(queryRequest?.params.query).toContain('(Project.Name = "Test Project")');
    });
  });

  describe('Full End-to-End Scenarios', () => {
    let mockServer: any;
    let toolHandlers: Map<string, Function>;

    beforeEach(async () => {
      toolHandlers = new Map();

      mockServer = {
        setRequestHandler: jest.fn().mockImplementation((schema, handler) => {
          toolHandlers.set('call_tool', handler);
        })
      };

      const mockTransport = {
        start: jest.fn().mockResolvedValue(undefined),
        stop: jest.fn().mockResolvedValue(undefined),
        getServer: jest.fn().mockReturnValue(mockServer)
      } as any;

      mcpServer = new MCPRallyServer(
        mockTransport,
        rallyClient,
        dataTransformer,
        securityManager,
        performanceManager
      );

      await mcpServer.initialize();
    });

    test('should complete create-get-update workflow', async () => {
      const handler = toolHandlers.get('call_tool');

      // 1. Create user story
      const createRequest = {
        params: {
          name: 'create_user_story',
          arguments: generateUserStoryData({
            name: 'E2E Test Story',
            description: 'End-to-end test story'
          })
        }
      };

      const createResponse = await handler(createRequest);
      expectValidMCPResponse(createResponse);

      // 2. Get the created story
      const getRequest = {
        params: {
          name: 'get_user_story',
          arguments: { objectId: '12345678901' }
        }
      };

      const getResponse = await handler(getRequest);
      expectValidMCPResponse(getResponse);

      // 3. Update the story
      const updateRequest = {
        params: {
          name: 'update_user_story',
          arguments: {
            objectId: '12345678901',
            'schedule-state': 'In-Progress',
            description: 'Updated description'
          }
        }
      };

      const updateResponse = await handler(updateRequest);
      expectValidMCPResponse(updateResponse);

      // Verify all operations completed successfully
      expect(createResponse.content[0].text).toContain('Created Successfully');
      expect(getResponse.content[0].text).toContain('User Story Retrieved');
      expect(updateResponse.content[0].text).toContain('Updated Successfully');
    });

    test('should handle complex multi-artifact workflow', async () => {
      const handler = toolHandlers.get('call_tool');

      // Create user story, then defect, then task
      const storyResponse = await handler({
        params: {
          name: 'create_user_story',
          arguments: generateUserStoryData({ name: 'Main Feature' })
        }
      });

      const defectResponse = await handler({
        params: {
          name: 'create_defect',
          arguments: generateDefectData({ name: 'Bug in Main Feature' })
        }
      });

      const taskResponse = await handler({
        params: {
          name: 'create_task',
          arguments: generateTaskData({ name: 'Fix the Bug' })
        }
      });

      // All should succeed
      expectValidMCPResponse(storyResponse);
      expectValidMCPResponse(defectResponse);
      expectValidMCPResponse(taskResponse);

      // Verify performance tracking
      const stats = performanceManager.getPerformanceStats();
      expect(stats.totalRequests).toBeGreaterThan(0);
      expect(stats.successRate).toBe(100);
    });
  });
});