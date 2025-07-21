/**
 * Shared Dev Mode Utilities
 * 
 * Common functionality for dev mode handlers (annotations, measurements, dev-resources)
 */

import { BulkOperationsParser, CommonParamConfigs, BulkOperationResult } from './bulk-operations.js';
import { validateAndParse } from '../types/validation-utils.js';
import * as yaml from 'js-yaml';

export interface DevModeOperationConfig {
  operation: string;
  bulkParams: string[];
  paramConfigs: Record<string, any>;
  pluginMessageType: string;
  schema: any;
}

export class DevModeUtils {
  /**
   * Standard dev mode operation handler with bulk support
   */
  static async handleDevModeOperation(
    args: any,
    config: DevModeOperationConfig,
    sendToPlugin: (request: any) => Promise<any>
  ): Promise<any> {
    // Apply defensive parsing to handle various MCP client formats
    const normalizedArgs = BulkOperationsParser.parseParameters(args, config.paramConfigs);
    
    // Detect if this should be a bulk operation
    const isBulkOperation = BulkOperationsParser.detectBulkOperation(normalizedArgs, config.bulkParams);
    
    if (isBulkOperation) {
      return this.handleBulkDevModeOperation(normalizedArgs, config, sendToPlugin);
    }
    
    // Single operation
    return this.handleSingleDevModeOperation(normalizedArgs, config, sendToPlugin);
  }

  /**
   * Handle single dev mode operation
   */
  static async handleSingleDevModeOperation(
    params: any,
    config: DevModeOperationConfig,
    sendToPlugin: (request: any) => Promise<any>
  ): Promise<any> {
    // KISS: validateAndParse now throws on validation errors
    const validated = validateAndParse(config.schema, params, config.operation);

    const response = await sendToPlugin({
      type: config.pluginMessageType,
      payload: validated
    });

    return {
      content: [{
        type: 'text',
        text: yaml.dump(response || { message: 'Operation completed successfully' }, { 
          indent: 2,
          quotingType: '"',
          forceQuotes: false
        })
      }]
    };
  }

  /**
   * Handle bulk dev mode operations
   */
  static async handleBulkDevModeOperation(
    args: any,
    config: DevModeOperationConfig,
    sendToPlugin: (request: any) => Promise<any>
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
        // KISS: validateAndParse now throws on validation errors
        const validated = validateAndParse(config.schema, operation, config.operation);

        return await sendToPlugin({
          type: config.pluginMessageType,
          payload: validated
        });
      },
      {
        operation: args.operation,
        failFast: args.failFast || false
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
   * Common parameter configurations for dev mode operations
   */
  static getDevModeParamConfigs() {
    return {
      // Common to all dev mode operations
      operation: CommonParamConfigs.operation,
      failFast: CommonParamConfigs.failFast,
      
      // Annotations specific
      nodeId: CommonParamConfigs.nodeId,
      annotationId: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
      label: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
      labelMarkdown: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
      categoryId: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
      
      // Measurements specific
      measurementId: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
      fromNodeId: CommonParamConfigs.nodeId,
      toNodeId: CommonParamConfigs.nodeId,
      direction: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
      customValue: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
      pageId: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
      
      // Dev resources specific
      status: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
      linkUrl: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
      linkTitle: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
      linkId: { expectedType: 'string' as const, allowSingle: true }
    };
  }
}