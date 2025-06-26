import { ManageAutoLayoutSchema, ManageConstraintsSchema, ManageAlignmentSchema, ToolHandler, ToolResult, Tool } from '../types/index.js';
import * as yaml from 'js-yaml';

export class LayoutHandlers implements ToolHandler {
  private sendToPlugin: (request: any) => Promise<any>;

  constructor(sendToPluginFn: (request: any) => Promise<any>) {
    this.sendToPlugin = sendToPluginFn;
  }

  getTools(): Tool[] {
    return [
      {
        name: 'figma_auto_layout',
        description: 'Enable, disable, update, or get auto layout properties for frames',
        inputSchema: {
          type: 'object',
          properties: {
            operation: { type: 'string', enum: ['enable', 'disable', 'update', 'get_properties'], description: 'Auto layout operation' },
            nodeId: { type: 'string', description: 'Frame node ID' },
            direction: { type: 'string', enum: ['horizontal', 'vertical'], description: 'Layout direction' },
            spacing: { type: 'number', description: 'Spacing between children' },
            paddingTop: { type: 'number', description: 'Top padding around content' },
            paddingRight: { type: 'number', description: 'Right padding around content' },
            paddingBottom: { type: 'number', description: 'Bottom padding around content' },
            paddingLeft: { type: 'number', description: 'Left padding around content' },
            primaryAlignment: { type: 'string', enum: ['min', 'center', 'max', 'space_between'], description: 'Primary axis alignment' },
            counterAlignment: { type: 'string', enum: ['min', 'center', 'max'], description: 'Counter axis alignment' },
            resizingWidth: { type: 'string', enum: ['hug', 'fill', 'fixed'], description: 'Width resizing behavior (hug content, fill container, or fixed size)' },
            resizingHeight: { type: 'string', enum: ['hug', 'fill', 'fixed'], description: 'Height resizing behavior (hug content, fill container, or fixed size)' },
            strokesIncludedInLayout: { type: 'boolean', description: 'Whether strokes are included in layout calculations' },
            layoutWrap: { type: 'string', enum: ['no_wrap', 'wrap'], description: 'Layout wrap behavior' }
          },
          required: ['operation', 'nodeId']
        }
      },
      {
        name: 'figma_constraints',
        description: 'Set, get, or reset layout constraints for nodes',
        inputSchema: {
          type: 'object',
          properties: {
            operation: { type: 'string', enum: ['set', 'get', 'reset', 'get_info'], description: 'Constraint operation' },
            nodeId: { type: 'string', description: 'Node ID' },
            horizontal: { type: 'string', enum: ['left', 'right', 'left_right', 'center', 'scale'], description: 'Horizontal constraint' },
            vertical: { type: 'string', enum: ['top', 'bottom', 'top_bottom', 'center', 'scale'], description: 'Vertical constraint' }
          },
          required: ['operation', 'nodeId']
        }
      },
      {
        name: 'figma_hierarchy',
        description: 'Group, ungroup, move, or reorder nodes in the hierarchy',
        inputSchema: {
          type: 'object',
          properties: {
            operation: { type: 'string', enum: ['group', 'ungroup', 'move', 'reorder'], description: 'Hierarchy operation' },
            nodeId: { type: 'string', description: 'Node ID (for ungroup, move, reorder)' },
            nodeIds: { type: 'array', items: { type: 'string' }, description: 'Array of node IDs (for group)' },
            newParentId: { type: 'string', description: 'New parent node ID (for move)' },
            newIndex: { type: 'number', description: 'New index position (for reorder)' },
            name: { type: 'string', description: 'Group name (for group operation)' }
          },
          required: ['operation']
        }
      },
      {
        name: 'figma_alignment',
        description: 'Align, position, or distribute nodes with professional precision',
        inputSchema: {
          type: 'object',
          properties: {
            horizontalOperation: { type: 'string', enum: ['position', 'align', 'distribute'], description: 'Horizontal operation type' },
            horizontalDirection: { type: 'string', enum: ['left', 'center', 'right'], description: 'Horizontal alignment direction' },
            horizontalReferencePoint: { type: 'string', enum: ['left', 'center', 'right'], description: 'Which part of reference to align to' },
            horizontalAlignmentPoint: { type: 'string', enum: ['left', 'center', 'right'], description: 'Which part of moving node to use for alignment' },
            horizontalSpacing: { type: 'number', description: 'Horizontal spacing for position/distribute operations' },
            verticalOperation: { type: 'string', enum: ['position', 'align', 'distribute'], description: 'Vertical operation type' },
            verticalDirection: { type: 'string', enum: ['top', 'middle', 'bottom'], description: 'Vertical alignment direction' },
            verticalReferencePoint: { type: 'string', enum: ['top', 'middle', 'bottom'], description: 'Which part of reference to align to' },
            verticalAlignmentPoint: { type: 'string', enum: ['top', 'middle', 'bottom'], description: 'Which part of moving node to use for alignment' },
            verticalSpacing: { type: 'number', description: 'Vertical spacing for position/distribute operations' },
            nodeIds: { type: 'array', items: { type: 'string' }, description: 'Array of node IDs to align' },
            referenceMode: { type: 'string', enum: ['bounds', 'key_object', 'relative'], description: 'Reference calculation mode' },
            referenceNodeId: { type: 'string', description: 'Reference node ID for key_object or relative modes' },
            margin: { type: 'number', description: 'Additional margin for positioning operations' }
          },
          required: ['nodeIds']
        }
      }
    ];
  }

  async handle(toolName: string, args: any): Promise<any> {
    switch (toolName) {
      case 'figma_auto_layout':
        return this.manageAutoLayout(args);
      case 'figma_constraints':
        return this.manageConstraints(args);
      case 'figma_hierarchy':
        return this.manageHierarchy(args);
      case 'figma_alignment':
        return this.manageAlignment(args);
      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  }

  async manageAutoLayout(args: any): Promise<any> {
    const validatedArgs = ManageAutoLayoutSchema.parse(args);
    const { operation, nodeId, direction, spacing, paddingTop, paddingRight, paddingBottom, paddingLeft, primaryAlignment, counterAlignment, resizingWidth, resizingHeight, strokesIncludedInLayout, layoutWrap } = validatedArgs;

    const payload = {
      operation,
      nodeId,
      direction,
      spacing,
      paddingTop,
      paddingRight,
      paddingBottom,
      paddingLeft,
      primaryAlignment,
      counterAlignment,
      resizingWidth,
      resizingHeight,
      strokesIncludedInLayout,
      layoutWrap
    };

    const response = await this.sendToPlugin({
      type: 'MANAGE_AUTO_LAYOUT',
      payload
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to manage auto layout');
    }

    return {
      content: [{
        type: 'text',
        text: yaml.dump(response.data, { indent: 2, lineWidth: 100 })
      }],
      isError: false
    };
  }

  async manageConstraints(args: any): Promise<any> {
    const validatedArgs = ManageConstraintsSchema.parse(args);
    const { operation, nodeId, horizontal, vertical } = validatedArgs;

    const response = await this.sendToPlugin({
      type: 'MANAGE_CONSTRAINTS',
      payload: {
        operation,
        nodeId,
        horizontal,
        vertical
      }
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to manage constraints');
    }

    return {
      content: [{
        type: 'text',
        text: yaml.dump(response.data, { indent: 2, lineWidth: 100 })
      }],
      isError: false
    };
  }

  async manageHierarchy(args: any): Promise<any> {
    const { operation, nodeId, nodeIds, targetNodeId, newParentId, newIndex, name, groupType } = args;

    const response = await this.sendToPlugin({
      type: 'MANAGE_HIERARCHY',
      payload: {
        operation,
        nodeId,
        nodeIds,
        targetNodeId,
        newParentId,
        newIndex,
        name,
        groupType
      }
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to manage hierarchy');
    }

    return {
      content: [{
        type: 'text',
        text: yaml.dump(response.data, { indent: 2, lineWidth: 100 })
      }],
      isError: false
    };
  }

  async manageAlignment(args: any): Promise<any> {
    const validatedArgs = ManageAlignmentSchema.parse(args);
    const { 
      horizontalOperation, 
      horizontalDirection, 
      horizontalReferencePoint,
      horizontalAlignmentPoint,
      horizontalSpacing,
      verticalOperation, 
      verticalDirection, 
      verticalReferencePoint,
      verticalAlignmentPoint,
      verticalSpacing,
      nodeIds, 
      referenceMode, 
      referenceNodeId, 
      margin 
    } = validatedArgs;

    const response = await this.sendToPlugin({
      type: 'MANAGE_ALIGNMENT',
      payload: {
        horizontalOperation,
        horizontalDirection,
        horizontalReferencePoint,
        horizontalAlignmentPoint,
        horizontalSpacing,
        verticalOperation,
        verticalDirection,
        verticalReferencePoint,
        verticalAlignmentPoint,
        verticalSpacing,
        nodeIds,
        referenceMode: referenceMode || 'bounds',
        referenceNodeId,
        margin
      }
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to manage alignment');
    }

    return {
      content: [{
        type: 'text',
        text: yaml.dump(response.data, { indent: 2, lineWidth: 100 })
      }],
      isError: false
    };
  }
}