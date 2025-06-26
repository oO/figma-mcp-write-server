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
    
    // Step 1: Deduplicate node IDs
    const originalNodeIds = params.nodeIds!;
    const uniqueNodeIds = [...new Set(originalNodeIds)];
    const duplicatesRemoved = originalNodeIds.length - uniqueNodeIds.length;
    
    // Step 2: Validate minimum 2 unique nodes
    if (uniqueNodeIds.length < 2) {
      throw new Error('At least 2 unique nodes are required for grouping');
    }
    
    // Step 3: Get nodes and validate they exist
    const nodes = getNodesByIds(uniqueNodeIds);
    const groupName = params.name || 'Group';
    
    // Step 4: Validate all nodes have the same parent
    const parent = nodes[0].parent;
    if (!parent) {
      throw new Error('Cannot group nodes without a parent');
    }
    
    for (const node of nodes) {
      if (node.parent !== parent) {
        throw new Error('Nodes from different parent containers cannot be grouped');
      }
      
      // Check if node is locked
      if (node.locked) {
        throw new Error(`Node ${node.id} is locked and cannot be grouped`);
      }
    }
    
    // Step 5: Check for mixed group membership
    const nodesInGroups = nodes.filter(node => node.parent?.type === 'GROUP');
    const nodesNotInGroups = nodes.filter(node => node.parent?.type !== 'GROUP');
    
    if (nodesInGroups.length > 0 && nodesNotInGroups.length > 0) {
      throw new Error('Mixed group membership: some nodes are in groups, others are not');
    }
    
    // Step 6: Use Figma API group() method
    let group: GroupNode;
    try {
      // Set selection to nodes before grouping
      figma.currentPage.selection = nodes;
      
      if (figma.group) {
        group = figma.group(nodes, parent);
        group.name = groupName;
      } else {
        throw new Error('Figma group API not available');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Provide suggestions based on error type
      let suggestions: string[] = [];
      if (errorMessage.includes('different parent')) {
        suggestions = ['Select nodes from same container'];
      } else if (errorMessage.includes('locked')) {
        suggestions = ['Unlock objects before grouping'];
      } else if (errorMessage.includes('group membership')) {
        suggestions = ['Ungroup existing groups first', 'Select nodes from same container'];
      }
      
      throw new Error(JSON.stringify({
        error: `Failed to create group: ${errorMessage}`,
        operation: 'group',
        duplicatesRemoved,
        processedNodeIds: uniqueNodeIds,
        suggestions
      }));
    }
    
    selectAndFocus([group]);
    
    // Step 7: Return success with deduplication info
    return {
      operation: 'group',
      duplicatesRemoved,
      processedNodeIds: uniqueNodeIds,
      result: {
        id: group.id,
        name: group.name,
        type: group.type,
        children: group.children.map(child => child.id),
        parentId: parent.id
      },
      message: `Created group with ${uniqueNodeIds.length} objects${duplicatesRemoved > 0 ? ` (${duplicatesRemoved} duplicates removed)` : ''}`
    };
  }

  private async ungroupNode(params: HierarchyParams): Promise<any> {
    this.validateParams(params, ['nodeId']);
    
    const group = findNodeById(params.nodeId!);
    if (!group) {
      throw new Error(`Node with ID ${params.nodeId} not found`);
    }
    
    // Step 1: Validate target is a GROUP type node
    if (group.type !== 'GROUP') {
      throw new Error(`Target node is not a group (found type: ${group.type})`);
    }
    
    // Step 2: Check if group is locked
    if (group.locked) {
      throw new Error('Group is locked and cannot be ungrouped');
    }
    
    if (!('children' in group)) {
      throw new Error('Node has no children to ungroup');
    }
    
    const parent = group.parent;
    if (!parent) {
      throw new Error('Group has no parent');
    }
    
    // Step 3: Collect children info before ungrouping
    const children = Array.from(group.children);
    const childrenIds = children.map(child => child.id);
    
    // Step 4: Use Figma API ungroup() method
    let ungroupedNodes: SceneNode[];
    try {
      // Set selection to the group
      figma.currentPage.selection = [group];
      
      if (figma.ungroup) {
        ungroupedNodes = figma.ungroup(group);
      } else {
        throw new Error('Figma ungroup API not available');
      }
    } catch (error) {
      throw new Error(`Failed to ungroup: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    selectAndFocus(ungroupedNodes);
    
    // Step 5: Return list of ungrouped children
    return {
      operation: 'ungroup',
      result: {
        ungroupedChildren: ungroupedNodes.map(node => ({
          id: node.id,
          name: node.name,
          type: node.type
        })),
        parentId: parent.id,
        childrenCount: ungroupedNodes.length
      },
      message: `Ungrouped ${ungroupedNodes.length} objects from group`
    };
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