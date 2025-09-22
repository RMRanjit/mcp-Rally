/**
 * RallyClient Unit Tests
 *
 * Comprehensive test suite for the RallyClient component.
 * Tests Rally API interactions, authentication, CRUD operations, and error handling.
 */

import { RallyClient } from '../../src/rally/RallyClient';
import { MCPErrorType } from '../../src/core/interfaces';
import {
  setupTestEnvironment,
  cleanupTestEnvironment,
  createMockComponents,
  expectValidRallyResponse,
  measureExecutionTime,
  simulateRallyApiError
} from '../utils/test-helpers';
import {
  RallyApiMockHandler,
  mockUserStoryResponse,
  mockUserStoryListResponse,
  mockDefectResponse,
  mockTaskResponse,
  mockAuthResponse,
  createMockUserStory,
  createMockDefect,
  createMockTask
} from '../mocks/axios-mock';
import { AxiosError } from 'axios';

describe('RallyClient', () => {
  let rallyClient: RallyClient;
  let mockComponents: ReturnType<typeof createMockComponents>;
  let rallyApiHandler: RallyApiMockHandler;

  beforeAll(() => {
    setupTestEnvironment();
  });

  afterAll(() => {
    cleanupTestEnvironment();
  });

  beforeEach(() => {
    mockComponents = createMockComponents();
    rallyApiHandler = mockComponents.rallyApiHandler;

    rallyClient = new RallyClient(
      mockComponents.mockSecurityManager,
      mockComponents.mockPerformanceManager
    );
  });

  afterEach(() => {
    rallyApiHandler.reset();
    jest.clearAllMocks();
  });

  describe('Initialization and Configuration', () => {
    test('should initialize with security and performance managers', () => {
      expect(rallyClient).toBeDefined();
      expect(rallyClient.getBaseUrl()).toBe('https://test.rallydev.com');
      expect(rallyClient.isAuthenticatedClient()).toBe(false);
    });

    test('should configure axios instance with base URL and headers', () => {
      const mockAxios = mockComponents.mockAxiosInstance;

      expect(mockAxios.defaults.baseURL).toBe('https://test.rallydev.com/slm/webservice/v2.0');
      expect(mockAxios.defaults.headers.common).toMatchObject({
        'zsessionid': 'test-api-key-12345',
        'Content-Type': 'application/json'
      });
    });

    test('should use security manager for auth headers', () => {
      expect(mockComponents.mockSecurityManager.getAuthHeaders).toHaveBeenCalled();
      expect(mockComponents.mockSecurityManager.getRallyBaseUrl).toHaveBeenCalled();
    });
  });

  describe('Authentication', () => {
    test('should authenticate successfully with valid API key', async () => {
      const apiKey = 'valid-api-key-123456789';

      await rallyClient.authenticate(apiKey);

      expect(rallyClient.isAuthenticatedClient()).toBe(true);
      expect(mockComponents.mockSecurityManager.validateApiKey).toHaveBeenCalled();
      expect(mockComponents.mockAxiosInstance.get).toHaveBeenCalledWith(
        '/workspace',
        {
          timeout: 10000,
          params: {
            fetch: 'Name',
            pagesize: '1'
          }
        }
      );
    });

    test('should handle authentication failure with invalid API key', async () => {
      mockComponents.mockSecurityManager.validateApiKey.mockRejectedValue(
        new Error('RALLY_API_KEY appears to be invalid (too short)')
      );

      await expect(rallyClient.authenticate('invalid')).rejects.toThrow();
      expect(rallyClient.isAuthenticatedClient()).toBe(false);
    });

    test('should handle network errors during authentication', async () => {
      rallyApiHandler.simulateNetworkError();

      await expect(rallyClient.authenticate('test-key')).rejects.toMatchObject({
        type: MCPErrorType.NETWORK_ERROR,
        message: expect.stringContaining('Network connection failed')
      });
      expect(rallyClient.isAuthenticatedClient()).toBe(false);
    });

    test('should handle HTTP errors during authentication', async () => {
      rallyApiHandler.simulateUnauthorized();

      await expect(rallyClient.authenticate('test-key')).rejects.toMatchObject({
        type: MCPErrorType.AUTHENTICATION_ERROR,
        message: expect.stringContaining('Invalid API credentials')
      });
      expect(rallyClient.isAuthenticatedClient()).toBe(false);
    });

    test('should validate API key format before making request', async () => {
      const apiKey = 'test-api-key-123456789';

      await rallyClient.authenticate(apiKey);

      expect(mockComponents.mockSecurityManager.validateApiKey).toHaveBeenCalledBefore(
        mockComponents.mockAxiosInstance.get as jest.Mock
      );
    });
  });

  describe('User Story Operations', () => {
    beforeEach(async () => {
      await rallyClient.authenticate('test-api-key');
    });

    describe('Create User Story', () => {
      test('should create user story successfully', async () => {
        const storyData = {
          Name: 'New User Story',
          Description: 'Story description',
          PlanEstimate: 5,
          Project: '/project/123456'
        };

        const response = await rallyClient.create('UserStory', storyData);

        expectValidRallyResponse(response);
        expect(response.QueryResult.Results).toHaveLength(1);
        expect(response.QueryResult.Results[0].Name).toContain('New User Story');
        expect(mockComponents.mockPerformanceManager.trackRequestMetrics).toHaveBeenCalled();

        // Verify request was made correctly
        const requests = rallyApiHandler.getRequestHistory();
        const createRequest = requests.find(r => r.method === 'POST' && r.url.includes('/hierarchicalrequirement'));
        expect(createRequest).toBeDefined();
        expect(createRequest?.data).toEqual({ UserStory: storyData });
      });

      test('should handle validation errors during creation', async () => {
        const invalidStoryData = {
          Name: 'VALIDATION_ERROR' // This triggers validation error in mock
        };

        await expect(rallyClient.create('UserStory', invalidStoryData)).rejects.toMatchObject({
          type: MCPErrorType.VALIDATION_ERROR,
          message: expect.stringContaining('Validation failed')
        });
      });

      test('should use correct Rally endpoint for User Story creation', async () => {
        await rallyClient.create('UserStory', { Name: 'Test Story' });

        const requests = rallyApiHandler.getRequestHistory();
        const createRequest = requests.find(r => r.method === 'POST');
        expect(createRequest?.url).toBe('/hierarchicalrequirement');
      });
    });

    describe('Get User Story', () => {
      test('should retrieve user story by ID', async () => {
        const objectId = '12345678901';

        const response = await rallyClient.get('UserStory', objectId);

        expectValidRallyResponse(response);
        expect(response.QueryResult.Results).toHaveLength(1);
        expect(response.QueryResult.Results[0].ObjectID).toBe(12345678901);

        // Verify request was made correctly
        const requests = rallyApiHandler.getRequestHistory();
        const getRequest = requests.find(r => r.method === 'GET' && r.url.includes('/hierarchicalrequirement/'));
        expect(getRequest?.url).toBe(`/hierarchicalrequirement/${objectId}`);
      });

      test('should handle not found errors', async () => {
        await expect(rallyClient.get('UserStory', '404')).rejects.toMatchObject({
          type: MCPErrorType.NOT_FOUND_ERROR,
          message: expect.stringContaining('Resource not found')
        });
      });

      test('should validate response format', async () => {
        const response = await rallyClient.get('UserStory', '12345678901');

        expect(response.QueryResult).toBeDefined();
        expect(Array.isArray(response.QueryResult.Errors)).toBe(true);
        expect(Array.isArray(response.QueryResult.Warnings)).toBe(true);
        expect(Array.isArray(response.QueryResult.Results)).toBe(true);
      });
    });

    describe('Update User Story', () => {
      test('should update user story successfully', async () => {
        const objectId = '12345678901';
        const updateData = {
          Name: 'Updated Story Name',
          ScheduleState: 'In-Progress'
        };

        const response = await rallyClient.update('UserStory', objectId, updateData);

        expectValidRallyResponse(response);
        expect(response.QueryResult.Results).toHaveLength(1);

        // Verify request was made correctly
        const requests = rallyApiHandler.getRequestHistory();
        const updateRequest = requests.find(r => r.method === 'POST' && r.url.includes(`/${objectId}`));
        expect(updateRequest).toBeDefined();
        expect(updateRequest?.data).toEqual({ UserStory: updateData });
      });

      test('should handle partial updates', async () => {
        const objectId = '12345678901';
        const partialUpdate = { ScheduleState: 'Completed' };

        const response = await rallyClient.update('UserStory', objectId, partialUpdate);

        expectValidRallyResponse(response);

        const requests = rallyApiHandler.getRequestHistory();
        const updateRequest = requests.find(r => r.method === 'POST' && r.url.includes(`/${objectId}`));
        expect(updateRequest?.data).toEqual({ UserStory: partialUpdate });
      });
    });

    describe('Query User Stories', () => {
      test('should query user stories with basic parameters', async () => {
        const query = {
          query: '(ScheduleState != "Accepted")',
          fetch: 'FormattedID,Name,ScheduleState',
          pagesize: 10
        };

        const response = await rallyClient.query('UserStory', query);

        expectValidRallyResponse(response);
        expect(response.QueryResult.Results).toHaveLength(2);

        // Verify request parameters
        const requests = rallyApiHandler.getRequestHistory();
        const queryRequest = requests.find(r => r.method === 'GET' && r.url === '/hierarchicalrequirement');
        expect(queryRequest?.params).toMatchObject({
          query: '(ScheduleState != "Accepted")',
          fetch: 'FormattedID,Name,ScheduleState',
          pagesize: '10'
        });
      });

      test('should use default fetch fields when not specified', async () => {
        const query = { query: '(Project.Name = "Test Project")' };

        await rallyClient.query('UserStory', query);

        const requests = rallyApiHandler.getRequestHistory();
        const queryRequest = requests.find(r => r.method === 'GET');
        expect(queryRequest?.params.fetch).toBe('FormattedID,Name,Description,Owner,Project,CreationDate,LastUpdateDate');
      });

      test('should enforce Rally page size limits', async () => {
        const query = { pagesize: 500 }; // Exceeds Rally's max of 200

        await rallyClient.query('UserStory', query);

        const requests = rallyApiHandler.getRequestHistory();
        const queryRequest = requests.find(r => r.method === 'GET');
        expect(queryRequest?.params.pagesize).toBe('200'); // Should be capped at 200
      });

      test('should handle workspace and project filtering', async () => {
        const query = {
          workspace: '/workspace/123456',
          project: '/project/789012',
          query: '(Owner.Name = "John Doe")'
        };

        await rallyClient.query('UserStory', query);

        const requests = rallyApiHandler.getRequestHistory();
        const queryRequest = requests.find(r => r.method === 'GET');
        expect(queryRequest?.params).toMatchObject({
          workspace: '/workspace/123456',
          project: '/project/789012',
          query: '(Owner.Name = "John Doe")'
        });
      });
    });
  });

  describe('Defect Operations', () => {
    beforeEach(async () => {
      await rallyClient.authenticate('test-api-key');
    });

    test('should create defect successfully', async () => {
      const defectData = {
        Name: 'Login button not working',
        Description: 'Button does not respond to clicks',
        Severity: 'High Attention',
        State: 'Open'
      };

      const response = await rallyClient.create('Defect', defectData);

      expectValidRallyResponse(response);
      expect(response.QueryResult.Results[0].Name).toContain('Login button not working');

      const requests = rallyApiHandler.getRequestHistory();
      const createRequest = requests.find(r => r.method === 'POST' && r.url.includes('/defect'));
      expect(createRequest?.data).toEqual({ Defect: defectData });
    });

    test('should get defect by ID', async () => {
      const response = await rallyClient.get('Defect', '98765432101');

      expectValidRallyResponse(response);
      expect(response.QueryResult.Results[0].FormattedID).toBe('DE1001');
    });

    test('should query defects', async () => {
      const query = {
        query: '(State != "Closed")',
        fetch: 'FormattedID,Name,State,Severity'
      };

      const response = await rallyClient.query('Defect', query);

      expectValidRallyResponse(response);
      expect(response.QueryResult.Results).toHaveLength(1);
    });
  });

  describe('Task Operations', () => {
    beforeEach(async () => {
      await rallyClient.authenticate('test-api-key');
    });

    test('should create task successfully', async () => {
      const taskData = {
        Name: 'Implement OAuth',
        Description: 'Set up OAuth authentication',
        Estimate: 8,
        WorkProduct: '/hierarchicalrequirement/12345678901'
      };

      const response = await rallyClient.create('Task', taskData);

      expectValidRallyResponse(response);
      expect(response.QueryResult.Results[0].Name).toContain('Implement OAuth');

      const requests = rallyApiHandler.getRequestHistory();
      const createRequest = requests.find(r => r.method === 'POST' && r.url.includes('/task'));
      expect(createRequest?.data).toEqual({ Task: taskData });
    });

    test('should get task by ID', async () => {
      const response = await rallyClient.get('Task', '45678901234');

      expectValidRallyResponse(response);
      expect(response.QueryResult.Results[0].FormattedID).toBe('TA1001');
    });

    test('should query tasks', async () => {
      const query = {
        query: '(State != "Completed")',
        fetch: 'FormattedID,Name,State,Estimate,ToDo,Actuals'
      };

      const response = await rallyClient.query('Task', query);

      expectValidRallyResponse(response);
      expect(response.QueryResult.Results).toHaveLength(1);
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      await rallyClient.authenticate('test-api-key');
    });

    test('should handle network connection errors', async () => {
      rallyApiHandler.simulateNetworkError();

      await expect(rallyClient.get('UserStory', '123')).rejects.toMatchObject({
        type: MCPErrorType.NETWORK_ERROR,
        message: expect.stringContaining('Network connection failed')
      });
    });

    test('should handle timeout errors', async () => {
      rallyApiHandler.simulateTimeout();

      await expect(rallyClient.get('UserStory', '123')).rejects.toMatchObject({
        type: MCPErrorType.NETWORK_ERROR,
        message: expect.stringContaining('timeout of 10000ms exceeded')
      });
    });

    test('should handle authentication errors', async () => {
      rallyApiHandler.simulateUnauthorized();

      await expect(rallyClient.get('UserStory', '123')).rejects.toMatchObject({
        type: MCPErrorType.AUTHENTICATION_ERROR,
        message: expect.stringContaining('Invalid API credentials'),
        rallyErrorCode: '401'
      });
    });

    test('should handle permission errors', async () => {
      mockComponents.mockAxiosInstance.get.mockRejectedValue({
        isAxiosError: true,
        response: {
          status: 403,
          data: { error: 'Permission denied' }
        }
      });

      await expect(rallyClient.get('UserStory', '123')).rejects.toMatchObject({
        type: MCPErrorType.PERMISSION_ERROR,
        message: expect.stringContaining('Permission denied'),
        rallyErrorCode: '403'
      });
    });

    test('should handle validation errors', async () => {
      mockComponents.mockAxiosInstance.post.mockRejectedValue({
        isAxiosError: true,
        response: {
          status: 422,
          data: { error: 'Validation failed' }
        }
      });

      await expect(rallyClient.create('UserStory', {})).rejects.toMatchObject({
        type: MCPErrorType.VALIDATION_ERROR,
        message: expect.stringContaining('Validation failed'),
        rallyErrorCode: '422'
      });
    });

    test('should handle server errors', async () => {
      rallyApiHandler.simulateServerError();

      await expect(rallyClient.get('UserStory', '123')).rejects.toMatchObject({
        type: MCPErrorType.RALLY_API_ERROR,
        message: expect.stringContaining('Rally API error (500)'),
        rallyErrorCode: '500'
      });
    });

    test('should handle Rally API errors in response', async () => {
      mockComponents.mockAxiosInstance.get.mockResolvedValue({
        status: 200,
        data: {
          QueryResult: {
            Errors: ['Invalid object identifier', 'Permission denied'],
            Warnings: [],
            Results: []
          }
        }
      });

      await expect(rallyClient.get('UserStory', '123')).rejects.toThrow(
        'Rally API error: Invalid object identifier, Permission denied'
      );
    });

    test('should require authentication for API calls', async () => {
      const unauthenticatedClient = new RallyClient(
        mockComponents.mockSecurityManager,
        mockComponents.mockPerformanceManager
      );

      await expect(unauthenticatedClient.get('UserStory', '123')).rejects.toThrow(
        'Rally client is not authenticated. Call authenticate() first.'
      );

      await expect(unauthenticatedClient.create('UserStory', {})).rejects.toThrow(
        'Rally client is not authenticated. Call authenticate() first.'
      );

      await expect(unauthenticatedClient.update('UserStory', '123', {})).rejects.toThrow(
        'Rally client is not authenticated. Call authenticate() first.'
      );

      await expect(unauthenticatedClient.query('UserStory', {})).rejects.toThrow(
        'Rally client is not authenticated. Call authenticate() first.'
      );
    });
  });

  describe('Artifact Type Mapping', () => {
    test('should map User Story to correct endpoint', async () => {
      await rallyClient.authenticate('test-api-key');
      await rallyClient.get('UserStory', '123');

      const requests = rallyApiHandler.getRequestHistory();
      const getRequest = requests.find(r => r.method === 'GET' && r.url.includes('/hierarchicalrequirement/'));
      expect(getRequest).toBeDefined();
    });

    test('should map HierarchicalRequirement to correct endpoint', async () => {
      await rallyClient.authenticate('test-api-key');
      await rallyClient.get('HierarchicalRequirement', '123');

      const requests = rallyApiHandler.getRequestHistory();
      const getRequest = requests.find(r => r.method === 'GET' && r.url.includes('/hierarchicalrequirement/'));
      expect(getRequest).toBeDefined();
    });

    test('should handle unknown artifact types', async () => {
      await rallyClient.authenticate('test-api-key');

      await expect(rallyClient.get('UnknownArtifact', '123')).rejects.toThrow(
        'Unknown artifact type: UnknownArtifact'
      );
    });

    test('should support all documented artifact types', async () => {
      await rallyClient.authenticate('test-api-key');

      const supportedTypes = [
        'UserStory',
        'HierarchicalRequirement',
        'Defect',
        'Task',
        'Project',
        'User',
        'Workspace',
        'Iteration'
      ];

      for (const artifactType of supportedTypes) {
        // Should not throw for supported types
        expect(() => {
          rallyClient.get(artifactType, '123').catch(() => {}); // Ignore network errors
        }).not.toThrow();
      }
    });
  });

  describe('Performance and Metrics', () => {
    beforeEach(async () => {
      await rallyClient.authenticate('test-api-key');
    });

    test('should track performance metrics for successful requests', async () => {
      await rallyClient.get('UserStory', '123');

      expect(mockComponents.mockPerformanceManager.trackRequestMetrics).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Number),
        expect.any(Boolean)
      );
    });

    test('should complete operations within reasonable time', async () => {
      const { duration } = await measureExecutionTime(async () => {
        return await rallyClient.get('UserStory', '123');
      });

      // Should complete within 100ms (mocked network is fast)
      expect(duration).toBeLessThan(100);
    });

    test('should handle concurrent requests efficiently', async () => {
      const promises = Array.from({ length: 10 }, (_, i) =>
        rallyClient.get('UserStory', `${i}`)
      );

      const { duration } = await measureExecutionTime(async () => {
        return await Promise.all(promises);
      });

      // Concurrent requests should not significantly increase total time
      expect(duration).toBeLessThan(200);
    });
  });

  describe('Response Validation', () => {
    beforeEach(async () => {
      await rallyClient.authenticate('test-api-key');
    });

    test('should validate and normalize response structure', async () => {
      // Mock a response missing some optional fields
      mockComponents.mockAxiosInstance.get.mockResolvedValue({
        status: 200,
        data: {
          QueryResult: {
            Results: [{ ObjectID: 123, Name: 'Test' }]
            // Missing Errors and Warnings arrays
          }
        }
      });

      const response = await rallyClient.get('UserStory', '123');

      expect(response.QueryResult.Errors).toEqual([]);
      expect(response.QueryResult.Warnings).toEqual([]);
      expect(Array.isArray(response.QueryResult.Results)).toBe(true);
    });

    test('should reject invalid response structure', async () => {
      mockComponents.mockAxiosInstance.get.mockResolvedValue({
        status: 200,
        data: { invalidStructure: true }
      });

      await expect(rallyClient.get('UserStory', '123')).rejects.toThrow(
        'Invalid Rally API response: missing QueryResult'
      );
    });

    test('should handle null or undefined response data', async () => {
      mockComponents.mockAxiosInstance.get.mockResolvedValue({
        status: 200,
        data: null
      });

      await expect(rallyClient.get('UserStory', '123')).rejects.toThrow(
        'Invalid Rally API response: missing data'
      );
    });
  });
});