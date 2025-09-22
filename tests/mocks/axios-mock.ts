/**
 * Axios Mock Utilities
 *
 * Centralized HTTP mocking utilities for testing Rally API interactions.
 * Provides both basic mocks and specific Rally API endpoint mocks.
 */

import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import {
  mockUserStoryResponse,
  mockUserStoryListResponse,
  mockDefectResponse,
  mockTaskResponse,
  mockRallyErrorResponse,
  mockAuthResponse,
  mockHttpResponses,
  createMockUserStory,
  createMockDefect,
  createMockTask
} from './rally-api-responses';

// Mock axios module
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Create a mock axios instance
export const createMockAxiosInstance = (): jest.Mocked<AxiosInstance> => {
  const mockInstance = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    patch: jest.fn(),
    request: jest.fn(),
    defaults: {
      baseURL: '',
      headers: {
        common: {}
      }
    },
    interceptors: {
      request: {
        use: jest.fn(),
        eject: jest.fn()
      },
      response: {
        use: jest.fn(),
        eject: jest.fn()
      }
    }
  } as any;

  return mockInstance;
};

// Setup default axios mock to return our mock instance
export const setupAxiosMocks = (): jest.Mocked<AxiosInstance> => {
  const mockInstance = createMockAxiosInstance();
  mockedAxios.create.mockReturnValue(mockInstance);
  return mockInstance;
};

// Rally API endpoint handlers
export class RallyApiMockHandler {
  private mockInstance: jest.Mocked<AxiosInstance>;
  private requestHistory: Array<{ method: string; url: string; data?: any; params?: any }> = [];

  constructor(mockInstance: jest.Mocked<AxiosInstance>) {
    this.mockInstance = mockInstance;
    this.setupDefaultHandlers();
  }

  private setupDefaultHandlers(): void {
    // Default GET handler
    this.mockInstance.get.mockImplementation((url: string, config?: any) => {
      this.recordRequest('GET', url, undefined, config?.params);
      return this.handleGetRequest(url, config?.params);
    });

    // Default POST handler
    this.mockInstance.post.mockImplementation((url: string, data?: any, config?: any) => {
      this.recordRequest('POST', url, data, config?.params);
      return this.handlePostRequest(url, data);
    });
  }

  private recordRequest(method: string, url: string, data?: any, params?: any): void {
    this.requestHistory.push({ method, url, data, params });
  }

  public getRequestHistory(): Array<{ method: string; url: string; data?: any; params?: any }> {
    return [...this.requestHistory];
  }

  public clearRequestHistory(): void {
    this.requestHistory = [];
  }

  private async handleGetRequest(url: string, params?: any): Promise<AxiosResponse> {
    // Authentication endpoint (workspace test for auth)
    if (url.includes('/workspace')) {
      return Promise.resolve({
        status: 200,
        statusText: 'OK',
        data: {
          QueryResult: {
            Errors: [],
            Warnings: [],
            Results: [
              {
                _ref: "https://test.rallydev.com/slm/webservice/v2.0/workspace/123456",
                _type: "Workspace",
                ObjectID: 123456,
                Name: "Test Workspace"
              }
            ],
            TotalResultCount: 1
          }
        },
        headers: {},
        config: {} as any
      });
    }

    // Legacy authentication endpoint (for backwards compatibility)
    if (url.includes('/security/authorize')) {
      return Promise.resolve({
        status: 200,
        statusText: 'OK',
        data: mockAuthResponse,
        headers: {},
        config: {} as any
      });
    }

    // User Story endpoints
    if (url.includes('/hierarchicalrequirement')) {
      // Single user story
      if (url.match(/\/hierarchicalrequirement\/\d+$/)) {
        const objectId = url.split('/').pop();
        if (objectId === '404') {
          return Promise.reject(this.createAxiosError(404, 'Not Found'));
        }
        return Promise.resolve({
          status: 200,
          statusText: 'OK',
          data: mockUserStoryResponse,
          headers: {},
          config: {} as any
        });
      }

      // Query user stories
      return Promise.resolve({
        status: 200,
        statusText: 'OK',
        data: mockUserStoryListResponse,
        headers: {},
        config: {} as any
      });
    }

    // Defect endpoints
    if (url.includes('/defect')) {
      return Promise.resolve({
        status: 200,
        statusText: 'OK',
        data: mockDefectResponse,
        headers: {},
        config: {} as any
      });
    }

    // Task endpoints
    if (url.includes('/task')) {
      return Promise.resolve({
        status: 200,
        statusText: 'OK',
        data: mockTaskResponse,
        headers: {},
        config: {} as any
      });
    }

    // Default fallback
    return Promise.reject(this.createAxiosError(404, 'Endpoint not found'));
  }

  private async handlePostRequest(url: string, data?: any): Promise<AxiosResponse> {
    // Create User Story
    if (url.includes('/hierarchicalrequirement')) {
      if (data?.UserStory?.Name === 'VALIDATION_ERROR') {
        return Promise.reject(this.createAxiosError(422, 'Validation Error'));
      }

      const createdStory = createMockUserStory({
        Name: data?.UserStory?.Name || 'Created User Story',
        Description: data?.UserStory?.Description || 'Created via API'
      });

      return Promise.resolve({
        status: 201,
        statusText: 'Created',
        data: {
          QueryResult: {
            Errors: [],
            Warnings: [],
            Results: [createdStory],
            TotalResultCount: 1
          }
        },
        headers: {},
        config: {} as any
      });
    }

    // Create Defect
    if (url.includes('/defect')) {
      const createdDefect = createMockDefect({
        Name: data?.Defect?.Name || 'Created Defect',
        Description: data?.Defect?.Description || 'Created via API'
      });

      return Promise.resolve({
        status: 201,
        statusText: 'Created',
        data: {
          QueryResult: {
            Errors: [],
            Warnings: [],
            Results: [createdDefect],
            TotalResultCount: 1
          }
        },
        headers: {},
        config: {} as any
      });
    }

    // Create Task
    if (url.includes('/task')) {
      const createdTask = createMockTask({
        Name: data?.Task?.Name || 'Created Task',
        Description: data?.Task?.Description || 'Created via API'
      });

      return Promise.resolve({
        status: 201,
        statusText: 'Created',
        data: {
          QueryResult: {
            Errors: [],
            Warnings: [],
            Results: [createdTask],
            TotalResultCount: 1
          }
        },
        headers: {},
        config: {} as any
      });
    }

    return Promise.reject(this.createAxiosError(404, 'Endpoint not found'));
  }

  private createAxiosError(status: number, message: string): AxiosError {
    const error = new Error(message) as AxiosError;
    error.name = 'AxiosError';
    error.isAxiosError = true;
    error.response = {
      status,
      statusText: message,
      data: status === 404 ? mockHttpResponses.notFound.data : mockHttpResponses.validationError.data,
      headers: {},
      config: {} as any
    };
    error.code = status.toString();
    return error;
  }

  // Specific error simulation methods
  public simulateNetworkError(): void {
    this.mockInstance.get.mockRejectedValue(
      Object.assign(new Error('Network Error'), {
        code: 'ECONNREFUSED',
        isAxiosError: true
      })
    );
  }

  public simulateTimeout(): void {
    this.mockInstance.get.mockRejectedValue(
      Object.assign(new Error('timeout of 10000ms exceeded'), {
        code: 'ECONNABORTED',
        isAxiosError: true
      })
    );
  }

  public simulateUnauthorized(): void {
    this.mockInstance.get.mockRejectedValue(
      this.createAxiosError(401, 'Unauthorized')
    );
  }

  public simulateRateLimiting(): void {
    this.mockInstance.get.mockRejectedValue(
      this.createAxiosError(429, 'Too Many Requests')
    );
  }

  public simulateServerError(): void {
    this.mockInstance.get.mockRejectedValue(
      this.createAxiosError(500, 'Internal Server Error')
    );
  }

  // Reset all mocks to default behavior
  public reset(): void {
    this.clearRequestHistory();
    this.mockInstance.get.mockReset();
    this.mockInstance.post.mockReset();
    this.setupDefaultHandlers();
  }
}

// Export commonly used mock responses
export {
  mockUserStoryResponse,
  mockDefectResponse,
  mockTaskResponse,
  mockRallyErrorResponse,
  mockAuthResponse,
  createMockUserStory,
  createMockDefect,
  createMockTask
};