/**
 * Enhanced Error Handler
 *
 * Comprehensive error handling system with classification, context tracking,
 * and recovery strategy determination.
 *
 * Requirements: req-020 (Error Handling), ADR-006 (Error Handling Strategy)
 */

import { AxiosError } from 'axios';
import { v4 as uuidv4 } from 'uuid';
import {
  MCPError,
  MCPErrorType,
  ErrorSeverity,
  ErrorContext,
  RecoveryOptions,
  RecoveryStrategy,
  RALLY_ERROR_MAPPINGS,
  NETWORK_ERROR_PATTERNS,
  DEFAULT_RECOVERY_OPTIONS
} from './ErrorTypes';
import { Logger } from '../logging/Logger';

export interface ErrorHandlerConfig {
  environment: string;
  version: string;
  enableStackTrace: boolean;
  enableErrorAggregation: boolean;
  maxErrorHistory: number;
  correlationIdHeader?: string;
}

export interface ErrorMetrics {
  totalErrors: number;
  errorsByType: Record<MCPErrorType, number>;
  errorsBySeverity: Record<ErrorSeverity, number>;
  recentErrors: MCPError[];
  errorRate: number;
  mttr: number; // Mean Time To Recovery
  errorPatterns: {
    type: MCPErrorType;
    count: number;
    trend: 'increasing' | 'decreasing' | 'stable';
  }[];
}

export class ErrorHandler {
  private errorHistory: MCPError[] = [];
  private errorCounts: Map<MCPErrorType, number> = new Map();
  private logger: Logger;
  private config: ErrorHandlerConfig;

  constructor(config: ErrorHandlerConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;
  }

  /**
   * Main error handling entry point
   */
  handleError(
    error: unknown,
    operation: string,
    context?: Partial<ErrorContext>
  ): MCPError {
    const correlationId = context?.correlationId || uuidv4();

    // Create base error context
    const errorContext: ErrorContext = {
      correlationId,
      operation,
      timestamp: new Date(),
      environment: this.config.environment,
      version: this.config.version,
      component: 'mcp-rally-server',
      ...context
    };

    let mcpError: MCPError;

    if (error instanceof Error) {
      mcpError = this.processError(error, errorContext);
    } else if (this.isAxiosError(error)) {
      mcpError = this.processAxiosError(error, errorContext);
    } else {
      mcpError = this.processUnknownError(error, errorContext);
    }

    // Track error metrics
    this.trackError(mcpError);

    // Log error based on severity
    this.logError(mcpError);

    // Add to error history for analysis
    if (this.config.enableErrorAggregation) {
      this.addToHistory(mcpError);
    }

    return mcpError;
  }

  /**
   * Process standard JavaScript errors
   */
  private processError(error: Error, context: ErrorContext): MCPError {
    const errorType = this.classifyError(error);
    const severity = this.determineSeverity(errorType, error);
    const recovery = this.determineRecoveryStrategy(errorType, error);

    return {
      type: errorType,
      severity,
      message: this.createUserFriendlyMessage(errorType, error.message),
      details: {
        originalMessage: error.message,
        name: error.name,
        cause: error.cause
      },
      context,
      recovery,
      stackTrace: this.config.enableStackTrace ? error.stack : undefined,
      metrics: {
        occurrenceCount: this.getErrorCount(errorType),
        firstOccurrence: new Date(),
        lastOccurrence: new Date(),
        affectedOperations: [context.operation]
      }
    };
  }

  /**
   * Process Axios HTTP errors
   */
  private processAxiosError(error: AxiosError, context: ErrorContext): MCPError {
    const { response, request, code, message } = error;
    let errorType: MCPErrorType;
    let severity: ErrorSeverity;
    let rallyErrorCode: string | undefined;
    let rallyErrorMessage: string | undefined;

    if (response) {
      // HTTP response error
      const status = response.status.toString();
      const mapping = RALLY_ERROR_MAPPINGS[status];

      if (mapping) {
        errorType = mapping.type;
        severity = mapping.severity;
      } else {
        errorType = MCPErrorType.RALLY_API_ERROR;
        severity = this.getHttpErrorSeverity(response.status);
      }

      rallyErrorCode = status;
      rallyErrorMessage = this.extractRallyErrorMessage(response.data);

      // Update context with response details
      context.endpoint = error.config?.url;
    } else if (request) {
      // Network error
      errorType = this.classifyNetworkError(message);
      severity = ErrorSeverity.HIGH;
    } else {
      // Request setup error
      errorType = MCPErrorType.CONFIGURATION_ERROR;
      severity = ErrorSeverity.MEDIUM;
    }

    const recovery = this.determineRecoveryStrategy(errorType, error);

    return {
      type: errorType,
      severity,
      message: this.createUserFriendlyMessage(errorType, message),
      details: {
        httpStatus: response?.status,
        httpStatusText: response?.statusText,
        responseData: response?.data,
        requestUrl: error.config?.url,
        requestMethod: error.config?.method?.toUpperCase(),
        axiosCode: code,
        headers: response?.headers
      },
      context,
      recovery,
      rallyErrorCode,
      rallyErrorMessage,
      stackTrace: this.config.enableStackTrace ? error.stack : undefined,
      metrics: {
        occurrenceCount: this.getErrorCount(errorType),
        firstOccurrence: new Date(),
        lastOccurrence: new Date(),
        affectedOperations: [context.operation]
      }
    };
  }

  /**
   * Process unknown error types
   */
  private processUnknownError(error: unknown, context: ErrorContext): MCPError {
    const errorType = MCPErrorType.UNEXPECTED_ERROR;
    const severity = ErrorSeverity.HIGH;
    const recovery = DEFAULT_RECOVERY_OPTIONS[errorType];

    return {
      type: errorType,
      severity,
      message: 'An unexpected error occurred',
      details: {
        error: String(error),
        type: typeof error
      },
      context,
      recovery,
      metrics: {
        occurrenceCount: this.getErrorCount(errorType),
        firstOccurrence: new Date(),
        lastOccurrence: new Date(),
        affectedOperations: [context.operation]
      }
    };
  }

  /**
   * Classify error based on error properties
   */
  private classifyError(error: Error): MCPErrorType {
    const message = error.message.toLowerCase();
    const name = error.name.toLowerCase();

    // Check validation errors
    if (name.includes('validation') || message.includes('validation')) {
      return MCPErrorType.VALIDATION_ERROR;
    }

    // Check network patterns
    for (const pattern of NETWORK_ERROR_PATTERNS) {
      if (pattern.pattern.test(message) || pattern.pattern.test(name)) {
        return pattern.errorType;
      }
    }

    // Check for common error types
    if (name.includes('typeerror')) {
      return MCPErrorType.DATA_TRANSFORMATION_ERROR;
    }

    if (name.includes('syntaxerror')) {
      return MCPErrorType.SERIALIZATION_ERROR;
    }

    if (message.includes('authentication') || message.includes('unauthorized')) {
      return MCPErrorType.AUTHENTICATION_ERROR;
    }

    if (message.includes('permission') || message.includes('forbidden')) {
      return MCPErrorType.PERMISSION_ERROR;
    }

    return MCPErrorType.INTERNAL_ERROR;
  }

  /**
   * Classify network errors based on error message
   */
  private classifyNetworkError(message: string): MCPErrorType {
    for (const pattern of NETWORK_ERROR_PATTERNS) {
      if (pattern.pattern.test(message)) {
        return pattern.errorType;
      }
    }
    return MCPErrorType.NETWORK_ERROR;
  }

  /**
   * Determine error severity based on type and context
   */
  private determineSeverity(errorType: MCPErrorType, error: Error): ErrorSeverity {
    // Check Rally error mappings first
    const rallyMapping = Object.values(RALLY_ERROR_MAPPINGS)
      .find(mapping => mapping.type === errorType);

    if (rallyMapping) {
      return rallyMapping.severity;
    }

    // Default severity mapping
    switch (errorType) {
      case MCPErrorType.AUTHENTICATION_ERROR:
      case MCPErrorType.API_KEY_INVALID:
      case MCPErrorType.API_KEY_EXPIRED:
      case MCPErrorType.SSL_CERTIFICATE_ERROR:
      case MCPErrorType.CONFIGURATION_ERROR:
        return ErrorSeverity.CRITICAL;

      case MCPErrorType.RALLY_SERVICE_UNAVAILABLE:
      case MCPErrorType.DNS_RESOLUTION_ERROR:
      case MCPErrorType.RESOURCE_EXHAUSTION:
        return ErrorSeverity.HIGH;

      case MCPErrorType.VALIDATION_ERROR:
      case MCPErrorType.NOT_FOUND_ERROR:
      case MCPErrorType.RALLY_RATE_LIMIT:
      case MCPErrorType.CONNECTION_TIMEOUT:
        return ErrorSeverity.MEDIUM;

      default:
        return ErrorSeverity.LOW;
    }
  }

  /**
   * Determine recovery strategy for error type
   */
  private determineRecoveryStrategy(errorType: MCPErrorType, error: Error): RecoveryOptions {
    // Check Rally error mappings first
    const rallyMapping = Object.values(RALLY_ERROR_MAPPINGS)
      .find(mapping => mapping.type === errorType);

    if (rallyMapping) {
      const baseStrategy = DEFAULT_RECOVERY_OPTIONS[errorType];
      return {
        ...baseStrategy,
        strategy: rallyMapping.recovery
      };
    }

    return DEFAULT_RECOVERY_OPTIONS[errorType] || { strategy: RecoveryStrategy.FAIL_FAST };
  }

  /**
   * Get HTTP error severity based on status code
   */
  private getHttpErrorSeverity(status: number): ErrorSeverity {
    if (status >= 500) return ErrorSeverity.HIGH;
    if (status >= 400) return ErrorSeverity.MEDIUM;
    return ErrorSeverity.LOW;
  }

  /**
   * Extract Rally-specific error message from response
   */
  private extractRallyErrorMessage(responseData: any): string | undefined {
    if (!responseData) return undefined;

    try {
      // Rally API error format
      if (responseData.QueryResult?.Errors?.length > 0) {
        return responseData.QueryResult.Errors[0];
      }

      if (responseData.Errors?.length > 0) {
        return responseData.Errors[0];
      }

      if (responseData.error?.message) {
        return responseData.error.message;
      }

      if (typeof responseData === 'string') {
        return responseData;
      }
    } catch (err) {
      // Ignore parsing errors
    }

    return undefined;
  }

  /**
   * Create user-friendly error message
   */
  private createUserFriendlyMessage(errorType: MCPErrorType, originalMessage: string): string {
    const userMessages: Record<MCPErrorType, string> = {
      [MCPErrorType.AUTHENTICATION_ERROR]: 'Authentication failed. Please check your Rally API key.',
      [MCPErrorType.API_KEY_INVALID]: 'The provided Rally API key is invalid.',
      [MCPErrorType.API_KEY_EXPIRED]: 'Your Rally API key has expired. Please renew it.',
      [MCPErrorType.PERMISSION_ERROR]: 'You do not have permission to perform this operation.',
      [MCPErrorType.NOT_FOUND_ERROR]: 'The requested resource was not found.',
      [MCPErrorType.VALIDATION_ERROR]: 'The provided data is invalid.',
      [MCPErrorType.RALLY_SERVICE_UNAVAILABLE]: 'Rally service is temporarily unavailable. Please try again later.',
      [MCPErrorType.RALLY_RATE_LIMIT]: 'Rally API rate limit exceeded. Please wait before trying again.',
      [MCPErrorType.CONNECTION_TIMEOUT]: 'Connection timeout. Please check your network connection.',
      [MCPErrorType.NETWORK_ERROR]: 'Network error occurred. Please check your connection.',
      [MCPErrorType.CIRCUIT_BREAKER_OPEN]: 'Service is temporarily unavailable due to repeated failures.',
      [MCPErrorType.CONFIGURATION_ERROR]: 'Configuration error. Please check your settings.',
      [MCPErrorType.INTERNAL_ERROR]: 'An internal error occurred. Please try again.',
      [MCPErrorType.UNEXPECTED_ERROR]: 'An unexpected error occurred.'
    } as Record<MCPErrorType, string>;

    return userMessages[errorType] || `Error: ${originalMessage}`;
  }

  /**
   * Check if error is an Axios error
   */
  private isAxiosError(error: any): error is AxiosError {
    return error && error.isAxiosError === true;
  }

  /**
   * Track error for metrics
   */
  private trackError(error: MCPError): void {
    const count = this.errorCounts.get(error.type) || 0;
    this.errorCounts.set(error.type, count + 1);
  }

  /**
   * Get error count for specific type
   */
  private getErrorCount(errorType: MCPErrorType): number {
    return this.errorCounts.get(errorType) || 0;
  }

  /**
   * Log error based on severity
   */
  private logError(error: MCPError): void {
    const logData = {
      correlationId: error.context.correlationId,
      errorType: error.type,
      severity: error.severity,
      operation: error.context.operation,
      message: error.message,
      details: error.details,
      recovery: error.recovery.strategy,
      endpoint: error.context.endpoint,
      timestamp: error.context.timestamp
    };

    switch (error.severity) {
      case ErrorSeverity.CRITICAL:
        this.logger.error('Critical error occurred', logData);
        break;
      case ErrorSeverity.HIGH:
        this.logger.error('High severity error', logData);
        break;
      case ErrorSeverity.MEDIUM:
        this.logger.warn('Medium severity error', logData);
        break;
      case ErrorSeverity.LOW:
        this.logger.info('Low severity error', logData);
        break;
    }
  }

  /**
   * Add error to history for analysis
   */
  private addToHistory(error: MCPError): void {
    this.errorHistory.push(error);

    // Keep history bounded
    if (this.errorHistory.length > this.config.maxErrorHistory) {
      this.errorHistory = this.errorHistory.slice(-this.config.maxErrorHistory);
    }
  }

  /**
   * Get error metrics for monitoring
   */
  getErrorMetrics(): ErrorMetrics {
    const now = Date.now();
    const recentCutoff = now - (24 * 60 * 60 * 1000); // 24 hours
    const recentErrors = this.errorHistory.filter(e => e.context.timestamp.getTime() > recentCutoff);

    const errorsByType = {} as Record<MCPErrorType, number>;
    const errorsBySeverity = {} as Record<ErrorSeverity, number>;

    for (const error of recentErrors) {
      errorsByType[error.type] = (errorsByType[error.type] || 0) + 1;
      errorsBySeverity[error.severity] = (errorsBySeverity[error.severity] || 0) + 1;
    }

    const errorRate = recentErrors.length / 24; // errors per hour

    return {
      totalErrors: this.errorHistory.length,
      errorsByType,
      errorsBySeverity,
      recentErrors: recentErrors.slice(-10),
      errorRate,
      mttr: this.calculateMTTR(),
      errorPatterns: this.analyzeErrorPatterns()
    };
  }

  /**
   * Calculate Mean Time To Recovery
   */
  private calculateMTTR(): number {
    const resolvedErrors = this.errorHistory.filter(e => e.resolvedBy && e.resolutionTime);

    if (resolvedErrors.length === 0) return 0;

    const totalRecoveryTime = resolvedErrors.reduce((sum, error) => {
      const recoveryTime = error.resolutionTime!.getTime() - error.context.timestamp.getTime();
      return sum + recoveryTime;
    }, 0);

    return totalRecoveryTime / resolvedErrors.length;
  }

  /**
   * Analyze error patterns and trends
   */
  private analyzeErrorPatterns(): { type: MCPErrorType; count: number; trend: 'increasing' | 'decreasing' | 'stable' }[] {
    const patterns: { type: MCPErrorType; count: number; trend: 'increasing' | 'decreasing' | 'stable' }[] = [];

    for (const [errorType, count] of this.errorCounts.entries()) {
      patterns.push({
        type: errorType,
        count,
        trend: 'stable' // Simplified - would need historical data for real trend analysis
      });
    }

    return patterns.sort((a, b) => b.count - a.count);
  }

  /**
   * Clear error history (useful for testing)
   */
  clearErrorHistory(): void {
    this.errorHistory = [];
    this.errorCounts.clear();
  }

  /**
   * Mark error as resolved
   */
  resolveError(correlationId: string, resolvedBy: string): void {
    const error = this.errorHistory.find(e => e.context.correlationId === correlationId);
    if (error) {
      error.resolvedBy = resolvedBy;
      error.resolutionTime = new Date();
    }
  }
}