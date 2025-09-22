/**
 * Jest Test Setup Configuration
 *
 * Global test setup for the MCP Rally server test suite.
 * Configures environment variables and test utilities.
 */

import { config } from 'dotenv';

// Load test environment variables
config({ path: '.env.test' });

// Set default test environment variables
process.env.NODE_ENV = 'test';
process.env.RALLY_API_KEY = 'test-api-key';
process.env.RALLY_BASE_URL = 'https://test.rallydev.com';
process.env.RALLY_INTEGRATION_VENDOR = 'mcp-rally-test';
process.env.RALLY_TRANSPORT = 'stdio';

// Global test timeout
jest.setTimeout(30000);

// Mock console.log in tests to reduce noise
const originalConsoleLog = console.log;
console.log = jest.fn();

// Restore console.log for specific tests that need it
(global as any).restoreConsoleLog = (): void => {
  console.log = originalConsoleLog;
};

// Global teardown
afterAll(() => {
  console.log = originalConsoleLog;
});