import { OperationResult, OperationHandler } from '../types.js';
import { createSuccessResponse, createErrorResponse, logOperation } from '../utils/response-utils.js';

export abstract class BaseHandler {
  protected abstract getHandlerName(): string;

  protected async executeOperation<T>(
    operation: string,
    params: any,
    handler: () => Promise<T>
  ): Promise<OperationResult> {
    console.log(`🔧 ${this.getHandlerName()}: Starting ${operation}`, params);
    
    try {
      const result = await handler();
      const response = createSuccessResponse(result);
      logOperation(`${this.getHandlerName()}.${operation}`, params, response);
      return response;
    } catch (error) {
      console.error(`❌ ${this.getHandlerName()}: ${operation} failed:`, error);
      const response = createErrorResponse(error as Error);
      logOperation(`${this.getHandlerName()}.${operation}`, params, response);
      return response;
    }
  }

  protected validateParams(params: any, requiredFields: string[]): void {
    for (const field of requiredFields) {
      if (params[field] === undefined || params[field] === null) {
        throw new Error(`Missing required parameter: ${field}`);
      }
    }
  }

  protected validateStringParam(value: any, name: string, allowedValues?: string[]): string {
    if (typeof value !== 'string') {
      throw new Error(`Parameter ${name} must be a string`);
    }
    
    if (allowedValues && !allowedValues.includes(value)) {
      throw new Error(`Parameter ${name} must be one of: ${allowedValues.join(', ')}`);
    }
    
    return value;
  }

  protected validateNumberParam(value: any, name: string, min?: number, max?: number): number {
    if (typeof value !== 'number' || isNaN(value)) {
      throw new Error(`Parameter ${name} must be a valid number`);
    }
    
    if (min !== undefined && value < min) {
      throw new Error(`Parameter ${name} must be >= ${min}`);
    }
    
    if (max !== undefined && value > max) {
      throw new Error(`Parameter ${name} must be <= ${max}`);
    }
    
    return value;
  }

  protected validateArrayParam(value: any, name: string, minLength?: number): any[] {
    if (!Array.isArray(value)) {
      throw new Error(`Parameter ${name} must be an array`);
    }
    
    if (minLength !== undefined && value.length < minLength) {
      throw new Error(`Parameter ${name} must have at least ${minLength} elements`);
    }
    
    return value;
  }

  protected setDefaults<T>(params: Partial<T>, defaults: Partial<T>): T {
    return Object.assign({}, defaults, params) as T;
  }

  abstract getOperations(): Record<string, OperationHandler>;
}