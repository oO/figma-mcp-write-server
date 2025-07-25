
import { AlignmentParams, OperationResult, NodeBounds, AlignmentResult } from '../types.js';
import { findNodeById, selectAndFocus } from '../utils/node-utils.js';
import { BaseOperation } from './base-operation.js';

// Top-level operation handler
export async function MANAGE_ALIGNMENT(payload: AlignmentParams): Promise<OperationResult> {
  return BaseOperation.executeOperation('manageAlignment', payload, async () => {
    BaseOperation.validateParams(payload, ['nodeIds']);
    
    if (!payload.nodeIds || payload.nodeIds.length === 0) {
      throw new Error('At least one node ID is required');
    }

    // Find all target nodes and validate them
    const { nodes } = validateAndGetNodes(payload.nodeIds);

    // Determine reference bounds for alignment
    const referenceBounds = await calculateReferenceBounds(payload, nodes);
    
    // Calculate new positions for each node
    const results = await calculateAlignmentPositions(payload, nodes, referenceBounds);
    
    // Apply the new positions to the nodes
    for (const result of results) {
      const node = nodes.find(n => n.id === result.nodeId) as any;
      if (node) {
        node.x = result.newPosition.x;
        node.y = result.newPosition.y;
      }
    }

    // Select the aligned nodes in the Figma UI
    selectAndFocus(nodes);

    return {
      operation: 'manage_alignment',
      results,
      totalNodes: nodes.length,
      referenceBounds,
      message: `Aligned ${nodes.length} node${nodes.length === 1 ? '' : 's'}`
    };
  });
}

// Helper functions migrated from legacy AlignmentHandler class

function validateAndGetNodes(nodeIds: string[]): { nodes: SceneNode[], commonParent: BaseNode | null } {
  const nodes: SceneNode[] = [];
  let commonParent: BaseNode | null = null;
  
  for (const nodeId of nodeIds) {
    const node = findNodeById(nodeId);
    if (!node) {
      throw new Error(`Node ${nodeId} not found`);
    }
    if (!('x' in node) || !('y' in node) || !('width' in node) || !('height' in node)) {
      throw new Error(`Node ${nodeId} does not support positioning`);
    }
    
    if (commonParent === null) {
      commonParent = node.parent;
    } else if (node.parent !== commonParent) {
      throw new Error(`All nodes must share the same parent for alignment operations. Node ${nodeId} has a different parent.`);
    }
    
    nodes.push(node);
  }
  
  return { nodes, commonParent };
}

async function calculateReferenceBounds(params: AlignmentParams, nodes: SceneNode[]): Promise<NodeBounds> {
  const referenceMode = params.referenceMode || 'bounds';
  
  switch (referenceMode) {
    case 'key_object':
      if (!params.referenceNodeId) throw new Error('Reference node ID required for key_object mode');
      const keyNode = findNodeById(params.referenceNodeId);
      if (!keyNode || !('x' in keyNode)) throw new Error('Reference node not found or does not support positioning');
      return getNodeBounds(keyNode as any);
      
    case 'relative':
      if (!params.referenceNodeId) throw new Error('Reference node ID required for relative mode');
      const relativeNode = findNodeById(params.referenceNodeId);
      if (!relativeNode || !('x' in relativeNode)) throw new Error('Reference node not found or does not support positioning');
      return getNodeBounds(relativeNode as any);
      
    case 'bounds':
    default:
      if (nodes.length === 1) return getParentBounds(nodes[0]);
      return calculateBoundingBox(nodes);
  }
}

function getNodeBounds(node: SceneNode & { x: number; y: number; width: number; height: number }): NodeBounds {
  return {
    x: node.x, y: node.y, width: node.width, height: node.height,
    left: node.x, right: node.x + node.width,
    top: node.y, bottom: node.y + node.height,
    centerX: node.x + node.width / 2, centerY: node.y + node.height / 2
  };
}

function getParentBounds(node: SceneNode): NodeBounds {
  const parent = node.parent;
  if (!parent) return { x: 0, y: 0, width: 1920, height: 1080, left: 0, right: 1920, top: 0, bottom: 1080, centerX: 960, centerY: 540 };

  if (parent.type === 'FRAME' || parent.type === 'GROUP' || parent.type === 'COMPONENT' || parent.type === 'INSTANCE') {
    const p = parent as FrameNode | GroupNode | ComponentNode | InstanceNode;
    return { x: 0, y: 0, width: p.width, height: p.height, left: 0, right: p.width, top: 0, bottom: p.height, centerX: p.width / 2, centerY: p.height / 2 };
  }
  
  if ('width' in parent) {
    const p = parent as any;
    return { x: p.x, y: p.y, width: p.width, height: p.height, left: p.x, right: p.x + p.width, top: p.y, bottom: p.y + p.height, centerX: p.x + p.width / 2, centerY: p.y + p.height / 2 };
  }

  return { x: 0, y: 0, width: 1920, height: 1080, left: 0, right: 1920, top: 0, bottom: 1080, centerX: 960, centerY: 540 };
}

function calculateBoundingBox(nodes: SceneNode[]): NodeBounds {
  if (nodes.length === 0) throw new Error('No nodes provided for bounding box calculation');

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  for (const node of nodes) {
    const bounds = getNodeBounds(node as any);
    minX = Math.min(minX, bounds.left);
    minY = Math.min(minY, bounds.top);
    maxX = Math.max(maxX, bounds.right);
    maxY = Math.max(maxY, bounds.bottom);
  }

  const width = maxX - minX;
  const height = maxY - minY;

  return { x: minX, y: minY, width, height, left: minX, right: maxX, top: minY, bottom: maxY, centerX: minX + width / 2, centerY: minY + height / 2 };
}

async function calculateAlignmentPositions(params: AlignmentParams, nodes: SceneNode[], referenceBounds: NodeBounds): Promise<AlignmentResult[]> {
  // Handle spread operation which requires different logic
  if (params.spreadDirection) {
    return calculateSpreadPositions(params, nodes);
  }
  
  const results: AlignmentResult[] = [];
  for (const node of nodes) {
    const bounds = getNodeBounds(node as any);
    let newX = bounds.x, newY = bounds.y;

    if (params.horizontalOperation) {
      newX = calculateHorizontalPosition(params, bounds, referenceBounds, nodes);
    }
    if (params.verticalOperation) {
      newY = calculateVerticalPosition(params, bounds, referenceBounds, nodes);
    }

    results.push({
      nodeId: node.id, name: node.name,
      operation: `${params.horizontalOperation || 'none'}/${params.verticalOperation || 'none'}`,
      newPosition: { x: newX, y: newY },
      originalPosition: { x: bounds.x, y: bounds.y }
    });
  }
  return results;
}

function calculateHorizontalPosition(params: AlignmentParams, nodeBounds: NodeBounds, referenceBounds: NodeBounds, allNodes: SceneNode[]): number {
  const { horizontalOperation, horizontalDirection, horizontalReferencePoint, horizontalAlignmentPoint, horizontalSpacing, margin } = params;
  const spacing = horizontalSpacing || 0;
  const marginValue = margin || 0;

  switch (horizontalOperation) {
    case 'align':
      return calculateAlignHorizontal(horizontalDirection, horizontalReferencePoint, horizontalAlignmentPoint, nodeBounds, referenceBounds);
    case 'position':
      return calculatePositionHorizontal(horizontalDirection, horizontalReferencePoint, horizontalAlignmentPoint, nodeBounds, referenceBounds, spacing, marginValue);
    case 'distribute':
      return calculateDistributeHorizontal(horizontalDirection || 'center', nodeBounds, allNodes, spacing);
    case 'spread':
      // Spread is handled at a higher level in calculateSpreadPositions
      return nodeBounds.x;
    default:
      return nodeBounds.x;
  }
}

function calculateVerticalPosition(params: AlignmentParams, nodeBounds: NodeBounds, referenceBounds: NodeBounds, allNodes: SceneNode[]): number {
  const { verticalOperation, verticalDirection, verticalReferencePoint, verticalAlignmentPoint, verticalSpacing, margin } = params;
  const spacing = verticalSpacing || 0;
  const marginValue = margin || 0;

  switch (verticalOperation) {
    case 'align':
      return calculateAlignVertical(verticalDirection, verticalReferencePoint, verticalAlignmentPoint, nodeBounds, referenceBounds);
    case 'position':
      return calculatePositionVertical(verticalDirection, verticalReferencePoint, verticalAlignmentPoint, nodeBounds, referenceBounds, spacing, marginValue);
    case 'distribute':
      return calculateDistributeVertical(verticalDirection || 'middle', nodeBounds, allNodes, spacing);
    case 'spread':
      // Spread is handled at a higher level in calculateSpreadPositions
      return nodeBounds.y;
    default:
      return nodeBounds.y;
  }
}

function calculateAlignHorizontal(direction: string | undefined, referencePoint: string | undefined, alignmentPoint: string | undefined, nodeBounds: NodeBounds, referenceBounds: NodeBounds): number {
  const refPoint = referencePoint || direction || 'center';
  const alignPoint = alignmentPoint || direction || 'center';
  let referenceX: number;

  switch (refPoint) {
    case 'left': referenceX = referenceBounds.left; break;
    case 'center': referenceX = referenceBounds.centerX; break;
    case 'right': referenceX = referenceBounds.right; break;
    default: referenceX = referenceBounds.centerX;
  }

  switch (alignPoint) {
    case 'left': return referenceX;
    case 'center': return referenceX - nodeBounds.width / 2;
    case 'right': return referenceX - nodeBounds.width;
    default: return referenceX - nodeBounds.width / 2;
  }
}

function calculatePositionHorizontal(direction: string | undefined, referencePoint: string | undefined, alignmentPoint: string | undefined, nodeBounds: NodeBounds, referenceBounds: NodeBounds, spacing: number, margin: number): number {
  const refPoint = referencePoint || direction || 'center';
  const alignPoint = alignmentPoint || direction || 'center';
  let referenceX: number;

  switch (refPoint) {
    case 'left': referenceX = referenceBounds.left; break;
    case 'center': referenceX = referenceBounds.centerX; break;
    case 'right': referenceX = referenceBounds.right; break;
    default: referenceX = referenceBounds.centerX;
  }

  let offsetX = 0;
  if (direction === 'left') offsetX = -(spacing + margin);
  else if (direction === 'right') offsetX = spacing + margin;

  switch (alignPoint) {
    case 'left': return referenceX + offsetX;
    case 'center': return referenceX - nodeBounds.width / 2 + offsetX;
    case 'right': return referenceX - nodeBounds.width + offsetX;
    default: return referenceX - nodeBounds.width / 2 + offsetX;
  }
}

function calculateAlignVertical(direction: string | undefined, referencePoint: string | undefined, alignmentPoint: string | undefined, nodeBounds: NodeBounds, referenceBounds: NodeBounds): number {
  const refPoint = referencePoint || direction || 'middle';
  const alignPoint = alignmentPoint || direction || 'middle';
  let referenceY: number;

  switch (refPoint) {
    case 'top': referenceY = referenceBounds.top; break;
    case 'middle': referenceY = referenceBounds.centerY; break;
    case 'bottom': referenceY = referenceBounds.bottom; break;
    default: referenceY = referenceBounds.centerY;
  }

  switch (alignPoint) {
    case 'top': return referenceY;
    case 'middle': return referenceY - nodeBounds.height / 2;
    case 'bottom': return referenceY - nodeBounds.height;
    default: return referenceY - nodeBounds.height / 2;
  }
}

function calculatePositionVertical(direction: string | undefined, referencePoint: string | undefined, alignmentPoint: string | undefined, nodeBounds: NodeBounds, referenceBounds: NodeBounds, spacing: number, margin: number): number {
  const refPoint = referencePoint || direction || 'middle';
  const alignPoint = alignmentPoint || direction || 'middle';
  let referenceY: number;

  switch (refPoint) {
    case 'top': referenceY = referenceBounds.top; break;
    case 'middle': referenceY = referenceBounds.centerY; break;
    case 'bottom': referenceY = referenceBounds.bottom; break;
    default: referenceY = referenceBounds.centerY;
  }

  let offsetY = 0;
  if (direction === 'top') offsetY = -(spacing + margin);
  else if (direction === 'bottom') offsetY = spacing + margin;

  switch (alignPoint) {
    case 'top': return referenceY + offsetY;
    case 'middle': return referenceY - nodeBounds.height / 2 + offsetY;
    case 'bottom': return referenceY - nodeBounds.height + offsetY;
    default: return referenceY - nodeBounds.height / 2 + offsetY;
  }
}

function calculateDistributeHorizontal(direction: string, nodeBounds: NodeBounds, allNodes: SceneNode[], spacing: number): number {
  const sortedNodes = allNodes.map(node => getNodeBounds(node as any)).sort((a, b) => a.centerX - b.centerX);
  const nodeIndex = sortedNodes.findIndex(bounds => bounds.centerX === nodeBounds.centerX && bounds.centerY === nodeBounds.centerY);

  if (nodeIndex === -1 || sortedNodes.length < 2) return nodeBounds.x;

  const totalWidth = sortedNodes[sortedNodes.length - 1].right - sortedNodes[0].left;
  const totalNodeWidths = sortedNodes.reduce((sum, bounds) => sum + bounds.width, 0);
  const availableSpace = totalWidth - totalNodeWidths;
  const gaps = sortedNodes.length - 1;
  const gapSize = gaps > 0 ? Math.max(spacing, availableSpace / gaps) : 0;

  let currentX = sortedNodes[0].left;
  for (let i = 0; i < nodeIndex; i++) {
    currentX += sortedNodes[i].width + gapSize;
  }
  return currentX;
}

function calculateDistributeVertical(direction: string, nodeBounds: NodeBounds, allNodes: SceneNode[], spacing: number): number {
  const sortedNodes = allNodes.map(node => getNodeBounds(node as any)).sort((a, b) => a.centerY - b.centerY);
  const nodeIndex = sortedNodes.findIndex(bounds => bounds.centerX === nodeBounds.centerX && bounds.centerY === nodeBounds.centerY);

  if (nodeIndex === -1 || sortedNodes.length < 2) return nodeBounds.y;

  const totalHeight = sortedNodes[sortedNodes.length - 1].bottom - sortedNodes[0].top;
  const totalNodeHeights = sortedNodes.reduce((sum, bounds) => sum + bounds.height, 0);
  const availableSpace = totalHeight - totalNodeHeights;
  const gaps = sortedNodes.length - 1;
  const gapSize = gaps > 0 ? Math.max(spacing, availableSpace / gaps) : 0;

  let currentY = sortedNodes[0].top;
  for (let i = 0; i < nodeIndex; i++) {
    currentY += sortedNodes[i].height + gapSize;
  }
  return currentY;
}

/**
 * Calculate spread positions for nodes with exact pixel spacing between bounding boxes
 * This handles overlapping nodes and provides precise edge-to-edge spacing control
 * Order is implied by the nodeIds array, and all positions are relative to the 1st node
 */
function calculateSpreadPositions(params: AlignmentParams, nodes: SceneNode[]): AlignmentResult[] {
  const { spreadDirection = 'horizontal', spacing = 20 } = params;
  
  if (nodes.length < 2) {
    // Single node - no spread needed
    return nodes.map(node => ({
      nodeId: node.id,
      name: node.name,
      operation: `spread_${spreadDirection}`,
      newPosition: { x: (node as any).x, y: (node as any).y },
      originalPosition: { x: (node as any).x, y: (node as any).y }
    }));
  }
  
  // Get bounds for all nodes in the order they appear in nodeIds
  // Do NOT sort - order is implied by the nodeIds array
  const nodeBounds = nodes.map(node => ({
    node,
    bounds: getNodeBounds(node as any)
  }));
  
  // Calculate new positions with exact spacing
  // First node is the reference, all others are positioned relative to it
  const results: AlignmentResult[] = [];
  let currentPosition = 0;
  
  for (let i = 0; i < nodeBounds.length; i++) {
    const { node, bounds } = nodeBounds[i];
    
    if (i === 0) {
      // First node keeps its position as reference
      if (spreadDirection === 'horizontal') {
        currentPosition = bounds.left;
        results.push({
          nodeId: node.id,
          name: node.name,
          operation: `spread_${spreadDirection}`,
          newPosition: { x: bounds.x, y: bounds.y },
          originalPosition: { x: bounds.x, y: bounds.y }
        });
        // Update position for next node
        currentPosition = bounds.right + spacing;
      } else {
        currentPosition = bounds.top;
        results.push({
          nodeId: node.id,
          name: node.name,
          operation: `spread_${spreadDirection}`,
          newPosition: { x: bounds.x, y: bounds.y },
          originalPosition: { x: bounds.x, y: bounds.y }
        });
        // Update position for next node
        currentPosition = bounds.bottom + spacing;
      }
    } else {
      // Subsequent nodes are positioned with exact spacing relative to first node
      if (spreadDirection === 'horizontal') {
        const newX = currentPosition;
        const newY = bounds.y; // Keep Y position unchanged
        results.push({
          nodeId: node.id,
          name: node.name,
          operation: `spread_${spreadDirection}`,
          newPosition: { x: newX, y: newY },
          originalPosition: { x: bounds.x, y: bounds.y }
        });
        // Update position for next node
        currentPosition = newX + bounds.width + spacing;
      } else {
        const newX = bounds.x; // Keep X position unchanged
        const newY = currentPosition;
        results.push({
          nodeId: node.id,
          name: node.name,
          operation: `spread_${spreadDirection}`,
          newPosition: { x: newX, y: newY },
          originalPosition: { x: bounds.x, y: bounds.y }
        });
        // Update position for next node
        currentPosition = newY + bounds.height + spacing;
      }
    }
  }
  
  return results;
}
