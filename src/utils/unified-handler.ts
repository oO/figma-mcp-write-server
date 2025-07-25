/**
 * Unified Handler Abstraction
 * 
 * Eliminates code duplication across all handlers by providing a single,
 * configurable handler pattern that works for all tool types.
 */

import { BulkOperationsParser, ParamConfig, BulkOperationResult, CommonParamConfigs } from './bulk-operations.js';
import { validateAndParse } from '../types/validation-utils.js';
import { logger } from "../utils/logger.js"
import * as yaml from 'js-yaml';

export interface UnifiedHandlerConfig {
  // Tool identification
  toolName: string;
  operation: string;
  
  // Bulk operation configuration
  bulkParams: string[];
  paramConfigs: Record<string, any>;
  
  // Plugin communication
  pluginMessageType: string;
  
  // Schema validation
  schema?: any;
  
  // Custom validation function (optional)
  customValidator?: (args: any) => any;
  
  
  // Special bulk handling (optional)
  specialBulkHandler?: (args: any, maxLength: number) => any[];
  
  // Custom handler for special cases (optional)
  customHandler?: (args: any) => Promise<any>;
  
  // Operation-specific parameter validation for warnings
  operationParameters?: Record<string, readonly string[]>;
}

export class UnifiedHandler {
  private sendToPlugin: (request: any) => Promise<any>;
  
  /**
   * Public method to send requests to plugin (for custom handlers)
   */
  async sendPluginRequest(request: any): Promise<any> {
    return this.sendToPlugin(request);
  }

  constructor(sendToPluginFn: (request: any) => Promise<any>) {
    this.sendToPlugin = sendToPluginFn;
  }

  /**
   * Universal handler method that works for all tool types
   */
  async handle(args: any, config: UnifiedHandlerConfig): Promise<any> {
    try {

      // Apply defensive parsing to handle various MCP client formats
      const normalizedArgs = BulkOperationsParser.parseParameters(args, config.paramConfigs);
      
      
      // Detect if this should be a bulk operation
      const isBulkOperation = BulkOperationsParser.detectBulkOperation(normalizedArgs, config.bulkParams);
      
      if (isBulkOperation) {
        return await this.handleBulkOperation(normalizedArgs, config);
      } else {
        return await this.handleSingleOperation(normalizedArgs, config);
      }
    } catch (error) {
      // Preserve detailed validation errors instead of generic wrapping
      if (error instanceof Error && error.message.includes('Validation failed:')) {
        throw error; // Preserve specific validation errors
      }
      
      // Enhanced error context for better debugging
      const operationContext = args?.operation ? ` (${args.operation})` : '';
      const toolContext = config.toolName !== config.operation ? ` in ${config.toolName}` : '';
      
      throw new Error(`${config.operation}${operationContext} failed${toolContext}: ${error instanceof Error ? error.toString() : String(error)}`);
    }
  }

  /**
   * Handle single operation with unified logic
   */
  private async handleSingleOperation(args: any, config: UnifiedHandlerConfig): Promise<any> {
    // Extract single values from arrays for schema validation
    const singleArgs = this.extractSingleValues(args, config.bulkParams);
    
    
    // Validate using schema or custom validator
    const validatedArgs = this.validateArgs(singleArgs, config);
    

    // Generate parameter warnings (non-blocking)
    const warnings = this.generateParameterWarnings(validatedArgs, config);

    // Use custom handler if provided
    if (config.customHandler) {
      const response = await config.customHandler(validatedArgs);
      
      // Check if custom handler returned a pre-formatted MCP response
      if (response && response.content && Array.isArray(response.content) && response.isError !== undefined) {
        // Custom handler returned MCP format directly - return as-is
        return response;
      }
      
      // Otherwise format as normal
      return this.formatSingleResponse(response, config, warnings);
    }

    // Send to plugin

    const response = await this.sendToPlugin({
      type: config.pluginMessageType,
      payload: validatedArgs
    });

    // Format response
    return this.formatSingleResponse(response, config, warnings);
  }

  /**
   * Handle bulk operations with unified logic
   */
  private async handleBulkOperation(args: any, config: UnifiedHandlerConfig): Promise<any> {
    // Use special bulk handler if provided, otherwise use standard logic
    const operations = config.specialBulkHandler 
      ? config.specialBulkHandler(args, BulkOperationsParser.getMaxArrayLength(args, config.bulkParams))
      : this.buildStandardOperations(args, config);
    
    // Execute bulk operations
    const bulkResult = await BulkOperationsParser.executeBulkOperations(
      operations,
      async (operation, index) => {
        // Validate each operation
        const validatedArgs = this.validateArgs(operation, config);

        // Use custom handler if available, otherwise use standard plugin message
        let response;
        if (config.customHandler) {
          response = await config.customHandler(validatedArgs);
        } else {
          response = await this.sendToPlugin({
            type: config.pluginMessageType,
            payload: validatedArgs
          });
        }

        return response || { message: 'Operation completed successfully' };
      },
      {
        operation: args.operation,
        failFast: args.failFast || false
      }
    );

    return this.formatBulkResponse(bulkResult);
  }

  /**
   * Build standard operations array for bulk processing
   */
  private buildStandardOperations(args: any, config: UnifiedHandlerConfig): any[] {
    const maxLength = BulkOperationsParser.getMaxArrayLength(args, config.bulkParams);
    const operations: any[] = [];
    
    for (let i = 0; i < maxLength; i++) {
      const operation = args ? { ...args } : {};
      
      // Ensure target parameter is included for export operations
      if (config.operation === 'exports' && !operation.target) {
        operation.target = 'FILE';
      }
      
      // Expand each bulk parameter
      for (const param of config.bulkParams) {
        if (args[param] !== undefined && args[param] !== null) {
          const paramConfig = config.paramConfigs[param];
          
          // Skip expansion for array-only parameters (allowSingle: false)
          // These parameters should remain as arrays in all operations
          if (paramConfig && paramConfig.allowSingle === false) {
            // Keep the original array value - don't expand to single values
            operation[param] = args[param];
          } else {
            // Standard bulk expansion for parameters that allow single values
            const expandedValues = BulkOperationsParser.expandArrayParam(args[param], maxLength);
            operation[param] = expandedValues[i];
          }
        }
      }
      
      operations.push(operation);
    }
    
    return operations;
  }

  /**
   * Validate arguments using schema or custom validator
   */
  private validateArgs(args: any, config: UnifiedHandlerConfig): any {
    if (config.customValidator) {
      return config.customValidator(args);
    }
    
    if (config.schema) {
      // KISS: validateAndParse now throws on validation errors
      return validateAndParse(config.schema, args, config.operation);
    }
    
    // No validation - return args as-is
    return args;
  }

  /**
   * Extract single values from arrays for schema validation
   */
  private extractSingleValues(args: any, arrayParams: string[]): any {
    const singleArgs = { ...args };
    for (const param of arrayParams) {
      if (Array.isArray(singleArgs[param]) && singleArgs[param].length === 1) {
        singleArgs[param] = singleArgs[param][0];
      }
    }
    return singleArgs;
  }

  /**
   * Format single operation response with optional warnings
   * Uses MCP format for consistency with bulk operations and error responses
   */
  private formatSingleResponse(data: any, config: UnifiedHandlerConfig, warnings?: string[]): any {
    // Use MCP format for consistency with bulk operations and error responses
    const result = { ...data };
    
    if (warnings && warnings.length > 0) {
      result.warnings = warnings;
    }
    
    const responseData = result || { message: 'Operation completed successfully' };
    
    return {
      content: [{
        type: 'text',
        text: yaml.dump(responseData, { 
          indent: 2, 
          quotingType: '"',
          forceQuotes: false
        })
      }],
      isError: false
    };
  }

  /**
   * Format bulk operation response
   * BulkOperationResult already has Agent-friendly format
   */
  private formatBulkResponse(bulkResult: BulkOperationResult): any {
    return {
      content: [{
        type: 'text',
        text: yaml.dump(bulkResult, { 
          indent: 2, 
          quotingType: '"',
          forceQuotes: false
        })
      }],
      isError: false
    };
  }

  /**
   * Generate parameter warnings for irrelevant parameters
   */
  private generateParameterWarnings(args: any, config: UnifiedHandlerConfig): string[] {
    if (!config.operationParameters || !args || !args.operation) {
      return [];
    }

    const operation = args.operation as string;
    const allowedParams = config.operationParameters[operation];
    
    if (!allowedParams) {
      return []; // No specific validation for this operation
    }
    
    // Get all provided parameters except 'operation'
    const providedParams = Object.keys(args).filter(key => key !== 'operation');
    
    // Find parameters that are not allowed for this operation
    const irrelevantParams = providedParams.filter(param => !allowedParams.includes(param));
    
    if (irrelevantParams.length === 0) {
      return [];
    }
    
    return [`Irrelevant parameter(s) for ${operation}: ${irrelevantParams.join(', ')}. Valid parameters: ${allowedParams.join(', ')}`];
  }

}

/**
 * Create parameter configs for common tool patterns
 */
export class UnifiedParamConfigs {
  static basic() {
    return {
      operation: CommonParamConfigs.operation,
      failFast: CommonParamConfigs.failFast
    };
  }

  static withNodeId() {
    return {
      ...this.basic(),
      nodeId: CommonParamConfigs.nodeId
    };
  }

  static withNodeIdAndName() {
    return {
      ...this.withNodeId(),
      name: CommonParamConfigs.name
    };
  }

  static withPositioning() {
    return {
      ...this.withNodeIdAndName(),
      x: CommonParamConfigs.x,
      y: CommonParamConfigs.y
    };
  }

  static withColors() {
    return {
      ...this.withNodeId(),
      fillColor: CommonParamConfigs.fillColor,
      strokeColor: CommonParamConfigs.strokeColor,
      fillOpacity: CommonParamConfigs.fillOpacity,
      strokeOpacity: CommonParamConfigs.strokeOpacity,
      strokeWeight: CommonParamConfigs.strokeWeight,
      strokeAlign: CommonParamConfigs.strokeAlign,
      opacity: CommonParamConfigs.opacity
    };
  }

  static forText() {
    return {
      ...this.withNodeId(),
      characters: CommonParamConfigs.characters,
      content: CommonParamConfigs.content,
      fontSize: CommonParamConfigs.fontSize,
      fontFamily: CommonParamConfigs.fontFamily
    };
  }

  static forDevMode() {
    return {
      ...this.withNodeId(),
      label: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
      direction: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true }
    };
  }


  static forComponents() {
    return {
      ...this.withPositioning(),
      componentId: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
      instanceId: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
      description: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true }
    };
  }

  static forLayout() {
    return {
      ...this.withNodeId(),
      direction: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
      spacing: { expectedType: 'array' as const, arrayItemType: 'number' as const, allowSingle: true },
      horizontal: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
      vertical: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true }
    };
  }
}