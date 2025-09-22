/**
 * Core Interface Definitions
 *
 * Central interfaces defining the contracts between architectural components.
 * These interfaces implement the Bridge pattern separating abstraction from implementation.
 *
 * Requirements: ADR-001 (Core Architectural Patterns), ADR-002 (MCP Server Core Structure)
 */

export interface IMCPServer {
  initialize(): Promise<void>;
  shutdown(): Promise<void>;
}

export interface ITransportLayer {
  start(): Promise<void>;
  stop(): Promise<void>;
}

export interface IRallyClient {
  authenticate(apiKey: string): Promise<void>;
  create<T>(artifactType: string, data: T): Promise<RallyResponse<T>>;
  get<T>(artifactType: string, objectId: string): Promise<RallyResponse<T>>;
  update<T>(artifactType: string, objectId: string, data: Partial<T>): Promise<RallyResponse<T>>;
  query<T>(artifactType: string, query: RallyQuery): Promise<RallyResponse<T[]>>;
}

export interface IDataTransformer {
  rallyToMcp<T>(data: T): T;
  mcpToRally<T>(data: T): T;
  transformFieldNames(data: Record<string, unknown>): Record<string, unknown>;
}

export interface ISecurityManager {
  validateApiKey(providedApiKey?: string): Promise<boolean>;
  getAuthHeaders(providedApiKey?: string): Record<string, string>;
  sanitizeLogData(data: unknown): unknown;
  validateEnvironment(): void;
  getRallyBaseUrl(): string;
}

export interface IPerformanceManager {
  readonly httpClient: any; // Will be typed with axios once implemented
  trackRequestMetrics(operation: string, duration: number, success?: boolean, additionalData?: any): void;
  getPerformanceStats(): any;
  clearMetrics(): void;
  destroy?(): void;
  getPerformanceBaselines?(): Map<string, any>;
  getTimeSeriesData?(metric: string, hours?: number): any[];
  getSLAMetrics?(): any;
  resolveAlert?(alertId: string): boolean;
  getPerformanceAnalytics?(): any;
}

// Advanced Query Engine Interface
export interface IAdvancedQueryEngine {
  executeQuery<T>(request: any): Promise<any>;
  executeBatchQueries(requests: any[]): Promise<any[]>;
  executePagedQuery<T>(request: any, paginationOptions?: any): Promise<any>;
  createQuery(artifactType: string): any;
  getMetrics(): any;
  analyzeQueryPatterns(artifactType: string, daysBack?: number): string[];
  invalidateCache(options: any): number;
  getDebugInfo(): any;
  destroy(): void;
}

// Rally API Types
export interface RallyResponse<T> {
  QueryResult: {
    Errors: string[];
    Warnings: string[];
    Results: T extends Array<any> ? T : [T];
    TotalResultCount?: number;
    StartIndex?: number;
    PageSize?: number;
  };
}

export interface RallyQuery {
  query?: string;
  fetch?: string;
  order?: string;
  start?: number;
  pagesize?: number;
  workspace?: string;
  project?: string;
}

// Error Types (Requirements: req-020)
export enum MCPErrorType {
  VALIDATION_ERROR = 'validation_error',
  AUTHENTICATION_ERROR = 'authentication_error',
  NOT_FOUND_ERROR = 'not_found_error',
  PERMISSION_ERROR = 'permission_error',
  RALLY_API_ERROR = 'rally_api_error',
  NETWORK_ERROR = 'network_error',
}

export interface MCPError {
  type: MCPErrorType;
  message: string;
  details?: unknown;
  rallyErrorCode?: string;
}

export interface MCPMessage {
  jsonrpc: '2.0';
  id?: string | number | undefined;
  method?: string | undefined;
  params?: unknown;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  } | undefined;
}
