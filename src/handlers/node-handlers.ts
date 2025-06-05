import { CreateTextSchema, CreateNodeSchema, UpdateNodeSchema, MoveNodeSchema, DeleteNodeSchema, DuplicateNodeSchema, ToolHandler, ToolResult, Tool } from '../types.js';
import { hexToRgb } from '../utils/color-utils.js';

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
        name: 'move_node',
        description: 'Move a node to a new position',
        inputSchema: {
          type: 'object',
          properties: {
            nodeId: { type: 'string', description: 'ID of the node to move' },
            x: { type: 'number', description: 'New X position' },
            y: { type: 'number', description: 'New Y position' }
          },
          required: ['nodeId', 'x', 'y']
        }
      },
      {
        name: 'delete_node',
        description: 'Delete a node from the design',
        inputSchema: {
          type: 'object',
          properties: {
            nodeId: { type: 'string', description: 'ID of the node to delete' }
          },
          required: ['nodeId']
        }
      },
      {
        name: 'duplicate_node',
        description: 'Duplicate an existing node',
        inputSchema: {
          type: 'object',
          properties: {
            nodeId: { type: 'string', description: 'ID of the node to duplicate' },
            offsetX: { type: 'number', default: 10, description: 'X offset for the duplicate' },
            offsetY: { type: 'number', default: 10, description: 'Y offset for the duplicate' }
          },
          required: ['nodeId']
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
      case 'move_node':
        return this.moveNode(args);
      case 'delete_node':
        return this.deleteNode(args);
      case 'duplicate_node':
        return this.duplicateNode(args);
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

      // Generate appropriate success message based on node type
      let message = `Created ${nodeParams.nodeType} "${nodeParams.name}" at (${nodeParams.x}, ${nodeParams.y})`;
      
      if (nodeParams.width && nodeParams.height) {
        message += ` with size ${nodeParams.width}x${nodeParams.height}`;
      }
      
      if (nodeParams.fillColor) {
        message += ` with color ${nodeParams.fillColor}`;
      }

      return {
        content: [{
          type: 'text',
          text: message
        }]
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
      console.error(`🔤 Creating text node with advanced typography`);
         
      // Validate required parameters
      if (!params.characters) {
        throw new Error('Text nodes must have characters content');
      }

      // Set name if not provided
      if (!params.name) {
        params.name = 'Text';
      }
         
      // Prepare line height in Figma's expected format
      let lineHeight = undefined;
      if (params.lineHeight) {
        lineHeight = {
          value: params.lineHeight,
          unit: (params.lineHeightUnit === 'px') ? 'PIXELS' : 'PERCENT'
        };
      }
         
      // Convert styleRanges to Figma's expected format
      const styleRanges = params.styleRanges?.map((range: any) => {
        const figmaRange: any = {
          start: range.start,
          end: range.end,
        };
          
        if (range.fontFamily || range.fontStyle) {
          figmaRange.fontName = {
            family: range.fontFamily || params.fontFamily || 'Inter',
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
        content: params.characters,
        x: params.x || 0,
        y: params.y || 0,
        width: params.width,
        height: params.height,
          
        // Font properties in Figma format
        fontName: {
          family: params.fontFamily || 'Inter',
          style: params.fontStyle || 'Regular'
        },
        fontSize: params.fontSize || 16,
          
        // Alignment (convert to uppercase for Figma)
        textAlignHorizontal: params.textAlignHorizontal?.toUpperCase(),
        textAlignVertical: params.textAlignVertical?.toUpperCase(),
          
        // Text case and decoration
        textCase: params.textCase?.toUpperCase(),
        textDecoration: params.textDecoration?.toUpperCase(),
          
        // Spacing
        letterSpacing: params.letterSpacing,
        lineHeight: lineHeight,
        paragraphIndent: params.paragraphIndent,
        paragraphSpacing: params.paragraphSpacing,
          
        // Style ranges
        styleRanges: styleRanges,
        
        // Style management
        createStyle: params.createStyle,
        styleName: params.styleName
      };
        
      // Set fill color if provided
      if (params.fillColor) {
        figmaParams.fills = [{
          type: 'SOLID',
          color: hexToRgb(params.fillColor)
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
        
      if (params.characters) {
        const previewText = params.characters.substring(0, 20) + 
                           (params.characters.length > 20 ? '...' : '');
        message += ` with content "${previewText}"`;
      }
        
      if (params.fontFamily) {
        message += ` using ${params.fontFamily}`;
        if (params.fontSize) {
          message += ` at ${params.fontSize}px`;
        }
      }
        
      if (params.styleRanges && params.styleRanges.length > 0) {
        message += ` with ${params.styleRanges.length} styled ranges`;
      }
        
      if (params.createStyle && params.styleName) {
        message += ` and created style "${params.styleName}"`;
      }
        
      return {
        content: [
          {
            type: "text",
            text: `✅ ${message}`
          }
        ]
      };
        
    } catch (error: any) {
      console.error('❌ Error creating text node:', error);
      return {
        content: [
          {
            type: "text",
            text: `❌ Error: ${error.message || 'Failed to create text node'}`
          }
        ],
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

    // Extract the properties that were actually updated (exclude nodeId)
    const { nodeId, ...updatedProperties } = params;
    
    return {
      content: [{
        type: 'text',
        text: `✅ Updated node ${params.nodeId} with properties: ${JSON.stringify(updatedProperties)}`
      }]
    };
  }

  async moveNode(args: any): Promise<any> {
    const params = MoveNodeSchema.parse(args);
    
    const response = await this.sendToPlugin({
      type: 'MOVE_NODE',
      payload: params
    });

    return {
      content: [{
        type: 'text',
        text: `✅ Moved node ${params.nodeId} to position (${params.x}, ${params.y})`
      }]
    };
  }

  async deleteNode(args: any): Promise<any> {
    const params = DeleteNodeSchema.parse(args);
    
    const response = await this.sendToPlugin({
      type: 'DELETE_NODE',
      payload: params
    });

    return {
      content: [{
        type: 'text',
        text: `✅ Deleted node ${params.nodeId}`
      }]
    };
  }

  async duplicateNode(args: any): Promise<any> {
    const params = DuplicateNodeSchema.parse(args);
    
    const response = await this.sendToPlugin({
      type: 'DUPLICATE_NODE',
      payload: params
    });

    return {
      content: [{
        type: 'text',
        text: `✅ Duplicated node ${params.nodeId} with offset (${params.offsetX}, ${params.offsetY})`
      }]
    };
  }
}