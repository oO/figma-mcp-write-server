/**
 * Shared Variable Utilities
 * 
 * Common functionality for variable-related handlers (collections, variables)
 */

import { BulkOperationsParser, CommonParamConfigs, BulkOperationResult } from './bulk-operations.js';
import * as yaml from 'js-yaml';

export interface VariableOperationConfig {
  operation: string;
  bulkParams: string[];
  paramConfigs: Record<string, any>;
  pluginMessageType: string;
}

export class VariableUtils {
  /**
   * Standard variable operation handler with bulk support
   */
  static async handleVariableOperation(
    args: any,
    config: VariableOperationConfig,
    sendToPlugin: (request: any) => Promise<any>,
    singleHandler: (args: any, sendToPlugin: (request: any) => Promise<any>) => Promise<any>,
    bulkHandler: (args: any, config: VariableOperationConfig, sendToPlugin: (request: any) => Promise<any>) => Promise<any>
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
      throw new Error(`${config.operation} failed: ${error instanceof Error ? error.toString() : String(error)}`);
    }
  }

  /**
   * Standard bulk operation executor for variable operations
   */
  static async executeBulkVariableOperation(
    args: any,
    config: VariableOperationConfig,
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
   * Standard single operation executor for variable operations
   */
  static async executeSingleVariableOperation(
    args: any,
    config: VariableOperationConfig,
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
        text: yaml.dump(response || { message: 'Operation completed successfully' }, { indent: 2 })
      }]
    };
  }

  /**
   * Common parameter configurations for variable operations
   */
  static getVariableParamConfigs() {
    return {
      // Collection parameters
      collectionId: CommonParamConfigs.nodeId, // Reuse nodeId config for collection IDs
      collectionName: CommonParamConfigs.name,
      modeId: CommonParamConfigs.nodeId, // Reuse nodeId config for mode IDs
      newModeName: CommonParamConfigs.name,
      description: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
      modes: { expectedType: 'array' as const, arrayItemType: 'array' as const, allowSingle: true },
      hiddenFromPublishing: { expectedType: 'array' as const, arrayItemType: 'boolean' as const, allowSingle: true },
      
      // Variable parameters
      variableId: CommonParamConfigs.nodeId, // Reuse nodeId config for variable IDs
      nodeId: CommonParamConfigs.nodeId,
      variableName: CommonParamConfigs.name,
      variableType: { expectedType: 'array' as const, arrayItemType: 'string' as const, allowSingle: true },
      
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

  /**
   * Special handling for collections with modes parameter
   */
  static handleCollectionModes(args: any, maxLength: number): any[] {
    const operations: any[] = [];
    const bulkParams = ['collectionId', 'collectionName', 'modeId', 'newModeName', 'description', 'hiddenFromPublishing'];
    
    // Check if modes is array of arrays and update maxLength accordingly
    if (args.modes && Array.isArray(args.modes) && args.modes.length > 0 && Array.isArray(args.modes[0])) {
      maxLength = Math.max(maxLength, args.modes.length);
    }
    
    // Build operations array
    for (let i = 0; i < maxLength; i++) {
      const operation = { ...args };
      
      // Expand each bulk parameter
      for (const param of bulkParams) {
        if (args[param] !== undefined) {
          const expandedValues = BulkOperationsParser.expandArrayParam(args[param], maxLength);
          operation[param] = expandedValues[i];
        }
      }
      
      // Special handling for modes parameter
      if (args.modes !== undefined) {
        if (Array.isArray(args.modes) && args.modes.length > 0 && Array.isArray(args.modes[0])) {
          // Array of arrays - use cycling
          const expandedModes = BulkOperationsParser.expandArrayParam(args.modes, maxLength);
          operation.modes = expandedModes[i];
        } else {
          // Single array or other format - repeat for all operations
          operation.modes = args.modes;
        }
      }
      
      operations.push(operation);
    }
    
    return operations;
  }
}