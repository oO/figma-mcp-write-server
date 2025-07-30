import { OperationResult } from '../types.js';
import { BaseOperation } from './base-operation.js';
import { findNodeById } from '../utils/node-utils.js';

/**
 * Handle MANAGE_HIERARCHY operation
 */
export async function MANAGE_HIERARCHY(params: any): Promise<OperationResult> {
  return BaseOperation.executeOperation('manageHierarchy', params, async () => {
    BaseOperation.validateParams(params, ['operation']);
    
    const operation = BaseOperation.validateStringParam(
      params.operation,
      'operation',
      ['group', 'ungroup', 'parent', 'unparent', 'order_by_index', 'order_by_depth', 'move_to_page']
    );

    switch (operation) {
      case 'group':
        return await groupNodes(params);
      case 'ungroup':
        return await ungroupNode(params);
      case 'parent':
        return await parentNode(params);
      case 'unparent':
        return await unparentNode(params);
      case 'order_by_index':
        return await orderByIndex(params);
      case 'order_by_depth':
        return await orderByDepth(params);
      case 'move_to_page':
        return await moveToPage(params);
      default:
        throw new Error(`Unknown hierarchy operation: ${operation}`);
    }
  });
}

async function groupNodes(params: any): Promise<any> {
  if (!params.nodeIds || !Array.isArray(params.nodeIds) || params.nodeIds.length === 0) {
    throw new Error('Parameter "nodeIds" is required for group operation and must be a non-empty array');
  }

  // Find all nodes to group
  const nodes: SceneNode[] = [];
  let commonParent: BaseNode | null = null;
  
  for (const nodeId of params.nodeIds) {
    const node = findNodeById(nodeId);
    if (!node) {
      throw new Error(`Node ${nodeId} not found`);
    }
    
    if (commonParent === null) {
      commonParent = node.parent;
    } else if (node.parent !== commonParent) {
      throw new Error(`All nodes must have the same parent to be grouped. Node ${nodeId} has a different parent.`);
    }
    
    nodes.push(node);
  }

  if (nodes.length < 2) {
    throw new Error('At least 2 nodes are required to create a group');
  }

  // Create group
  const group = figma.group(nodes, commonParent as FrameNode | PageNode);
  
  // Set group name if provided
  if (params.name) {
    group.name = params.name;
  }

  return {
    operation: 'group',
    groupId: group.id,
    id: group.id,
    name: group.name,
    nodeIds: params.nodeIds,
    message: `Created group "${group.name}" with ${nodes.length} nodes`
  };
}

async function ungroupNode(params: any): Promise<any> {
  const nodeId = params.nodeId;
  if (!nodeId) {
    throw new Error('Parameter "id" is required for ungroup operation');
  }

  const node = findNodeById(nodeId);
  if (!node) {
    throw new Error(`Node ${nodeId} not found`);
  }

  if (node.type !== 'GROUP') {
    throw new Error(`Node ${nodeId} is not a group and cannot be ungrouped`);
  }

  // Check if node can be modified
  if ('locked' in node && node.locked) {
    throw new Error(`Group "${node.name}" (${nodeId}) is locked and cannot be ungrouped`);
  }

  // Check if node is inside a component instance (which restricts modifications)
  let parentCheck = node.parent;
  while (parentCheck) {
    if (parentCheck.type === 'INSTANCE') {
      throw new Error(`Group "${node.name}" (${nodeId}) is inside a component instance and cannot be ungrouped`);
    }
    parentCheck = parentCheck.parent;
  }

  const group = node as GroupNode;
  const groupName = group.name;

  // Use Figma's native ungroup method - it handles everything automatically
  let ungroupedChildren: SceneNode[];
  try {
    ungroupedChildren = figma.ungroup(group);
  } catch (error) {
    throw new Error(`Failed to ungroup "${groupName}" (${nodeId}): ${error.toString()}. The group may be locked, part of a component, or cannot be ungrouped.`);
  }

  const childIds = ungroupedChildren.map(child => child.id);

  return {
    operation: 'ungroup',
    id: nodeId,
    name: groupName,
    childIds,
    message: `Ungrouped "${groupName}" releasing ${ungroupedChildren.length} child nodes`
  };
}

async function parentNode(params: any): Promise<any> {
  const nodeId = params.nodeId;
  if (!nodeId) {
    throw new Error('Parameter "id" is required for parent operation');
  }
  if (!params.parentId) {
    throw new Error('Parameter "parentId" is required for parent operation');
  }

  const node = findNodeById(nodeId);
  if (!node) {
    throw new Error(`Node ${nodeId} not found`);
  }

  const newParent = findNodeById(params.parentId);
  if (!newParent) {
    throw new Error(`Parent node ${params.parentId} not found`);
  }

  if (!('appendChild' in newParent)) {
    throw new Error(`Node ${params.parentId} cannot contain child nodes`);
  }

  const oldParent = node.parent;
  const oldParentName = oldParent?.name || 'unknown';
  
  // Change parent
  (newParent as FrameNode | GroupNode | ComponentNode | InstanceNode | PageNode).appendChild(node);

  return {
    operation: 'parent',
    id: nodeId,
    name: node.name,
    oldParentId: oldParent?.id,
    oldParentName,
    parentId: params.parentId,
    parentName: newParent.name,
    message: `Changed parent of "${node.name}" from "${oldParentName}" to "${newParent.name}"`
  };
}

async function unparentNode(params: any): Promise<any> {
  const nodeId = params.nodeId;
  if (!nodeId) {
    throw new Error('Parameter "id" is required for unparent operation');
  }

  const node = findNodeById(nodeId);
  if (!node) {
    throw new Error(`Node ${nodeId} not found`);
  }

  const oldParent = node.parent;
  const oldParentName = oldParent?.name || 'unknown';
  
  // Move to current page (unparent)
  const currentPage = figma.currentPage;
  currentPage.appendChild(node);

  return {
    operation: 'unparent',
    id: nodeId,
    name: node.name,
    oldParentId: oldParent?.id,
    oldParentName,
    newParentId: currentPage.id,
    newParentName: currentPage.name,
    message: `Unparented "${node.name}" from "${oldParentName}" to page "${currentPage.name}"`
  };
}

async function orderByIndex(params: any): Promise<any> {
  const nodeId = params.nodeId;
  if (!nodeId) {
    throw new Error('Parameter "id" is required for order_by_index operation');
  }
  if (params.index === undefined) {
    throw new Error('Parameter "index" is required for order_by_index operation');
  }

  const node = findNodeById(nodeId);
  if (!node) {
    throw new Error(`Node ${nodeId} not found`);
  }

  const parent = node.parent;
  if (!parent || !('children' in parent)) {
    throw new Error(`Node ${nodeId} does not have a valid parent for reordering`);
  }

  const parentNode = parent as FrameNode | GroupNode | ComponentNode | InstanceNode | PageNode;
  const children = [...parentNode.children];
  const currentIndex = children.indexOf(node);
  const newIndex = Math.max(0, Math.min(params.index, children.length - 1));

  if (currentIndex === newIndex) {
    return {
      operation: 'order_by_index',
      id: nodeId,
      name: node.name,
      currentIndex,
      newIndex,
      message: `Node "${node.name}" is already at index ${newIndex}`
    };
  }

  // Reorder by removing and inserting at new position
  parentNode.insertChild(newIndex, node);

  return {
    operation: 'order_by_index',
    id: nodeId,
    name: node.name,
    currentIndex,
    newIndex,
    parentId: parent.id,
    parentName: parent.name,
    message: `Reordered "${node.name}" from index ${currentIndex} to ${newIndex} in "${parent.name}"`
  };
}

async function orderByDepth(params: any): Promise<any> {
  const nodeId = params.nodeId;
  if (!nodeId) {
    throw new Error('Parameter "id" is required for order_by_depth operation');
  }
  if (!params.position) {
    throw new Error('Parameter "position" is required for order_by_depth operation');
  }

  const node = findNodeById(nodeId);
  if (!node) {
    throw new Error(`Node ${nodeId} not found`);
  }

  const parent = node.parent;
  if (!parent || !('children' in parent)) {
    throw new Error(`Node ${nodeId} does not have a valid parent for depth ordering`);
  }

  const parentNode = parent as FrameNode | GroupNode | ComponentNode | InstanceNode | PageNode;
  const children = [...parentNode.children];
  const currentIndex = children.indexOf(node);
  let newIndex: number;

  switch (params.position.toLowerCase()) {
    case 'front':
      newIndex = children.length - 1; // Last position (topmost)
      break;
    case 'back':
      newIndex = 0; // First position (bottommost)
      break;
    case 'forward':
      newIndex = Math.min(currentIndex + 1, children.length - 1);
      break;
    case 'backward':
      newIndex = Math.max(currentIndex - 1, 0);
      break;
    default:
      throw new Error(`Invalid position "${params.position}". Must be: front, back, forward, backward`);
  }

  if (currentIndex === newIndex) {
    return {
      operation: 'order_by_depth',
      id: nodeId,
      name: node.name,
      currentIndex,
      newIndex,
      position: params.position,
      message: `Node "${node.name}" is already at ${params.position} position`
    };
  }

  // Reorder by inserting at new position
  parentNode.insertChild(newIndex, node);

  return {
    operation: 'order_by_depth',
    id: nodeId,
    name: node.name,
    currentIndex,
    newIndex,
    position: params.position,
    parentId: parent.id,
    parentName: parent.name,
    message: `Moved "${node.name}" ${params.position} from index ${currentIndex} to ${newIndex} in "${parent.name}"`
  };
}

async function moveToPage(params: any): Promise<any> {
  const nodeId = params.nodeId;
  if (!nodeId) {
    throw new Error('Parameter "id" is required for move_to_page operation');
  }
  if (!params.targetId) {
    throw new Error('Parameter "targetId" is required for move_to_page operation');
  }

  const node = findNodeById(nodeId);
  if (!node) {
    throw new Error(`Node ${nodeId} not found`);
  }

  // Find target page in document's children (pages are at document level, not in current page)
  const targetPage = Array.from(figma.root.children).find(child => child.id === params.targetId);
  if (!targetPage) {
    throw new Error(`Target page ${params.targetId} not found`);
  }

  if (targetPage.type !== 'PAGE') {
    throw new Error(`Target ${params.targetId} is not a page node`);
  }

  const oldPage = node.parent;
  const oldPageName = oldPage?.name || 'unknown';
  
  // Load target page if needed (for dynamic page access)
  if ('loadAsync' in targetPage) {
    await (targetPage as any).loadAsync();
  }

  // Move to target page
  if (params.index !== undefined) {
    (targetPage as PageNode).insertChild(params.index, node);
  } else {
    (targetPage as PageNode).appendChild(node);
  }

  // MCP operations are ID-based, not selection-based - no UI manipulation needed

  return {
    operation: 'move_to_page',
    id: nodeId,
    name: node.name,
    oldPageId: oldPage?.id,
    oldPageName,
    targetId: params.targetId,
    targetName: targetPage.name,
    index: params.index,
    message: `Moved "${node.name}" from page "${oldPageName}" to page "${targetPage.name}"${params.index !== undefined ? ` at index ${params.index}` : ''}`
  };
}