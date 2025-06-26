import { BaseHandler } from './base-handler.js';
import { AlignmentParams, OperationResult, OperationHandler, NodeBounds, AlignmentResult } from '../types.js';
import { findNodeById, formatNodeResponse, selectAndFocus, validateNodeType } from '../utils/node-utils.js';

export class AlignmentHandler extends BaseHandler {
  protected getHandlerName(): string {
    return 'AlignmentHandler';
  }

  getOperations(): Record<string, OperationHandler> {
    return {
      MANAGE_ALIGNMENT: (params) => this.manageAlignment(params)
    };
  }

  private async manageAlignment(params: AlignmentParams): Promise<OperationResult> {
    return this.executeOperation('manageAlignment', params, async () => {
      this.validateParams(params, ['nodeIds']);
      
      if (!params.nodeIds || params.nodeIds.length === 0) {
        throw new Error('At least one node ID is required');
      }

      // Find all target nodes
      const nodes: SceneNode[] = [];
      let commonParent: BaseNode | null = null;
      
      for (const nodeId of params.nodeIds) {
        const node = findNodeById(nodeId);
        if (!node) {
          throw new Error(`Node ${nodeId} not found`);
        }
        if (!('x' in node) || !('y' in node) || !('width' in node) || !('height' in node)) {
          throw new Error(`Node ${nodeId} does not support positioning`);
        }
        
        // Validate all nodes share the same parent
        if (commonParent === null) {
          commonParent = node.parent;
        } else if (node.parent !== commonParent) {
          throw new Error(`All nodes must share the same parent for alignment operations. Node ${nodeId} has a different parent.`);
        }
        
        nodes.push(node);
      }

      // Determine reference bounds
      const referenceBounds = await this.calculateReferenceBounds(params, nodes);
      
      // Calculate new positions
      const results = await this.calculateAlignmentPositions(params, nodes, referenceBounds);
      
      // Apply positioning updates
      for (const result of results) {
        const node = nodes.find(n => n.id === result.nodeId) as any;
        if (node) {
          node.x = result.newPosition.x;
          node.y = result.newPosition.y;
        }
      }

      // Select the aligned nodes
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

  private async calculateReferenceBounds(params: AlignmentParams, nodes: SceneNode[]): Promise<NodeBounds> {
    const referenceMode = params.referenceMode || 'bounds';
    
    switch (referenceMode) {
      case 'key_object':
        if (!params.referenceNodeId) {
          throw new Error('Reference node ID required for key_object mode');
        }
        const keyNode = findNodeById(params.referenceNodeId);
        if (!keyNode) {
          throw new Error(`Reference node ${params.referenceNodeId} not found`);
        }
        if (!('x' in keyNode) || !('y' in keyNode) || !('width' in keyNode) || !('height' in keyNode)) {
          throw new Error('Reference node does not support positioning');
        }
        return this.getNodeBounds(keyNode as any);
        
      case 'relative':
        if (!params.referenceNodeId) {
          throw new Error('Reference node ID required for relative mode');
        }
        const relativeNode = findNodeById(params.referenceNodeId);
        if (!relativeNode) {
          throw new Error(`Reference node ${params.referenceNodeId} not found`);
        }
        if (!('x' in relativeNode) || !('y' in relativeNode) || !('width' in relativeNode) || !('height' in relativeNode)) {
          throw new Error('Reference node does not support positioning');
        }
        return this.getNodeBounds(relativeNode as any);
        
      case 'bounds':
      default:
        // For single node alignment, use parent bounds instead of node bounds
        if (nodes.length === 1) {
          return this.getParentBounds(nodes[0]);
        }
        return this.calculateBoundingBox(nodes);
    }
  }

  private getNodeBounds(node: SceneNode & { x: number; y: number; width: number; height: number }): NodeBounds {
    return {
      x: node.x,
      y: node.y,
      width: node.width,
      height: node.height,
      left: node.x,
      right: node.x + node.width,
      top: node.y,
      bottom: node.y + node.height,
      centerX: node.x + node.width / 2,
      centerY: node.y + node.height / 2
    };
  }

  private getParentBounds(node: SceneNode): NodeBounds {
    const parent = node.parent;
    
    // If no parent, use page bounds as fallback
    if (!parent) {
      return {
        x: 0,
        y: 0,
        width: 1920,
        height: 1080,
        left: 0,
        right: 1920,
        top: 0,
        bottom: 1080,
        centerX: 960,
        centerY: 540
      };
    }
    
    // Check if parent is a frame, group, or other container with bounds
    if (parent.type === 'FRAME' || parent.type === 'GROUP' || parent.type === 'COMPONENT' || parent.type === 'INSTANCE') {
      const parentNode = parent as FrameNode | GroupNode | ComponentNode | InstanceNode;
      // Return bounds in parent's coordinate system (0,0 is top-left of parent)
      return {
        x: 0,
        y: 0,
        width: parentNode.width,
        height: parentNode.height,
        left: 0,
        right: parentNode.width,
        top: 0,
        bottom: parentNode.height,
        centerX: parentNode.width / 2,
        centerY: parentNode.height / 2
      };
    }
    
    // If parent is a page, get the current viewport or use page bounds
    if (parent.type === 'PAGE') {
      // Try to get the viewport bounds if available, otherwise use a reasonable default
      const page = parent as PageNode;
      return {
        x: 0,
        y: 0,
        width: 1920,
        height: 1080,
        left: 0,
        right: 1920,
        top: 0,
        bottom: 1080,
        centerX: 960,
        centerY: 540
      };
    }
    
    // For other parent types, try to get bounds if they exist
    const parentNode = parent as any;
    if ('x' in parentNode && 'y' in parentNode && 'width' in parentNode && 'height' in parentNode) {
      return {
        x: parentNode.x,
        y: parentNode.y,
        width: parentNode.width,
        height: parentNode.height,
        left: parentNode.x,
        right: parentNode.x + parentNode.width,
        top: parentNode.y,
        bottom: parentNode.y + parentNode.height,
        centerX: parentNode.x + parentNode.width / 2,
        centerY: parentNode.y + parentNode.height / 2
      };
    }
    
    // Fallback to page bounds
    return {
      x: 0,
      y: 0,
      width: 1920,
      height: 1080,
      left: 0,
      right: 1920,
      top: 0,
      bottom: 1080,
      centerX: 960,
      centerY: 540
    };
  }

  private calculateBoundingBox(nodes: SceneNode[]): NodeBounds {
    if (nodes.length === 0) {
      throw new Error('No nodes provided for bounding box calculation');
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const node of nodes) {
      const bounds = this.getNodeBounds(node as any);
      minX = Math.min(minX, bounds.left);
      minY = Math.min(minY, bounds.top);
      maxX = Math.max(maxX, bounds.right);
      maxY = Math.max(maxY, bounds.bottom);
    }

    const width = maxX - minX;
    const height = maxY - minY;

    return {
      x: minX,
      y: minY,
      width,
      height,
      left: minX,
      right: maxX,
      top: minY,
      bottom: maxY,
      centerX: minX + width / 2,
      centerY: minY + height / 2
    };
  }

  private async calculateAlignmentPositions(
    params: AlignmentParams, 
    nodes: SceneNode[], 
    referenceBounds: NodeBounds
  ): Promise<AlignmentResult[]> {
    const results: AlignmentResult[] = [];

    for (const node of nodes) {
      const bounds = this.getNodeBounds(node as any);
      const originalPosition = { x: bounds.x, y: bounds.y };
      let newX = bounds.x;
      let newY = bounds.y;

      // Horizontal operations
      if (params.horizontalOperation) {
        newX = this.calculateHorizontalPosition(
          params.horizontalOperation,
          params.horizontalDirection,
          params.horizontalReferencePoint,
          params.horizontalAlignmentPoint,
          bounds,
          referenceBounds,
          nodes,
          params.horizontalSpacing,
          params.margin
        );
      }

      // Vertical operations
      if (params.verticalOperation) {
        newY = this.calculateVerticalPosition(
          params.verticalOperation,
          params.verticalDirection,
          params.verticalReferencePoint,
          params.verticalAlignmentPoint,
          bounds,
          referenceBounds,
          nodes,
          params.verticalSpacing,
          params.margin
        );
      }

      results.push({
        nodeId: node.id,
        name: node.name,
        operation: `${params.horizontalOperation || 'none'}/${params.verticalOperation || 'none'}`,
        newPosition: { x: newX, y: newY },
        originalPosition
      });
    }

    return results;
  }

  private calculateHorizontalPosition(
    operation: string,
    direction?: string,
    referencePoint?: string,
    alignmentPoint?: string,
    nodeBounds: NodeBounds,
    referenceBounds: NodeBounds,
    allNodes: SceneNode[],
    spacing?: number,
    margin?: number
  ): number {
    const marginValue = margin || 0;
    const spacingValue = spacing || 0;

    switch (operation) {
      case 'align':
        return this.calculateAlignHorizontal(
          direction, 
          referencePoint, 
          alignmentPoint, 
          nodeBounds, 
          referenceBounds
        );

      case 'position':
        return this.calculatePositionHorizontal(
          direction, 
          referencePoint, 
          alignmentPoint, 
          nodeBounds, 
          referenceBounds, 
          spacingValue, 
          marginValue
        );

      case 'distribute':
        return this.calculateDistributeHorizontal(direction || 'center', nodeBounds, allNodes, spacingValue);
    }

    return nodeBounds.x;
  }

  private calculateVerticalPosition(
    operation: string,
    direction?: string,
    referencePoint?: string,
    alignmentPoint?: string,
    nodeBounds: NodeBounds,
    referenceBounds: NodeBounds,
    allNodes: SceneNode[],
    spacing?: number,
    margin?: number
  ): number {
    const marginValue = margin || 0;
    const spacingValue = spacing || 0;

    switch (operation) {
      case 'align':
        return this.calculateAlignVertical(
          direction, 
          referencePoint, 
          alignmentPoint, 
          nodeBounds, 
          referenceBounds
        );

      case 'position':
        return this.calculatePositionVertical(
          direction, 
          referencePoint, 
          alignmentPoint, 
          nodeBounds, 
          referenceBounds, 
          spacingValue, 
          marginValue
        );

      case 'distribute':
        return this.calculateDistributeVertical(direction || 'middle', nodeBounds, allNodes, spacingValue);
    }

    return nodeBounds.y;
  }

  private calculateAlignHorizontal(
    direction?: string,
    referencePoint?: string,
    alignmentPoint?: string,
    nodeBounds: NodeBounds,
    referenceBounds: NodeBounds
  ): number {
    // Use reference and alignment points if provided, otherwise fall back to direction
    const refPoint = referencePoint || direction || 'center';
    const alignPoint = alignmentPoint || direction || 'center';

    // Get the reference coordinate
    let referenceX: number;
    switch (refPoint) {
      case 'left':
        referenceX = referenceBounds.left;
        break;
      case 'center':
        referenceX = referenceBounds.centerX;
        break;
      case 'right':
        referenceX = referenceBounds.right;
        break;
      default:
        referenceX = referenceBounds.centerX;
    }

    // Calculate the node position based on its alignment point
    switch (alignPoint) {
      case 'left':
        return referenceX;
      case 'center':
        return referenceX - nodeBounds.width / 2;
      case 'right':
        return referenceX - nodeBounds.width;
      default:
        return referenceX - nodeBounds.width / 2;
    }
  }

  private calculatePositionHorizontal(
    direction?: string,
    referencePoint?: string,
    alignmentPoint?: string,
    nodeBounds: NodeBounds,
    referenceBounds: NodeBounds,
    spacing: number,
    margin: number
  ): number {
    // Use reference and alignment points if provided, otherwise fall back to direction
    const refPoint = referencePoint || direction || 'center';
    const alignPoint = alignmentPoint || direction || 'center';

    // Get the reference coordinate
    let referenceX: number;
    switch (refPoint) {
      case 'left':
        referenceX = referenceBounds.left;
        break;
      case 'center':
        referenceX = referenceBounds.centerX;
        break;
      case 'right':
        referenceX = referenceBounds.right;
        break;
      default:
        referenceX = referenceBounds.centerX;
    }

    // For positioning, we need to apply spacing based on direction
    let offsetX = 0;
    if (direction === 'left') {
      offsetX = -(spacing + margin);
    } else if (direction === 'right') {
      offsetX = spacing + margin;
    }

    // Calculate the node position based on its alignment point
    switch (alignPoint) {
      case 'left':
        return referenceX + offsetX;
      case 'center':
        return referenceX - nodeBounds.width / 2 + offsetX;
      case 'right':
        return referenceX - nodeBounds.width + offsetX;
      default:
        return referenceX - nodeBounds.width / 2 + offsetX;
    }
  }

  private calculateAlignVertical(
    direction?: string,
    referencePoint?: string,
    alignmentPoint?: string,
    nodeBounds: NodeBounds,
    referenceBounds: NodeBounds
  ): number {
    // Use reference and alignment points if provided, otherwise fall back to direction
    const refPoint = referencePoint || direction || 'middle';
    const alignPoint = alignmentPoint || direction || 'middle';

    // Get the reference coordinate
    let referenceY: number;
    switch (refPoint) {
      case 'top':
        referenceY = referenceBounds.top;
        break;
      case 'middle':
        referenceY = referenceBounds.centerY;
        break;
      case 'bottom':
        referenceY = referenceBounds.bottom;
        break;
      default:
        referenceY = referenceBounds.centerY;
    }

    // Calculate the node position based on its alignment point
    switch (alignPoint) {
      case 'top':
        return referenceY;
      case 'middle':
        return referenceY - nodeBounds.height / 2;
      case 'bottom':
        return referenceY - nodeBounds.height;
      default:
        return referenceY - nodeBounds.height / 2;
    }
  }

  private calculatePositionVertical(
    direction?: string,
    referencePoint?: string,
    alignmentPoint?: string,
    nodeBounds: NodeBounds,
    referenceBounds: NodeBounds,
    spacing: number,
    margin: number
  ): number {
    // Use reference and alignment points if provided, otherwise fall back to direction
    const refPoint = referencePoint || direction || 'middle';
    const alignPoint = alignmentPoint || direction || 'middle';

    // Get the reference coordinate
    let referenceY: number;
    switch (refPoint) {
      case 'top':
        referenceY = referenceBounds.top;
        break;
      case 'middle':
        referenceY = referenceBounds.centerY;
        break;
      case 'bottom':
        referenceY = referenceBounds.bottom;
        break;
      default:
        referenceY = referenceBounds.centerY;
    }

    // For positioning, we need to apply spacing based on direction
    let offsetY = 0;
    if (direction === 'top') {
      offsetY = -(spacing + margin);
    } else if (direction === 'bottom') {
      offsetY = spacing + margin;
    }

    // Calculate the node position based on its alignment point
    switch (alignPoint) {
      case 'top':
        return referenceY + offsetY;
      case 'middle':
        return referenceY - nodeBounds.height / 2 + offsetY;
      case 'bottom':
        return referenceY - nodeBounds.height + offsetY;
      default:
        return referenceY - nodeBounds.height / 2 + offsetY;
    }
  }

  private calculateDistributeHorizontal(
    direction: string,
    nodeBounds: NodeBounds,
    allNodes: SceneNode[],
    spacing: number
  ): number {
    // Sort nodes by horizontal position
    const sortedNodes = allNodes
      .map(node => this.getNodeBounds(node as any))
      .sort((a, b) => a.centerX - b.centerX);

    const nodeIndex = sortedNodes.findIndex(bounds => 
      bounds.centerX === nodeBounds.centerX && bounds.centerY === nodeBounds.centerY
    );

    if (nodeIndex === -1 || sortedNodes.length < 2) {
      return nodeBounds.x;
    }

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

  private calculateDistributeVertical(
    direction: string,
    nodeBounds: NodeBounds,
    allNodes: SceneNode[],
    spacing: number
  ): number {
    // Sort nodes by vertical position
    const sortedNodes = allNodes
      .map(node => this.getNodeBounds(node as any))
      .sort((a, b) => a.centerY - b.centerY);

    const nodeIndex = sortedNodes.findIndex(bounds => 
      bounds.centerX === nodeBounds.centerX && bounds.centerY === nodeBounds.centerY
    );

    if (nodeIndex === -1 || sortedNodes.length < 2) {
      return nodeBounds.y;
    }

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
}