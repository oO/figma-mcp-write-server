import { CreateTextSchema, CreateNodeSchema, UpdateNodeSchema, MoveNodeSchema, DeleteNodeSchema, DuplicateNodeSchema } from '../types.js';
import { hexToRgb } from '../utils/color-utils.js';

export class NodeHandlers {
  private sendToPlugin: (request: any) => Promise<any>;

  constructor(sendToPluginFn: (request: any) => Promise<any>) {
    this.sendToPlugin = sendToPluginFn;
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

  async updateNode(args: any) {
    const params = UpdateNodeSchema.parse(args);
    
    const response = await this.sendToPlugin({
      type: 'UPDATE_NODE',
      payload: params
    });

    return {
      content: [{
        type: 'text',
        text: `✅ Updated node ${params.nodeId} with properties: ${JSON.stringify(params.properties)}`
      }]
    };
  }

  async moveNode(args: any) {
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

  async deleteNode(args: any) {
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

  async duplicateNode(args: any) {
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