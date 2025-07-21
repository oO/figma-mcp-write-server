/**
 * Shared Layout Utilities
 * 
 * Common functionality for layout-related handlers (auto-layout, constraints, hierarchy, alignment)
 */

import { BulkOperationsParser, CommonParamConfigs, BulkOperationResult } from './bulk-operations.js';
import * as yaml from 'js-yaml';

export interface LayoutOperationConfig {
  operation: string;
  bulkParams: string[];
  paramConfigs: Record<string, any>;
  pluginMessageType: string;
}

export class LayoutUtils {
  /**
   * Standard layout operation handler with bulk support
   */
  static async handleLayoutOperation(
    args: any,
    config: LayoutOperationConfig,
    sendToPlugin: (request: any) => Promise<any>,
    singleHandler: (args: any, sendToPlugin: (request: any) => Promise<any>) => Promise<any>,
    bulkHandler: (args: any, config: LayoutOperationConfig, sendToPlugin: (request: any) => Promise<any>) => Promise<any>
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
   * Standard bulk operation executor for layout operations
   */
  static async executeBulkLayoutOperation(
    args: any,
    config: LayoutOperationConfig,
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

        const response = await sendToPlugin({
          type: config.pluginMessageType,
          payload: validatedArgs
        });

        return response;
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
   * Standard single operation executor for layout operations
   */
  static async executeSingleLayoutOperation(
    args: any,
    config: LayoutOperationConfig,
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
   * Common parameter configurations for layout operations
   */
  static getLayoutParamConfigs() {
    return {
      nodeId: CommonParamConfigs.nodeId,
      nodeIds: CommonParamConfigs.nodeIds,
      newParentId: CommonParamConfigs.nodeId,
      newIndex: { expectedType: 'array' as const, arrayItemType: 'number' as const, allowSingle: true },
      name: CommonParamConfigs.name,
      operation: CommonParamConfigs.operation,
      failFast: CommonParamConfigs.failFast,
      // Auto layout specific
      direction: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
      spacing: { expectedType: 'array' as const, arrayItemType: 'number' as const, allowSingle: true },
      paddingTop: { expectedType: 'array' as const, arrayItemType: 'number' as const, allowSingle: true },
      paddingRight: { expectedType: 'array' as const, arrayItemType: 'number' as const, allowSingle: true },
      paddingBottom: { expectedType: 'array' as const, arrayItemType: 'number' as const, allowSingle: true },
      paddingLeft: { expectedType: 'array' as const, arrayItemType: 'number' as const, allowSingle: true },
      // Constraints specific
      horizontal: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
      vertical: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true }
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