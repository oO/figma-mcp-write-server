/**
 * Bulk Operations Utility Module
 * 
 * Provides reusable defensive parsing and bulk operation support for MCP tools.
 * Based on the proven architecture from figma_nodes implementation.
 */

export interface ParamConfig {
  expectedType: 'string' | 'number' | 'boolean' | 'array';
  arrayItemType?: 'string' | 'number' | 'boolean';
  allowSingle?: boolean; // Single value can become array
  validator?: (value: any) => boolean;
  required?: boolean;
}

// Bulk operations return a simple array
export type BulkOperationResult = Array<any>;

export class BulkOperationsParser {
  
  /**
   * Apply defensive parsing to normalize parameters from various MCP client formats
   */
  static parseParameters(args: any, paramConfigs: Record<string, ParamConfig>): any {
    // Null-safe parameter handling
    if (!args || typeof args !== 'object') {
      args = {};
    }
    
    // Null-safe paramConfigs handling (defensive against Claude Desktop bugs)
    if (!paramConfigs || typeof paramConfigs !== 'object') {
      return args;
    }
    
    const normalized = { ...args };
    
    // Check for unknown parameters first
    const knownParams = Object.keys(paramConfigs);
    const providedParams = Object.keys(args);
    const unknownParams = providedParams.filter(param => !knownParams.includes(param));
    
    if (unknownParams.length > 0) {
      throw new Error(`Unknown parameter(s): ${unknownParams.join(', ')}. Valid parameters: ${knownParams.join(', ')}`);
    }
    
    for (const [param, config] of Object.entries(paramConfigs)) {
      if (normalized[param] !== undefined && normalized[param] !== null) {
        normalized[param] = this.defensiveParse(normalized[param], config, param);
      } else if (config.required) {
        throw new Error(`Required parameter '${param}' is missing`);
      }
    }
    
    return normalized;
  }

  /**
   * Detect if operation should use bulk mode based on array parameters or count
   */
  static detectBulkOperation(args: any, arrayParams: string[]): boolean {
    // Count parameter for duplicate operations is not bulk - it's single operation with multiple outputs
    // Only treat as bulk if we have multiple input arrays (multiple different nodes being processed)
    
    // Check if any specified parameter is an array with more than 1 item
    // Single-item arrays from defensive parsing should be treated as single operations
    return arrayParams.some(param => Array.isArray(args[param]) && args[param].length > 1);
  }

  /**
   * Expand array parameters to target length with cycling behavior
   */
  static expandArrayParam(param: any, targetLength: number): any[] {
    if (!Array.isArray(param)) {
      // Single value or undefined - repeat for all items
      return new Array(targetLength).fill(param);
    }
    
    // Single-item arrays should be treated as single values (no cycling complexity)
    if (param.length === 1) {
      return new Array(targetLength).fill(param[0]);
    }
    
    if (param.length > targetLength) {
      // Truncate to target length
      return param.slice(0, targetLength);
    }
    
    // Array is shorter with multiple values - cycle through values
    const expanded = [];
    for (let i = 0; i < targetLength; i++) {
      expanded.push(param[i % param.length]);
    }
    return expanded;
  }

  /**
   * Execute bulk operations with error handling and partial success support
   */
  static async executeBulkOperations<T>(
    operations: Array<T>,
    executor: (operation: T, index: number) => Promise<any>,
    options: {
      operation?: string;
    } = {}
  ): Promise<BulkOperationResult> {
    const results: any[] = [];

    for (let i = 0; i < operations.length; i++) {
      const operation = operations[i];
      if (!operation) continue;
      
      try {
        const result = await executor(operation, i);
        // Simple: spread result data directly
        results.push({ ...result });
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.toString() : String(error);
        // Enhanced: include operation context for better debugging
        const errorResult: any = { 
          error: errorMessage,
          index: i + 1 // 1-based index for user-friendly error reporting
        };
        
        // Add operation context if available
        if (options.operation) {
          errorResult.operation = options.operation;
        }
        
        // Add parameter context if operation has relevant fields
        if (operation && typeof operation === 'object') {
          const contextFields = ['nodeId', 'operation', 'componentId', 'styleId', 'variableId', 'collectionId'];
          for (const field of contextFields) {
            if ((operation as any)[field] !== undefined) {
              errorResult[field] = (operation as any)[field];
              break; // Only include the first relevant field to avoid clutter
            }
          }
        }
        
        results.push(errorResult);
      }
    }

    // Return simple array
    return results;
  }

  /**
   * Get maximum array length from specified parameters
   */
  static getMaxArrayLength(args: any, arrayParams: string[]): number {
    let maxLength = 1;
    
    for (const param of arrayParams) {
      if (Array.isArray(args[param]) && args[param].length > 1) {
        // Only consider arrays with multiple values for determining bulk operation length
        maxLength = Math.max(maxLength, args[param].length);
      }
    }
    
    return maxLength;
  }

  // Private helper methods
  private static defensiveParse(value: any, config: ParamConfig, paramName: string): any {
    // Phase 1: Direct type match
    if (this.isExpectedType(value, config)) {
      return this.validateValue(value, config, paramName);
    }
    
    // Phase 2: JSON string detection and parsing
    if (typeof value === 'string' && value.trim().length > 0) {
      const parsed = this.tryParseJsonString(value);
      if (parsed !== null && this.isExpectedType(parsed, config)) {
        return this.validateValue(parsed, config, paramName);
      }
    }
    
    // Phase 3: Type coercion
    const coerced = this.tryTypeCoercion(value, config);
    if (coerced !== null && this.isExpectedType(coerced, config)) {
      return this.validateValue(coerced, config, paramName);
    }
    
    // Phase 4: Single-to-array promotion
    if (config.allowSingle && config.expectedType === 'array') {
      const promoted = this.promoteSingleToArray(value, config);
      if (promoted !== null) {
        return this.validateValue(promoted, config, paramName);
      }
    }
    
    // Phase 5: Return original with validation (will throw if invalid)
    return this.validateValue(value, config, paramName);
  }

  private static isExpectedType(value: any, config: ParamConfig): boolean {
    switch (config.expectedType) {
      case 'string': return typeof value === 'string';
      case 'number': return typeof value === 'number' && !isNaN(value) && isFinite(value);
      case 'boolean': return typeof value === 'boolean';
      case 'array': return Array.isArray(value);
      default: return false;
    }
  }

  private static tryParseJsonString(value: string): any {
    const trimmed = value.trim();
    if ((trimmed.startsWith('[') && trimmed.endsWith(']')) || 
        (trimmed.startsWith('{') && trimmed.endsWith('}'))) {
      try {
        return JSON.parse(trimmed);
      } catch {
        return null;
      }
    }
    return null;
  }

  private static tryTypeCoercion(value: any, config: ParamConfig): any {
    if (typeof value !== 'string') return null;
    
    switch (config.expectedType) {
      case 'number':
        const num = Number(value);
        return !isNaN(num) && isFinite(num) ? num : null;
      case 'boolean':
        if (value === null || value === undefined) {
          return null; // Will be caught by validation
        }
        const lower = value.toLowerCase();
        if (lower === 'true') return true;
        if (lower === 'false') return false;
        // Handle common boolean representations
        if (lower === '1' || lower === 'yes' || lower === 'on') return true;
        if (lower === '0' || lower === 'no' || lower === 'off') return false;
        return null;
      default:
        return null;
    }
  }

  private static promoteSingleToArray(value: any, config: ParamConfig): any {
    // Try to coerce single value to array item type first
    let itemValue = value;
    
    if (config.arrayItemType && typeof value === 'string') {
      switch (config.arrayItemType) {
        case 'number':
          const num = Number(value);
          if (!isNaN(num) && isFinite(num)) itemValue = num;
          break;
        case 'boolean':
          const lower = value.toLowerCase();
          if (lower === 'true') itemValue = true;
          else if (lower === 'false') itemValue = false;
          break;
      }
    }
    
    // Validate the item before promoting to array
    if (config.validator && !config.validator(itemValue)) {
      return null;
    }
    
    return [itemValue];
  }

  private static validateValue(value: any, config: ParamConfig, paramName: string): any {
    if (config.expectedType === 'array' && Array.isArray(value)) {
      return this.validateAndFilterArray(value, config, paramName);
    }
    
    // Single value validation
    if (config.validator && !config.validator(value)) {
      throw new Error(`Parameter '${paramName}' failed validation: invalid value '${value}'`);
    }
    
    return value;
  }

  private static validateAndFilterArray(array: any[], config: ParamConfig, paramName: string): any[] {
    const invalidItems: string[] = [];
    const filtered = array.filter((item, index) => {
      // Type check
      if (config.arrayItemType) {
        switch (config.arrayItemType) {
          case 'string':
            if (typeof item !== 'string') {
              invalidItems.push(`item[${index}]: expected string, received ${typeof item}`);
              return false;
            }
            break;
          case 'number':
            if (typeof item !== 'number' || isNaN(item) || !isFinite(item)) {
              invalidItems.push(`item[${index}]: expected number, received ${typeof item === 'number' ? 'invalid number' : typeof item}`);
              return false;
            }
            break;
          case 'boolean':
            if (typeof item !== 'boolean') {
              invalidItems.push(`item[${index}]: expected boolean, received ${typeof item}`);
              return false;
            }
            break;
        }
      }
      
      // Custom validation
      if (config.validator && !config.validator(item)) {
        invalidItems.push(`item[${index}]: failed custom validation`);
        return false;
      }
      
      return true;
    });
    
    if (filtered.length === 0) {
      const errorDetails = invalidItems.length > 0 ? ` (${invalidItems.join(', ')})` : '';
      throw new Error(`Parameter '${paramName}' failed validation: no valid items found in array${errorDetails}`);
    }
    
    return filtered;
  }
}

/**
 * Common parameter configurations for Figma operations
 */
export const CommonParamConfigs = {
  // Node identification
  nodeId: { 
    expectedType: 'array' as const, 
    arrayItemType: 'string' as const, 
    allowSingle: true 
  },
  nodeIds: { 
    expectedType: 'array' as const, 
    arrayItemType: 'string' as const, 
    allowSingle: true 
  },

  // Colors with hex validation (supports 6-digit #RRGGBB and 8-digit #RRGGBBAA)
  fillColor: { 
    expectedType: 'array' as const, 
    arrayItemType: 'string' as const, 
    allowSingle: true,
    validator: (v: any) => typeof v === 'string' && /^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/.test(v) 
  },
  strokeColor: { 
    expectedType: 'array' as const, 
    arrayItemType: 'string' as const, 
    allowSingle: true,
    validator: (v: any) => typeof v === 'string' && /^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/.test(v) 
  },

  // Text content
  characters: { 
    expectedType: 'array' as const, 
    arrayItemType: 'string' as const, 
    allowSingle: true 
  },
  content: { 
    expectedType: 'array' as const, 
    arrayItemType: 'string' as const, 
    allowSingle: true 
  },

  // Numeric parameters
  fontSize: { 
    expectedType: 'array' as const, 
    arrayItemType: 'number' as const, 
    allowSingle: true,
    validator: (v: any) => typeof v === 'number' && v > 0 && v <= 1000
  },
  fillOpacity: { 
    expectedType: 'array' as const, 
    arrayItemType: 'number' as const, 
    allowSingle: true,
    validator: (v: any) => typeof v === 'number' && v >= 0 && v <= 1
  },
  strokeOpacity: { 
    expectedType: 'array' as const, 
    arrayItemType: 'number' as const, 
    allowSingle: true,
    validator: (v: any) => typeof v === 'number' && v >= 0 && v <= 1
  },
  strokeWeight: { 
    expectedType: 'array' as const, 
    arrayItemType: 'number' as const, 
    allowSingle: true,
    validator: (v: any) => typeof v === 'number' && v >= 0
  },
  strokeAlign: { 
    expectedType: 'array' as const, 
    arrayItemType: 'string' as const, 
    allowSingle: true,
    validator: (v: any) => typeof v === 'string' && ['CENTER', 'INSIDE', 'OUTSIDE'].includes(v)
  },
  opacity: { 
    expectedType: 'array' as const, 
    arrayItemType: 'number' as const, 
    allowSingle: true,
    validator: (v: any) => typeof v === 'number' && v >= 0 && v <= 1
  },
  x: { expectedType: 'array' as const, arrayItemType: 'number' as const, allowSingle: true },
  y: { expectedType: 'array' as const, arrayItemType: 'number' as const, allowSingle: true },
  width: { expectedType: 'array' as const, arrayItemType: 'number' as const, allowSingle: true },
  height: { expectedType: 'array' as const, arrayItemType: 'number' as const, allowSingle: true },

  // String parameters
  fontFamily: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
  name: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },

  // Boolean parameters
  visible: { expectedType: 'array' as const, arrayItemType: 'boolean' as const, allowSingle: true },
  locked: { expectedType: 'array' as const, arrayItemType: 'boolean' as const, allowSingle: true },

  // Object parameters
  cssOptions: { expectedType: 'object' as const, allowSingle: true },

  // Operation control
  operation: { expectedType: 'string' as const, required: true },
  count: { expectedType: 'number' as const }
};