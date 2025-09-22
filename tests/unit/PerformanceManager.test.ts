/**
 * PerformanceManager Unit Tests
 *
 * Comprehensive test suite for the PerformanceManager component.
 * Tests HTTP client configuration, metrics tracking, and performance monitoring.
 */

import { PerformanceManager } from '../../src/utils/PerformanceManager';
import {
  setupTestEnvironment,
  cleanupTestEnvironment,
  waitFor,
  measureExecutionTime
} from '../utils/test-helpers';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('PerformanceManager', () => {
  let performanceManager: PerformanceManager;
  let mockAxiosInstance: any;

  beforeAll(() => {
    setupTestEnvironment();
  });

  afterAll(() => {
    cleanupTestEnvironment();
  });

  beforeEach(() => {
    // Create a mock axios instance
    mockAxiosInstance = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      patch: jest.fn(),
      request: jest.fn(),
      defaults: {
        timeout: 30000,
        maxRedirects: 3,
        httpsAgent: expect.any(Object),
        validateStatus: expect.any(Function)
      },
      interceptors: {
        request: {
          use: jest.fn(),
          eject: jest.fn()
        },
        response: {
          use: jest.fn(),
          eject: jest.fn()
        }
      }
    };

    mockedAxios.create.mockReturnValue(mockAxiosInstance);
    performanceManager = new PerformanceManager();
  });

  afterEach(() => {
    jest.clearAllMocks();
    performanceManager.clearMetrics();
  });

  describe('Initialization and Configuration', () => {
    test('should create HTTP client with optimized settings', () => {
      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          timeout: 30000,
          maxRedirects: 3,
          httpsAgent: expect.any(Object),
          validateStatus: expect.any(Function)
        })
      );
    });

    test('should configure HTTPS agent with connection pooling', () => {
      const createCall = mockedAxios.create.mock.calls[0][0];
      const httpsAgent = createCall.httpsAgent;

      expect(httpsAgent).toBeDefined();
      expect(httpsAgent.options).toMatchObject({
        keepAlive: true,
        maxSockets: 10,
        maxFreeSockets: 5,
        timeout: 60000,
        rejectUnauthorized: true
      });
    });

    test('should configure request and response interceptors', () => {
      expect(mockAxiosInstance.interceptors.request.use).toHaveBeenCalled();
      expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalled();
    });

    test('should provide access to configured HTTP client', () => {
      expect(performanceManager.httpClient).toBe(mockAxiosInstance);
    });

    test('should validate status codes correctly', () => {
      const createCall = mockedAxios.create.mock.calls[0][0];
      const validateStatus = createCall.validateStatus;

      expect(validateStatus(200)).toBe(true);
      expect(validateStatus(201)).toBe(true);
      expect(validateStatus(299)).toBe(true);
      expect(validateStatus(300)).toBe(false);
      expect(validateStatus(400)).toBe(false);
      expect(validateStatus(500)).toBe(false);
    });
  });

  describe('Metrics Tracking', () => {
    test('should track successful request metrics', () => {
      const operation = 'GET_UserStory';
      const duration = 150;

      performanceManager.trackRequestMetrics(operation, duration, true);

      const stats = performanceManager.getPerformanceStats();
      expect(stats.totalRequests).toBe(1);
      expect(stats.successRate).toBe(100);
      expect(stats.averageDuration).toBe(150);
      expect(stats.slowRequests).toBe(0);
      expect(stats.recentRequests).toHaveLength(1);
      expect(stats.recentRequests[0]).toMatchObject({
        operation,
        duration,
        success: true,
        timestamp: expect.any(Date)
      });
    });

    test('should track failed request metrics', () => {
      const operation = 'POST_UserStory';
      const duration = 200;

      performanceManager.trackRequestMetrics(operation, duration, false);

      const stats = performanceManager.getPerformanceStats();
      expect(stats.totalRequests).toBe(1);
      expect(stats.successRate).toBe(0);
      expect(stats.averageDuration).toBe(200);
      expect(stats.recentRequests[0].success).toBe(false);
    });

    test('should calculate success rate correctly with mixed results', () => {
      // Track 3 successful and 2 failed requests
      performanceManager.trackRequestMetrics('GET_UserStory', 100, true);
      performanceManager.trackRequestMetrics('POST_UserStory', 150, true);
      performanceManager.trackRequestMetrics('GET_Defect', 200, false);
      performanceManager.trackRequestMetrics('PUT_UserStory', 120, true);
      performanceManager.trackRequestMetrics('DELETE_Task', 180, false);

      const stats = performanceManager.getPerformanceStats();
      expect(stats.totalRequests).toBe(5);
      expect(stats.successRate).toBe(60); // 3/5 * 100
      expect(stats.averageDuration).toBe(150); // (100+150+200+120+180)/5
    });

    test('should identify slow requests correctly', () => {
      performanceManager.trackRequestMetrics('FAST_Request', 500, true);
      performanceManager.trackRequestMetrics('SLOW_Request', 3000, true);
      performanceManager.trackRequestMetrics('VERY_SLOW_Request', 5000, true);

      const stats = performanceManager.getPerformanceStats();
      expect(stats.slowRequests).toBe(2); // 3000ms and 5000ms are > 2000ms
    });

    test('should maintain metrics history within bounds', () => {
      // Add more than maxMetricsHistory (1000) entries
      for (let i = 0; i < 1005; i++) {
        performanceManager.trackRequestMetrics(`Operation_${i}`, 100, true);
      }

      const stats = performanceManager.getPerformanceStats();
      expect(stats.totalRequests).toBe(1000); // Should be capped at maxMetricsHistory
    });

    test('should clear metrics correctly', () => {
      performanceManager.trackRequestMetrics('Test_Operation', 100, true);
      expect(performanceManager.getPerformanceStats().totalRequests).toBe(1);

      performanceManager.clearMetrics();
      const stats = performanceManager.getPerformanceStats();
      expect(stats.totalRequests).toBe(0);
      expect(stats.successRate).toBe(0);
      expect(stats.averageDuration).toBe(0);
      expect(stats.slowRequests).toBe(0);
      expect(stats.recentRequests).toHaveLength(0);
    });

    test('should return recent requests in correct order', () => {
      // Add 15 requests to test that only last 10 are returned
      for (let i = 0; i < 15; i++) {
        performanceManager.trackRequestMetrics(`Operation_${i}`, 100 + i, true);
      }

      const stats = performanceManager.getPerformanceStats();
      expect(stats.recentRequests).toHaveLength(10);
      expect(stats.recentRequests[0].operation).toBe('Operation_5'); // Should start from index 5
      expect(stats.recentRequests[9].operation).toBe('Operation_14'); // Should end at index 14
    });

    test('should warn about slow requests', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      performanceManager.trackRequestMetrics('Fast_Request', 1000, true);
      performanceManager.trackRequestMetrics('Slow_Request', 6000, true);

      expect(consoleSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('Fast_Request')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        'Slow request detected: Slow_Request took 6000ms'
      );

      consoleSpy.mockRestore();
    });
  });

  describe('HTTP Client Configuration', () => {
    test('should allow custom HTTP client configuration', () => {
      const customConfig = {
        timeout: 15000,
        maxRedirects: 5,
        headers: {
          'Custom-Header': 'custom-value'
        }
      };

      performanceManager.configureHttpClient(customConfig);

      expect(Object.assign).toHaveBeenCalledWith(
        mockAxiosInstance.defaults,
        customConfig
      );
    });

    test('should create optimized client instance statically', () => {
      const optimizedClient = PerformanceManager.createOptimizedClient();

      expect(mockedAxios.create).toHaveBeenCalled();
      expect(optimizedClient).toBe(mockAxiosInstance);
    });
  });

  describe('Request Interceptors', () => {
    test('should add start time metadata to requests', () => {
      const requestInterceptor = mockAxiosInstance.interceptors.request.use.mock.calls[0][0];
      const mockConfig = { url: '/test', method: 'GET' };

      const result = requestInterceptor(mockConfig);

      expect(result.metadata).toBeDefined();
      expect(result.metadata.startTime).toBeGreaterThan(0);
      expect(typeof result.metadata.startTime).toBe('number');
    });

    test('should handle request interceptor errors', () => {
      const errorHandler = mockAxiosInstance.interceptors.request.use.mock.calls[0][1];
      const testError = new Error('Request error');

      expect(() => errorHandler(testError)).toThrow('Request error');
    });
  });

  describe('Response Interceptors', () => {
    test('should track metrics for successful responses', () => {
      const responseInterceptor = mockAxiosInstance.interceptors.response.use.mock.calls[0][0];
      const trackSpy = jest.spyOn(performanceManager, 'trackRequestMetrics');

      const mockResponse = {
        config: {
          url: '/hierarchicalrequirement',
          method: 'GET',
          metadata: { startTime: Date.now() - 100 }
        },
        status: 200,
        data: {}
      };

      responseInterceptor(mockResponse);

      expect(trackSpy).toHaveBeenCalledWith(
        'GET_UserStory',
        expect.any(Number),
        true
      );
    });

    test('should track metrics for failed responses', () => {
      const errorInterceptor = mockAxiosInstance.interceptors.response.use.mock.calls[0][1];
      const trackSpy = jest.spyOn(performanceManager, 'trackRequestMetrics');

      const mockError = {
        config: {
          url: '/defect',
          method: 'POST',
          metadata: { startTime: Date.now() - 200 }
        },
        response: { status: 400 }
      };

      expect(() => errorInterceptor(mockError)).toThrow();
      expect(trackSpy).toHaveBeenCalledWith(
        'POST_Defect',
        expect.any(Number),
        false
      );
    });

    test('should handle responses without start time metadata', () => {
      const responseInterceptor = mockAxiosInstance.interceptors.response.use.mock.calls[0][0];
      const trackSpy = jest.spyOn(performanceManager, 'trackRequestMetrics');

      const mockResponse = {
        config: { url: '/test', method: 'GET' }, // No metadata
        status: 200,
        data: {}
      };

      responseInterceptor(mockResponse);

      expect(trackSpy).not.toHaveBeenCalled();
    });
  });

  describe('Operation Name Extraction', () => {
    test('should extract operation names from Rally API URLs', () => {
      const testCases = [
        { url: '/hierarchicalrequirement', method: 'GET', expected: 'GET_UserStory' },
        { url: '/hierarchicalrequirement/123', method: 'POST', expected: 'POST_UserStory' },
        { url: '/defect', method: 'GET', expected: 'GET_Defect' },
        { url: '/defect/456', method: 'PUT', expected: 'PUT_Defect' },
        { url: '/task', method: 'POST', expected: 'POST_Task' },
        { url: '/task/789', method: 'DELETE', expected: 'DELETE_Task' },
        { url: '/security/authorize', method: 'GET', expected: 'AUTH_Validate' },
        { url: '/unknown/endpoint', method: 'GET', expected: 'GET_Generic' }
      ];

      testCases.forEach(({ url, method, expected }) => {
        performanceManager.trackRequestMetrics = jest.fn();

        // Simulate the interceptor behavior
        const config = { url, method };
        const operation = (performanceManager as any).getOperationFromConfig(config);

        expect(operation).toBe(expected);
      });
    });

    test('should handle missing URL or method', () => {
      const testCases = [
        { url: undefined, method: 'GET', expected: 'unknown' },
        { url: '', method: 'GET', expected: 'GET_Generic' },
        { url: '/test', method: undefined, expected: 'GET_Generic' }
      ];

      testCases.forEach(({ url, method, expected }) => {
        const config = { url, method };
        const operation = (performanceManager as any).getOperationFromConfig(config);

        expect(operation).toBe(expected);
      });
    });
  });

  describe('Performance Monitoring', () => {
    test('should provide comprehensive performance statistics', () => {
      // Add various request types with different characteristics
      performanceManager.trackRequestMetrics('GET_UserStory', 100, true);
      performanceManager.trackRequestMetrics('POST_UserStory', 150, true);
      performanceManager.trackRequestMetrics('GET_Defect', 3000, false); // Slow and failed
      performanceManager.trackRequestMetrics('PUT_Task', 200, true);
      performanceManager.trackRequestMetrics('DELETE_UserStory', 2500, true); // Slow but successful

      const stats = performanceManager.getPerformanceStats();

      expect(stats).toMatchObject({
        totalRequests: 5,
        successRate: 80, // 4/5 * 100
        averageDuration: 1190, // (100+150+3000+200+2500)/5
        slowRequests: 2, // 3000ms and 2500ms are > 2000ms
        recentRequests: expect.arrayContaining([
          expect.objectContaining({
            operation: expect.any(String),
            duration: expect.any(Number),
            success: expect.any(Boolean),
            timestamp: expect.any(Date)
          })
        ])
      });

      expect(stats.recentRequests).toHaveLength(5);
    });

    test('should handle empty metrics gracefully', () => {
      const stats = performanceManager.getPerformanceStats();

      expect(stats).toEqual({
        totalRequests: 0,
        successRate: 0,
        averageDuration: 0,
        slowRequests: 0,
        recentRequests: []
      });
    });

    test('should track metrics with accurate timestamps', () => {
      const startTime = Date.now();
      performanceManager.trackRequestMetrics('Test_Operation', 100, true);
      const endTime = Date.now();

      const stats = performanceManager.getPerformanceStats();
      const timestamp = stats.recentRequests[0].timestamp.getTime();

      expect(timestamp).toBeGreaterThanOrEqual(startTime);
      expect(timestamp).toBeLessThanOrEqual(endTime);
    });

    test('should calculate averages correctly with floating point precision', () => {
      performanceManager.trackRequestMetrics('Op1', 100, true);
      performanceManager.trackRequestMetrics('Op2', 150, true);
      performanceManager.trackRequestMetrics('Op3', 175, true);

      const stats = performanceManager.getPerformanceStats();
      expect(stats.averageDuration).toBeCloseTo(141.67, 2); // (100+150+175)/3
    });
  });

  describe('Real-world Performance Scenarios', () => {
    test('should handle burst of concurrent request metrics', async () => {
      const operations = Array.from({ length: 100 }, (_, i) => ({
        operation: `Concurrent_Op_${i}`,
        duration: Math.random() * 1000,
        success: Math.random() > 0.1 // 90% success rate
      }));

      const { duration } = await measureExecutionTime(async () => {
        operations.forEach(({ operation, duration, success }) => {
          performanceManager.trackRequestMetrics(operation, duration, success);
        });
      });

      expect(duration).toBeLessThan(100); // Should be very fast
      expect(performanceManager.getPerformanceStats().totalRequests).toBe(100);
    });

    test('should maintain performance with large metrics history', () => {
      // Add 1000 metrics (at the limit)
      for (let i = 0; i < 1000; i++) {
        performanceManager.trackRequestMetrics(`Op_${i}`, Math.random() * 2000, true);
      }

      const { duration } = measureExecutionTime(() => {
        const stats = performanceManager.getPerformanceStats();
        return stats;
      });

      expect(duration).toBeLessThan(50); // Getting stats should be fast even with 1000 entries
    });

    test('should track realistic Rally API operation patterns', () => {
      // Simulate realistic Rally API usage patterns
      const operations = [
        { op: 'AUTH_Validate', duration: 200, success: true },
        { op: 'GET_UserStory', duration: 150, success: true },
        { op: 'GET_UserStory', duration: 180, success: true },
        { op: 'POST_UserStory', duration: 300, success: true },
        { op: 'GET_Defect', duration: 120, success: true },
        { op: 'PUT_Defect', duration: 250, success: true },
        { op: 'GET_Task', duration: 100, success: true },
        { op: 'POST_Task', duration: 280, success: true },
        { op: 'GET_UserStory', duration: 5000, success: false }, // Timeout
        { op: 'GET_UserStory', duration: 160, success: true }
      ];

      operations.forEach(({ op, duration, success }) => {
        performanceManager.trackRequestMetrics(op, duration, success);
      });

      const stats = performanceManager.getPerformanceStats();
      expect(stats.totalRequests).toBe(10);
      expect(stats.successRate).toBe(90);
      expect(stats.slowRequests).toBe(1); // Only the 5000ms timeout
      expect(stats.averageDuration).toBeCloseTo(584, 0); // Sum/10
    });
  });

  describe('Memory Management', () => {
    test('should not leak memory with continuous metric tracking', () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Add many metrics to test memory management
      for (let i = 0; i < 5000; i++) {
        performanceManager.trackRequestMetrics(`MemTest_${i}`, Math.random() * 1000, true);
      }

      // Should still only have 1000 metrics due to bounds management
      expect(performanceManager.getPerformanceStats().totalRequests).toBe(1000);

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (less than 10MB for this test)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });
  });
});