/**
 * Component Factory for Dependency Injection
 *
 * Central factory implementing dependency injection pattern.
 * Creates and wires together all architectural components.
 *
 * Requirements: ADR-010 (Component Integration Architecture)
 */

import {
  IMCPServer,
  ITransportLayer,
  IRallyClient,
  IDataTransformer,
  ISecurityManager,
  IPerformanceManager,
  IAdvancedQueryEngine,
} from './interfaces';
import { TransportType } from '../transport/types';
import { MCPRallyServer } from './MCPRallyServer';
import { SecurityManager } from '../security/SecurityManager';
import { PerformanceManager } from '../utils/PerformanceManager';
import { DataTransformer } from '../data/DataTransformer';
import { RallyClient } from '../rally/RallyClient';
import { StdioTransport } from '../transport/StdioTransport';
import { SSETransport } from '../transport/SSETransport';
// import { AdvancedQueryEngine, QueryEngineFactory } from '../query';

export class ComponentFactory {
  private securityManager: ISecurityManager;
  private performanceManager: IPerformanceManager;
  private queryEngine?: IAdvancedQueryEngine;

  constructor() {
    // Initialize core managers
    this.securityManager = this.createSecurityManager();
    this.performanceManager = this.createPerformanceManager();
  }

  createServer(transport: TransportType): IMCPServer {
    const rallyClient = this.createRallyClient();
    const dataTransformer = this.createDataTransformer();
    const transportLayer = this.createTransport(transport);
    const queryEngine = this.createQueryEngine(rallyClient);

    return new MCPRallyServer(
      transportLayer,
      rallyClient,
      dataTransformer,
      this.securityManager,
      this.performanceManager,
      queryEngine
    );
  }

  private createTransport(transport: TransportType): ITransportLayer {
    switch (transport) {
      case 'stdio':
        return new StdioTransport();

      case 'sse':
        const port = parseInt(process.env['RALLY_SERVER_PORT'] || '3000', 10);
        return new SSETransport(port);

      default:
        throw new Error(`Unsupported transport type: ${transport}`);
    }
  }

  private createRallyClient(): IRallyClient {
    return new RallyClient(this.securityManager, this.performanceManager);
  }

  private createDataTransformer(): IDataTransformer {
    return new DataTransformer();
  }

  private createSecurityManager(): ISecurityManager {
    return new SecurityManager();
  }

  private createPerformanceManager(): IPerformanceManager {
    return new PerformanceManager();
  }

  private createQueryEngine(rallyClient: IRallyClient): IAdvancedQueryEngine {
    if (!this.queryEngine) {
      // For now, return a basic query engine until advanced features are implemented
      this.queryEngine = {
        executeQuery: async () => ({ results: [], totalCount: 0 }),
        executeBatchQueries: async () => [],
        executePagedQuery: async () => ({ results: [], totalCount: 0 }),
        createQuery: () => ({}),
        getMetrics: () => ({}),
        analyzeQueryPatterns: () => [],
        invalidateCache: () => 0,
        getDebugInfo: () => ({}),
        destroy: () => {}
      } as IAdvancedQueryEngine;
    }
    return this.queryEngine;
  }

  /**
   * Validate that all required environment variables are configured
   */
  async validateEnvironment(): Promise<void> {
    try {
      await this.securityManager.validateApiKey();
    } catch (error) {
      throw new Error(`Environment validation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get configuration summary for logging
   */
  getConfigurationSummary(): {
    rallyBaseUrl: string;
    transportType: string;
    hasApiKey: boolean;
    nodeEnv: string;
  } {
    return {
      rallyBaseUrl: process.env['RALLY_BASE_URL'] || 'https://rally1.rallydev.com',
      transportType: process.env['RALLY_TRANSPORT'] || 'stdio',
      hasApiKey: !!process.env['RALLY_API_KEY'],
      nodeEnv: process.env['NODE_ENV'] || 'development'
    };
  }
}
