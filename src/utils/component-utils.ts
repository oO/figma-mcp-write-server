/**
 * Shared Component Utilities
 * 
 * Common functionality for component-related handlers (components, instances)
 */

import { BulkOperationsParser, CommonParamConfigs, BulkOperationResult } from './bulk-operations.js';
import * as yaml from 'js-yaml';

export interface ComponentOperationConfig {
  operation: string;
  bulkParams: string[];
  paramConfigs: Record<string, any>;
  pluginMessageType: string;
}

export class ComponentUtils {
  /**
   * Standard component operation handler with bulk support
   */
  static async handleComponentOperation(
    args: any,
    config: ComponentOperationConfig,
    sendToPlugin: (request: any) => Promise<any>,
    singleHandler: (args: any, sendToPlugin: (request: any) => Promise<any>) => Promise<any>,
    bulkHandler: (args: any, config: ComponentOperationConfig, sendToPlugin: (request: any) => Promise<any>) => Promise<any>
  ): Promise<any> {
    try {
      // Apply defensive parsing
      const normalizedArgs = BulkOperationsParser.parseParameters(args, config.paramConfigs);
      
      // Detect if this should be a bulk operation
      const isBulkOperation = BulkOperationsParser.detectBulkOperation(normalizedArgs, config.bulkParams);
      
      if (isBulkOperation) {
        return await bulkHandler(normalizedArgs, config, sendToPlugin);
      } else {
        return await singleHandler(normalizedArgs, sendToPlugin);
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Standard bulk operation executor for component operations
   */
  static async executeBulkComponentOperation(
    args: any,
    config: ComponentOperationConfig,
    sendToPlugin: (request: any) => Promise<any>,
    validator: (operation: any) => any
  ): Promise<any> {
    const maxLength = BulkOperationsParser.getMaxArrayLength(args, config.bulkParams);
    
    // Expand all parameters to match the maximum length
    const operations: any[] = [];
    for (let i = 0; i < maxLength; i++) {
      const operation = { ...args };
      
      // Expand each bulk parameter
      for (const param of config.bulkParams) {
        if (args[param] !== undefined) {
          const expandedValues = BulkOperationsParser.expandArrayParam(args[param], maxLength);
          operation[param] = expandedValues[i];
        }
      }
      
      operations.push(operation);
    }
    
    // Execute bulk operations
    const bulkResult = await BulkOperationsParser.executeBulkOperations(
      operations,
      async (operation, index) => {
        const validatedArgs = validator(operation);

        return await sendToPlugin({
          type: config.pluginMessageType,
          payload: validatedArgs
        });
      },
      {
        operation: args.operation,
        failFast: args.failFast
      }
    );
    
    return {
      content: [{
        type: 'text',
        text: yaml.dump(bulkResult, { indent: 2 })
      }]
    };
  }

  /**
   * Standard single operation executor for component operations
   */
  static async executeSingleComponentOperation(
    args: any,
    config: ComponentOperationConfig,
    sendToPlugin: (request: any) => Promise<any>,
    validator: (args: any) => any
  ): Promise<any> {
    const validatedArgs = validator(args);

    const response = await sendToPlugin({
      type: config.pluginMessageType,
      payload: validatedArgs
    });

    return {
      content: [{
        type: 'text',
        text: yaml.dump(response, { indent: 2 })
      }]
    };
  }

  /**
   * Common parameter configurations for component operations
   */
  static getComponentParamConfigs() {
    return {
      // Core identifiers
      nodeId: CommonParamConfigs.nodeId,
      componentId: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
      instanceId: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
      mainComponentId: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
      
      // Names and descriptions
      name: CommonParamConfigs.name,
      description: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
      
      // Positioning
      x: CommonParamConfigs.x,
      y: CommonParamConfigs.y,
      
      // Component properties
      componentSetId: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
      
      // Control parameters
      operation: CommonParamConfigs.operation,
      failFast: CommonParamConfigs.failFast
    };
  }

  /**
   * Extract single values from arrays for schema validation
   */
  static extractSingleValues(args: any, arrayParams: string[]): any {
    const singleArgs = { ...args };
    for (const param of arrayParams) {
      if (Array.isArray(singleArgs[param]) && singleArgs[param].length === 1) {
        singleArgs[param] = singleArgs[param][0];
      }
    }
    return singleArgs;
  }
}