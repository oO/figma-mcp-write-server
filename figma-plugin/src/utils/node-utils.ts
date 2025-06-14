import { NodeInfo, SimpleNodeInfo, DetailedNodeInfo } from '../types.js';

export function findNodeById(nodeId: string): SceneNode | null {
  try {
    const node = figma.getNodeById(nodeId);
    if (!node) {
      return null;
    }
    
    // Check if this is a scene node (can be rendered/exported)
    const exportableTypes = [
      'FRAME', 'GROUP', 'COMPONENT', 'INSTANCE', 'RECTANGLE', 'ELLIPSE', 
      'POLYGON', 'STAR', 'VECTOR', 'TEXT', 'LINE', 'BOOLEAN_OPERATION'
    ];
    
    if (!exportableTypes.includes(node.type)) {
      return null;
    }
    
    return node as SceneNode;
  } catch (error) {
    // figma.getNodeById can throw if nodeId is invalid format
    return null;
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

export function getAllNodes(
  node: BaseNode, 
  detail: string = 'standard', 
  includeHidden: boolean = false,
  maxDepth: number | null = null,
  depth: number = 0, 
  parentId: string | null = null
): any[] {
  // Stop if max depth reached
  if (maxDepth !== null && depth > maxDepth) {
    return [];
  }

  // Skip hidden nodes unless explicitly requested
  if (!includeHidden && 'visible' in node && !(node as any).visible) {
    return [];
  }

  const nodeData = createNodeData(node, detail, depth, parentId);
  const result = [nodeData];

  if ('children' in node) {
    for (const child of node.children) {
      result.push(...getAllNodes(child, detail, includeHidden, maxDepth, depth + 1, node.id));
    }
  }

  return result;
}

function createNodeData(node: BaseNode, detail: string, depth: number, parentId: string | null): any {
  const baseData = {
    id: node.id,
    name: node.name,
    type: node.type
  };

  if (detail === 'simple') {
    return baseData;
  }

  const standardData = {
    ...baseData,
    x: 'x' in node ? (node as any).x : 0,
    y: 'y' in node ? (node as any).y : 0,
    width: 'width' in node ? (node as any).width : 0,
    height: 'height' in node ? (node as any).height : 0,
    depth,
    parentId: parentId || undefined,
    visible: 'visible' in node ? (node as any).visible : true,
    locked: 'locked' in node ? (node as any).locked : false
  };

  if (detail === 'standard') {
    return standardData;
  }

  // Detailed mode - include all available properties
  const detailedData = { ...standardData };

  // CRITICAL FIX: Add boundVariables property for variable binding visibility
  if ('boundVariables' in node) {
    detailedData.boundVariables = (node as any).boundVariables;
  }

  // Add optional properties if they exist
  if ('opacity' in node) detailedData.opacity = (node as any).opacity;
  if ('rotation' in node) detailedData.rotation = (node as any).rotation;
  if ('cornerRadius' in node) detailedData.cornerRadius = (node as any).cornerRadius;
  if ('fills' in node) detailedData.fills = (node as any).fills;
  if ('strokes' in node) detailedData.strokes = (node as any).strokes;
  if ('effects' in node) detailedData.effects = (node as any).effects;
  if ('constraints' in node) detailedData.constraints = (node as any).constraints;
  if ('absoluteTransform' in node) detailedData.absoluteTransform = (node as any).absoluteTransform;
  if ('relativeTransform' in node) detailedData.relativeTransform = (node as any).relativeTransform;

  // Layout properties for frames
  if ('layoutMode' in node) detailedData.layoutMode = (node as any).layoutMode;
  if ('itemSpacing' in node) detailedData.itemSpacing = (node as any).itemSpacing;
  if ('paddingLeft' in node) detailedData.paddingLeft = (node as any).paddingLeft;
  if ('paddingRight' in node) detailedData.paddingRight = (node as any).paddingRight;
  if ('paddingTop' in node) detailedData.paddingTop = (node as any).paddingTop;
  if ('paddingBottom' in node) detailedData.paddingBottom = (node as any).paddingBottom;
  if ('clipsContent' in node) detailedData.clipsContent = (node as any).clipsContent;

  // Text properties
  if ('characters' in node) detailedData.characters = (node as any).characters;
  if ('fontSize' in node) detailedData.fontSize = (node as any).fontSize;
  if ('fontName' in node) detailedData.fontName = (node as any).fontName;
  if ('textAlignHorizontal' in node) detailedData.textAlignHorizontal = (node as any).textAlignHorizontal;
  if ('textAlignVertical' in node) detailedData.textAlignVertical = (node as any).textAlignVertical;

  return detailedData;
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
    throw new Error(`Node with ID ${nodeId} not found or is not exportable`);
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
  
  return { x: 0, y: 0, width: 0, height: 0 };
}

export function moveNodeToPosition(node: SceneNode, x: number, y: number): void {
  if ('x' in node && 'y' in node) {
    (node as any).x = x;
    (node as any).y = y;
  } else {
    throw new Error(`Node type ${(node as any).type} does not support positioning`);
  }
}

export function resizeNode(node: SceneNode, width: number, height: number): void {
  if ('resize' in node) {
    (node as any).resize(width, height);
  } else {
    throw new Error(`Node type ${node.type} does not support resizing`);
  }
}