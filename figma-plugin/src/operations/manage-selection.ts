import { OperationResult } from '../types.js';
import { BaseOperation } from './base-operation.js';
import { findNodeById, findNodeInPage, formatNodeResponse, selectAndFocus, getAllNodes, getNodesByIds, createNodeData } from '../utils/node-utils.js';
import { formatSelection, createPageNodesResponse } from '../utils/response-utils.js';
import { logMessage } from '../utils/plugin-logger.js';

/**
 * Shared function to get nodes based on unified parameters
 */
async function getNodesFromParams(params: any, detail: string = 'standard'): Promise<any[]> {
  // Null-safe parameter extraction
  const pageId = (params && params.pageId !== null && params.pageId !== undefined) ? params.pageId : undefined;
  const nodeId = (params && params.nodeId !== null && params.nodeId !== undefined) ? params.nodeId : undefined;
  const traversal = (params && params.traversal !== null && params.traversal !== undefined) ? params.traversal : undefined;
  const filterByType = (params && params.filterByType !== null && params.filterByType !== undefined) ? params.filterByType : [];
  const filterByName = (params && params.filterByName !== null && params.filterByName !== undefined) ? params.filterByName : undefined;
  const filterByVisibility = (params && params.filterByVisibility !== null && params.filterByVisibility !== undefined) ? params.filterByVisibility : 'visible';
  const filterByLockedState = (params && params.filterByLockedState !== null && params.filterByLockedState !== undefined) ? params.filterByLockedState : undefined;
  const maxDepth = (params && params.maxDepth !== null && params.maxDepth !== undefined) ? params.maxDepth : null;
  const maxResults = (params && params.maxResults !== null && params.maxResults !== undefined) ? params.maxResults : undefined;
  const includeAllPages = (params && params.includeAllPages !== null && params.includeAllPages !== undefined) ? params.includeAllPages : false;
  
  let allNodes: any[] = [];
  
  // Determine target page
  let targetPage: PageNode;
  if (pageId) {
    // Find specific page by ID
    await figma.loadAllPagesAsync();
    const foundPage = figma.root.children.find(page => page.id === pageId && page.type === 'PAGE') as PageNode;
    if (!foundPage) {
      throw new Error(`Page not found: ${pageId}. Available pages: ${figma.root.children.filter(p => p.type === 'PAGE').map(p => `${p.name} (${p.id})`).join(', ')}`);
    }
    targetPage = foundPage;
    await targetPage.loadAsync();
  } else {
    // Use current page
    targetPage = figma.currentPage;
  }
  
  // Load all pages if includeAllPages is true
  if (includeAllPages) {
    await figma.loadAllPagesAsync();
  }
  
  // Determine starting point(s)
  const startingIds = nodeId;
  
  if (startingIds) {
    // Start from specific node(s)
    const ids = Array.isArray(startingIds) ? startingIds : [startingIds];
    
    for (const id of ids) {
      // Find node in target page or globally
      let startNode: BaseNode | null = null;
      
      if (pageId && !includeAllPages) {
        // Search within specific page only
        startNode = findNodeInPage(targetPage, id);
        if (!startNode) {
          throw new Error(`Node not found in page "${targetPage.name}" (${targetPage.id}): ${id}`);
        }
      } else {
        // Search globally
        startNode = findNodeById(id);
        if (!startNode) {
          throw new Error(`Node not found: ${id}`);
        }
      }
      
      // logMessage('🔍 Processing starting node', {
      //   nodeId: id,
      //   nodeType: startNode.type,
      //   nodeName: startNode.name,
      //   hasChildren: 'children' in startNode,
      //   traversal: traversal || 'descendants (default)'
      // });
      
      if (traversal === 'children') {
        // Load page content if it's a page node (critical for non-current pages)
        if (startNode.type === 'PAGE') {
          await (startNode as PageNode).loadAsync();
          // logMessage('📄 Page loaded for children traversal', {
          //   pageId: startNode.id,
          //   pageName: startNode.name,
          //   isCurrentPage: startNode.id === figma.currentPage.id
          // });
        }
        
        if ('children' in startNode) {
          const children = (startNode as any).children;
          // logMessage('👶 Adding children', { 
          //   childCount: children.length,
          //   nodeType: startNode.type 
          // });
          allNodes.push(...children);
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
        
        // Special handling for PAGE nodes - get children, not the page itself
        if (startNode.type === 'PAGE') {
          // logMessage('📄 Special PAGE handling - getting children only', {
          //   pageId: startNode.id,
          //   pageName: startNode.name
          // });
          
          // Load the page content first (critical for non-current pages)
          await (startNode as PageNode).loadAsync();
          // logMessage('📄 Page loaded successfully', {
          //   pageId: startNode.id,
          //   pageName: startNode.name,
          //   isCurrentPage: startNode.id === figma.currentPage.id,
          //   hasChildren: 'children' in startNode,
          //   childrenCount: 'children' in startNode ? (startNode as any).children.length : 0
          // });
          
          if ('children' in startNode) {
            for (const child of (startNode as any).children) {
              allNodes.push(...getAllNodes(child, detail, includeHidden, maxDepth, 1, startNode.id));
            }
          }
        } else {
          // Regular node processing
          allNodes.push(...getAllNodes(startNode, detail, includeHidden, maxDepth));
        }
      }
    }
  } else {
    // Start from current page or all pages
    const includeHidden = filterByVisibility !== 'visible';
    
    // logMessage('📄 Processing pages', { 
    //   includeAllPages, 
    //   includeHidden, 
    //   detail,
    //   currentPageName: figma.currentPage.name,
    //   currentPageId: figma.currentPage.id
    // });
    
    if (includeAllPages) {
      // Search across all pages in the document
      for (const page of figma.root.children) {
        if (page.type === 'PAGE') {
          await (page as PageNode).loadAsync();
          const pageNodes = getAllNodes(page, detail, includeHidden, maxDepth);
          // logMessage('📑 Processed page', {
          //   pageName: page.name,
          //   pageId: page.id,
          //   nodeCount: pageNodes.length
          // });
          allNodes.push(...pageNodes);
        }
      }
    } else {
      // Start from target page (specific pageId or current page)
      allNodes = getAllNodes(targetPage, detail, includeHidden, maxDepth);
    }
  }
  
  // logMessage('🔍 Before filtering', { 
  //   nodeCount: allNodes.length,
  //   filterByVisibility,
  //   includeAllPages,
  //   firstNodeType: allNodes.length > 0 ? allNodes[0].type : 'none'
  // });

  // Apply visibility filter
  if (filterByVisibility === 'visible') {
    const beforeCount = allNodes.length;
    allNodes = allNodes.filter(node => node.visible);
    // logMessage('👁️ After visibility filter (visible)', { 
    //   beforeCount, 
    //   afterCount: allNodes.length,
    //   filtered: beforeCount - allNodes.length
    // });
  } else if (filterByVisibility === 'hidden') {
    const beforeCount = allNodes.length;
    allNodes = allNodes.filter(node => !node.visible);
    // logMessage('🫥 After visibility filter (hidden)', { 
    //   beforeCount, 
    //   afterCount: allNodes.length,
    //   filtered: beforeCount - allNodes.length
    // });
  }
  // 'all' requires no filtering
  
  // Filter out page nodes unless document-wide search is requested
  // Note: When includeAllPages is true, we typically want the page contents, not the page nodes themselves
  if (!includeAllPages) {
    const beforeCount = allNodes.length;
    allNodes = allNodes.filter(node => node.type !== 'PAGE');
    // logMessage('📄 After page filter', { 
    //   beforeCount, 
    //   afterCount: allNodes.length,
    //   filtered: beforeCount - allNodes.length
    // });
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

async function listNodes(params: any = {}): Promise<any> {
  return BaseOperation.executeOperation('listNodes', params, async () => {
    // logMessage('🚀 Starting listNodes operation', { params });
    // Check if any filters are applied (excluding maxDepth)
    const nodeIdFilter = (params && params.nodeId !== null && params.nodeId !== undefined);
    const traversalFilter = (params && params.traversal !== null && params.traversal !== undefined);
    const typeFilter = (params && params.filterByType !== null && params.filterByType !== undefined && Array.isArray(params.filterByType) && params.filterByType.length > 0);
    const nameFilter = (params && params.filterByName !== null && params.filterByName !== undefined);
    const visibilityFilter = (params && params.filterByVisibility !== null && params.filterByVisibility !== undefined && params.filterByVisibility !== 'visible');
    const lockedFilter = (params && params.filterByLockedState !== null && params.filterByLockedState !== undefined);
    const maxResultsFilter = (params && params.maxResults !== null && params.maxResults !== undefined);
    const includeAllPagesFilter = (params && params.includeAllPages !== null && params.includeAllPages !== undefined && params.includeAllPages === true);
    
    const hasFilters = nodeIdFilter || traversalFilter || typeFilter || nameFilter || visibilityFilter || lockedFilter || maxResultsFilter || includeAllPagesFilter;
    
    // Debug logging for filter detection
    // logMessage('🔍 Filter detection for list_nodes', {
    //   nodeIdFilter,
    //   traversalFilter,
    //   typeFilter,
    //   nameFilter,
    //   visibilityFilter,
    //   lockedFilter,
    //   maxResultsFilter,
    //   includeAllPagesFilter,
    //   hasFilters,
    //   paramsReceived: params
    // });
    
    // Determine detail level: use minimal when no filters are applied, unless explicitly specified
    const detail = (params && params.detail !== null && params.detail !== undefined) 
      ? params.detail 
      : (hasFilters ? 'standard' : 'minimal');
    
    // logMessage('📋 Detail level selected for list_nodes', { detail, hasFilters });
    
    // Get nodes using shared traversal/filtering logic
    const allNodes = await getNodesFromParams(params, detail);
    
    // logMessage('📊 Nodes retrieved from getNodesFromParams', { 
    //   nodeCount: allNodes.length, 
    //   detail,
    //   firstNodeId: allNodes.length > 0 ? allNodes[0].id : 'none'
    // });
    
    // Create response with proper detail level
    const pageData = createPageNodesResponse(allNodes, detail);
    
    // logMessage('📋 Final response created', { 
    //   totalCount: pageData.totalCount, 
    //   topLevelCount: pageData.topLevelCount,
    //   detail: pageData.detail
    // });
    
    return pageData;
  });
}