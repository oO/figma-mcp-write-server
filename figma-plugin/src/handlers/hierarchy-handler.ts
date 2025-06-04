import { BaseHandler } from './base-handler.js';
import { HierarchyParams, OperationResult, OperationHandler } from '../types.js';
import { findNodeById, getNodesByIds, formatNodeResponse, selectAndFocus, validateParentChildRelationship, getNodeIndex } from '../utils/node-utils.js';
import { formatHierarchyResponse } from '../utils/response-utils.js';

export class HierarchyHandler extends BaseHandler {
  protected getHandlerName(): string {
    return 'HierarchyHandler';
  }

  getOperations(): Record<string, OperationHandler> {
    return {
      MANAGE_HIERARCHY: (params) => this.manageHierarchy(params)
    };
  }

  private async manageHierarchy(params: HierarchyParams): Promise<OperationResult> {
    return this.executeOperation('manageHierarchy', params, async () => {
      this.validateParams(params, ['operation']);
      
      const operation = this.validateStringParam(
        params.operation,
        'operation',
        ['group', 'ungroup', 'move', 'reorder']
      );

      switch (operation) {
        case 'group':
          return await this.groupNodes(params);
        case 'ungroup':
          return await this.ungroupNode(params);
        case 'move':
          return await this.moveToParent(params);
        case 'reorder':
          return await this.reorderNode(params);
        default:
          throw new Error(`Unknown hierarchy operation: ${operation}`);
      }
    });
  }

  private async groupNodes(params: HierarchyParams): Promise<any> {
    this.validateParams(params, ['nodeIds']);
    const nodeIds = this.validateArrayParam(params.nodeIds!, 'nodeIds', 2);
    
    const nodes = getNodesByIds(nodeIds);
    const groupType = params.groupType || 'GROUP';
    const groupName = params.name || 'Group';
    
    // Validate all nodes have the same parent
    const parent = nodes[0].parent;
    if (!parent) {
      throw new Error('Cannot group nodes without a parent');
    }
    
    for (const node of nodes) {
      if (node.parent !== parent) {
        throw new Error('All nodes must have the same parent to be grouped');
      }
    }
    
    // Calculate bounds for the group
    const bounds = this.calculateBounds(nodes);
    
    // Create group based on type
    let group: GroupNode | FrameNode;
    if (groupType === 'FRAME') {
      group = figma.createFrame();
      group.resize(bounds.width, bounds.height);
    } else {
      // Use group() method on selected nodes instead of createGroup
      if (figma.group) {
        group = figma.group(nodes, figma.currentPage);
      } else {
        // Fallback: create a frame if group() is not available
        group = figma.createFrame();
        group.resize(bounds.width, bounds.height);
      }
    }
    
    group.name = groupName;
    group.x = bounds.x;
    group.y = bounds.y;
    
    // Add group to parent at the position of the first node
    const firstNodeIndex = parent.children.indexOf(nodes[0]);
    parent.insertChild(firstNodeIndex, group);
    
    // Move all nodes to the group and adjust their positions
    for (const node of nodes) {
      const relativeX = ('x' in node ? node.x : 0) - bounds.x;
      const relativeY = ('y' in node ? node.y : 0) - bounds.y;
      
      group.appendChild(node);
      
      if ('x' in node && 'y' in node) {
        (node as any).x = relativeX;
        (node as any).y = relativeY;
      }
    }
    
    selectAndFocus([group]);
    
    return formatHierarchyResponse('group', {
      groupId: group.id,
      groupName: group.name,
      nodeCount: nodes.length
    });
  }

  private async ungroupNode(params: HierarchyParams): Promise<any> {
    this.validateParams(params, ['nodeId']);
    
    const group = findNodeById(params.nodeId!);
    
    if (group.type !== 'GROUP' && group.type !== 'FRAME') {
      throw new Error(`Node ${params.nodeId} is not a group or frame`);
    }
    
    if (!('children' in group)) {
      throw new Error('Node has no children to ungroup');
    }
    
    const parent = group.parent;
    if (!parent) {
      throw new Error('Group has no parent');
    }
    
    const children = Array.from(group.children);
    const groupIndex = getNodeIndex(group);
    const groupX = 'x' in group ? group.x : 0;
    const groupY = 'y' in group ? group.y : 0;
    
    // Move children back to group's parent and adjust positions
    const movedNodes: SceneNode[] = [];
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      const absoluteX = ('x' in child ? child.x : 0) + groupX;
      const absoluteY = ('y' in child ? child.y : 0) + groupY;
      
      parent.insertChild(groupIndex + i, child);
      
      if ('x' in child && 'y' in child) {
        (child as any).x = absoluteX;
        (child as any).y = absoluteY;
      }
      
      movedNodes.push(child);
    }
    
    // Remove the empty group
    group.remove();
    
    // Select the ungrouped children
    selectAndFocus(movedNodes);
    
    return formatHierarchyResponse('ungroup', {
      nodeId: params.nodeId,
      childCount: children.length
    });
  }

  private async moveToParent(params: HierarchyParams): Promise<any> {
    this.validateParams(params, ['nodeId', 'newParentId']);
    
    const node = findNodeById(params.nodeId!);
    const newParent = findNodeById(params.newParentId!);
    
    validateParentChildRelationship(newParent, node);
    
    const newIndex = params.newIndex !== undefined ? params.newIndex : 0;
    
    // Store original position for adjustment if needed
    const originalX = 'x' in node ? node.x : 0;
    const originalY = 'y' in node ? node.y : 0;
    
    // Move to new parent
    if ('children' in newParent) {
      newParent.insertChild(newIndex, node);
    } else {
      throw new Error('New parent cannot contain children');
    }
    
    selectAndFocus([node]);
    
    return formatHierarchyResponse('move', {
      nodeId: params.nodeId,
      newParentId: params.newParentId
    });
  }

  private async reorderNode(params: HierarchyParams): Promise<any> {
    this.validateParams(params, ['nodeId', 'newIndex']);
    
    const node = findNodeById(params.nodeId!);
    const parent = node.parent;
    
    if (!parent || !('children' in parent)) {
      throw new Error('Node has no parent or parent cannot contain children');
    }
    
    const newIndex = this.validateNumberParam(params.newIndex!, 'newIndex', 0);
    
    // Reorder within the same parent
    parent.insertChild(newIndex, node);
    
    selectAndFocus([node]);
    
    return formatHierarchyResponse('reorder', {
      nodeId: params.nodeId,
      newIndex: newIndex
    });
  }

  private calculateBounds(nodes: SceneNode[]): { x: number; y: number; width: number; height: number } {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    
    for (const node of nodes) {
      if ('x' in node && 'y' in node && 'width' in node && 'height' in node) {
        const nodeX = (node as any).x;
        const nodeY = (node as any).y;
        const nodeWidth = (node as any).width;
        const nodeHeight = (node as any).height;
        
        minX = Math.min(minX, nodeX);
        minY = Math.min(minY, nodeY);
        maxX = Math.max(maxX, nodeX + nodeWidth);
        maxY = Math.max(maxY, nodeY + nodeHeight);
      }
    }
    
    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };
  }

  private async bringToFront(nodeId: string): Promise<any> {
    const node = findNodeById(nodeId);
    const parent = node.parent;
    
    if (!parent || !('children' in parent)) {
      throw new Error('Node has no parent or parent cannot contain children');
    }
    
    parent.insertChild(parent.children.length, node);
    selectAndFocus([node]);
    
    return {
      nodeId,
      operation: 'bringToFront',
      message: `Brought node to front`
    };
  }

  private async sendToBack(nodeId: string): Promise<any> {
    const node = findNodeById(nodeId);
    const parent = node.parent;
    
    if (!parent || !('children' in parent)) {
      throw new Error('Node has no parent or parent cannot contain children');
    }
    
    parent.insertChild(0, node);
    selectAndFocus([node]);
    
    return {
      nodeId,
      operation: 'sendToBack',
      message: `Sent node to back`
    };
  }

  private async bringForward(nodeId: string): Promise<any> {
    const node = findNodeById(nodeId);
    const parent = node.parent;
    
    if (!parent || !('children' in parent)) {
      throw new Error('Node has no parent or parent cannot contain children');
    }
    
    const currentIndex = getNodeIndex(node);
    const newIndex = Math.min(currentIndex + 1, parent.children.length - 1);
    
    parent.insertChild(newIndex, node);
    selectAndFocus([node]);
    
    return {
      nodeId,
      operation: 'bringForward',
      currentIndex,
      newIndex,
      message: `Brought node forward`
    };
  }

  private async sendBackward(nodeId: string): Promise<any> {
    const node = findNodeById(nodeId);
    const parent = node.parent;
    
    if (!parent || !('children' in parent)) {
      throw new Error('Node has no parent or parent cannot contain children');
    }
    
    const currentIndex = getNodeIndex(node);
    const newIndex = Math.max(currentIndex - 1, 0);
    
    parent.insertChild(newIndex, node);
    selectAndFocus([node]);
    
    return {
      nodeId,
      operation: 'sendBackward',
      currentIndex,
      newIndex,
      message: `Sent node backward`
    };
  }
}