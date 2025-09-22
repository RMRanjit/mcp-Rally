/**
 * Server-Sent Events (SSE) Transport Implementation
 *
 * Handles MCP communication over HTTP with Server-Sent Events for remote deployment.
 * Supports bidirectional communication for cloud-based AI tools.
 *
 * Requirements: req-015 (SSE Transport)
 */

import express, { Express, Request, Response } from 'express';
import { Server as HttpServer } from 'http';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { ITransportLayer, MCPMessage } from '../core/interfaces';
import { MCPMessage as TransportMCPMessage } from './types';

interface SSEConnection {
  id: string;
  response: Response;
  isAlive: boolean;
  lastPing: Date;
}

export class SSETransport implements ITransportLayer {
  private app: Express;
  private httpServer: HttpServer | null = null;
  private server: Server;
  private connections: Map<string, SSEConnection> = new Map();
  private port: number;
  private pingInterval: NodeJS.Timeout | null = null;

  constructor(port: number = 3000) {
    this.port = port;
    this.app = express();
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

    this.setupExpress();
    this.setupMCPHandlers();
  }

  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.httpServer = this.app.listen(this.port, () => {
          console.log(`MCP Rally server started with SSE transport on port ${this.port}`);
          this.startPingInterval();
          resolve();
        });

        this.httpServer.on('error', (error) => {
          reject(new Error(`Failed to start SSE transport: ${error.message}`));
        });
      } catch (error) {
        reject(new Error(`Failed to start SSE transport: ${error}`));
      }
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve) => {
      // Stop ping interval
      if (this.pingInterval) {
        clearInterval(this.pingInterval);
        this.pingInterval = null;
      }

      // Close all SSE connections
      for (const connection of this.connections.values()) {
        this.closeConnection(connection.id);
      }

      // Close HTTP server
      if (this.httpServer) {
        this.httpServer.close(() => {
          console.log('SSE transport stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Setup Express.js application with middleware and routes
   */
  private setupExpress(): void {
    // Security middleware
    this.app.use((req, res, next) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      next();
    });

    // CORS middleware for cross-origin requests
    this.app.use((req, res, next) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      if (req.method === 'OPTIONS') {
        res.sendStatus(200);
        return;
      }
      next();
    });

    // JSON body parser
    this.app.use(express.json({ limit: '1mb' }));

    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        transport: 'sse',
        connections: this.connections.size,
        timestamp: new Date().toISOString()
      });
    });

    // SSE connection endpoint
    this.app.get('/mcp/sse', (req, res) => {
      this.handleSSEConnection(req, res);
    });

    // MCP message endpoint (for client-to-server messages)
    this.app.post('/mcp/message', (req, res) => {
      this.handleMCPMessage(req, res);
    });

    // Server info endpoint
    this.app.get('/mcp/info', (req, res) => {
      res.json({
        name: 'mcp-rally',
        version: '1.0.0',
        transport: 'sse',
        capabilities: {
          tools: {}
        }
      });
    });
  }

  /**
   * Handle new SSE connections
   */
  private handleSSEConnection(req: Request, res: Response): void {
    const connectionId = this.generateConnectionId();

    // Set SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    // Create connection record
    const connection: SSEConnection = {
      id: connectionId,
      response: res,
      isAlive: true,
      lastPing: new Date()
    };

    this.connections.set(connectionId, connection);

    // Send connection confirmation
    this.sendSSEMessage(connectionId, {
      jsonrpc: '2.0',
      method: 'connection_established',
      params: { connectionId }
    });

    // Handle client disconnect
    req.on('close', () => {
      this.closeConnection(connectionId);
    });

    req.on('error', () => {
      this.closeConnection(connectionId);
    });

    console.log(`SSE connection established: ${connectionId}`);
  }

  /**
   * Handle incoming MCP messages from clients
   */
  private async handleMCPMessage(req: Request, res: Response): Promise<void> {
    try {
      const message = req.body as MCPMessage;
      const connectionId = req.headers['x-connection-id'] as string;

      if (!connectionId || !this.connections.has(connectionId)) {
        res.status(400).json({
          error: 'Invalid or missing connection ID'
        });
        return;
      }

      // Process the MCP message
      const response = await this.processMCPMessage(message);

      // Send response back via SSE
      if (response) {
        this.sendSSEMessage(connectionId, response);
      }

      res.json({ status: 'received' });
    } catch (error) {
      console.error('Error handling MCP message:', error);
      res.status(500).json({
        error: 'Internal server error'
      });
    }
  }

  /**
   * Process MCP messages (similar to stdio transport)
   */
  private async processMCPMessage(message: MCPMessage): Promise<MCPMessage | null> {
    try {
      if (message.method === 'tools/list') {
        return {
          jsonrpc: '2.0',
          id: message.id,
          result: {
            tools: [
              {
                name: 'get_user_story',
                description: 'Retrieve a User Story by its ObjectID',
                inputSchema: {
                  type: 'object',
                  properties: {
                    objectId: { type: 'string', description: 'The ObjectID of the User Story' }
                  },
                  required: ['objectId']
                }
              },
              {
                name: 'create_user_story',
                description: 'Create a new User Story in Rally',
                inputSchema: {
                  type: 'object',
                  properties: {
                    name: { type: 'string', description: 'Name of the User Story' },
                    project: { type: 'string', description: 'Project reference or ObjectID' }
                  },
                  required: ['name', 'project']
                }
              }
              // Additional tools would be listed here
            ]
          }
        };
      } else if (message.method === 'tools/call') {
        const params = message.params as any;
        return {
          jsonrpc: '2.0',
          id: message.id,
          result: {
            content: [
              {
                type: 'text',
                text: `Tool ${params.name} called with arguments: ${JSON.stringify(params.arguments, null, 2)}\n\nNote: Rally API integration not yet implemented. This is the MCP server foundation.`
              }
            ]
          }
        };
      }

      return null;
    } catch (error) {
      return {
        jsonrpc: '2.0',
        id: message.id,
        error: {
          code: -32603,
          message: 'Internal error',
          data: error instanceof Error ? error.message : String(error)
        }
      };
    }
  }

  /**
   * Setup MCP protocol handlers (for future use)
   */
  private setupMCPHandlers(): void {
    // These handlers will be used when integrating with the full MCP server
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return { tools: [] }; // Placeholder
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      return {
        content: [
          {
            type: 'text',
            text: 'Tool execution placeholder'
          }
        ]
      };
    });
  }

  /**
   * Send SSE message to a specific connection
   */
  private sendSSEMessage(connectionId: string, message: MCPMessage): void {
    const connection = this.connections.get(connectionId);
    if (!connection || !connection.isAlive) {
      return;
    }

    try {
      const data = JSON.stringify(message);
      connection.response.write(`data: ${data}\n\n`);
    } catch (error) {
      console.error(`Error sending SSE message to ${connectionId}:`, error);
      this.closeConnection(connectionId);
    }
  }

  /**
   * Close an SSE connection
   */
  private closeConnection(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.isAlive = false;
      try {
        connection.response.end();
      } catch (error) {
        // Connection may already be closed
      }
      this.connections.delete(connectionId);
      console.log(`SSE connection closed: ${connectionId}`);
    }
  }

  /**
   * Generate unique connection ID
   */
  private generateConnectionId(): string {
    return `sse_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Start ping interval to keep connections alive
   */
  private startPingInterval(): void {
    this.pingInterval = setInterval(() => {
      const now = new Date();
      for (const [connectionId, connection] of this.connections.entries()) {
        if (!connection.isAlive) {
          this.closeConnection(connectionId);
          continue;
        }

        try {
          // Send ping
          connection.response.write(`event: ping\ndata: ${now.toISOString()}\n\n`);
          connection.lastPing = now;
        } catch (error) {
          this.closeConnection(connectionId);
        }
      }
    }, 30000); // Ping every 30 seconds
  }

  /**
   * Get the MCP server instance (for integration with MCPRallyServer)
   */
  getServer(): Server {
    return this.server;
  }

  /**
   * Get current connection count
   */
  getConnectionCount(): number {
    return this.connections.size;
  }

  /**
   * Get server port
   */
  getPort(): number {
    return this.port;
  }
}