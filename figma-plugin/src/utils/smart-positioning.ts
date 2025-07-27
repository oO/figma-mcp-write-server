/**
 * Smart positioning utilities for avoiding node overlaps and intelligent placement
 */

export interface NodeBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface OverlapInfo {
  hasOverlap: boolean;
  overlappingNodeIds: string[];
  overlappingNodes: Array<{
    id: string;
    name: string;
    bounds: NodeBounds;
  }>;
}

export interface SmartPositionResult {
  x: number;
  y: number;
  reason: string;
}

/**
 * Get bounds for a scene node, handling different node types
 */
export function getNodeBounds(node: SceneNode): NodeBounds {
  if ('x' in node && 'y' in node && 'width' in node && 'height' in node) {
    return {
      x: node.x,
      y: node.y,
      width: node.width,
      height: node.height
    };
  }
  
  // Fallback for nodes without explicit positioning
  return { x: 0, y: 0, width: 0, height: 0 };
}

/**
 * Get bounds for a scene node relative to its parent container's coordinate system
 * For page-level nodes, this is the same as getNodeBounds
 * For container children, coordinates are relative to the container
 */
export function getNodeBoundsRelativeToParent(node: SceneNode, container: BaseNode & ChildrenMixin): NodeBounds {
  if (!('x' in node && 'y' in node && 'width' in node && 'height' in node)) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }
  
  // If the container is the page, coordinates are already absolute
  if (container === figma.currentPage) {
    return getNodeBounds(node);
  }
  
  // For other containers, coordinates are already relative to the parent
  // since Figma stores child coordinates relative to their immediate parent
  return {
    x: node.x,
    y: node.y,
    width: node.width,
    height: node.height
  };
}

/**
 * Check if two rectangular bounds overlap with optional buffer
 */
export function boundsOverlap(bounds1: NodeBounds, bounds2: NodeBounds, buffer: number = 0): boolean {
  const b1 = {
    x: bounds1.x - buffer,
    y: bounds1.y - buffer,
    width: bounds1.width + 2 * buffer,
    height: bounds1.height + 2 * buffer
  };
  
  return !(
    b1.x + b1.width <= bounds2.x ||
    bounds2.x + bounds2.width <= b1.x ||
    b1.y + b1.height <= bounds2.y ||
    bounds2.y + bounds2.height <= b1.y
  );
}

/**
 * Check for overlaps between a proposed position and existing nodes
 */
export function checkForOverlaps(
  proposedBounds: NodeBounds,
  parent: BaseNode & ChildrenMixin,
  buffer: number = 20
): OverlapInfo {
  const overlappingNodes: Array<{ id: string; name: string; bounds: NodeBounds }> = [];
  
  if (!('children' in parent)) {
    return {
      hasOverlap: false,
      overlappingNodeIds: [],
      overlappingNodes: []
    };
  }
  
  for (const child of parent.children) {
    if ('x' in child && 'y' in child && 'width' in child && 'height' in child) {
      // Ignore slice nodes for overlap detection - they don't visually interfere with content
      if (child.type === 'SLICE') {
        continue;
      }
      
      const childBounds = getNodeBounds(child as SceneNode);
      
      if (boundsOverlap(proposedBounds, childBounds, buffer)) {
        overlappingNodes.push({
          id: child.id,
          name: child.name,
          bounds: childBounds
        });
      }
    }
  }
  
  return {
    hasOverlap: overlappingNodes.length > 0,
    overlappingNodeIds: overlappingNodes.map(n => n.id),
    overlappingNodes
  };
}

/**
 * Find the most recently created node in the current page
 */
export function findMostRecentNode(): SceneNode | null {
  const currentPage = figma.currentPage;
  if (!currentPage.children.length) {
    return null;
  }
  
  // In Figma, the most recently created node is typically the last in the children array
  // and the last in the selection if multiple nodes are selected
  const selection = figma.currentPage.selection;
  if (selection.length > 0) {
    return selection[selection.length - 1];
  }
  
  // Fallback: get the last child that's a scene node (ignore slices)
  for (let i = currentPage.children.length - 1; i >= 0; i--) {
    const child = currentPage.children[i];
    if ('x' in child && 'y' in child && child.type !== 'SLICE') {
      return child as SceneNode;
    }
  }
  
  return null;
}

/**
 * Find the most recently created node within a specific container
 */
export function findMostRecentNodeInContainer(container: BaseNode & ChildrenMixin): SceneNode | null {
  if (!('children' in container) || !container.children.length) {
    return null;
  }
  
  // Check if any selected nodes are direct children of this container
  const selection = figma.currentPage.selection;
  for (let i = selection.length - 1; i >= 0; i--) {
    const selectedNode = selection[i];
    if (selectedNode.parent === container && 'x' in selectedNode && 'y' in selectedNode) {
      return selectedNode as SceneNode;
    }
  }
  
  // Fallback: get the last child in the container that's a scene node (ignore slices)
  for (let i = container.children.length - 1; i >= 0; i--) {
    const child = container.children[i];
    if ('x' in child && 'y' in child && child.type !== 'SLICE') {
      return child as SceneNode;
    }
  }
  
  return null;
}

/**
 * Generate candidate positions around a reference node
 */
export function generatePositionCandidates(
  referenceBounds: NodeBounds,
  newNodeSize: { width: number; height: number },
  spacing: number = 20
): SmartPositionResult[] {
  const candidates: SmartPositionResult[] = [];
  
  // Right of reference node
  candidates.push({
    x: referenceBounds.x + referenceBounds.width + spacing,
    y: referenceBounds.y,
    reason: "Placed to the right of most recent node"
  });
  
  // Below reference node
  candidates.push({
    x: referenceBounds.x,
    y: referenceBounds.y + referenceBounds.height + spacing,
    reason: "Placed below most recent node"
  });
  
  // Above reference node
  candidates.push({
    x: referenceBounds.x,
    y: referenceBounds.y - newNodeSize.height - spacing,
    reason: "Placed above most recent node"
  });
  
  // Left of reference node
  candidates.push({
    x: referenceBounds.x - newNodeSize.width - spacing,
    y: referenceBounds.y,
    reason: "Placed to the left of most recent node"
  });
  
  // Diagonal positions (for when linear positions are occupied)
  candidates.push({
    x: referenceBounds.x + referenceBounds.width + spacing,
    y: referenceBounds.y + referenceBounds.height + spacing,
    reason: "Placed diagonally down-right from most recent node"
  });
  
  candidates.push({
    x: referenceBounds.x - newNodeSize.width - spacing,
    y: referenceBounds.y - newNodeSize.height - spacing,
    reason: "Placed diagonally up-left from most recent node"
  });
  
  return candidates;
}

/**
 * Find an optimal position for a new node without overlapping existing nodes
 */
export function findSmartPosition(
  newNodeSize: { width: number; height: number },
  parent: BaseNode & ChildrenMixin = figma.currentPage,
  spacing: number = 20
): SmartPositionResult {
  // Use container-specific recent node finder
  const recentNode = parent === figma.currentPage 
    ? findMostRecentNode() 
    : findMostRecentNodeInContainer(parent);
  
  if (!recentNode) {
    // No existing nodes in this container, place at origin (relative to container)
    return {
      x: 0,
      y: 0,
      reason: parent === figma.currentPage 
        ? "No existing nodes found, placed at origin"
        : `No existing nodes in container "${parent.name}", placed at container origin`
    };
  }
  
  // Get bounds relative to the container's coordinate system
  const referenceBounds = getNodeBoundsRelativeToParent(recentNode, parent);
  const candidates = generatePositionCandidates(referenceBounds, newNodeSize, spacing);
  
  // Test each candidate position for overlaps within the container
  for (const candidate of candidates) {
    const proposedBounds: NodeBounds = {
      x: candidate.x,
      y: candidate.y,
      width: newNodeSize.width,
      height: newNodeSize.height
    };
    
    const overlapInfo = checkForOverlaps(proposedBounds, parent, 0); // No buffer for finding free space
    
    if (!overlapInfo.hasOverlap) {
      return {
        ...candidate,
        reason: parent === figma.currentPage 
          ? candidate.reason 
          : candidate.reason.replace("most recent node", `most recent node in "${parent.name}"`)
      };
    }
  }
  
  // If all positions near the recent node are occupied, try a grid-based fallback
  return findGridBasedPosition(newNodeSize, parent, spacing);
}

/**
 * Fallback grid-based positioning when all positions near recent nodes are occupied
 */
function findGridBasedPosition(
  newNodeSize: { width: number; height: number },
  parent: BaseNode & ChildrenMixin,
  spacing: number = 20
): SmartPositionResult {
  const gridSize = Math.max(newNodeSize.width, newNodeSize.height) + spacing;
  
  // Try positions in a expanding grid pattern
  for (let ring = 0; ring < 10; ring++) { // Limit search to avoid infinite loops
    for (let i = 0; i <= ring * 2; i++) {
      const positions = [
        { x: ring * gridSize, y: i * gridSize },
        { x: i * gridSize, y: ring * gridSize },
        { x: -ring * gridSize, y: -i * gridSize },
        { x: -i * gridSize, y: -ring * gridSize }
      ];
      
      for (const pos of positions) {
        const proposedBounds: NodeBounds = {
          x: pos.x,
          y: pos.y,
          width: newNodeSize.width,
          height: newNodeSize.height
        };
        
        const overlapInfo = checkForOverlaps(proposedBounds, parent, 0);
        
        if (!overlapInfo.hasOverlap) {
          const containerName = parent === figma.currentPage ? "page" : `"${parent.name}"`;
          return {
            x: pos.x,
            y: pos.y,
            reason: `Grid-based positioning in ${containerName} (${ring + 1} rings from origin)`
          };
        }
      }
    }
  }
  
  // Ultimate fallback - place at a large offset
  const containerName = parent === figma.currentPage ? "page" : `"${parent.name}"`;
  return {
    x: 1000,
    y: 1000,
    reason: `Fallback position in ${containerName} - all nearby positions were occupied`
  };
}

/**
 * Create a warning message for overlapping nodes
 */
export function createOverlapWarning(overlapInfo: OverlapInfo, proposedPosition: { x: number; y: number }): string {
  if (!overlapInfo.hasOverlap) {
    return "";
  }
  
  const nodeDetails = overlapInfo.overlappingNodes
    .map(node => `"${node.name}" (${node.id})`)
    .join(", ");
    
  return `⚠️  Node positioned at (${proposedPosition.x}, ${proposedPosition.y}) overlaps with existing nodes: ${nodeDetails}. Consider adjusting position or verify if overlap is intentional.`;
}