import { OperationResult } from '../types.js';
import { BaseOperation } from './base-operation.js';
import { findNodeById, formatNodeResponse, selectAndFocus, getAllNodes, getNodesByIds } from '../utils/node-utils.js';
import { formatSelection, createPageNodesResponse } from '../utils/response-utils.js';

/**
 * Handle GET_SELECTION operation
 */
export async function handleGetSelection(params: any): Promise<OperationResult> {
  return BaseOperation.executeOperation('getSelection', params, async () => {
    const selection = figma.currentPage.selection;
    const selectionData = formatSelection(selection);
    
    return {
      selection: selectionData,
      count: selection.length,
      message: `${selection.length} node(s) selected`
    };
  });
}

/**
 * Handle SET_SELECTION operation
 */
export async function handleSetSelection(params: any): Promise<OperationResult> {
  return BaseOperation.executeOperation('setSelection', params, async () => {
    BaseOperation.validateParams(params, ['nodeIds']);
    const nodeIds = BaseOperation.validateArrayParam(params.nodeIds, 'nodeIds', 1);
    
    const nodes = getNodesByIds(nodeIds);
    selectAndFocus(nodes);
    
    return {
      selectedNodes: formatSelection(nodes),
      count: nodes.length,
      message: `Selected ${nodes.length} node(s)`
    };
  });
}

/**
 * Handle CLEAR_SELECTION operation
 */
export async function handleClearSelection(params: any): Promise<OperationResult> {
  return BaseOperation.executeOperation('clearSelection', params, async () => {
    figma.currentPage.selection = [];
    
    return {
      message: 'Selection cleared',
      count: 0
    };
  });
}

/**
 * Handle GET_PAGE_NODES operation
 */
export async function handleGetPageNodes(params: any = {}): Promise<OperationResult> {
  return BaseOperation.executeOperation('getPageNodes', params, async () => {
    const {
      detail = 'standard',
      includeHidden = false,
      includePages = false,
      nodeTypes = [],
      maxDepth = null
    } = params;

    let allNodes = getAllNodes(figma.currentPage, detail, includeHidden, maxDepth);
    
    // Filter out the page node unless explicitly requested
    if (!includePages) {
      allNodes = allNodes.filter(node => node.type !== 'PAGE');
    }
    
    // Filter by node types if specified
    if (nodeTypes.length > 0) {
      allNodes = allNodes.filter(node => nodeTypes.includes(node.type));
    }
    
    const pageData = createPageNodesResponse(allNodes, detail);
    
    return pageData;
  });
}

/**
 * Handle SELECT_ALL operation
 */
export async function handleSelectAll(params: any): Promise<OperationResult> {
  return BaseOperation.executeOperation('selectAll', params, async () => {
    const allNodes = figma.currentPage.children.filter(node => node.visible);
    figma.currentPage.selection = allNodes as SceneNode[];
    
    return {
      selectedNodes: formatSelection(allNodes as SceneNode[]),
      count: allNodes.length,
      message: `Selected all ${allNodes.length} visible nodes`
    };
  });
}

/**
 * Handle SELECT_BY_TYPE operation
 */
export async function handleSelectByType(params: any): Promise<OperationResult> {
  return BaseOperation.executeOperation('selectByType', params, async () => {
    BaseOperation.validateParams(params, ['nodeType']);
    
    const nodeType = params.nodeType.toUpperCase();
    const matchingNodes = figma.currentPage.findAll(node => node.type === nodeType);
    
    figma.currentPage.selection = matchingNodes as SceneNode[];
    selectAndFocus(matchingNodes as SceneNode[]);
    
    return {
      selectedNodes: formatSelection(matchingNodes as SceneNode[]),
      count: matchingNodes.length,
      nodeType,
      message: `Selected ${matchingNodes.length} ${nodeType} nodes`
    };
  });
}

/**
 * Handle SELECT_BY_NAME operation
 */
export async function handleSelectByName(params: any): Promise<OperationResult> {
  return BaseOperation.executeOperation('selectByName', params, async () => {
    BaseOperation.validateParams(params, ['pattern']);
    
    const pattern = params.pattern;
    const regex = new RegExp(pattern, 'i');
    const matchingNodes = figma.currentPage.findAll(node => regex.test(node.name));
    
    figma.currentPage.selection = matchingNodes as SceneNode[];
    selectAndFocus(matchingNodes as SceneNode[]);
    
    return {
      selectedNodes: formatSelection(matchingNodes as SceneNode[]),
      count: matchingNodes.length,
      pattern,
      message: `Selected ${matchingNodes.length} nodes matching "${pattern}"`
    };
  });
}

/**
 * Handle GET_NODE_ANCESTORS operation
 */
export async function handleGetNodeAncestors(params: any): Promise<OperationResult> {
  return BaseOperation.executeOperation('getNodeAncestors', params, async () => {
    BaseOperation.validateParams(params, ['nodeId']);
    
    const node = findNodeById(params.nodeId);
    const ancestors: any[] = [];
    let current = node.parent;
    
    while (current && current.type !== 'PAGE') {
      ancestors.push({
        id: current.id,
        name: current.name,
        type: current.type,
        x: 'x' in current ? current.x : undefined,
        y: 'y' in current ? current.y : undefined,
        width: 'width' in current ? current.width : undefined,
        height: 'height' in current ? current.height : undefined,
        visible: current.visible,
        locked: current.locked
      });
      current = current.parent;
    }
    
    return {
      nodeId: params.nodeId,
      ancestors,
      ancestorCount: ancestors.length,
      message: `Found ${ancestors.length} ancestor(s) for node ${params.nodeId}`
    };
  });
}

/**
 * Handle GET_NODE_CHILDREN operation
 */
export async function handleGetNodeChildren(params: any): Promise<OperationResult> {
  return BaseOperation.executeOperation('getNodeChildren', params, async () => {
    BaseOperation.validateParams(params, ['nodeId']);
    
    const node = findNodeById(params.nodeId);
    
    if (!('children' in node)) {
      throw new Error(`Node ${params.nodeId} does not have children`);
    }
    
    const children = (node as any).children.map((child: BaseNode) => ({
      id: child.id,
      name: child.name,
      type: child.type,
      x: 'x' in child ? child.x : undefined,
      y: 'y' in child ? child.y : undefined,
      width: 'width' in child ? child.width : undefined,
      height: 'height' in child ? child.height : undefined,
      visible: child.visible,
      locked: child.locked
    }));
    
    return {
      nodeId: params.nodeId,
      children,
      childrenCount: children.length,
      message: `Found ${children.length} child(ren) for node ${params.nodeId}`
    };
  });
}

/**
 * Handle SELECT_SIBLINGS operation
 */
export async function handleSelectSiblings(params: any): Promise<OperationResult> {
  return BaseOperation.executeOperation('selectSiblings', params, async () => {
    BaseOperation.validateParams(params, ['nodeId']);
    
    const node = findNodeById(params.nodeId);
    const parent = node.parent;
    
    if (!parent || !('children' in parent)) {
      throw new Error(`Node ${params.nodeId} has no parent with children`);
    }
    
    const siblings = (parent as any).children.filter((child: BaseNode) => 
      child.id !== node.id && 'x' in child
    );
    
    figma.currentPage.selection = siblings as SceneNode[];
    selectAndFocus(siblings as SceneNode[]);
    
    return {
      selectedNodes: formatSelection(siblings as SceneNode[]),
      count: siblings.length,
      nodeId: params.nodeId,
      message: `Selected ${siblings.length} sibling(s) of node ${params.nodeId}`
    };
  });
}

/**
 * Handle FIND_NODES operation
 */
export async function handleFindNodes(params: any): Promise<OperationResult> {
  return BaseOperation.executeOperation('findNodes', params, async () => {
    const {
      criteria = {},
      selectResults = false,
      maxResults = 100
    } = params;
    
    let matchingNodes: BaseNode[] = [];
    
    // Find nodes based on criteria
    if (criteria.type) {
      const nodeType = criteria.type.toUpperCase();
      matchingNodes = figma.currentPage.findAll(node => node.type === nodeType);
    } else {
      matchingNodes = figma.currentPage.findAll(() => true);
    }
    
    // Apply additional filters
    if (criteria.name) {
      const nameRegex = new RegExp(criteria.name, 'i');
      matchingNodes = matchingNodes.filter(node => nameRegex.test(node.name));
    }
    
    if (criteria.visible !== undefined) {
      matchingNodes = matchingNodes.filter(node => node.visible === criteria.visible);
    }
    
    if (criteria.locked !== undefined) {
      matchingNodes = matchingNodes.filter(node => node.locked === criteria.locked);
    }
    
    // Limit results
    if (maxResults && matchingNodes.length > maxResults) {
      matchingNodes = matchingNodes.slice(0, maxResults);
    }
    
    // Select results if requested
    if (selectResults && matchingNodes.length > 0) {
      const selectableNodes = matchingNodes.filter(node => 'x' in node) as SceneNode[];
      figma.currentPage.selection = selectableNodes;
      selectAndFocus(selectableNodes);
    }
    
    const nodeData = matchingNodes.map(node => ({
      id: node.id,
      name: node.name,
      type: node.type,
      x: 'x' in node ? node.x : undefined,
      y: 'y' in node ? node.y : undefined,
      width: 'width' in node ? node.width : undefined,
      height: 'height' in node ? node.height : undefined,
      visible: node.visible,
      locked: node.locked
    }));
    
    return {
      nodes: nodeData,
      count: matchingNodes.length,
      criteria,
      selected: selectResults,
      message: `Found ${matchingNodes.length} nodes matching criteria${selectResults ? ' and selected them' : ''}`
    };
  });
}