import { CreateNodeSchema, UpdateNodeSchema, ManageNodesSchema, ToolHandler, ToolResult, Tool } from '../types/index.js';
import { hexToRgb } from '../utils/color-utils.js';
import * as yaml from 'js-yaml';

export class NodeHandlers implements ToolHandler {
  private sendToPlugin: (request: any) => Promise<any>;

  constructor(sendToPluginFn: (request: any) => Promise<any>) {
    this.sendToPlugin = sendToPluginFn;
  }

  getTools(): Tool[] {
    return [
      {
        name: 'create_node',
        description: 'Create a new node in Figma (rectangle, ellipse, frame, text, star, or polygon)',
        inputSchema: {
          type: 'object',
          properties: {
            nodeType: {
              type: 'string',
              enum: ['rectangle', 'ellipse', 'frame', 'text', 'star', 'polygon'],
              description: 'Type of node to create'
            },
            name: { type: 'string', description: 'Node name' },
            width: { type: 'number', description: 'Width (required for rectangle, ellipse, frame)' },
            height: { type: 'number', description: 'Height (required for rectangle, ellipse, frame)' },
            fillColor: { type: 'string', description: 'Fill color (hex)' },
            strokeColor: { type: 'string', description: 'Stroke color (hex)' },
            strokeWidth: { type: 'number', description: 'Stroke width' }
          },
          required: ['nodeType']
        },
        annotations: {
          description_extra: "Supports all basic node types. For advanced text styling, consider using the manage_text tool."
        },
        examples: [
          '{"nodeType": "rectangle", "width": 100, "height": 100, "fillColor": "#FF0000"}',
          '{"nodeType": "frame", "width": 200, "height": 150, "name": "Container"}',
          '{"nodeType": "text", "characters": "Hello World", "fontSize": 16}',
          '{"nodeType": "star", "pointCount": 5, "innerRadius": 0.5}'
        ]
      },
      {
        name: 'update_node',
        description: 'Update properties of an existing node',
        inputSchema: {
          type: 'object',
          properties: {
            nodeId: { type: 'string', description: 'ID of the node to update' },
            width: { type: 'number', description: 'Width of the node' },
            height: { type: 'number', description: 'Height of the node' },
            x: { type: 'number', description: 'X position' },
            y: { type: 'number', description: 'Y position' },
            cornerRadius: { type: 'number', minimum: 0, description: 'Corner radius (applies to all corners)' },
            fillColor: { type: 'string', description: 'Fill color (hex)' },
            opacity: { type: 'number', minimum: 0, maximum: 1, description: 'Opacity (0-1)' },
            visible: { type: 'boolean', description: 'Visibility' },
            rotation: { type: 'number', description: 'Rotation in degrees' },
            locked: { type: 'boolean', description: 'Lock state' }
          },
          required: ['nodeId']
        }
      },
      {
        name: 'manage_nodes',
        description: 'Move, delete, or duplicate nodes',
        inputSchema: {
          type: 'object',
          properties: {
            operation: { 
              type: 'string', 
              enum: ['move', 'delete', 'duplicate'], 
              description: 'Node operation to perform' 
            },
            nodeId: { type: 'string', description: 'ID of the node to operate on' },
            x: { type: 'number', description: 'New X position (required for move operation)' },
            y: { type: 'number', description: 'New Y position (required for move operation)' },
            offsetX: { type: 'number', default: 10, description: 'X offset for the duplicate (for duplicate operation)' },
            offsetY: { type: 'number', default: 10, description: 'Y offset for the duplicate (for duplicate operation)' }
          },
          required: ['operation', 'nodeId']
        }
      }
    ];
  }

  async handle(toolName: string, args: any): Promise<any> {
    switch (toolName) {
      case 'create_node':
        return this.createNode(args);
      case 'update_node':
        return this.updateNode(args);
      case 'manage_nodes':
        return this.manageNodes(args);
      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  }

  async createNode(args: any): Promise<any> {
    try {
      const params = CreateNodeSchema.parse(args);
      
      // Text nodes are not supported through create_node - use manage_text tool instead
      if (params.nodeType === 'text') {
        throw new Error('Text node creation is not supported through create_node. Please use the manage_text tool instead.');
      }
      
      // Create a mutable copy for applying defaults
      const nodeParams = { ...params };

      // Set default names based on node type if not provided
      if (!nodeParams.name) {
        switch (nodeParams.nodeType) {
          case 'rectangle':
            nodeParams.name = 'Rectangle';
            break;
          case 'ellipse':
            nodeParams.name = 'Ellipse';
            break;
          case 'frame':
            nodeParams.name = 'Frame';
            break;
        }
      }

      // Set default dimensions for shape nodes if not provided
      if (nodeParams.nodeType === 'rectangle' || nodeParams.nodeType === 'ellipse') {
        if (nodeParams.width === undefined) nodeParams.width = 100;
        if (nodeParams.height === undefined) nodeParams.height = 100;
      } else if (nodeParams.nodeType === 'frame') {
        if (nodeParams.width === undefined) nodeParams.width = 200;
        if (nodeParams.height === undefined) nodeParams.height = 200;
      }

      // Send to plugin with standard operation type
      const response = await this.sendToPlugin({
        type: 'CREATE_NODE',
        payload: nodeParams
      });

      if (!response.success) {
        throw new Error(response.error || `Failed to create ${nodeParams.nodeType} node`);
      }

      return {
        content: [{
          type: 'text',
          text: yaml.dump(response.data, { indent: 2, lineWidth: 100 })
        }],
        isError: false
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes('Text nodes must have non-empty content')) {
        throw new Error(`Text nodes require non-empty content. Please provide a 'content' property.`);
      }
      throw new Error(`Failed to create node: ${error instanceof Error ? error.message : String(error)}`);
    }
  }


  async updateNode(args: any): Promise<any> {
    const params = UpdateNodeSchema.parse(args);
    
    try {
      const response = await this.sendToPlugin({
        type: 'UPDATE_NODE',
        payload: params
      });

      if (!response.success) {
        // Improve error message for common issues
        const errorMsg = response.error || 'Update failed';
        if (errorMsg.includes("invalid 'in' operand") || errorMsg.includes('not found') || errorMsg.includes('does not exist')) {
          throw new Error(`Node with ID '${params.nodeId}' not found. Please verify the node ID is correct and the node exists.`);
        }
        throw new Error(errorMsg);
      }

      return {
        content: [{
          type: 'text',
          text: yaml.dump(response.data, { indent: 2, lineWidth: 100 })
        }],
        isError: false
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes('Node with ID')) {
        throw error; // Re-throw our improved error messages
      }
      
      // Check for common node ID errors in the original error message
      const errorMsg = error instanceof Error ? error.message : String(error);
      if (errorMsg.includes("invalid 'in' operand") || errorMsg.includes('not found') || errorMsg.includes('does not exist')) {
        throw new Error(`Node with ID '${params.nodeId}' not found. Please verify the node ID is correct and the node exists.`);
      }
      
      throw new Error(`Failed to update node: ${errorMsg}`);
    }
  }

  async manageNodes(args: any): Promise<any> {
    const params = ManageNodesSchema.parse(args);
    const { operation, nodeId, x, y, offsetX, offsetY } = params;

    let response: any;
    let resultText: string;

    switch (operation) {
      case 'move':
        if (x === undefined || y === undefined) {
          throw new Error('x and y coordinates are required for move operation');
        }
        response = await this.sendToPlugin({
          type: 'MOVE_NODE',
          payload: { nodeId, x, y }
        });
        resultText = `✅ Moved node ${nodeId} to position (${x}, ${y})`;
        break;

      case 'delete':
        response = await this.sendToPlugin({
          type: 'DELETE_NODE',
          payload: { nodeId }
        });
        resultText = `✅ Deleted node ${nodeId}`;
        break;

      case 'duplicate':
        response = await this.sendToPlugin({
          type: 'DUPLICATE_NODE',
          payload: { nodeId, offsetX, offsetY }
        });
        resultText = `✅ Duplicated node ${nodeId} with offset (${offsetX}, ${offsetY})`;
        break;

      default:
        throw new Error(`Unknown node operation: ${operation}`);
    }

    if (!response.success) {
      throw new Error(response.error || `Failed to ${operation} node`);
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