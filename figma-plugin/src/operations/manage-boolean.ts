import { OperationResult } from '../types.js';
import { BaseOperation } from './base-operation.js';
import { findNodeById, formatNodeResponse, selectAndFocus } from '../utils/node-utils.js';

/**
 * Handle BOOLEAN_OPERATION - perform boolean operations on vector nodes
 */
export async function BOOLEAN_OPERATION(params: any): Promise<OperationResult> {
  return BaseOperation.executeOperation('booleanOperation', params, async () => {
    BaseOperation.validateParams(params, ['operation', 'nodeIds']);
    
    const operation = BaseOperation.validateStringParam(
      params.operation,
      'operation',
      ['union', 'subtract', 'intersect', 'exclude']
    );
    
    const nodeIds = Array.isArray(params.nodeIds) ? params.nodeIds : [params.nodeIds];
    const preserveOriginal = params.preserveOriginal === true;
    
    if (nodeIds.length < 2) {
      throw new Error('Boolean operations require at least 2 nodes');
    }
    
    // Find all nodes
    const nodes: VectorNode[] = [];
    for (const nodeId of nodeIds) {
      const node = findNodeById(nodeId);
      if (!node) {
        throw new Error(`Node with ID ${nodeId} not found`);
      }
      
      // Check if node supports boolean operations
      if (!('fills' in node) || node.type === 'GROUP') {
        throw new Error(`Node ${nodeId} (${node.type}) does not support boolean operations`);
      }
      
      nodes.push(node as VectorNode);
    }
    
    // Clone nodes if preserveOriginal is true
    const workingNodes = preserveOriginal ? nodes.map(node => node.clone()) : nodes;
    
    // Perform boolean operation using the correct Figma API
    let booleanNode: VectorNode;
    
    switch (operation) {
      case 'union':
        booleanNode = figma.union(workingNodes, figma.currentPage);
        break;
      case 'subtract':
        booleanNode = figma.subtract(workingNodes, figma.currentPage);
        break;
      case 'intersect':
        booleanNode = figma.intersect(workingNodes, figma.currentPage);
        break;
      case 'exclude':
        booleanNode = figma.exclude(workingNodes, figma.currentPage);
        break;
      default:
        throw new Error(`Unknown boolean operation: ${operation}`);
    }
    
    // Set name
    booleanNode.name = params.name || `Boolean ${operation}`;
    
    // Select and focus the result
    selectAndFocus(booleanNode);
    
    return formatNodeResponse(booleanNode, `Boolean ${operation} operation completed successfully`);
  });
}