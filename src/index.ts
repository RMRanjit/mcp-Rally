/**
 * MCP Rally Server - Entry Point
 *
 * Main entry point for the MCP Rally integration server.
 * Initializes the server with appropriate transport layer based on environment configuration.
 *
 * Requirements: req-014 (Stdio Transport), req-015 (SSE Transport)
 */

import { config } from 'dotenv';
import path from 'path';
import { ComponentFactory } from './core/ComponentFactory';
import { TransportType } from './transport/types';

// Load environment variables with intelligent priority
const projectRoot = process.cwd();

// Determine environment file priority based on NODE_ENV
const nodeEnv = process.env['NODE_ENV'] || 'development';
let envFiles: string[];

if (nodeEnv === 'production') {
  envFiles = ['.env.production', '.env'];
} else if (nodeEnv === 'test') {
  envFiles = ['.env.test', '.env'];
} else {
  envFiles = ['.env.development', '.env'];
}

let envLoaded = false;

for (const envFile of envFiles) {
  const envPath = path.join(projectRoot, envFile);
  try {
    const result = config({ path: envPath });
    if (!result.error) {
      // Always log to stderr to avoid MCP protocol interference
      console.error(`Loaded environment from: ${envFile}`);
      envLoaded = true;
      break;
    }
  } catch (error) {
    // Continue to next env file
  }
}

if (!envLoaded) {
  const message = 'Warning: No environment file found';
  console.error(message);
}

// Force stdio transport for Claude Desktop compatibility
// Claude Desktop always needs stdio transport regardless of environment file settings
// Only allow override if explicitly set via command line or RALLY_FORCE_SSE
if (process.env['RALLY_FORCE_SSE'] !== 'true') {
  process.env['RALLY_TRANSPORT'] = 'stdio';
}

// Ensure required environment variables are set
if (!process.env['RALLY_API_KEY']) {
  const message = 'Error: RALLY_API_KEY environment variable is required';
  console.error(message);
  process.exit(1);
}

async function main(): Promise<void> {
  try {
    // Determine transport type from environment
    const transportType = (process.env['RALLY_TRANSPORT'] as TransportType) || 'stdio';

    // Create and start server
    const factory = new ComponentFactory();
    const server = factory.createServer(transportType);

    await server.initialize();

    console.log(`MCP Rally server started with ${transportType} transport`);

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('Shutting down MCP Rally server...');
      await server.shutdown();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('Shutting down MCP Rally server...');
      await server.shutdown();
      process.exit(0);
    });

  } catch (error) {
    console.error('Failed to start MCP Rally server:', error);
    process.exit(1);
  }
}

// Start the server
if (require.main === module) {
  main().catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

export { main };