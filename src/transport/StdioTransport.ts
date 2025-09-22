/**
 * Stdio Transport Implementation
 *
 * Handles MCP communication over stdin/stdout for local development.
 * Uses the official MCP SDK StdioServerTransport.
 *
 * Requirements: req-014 (Stdio Transport)
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { ITransportLayer } from '../core/interfaces';

export class StdioTransport implements ITransportLayer {
  private server: Server;
  private transport: StdioServerTransport | null = null;

  constructor() {
    this.server = new Server(
      {
        name: 'mcp-rally',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Note: Tool handlers will be set up by MCPRallyServer
    // Only set up list_tools handler here
    this.setupListToolsHandler();
  }

  async start(): Promise<void> {
    try {
      this.transport = new StdioServerTransport();
      await this.server.connect(this.transport);
      // Log to stderr to avoid interfering with JSON-RPC protocol
      console.error('MCP Rally server started with stdio transport');
    } catch (error) {
      throw new Error(`Failed to start stdio transport: ${error}`);
    }
  }

  async stop(): Promise<void> {
    if (this.transport) {
      try {
        // Set transport to null first to prevent multiple close attempts
        const transport = this.transport;
        this.transport = null;

        // Close the server with a timeout to prevent hanging
        const closePromise = this.server.close();
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Server close timeout')), 5000)
        );

        await Promise.race([closePromise, timeoutPromise]);
        console.error('Stdio transport stopped');
      } catch (error) {
        console.error('Error stopping stdio transport:', error);
        // Don't re-throw the error to allow graceful shutdown
      }
    }
  }

  /**
   * Setup only the list_tools handler (call_tool will be handled by MCPRallyServer)
   */
  private setupListToolsHandler(): void {
    // Handle list_tools requests
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          // User Story Operations
          {
            name: 'get_user_story',
            description: 'Retrieve a User Story by ObjectID',
            inputSchema: {
              type: 'object',
              properties: { objectId: { type: 'string' } },
              required: ['objectId']
            }
          },
          {
            name: 'create_user_story',
            description: 'Create new User Story',
            inputSchema: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                description: { type: 'string' },
                project: { type: 'string' },
                owner: { type: 'string' },
                iteration: { type: 'string' },
                'plan-estimate': { type: 'number' },
                'schedule-state': { type: 'string' }
              },
              required: ['name', 'project']
            }
          },
          {
            name: 'update_user_story',
            description: 'Update existing User Story',
            inputSchema: {
              type: 'object',
              properties: {
                objectId: { type: 'string' },
                name: { type: 'string' },
                description: { type: 'string' },
                owner: { type: 'string' },
                iteration: { type: 'string' },
                'plan-estimate': { type: 'number' },
                'schedule-state': { type: 'string' }
              },
              required: ['objectId']
            }
          },
          {
            name: 'query_user_stories',
            description: 'Search User Stories',
            inputSchema: {
              type: 'object',
              properties: {
                project: { type: 'string' },
                owner: { type: 'string' },
                'schedule-state': { type: 'string' },
                iteration: { type: 'string' },
                query: { type: 'string' }
              }
            }
          },

          // Defect Operations
          {
            name: 'get_defect',
            description: 'Retrieve a Defect by ObjectID',
            inputSchema: {
              type: 'object',
              properties: { objectId: { type: 'string' } },
              required: ['objectId']
            }
          },
          {
            name: 'create_defect',
            description: 'Create new Defect',
            inputSchema: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                description: { type: 'string' },
                severity: { type: 'string', enum: ['Cosmetic', 'Minor', 'Major', 'Critical'] },
                state: { type: 'string', enum: ['Submitted', 'Open', 'In-Progress', 'Fixed', 'Closed'] },
                project: { type: 'string' },
                owner: { type: 'string' },
                'found-in-build': { type: 'string' }
              },
              required: ['name', 'severity', 'state', 'project']
            }
          },
          {
            name: 'update_defect',
            description: 'Update existing Defect',
            inputSchema: {
              type: 'object',
              properties: {
                objectId: { type: 'string' },
                name: { type: 'string' },
                description: { type: 'string' },
                severity: { type: 'string' },
                state: { type: 'string' },
                owner: { type: 'string' },
                'found-in-build': { type: 'string' },
                'fixed-in-build': { type: 'string' },
                resolution: { type: 'string' }
              },
              required: ['objectId']
            }
          },
          {
            name: 'query_defects',
            description: 'Search Defects',
            inputSchema: {
              type: 'object',
              properties: {
                project: { type: 'string' },
                owner: { type: 'string' },
                state: { type: 'string' },
                severity: { type: 'string' },
                query: { type: 'string' }
              }
            }
          },

          // Task Operations
          {
            name: 'get_task',
            description: 'Retrieve a Task by ObjectID',
            inputSchema: {
              type: 'object',
              properties: { objectId: { type: 'string' } },
              required: ['objectId']
            }
          },
          {
            name: 'create_task',
            description: 'Create new Task',
            inputSchema: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                description: { type: 'string' },
                owner: { type: 'string' },
                'work-product': { type: 'string' },
                estimate: { type: 'number' },
                state: { type: 'string', enum: ['Defined', 'In-Progress', 'Completed'] }
              },
              required: ['name']
            }
          },
          {
            name: 'update_task',
            description: 'Update existing Task',
            inputSchema: {
              type: 'object',
              properties: {
                objectId: { type: 'string' },
                name: { type: 'string' },
                description: { type: 'string' },
                owner: { type: 'string' },
                estimate: { type: 'number' },
                todo: { type: 'number' },
                actuals: { type: 'number' },
                state: { type: 'string' }
              },
              required: ['objectId']
            }
          },
          {
            name: 'query_tasks',
            description: 'Search Tasks',
            inputSchema: {
              type: 'object',
              properties: {
                project: { type: 'string' },
                owner: { type: 'string' },
                state: { type: 'string' },
                'work-product': { type: 'string' },
                query: { type: 'string' }
              }
            }
          },

          // Universal Query
          {
            name: 'query_all_artifacts',
            description: 'Query any Rally artifact type',
            inputSchema: {
              type: 'object',
              properties: {
                artifactType: { type: 'string', enum: ['UserStory', 'Defect', 'Task'] },
                project: { type: 'string' },
                owner: { type: 'string' },
                state: { type: 'string' },
                query: { type: 'string' },
                fetch: { type: 'string' },
                pagesize: { type: 'number' }
              },
              required: ['artifactType']
            }
          }
        ]
      };
    });
    // Note: call_tool handlers will be set up by MCPRallyServer
  }

  /**
   * Get the MCP server instance (for integration with MCPRallyServer)
   */
  getServer(): Server {
    return this.server;
  }

  /**
   * Check if transport is connected
   */
  isConnected(): boolean {
    return this.transport !== null;
  }
}