import { OperationResult } from '../types.js';

/**
 * Base utilities for all operations
 */
export class BaseOperation {
  /**
   * Execute an operation with consistent error handling and logging
   * KISS: Returns data directly or throws errors (no success wrappers)
   */
  static async executeOperation(
    operationName: string,
    params: any,
    operation: () => Promise<any>
  ): Promise<any> {
    const startTime = Date.now();
    
    try {
      const result = await operation();
      // KISS: Return data directly, no wrapper
      return result;
    } catch (error) {
      // KISS: Throw errors directly instead of wrapping
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(errorMessage);
    }
  }

  /**
   * Validate required parameters
   */
  static validateParams(params: any, requiredFields: string[]): void {
    for (const field of requiredFields) {
      if (params[field] === undefined || params[field] === null) {
        throw new Error(`Missing required parameter: ${field}`);
      }
    }
  }

  /**
   * Validate string parameter with allowed values
   */
  static validateStringParam(
    value: any,
    paramName: string,
    allowedValues: string[]
  ): string {
    if (typeof value !== 'string') {
      throw new Error(`Parameter '${paramName}' must be a string`);
    }
    
    if (!allowedValues.includes(value)) {
      throw new Error(`Parameter '${paramName}' must be one of: ${allowedValues.join(', ')}`);
    }
    
    return value;
  }

  /**
   * Validate numeric parameter with optional range
   */
  static validateNumericParam(
    value: any,
    paramName: string,
    min?: number,
    max?: number
  ): number {
    if (typeof value !== 'number' || isNaN(value)) {
      throw new Error(`Parameter '${paramName}' must be a valid number`);
    }
    
    if (min !== undefined && value < min) {
      throw new Error(`Parameter '${paramName}' must be >= ${min}`);
    }
    
    if (max !== undefined && value > max) {
      throw new Error(`Parameter '${paramName}' must be <= ${max}`);
    }
    
    return value;
  }

}