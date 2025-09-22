/**
 * Test Helper Utilities
 *
 * Common testing utilities and helpers for the MCP Rally server test suite.
 * Provides factory functions, assertions, and test data generators.
 */

import { MCPMessage, RallyResponse, RallyQuery } from '../../src/core/interfaces';
import { RallyApiMockHandler, setupAxiosMocks } from '../mocks/axios-mock';

// Test environment setup
export const setupTestEnvironment = (): void => {
  // Set required environment variables
  process.env.RALLY_API_KEY = 'test-api-key-12345';
  process.env.RALLY_BASE_URL = 'https://test.rallydev.com';
  process.env.RALLY_INTEGRATION_VENDOR = 'mcp-rally-test';
  process.env.RALLY_TRANSPORT = 'stdio';
  process.env.NODE_ENV = 'test';
};

// Clean up test environment
export const cleanupTestEnvironment = (): void => {
  delete process.env.RALLY_API_KEY;
  delete process.env.RALLY_BASE_URL;
  delete process.env.RALLY_INTEGRATION_VENDOR;
  delete process.env.RALLY_TRANSPORT;
};

// MCP Message factory functions
export const createMCPInitializeMessage = (capabilities?: any): MCPMessage => ({
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2024-11-05',
    capabilities: capabilities || {
      tools: {},
      resources: {},
      prompts: {}
    },
    clientInfo: {
      name: 'test-client',
      version: '1.0.0'
    }
  }
});

export const createMCPToolCallMessage = (toolName: string, args: any, id: number = 1): MCPMessage => ({
  jsonrpc: '2.0',
  id,
  method: 'tools/call',
  params: {
    name: toolName,
    arguments: args
  }
});

export const createMCPListToolsMessage = (id: number = 1): MCPMessage => ({
  jsonrpc: '2.0',
  id,
  method: 'tools/list'
});

// Rally query builders
export const createUserStoryQuery = (overrides: Partial<RallyQuery> = {}): RallyQuery => ({
  query: '(ScheduleState != "Accepted")',
  fetch: 'FormattedID,Name,Description,ScheduleState,PlanEstimate,Owner,Project',
  order: 'FormattedID',
  pagesize: 20,
  start: 1,
  ...overrides
});

export const createDefectQuery = (overrides: Partial<RallyQuery> = {}): RallyQuery => ({
  query: '(State != "Closed")',
  fetch: 'FormattedID,Name,Description,State,Severity,Priority,Owner,Project',
  order: 'FormattedID',
  pagesize: 20,
  start: 1,
  ...overrides
});

export const createTaskQuery = (overrides: Partial<RallyQuery> = {}): RallyQuery => ({
  query: '(State != "Completed")',
  fetch: 'FormattedID,Name,Description,State,Owner,WorkProduct,Estimate,ToDo,Actuals',
  order: 'FormattedID',
  pagesize: 20,
  start: 1,
  ...overrides
});

// Test data generators
export const generateUserStoryData = (overrides: any = {}) => ({
  name: 'Test User Story',
  description: 'As a user, I want to test functionality so that I can verify it works.',
  'plan-estimate': 5,
  'schedule-state': 'Defined',
  project: 'Test Project',
  owner: 'test.user@example.com',
  ...overrides
});

export const generateDefectData = (overrides: any = {}) => ({
  name: 'Test Defect',
  description: 'Bug found during testing',
  severity: 'High Attention',
  priority: 'High',
  state: 'Open',
  project: 'Test Project',
  'found-in-build': '1.0.0',
  ...overrides
});

export const generateTaskData = (overrides: any = {}) => ({
  name: 'Test Task',
  description: 'Task to implement feature',
  state: 'Defined',
  estimate: 8,
  'work-product': 'US1234',
  owner: 'test.user@example.com',
  ...overrides
});

// Performance testing utilities
export const measureExecutionTime = async (fn: () => Promise<any>): Promise<{ result: any; duration: number }> => {
  const startTime = Date.now();
  const result = await fn();
  const duration = Date.now() - startTime;
  return { result, duration };
};

// Mock factory for components
export const createMockComponents = () => {
  const mockAxiosInstance = setupAxiosMocks();
  const rallyApiHandler = new RallyApiMockHandler(mockAxiosInstance);

  const mockSecurityManager = {
    validateApiKey: jest.fn().mockResolvedValue(true),
    getAuthHeaders: jest.fn().mockReturnValue({
      'zsessionid': 'test-api-key-12345',
      'X-RallyIntegrationName': 'mcp-rally',
      'X-RallyIntegrationVendor': 'mcp-rally-test',
      'X-RallyIntegrationVersion': '1.0.0',
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }),
    sanitizeLogData: jest.fn().mockImplementation((data: any) => data),
    validateEnvironment: jest.fn(),
    getRallyBaseUrl: jest.fn().mockReturnValue('https://test.rallydev.com')
  };

  const mockPerformanceManager = {
    httpClient: mockAxiosInstance,
    trackRequestMetrics: jest.fn()
  };

  const mockDataTransformer = {
    rallyToMcp: jest.fn().mockImplementation((data: any) => data),
    mcpToRally: jest.fn().mockImplementation((data: any) => data),
    transformFieldNames: jest.fn().mockImplementation((data: any) => data)
  };

  const mockTransportLayer = {
    start: jest.fn().mockResolvedValue(undefined),
    stop: jest.fn().mockResolvedValue(undefined),
    getServer: jest.fn().mockReturnValue({
      setRequestHandler: jest.fn(),
      sendProgress: jest.fn(),
      sendLoggingMessage: jest.fn()
    })
  };

  return {
    mockAxiosInstance,
    rallyApiHandler,
    mockSecurityManager,
    mockPerformanceManager,
    mockDataTransformer,
    mockTransportLayer
  };
};

// Assertion helpers
export const expectValidRallyResponse = <T>(response: RallyResponse<T>): void => {
  expect(response).toHaveProperty('QueryResult');
  expect(response.QueryResult).toHaveProperty('Errors');
  expect(response.QueryResult).toHaveProperty('Warnings');
  expect(response.QueryResult).toHaveProperty('Results');
  expect(Array.isArray(response.QueryResult.Errors)).toBe(true);
  expect(Array.isArray(response.QueryResult.Warnings)).toBe(true);
  expect(Array.isArray(response.QueryResult.Results)).toBe(true);
};

export const expectValidMCPResponse = (response: any): void => {
  expect(response).toHaveProperty('content');
  expect(Array.isArray(response.content)).toBe(true);
  if (response.content.length > 0) {
    expect(response.content[0]).toHaveProperty('type');
    expect(response.content[0]).toHaveProperty('text');
  }
};

export const expectMCPError = (response: any): void => {
  expect(response).toHaveProperty('isError', true);
  expect(response).toHaveProperty('content');
  expect(Array.isArray(response.content)).toBe(true);
  expect(response.content[0]).toHaveProperty('type', 'text');
  expect(response.content[0].text).toContain('Error');
};

// Wait utilities for async testing
export const waitFor = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

export const waitForCondition = async (
  condition: () => boolean | Promise<boolean>,
  timeout: number = 5000,
  interval: number = 100
): Promise<void> => {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await waitFor(interval);
  }

  throw new Error(`Condition not met within ${timeout}ms timeout`);
};

// Error simulation helpers
export const simulateRallyApiError = (handler: RallyApiMockHandler, type: 'network' | 'timeout' | 'auth' | 'server'): void => {
  switch (type) {
    case 'network':
      handler.simulateNetworkError();
      break;
    case 'timeout':
      handler.simulateTimeout();
      break;
    case 'auth':
      handler.simulateUnauthorized();
      break;
    case 'server':
      handler.simulateServerError();
      break;
  }
};

// Test data validation
export const validateUserStoryTransformation = (original: any, transformed: any): void => {
  // Check that Rally fields are transformed to MCP format
  if (original.FormattedID) {
    expect(transformed['formatted-id']).toBe(original.FormattedID);
  }
  if (original.PlanEstimate) {
    expect(transformed['plan-estimate']).toBe(original.PlanEstimate);
  }
  if (original.ScheduleState) {
    expect(transformed['schedule-state']).toBe(original.ScheduleState);
  }
  if (original._ref) {
    expect(transformed['metadata-ref']).toBe(original._ref);
  }
  if (original.c_CustomField) {
    expect(transformed['custom-custom-field']).toBe(original.c_CustomField);
  }
};

export const validateDefectTransformation = (original: any, transformed: any): void => {
  if (original.FoundInBuild) {
    expect(transformed['found-in-build']).toBe(original.FoundInBuild);
  }
  if (original.FixedInBuild) {
    expect(transformed['fixed-in-build']).toBe(original.FixedInBuild);
  }
};

export const validateTaskTransformation = (original: any, transformed: any): void => {
  if (original.WorkProduct) {
    // WorkProduct is a complex object that should be transformed
    const expectedWorkProduct = {
      'metadata-ref': original.WorkProduct._ref,
      'metadata-ref-object-name': original.WorkProduct._refObjectName
    };
    expect(transformed['work-product']).toEqual(expectedWorkProduct);
  }
  if (original.ToDo) {
    expect(transformed['to-do']).toBe(original.ToDo);
  }
};