/**
 * Structured Logger with Correlation IDs
 *
 * Provides comprehensive logging capabilities with correlation tracking,
 * structured output, and configurable log levels for production monitoring.
 *
 * Requirements: req-020 (Error Handling), Production Logging Features
 */

import { v4 as uuidv4 } from 'uuid';

export enum LogLevel {
  TRACE = 0,
  DEBUG = 1,
  INFO = 2,
  WARN = 3,
  ERROR = 4,
  FATAL = 5
}

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  correlationId?: string | undefined;
  operationId?: string | undefined;
  sessionId?: string | undefined;
  userId?: string | undefined;
  component: string;
  environment: string;
  version: string;
  metadata?: Record<string, unknown> | undefined;
  error?: {
    name: string;
    message: string;
    stack?: string | undefined;
    cause?: unknown;
  } | undefined;
  performance?: {
    duration: number;
    startTime: number;
    endTime: number;
  } | undefined;
  context?: Record<string, unknown> | undefined;
}

export interface LoggerConfig {
  level: LogLevel;
  environment: string;
  version: string;
  component: string;
  enableConsoleOutput: boolean;
  enableFileOutput: boolean;
  enableStructuredOutput: boolean;
  logFilePath?: string | undefined;
  maxFileSize: number;
  maxFiles: number;
  enableCorrelationTracking: boolean;
  sensitiveFields: string[];
  enablePerformanceLogging: boolean;
}

export interface CorrelationContext {
  correlationId: string;
  operationId?: string | undefined;
  sessionId?: string | undefined;
  userId?: string | undefined;
  parentContext?: CorrelationContext | undefined;
}

export class Logger {
  private config: LoggerConfig;
  private correlationContexts = new Map<string, CorrelationContext>();
  private currentContext: CorrelationContext | null = null;
  private logHistory: LogEntry[] = [];
  private readonly maxLogHistory = 10000;

  constructor(config: LoggerConfig) {
    this.config = config;
  }

  /**
   * Create or update correlation context
   */
  withCorrelation(context: Partial<CorrelationContext>): Logger {
    const correlationId = context.correlationId || uuidv4();

    const newContext: CorrelationContext = {
      correlationId,
      operationId: context.operationId,
      sessionId: context.sessionId,
      userId: context.userId,
      parentContext: this.currentContext || undefined
    };

    this.correlationContexts.set(correlationId, newContext);

    // Create new logger instance with this context
    const contextualLogger = new Logger(this.config);
    contextualLogger.currentContext = newContext;
    contextualLogger.logHistory = this.logHistory; // Share log history

    return contextualLogger;
  }

  /**
   * Clear correlation context
   */
  clearCorrelation(): void {
    this.currentContext = null;
  }

  /**
   * Log trace level message
   */
  trace(message: string, metadata?: Record<string, unknown>): void {
    this.log(LogLevel.TRACE, message, metadata);
  }

  /**
   * Log debug level message
   */
  debug(message: string, metadata?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, message, metadata);
  }

  /**
   * Log info level message
   */
  info(message: string, metadata?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, message, metadata);
  }

  /**
   * Log warning level message
   */
  warn(message: string, metadata?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, message, metadata);
  }

  /**
   * Log error level message
   */
  error(message: string, metadata?: Record<string, unknown>, error?: Error): void {
    const errorData = error ? {
      name: error.name,
      message: error.message,
      stack: this.shouldIncludeStackTrace() ? error.stack : undefined,
      cause: error.cause
    } : undefined;

    this.log(LogLevel.ERROR, message, metadata, errorData);
  }

  /**
   * Log fatal level message
   */
  fatal(message: string, metadata?: Record<string, unknown>, error?: Error): void {
    const errorData = error ? {
      name: error.name,
      message: error.message,
      stack: error.stack,
      cause: error.cause
    } : undefined;

    this.log(LogLevel.FATAL, message, metadata, errorData);
  }

  /**
   * Log performance measurement
   */
  performance(message: string, startTime: number, metadata?: Record<string, unknown>): void {
    const endTime = Date.now();
    const duration = endTime - startTime;

    const performanceData = {
      duration,
      startTime,
      endTime
    };

    this.log(LogLevel.INFO, message, metadata, undefined, performanceData);
  }

  /**
   * Start operation timing
   */
  startTiming(operationName: string): () => void {
    const startTime = Date.now();
    const operationId = uuidv4();

    this.debug(`Operation started: ${operationName}`, {
      operationId,
      operationName,
      startTime
    });

    return () => {
      const endTime = Date.now();
      const duration = endTime - startTime;

      this.performance(`Operation completed: ${operationName}`, startTime, {
        operationId,
        operationName,
        duration
      });
    };
  }

  /**
   * Core logging method
   */
  private log(
    level: LogLevel,
    message: string,
    metadata?: Record<string, unknown>,
    error?: LogEntry['error'],
    performance?: LogEntry['performance']
  ): void {
    // Check if log level is enabled
    if (level < this.config.level) {
      return;
    }

    // Sanitize metadata
    const sanitizedMetadata = this.sanitizeMetadata(metadata);

    // Create log entry
    const logEntry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      correlationId: this.currentContext?.correlationId,
      operationId: this.currentContext?.operationId,
      sessionId: this.currentContext?.sessionId,
      userId: this.currentContext?.userId,
      component: this.config.component,
      environment: this.config.environment,
      version: this.config.version,
      metadata: sanitizedMetadata,
      error,
      performance,
      context: this.buildLogContext()
    };

    // Store in history
    this.addToHistory(logEntry);

    // Output log entry
    this.outputLog(logEntry);
  }

  /**
   * Sanitize metadata to remove sensitive information
   */
  private sanitizeMetadata(metadata?: Record<string, unknown>): Record<string, unknown> | undefined {
    if (!metadata) return undefined;

    const sanitized = { ...metadata };

    for (const field of this.config.sensitiveFields) {
      if (field in sanitized) {
        if (typeof sanitized[field] === 'string') {
          const value = sanitized[field] as string;
          sanitized[field] = value.length > 4
            ? `${value.substring(0, 4)}****`
            : '****';
        } else {
          sanitized[field] = '[REDACTED]';
        }
      }
    }

    // Deep sanitization for nested objects
    return this.deepSanitize(sanitized);
  }

  /**
   * Deep sanitization of nested objects
   */
  private deepSanitize(obj: any): any {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.deepSanitize(item));
    }

    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (this.config.sensitiveFields.some(field =>
        key.toLowerCase().includes(field.toLowerCase()))) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = this.deepSanitize(value);
      }
    }

    return sanitized;
  }

  /**
   * Build log context with correlation information
   */
  private buildLogContext(): Record<string, unknown> {
    const context: Record<string, unknown> = {};

    if (this.currentContext) {
      context['correlationChain'] = this.buildCorrelationChain(this.currentContext);
    }

    // Add system context
    context['nodeVersion'] = process.version;
    context['platform'] = process.platform;
    context['architecture'] = process.arch;
    context['pid'] = process.pid;

    return context;
  }

  /**
   * Build correlation chain for tracing
   */
  private buildCorrelationChain(context: CorrelationContext): string[] {
    const chain: string[] = [context.correlationId];

    let current = context.parentContext;
    while (current) {
      chain.unshift(current.correlationId);
      current = current.parentContext;
    }

    return chain;
  }

  /**
   * Add log entry to history
   */
  private addToHistory(logEntry: LogEntry): void {
    this.logHistory.push(logEntry);

    // Keep history bounded
    if (this.logHistory.length > this.maxLogHistory) {
      this.logHistory = this.logHistory.slice(-this.maxLogHistory);
    }
  }

  /**
   * Output log entry to configured destinations
   */
  private outputLog(logEntry: LogEntry): void {
    if (this.config.enableConsoleOutput) {
      this.outputToConsole(logEntry);
    }

    if (this.config.enableFileOutput && this.config.logFilePath) {
      this.outputToFile(logEntry);
    }
  }

  /**
   * Output to console with appropriate formatting
   */
  private outputToConsole(logEntry: LogEntry): void {
    const levelName = LogLevel[logEntry.level];
    const timestamp = logEntry.timestamp.toISOString();

    if (this.config.enableStructuredOutput) {
      // Structured JSON output
      console.log(JSON.stringify({
        ...logEntry,
        level: levelName
      }));
    } else {
      // Human-readable format
      const correlationInfo = logEntry.correlationId
        ? ` [${logEntry.correlationId.substring(0, 8)}]`
        : '';

      const message = `${timestamp} ${levelName}${correlationInfo} [${logEntry.component}] ${logEntry.message}`;

      switch (logEntry.level) {
        case LogLevel.TRACE:
        case LogLevel.DEBUG:
          console.debug(message, logEntry.metadata || '');
          break;
        case LogLevel.INFO:
          console.info(message, logEntry.metadata || '');
          break;
        case LogLevel.WARN:
          console.warn(message, logEntry.metadata || '');
          break;
        case LogLevel.ERROR:
        case LogLevel.FATAL:
          console.error(message, logEntry.metadata || '', logEntry.error || '');
          break;
      }
    }
  }

  /**
   * Output to file (simplified implementation)
   */
  private outputToFile(logEntry: LogEntry): void {
    // In a real implementation, this would use proper file rotation
    // For now, we'll just append to console with a file marker
    if (this.config.enableStructuredOutput) {
      const fileOutput = JSON.stringify({
        ...logEntry,
        level: LogLevel[logEntry.level]
      });

      // In real implementation: fs.appendFileSync(this.config.logFilePath!, fileOutput + '\n');
      console.log(`[FILE] ${fileOutput}`);
    }
  }

  /**
   * Check if stack traces should be included
   */
  private shouldIncludeStackTrace(): boolean {
    return this.config.environment === 'development' || this.config.level <= LogLevel.DEBUG;
  }

  /**
   * Get log history for analysis
   */
  getLogHistory(filter?: {
    level?: LogLevel;
    correlationId?: string;
    component?: string;
    timeRange?: { start: Date; end: Date };
  }): LogEntry[] {
    let filtered = [...this.logHistory];

    if (filter) {
      if (filter.level !== undefined) {
        filtered = filtered.filter(entry => entry.level >= filter.level!);
      }

      if (filter.correlationId) {
        filtered = filtered.filter(entry => entry.correlationId === filter.correlationId);
      }

      if (filter.component) {
        filtered = filtered.filter(entry => entry.component === filter.component);
      }

      if (filter.timeRange) {
        filtered = filtered.filter(entry =>
          entry.timestamp >= filter.timeRange!.start &&
          entry.timestamp <= filter.timeRange!.end
        );
      }
    }

    return filtered;
  }

  /**
   * Get correlation context by ID
   */
  getCorrelationContext(correlationId: string): CorrelationContext | undefined {
    return this.correlationContexts.get(correlationId);
  }

  /**
   * Get current correlation context
   */
  getCurrentCorrelation(): CorrelationContext | null {
    return this.currentContext;
  }

  /**
   * Clear log history (useful for testing)
   */
  clearHistory(): void {
    this.logHistory = [];
  }

  /**
   * Set log level dynamically
   */
  setLevel(level: LogLevel): void {
    this.config.level = level;
  }

  /**
   * Create default configuration
   */
  static createDefaultConfig(): LoggerConfig {
    return {
      level: LogLevel.INFO,
      environment: process.env['NODE_ENV'] || 'development',
      version: process.env['npm_package_version'] || '1.0.0',
      component: 'mcp-rally-server',
      enableConsoleOutput: true,
      enableFileOutput: false,
      enableStructuredOutput: process.env['NODE_ENV'] === 'production',
      maxFileSize: 10 * 1024 * 1024, // 10MB
      maxFiles: 10,
      enableCorrelationTracking: true,
      sensitiveFields: ['password', 'token', 'key', 'secret', 'authorization'],
      enablePerformanceLogging: true
    };
  }

  /**
   * Create production configuration
   */
  static createProductionConfig(): LoggerConfig {
    return {
      ...Logger.createDefaultConfig(),
      level: LogLevel.INFO,
      enableStructuredOutput: true,
      enableFileOutput: true,
      logFilePath: '/var/log/mcp-rally/application.log'
    };
  }

  /**
   * Create development configuration
   */
  static createDevelopmentConfig(): LoggerConfig {
    return {
      ...Logger.createDefaultConfig(),
      level: LogLevel.DEBUG,
      enableStructuredOutput: false,
      enableFileOutput: false
    };
  }
}