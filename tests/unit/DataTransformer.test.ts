/**
 * DataTransformer Unit Tests
 *
 * Comprehensive test suite for the DataTransformer component.
 * Tests bidirectional field transformation between Rally API and MCP formats.
 */

import { DataTransformer } from '../../src/data/DataTransformer';
import {
  setupTestEnvironment,
  cleanupTestEnvironment,
  validateUserStoryTransformation,
  validateDefectTransformation,
  validateTaskTransformation
} from '../utils/test-helpers';
import {
  mockUserStoryResponse,
  mockDefectResponse,
  mockTaskResponse,
  createMockUserStory
} from '../mocks/rally-api-responses';

describe('DataTransformer', () => {
  let dataTransformer: DataTransformer;

  beforeAll(() => {
    setupTestEnvironment();
  });

  afterAll(() => {
    cleanupTestEnvironment();
  });

  beforeEach(() => {
    dataTransformer = new DataTransformer();
  });

  describe('Field Name Transformations', () => {
    describe('Rally to MCP transformations', () => {
      test('should transform standard Rally fields to kebab-case', () => {
        const rallyData = {
          FormattedID: 'US1234',
          PlanEstimate: 5,
          ScheduleState: 'Defined',
          LastUpdateDate: '2024-01-20T14:45:00.000Z',
          ObjectID: 12345678901
        };

        const transformed = dataTransformer.rallyToMcp(rallyData);

        expect(transformed).toEqual({
          'formatted-id': 'US1234',
          'plan-estimate': 5,
          'schedule-state': 'Defined',
          'last-update-date': '2024-01-20T14:45:00.000Z',
          'object-id': 12345678901
        });
      });

      test('should transform metadata fields with metadata- prefix', () => {
        const rallyData = {
          _ref: 'https://rally1.rallydev.com/slm/webservice/v2.0/hierarchicalrequirement/12345',
          _refObjectName: 'US1234: User login functionality',
          _type: 'HierarchicalRequirement',
          _refObjectUUID: '550c1234-ab12-4567-8901-123456789012'
        };

        const transformed = dataTransformer.rallyToMcp(rallyData);

        expect(transformed).toEqual({
          'metadata-ref': 'https://rally1.rallydev.com/slm/webservice/v2.0/hierarchicalrequirement/12345',
          'metadata-ref-object-name': 'US1234: User login functionality',
          'metadata-type': 'HierarchicalRequirement',
          'metadata-ref-object-uuid': '550c1234-ab12-4567-8901-123456789012'
        });
      });

      test('should transform custom fields with custom- prefix', () => {
        const rallyData = {
          c_CustomPriority: 'High',
          c_BusinessValue: 'Critical',
          c_MyCustomField: 'Custom Value',
          c_APIIntegration: 'Enabled'
        };

        const transformed = dataTransformer.rallyToMcp(rallyData);

        expect(transformed).toEqual({
          'custom-custom-priority': 'High',
          'custom-business-value': 'Critical',
          'custom-my-custom-field': 'Custom Value',
          'custom-api-integration': 'Enabled'
        });
      });

      test('should handle complex nested objects', () => {
        const rallyData = {
          Owner: {
            _ref: 'https://rally1.rallydev.com/slm/webservice/v2.0/user/123456',
            _refObjectName: 'John Doe',
            _type: 'User',
            ObjectID: 123456,
            UserName: 'john.doe@example.com'
          },
          Project: {
            _ref: 'https://rally1.rallydev.com/slm/webservice/v2.0/project/789012',
            _refObjectName: 'Authentication Module',
            _type: 'Project'
          }
        };

        const transformed = dataTransformer.rallyToMcp(rallyData);

        expect(transformed).toEqual({
          owner: {
            'metadata-ref': 'https://rally1.rallydev.com/slm/webservice/v2.0/user/123456',
            'metadata-ref-object-name': 'John Doe',
            'metadata-type': 'User',
            'object-id': 123456,
            'user-name': 'john.doe@example.com'
          },
          project: {
            'metadata-ref': 'https://rally1.rallydev.com/slm/webservice/v2.0/project/789012',
            'metadata-ref-object-name': 'Authentication Module',
            'metadata-type': 'Project'
          }
        });
      });

      test('should handle arrays of objects', () => {
        const rallyData = [
          { FormattedID: 'US1234', Name: 'Story 1' },
          { FormattedID: 'US1235', Name: 'Story 2' }
        ];

        const transformed = dataTransformer.rallyToMcp(rallyData);

        expect(transformed).toEqual([
          { 'formatted-id': 'US1234', name: 'Story 1' },
          { 'formatted-id': 'US1235', name: 'Story 2' }
        ]);
      });
    });

    describe('MCP to Rally transformations', () => {
      test('should transform MCP fields to Rally PascalCase', () => {
        const mcpData = {
          'formatted-id': 'US1234',
          'plan-estimate': 5,
          'schedule-state': 'Defined',
          'last-update-date': '2024-01-20T14:45:00.000Z',
          name: 'User Story Title'
        };

        const transformed = dataTransformer.mcpToRally(mcpData);

        expect(transformed).toEqual({
          FormattedID: 'US1234',
          PlanEstimate: 5,
          ScheduleState: 'Defined',
          LastUpdateDate: '2024-01-20T14:45:00.000Z',
          Name: 'User Story Title'
        });
      });

      test('should transform metadata fields back to underscore prefix', () => {
        const mcpData = {
          'metadata-ref': 'https://rally1.rallydev.com/slm/webservice/v2.0/hierarchicalrequirement/12345',
          'metadata-ref-object-name': 'US1234: User login functionality',
          'metadata-type': 'HierarchicalRequirement',
          'metadata-ref-object-uuid': '550c1234-ab12-4567-8901-123456789012'
        };

        const transformed = dataTransformer.mcpToRally(mcpData);

        expect(transformed).toEqual({
          _ref: 'https://rally1.rallydev.com/slm/webservice/v2.0/hierarchicalrequirement/12345',
          _refObjectName: 'US1234: User login functionality',
          _type: 'HierarchicalRequirement',
          _refObjectUUID: '550c1234-ab12-4567-8901-123456789012'
        });
      });

      test('should transform custom fields back to c_ prefix', () => {
        const mcpData = {
          'custom-custom-priority': 'High',
          'custom-business-value': 'Critical',
          'custom-my-custom-field': 'Custom Value',
          'custom-api-integration': 'Enabled'
        };

        const transformed = dataTransformer.mcpToRally(mcpData);

        expect(transformed).toEqual({
          c_CustomPriority: 'High',
          c_BusinessValue: 'Critical',
          c_MyCustomField: 'Custom Value',
          c_APIIntegration: 'Enabled'
        });
      });
    });

    describe('Bidirectional transformation consistency', () => {
      test('should maintain data integrity through round-trip transformations', () => {
        const originalRallyData = {
          FormattedID: 'US1234',
          Name: 'User login functionality',
          PlanEstimate: 5,
          ScheduleState: 'Defined',
          _ref: 'https://rally1.rallydev.com/slm/webservice/v2.0/hierarchicalrequirement/12345',
          _type: 'HierarchicalRequirement',
          c_CustomPriority: 'High',
          c_BusinessValue: 'Critical'
        };

        // Rally -> MCP -> Rally
        const mcpTransformed = dataTransformer.rallyToMcp(originalRallyData);
        const backToRally = dataTransformer.mcpToRally(mcpTransformed);

        expect(backToRally).toEqual(originalRallyData);
      });

      test('should maintain MCP data integrity through round-trip transformations', () => {
        const originalMcpData = {
          'formatted-id': 'US1234',
          name: 'User login functionality',
          'plan-estimate': 5,
          'schedule-state': 'Defined',
          'metadata-ref': 'https://rally1.rallydev.com/slm/webservice/v2.0/hierarchicalrequirement/12345',
          'metadata-type': 'HierarchicalRequirement',
          'custom-custom-priority': 'High',
          'custom-business-value': 'Critical'
        };

        // MCP -> Rally -> MCP
        const rallyTransformed = dataTransformer.mcpToRally(originalMcpData);
        const backToMcp = dataTransformer.rallyToMcp(rallyTransformed);

        expect(backToMcp).toEqual(originalMcpData);
      });
    });
  });

  describe('Real Rally Data Transformations', () => {
    test('should correctly transform User Story response', () => {
      const userStory = mockUserStoryResponse.QueryResult.Results[0];
      const transformed = dataTransformer.rallyToMcp(userStory);

      // Validate transformation using helper
      validateUserStoryTransformation(userStory, transformed);

      // Verify specific transformations
      expect(transformed['formatted-id']).toBe('US1234');
      expect(transformed['plan-estimate']).toBe(5.0);
      expect(transformed['schedule-state']).toBe('Defined');
      expect(transformed['metadata-ref']).toBe(userStory._ref);
      expect(transformed['metadata-type']).toBe('HierarchicalRequirement');
      expect(transformed['custom-custom-priority']).toBe('High');
      expect(transformed['custom-business-value']).toBe('Critical');
    });

    test('should correctly transform Defect response', () => {
      const defect = mockDefectResponse.QueryResult.Results[0];
      const transformed = dataTransformer.rallyToMcp(defect);

      // Validate transformation using helper
      validateDefectTransformation(defect, transformed);

      // Verify specific transformations
      expect(transformed['formatted-id']).toBe('DE1001');
      expect(transformed['found-in-build']).toBe('1.0.1');
      expect(transformed['fixed-in-build']).toBe(null);
      expect(transformed['custom-reproduction-steps']).toBe('1. Go to login page\n2. Enter credentials\n3. Click login button');
      expect(transformed['custom-business-impact']).toBe('Users cannot log in');
    });

    test('should correctly transform Task response', () => {
      const task = mockTaskResponse.QueryResult.Results[0];
      const transformed = dataTransformer.rallyToMcp(task);

      // Validate transformation using helper
      validateTaskTransformation(task, transformed);

      // Verify specific transformations
      expect(transformed['formatted-id']).toBe('TA1001');
      expect(transformed['work-product']).toEqual({
        'metadata-ref': task.WorkProduct._ref,
        'metadata-ref-object-name': task.WorkProduct._refObjectName
      });
      expect(transformed.estimate).toBe(8.0);
      expect(transformed['to-do']).toBe(2.0);
      expect(transformed.actuals).toBe(6.0);
      expect(transformed['custom-technical-notes']).toBe('Use passport.js for OAuth implementation');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle null and undefined values', () => {
      expect(dataTransformer.rallyToMcp(null)).toBe(null);
      expect(dataTransformer.rallyToMcp(undefined)).toBe(undefined);
      expect(dataTransformer.mcpToRally(null)).toBe(null);
      expect(dataTransformer.mcpToRally(undefined)).toBe(undefined);
    });

    test('should handle primitive values', () => {
      expect(dataTransformer.rallyToMcp('string')).toBe('string');
      expect(dataTransformer.rallyToMcp(123)).toBe(123);
      expect(dataTransformer.rallyToMcp(true)).toBe(true);
      expect(dataTransformer.mcpToRally('string')).toBe('string');
      expect(dataTransformer.mcpToRally(123)).toBe(123);
      expect(dataTransformer.mcpToRally(false)).toBe(false);
    });

    test('should handle empty objects and arrays', () => {
      expect(dataTransformer.rallyToMcp({})).toEqual({});
      expect(dataTransformer.rallyToMcp([])).toEqual([]);
      expect(dataTransformer.mcpToRally({})).toEqual({});
      expect(dataTransformer.mcpToRally([])).toEqual([]);
    });

    test('should handle deeply nested objects', () => {
      const deepObject = {
        Level1: {
          Level2: {
            Level3: {
              FormattedID: 'US1234',
              _ref: 'test-ref',
              c_CustomField: 'custom-value'
            }
          }
        }
      };

      const transformed = dataTransformer.rallyToMcp(deepObject);

      expect(transformed).toEqual({
        'level1': {
          'level2': {
            'level3': {
              'formatted-id': 'US1234',
              'metadata-ref': 'test-ref',
              'custom-custom-field': 'custom-value'
            }
          }
        }
      });
    });

    test('should handle mixed arrays with different object types', () => {
      const mixedArray = [
        { FormattedID: 'US1234', _type: 'UserStory' },
        { FormattedID: 'DE1001', _type: 'Defect' },
        { FormattedID: 'TA1001', _type: 'Task' }
      ];

      const transformed = dataTransformer.rallyToMcp(mixedArray);

      expect(transformed).toEqual([
        { 'formatted-id': 'US1234', 'metadata-type': 'UserStory' },
        { 'formatted-id': 'DE1001', 'metadata-type': 'Defect' },
        { 'formatted-id': 'TA1001', 'metadata-type': 'Task' }
      ]);
    });
  });

  describe('Field Mappings and Validation', () => {
    test('should provide comprehensive field mappings', () => {
      const mappings = dataTransformer.getFieldMappings();

      // Check for required standard fields
      expect(mappings['FormattedID']).toEqual({
        rallyField: 'FormattedID',
        mcpField: 'formatted-id',
        type: 'standard'
      });

      expect(mappings['PlanEstimate']).toEqual({
        rallyField: 'PlanEstimate',
        mcpField: 'plan-estimate',
        type: 'standard'
      });

      // Check for metadata fields
      expect(mappings['_ref']).toEqual({
        rallyField: '_ref',
        mcpField: 'metadata-ref',
        type: 'metadata'
      });

      // Verify mapping completeness
      expect(Object.keys(mappings).length).toBeGreaterThan(15);
    });

    test('should validate transformation correctness', () => {
      // Rally to MCP validation
      expect(
        dataTransformer.validateTransformation('FormattedID', 'formatted-id', 'rallyToMcp')
      ).toBe(true);

      expect(
        dataTransformer.validateTransformation('_ref', 'metadata-ref', 'rallyToMcp')
      ).toBe(true);

      expect(
        dataTransformer.validateTransformation('c_CustomField', 'custom-custom-field', 'rallyToMcp')
      ).toBe(true);

      // MCP to Rally validation
      expect(
        dataTransformer.validateTransformation('formatted-id', 'FormattedID', 'mcpToRally')
      ).toBe(true);

      expect(
        dataTransformer.validateTransformation('metadata-ref', '_ref', 'mcpToRally')
      ).toBe(true);

      expect(
        dataTransformer.validateTransformation('custom-custom-field', 'c_CustomField', 'mcpToRally')
      ).toBe(true);

      // Invalid transformations
      expect(
        dataTransformer.validateTransformation('FormattedID', 'wrong-field', 'rallyToMcp')
      ).toBe(false);
    });

    test('should handle transformFieldNames method', () => {
      const data = {
        FormattedID: 'US1234',
        PlanEstimate: 5,
        _ref: 'test-ref',
        c_CustomField: 'custom-value'
      };

      const transformed = dataTransformer.transformFieldNames(data);

      expect(transformed).toEqual({
        'formatted-id': 'US1234',
        'plan-estimate': 5,
        'metadata-ref': 'test-ref',
        'custom-custom-field': 'custom-value'
      });
    });
  });

  describe('Performance Considerations', () => {
    test('should transform large datasets efficiently', () => {
      // Create a large dataset
      const largeDataset = Array.from({ length: 1000 }, (_, i) =>
        createMockUserStory({ FormattedID: `US${i}`, Name: `Story ${i}` })
      );

      const startTime = Date.now();
      const transformed = dataTransformer.rallyToMcp(largeDataset);
      const duration = Date.now() - startTime;

      // Should complete within reasonable time (< 100ms for 1000 items)
      expect(duration).toBeLessThan(100);
      expect(transformed).toHaveLength(1000);
      expect(transformed[0]['formatted-id']).toBe('US0');
      expect(transformed[999]['formatted-id']).toBe('US999');
    });

    test('should handle deeply nested objects without stack overflow', () => {
      // Create a deeply nested object
      let deepObject: any = { value: 'test' };
      for (let i = 0; i < 100; i++) {
        deepObject = { [`Level${i}`]: deepObject };
      }

      // Should not throw stack overflow error
      expect(() => {
        dataTransformer.rallyToMcp(deepObject);
      }).not.toThrow();
    });
  });
});