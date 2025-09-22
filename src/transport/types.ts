/**
 * Transport Layer Type Definitions
 *
 * Type definitions for the transport layer abstraction.
 * Supports both stdio and SSE transport modes.
 *
 * Requirements: req-014 (Stdio Transport), req-015 (SSE Transport)
 */

export type TransportType = 'stdio' | 'sse';

export interface TransportConfig {
  type: TransportType;
  port?: number; // For SSE transport
  host?: string; // For SSE transport
}

export interface MCPMessage {
  jsonrpc: '2.0';
  id?: string | number;
  method?: string;
  params?: unknown;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}
