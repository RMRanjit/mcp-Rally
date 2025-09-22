/**
 * Enhanced Error Type Hierarchy
 *
 * Comprehensive error classification system for Rally MCP server
 * Provides specific error types, context information, and recovery strategies
 *
 * Requirements: req-020 (Error Handling), ADR-006 (Error Handling Strategy)
 */

export enum MCPErrorType {
  // Validation and Input Errors
  VALIDATION_ERROR = 'validation_error',
  SCHEMA_VALIDATION_ERROR = 'schema_validation_error',
  FIELD_VALIDATION_ERROR = 'field_validation_error',

  // Authentication and Authorization
  AUTHENTICATION_ERROR = 'authentication_error',
  API_KEY_INVALID = 'api_key_invalid',
  API_KEY_EXPIRED = 'api_key_expired',
  PERMISSION_ERROR = 'permission_error',
  UNAUTHORIZED_OPERATION = 'unauthorized_operation',

  // Rally API Specific Errors
  RALLY_API_ERROR = 'rally_api_error',
  RALLY_SERVER_ERROR = 'rally_server_error',
  RALLY_SERVICE_UNAVAILABLE = 'rally_service_unavailable',
  RALLY_RATE_LIMIT = 'rally_rate_limit',
  RALLY_WORKSPACE_ERROR = 'rally_workspace_error',
  RALLY_PROJECT_ERROR = 'rally_project_error',

  // Resource Errors
  NOT_FOUND_ERROR = 'not_found_error',
  RESOURCE_LOCKED = 'resource_locked',
  RESOURCE_CONFLICT = 'resource_conflict',
  RESOURCE_DELETED = 'resource_deleted',

  // Network and Infrastructure Errors
  NETWORK_ERROR = 'network_error',
  CONNECTION_TIMEOUT = 'connection_timeout',
  DNS_RESOLUTION_ERROR = 'dns_resolution_error',
  SSL_CERTIFICATE_ERROR = 'ssl_certificate_error',
  PROXY_ERROR = 'proxy_error',

  // Service and System Errors
  SERVICE_DEGRADED = 'service_degraded',
  SERVICE_OVERLOAD = 'service_overload',
  CIRCUIT_BREAKER_OPEN = 'circuit_breaker_open',
  RESOURCE_EXHAUSTION = 'resource_exhaustion',
  CONFIGURATION_ERROR = 'configuration_error',

  // MCP Protocol Errors
  MCP_PROTOCOL_ERROR = 'mcp_protocol_error',
  TRANSPORT_ERROR = 'transport_error',
  SERIALIZATION_ERROR = 'serialization_error',

  // Data Processing Errors
  DATA_TRANSFORMATION_ERROR = 'data_transformation_error',
  FIELD_MAPPING_ERROR = 'field_mapping_error',
  DATA_CORRUPTION_ERROR = 'data_corruption_error',

  // Internal System Errors
  INTERNAL_ERROR = 'internal_error',
  UNEXPECTED_ERROR = 'unexpected_error'
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum RecoveryStrategy {
  RETRY = 'retry',
  RETRY_WITH_BACKOFF = 'retry_with_backoff',
  CIRCUIT_BREAKER = 'circuit_breaker',
  FALLBACK = 'fallback',
  GRACEFUL_DEGRADATION = 'graceful_degradation',
  FAIL_FAST = 'fail_fast',
  USER_INTERVENTION = 'user_intervention'
}

export interface ErrorContext {
  correlationId: string;
  operation: string;
  endpoint?: string | undefined;
  userId?: string | undefined;
  sessionId?: string | undefined;
  requestId?: string | undefined;
  timestamp: Date;
  environment: string;
  version: string;
  component: string;
  retryAttempt?: number | undefined;
  previousErrors?: string[] | undefined;
}

export interface RecoveryOptions {
  strategy: RecoveryStrategy;
  maxRetries?: number | undefined;
  retryDelayMs?: number | undefined;
  backoffMultiplier?: number | undefined;
  circuitBreakerThreshold?: number | undefined;
  fallbackValue?: unknown;
  userMessage?: string | undefined;
}

export interface MCPError {
  type: MCPErrorType;
  severity: ErrorSeverity;
  message: string;
  details?: unknown;
  context: ErrorContext;
  recovery: RecoveryOptions;
  rallyErrorCode?: string | undefined;
  rallyErrorMessage?: string | undefined;
  stackTrace?: string | undefined;
  causedBy?: MCPError | undefined;
  resolvedBy?: string | undefined;
  resolutionTime?: Date | undefined;
  metrics?: {
    occurrenceCount: number;
    firstOccurrence: Date;
    lastOccurrence: Date;
    affectedOperations: string[];
  } | undefined;
}

export interface ErrorPattern {
  errorType: MCPErrorType;
  pattern: RegExp;
  severity: ErrorSeverity;
  recovery: RecoveryOptions;
  description: string;
}

// Rally-specific error code mappings
export const RALLY_ERROR_MAPPINGS: Record<string, { type: MCPErrorType; severity: ErrorSeverity; recovery: RecoveryStrategy }> = {
  // Authentication Errors
  '401': { type: MCPErrorType.AUTHENTICATION_ERROR, severity: ErrorSeverity.HIGH, recovery: RecoveryStrategy.USER_INTERVENTION },
  'INVALID_KEY': { type: MCPErrorType.API_KEY_INVALID, severity: ErrorSeverity.HIGH, recovery: RecoveryStrategy.USER_INTERVENTION },
  'EXPIRED_KEY': { type: MCPErrorType.API_KEY_EXPIRED, severity: ErrorSeverity.HIGH, recovery: RecoveryStrategy.USER_INTERVENTION },

  // Permission Errors
  '403': { type: MCPErrorType.PERMISSION_ERROR, severity: ErrorSeverity.HIGH, recovery: RecoveryStrategy.USER_INTERVENTION },
  'INSUFFICIENT_PERMISSIONS': { type: MCPErrorType.UNAUTHORIZED_OPERATION, severity: ErrorSeverity.MEDIUM, recovery: RecoveryStrategy.USER_INTERVENTION },

  // Resource Errors
  '404': { type: MCPErrorType.NOT_FOUND_ERROR, severity: ErrorSeverity.MEDIUM, recovery: RecoveryStrategy.FAIL_FAST },
  'OBJECT_NOT_FOUND': { type: MCPErrorType.NOT_FOUND_ERROR, severity: ErrorSeverity.MEDIUM, recovery: RecoveryStrategy.FAIL_FAST },
  'OBJECT_DELETED': { type: MCPErrorType.RESOURCE_DELETED, severity: ErrorSeverity.MEDIUM, recovery: RecoveryStrategy.FAIL_FAST },

  // Validation Errors
  '422': { type: MCPErrorType.VALIDATION_ERROR, severity: ErrorSeverity.MEDIUM, recovery: RecoveryStrategy.FAIL_FAST },
  'VALIDATION_FAILED': { type: MCPErrorType.FIELD_VALIDATION_ERROR, severity: ErrorSeverity.MEDIUM, recovery: RecoveryStrategy.FAIL_FAST },
  'INVALID_FIELD': { type: MCPErrorType.FIELD_VALIDATION_ERROR, severity: ErrorSeverity.MEDIUM, recovery: RecoveryStrategy.FAIL_FAST },

  // Rally Service Errors
  '500': { type: MCPErrorType.RALLY_SERVER_ERROR, severity: ErrorSeverity.HIGH, recovery: RecoveryStrategy.RETRY_WITH_BACKOFF },
  '502': { type: MCPErrorType.RALLY_SERVICE_UNAVAILABLE, severity: ErrorSeverity.HIGH, recovery: RecoveryStrategy.CIRCUIT_BREAKER },
  '503': { type: MCPErrorType.RALLY_SERVICE_UNAVAILABLE, severity: ErrorSeverity.HIGH, recovery: RecoveryStrategy.CIRCUIT_BREAKER },
  '504': { type: MCPErrorType.CONNECTION_TIMEOUT, severity: ErrorSeverity.HIGH, recovery: RecoveryStrategy.RETRY_WITH_BACKOFF },

  // Rate Limiting
  '429': { type: MCPErrorType.RALLY_RATE_LIMIT, severity: ErrorSeverity.MEDIUM, recovery: RecoveryStrategy.RETRY_WITH_BACKOFF },
  'RATE_LIMIT_EXCEEDED': { type: MCPErrorType.RALLY_RATE_LIMIT, severity: ErrorSeverity.MEDIUM, recovery: RecoveryStrategy.RETRY_WITH_BACKOFF },

  // Workspace/Project Errors
  'INVALID_WORKSPACE': { type: MCPErrorType.RALLY_WORKSPACE_ERROR, severity: ErrorSeverity.MEDIUM, recovery: RecoveryStrategy.USER_INTERVENTION },
  'INVALID_PROJECT': { type: MCPErrorType.RALLY_PROJECT_ERROR, severity: ErrorSeverity.MEDIUM, recovery: RecoveryStrategy.USER_INTERVENTION },
  'WORKSPACE_ACCESS_DENIED': { type: MCPErrorType.RALLY_WORKSPACE_ERROR, severity: ErrorSeverity.HIGH, recovery: RecoveryStrategy.USER_INTERVENTION }
};

// Network error patterns
export const NETWORK_ERROR_PATTERNS: ErrorPattern[] = [
  {
    errorType: MCPErrorType.CONNECTION_TIMEOUT,
    pattern: /timeout|ETIMEDOUT/i,
    severity: ErrorSeverity.MEDIUM,
    recovery: { strategy: RecoveryStrategy.RETRY_WITH_BACKOFF, maxRetries: 3, retryDelayMs: 1000, backoffMultiplier: 2 },
    description: 'Connection timeout - retry with exponential backoff'
  },
  {
    errorType: MCPErrorType.DNS_RESOLUTION_ERROR,
    pattern: /ENOTFOUND|getaddrinfo|DNS/i,
    severity: ErrorSeverity.HIGH,
    recovery: { strategy: RecoveryStrategy.CIRCUIT_BREAKER, circuitBreakerThreshold: 5 },
    description: 'DNS resolution failure - check network connectivity'
  },
  {
    errorType: MCPErrorType.NETWORK_ERROR,
    pattern: /ECONNREFUSED|ECONNRESET|EPIPE/i,
    severity: ErrorSeverity.HIGH,
    recovery: { strategy: RecoveryStrategy.RETRY_WITH_BACKOFF, maxRetries: 3, retryDelayMs: 2000, backoffMultiplier: 2 },
    description: 'Network connection error - retry with backoff'
  },
  {
    errorType: MCPErrorType.SSL_CERTIFICATE_ERROR,
    pattern: /certificate|SSL|TLS|CERT_/i,
    severity: ErrorSeverity.CRITICAL,
    recovery: { strategy: RecoveryStrategy.USER_INTERVENTION, userMessage: 'SSL certificate validation failed. Check server certificate.' },
    description: 'SSL certificate validation error - requires manual intervention'
  }
];

// Default recovery options by error type
export const DEFAULT_RECOVERY_OPTIONS: Record<MCPErrorType, RecoveryOptions> = {
  [MCPErrorType.VALIDATION_ERROR]: { strategy: RecoveryStrategy.FAIL_FAST },
  [MCPErrorType.SCHEMA_VALIDATION_ERROR]: { strategy: RecoveryStrategy.FAIL_FAST },
  [MCPErrorType.FIELD_VALIDATION_ERROR]: { strategy: RecoveryStrategy.FAIL_FAST },

  [MCPErrorType.AUTHENTICATION_ERROR]: { strategy: RecoveryStrategy.USER_INTERVENTION },
  [MCPErrorType.API_KEY_INVALID]: { strategy: RecoveryStrategy.USER_INTERVENTION },
  [MCPErrorType.API_KEY_EXPIRED]: { strategy: RecoveryStrategy.USER_INTERVENTION },
  [MCPErrorType.PERMISSION_ERROR]: { strategy: RecoveryStrategy.USER_INTERVENTION },
  [MCPErrorType.UNAUTHORIZED_OPERATION]: { strategy: RecoveryStrategy.USER_INTERVENTION },

  [MCPErrorType.RALLY_API_ERROR]: { strategy: RecoveryStrategy.RETRY_WITH_BACKOFF, maxRetries: 3, retryDelayMs: 1000, backoffMultiplier: 2 },
  [MCPErrorType.RALLY_SERVER_ERROR]: { strategy: RecoveryStrategy.RETRY_WITH_BACKOFF, maxRetries: 3, retryDelayMs: 2000, backoffMultiplier: 2 },
  [MCPErrorType.RALLY_SERVICE_UNAVAILABLE]: { strategy: RecoveryStrategy.CIRCUIT_BREAKER, circuitBreakerThreshold: 5 },
  [MCPErrorType.RALLY_RATE_LIMIT]: { strategy: RecoveryStrategy.RETRY_WITH_BACKOFF, maxRetries: 5, retryDelayMs: 5000, backoffMultiplier: 2 },
  [MCPErrorType.RALLY_WORKSPACE_ERROR]: { strategy: RecoveryStrategy.USER_INTERVENTION },
  [MCPErrorType.RALLY_PROJECT_ERROR]: { strategy: RecoveryStrategy.USER_INTERVENTION },

  [MCPErrorType.NOT_FOUND_ERROR]: { strategy: RecoveryStrategy.FAIL_FAST },
  [MCPErrorType.RESOURCE_LOCKED]: { strategy: RecoveryStrategy.RETRY_WITH_BACKOFF, maxRetries: 3, retryDelayMs: 5000, backoffMultiplier: 1.5 },
  [MCPErrorType.RESOURCE_CONFLICT]: { strategy: RecoveryStrategy.RETRY, maxRetries: 2, retryDelayMs: 1000 },
  [MCPErrorType.RESOURCE_DELETED]: { strategy: RecoveryStrategy.FAIL_FAST },

  [MCPErrorType.NETWORK_ERROR]: { strategy: RecoveryStrategy.RETRY_WITH_BACKOFF, maxRetries: 3, retryDelayMs: 1000, backoffMultiplier: 2 },
  [MCPErrorType.CONNECTION_TIMEOUT]: { strategy: RecoveryStrategy.RETRY_WITH_BACKOFF, maxRetries: 3, retryDelayMs: 2000, backoffMultiplier: 2 },
  [MCPErrorType.DNS_RESOLUTION_ERROR]: { strategy: RecoveryStrategy.CIRCUIT_BREAKER, circuitBreakerThreshold: 5 },
  [MCPErrorType.SSL_CERTIFICATE_ERROR]: { strategy: RecoveryStrategy.USER_INTERVENTION },
  [MCPErrorType.PROXY_ERROR]: { strategy: RecoveryStrategy.RETRY_WITH_BACKOFF, maxRetries: 3, retryDelayMs: 1000, backoffMultiplier: 2 },

  [MCPErrorType.SERVICE_DEGRADED]: { strategy: RecoveryStrategy.GRACEFUL_DEGRADATION },
  [MCPErrorType.SERVICE_OVERLOAD]: { strategy: RecoveryStrategy.CIRCUIT_BREAKER, circuitBreakerThreshold: 3 },
  [MCPErrorType.CIRCUIT_BREAKER_OPEN]: { strategy: RecoveryStrategy.GRACEFUL_DEGRADATION },
  [MCPErrorType.RESOURCE_EXHAUSTION]: { strategy: RecoveryStrategy.CIRCUIT_BREAKER, circuitBreakerThreshold: 2 },
  [MCPErrorType.CONFIGURATION_ERROR]: { strategy: RecoveryStrategy.USER_INTERVENTION },

  [MCPErrorType.MCP_PROTOCOL_ERROR]: { strategy: RecoveryStrategy.FAIL_FAST },
  [MCPErrorType.TRANSPORT_ERROR]: { strategy: RecoveryStrategy.RETRY_WITH_BACKOFF, maxRetries: 3, retryDelayMs: 1000, backoffMultiplier: 2 },
  [MCPErrorType.SERIALIZATION_ERROR]: { strategy: RecoveryStrategy.FAIL_FAST },

  [MCPErrorType.DATA_TRANSFORMATION_ERROR]: { strategy: RecoveryStrategy.FAIL_FAST },
  [MCPErrorType.FIELD_MAPPING_ERROR]: { strategy: RecoveryStrategy.FAIL_FAST },
  [MCPErrorType.DATA_CORRUPTION_ERROR]: { strategy: RecoveryStrategy.FAIL_FAST },

  [MCPErrorType.INTERNAL_ERROR]: { strategy: RecoveryStrategy.RETRY, maxRetries: 1, retryDelayMs: 1000 },
  [MCPErrorType.UNEXPECTED_ERROR]: { strategy: RecoveryStrategy.FAIL_FAST }
};