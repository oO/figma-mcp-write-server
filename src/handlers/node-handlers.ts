import { CreateTextSchema, CreateNodeSchema, UpdateNodeSchema, ManageNodesSchema, ToolHandler, ToolResult, Tool } from '../types/index.js';
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
        description: 'Create a new node in Figma (rectangle, ellipse, text, or frame)',
        inputSchema: {
          type: 'object',
          properties: {
            nodeType: {
              type: 'string',
              enum: ['rectangle', 'ellipse', 'text', 'frame'],
              description: 'Type of node to create'
            },
            name: { type: 'string', description: 'Node name' },
            width: { type: 'number', description: 'Width (required for rectangle, ellipse, frame)' },
            height: { type: 'number', description: 'Height (required for rectangle, ellipse, frame)' },
            fillColor: { type: 'string', description: 'Fill color (hex) - Use for all node types including text and frame fills' },
            strokeColor: { type: 'string', description: 'Stroke color (hex)' },
            strokeWidth: { type: 'number', description: 'Stroke width' },
            content: { type: 'string', description: 'Text content (required for text nodes)' },
            fontSize: { type: 'number', default: 16, description: 'Font size (for text nodes)' },
            fontFamily: { type: 'string', default: 'Inter', description: 'Font family (for text nodes)' },
            fontStyle: { type: 'string', description: 'Font style (for text nodes, e.g., Regular, Bold)' },
            textAlignHorizontal: { type: 'string', enum: ['left', 'center', 'right', 'justified'], description: 'Text alignment (for text nodes)' }
          },
          required: ['nodeType']
        },
        annotations: {
          description_extra: "For advanced typography features, use the create_text tool instead."
        },
        examples: [
          '{"nodeType": "rectangle", "width": 100, "height": 100, "fillColor": "#FF0000"}',
          '{"nodeType": "text", "content": "Hello, World!", "fontSize": 24}'
        ]
      },
      {
        name: 'create_text',
        description: 'Create a text node with advanced typography features',
        inputSchema: {
          type: 'object',
          properties: {
            characters: { type: 'string', description: 'Text content' },
            x: { type: 'number', default: 0, description: 'X position' },
            y: { type: 'number', default: 0, description: 'Y position' },
            width: { type: 'number', description: 'Width (optional, for fixed width text)' },
            height: { type: 'number', description: 'Height (optional)' },
            fontFamily: { type: 'string', default: 'Inter', description: 'Font family' },
            fontStyle: { type: 'string', default: 'Regular', description: 'Font style (e.g., Regular, Bold, Medium, Italic)' },
            fontSize: { type: 'number', default: 16, description: 'Font size in pixels' },
            textAlignHorizontal: { type: 'string', enum: ['left', 'center', 'right', 'justified'], description: 'Horizontal text alignment' },
            textAlignVertical: { type: 'string', enum: ['top', 'center', 'bottom'], description: 'Vertical text alignment' },
            textCase: { type: 'string', enum: ['original', 'upper', 'lower', 'title'], description: 'Text case transformation' },
            textDecoration: { type: 'string', enum: ['none', 'underline', 'strikethrough'], description: 'Text decoration' },
            letterSpacing: { type: 'number', description: 'Letter spacing in pixels' },
            lineHeight: { type: 'number', description: 'Line height value' },
            lineHeightUnit: { type: 'string', enum: ['px', 'percent'], default: 'percent', description: 'Line height unit' },
            fillColor: { type: 'string', description: 'Text color (hex)' },
            createStyle: { type: 'boolean', description: 'Whether to create a text style' },
            styleName: { type: 'string', description: 'Name for the created style (e.g., "Heading/H1")' }
          },
          required: ['characters']
        }
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
            operation: { type: 'string', enum: ['move', 'delete', 'duplicate'], description: 'Node operation to perform' },
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
      case 'create_text':
        return this.createTextNode(args);
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
      
      // If this is a text node, forward to our enhanced typography handler
      if (params.nodeType === 'text') {
        // Map from old format to new typography format
        const textParams = {
          characters: params.content,
          x: params.x,
          y: params.y,
          width: params.width,
          height: params.height,
          fontFamily: params.fontFamily,
          fontSize: params.fontSize,
          fontStyle: params.fontStyle,
          textAlignHorizontal: params.textAlignHorizontal,
          fillColor: params.fillColor
        };
        return await this.createTextNode(textParams);
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

  async createTextNode(params: any): Promise<any> {
    try {
      // Validate parameters using schema
      const validatedParams = CreateTextSchema.parse(params);
         
      // Validate required parameters
      if (!validatedParams.characters) {
        throw new Error('Text nodes must have characters content');
      }

      // Set name if not provided  
      if (!validatedParams.name) {
        validatedParams.name = 'Text';
      }
         
      // Prepare line height in Figma's expected format
      let lineHeight = undefined;
      if (validatedParams.lineHeight) {
        lineHeight = {
          value: validatedParams.lineHeight,
          unit: (validatedParams.lineHeightUnit === 'px') ? 'PIXELS' : 'PERCENT'
        };
      }
         
      // Convert styleRanges to Figma's expected format
      const styleRanges = validatedParams.styleRanges?.map((range: any) => {
        const figmaRange: any = {
          start: range.start,
          end: range.end,
        };
          
        if (range.fontFamily || range.fontStyle) {
          figmaRange.fontName = {
            family: range.fontFamily || validatedParams.fontFamily || 'Inter',
            style: range.fontStyle || 'Regular'
          };
        }
          
        if (range.fontSize) figmaRange.fontSize = range.fontSize;
        if (range.textCase) figmaRange.textCase = range.textCase.toUpperCase();
        if (range.textDecoration) figmaRange.textDecoration = range.textDecoration.toUpperCase();
        if (range.letterSpacing) figmaRange.letterSpacing = range.letterSpacing;
        if (range.lineHeight) {
          figmaRange.lineHeight = {
            value: range.lineHeight,
            unit: 'PERCENT' // Default to percent for ranges
          };
        }
          
        if (range.fillColor) {
          figmaRange.fills = [{
            type: 'SOLID',
            color: hexToRgb(range.fillColor)
          }];
        }
          
        return figmaRange;
      });
        
      // Prepare Figma-compatible parameters
      const figmaParams: any = {
        nodeType: 'text',
        characters: validatedParams.characters,
        x: validatedParams.x || 0,
        y: validatedParams.y || 0,
        width: validatedParams.width,
        height: validatedParams.height,
          
        // Font properties in Figma format
        fontName: {
          family: validatedParams.fontFamily || 'Inter',
          style: validatedParams.fontStyle || 'Regular'
        },
        fontSize: validatedParams.fontSize || 16,
          
        // Alignment (convert to uppercase for Figma)
        textAlignHorizontal: validatedParams.textAlignHorizontal?.toUpperCase(),
        textAlignVertical: validatedParams.textAlignVertical?.toUpperCase(),
          
        // Text case and decoration
        textCase: validatedParams.textCase?.toUpperCase(),
        textDecoration: validatedParams.textDecoration?.toUpperCase(),
          
        // Spacing
        letterSpacing: validatedParams.letterSpacing,
        lineHeight: lineHeight,
        paragraphIndent: validatedParams.paragraphIndent,
        paragraphSpacing: validatedParams.paragraphSpacing,
          
        // Style ranges
        styleRanges: styleRanges,
        
        // Style management
        createStyle: validatedParams.createStyle,
        styleName: validatedParams.styleName
      };
        
      // Set fill color if provided
      if (validatedParams.fillColor) {
        figmaParams.fills = [{
          type: 'SOLID',
          color: hexToRgb(validatedParams.fillColor)
        }];
      }
        
      // Send creation request to plugin
      const result = await this.sendToPlugin({
        type: 'CREATE_TEXT',
        payload: figmaParams
      });
        
      if (!result.success) {
        throw new Error(result.error || 'Failed to create text node');
      }
        
      // Build a user-friendly message
      let message = `Created text`;
        
      if (validatedParams.characters) {
        const previewText = validatedParams.characters.substring(0, 20) + 
                           (validatedParams.characters.length > 20 ? '...' : '');
        message += ` with content "${previewText}"`;
      }
        
      if (validatedParams.fontFamily) {
        message += ` using ${validatedParams.fontFamily}`;
        if (validatedParams.fontSize) {
          message += ` at ${validatedParams.fontSize}px`;
        }
      }
        
      if (validatedParams.styleRanges && validatedParams.styleRanges.length > 0) {
        message += ` with ${validatedParams.styleRanges.length} styled ranges`;
      }
        
      if (validatedParams.createStyle && validatedParams.styleName) {
        message += ` and created style "${validatedParams.styleName}"`;
      }
        
      return {
        content: [{
          type: 'text',
          text: yaml.dump(result.data, { indent: 2, lineWidth: 100 })
        }],
        isError: false
      };
        
    } catch (error: any) {
      const errorData = {
        error: `Failed to create text node: ${error.message || 'Unknown error'}`,
        operation: 'create_text',
        timestamp: new Date().toISOString()
      };
      return {
        content: [{
          type: 'text',
          text: yaml.dump(errorData, { indent: 2, lineWidth: 100 })
        }],
        isError: true
      };
    }
  }

  async updateNode(args: any): Promise<any> {
    const params = UpdateNodeSchema.parse(args);
    
    const response = await this.sendToPlugin({
      type: 'UPDATE_NODE',
      payload: params
    });

    return {
      content: [{
        type: 'text',
        text: yaml.dump(response.data, { indent: 2, lineWidth: 100 })
      }],
      isError: false
    };
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