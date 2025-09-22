/**
 * Rally Client Implementation
 *
 * Handles all communication with Rally Web Services API.
 * Implements CRUD operations with authentication and error handling.
 *
 * Requirements: req-011 (API Key Authentication), req-012 (Secure Communication), req-020 (Error Handling)
 */

import { AxiosInstance, AxiosError } from 'axios';
import { IRallyClient, ISecurityManager, IPerformanceManager, RallyResponse, RallyQuery, MCPError, MCPErrorType } from '../core/interfaces';

export class RallyClient implements IRallyClient {
  private baseUrl: string;
  private httpClient: AxiosInstance;
  private isAuthenticated = false;

  constructor(
    private securityManager: ISecurityManager,
    private performanceManager: IPerformanceManager
  ) {
    this.baseUrl = this.securityManager.getRallyBaseUrl();
    this.httpClient = this.performanceManager.httpClient;

    // Configure base URL
    this.httpClient.defaults.baseURL = `${this.baseUrl}/slm/webservice/v2.0`;

    // Set default headers (without auth headers initially)
    this.httpClient.defaults.headers.common = {
      ...this.httpClient.defaults.headers.common,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
  }

  async authenticate(apiKey: string): Promise<void> {
    try {
      // Validate the API key format first
      await this.securityManager.validateApiKey(apiKey);

      // Update headers with the provided API key and integration info
      if (apiKey) {
        const authHeaders = this.securityManager.getAuthHeaders(apiKey);

        // Update all auth headers
        Object.assign(this.httpClient.defaults.headers.common, authHeaders);
      }

      // Test authentication by making a simple API call to workspaces
      const response = await this.httpClient.get('/workspace', {
        timeout: 10000, // Shorter timeout for auth check
        params: {
          fetch: 'Name',
          pagesize: '1'
        }
      });

      if (response.status === 200 && response.data) {
        this.isAuthenticated = true;
        // Only log to stderr in stdio mode to avoid interfering with MCP protocol
        if (process.env['RALLY_TRANSPORT'] !== 'stdio') {
          console.log('Rally API authentication successful');
          console.log(`Connected to Rally instance: ${this.baseUrl}`);
        } else {
          console.error('Rally API authentication successful');
          console.error(`Connected to Rally instance: ${this.baseUrl}`);
        }
      } else {
        console.error('Authentication failed - invalid response:', {
          status: response.status,
          statusText: response.statusText,
          data: this.securityManager.sanitizeLogData(response.data)
        });
        throw new Error('Authentication response was invalid');
      }
    } catch (error) {
      this.isAuthenticated = false;
      console.error('Rally API authentication error:', {
        baseUrl: this.baseUrl,
        endpoint: '/workspace',
        error: error instanceof Error ? error.message : String(error),
        headers: this.securityManager.sanitizeLogData(this.httpClient.defaults.headers.common)
      });
      throw this.handleError(error, 'Authentication failed');
    }
  }

  async create<T>(artifactType: string, data: T): Promise<RallyResponse<T>> {
    this.ensureAuthenticated();

    try {
      const endpoint = this.getEndpointForArtifact(artifactType);
      const rallyArtifactType = this.getRallyArtifactType(artifactType);
      const payload = {
        [rallyArtifactType]: data
      };

      const response = await this.httpClient.post(endpoint, payload);
      return this.validateRallyResponse<T>(response.data);
    } catch (error) {
      throw this.handleError(error, `Failed to create ${artifactType}`);
    }
  }

  async get<T>(artifactType: string, objectId: string): Promise<RallyResponse<T>> {
    this.ensureAuthenticated();

    try {
      const endpoint = this.getEndpointForArtifact(artifactType);
      const response = await this.httpClient.get(`${endpoint}/${objectId}`);
      return this.validateRallyResponse<T>(response.data);
    } catch (error) {
      throw this.handleError(error, `Failed to get ${artifactType} with ID ${objectId}`);
    }
  }

  async update<T>(artifactType: string, objectId: string, data: Partial<T>): Promise<RallyResponse<T>> {
    this.ensureAuthenticated();

    try {
      const endpoint = this.getEndpointForArtifact(artifactType);
      const rallyArtifactType = this.getRallyArtifactType(artifactType);
      const payload = {
        [rallyArtifactType]: data
      };

      const response = await this.httpClient.post(`${endpoint}/${objectId}`, payload);
      return this.validateRallyResponse<T>(response.data);
    } catch (error) {
      throw this.handleError(error, `Failed to update ${artifactType} with ID ${objectId}`);
    }
  }

  async query<T>(artifactType: string, query: RallyQuery): Promise<RallyResponse<T[]>> {
    this.ensureAuthenticated();

    try {
      const endpoint = this.getEndpointForArtifact(artifactType);
      const params = this.buildQueryParams(query);

      const response = await this.httpClient.get(endpoint, { params });
      return this.validateRallyResponse<T[]>(response.data);
    } catch (error) {
      throw this.handleError(error, `Failed to query ${artifactType}`);
    }
  }

  /**
   * Get the Rally API endpoint for a specific artifact type
   */
  private getEndpointForArtifact(artifactType: string): string {
    const artifactEndpoints: Record<string, string> = {
      'UserStory': '/hierarchicalrequirement',
      'HierarchicalRequirement': '/hierarchicalrequirement',
      'Defect': '/defect',
      'Task': '/task',
      'Project': '/project',
      'User': '/user',
      'Workspace': '/workspace',
      'Iteration': '/iteration'
    };

    const endpoint = artifactEndpoints[artifactType];
    if (!endpoint) {
      throw new Error(`Unknown artifact type: ${artifactType}`);
    }

    return endpoint;
  }

  /**
   * Get the Rally API artifact type name for payload
   */
  private getRallyArtifactType(artifactType: string): string {
    const artifactTypeMapping: Record<string, string> = {
      'UserStory': 'HierarchicalRequirement',
      'HierarchicalRequirement': 'HierarchicalRequirement',
      'Defect': 'Defect',
      'Task': 'Task',
      'Project': 'Project',
      'User': 'User',
      'Workspace': 'Workspace',
      'Iteration': 'Iteration'
    };

    return artifactTypeMapping[artifactType] || artifactType;
  }

  /**
   * Build query parameters for Rally API requests
   */
  private buildQueryParams(query: RallyQuery): Record<string, string> {
    const params: Record<string, string> = {};

    if (query['query']) {
      params['query'] = query['query'];
    }

    if (query['fetch']) {
      params['fetch'] = query['fetch'];
    } else {
      // Default fetch fields for most artifacts
      params['fetch'] = 'FormattedID,Name,Description,Owner,Project,CreationDate,LastUpdateDate';
    }

    if (query['order']) {
      params['order'] = query['order'];
    }

    if (query['start'] !== undefined) {
      params['start'] = query['start'].toString();
    }

    if (query['pagesize'] !== undefined) {
      params['pagesize'] = Math.min(query['pagesize'], 200).toString(); // Rally max is 200
    } else {
      params['pagesize'] = '20'; // Default page size
    }

    if (query['workspace']) {
      params['workspace'] = query['workspace'];
    }

    if (query['project']) {
      params['project'] = query['project'];
    }

    return params;
  }

  /**
   * Validate that the response follows Rally API format
   * Handles multiple Rally response formats:
   * 1. QueryResult (for query operations)
   * 2. CreateResult/OperationResult (for create/update operations)
   * 3. Direct object format (for individual get operations)
   */
  private validateRallyResponse<T>(data: unknown): RallyResponse<T> {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid Rally API response: missing data');
    }

    const response = data as any;

    // Handle CreateResult/OperationResult format (from create/update operations)
    if (response.CreateResult || response.OperationResult) {
      const result = response.CreateResult || response.OperationResult;

      // Normalize to QueryResult format for consistent handling
      const normalizedResponse = {
        QueryResult: {
          Errors: Array.isArray(result.Errors) ? result.Errors : [],
          Warnings: Array.isArray(result.Warnings) ? result.Warnings : [],
          Results: result.Object ? [result.Object] : []
        }
      };

      // Check for Rally API errors
      if (normalizedResponse.QueryResult.Errors.length > 0) {
        throw new Error(`Rally API error: ${normalizedResponse.QueryResult.Errors.join(', ')}`);
      }

      return normalizedResponse as RallyResponse<T>;
    }

    // Handle QueryResult format (from query operations)
    if (response.QueryResult) {
      const queryResult = response.QueryResult;
      if (!Array.isArray(queryResult.Errors)) {
        queryResult.Errors = [];
      }

      if (!Array.isArray(queryResult.Warnings)) {
        queryResult.Warnings = [];
      }

      if (!Array.isArray(queryResult.Results)) {
        queryResult.Results = [];
      }

      // Check for Rally API errors
      if (queryResult.Errors.length > 0) {
        throw new Error(`Rally API error: ${queryResult.Errors.join(', ')}`);
      }

      return response as RallyResponse<T>;
    }

    // Handle direct object format (from individual get operations)
    // Format: { "ArtifactType": { ...objectData..., "Errors": [], "Warnings": [] } }
    const possibleArtifactTypes = ['HierarchicalRequirement', 'Defect', 'Task', 'Project', 'User', 'Workspace', 'Iteration'];

    for (const artifactType of possibleArtifactTypes) {
      if (response[artifactType]) {
        const objectData = response[artifactType];

        // Check for errors in the object
        const errors = Array.isArray(objectData.Errors) ? objectData.Errors : [];
        const warnings = Array.isArray(objectData.Warnings) ? objectData.Warnings : [];

        if (errors.length > 0) {
          throw new Error(`Rally API error: ${errors.join(', ')}`);
        }

        // Normalize to QueryResult format for consistent handling
        const normalizedResponse = {
          QueryResult: {
            Errors: errors,
            Warnings: warnings,
            Results: [objectData]
          }
        };

        return normalizedResponse as RallyResponse<T>;
      }
    }

    throw new Error('Invalid Rally API response: missing QueryResult, CreateResult, OperationResult, or direct object format');
  }

  /**
   * Handle and translate errors from Rally API
   */
  private handleError(error: unknown, context: string): MCPError {
    if (error instanceof AxiosError) {
      // Network or HTTP errors
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        return {
          type: MCPErrorType.NETWORK_ERROR,
          message: `${context}: Network connection failed`,
          details: { code: error.code, config: error.config?.url }
        };
      }

      if (error.response) {
        const status = error.response.status;
        const data = error.response.data;

        switch (status) {
          case 401:
            console.error('Rally 401 Unauthorized Details:', {
              baseUrl: this.baseUrl,
              responseData: this.securityManager.sanitizeLogData(data),
              responseHeaders: this.securityManager.sanitizeLogData(error.response.headers)
            });
            return {
              type: MCPErrorType.AUTHENTICATION_ERROR,
              message: `${context}: Invalid API credentials. Check that your Rally API key is correct and has the required permissions.`,
              details: data,
              rallyErrorCode: status.toString()
            };

          case 403:
            return {
              type: MCPErrorType.PERMISSION_ERROR,
              message: `${context}: Permission denied`,
              details: data,
              rallyErrorCode: status.toString()
            };

          case 404:
            return {
              type: MCPErrorType.NOT_FOUND_ERROR,
              message: `${context}: Resource not found`,
              details: data,
              rallyErrorCode: status.toString()
            };

          case 422:
            return {
              type: MCPErrorType.VALIDATION_ERROR,
              message: `${context}: Validation failed`,
              details: data,
              rallyErrorCode: status.toString()
            };

          default:
            return {
              type: MCPErrorType.RALLY_API_ERROR,
              message: `${context}: Rally API error (${status})`,
              details: data,
              rallyErrorCode: status.toString()
            };
        }
      }

      // Request timeout or other axios errors
      return {
        type: MCPErrorType.NETWORK_ERROR,
        message: `${context}: ${error.message}`,
        details: { code: error.code }
      };
    }

    // Other errors
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      type: MCPErrorType.RALLY_API_ERROR,
      message: `${context}: ${errorMessage}`,
      details: error
    };
  }

  /**
   * Ensure the client is authenticated before making API calls
   */
  private ensureAuthenticated(): void {
    if (!this.isAuthenticated) {
      throw new Error('Rally client is not authenticated. Call authenticate() first.');
    }
  }

  /**
   * Check if the client is authenticated
   */
  isAuthenticatedClient(): boolean {
    return this.isAuthenticated;
  }

  /**
   * Get the configured Rally base URL
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }
}