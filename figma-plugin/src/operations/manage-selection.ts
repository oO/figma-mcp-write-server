import { OperationResult } from '../types.js';
import { BaseOperation } from './base-operation.js';
import { findNodeById, findNodeInPage, formatNodeResponse, selectAndFocus, getAllNodes, getNodesByIds, createNodeData } from '../utils/node-utils.js';
import { formatSelection, createPageNodesResponse } from '../utils/response-utils.js';
import { getNodesFromParams } from './manage-nodes.js';


/**
 * Handle MANAGE_SELECTION operation
 * Supports: get_selection, set_selection
 */
export async function MANAGE_SELECTION(params: any): Promise<OperationResult> {
  return BaseOperation.executeOperation('manageSelection', params, async () => {
    // Comprehensive null safety
    if (!params || typeof params !== 'object') {
      throw new Error('Invalid parameters object');
    }
    
    if (!params.operation) {
      throw new Error('operation parameter is required');
    }
    
    const validOperations = ['get_selection', 'set_selection'];
    if (!validOperations.includes(params.operation)) {
      throw new Error(`Unknown selection operation: ${params.operation}. Valid operations: ${validOperations.join(', ')}`);
    }

    switch (params.operation) {
      case 'get_selection':
        return await getSelection(params);
      case 'set_selection':
        return await setSelection(params);
      default:
        throw new Error(`Unknown selection operation: ${params.operation}`);
    }
  });
}

async function getSelection(params: any): Promise<any> {
  // Null-safe destructuring
  const detail = (params && params.detail !== null && params.detail !== undefined) ? params.detail : 'standard';
  const focus = (params && params.focus !== null && params.focus !== undefined) ? params.focus : true;
  
  const selection = figma.currentPage.selection;
  
  // Use shared node formatting logic with detail levels
  const selectionData = selection.map(node => 
    createNodeData(node, detail, 0, null)
  );
  
  return {
    selection: selectionData,
    count: selection.length,
    detail,
    focus,
    message: `${selection.length} node(s) selected`
  };
}

async function setSelection(params: any): Promise<any> {
  return BaseOperation.executeOperation('setSelection', params, async () => {
    // Get nodes using shared traversal/filtering logic
    const nodes = await getNodesFromParams(params, 'standard');
    
    // Filter to selectable nodes only
    const selectableNodes = nodes.filter(node => 'x' in node) as SceneNode[];
    
    // Set selection
    figma.currentPage.selection = selectableNodes;
    selectAndFocus(selectableNodes);
    
    return {
      selectedNodes: formatSelection(selectableNodes),
      count: selectableNodes.length,
      totalFound: nodes.length,
      message: `Selected ${selectableNodes.length} of ${nodes.length} found node(s)`
    };
  });
}

