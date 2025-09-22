/**
 * Data Transformer Implementation
 *
 * Handles bidirectional transformation between Rally API and MCP data formats.
 * Transforms field names between CamelCase and kebab-case with proper prefixing.
 *
 * Requirements: req-016 (Field Name Translation), req-017 (Custom Field Mapping), req-018 (Metadata Field Handling)
 */

import { IDataTransformer } from '../core/interfaces';

export class DataTransformer implements IDataTransformer {
  /**
   * Transform Rally API response data to MCP format
   */
  rallyToMcp<T>(data: T): T {
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map(item => this.rallyToMcp(item)) as T;
    }

    const transformed: Record<string, unknown> = {};
    const obj = data as Record<string, unknown>;

    for (const [key, value] of Object.entries(obj)) {
      const transformedKey = this.rallyFieldToMcp(key);
      const transformedValue = typeof value === 'object' && value !== null
        ? this.rallyToMcp(value)
        : value;

      transformed[transformedKey] = transformedValue;
    }

    return transformed as T;
  }

  /**
   * Transform MCP data to Rally API format
   */
  mcpToRally<T>(data: T): T {
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map(item => this.mcpToRally(item)) as T;
    }

    const transformed: Record<string, unknown> = {};
    const obj = data as Record<string, unknown>;

    for (const [key, value] of Object.entries(obj)) {
      const transformedKey = this.mcpFieldToRally(key);
      const transformedValue = typeof value === 'object' && value !== null
        ? this.mcpToRally(value)
        : value;

      transformed[transformedKey] = transformedValue;
    }

    return transformed as T;
  }

  /**
   * Transform field names from CamelCase to kebab-case with semantic prefixes
   */
  transformFieldNames(data: Record<string, unknown>): Record<string, unknown> {
    const transformed: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(data)) {
      const transformedKey = this.rallyFieldToMcp(key);
      transformed[transformedKey] = value;
    }

    return transformed;
  }

  /**
   * Convert Rally field name to MCP format
   * Examples:
   * - CurrentProjectName -> current-project-name
   * - c_MyCustomField -> custom-my-custom-field
   * - _ref -> metadata-ref
   */
  private rallyFieldToMcp(field: string): string {
    // Handle metadata fields (starting with _)
    if (field.startsWith('_')) {
      const cleanField = field.substring(1);
      return `metadata-${this.camelToKebab(cleanField)}`;
    }

    // Handle custom fields (starting with c_)
    if (field.startsWith('c_')) {
      const cleanField = field.substring(2);
      return `custom-${this.camelToKebab(cleanField)}`;
    }

    // Handle regular fields
    return this.camelToKebab(field);
  }

  /**
   * Convert MCP field name to Rally format
   * Examples:
   * - current-project-name -> CurrentProjectName
   * - custom-my-custom-field -> c_MyCustomField
   * - metadata-ref -> _ref
   */
  private mcpFieldToRally(field: string): string {
    // Handle metadata fields
    if (field.startsWith('metadata-')) {
      const cleanField = field.substring(9); // Remove "metadata-"
      const rallyField = this.kebabToRallySpecialCase(cleanField);
      return `_${rallyField}`;
    }

    // Handle custom fields
    if (field.startsWith('custom-')) {
      const cleanField = field.substring(7); // Remove "custom-"
      const rallyField = this.kebabToRallySpecialCase(cleanField);
      return `c_${rallyField}`;
    }

    // Handle regular fields - Rally uses PascalCase for most fields
    return this.kebabToRallySpecialCase(field);
  }

  /**
   * Convert CamelCase to kebab-case
   * Handles consecutive capitals properly (e.g., APIIntegration -> api-integration)
   */
  private camelToKebab(str: string): string {
    return str
      // Handle consecutive uppercase letters (e.g., API -> api)
      .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
      // Handle normal camelCase boundaries (e.g., camelCase -> camel-case)
      .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
      .toLowerCase();
  }

  /**
   * Convert kebab-case to camelCase
   */
  private kebabToCamel(str: string): string {
    return str
      .toLowerCase()
      .replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
  }

  /**
   * Convert kebab-case to PascalCase
   */
  private kebabToPascal(str: string): string {
    const camelCase = this.kebabToCamel(str);
    return camelCase.charAt(0).toUpperCase() + camelCase.slice(1);
  }

  /**
   * Convert kebab-case to Rally field names with special cases
   */
  private kebabToRallySpecialCase(field: string): string {
    // Special cases for Rally field names that don't follow standard PascalCase
    const specialCases: Record<string, string> = {
      'formatted-id': 'FormattedID',
      'object-id': 'ObjectID',
      'ref-object-uuid': 'refObjectUUID',
      'ref-object-name': 'refObjectName',
      'ref': 'ref',
      'type': 'type',
      'plan-estimate': 'PlanEstimate',
      'schedule-state': 'ScheduleState',
      'last-update-date': 'LastUpdateDate',
      'creation-date': 'CreationDate',
      'found-in-build': 'FoundInBuild',
      'fixed-in-build': 'FixedInBuild',
      'work-product': 'WorkProduct',
      'to-do': 'ToDo',
      'todo': 'ToDo',
      'api-integration': 'APIIntegration',
      'apiintegration': 'APIIntegration',
      'custom-priority': 'CustomPriority',
      'business-value': 'BusinessValue',
      'my-custom-field': 'MyCustomField'
    };

    // Check for exact matches first
    const specialCase = specialCases[field];
    if (specialCase) {
      return specialCase;
    }

    // Fall back to standard PascalCase conversion
    return this.kebabToPascal(field);
  }

  /**
   * Get known field mappings for Rally artifacts
   */
  getFieldMappings(): Record<string, { rallyField: string; mcpField: string; type: 'standard' | 'custom' | 'metadata' }> {
    return {
      // User Story fields
      'FormattedID': { rallyField: 'FormattedID', mcpField: 'formatted-id', type: 'standard' },
      'Name': { rallyField: 'Name', mcpField: 'name', type: 'standard' },
      'Description': { rallyField: 'Description', mcpField: 'description', type: 'standard' },
      'PlanEstimate': { rallyField: 'PlanEstimate', mcpField: 'plan-estimate', type: 'standard' },
      'ScheduleState': { rallyField: 'ScheduleState', mcpField: 'schedule-state', type: 'standard' },
      'Owner': { rallyField: 'Owner', mcpField: 'owner', type: 'standard' },
      'Project': { rallyField: 'Project', mcpField: 'project', type: 'standard' },
      'Iteration': { rallyField: 'Iteration', mcpField: 'iteration', type: 'standard' },

      // Defect fields
      'Severity': { rallyField: 'Severity', mcpField: 'severity', type: 'standard' },
      'State': { rallyField: 'State', mcpField: 'state', type: 'standard' },
      'FoundInBuild': { rallyField: 'FoundInBuild', mcpField: 'found-in-build', type: 'standard' },
      'FixedInBuild': { rallyField: 'FixedInBuild', mcpField: 'fixed-in-build', type: 'standard' },
      'Resolution': { rallyField: 'Resolution', mcpField: 'resolution', type: 'standard' },

      // Task fields
      'WorkProduct': { rallyField: 'WorkProduct', mcpField: 'work-product', type: 'standard' },
      'Estimate': { rallyField: 'Estimate', mcpField: 'estimate', type: 'standard' },
      'ToDo': { rallyField: 'ToDo', mcpField: 'todo', type: 'standard' },
      'Actuals': { rallyField: 'Actuals', mcpField: 'actuals', type: 'standard' },

      // Metadata fields
      '_ref': { rallyField: '_ref', mcpField: 'metadata-ref', type: 'metadata' },
      '_refObjectName': { rallyField: '_refObjectName', mcpField: 'metadata-ref-object-name', type: 'metadata' },
      '_type': { rallyField: '_type', mcpField: 'metadata-type', type: 'metadata' },
      '_refObjectUUID': { rallyField: '_refObjectUUID', mcpField: 'metadata-ref-object-uuid', type: 'metadata' },

      // Common fields
      'ObjectID': { rallyField: 'ObjectID', mcpField: 'object-id', type: 'standard' },
      'CreationDate': { rallyField: 'CreationDate', mcpField: 'creation-date', type: 'standard' },
      'LastUpdateDate': { rallyField: 'LastUpdateDate', mcpField: 'last-update-date', type: 'standard' },
    };
  }

  /**
   * Validate field transformation (useful for testing)
   */
  validateTransformation(originalField: string, transformedField: string, direction: 'rallyToMcp' | 'mcpToRally'): boolean {
    if (direction === 'rallyToMcp') {
      const backTransformed = this.mcpFieldToRally(transformedField);
      return backTransformed === originalField;
    } else {
      const backTransformed = this.rallyFieldToMcp(transformedField);
      return backTransformed === originalField;
    }
  }
}