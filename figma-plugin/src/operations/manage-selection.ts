import { OperationResult } from '../types.js';
import { BaseOperation } from './base-operation.js';
import { findNodeById, formatNodeResponse, selectAndFocus, getAllNodes, getNodesByIds, createNodeData } from '../utils/node-utils.js';
import { formatSelection, createPageNodesResponse } from '../utils/response-utils.js';

/**
 * Shared function to get nodes based on unified parameters
 */
async function getNodesFromParams(params: any): Promise<any[]> {
  // Null-safe parameter extraction
  const nodeId = (params && params.nodeId !== null && params.nodeId !== undefined) ? params.nodeId : undefined;
  const traversal = (params && params.traversal !== null && params.traversal !== undefined) ? params.traversal : undefined;
  const filterByType = (params && params.filterByType !== null && params.filterByType !== undefined) ? params.filterByType : [];
  const filterByName = (params && params.filterByName !== null && params.filterByName !== undefined) ? params.filterByName : undefined;
  const filterByVisibility = (params && params.filterByVisibility !== null && params.filterByVisibility !== undefined) ? params.filterByVisibility : 'visible';
  const filterByLockedState = (params && params.filterByLockedState !== null && params.filterByLockedState !== undefined) ? params.filterByLockedState : undefined;
  const maxDepth = (params && params.maxDepth !== null && params.maxDepth !== undefined) ? params.maxDepth : null;
  const maxResults = (params && params.maxResults !== null && params.maxResults !== undefined) ? params.maxResults : undefined;
  const includePages = (params && params.includePages !== null && params.includePages !== undefined) ? params.includePages : false;
  
  let allNodes: any[] = [];
  
  // Determine starting point(s)
  const startingIds = nodeId;
  
  if (startingIds) {
    // Start from specific node(s)
    const ids = Array.isArray(startingIds) ? startingIds : [startingIds];
    
    for (const id of ids) {
      const startNode = findNodeById(id);
      if (!startNode) continue;
      
      if (traversal === 'children') {
        if ('children' in startNode) {
          allNodes.push(...(startNode as any).children);
        }
      } else if (traversal === 'ancestors') {
        let current = startNode.parent;
        while (current && current.type !== 'PAGE') {
          allNodes.push(current);
          current = current.parent;
        }
      } else if (traversal === 'siblings') {
        const parent = startNode.parent;
        if (parent && 'children' in parent) {
          allNodes.push(...(parent as any).children.filter((child: BaseNode) => child.id !== startNode.id));
        }
      } else if (traversal === 'descendants' || !traversal) {
        // Default: get all descendants
        const includeHidden = filterByVisibility !== 'visible';
        allNodes.push(...getAllNodes(startNode, 'standard', includeHidden, maxDepth));
      }
    }
  } else {
    // Start from current page
    const includeHidden = filterByVisibility !== 'visible';
    allNodes = getAllNodes(figma.currentPage, 'standard', includeHidden, maxDepth);
  }
  
  // Apply visibility filter
  if (filterByVisibility === 'visible') {
    allNodes = allNodes.filter(node => node.visible);
  } else if (filterByVisibility === 'hidden') {
    allNodes = allNodes.filter(node => !node.visible);
  }
  // 'all' requires no filtering
  
  // Filter out page nodes unless requested
  if (!includePages) {
    allNodes = allNodes.filter(node => node.type !== 'PAGE');
  }
  
  // Apply other filters - normalize filterByType to uppercase for case-insensitive matching
  if (filterByType.length > 0) {
    const normalizedTypes = filterByType.map(type => type.toUpperCase());
    allNodes = allNodes.filter(node => normalizedTypes.includes(node.type));
  }
  
  if (filterByName) {
    const nameRegex = new RegExp(filterByName, 'i');
    allNodes = allNodes.filter(node => nameRegex.test(node.name));
  }
  
  if (filterByLockedState !== undefined) {
    allNodes = allNodes.filter(node => node.locked === filterByLockedState);
  }
  
  // Apply maxResults limit
  if (maxResults && allNodes.length > maxResults) {
    allNodes = allNodes.slice(0, maxResults);
  }
  
  return allNodes;
}

/**
 * Handle MANAGE_SELECTION operation
 * Supports: get, set, clear, get_page_nodes, select_all, select_by_type, select_by_name, get_ancestors, get_children, select_siblings, find_nodes
 */
export async function handleManageSelection(params: any): Promise<OperationResult> {
  return BaseOperation.executeOperation('manageSelection', params, async () => {
    // Comprehensive null safety
    if (!params || typeof params !== 'object') {
      throw new Error('Invalid parameters object');
    }
    
    if (!params.operation) {
      throw new Error('operation parameter is required');
    }
    
    const validOperations = ['get_selection', 'set_selection', 'list_nodes'];
    if (!validOperations.includes(params.operation)) {
      throw new Error(`Unknown selection operation: ${params.operation}. Valid operations: ${validOperations.join(', ')}`);
    }

    switch (params.operation) {
      case 'get_selection':
        return await getSelection(params);
      case 'set_selection':
        return await setSelection(params);
      case 'list_nodes':
        return await listNodes(params);
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
    const nodes = await getNodesFromParams(params);
    
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

async function listNodes(params: any = {}): Promise<any> {
  return BaseOperation.executeOperation('listNodes', params, async () => {
    // Null-safe parameter extraction
    const detail = (params && params.detail !== null && params.detail !== undefined) ? params.detail : 'standard';
    
    // Get nodes using shared traversal/filtering logic
    const allNodes = await getNodesFromParams(params);
    
    // Create response with proper detail level
    const pageData = createPageNodesResponse(allNodes, detail);
    
    return pageData;
  });
}