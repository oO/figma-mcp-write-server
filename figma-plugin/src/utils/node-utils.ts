import { NodeInfo } from '../types.js';

export function findNodeById(nodeId: string): SceneNode {
  console.log('🔍 Looking for node ID:', nodeId);
  try {
    const node = figma.getNodeById(nodeId);
    if (!node) {
      throw new Error(`Node with ID ${nodeId} not found`);
    }
    console.log('✅ Found node:', node.name, node.type);
    return node as SceneNode;
  } catch (error) {
    console.log('❌ Error finding node:', error);
    throw error;
  }
}

export function formatNodeResponse(node: SceneNode): NodeInfo {
  return {
    id: node.id,
    name: node.name,
    type: node.type,
    x: 'x' in node ? node.x : 0,
    y: 'y' in node ? node.y : 0,
    width: 'width' in node ? node.width : 0,
    height: 'height' in node ? node.height : 0
  };
}

export function validateNodeType(node: SceneNode, expectedTypes: string[]): void {
  if (!expectedTypes.includes(node.type)) {
    throw new Error(`Expected node type to be one of [${expectedTypes.join(', ')}], but got ${node.type}`);
  }
}

export function getAllNodes(node: BaseNode, depth: number = 0, parentId: string | null = null): NodeInfo[] {
  const result: NodeInfo[] = [{
    id: node.id,
    name: node.name,
    type: node.type,
    x: 'x' in node ? (node as any).x : 0,
    y: 'y' in node ? (node as any).y : 0,
    width: 'width' in node ? (node as any).width : 0,
    height: 'height' in node ? (node as any).height : 0,
    depth,
    parentId
  }];

  if ('children' in node) {
    for (const child of node.children) {
      result.push.apply(result, getAllNodes(child, depth + 1, node.id));
    }
  }

  return result;
}

export function selectAndFocus(nodes: SceneNode[]): void {
  figma.currentPage.selection = nodes;
  if (nodes.length > 0) {
    figma.viewport.scrollAndZoomIntoView(nodes);
  }
}

export function getNodeParent(node: SceneNode): BaseNode & ChildrenMixin | null {
  return node.parent;
}

export function validateParentChildRelationship(parentNode: BaseNode, childNode: SceneNode): void {
  if (!('children' in parentNode)) {
    throw new Error(`Parent node ${parentNode.id} cannot contain children`);
  }
  
  // Additional validation for specific node types
  if (parentNode.type === 'TEXT') {
    throw new Error('Text nodes cannot contain children');
  }
}

export function getNodeIndex(node: SceneNode): number {
  const parent = getNodeParent(node);
  if (!parent || !('children' in parent)) {
    return -1;
  }
  
  return parent.children.indexOf(node);
}

export function clampIndex(index: number, maxLength: number): number {
  return Math.max(0, Math.min(index, maxLength));
}

export function ensureNodeExists(nodeId: string): SceneNode {
  const node = findNodeById(nodeId);
  if (!node) {
    throw new Error(`Node with ID ${nodeId} not found`);
  }
  return node;
}

export function getNodesByIds(nodeIds: string[]): SceneNode[] {
  return nodeIds.map(id => ensureNodeExists(id));
}

export function getNodePath(node: SceneNode): string[] {
  const path: string[] = [];
  let current: BaseNode | null = node;
  
  while (current) {
    path.unshift(current.name);
    current = current.parent;
  }
  
  return path;
}

export function isNodeVisible(node: SceneNode): boolean {
  return node.visible;
}

export function setNodeVisibility(node: SceneNode, visible: boolean): void {
  node.visible = visible;
}

export function getNodeBounds(node: SceneNode): { x: number; y: number; width: number; height: number } {
  if ('x' in node && 'y' in node && 'width' in node && 'height' in node) {
    return {
      x: node.x,
      y: node.y,
      width: node.width,
      height: node.height
    };
  }
  
  // Fallback for nodes without position/size
  return { x: 0, y: 0, width: 0, height: 0 };
}

export function moveNodeToPosition(node: SceneNode, x: number, y: number): void {
  if ('x' in node && 'y' in node) {
    (node as any).x = x;
    (node as any).y = y;
  } else {
    throw new Error(`Node type ${node.type} does not support positioning`);
  }
}

export function resizeNode(node: SceneNode, width: number, height: number): void {
  if ('resize' in node) {
    (node as any).resize(width, height);
  } else {
    throw new Error(`Node type ${node.type} does not support resizing`);
  }
}