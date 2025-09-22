/**
 * Basic Performance Manager
 * Simple implementation for core MCP functionality
 */

import axios, { AxiosInstance } from 'axios';
import https from 'https';
import { IPerformanceManager } from '../core/interfaces';

export class PerformanceManager implements IPerformanceManager {
  public httpClient: AxiosInstance;

  constructor() {
    // Create basic HTTP client with optimized settings
    this.httpClient = axios.create({
      timeout: 30000, // 30 second timeout
      maxRedirects: 3,
      httpsAgent: new https.Agent({
        keepAlive: true,
        maxSockets: 50
      }),
      headers: {
        'User-Agent': 'MCP-Rally-Client/1.0.0'
      }
    });
  }

  async recordRequest(operation: string, duration: number, success: boolean): Promise<void> {
    // Basic logging to stderr to avoid MCP protocol interference
    if (process.env['RALLY_TRANSPORT'] === 'stdio') {
      console.error(`Performance: ${operation} took ${duration}ms (${success ? 'success' : 'failed'})`);
    } else {
      console.log(`Performance: ${operation} took ${duration}ms (${success ? 'success' : 'failed'})`);
    }
  }

  async measureOperation<T>(operation: string, fn: () => Promise<T>): Promise<T> {
    const start = Date.now();
    try {
      const result = await fn();
      await this.recordRequest(operation, Date.now() - start, true);
      return result;
    } catch (error) {
      await this.recordRequest(operation, Date.now() - start, false);
      throw error;
    }
  }

  trackRequestMetrics(operation: string, duration: number, success?: boolean, additionalData?: any): void {
    // Basic logging implementation
    this.recordRequest(operation, duration, success || false);
  }

  getPerformanceStats(): any {
    return {
      message: 'Basic performance manager - metrics not implemented'
    };
  }

  clearMetrics(): void {
    // No-op for basic implementation
  }
}