#!/usr/bin/env node

/**
 * Startup script for Claude Desktop integration
 * Loads environment variables from .env file and starts the MCP Rally server
 */

const { config } = require('dotenv');
const path = require('path');
const { spawn } = require('child_process');

// Load environment variables from project root
const projectRoot = path.resolve(__dirname, '..');

// Determine environment file priority based on NODE_ENV
const nodeEnv = process.env.NODE_ENV || 'development';
let envFiles;

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
      console.log(`Loaded environment from: ${envFile}`);
      envLoaded = true;
      break;
    }
  } catch (error) {
    // Continue to next env file
  }
}

if (!envLoaded) {
  console.warn('Warning: No environment file found (.env.development or .env)');
}

// Ensure required environment variables are set
if (!process.env.RALLY_API_KEY) {
  console.error('Error: RALLY_API_KEY environment variable is required');
  console.error('Please create a .env file with your Rally API key');
  process.exit(1);
}

// Set default transport to stdio for Claude Desktop
process.env.RALLY_TRANSPORT = 'stdio';

// Start the server
const serverPath = path.join(projectRoot, 'dist', 'index.js');
const child = spawn('node', [serverPath], {
  stdio: ['inherit', 'inherit', 'inherit'],
  env: process.env,
  cwd: projectRoot
});

// Handle child process events
child.on('error', (error) => {
  console.error('Failed to start MCP Rally server:', error);
  process.exit(1);
});

child.on('exit', (code, signal) => {
  if (code !== 0) {
    console.error(`MCP Rally server exited with code ${code}`);
    process.exit(code);
  }
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  child.kill('SIGINT');
});

process.on('SIGTERM', () => {
  child.kill('SIGTERM');
});