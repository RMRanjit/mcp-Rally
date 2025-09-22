/**
 * SecurityManager Unit Tests
 *
 * Comprehensive test suite for the SecurityManager component.
 * Tests API key validation, authentication headers, data sanitization, and security features.
 */

import { SecurityManager } from '../../src/security/SecurityManager';
import { setupTestEnvironment, cleanupTestEnvironment } from '../utils/test-helpers';

describe('SecurityManager', () => {
  let securityManager: SecurityManager;
  let originalEnv: any;

  beforeAll(() => {
    setupTestEnvironment();
  });

  afterAll(() => {
    cleanupTestEnvironment();
  });

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
    securityManager = new SecurityManager();
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('Constructor and Initialization', () => {
    test('should initialize with environment variables', () => {
      process.env.RALLY_API_KEY = 'test-api-key-12345678901234567890';
      process.env.RALLY_INTEGRATION_VENDOR = 'test-vendor';
      process.env.npm_package_version = '2.0.0';

      const manager = new SecurityManager();

      expect(manager.getRallyBaseUrl()).toBe('https://test.rallydev.com');
    });

    test('should use default values when optional environment variables are missing', () => {
      delete process.env.RALLY_INTEGRATION_VENDOR;
      delete process.env.npm_package_version;

      const manager = new SecurityManager();

      // Should not throw and should have defaults
      expect(() => manager.getAuthHeaders()).not.toThrow();
    });
  });

  describe('API Key Validation', () => {
    test('should validate correct API key format', async () => {
      process.env.RALLY_API_KEY = 'valid-api-key-1234567890-abcdef';

      const manager = new SecurityManager();
      const result = await manager.validateApiKey();

      expect(result).toBe(true);
    });

    test('should reject missing API key', async () => {
      delete process.env.RALLY_API_KEY;

      const manager = new SecurityManager();

      await expect(manager.validateApiKey()).rejects.toThrow(
        'RALLY_API_KEY environment variable is required but not set'
      );
    });

    test('should reject empty API key', async () => {
      process.env.RALLY_API_KEY = '';

      const manager = new SecurityManager();

      await expect(manager.validateApiKey()).rejects.toThrow(
        'RALLY_API_KEY environment variable is required but not set'
      );
    });

    test('should reject too short API key', async () => {
      process.env.RALLY_API_KEY = 'short';

      const manager = new SecurityManager();

      await expect(manager.validateApiKey()).rejects.toThrow(
        'RALLY_API_KEY appears to be invalid (too short)'
      );
    });

    test('should reject API key with invalid characters', async () => {
      process.env.RALLY_API_KEY = 'invalid-key-with-@#$%-characters';

      const manager = new SecurityManager();

      await expect(manager.validateApiKey()).rejects.toThrow(
        'RALLY_API_KEY contains invalid characters'
      );
    });

    test('should accept API key with valid characters', async () => {
      const validKeys = [
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
        'api-key-with-dashes-123456789',
        'api_key_with_underscores_123456789',
        'ApiKey123456789',
        'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6'
      ];

      for (const apiKey of validKeys) {
        process.env.RALLY_API_KEY = apiKey;
        const manager = new SecurityManager();

        const result = await manager.validateApiKey();
        expect(result).toBe(true);
      }
    });
  });

  describe('Authentication Headers', () => {
    test('should generate correct authentication headers', () => {
      process.env.RALLY_API_KEY = 'test-api-key-123456789';
      process.env.RALLY_INTEGRATION_VENDOR = 'test-vendor';
      process.env.npm_package_version = '1.5.0';

      const manager = new SecurityManager();
      const headers = manager.getAuthHeaders();

      expect(headers).toEqual({
        'Authorization': 'zsessionid=test-api-key-123456789',
        'X-RallyIntegrationName': 'mcp-rally',
        'X-RallyIntegrationVendor': 'test-vendor',
        'X-RallyIntegrationVersion': '1.5.0',
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      });
    });

    test('should use default values for optional headers', () => {
      process.env.RALLY_API_KEY = 'test-api-key-123456789';
      delete process.env.RALLY_INTEGRATION_VENDOR;
      delete process.env.npm_package_version;

      const manager = new SecurityManager();
      const headers = manager.getAuthHeaders();

      expect(headers['X-RallyIntegrationVendor']).toBe('AI-Assistant');
      expect(headers['X-RallyIntegrationVersion']).toBe('1.0.0');
    });

    test('should throw error when API key is not available', () => {
      delete process.env.RALLY_API_KEY;

      const manager = new SecurityManager();

      expect(() => manager.getAuthHeaders()).toThrow(
        'API key not available. Call validateApiKey() first.'
      );
    });

    test('should include all required Rally headers', () => {
      process.env.RALLY_API_KEY = 'test-api-key-123456789';

      const manager = new SecurityManager();
      const headers = manager.getAuthHeaders();

      // Check for Rally-specific headers
      expect(headers['Authorization']).toContain('zsessionid=');
      expect(headers['X-RallyIntegrationName']).toBe('mcp-rally');
      expect(headers['X-RallyIntegrationVendor']).toBeDefined();
      expect(headers['X-RallyIntegrationVersion']).toBeDefined();

      // Check for standard HTTP headers
      expect(headers['Content-Type']).toBe('application/json');
      expect(headers['Accept']).toBe('application/json');
    });
  });

  describe('Data Sanitization', () => {
    test('should sanitize sensitive fields in objects', () => {
      const data = {
        name: 'John Doe',
        authorization: 'Bearer secret-token',
        apikey: 'secret-api-key',
        api_key: 'another-secret',
        password: 'secret-password',
        token: 'secret-token',
        secret: 'secret-value',
        zsessionid: 'secret-session',
        normalField: 'normal-value'
      };

      const sanitized = securityManager.sanitizeLogData(data);

      expect(sanitized).toEqual({
        name: 'John Doe',
        authorization: '[REDACTED]',
        apikey: '[REDACTED]',
        api_key: '[REDACTED]',
        password: '[REDACTED]',
        token: '[REDACTED]',
        secret: '[REDACTED]',
        zsessionid: '[REDACTED]',
        normalField: 'normal-value'
      });
    });

    test('should sanitize case-insensitive sensitive fields', () => {
      const data = {
        Authorization: 'Bearer secret-token',
        APIKEY: 'secret-api-key',
        API_KEY: 'another-secret',
        Password: 'secret-password',
        TOKEN: 'secret-token',
        Secret: 'secret-value',
        ZSESSIONID: 'secret-session'
      };

      const sanitized = securityManager.sanitizeLogData(data);

      expect(sanitized).toEqual({
        Authorization: '[REDACTED]',
        APIKEY: '[REDACTED]',
        API_KEY: '[REDACTED]',
        Password: '[REDACTED]',
        TOKEN: '[REDACTED]',
        Secret: '[REDACTED]',
        ZSESSIONID: '[REDACTED]'
      });
    });

    test('should sanitize fields containing sensitive keywords', () => {
      const data = {
        userAuthorizationHeader: 'Bearer secret-token',
        myApiKeyValue: 'secret-api-key',
        passwordField: 'secret-password',
        accessToken: 'secret-token',
        clientSecret: 'secret-value'
      };

      const sanitized = securityManager.sanitizeLogData(data);

      expect(sanitized).toEqual({
        userAuthorizationHeader: '[REDACTED]',
        myApiKeyValue: '[REDACTED]',
        passwordField: '[REDACTED]',
        accessToken: '[REDACTED]',
        clientSecret: '[REDACTED]'
      });
    });

    test('should sanitize nested objects recursively', () => {
      const data = {
        user: {
          name: 'John Doe',
          credentials: {
            password: 'secret-password',
            apikey: 'secret-api-key',
            metadata: {
              token: 'secret-token'
            }
          }
        },
        headers: {
          authorization: 'Bearer secret-token',
          'content-type': 'application/json'
        }
      };

      const sanitized = securityManager.sanitizeLogData(data);

      expect(sanitized).toEqual({
        user: {
          name: 'John Doe',
          credentials: {
            password: '[REDACTED]',
            apikey: '[REDACTED]',
            metadata: {
              token: '[REDACTED]'
            }
          }
        },
        headers: {
          authorization: '[REDACTED]',
          'content-type': 'application/json'
        }
      });
    });

    test('should sanitize arrays containing objects', () => {
      const data = [
        { name: 'User 1', password: 'secret1' },
        { name: 'User 2', apikey: 'secret2' },
        { name: 'User 3', token: 'secret3' }
      ];

      const sanitized = securityManager.sanitizeLogData(data);

      expect(sanitized).toEqual([
        { name: 'User 1', password: '[REDACTED]' },
        { name: 'User 2', apikey: '[REDACTED]' },
        { name: 'User 3', token: '[REDACTED]' }
      ]);
    });

    test('should handle primitive values without modification', () => {
      expect(securityManager.sanitizeLogData('string')).toBe('string');
      expect(securityManager.sanitizeLogData(123)).toBe(123);
      expect(securityManager.sanitizeLogData(true)).toBe(true);
      expect(securityManager.sanitizeLogData(null)).toBe(null);
      expect(securityManager.sanitizeLogData(undefined)).toBe(undefined);
    });

    test('should handle empty objects and arrays', () => {
      expect(securityManager.sanitizeLogData({})).toEqual({});
      expect(securityManager.sanitizeLogData([])).toEqual([]);
    });

    test('should handle complex nested structures', () => {
      const complexData = {
        config: {
          rally: {
            auth: {
              apikey: 'secret-key',
              headers: {
                authorization: 'Bearer token',
                'x-apikey': 'another-secret'
              }
            },
            baseUrl: 'https://rally.example.com'
          }
        },
        users: [
          {
            id: 1,
            credentials: {
              password: 'user-password',
              recoveryToken: 'recovery-secret'
            }
          }
        ]
      };

      const sanitized = securityManager.sanitizeLogData(complexData);

      expect(sanitized).toEqual({
        config: {
          rally: {
            auth: {
              apikey: '[REDACTED]',
              headers: {
                authorization: '[REDACTED]',
                'x-apikey': '[REDACTED]'
              }
            },
            baseUrl: 'https://rally.example.com'
          }
        },
        users: [
          {
            id: 1,
            credentials: {
              password: '[REDACTED]',
              recoveryToken: '[REDACTED]'
            }
          }
        ]
      });
    });
  });

  describe('Environment Validation', () => {
    test('should validate when all required environment variables are present', () => {
      process.env.RALLY_API_KEY = 'test-api-key-123456789';

      expect(() => securityManager.validateEnvironment()).not.toThrow();
    });

    test('should throw error when RALLY_API_KEY is missing', () => {
      delete process.env.RALLY_API_KEY;

      expect(() => securityManager.validateEnvironment()).toThrow(
        'Missing required environment variables: RALLY_API_KEY. Please configure your environment before starting the server.'
      );
    });

    test('should provide helpful error message for missing variables', () => {
      delete process.env.RALLY_API_KEY;

      try {
        securityManager.validateEnvironment();
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error.message).toContain('Missing required environment variables');
        expect(error.message).toContain('RALLY_API_KEY');
        expect(error.message).toContain('Please configure your environment');
      }
    });
  });

  describe('Rally Base URL Configuration', () => {
    test('should return configured Rally base URL', () => {
      process.env.RALLY_BASE_URL = 'https://custom.rallydev.com';

      expect(securityManager.getRallyBaseUrl()).toBe('https://custom.rallydev.com');
    });

    test('should return default Rally base URL when not configured', () => {
      delete process.env.RALLY_BASE_URL;

      const manager = new SecurityManager();
      expect(manager.getRallyBaseUrl()).toBe('https://rally1.rallydev.com');
    });

    test('should handle different Rally instance URLs', () => {
      const testUrls = [
        'https://rally1.rallydev.com',
        'https://us1.rallydev.com',
        'https://sandbox.rallydev.com',
        'https://demo.rallydev.com'
      ];

      testUrls.forEach(url => {
        process.env.RALLY_BASE_URL = url;
        const manager = new SecurityManager();
        expect(manager.getRallyBaseUrl()).toBe(url);
      });
    });
  });

  describe('Integration Headers', () => {
    test('should include proper integration identification', () => {
      process.env.RALLY_API_KEY = 'test-api-key-123456789';
      process.env.RALLY_INTEGRATION_VENDOR = 'CustomVendor';
      process.env.npm_package_version = '2.1.0';

      const manager = new SecurityManager();
      const headers = manager.getAuthHeaders();

      expect(headers['X-RallyIntegrationName']).toBe('mcp-rally');
      expect(headers['X-RallyIntegrationVendor']).toBe('CustomVendor');
      expect(headers['X-RallyIntegrationVersion']).toBe('2.1.0');
    });

    test('should use consistent integration name', () => {
      process.env.RALLY_API_KEY = 'test-api-key-123456789';

      const headers = securityManager.getAuthHeaders();

      // Integration name should always be 'mcp-rally'
      expect(headers['X-RallyIntegrationName']).toBe('mcp-rally');
    });
  });

  describe('Security Edge Cases', () => {
    test('should handle malformed environment variables gracefully', () => {
      // Test with whitespace
      process.env.RALLY_API_KEY = '  test-api-key-123456789  ';

      // Should trim and validate
      expect(() => securityManager.getAuthHeaders()).not.toThrow();
    });

    test('should not expose sensitive data in headers object structure', () => {
      process.env.RALLY_API_KEY = 'secret-api-key-123456789';

      const headers = securityManager.getAuthHeaders();
      const sanitizedHeaders = securityManager.sanitizeLogData(headers);

      // Authorization header should be redacted when sanitized
      expect(sanitizedHeaders['Authorization']).toBe('[REDACTED]');
    });

    test('should validate API key format consistently', async () => {
      const invalidKeys = [
        'key with spaces',
        'key@with#special$chars',
        'key%with&percent*signs',
        'key(with)parentheses',
        'key+with=equals'
      ];

      for (const invalidKey of invalidKeys) {
        process.env.RALLY_API_KEY = invalidKey;
        const manager = new SecurityManager();

        await expect(manager.validateApiKey()).rejects.toThrow(
          'RALLY_API_KEY contains invalid characters'
        );
      }
    });
  });

  describe('Performance and Memory', () => {
    test('should sanitize large datasets efficiently', () => {
      // Create large dataset with sensitive data
      const largeData = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        name: `User ${i}`,
        password: `secret-password-${i}`,
        apikey: `secret-api-key-${i}`,
        normalData: `some-normal-data-${i}`
      }));

      const startTime = Date.now();
      const sanitized = securityManager.sanitizeLogData(largeData);
      const duration = Date.now() - startTime;

      // Should complete within reasonable time
      expect(duration).toBeLessThan(100);
      expect(sanitized).toHaveLength(1000);
      expect(sanitized[0].password).toBe('[REDACTED]');
      expect(sanitized[999].apikey).toBe('[REDACTED]');
    });

    test('should handle deeply nested objects without stack overflow', () => {
      // Create deeply nested object with sensitive data
      let deepObject: any = { secret: 'deep-secret' };
      for (let i = 0; i < 100; i++) {
        deepObject = { [`level${i}`]: deepObject };
      }

      // Should not throw stack overflow error
      expect(() => {
        const sanitized = securityManager.sanitizeLogData(deepObject);
        // Verify the deep secret is sanitized
        let current = sanitized;
        for (let i = 99; i >= 0; i--) {
          current = current[`level${i}`];
        }
        expect(current.secret).toBe('[REDACTED]');
      }).not.toThrow();
    });
  });
});