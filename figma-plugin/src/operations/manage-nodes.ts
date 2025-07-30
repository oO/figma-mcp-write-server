import { NodeParams, OperationResult } from '../types.js';
import { BaseOperation } from './base-operation.js';
import { hexToRgb, createSolidPaint, parseHexColor } from '../utils/color-utils.js';
import { findNodeById, findNodeInPage, formatNodeResponse, formatNodeResponseAsync, moveNodeToPosition, resizeNode, getAllNodes, createNodeData, applyCornerRadius } from '../utils/node-utils.js';
import { findSmartPosition, checkForOverlaps, createOverlapWarning } from '../utils/smart-positioning.js';
import { 
  handleBulkError,
  createBulkSummary,
  distributeBulkParams
} from '../utils/bulk-operations.js';
import { createPageNodesResponse } from '../utils/response-utils.js';
import { normalizeToArray } from '../utils/paint-properties.js';
import { removeSymbols } from '../utils/vector-sparse-format.js';

/**
 * Add a node to the specified parent container or page
 * Validates parent container type and throws descriptive errors
 */
function addNodeToParent(node: SceneNode, parentId?: string): BaseNode & ChildrenMixin {
  if (parentId) {
    const parentNode = findNodeById(parentId);
    if (!parentNode) {
      throw new Error(`Parent node with ID ${parentId} not found`);
    }
    
    // Validate that the parent can contain children
    const containerTypes = ['DOCUMENT', 'PAGE', 'FRAME', 'GROUP', 'COMPONENT', 'COMPONENT_SET', 'SLIDE', 'SLIDE_ROW', 'SECTION', 'STICKY', 'SHAPE_WITH_TEXT', 'TABLE', 'CODE_BLOCK'];
    if (!containerTypes.includes(parentNode.type)) {
      throw new Error(`Parent node type '${parentNode.type}' cannot contain child nodes. Valid container types: ${containerTypes.join(', ')}`);
    }
    
    // Add to parent container
    (parentNode as BaseNode & ChildrenMixin).appendChild(node);
    return parentNode as BaseNode & ChildrenMixin;
  } else {
    // Add to current page
    figma.currentPage.appendChild(node);
    return figma.currentPage;
  }
}

/**
 * Handle MANAGE_NODES operation
 * Supports: get, list, update, delete, duplicate, create_rectangle, create_ellipse, create_frame, create_section, create_slice, create_star, create_polygon
 */
export async function MANAGE_NODES(params: any): Promise<OperationResult> {
  return BaseOperation.executeOperation('manageNodes', params, async () => {
    if (!params.operation) {
      throw new Error('operation parameter is required');
    }
    
    const validOperations = [
      'get', 'list', 'update', 'delete', 'duplicate', 
      'create_rectangle', 'create_ellipse', 'create_frame', 'create_section', 'create_slice', 'create_star', 'create_polygon',
      'update_rectangle', 'update_ellipse', 'update_frame', 'update_section', 'update_slice', 'update_star', 'update_polygon'
    ];
    
    if (!validOperations.includes(params.operation)) {
      throw new Error(`Unknown node operation: ${params.operation}. Valid operations: ${validOperations.join(', ')}`);
    }
    
    switch (params.operation) {
      case 'get':
        return await getNode(params);
      case 'list':
        return await listNodes(params);
      case 'update':
        return await updateNode(params);
      case 'delete':
        return await deleteNode(params);
      case 'duplicate':
        return await duplicateNode(params);
      case 'create_rectangle':
        return await createRectangle(params);
      case 'create_ellipse':
        return await createEllipse(params);
      case 'create_frame':
        return await createFrame(params);
      case 'create_section':
        return await createSection(params);
      case 'create_slice':
        return await createSlice(params);
      case 'create_star':
        return await createStar(params);
      case 'create_polygon':
        return await createPolygon(params);
      case 'update_rectangle':
        return await updateRectangle(params);
      case 'update_ellipse':
        return await updateEllipse(params);
      case 'update_frame':
        return await updateFrame(params);
      case 'update_section':
        return await updateSection(params);
      case 'update_slice':
        return await updateSlice(params);
      case 'update_star':
        return await updateStar(params);
      case 'update_polygon':
        return await updatePolygon(params);
      default:
        throw new Error(`Unknown node operation: ${params.operation}`);
    }
  });
}

async function getNode(params: any): Promise<OperationResult> {
  return BaseOperation.executeOperation('getNode', params, async () => {
    BaseOperation.validateParams(params, ['nodeId']);
    
    const nodeIds = normalizeToArray(params.nodeId);
    const results: any[] = [];
    
    for (let i = 0; i < nodeIds.length; i++) {
      try {
        const nodeId = nodeIds[i];
        const node = findNodeById(nodeId);
        
        if (!node) {
          throw new Error(`Node with ID ${nodeId} not found`);
        }
        
        // Use the full formatNodeResponse but with Symbol-safe serialization
        const nodeData = formatNodeResponse(node);
        
        // Apply Symbol cleanup before adding to results
        const cleanData = removeSymbols(nodeData);
        
        results.push(cleanData);
        
      } catch (error) {
        handleBulkError(error, results, i, 'get', nodeIds[i]);
      }
    }
    
    return createBulkSummary(results, 'get');
  });
}

/**
 * Get nodes based on unified parameters (moved from figma_selection)
 */
export async function getNodesFromParams(params: any, detail: string = 'standard'): Promise<any[]> {
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
      
      if (traversal === 'children') {
        // Load page content if it's a page node (critical for non-current pages)
        if (startNode.type === 'PAGE') {
          await (startNode as PageNode).loadAsync();
        }
        
        if ('children' in startNode) {
          const children = (startNode as any).children;
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
          // Load the page content first (critical for non-current pages)
          await (startNode as PageNode).loadAsync();
          
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
    
    if (includeAllPages) {
      // Search across all pages in the document
      for (const page of figma.root.children) {
        if (page.type === 'PAGE') {
          await (page as PageNode).loadAsync();
          const pageNodes = getAllNodes(page, detail, includeHidden, maxDepth);
          allNodes.push(...pageNodes);
        }
      }
    } else {
      // Start from target page (specific pageId or current page)
      allNodes = getAllNodes(targetPage, detail, includeHidden, maxDepth);
    }
  }

  // Apply visibility filter
  if (filterByVisibility === 'visible') {
    allNodes = allNodes.filter(node => node.visible);
  } else if (filterByVisibility === 'hidden') {
    allNodes = allNodes.filter(node => !node.visible);
  }
  // 'all' requires no filtering
  
  // Filter out page nodes unless document-wide search is requested
  if (!includeAllPages) {
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

async function listNodes(params: any = {}): Promise<OperationResult> {
  return BaseOperation.executeOperation('listNodes', params, async () => {
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
    
    // Determine detail level: use minimal when no filters are applied, unless explicitly specified
    const detail = (params && params.detail !== null && params.detail !== undefined) 
      ? params.detail 
      : (hasFilters ? 'standard' : 'minimal');
    
    // Get nodes using shared traversal/filtering logic
    const allNodes = await getNodesFromParams(params, detail);
    
    // Apply Symbol cleanup to all nodes before creating response
    const cleanNodes = allNodes.map(node => removeSymbols(node));
    
    // Create response with proper detail level
    const pageData = createPageNodesResponse(cleanNodes, detail);
    
    return pageData;
  });
}

async function updateNode(params: any): Promise<OperationResult> {
  BaseOperation.validateParams(params, ['nodeId']);
  
  const nodeIds = normalizeToArray(params.nodeId);
  const results: any[] = [];
  
  for (const nodeId of nodeIds) {
    try {
      const node = findNodeById(nodeId);
      if (!node) {
        throw new Error(`Node with ID ${nodeId} not found`);
      }

      // Update common properties only
      if (params.name !== undefined) {
        node.name = params.name;
      }

      if (params.x !== undefined || params.y !== undefined) {
        const currentX = 'x' in node ? (node as any).x : 0;
        const currentY = 'y' in node ? (node as any).y : 0;
        
        moveNodeToPosition(
          node,
          params.x !== undefined ? params.x : currentX,
          params.y !== undefined ? params.y : currentY
        );
      }

      if (params.width !== undefined || params.height !== undefined) {
        const currentWidth = 'width' in node ? (node as any).width : 100;
        const currentHeight = 'height' in node ? (node as any).height : 100;
        
        resizeNode(
          node, 
          params.width !== undefined ? params.width : currentWidth,
          params.height !== undefined ? params.height : currentHeight
        );
      }

      if (params.rotation !== undefined) {
        node.rotation = params.rotation; // Figma API uses degrees directly
      }

      if (params.visible !== undefined) {
        node.visible = params.visible;
      }

      if (params.locked !== undefined) {
        node.locked = params.locked;
      }

      if (params.opacity !== undefined) {
        node.opacity = params.opacity;
      }

      if (params.blendMode !== undefined) {
        node.blendMode = params.blendMode;
      }

      await applyCommonNodeProperties(node, params, 0);
      
      results.push(formatNodeResponse(node));
    } catch (error) {
      handleBulkError(error, nodeId, results);
    }
  }
  
  return createBulkSummary(results, nodeIds.length);
}

async function deleteNode(params: any): Promise<OperationResult> {
  BaseOperation.validateParams(params, ['nodeId']);
  
  const nodeIds = normalizeToArray(params.nodeId);
  const results: any[] = [];
  
  for (const nodeId of nodeIds) {
    try {
      const node = findNodeById(nodeId);
      if (!node) {
        throw new Error(`Node with ID ${nodeId} not found`);
      }

      const nodeInfo = formatNodeResponse(node);
      node.remove();
      
      results.push(nodeInfo);
    } catch (error) {
      handleBulkError(error, nodeId, results);
    }
  }
  
  return createBulkSummary(results, nodeIds.length);
}

async function duplicateNode(params: any): Promise<OperationResult> {
  BaseOperation.validateParams(params, ['nodeId']);
  
  const nodeIds = normalizeToArray(params.nodeId);
  const results: any[] = [];
  
  for (const nodeId of nodeIds) {
    try {
      const node = findNodeById(nodeId);
      if (!node) {
        throw new Error(`Node with ID ${nodeId} not found`);
      }

      const count = params.count || 1;
      const offsetX = params.offsetX ?? 10;  // Use nullish coalescing to allow 0
      const offsetY = params.offsetY ?? 10;  // Use nullish coalescing to allow 0

      // Handle bulk duplication with progressive offsets
      if (count > 1) {
        const duplicates: any[] = [];
        
        for (let i = 0; i < count; i++) {
          const duplicate = node.clone();
          
          if ('x' in duplicate && 'y' in duplicate) {
            // Position relative to original node with cumulative offsets
            duplicate.x = node.x + (offsetX * (i + 1));
            duplicate.y = node.y + (offsetY * (i + 1));
          }

          if (node.parent) {
            const index = node.parent.children.indexOf(node);
            node.parent.insertChild(index + 1 + i, duplicate);
          }

          duplicates.push(formatNodeResponse(duplicate));
        }

        results.push(...duplicates);
      } else {
        const duplicate = node.clone();
        
        if ('x' in duplicate && 'y' in duplicate) {
          duplicate.x = node.x + offsetX;
          duplicate.y = node.y + offsetY;
        }

        if (node.parent) {
          const index = node.parent.children.indexOf(node);
          node.parent.insertChild(index + 1, duplicate);
        }

        results.push(formatNodeResponse(duplicate));
      }
    } catch (error) {
      handleBulkError(error, nodeId, results);
    }
  }
  
  return createBulkSummary(results, nodeIds.length);
}

// CREATE OPERATIONS

async function createRectangle(params: any): Promise<OperationResult> {
  const results: any[] = [];
  const count = Array.isArray(params.name) ? params.name.length : 
               Array.isArray(params.x) ? params.x.length : 
               Array.isArray(params.y) ? params.y.length : 1;
  
  for (let i = 0; i < count; i++) {
    try {
      const rect = figma.createRectangle();
      
      rect.name = Array.isArray(params.name) ? params.name[i] : (params.name || 'Rectangle');
      
      const width = Array.isArray(params.width) ? params.width[i] : (params.width || 100);
      const height = Array.isArray(params.height) ? params.height[i] : (params.height || 100);
      
      resizeNode(rect, width, height);
      
      const parentContainer = addNodeToParent(rect, params.parentId);
      
      const x = Array.isArray(params.x) ? params.x[i] : params.x;
      const y = Array.isArray(params.y) ? params.y[i] : params.y;
      const positionResult = handleNodePositioning(rect, { x, y }, { width, height }, parentContainer);
      
      await applyCommonNodeProperties(rect, params, i);
      
      const response = formatNodeResponse(rect);
      if (positionResult.warning) response.warning = positionResult.warning;
      if (positionResult.positionReason) response.positionReason = positionResult.positionReason;
      
      results.push(response);
    } catch (error) {
      handleBulkError(error, `rectangle_${i}`, results);
    }
  }
  
  return createBulkSummary(results, count);
}

async function createEllipse(params: any): Promise<OperationResult> {
  const results: any[] = [];
  const count = Array.isArray(params.name) ? params.name.length : 
               Array.isArray(params.x) ? params.x.length : 
               Array.isArray(params.y) ? params.y.length : 1;
  
  for (let i = 0; i < count; i++) {
    try {
      const ellipse = figma.createEllipse();
      
      ellipse.name = Array.isArray(params.name) ? params.name[i] : (params.name || 'Ellipse');
      
      const width = Array.isArray(params.width) ? params.width[i] : (params.width || 100);
      const height = Array.isArray(params.height) ? params.height[i] : (params.height || 100);
      
      resizeNode(ellipse, width, height);
      
      const parentContainer = addNodeToParent(ellipse, params.parentId);
      
      const x = Array.isArray(params.x) ? params.x[i] : params.x;
      const y = Array.isArray(params.y) ? params.y[i] : params.y;
      const positionResult = handleNodePositioning(ellipse, { x, y }, { width, height }, parentContainer);
      
      await applyCommonNodeProperties(ellipse, params, i);
      
      const response = formatNodeResponse(ellipse);
      if (positionResult.warning) response.warning = positionResult.warning;
      if (positionResult.positionReason) response.positionReason = positionResult.positionReason;
      
      results.push(response);
    } catch (error) {
      handleBulkError(error, `ellipse_${i}`, results);
    }
  }
  
  return createBulkSummary(results, count);
}

async function createFrame(params: any): Promise<OperationResult> {
  const results: any[] = [];
  const count = Array.isArray(params.name) ? params.name.length : 
               Array.isArray(params.x) ? params.x.length : 
               Array.isArray(params.y) ? params.y.length : 1;
  
  for (let i = 0; i < count; i++) {
    try {
      const frame = figma.createFrame();
      
      frame.name = Array.isArray(params.name) ? params.name[i] : (params.name || 'Frame');
      
      const width = Array.isArray(params.width) ? params.width[i] : (params.width || 200);
      const height = Array.isArray(params.height) ? params.height[i] : (params.height || 200);
      
      resizeNode(frame, width, height);
      
      const parentContainer = addNodeToParent(frame, params.parentId);
      
      const x = Array.isArray(params.x) ? params.x[i] : params.x;
      const y = Array.isArray(params.y) ? params.y[i] : params.y;
      const positionResult = handleNodePositioning(frame, { x, y }, { width, height }, parentContainer);
      
      // Apply frame-specific properties
      await applyFrameProperties(frame, params, i);
      
      await applyCommonNodeProperties(frame, params, i);
      
      const response = formatNodeResponse(frame);
      if (positionResult.warning) response.warning = positionResult.warning;
      if (positionResult.positionReason) response.positionReason = positionResult.positionReason;
      
      results.push(response);
    } catch (error) {
      handleBulkError(error, `frame_${i}`, results);
    }
  }
  
  return createBulkSummary(results, count);
}

async function createSection(params: any): Promise<OperationResult> {
  const results: any[] = [];
  const count = Array.isArray(params.name) ? params.name.length : 
               Array.isArray(params.x) ? params.x.length : 
               Array.isArray(params.y) ? params.y.length : 1;
  
  for (let i = 0; i < count; i++) {
    try {
      const section = figma.createSection();
      
      section.name = Array.isArray(params.name) ? params.name[i] : (params.name || 'Section');
      
      // Section nodes use resizeWithoutConstraints() instead of resize()
      const width = Array.isArray(params.width) ? params.width[i] : (params.width || 300);
      const height = Array.isArray(params.height) ? params.height[i] : (params.height || 200);
      
      section.resizeWithoutConstraints(width, height);
      
      const parentContainer = addNodeToParent(section, params.parentId);
      
      const x = Array.isArray(params.x) ? params.x[i] : params.x;
      const y = Array.isArray(params.y) ? params.y[i] : params.y;
      const positionResult = handleNodePositioning(section, { x, y }, { width, height }, parentContainer);
      
      // Apply section-specific properties
      await applySectionProperties(section, params, i);
      
      await applyCommonNodeProperties(section, params, i);
      
      const response = formatNodeResponse(section);
      if (positionResult.warning) response.warning = positionResult.warning;
      if (positionResult.positionReason) response.positionReason = positionResult.positionReason;
      
      results.push(response);
    } catch (error) {
      handleBulkError(error, `section_${i}`, results);
    }
  }
  
  return createBulkSummary(results, count);
}

async function createSlice(params: any): Promise<OperationResult> {
  const results: any[] = [];
  const count = Array.isArray(params.name) ? params.name.length : 
               Array.isArray(params.x) ? params.x.length : 
               Array.isArray(params.y) ? params.y.length : 1;
  
  for (let i = 0; i < count; i++) {
    try {
      const slice = figma.createSlice();
      
      slice.name = Array.isArray(params.name) ? params.name[i] : (params.name || 'Slice');
      
      const width = Array.isArray(params.width) ? params.width[i] : (params.width || 100);
      const height = Array.isArray(params.height) ? params.height[i] : (params.height || 100);
      
      resizeNode(slice, width, height);
      
      const parentContainer = addNodeToParent(slice, params.parentId);
      
      const x = Array.isArray(params.x) ? params.x[i] : params.x;
      const y = Array.isArray(params.y) ? params.y[i] : params.y;
      const positionResult = handleNodePositioning(slice, { x, y }, { width, height }, parentContainer);
      
      await applyCommonNodeProperties(slice, params, i);
      
      const response = formatNodeResponse(slice);
      if (positionResult.warning) response.warning = positionResult.warning;
      if (positionResult.positionReason) response.positionReason = positionResult.positionReason;
      
      results.push(response);
    } catch (error) {
      handleBulkError(error, `slice_${i}`, results);
    }
  }
  
  return createBulkSummary(results, count);
}

async function createStar(params: any): Promise<OperationResult> {
  const results: any[] = [];
  const count = Array.isArray(params.name) ? params.name.length : 
               Array.isArray(params.x) ? params.x.length : 
               Array.isArray(params.y) ? params.y.length : 1;
  
  for (let i = 0; i < count; i++) {
    try {
      const star = figma.createStar();
      
      star.name = Array.isArray(params.name) ? params.name[i] : (params.name || 'Star');
      
      const width = Array.isArray(params.width) ? params.width[i] : (params.width || 100);
      const height = Array.isArray(params.height) ? params.height[i] : (params.height || 100);
      
      resizeNode(star, width, height);
      
      const parentContainer = addNodeToParent(star, params.parentId);
      
      const x = Array.isArray(params.x) ? params.x[i] : params.x;
      const y = Array.isArray(params.y) ? params.y[i] : params.y;
      const positionResult = handleNodePositioning(star, { x, y }, { width, height }, parentContainer);
      
      // Apply star-specific properties
      await applyStarProperties(star, params, i);
      
      await applyCommonNodeProperties(star, params, i);
      
      const response = formatNodeResponse(star);
      if (positionResult.warning) response.warning = positionResult.warning;
      if (positionResult.positionReason) response.positionReason = positionResult.positionReason;
      
      results.push(response);
    } catch (error) {
      handleBulkError(error, `star_${i}`, results);
    }
  }
  
  return createBulkSummary(results, count);
}

async function createPolygon(params: any): Promise<OperationResult> {
  const results: any[] = [];
  const count = Array.isArray(params.name) ? params.name.length : 
               Array.isArray(params.x) ? params.x.length : 
               Array.isArray(params.y) ? params.y.length : 1;
  
  for (let i = 0; i < count; i++) {
    try {
      const polygon = figma.createPolygon();
      
      polygon.name = Array.isArray(params.name) ? params.name[i] : (params.name || 'Polygon');
      
      const width = Array.isArray(params.width) ? params.width[i] : (params.width || 100);
      const height = Array.isArray(params.height) ? params.height[i] : (params.height || 100);
      
      resizeNode(polygon, width, height);
      
      const parentContainer = addNodeToParent(polygon, params.parentId);
      
      const x = Array.isArray(params.x) ? params.x[i] : params.x;
      const y = Array.isArray(params.y) ? params.y[i] : params.y;
      const positionResult = handleNodePositioning(polygon, { x, y }, { width, height }, parentContainer);
      
      // Apply polygon-specific properties  
      await applyPolygonProperties(polygon, params, i);
      
      await applyCommonNodeProperties(polygon, params, i);
      
      const response = formatNodeResponse(polygon);
      if (positionResult.warning) response.warning = positionResult.warning;
      if (positionResult.positionReason) response.positionReason = positionResult.positionReason;
      
      results.push(response);
    } catch (error) {
      handleBulkError(error, `polygon_${i}`, results);
    }
  }
  
  return createBulkSummary(results, count);
}

// UPDATE OPERATIONS

async function updateRectangle(params: any): Promise<OperationResult> {
  BaseOperation.validateParams(params, ['nodeId']);
  
  const nodeIds = normalizeToArray(params.nodeId);
  const results: any[] = [];
  
  for (let i = 0; i < nodeIds.length; i++) {
    try {
      const nodeId = nodeIds[i];
      const node = findNodeById(nodeId);
      if (!node) {
        throw new Error(`Node with ID ${nodeId} not found`);
      }
      
      if (node.type !== 'RECTANGLE') {
        throw new Error(`Node ${nodeId} is not a rectangle (type: ${node.type})`);
      }
      
      // Apply rectangle-specific properties
      applyCornerRadius(node, params, i);
      
      results.push(formatNodeResponse(node));
    } catch (error) {
      handleBulkError(error, results, i, 'update_rectangle', nodeIds[i]);
    }
  }
  
  return createBulkSummary(results, 'update_rectangle');
}

async function updateEllipse(params: any): Promise<OperationResult> {
  BaseOperation.validateParams(params, ['nodeId']);
  // Ellipse-specific update logic would go here
  return await updateNode(params);
}

async function updateFrame(params: any): Promise<OperationResult> {
  BaseOperation.validateParams(params, ['nodeId']);
  
  const nodeIds = normalizeToArray(params.nodeId);
  const results: any[] = [];
  
  for (let i = 0; i < nodeIds.length; i++) {
    try {
      const nodeId = nodeIds[i];
      const node = findNodeById(nodeId);
      if (!node) {
        throw new Error(`Node with ID ${nodeId} not found`);
      }
      
      if (node.type !== 'FRAME') {
        throw new Error(`Node ${nodeId} is not a frame (type: ${node.type})`);
      }
      
      // Apply frame-specific properties
      await applyFrameProperties(node as FrameNode, params, i);
      
      results.push(formatNodeResponse(node));
    } catch (error) {
      handleBulkError(error, results, i, 'update_frame', nodeIds[i]);
    }
  }
  
  return createBulkSummary(results, 'update_frame');
}

async function updateSection(params: any): Promise<OperationResult> {
  BaseOperation.validateParams(params, ['nodeId']);
  
  const nodeIds = normalizeToArray(params.nodeId);
  const results: any[] = [];
  
  for (let i = 0; i < nodeIds.length; i++) {
    try {
      const nodeId = nodeIds[i];
      const node = findNodeById(nodeId);
      if (!node) {
        throw new Error(`Node with ID ${nodeId} not found`);
      }
      
      if (node.type !== 'SECTION') {
        throw new Error(`Node ${nodeId} is not a section (type: ${node.type})`);
      }
      
      // Apply section-specific properties
      await applySectionProperties(node as SectionNode, params, i);
      
      results.push(formatNodeResponse(node));
    } catch (error) {
      handleBulkError(error, results, i, 'update_section', nodeIds[i]);
    }
  }
  
  return createBulkSummary(results, 'update_section');
}

async function updateSlice(params: any): Promise<OperationResult> {
  BaseOperation.validateParams(params, ['nodeId']);
  // Slice-specific update logic would go here
  return await updateNode(params);
}

async function updateStar(params: any): Promise<OperationResult> {
  BaseOperation.validateParams(params, ['nodeId']);
  
  const nodeIds = normalizeToArray(params.nodeId);
  const results: any[] = [];
  
  for (let i = 0; i < nodeIds.length; i++) {
    try {
      const nodeId = nodeIds[i];
      const node = findNodeById(nodeId);
      if (!node) {
        throw new Error(`Node with ID ${nodeId} not found`);
      }
      
      if (node.type !== 'STAR') {
        throw new Error(`Node ${nodeId} is not a star (type: ${node.type})`);
      }
      
      // Apply star-specific properties
      await applyStarProperties(node as StarNode, params, i);
      
      results.push(formatNodeResponse(node));
    } catch (error) {
      handleBulkError(error, results, i, 'update_star', nodeIds[i]);
    }
  }
  
  return createBulkSummary(results, 'update_star');
}

async function updatePolygon(params: any): Promise<OperationResult> {
  BaseOperation.validateParams(params, ['nodeId']);
  
  const nodeIds = normalizeToArray(params.nodeId);
  const results: any[] = [];
  
  for (let i = 0; i < nodeIds.length; i++) {
    try {
      const nodeId = nodeIds[i];
      const node = findNodeById(nodeId);
      if (!node) {
        throw new Error(`Node with ID ${nodeId} not found`);
      }
      
      if (node.type !== 'POLYGON') {
        throw new Error(`Node ${nodeId} is not a polygon (type: ${node.type})`);
      }
      
      // Apply polygon-specific properties
      await applyPolygonProperties(node as PolygonNode, params, i);
      
      results.push(formatNodeResponse(node));
    } catch (error) {
      handleBulkError(error, results, i, 'update_polygon', nodeIds[i]);
    }
  }
  
  return createBulkSummary(results, 'update_polygon');
}

// HELPER FUNCTIONS

async function applyCommonNodeProperties(node: any, params: any, index: number): Promise<void> {
  // Apply common node properties
  const rotation = Array.isArray(params.rotation) ? params.rotation[index] : params.rotation;
  if (rotation !== undefined) {
    node.rotation = rotation; // Figma API uses degrees directly
  }
  
  const visible = Array.isArray(params.visible) ? params.visible[index] : params.visible;
  if (visible !== undefined) {
    node.visible = visible;
  }
  
  const locked = Array.isArray(params.locked) ? params.locked[index] : params.locked;
  if (locked !== undefined) {
    node.locked = locked;
  }
  
  const opacity = Array.isArray(params.opacity) ? params.opacity[index] : params.opacity;
  if (opacity !== undefined) {
    node.opacity = opacity;
  }
  
  const fillColor = Array.isArray(params.fillColor) ? params.fillColor[index] : params.fillColor;
  if (fillColor && 'fills' in node) {
    const solidPaint = createSolidPaint(fillColor);
    node.fills = [solidPaint];
  }
  
  const fillOpacity = Array.isArray(params.fillOpacity) ? params.fillOpacity[index] : params.fillOpacity;
  if (fillOpacity !== undefined && 'fills' in node && node.fills.length > 0) {
    const fills = [...node.fills];
    fills[0] = { ...fills[0], opacity: fillOpacity };
    node.fills = fills;
  }
  
  const strokeColor = Array.isArray(params.strokeColor) ? params.strokeColor[index] : params.strokeColor;
  if (strokeColor && 'strokes' in node) {
    const strokePaint = createSolidPaint(strokeColor);
    node.strokes = [strokePaint];
  }
  
  const strokeOpacity = Array.isArray(params.strokeOpacity) ? params.strokeOpacity[index] : params.strokeOpacity;
  if (strokeOpacity !== undefined && 'strokes' in node && node.strokes.length > 0) {
    const strokes = [...node.strokes];
    strokes[0] = { ...strokes[0], opacity: strokeOpacity };
    node.strokes = strokes;
  }
  
  const strokeWeight = Array.isArray(params.strokeWeight) ? params.strokeWeight[index] : params.strokeWeight;
  if (strokeWeight !== undefined && 'strokeWeight' in node) {
    node.strokeWeight = Math.max(0, strokeWeight);
  }
  
  const strokeAlign = Array.isArray(params.strokeAlign) ? params.strokeAlign[index] : params.strokeAlign;
  if (strokeAlign !== undefined && 'strokeAlign' in node) {
    node.strokeAlign = strokeAlign;
  }
  
  const blendMode = Array.isArray(params.blendMode) ? params.blendMode[index] : params.blendMode;
  if (blendMode !== undefined && 'blendMode' in node) {
    node.blendMode = blendMode;
  }
}

async function applyFrameProperties(frame: any, params: any, index: number): Promise<void> {
  const clipsContent = Array.isArray(params.clipsContent) ? params.clipsContent[index] : params.clipsContent;
  if (clipsContent !== undefined) {
    frame.clipsContent = clipsContent;
  }
  
  // Apply corner radius properties using DRY utility
  applyCornerRadius(frame, params, index);
}

async function applySectionProperties(section: any, params: any, index: number): Promise<void> {
  const sectionContentsHidden = Array.isArray(params.sectionContentsHidden) ? params.sectionContentsHidden[index] : params.sectionContentsHidden;
  if (sectionContentsHidden !== undefined) {
    section.sectionContentsHidden = sectionContentsHidden;
  }
  
  const devStatus = Array.isArray(params.devStatus) ? params.devStatus[index] : params.devStatus;
  if (devStatus !== undefined) {
    section.devStatus = devStatus;
  }
}

async function applyStarProperties(star: any, params: any, index: number): Promise<void> {
  const pointCount = Array.isArray(params.pointCount) ? params.pointCount[index] : params.pointCount;
  if (pointCount !== undefined) {
    star.pointCount = Math.max(3, pointCount);
  }
  
  const innerRadius = Array.isArray(params.innerRadius) ? params.innerRadius[index] : params.innerRadius;
  if (innerRadius !== undefined) {
    star.innerRadius = Math.max(0, Math.min(1, innerRadius));
  }
}

async function applyPolygonProperties(polygon: any, params: any, index: number): Promise<void> {
  const pointCount = Array.isArray(params.pointCount) ? params.pointCount[index] : params.pointCount;
  if (pointCount !== undefined) {
    polygon.pointCount = Math.max(3, pointCount);
  }
}

function handleNodePositioning(
  node: SceneNode,
  position: { x?: number; y?: number },
  size: { width: number; height: number },
  parentContainer: BaseNode & ChildrenMixin
): { warning?: string; positionReason?: string } {
  let finalX: number;
  let finalY: number;
  let positionReason: string | undefined;
  let warning: string | undefined;
  
  if ((position.x !== undefined && position.x !== null) || (position.y !== undefined && position.y !== null)) {
    // Explicit position provided
    finalX = position.x || 0;
    finalY = position.y || 0;
    
    // Check for overlaps with sibling nodes in the same parent container
    const overlapInfo = checkForOverlaps(
      { x: finalX, y: finalY, width: size.width, height: size.height },
      parentContainer
    );
    
    if (overlapInfo.hasOverlap) {
      warning = createOverlapWarning(overlapInfo, { x: finalX, y: finalY });
    }
  } else {
    // No explicit position - use smart placement
    const smartPosition = findSmartPosition(size, parentContainer);
    finalX = smartPosition.x;
    finalY = smartPosition.y;
    positionReason = smartPosition.reason;
  }
  
  // Apply the final position
  moveNodeToPosition(node, finalX, finalY);
  
  return { warning, positionReason };
}