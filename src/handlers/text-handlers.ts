import { ManageTextSchema, ToolHandler, ToolResult, Tool } from '../types/index.js';
import * as yaml from 'js-yaml';

export class TextHandlers implements ToolHandler {
  private sendToPlugin: (request: any) => Promise<any>;

  constructor(sendToPluginFn: (request: any) => Promise<any>) {
    this.sendToPlugin = sendToPluginFn;
  }

  getTools(): Tool[] {
    return [
      {
        name: 'figma_text',
        description: 'Comprehensive text management tool for creating, updating, and styling text in Figma',
        inputSchema: {
          type: 'object',
          properties: {
            operation: {
              type: 'string',
              enum: ['create', 'update', 'character_styling', 'apply_text_style', 'create_text_style'],
              description: 'Text operation to perform'
            },
            nodeId: {
              type: 'string',
              description: 'Target node ID (required for non-create operations)'
            },
            characters: {
              type: 'string',
              minLength: 1,
              description: 'Text content (cannot be empty or whitespace-only)'
            },
            x: {
              type: 'number',
              description: 'X position'
            },
            y: {
              type: 'number',
              description: 'Y position'
            },
            width: {
              type: 'number',
              description: 'Width for fixed-width text'
            },
            height: {
              type: 'number',
              description: 'Height for fixed-height text'
            },
            name: {
              type: 'string',
              description: 'Node name'
            },
            fontFamily: {
              type: 'string',
              description: 'Font family (integrates with automatic font loading)'
            },
            fontStyle: {
              type: 'string',
              description: 'Font style (Regular, Bold, Medium, etc.)'
            },
            fontSize: {
              type: 'number',
              minimum: 1,
              maximum: 1000,
              description: 'Font size in pixels'
            },
            fontWeight: {
              type: 'number',
              minimum: 100,
              maximum: 900,
              description: 'Font weight (100-900)'
            },
            textAlignHorizontal: {
              type: 'string',
              enum: ['LEFT', 'CENTER', 'RIGHT', 'JUSTIFIED'],
              description: 'Horizontal text alignment'
            },
            textAlignVertical: {
              type: 'string',
              enum: ['TOP', 'CENTER', 'BOTTOM'],
              description: 'Vertical text alignment'
            },
            textCase: {
              type: 'string',
              enum: ['ORIGINAL', 'UPPER', 'LOWER', 'TITLE'],
              description: 'Text case transformation'
            },
            textDecoration: {
              type: 'string',
              enum: ['NONE', 'UNDERLINE', 'STRIKETHROUGH'],
              description: 'Text decoration'
            },
            letterSpacing: {
              oneOf: [
                { type: 'number' },
                {
                  type: 'object',
                  properties: {
                    value: { type: 'number' },
                    unit: { type: 'string', enum: ['PIXELS', 'PERCENT'] }
                  },
                  required: ['value', 'unit']
                }
              ],
              description: 'Letter spacing (number for pixels or object with value and unit)'
            },
            lineHeight: {
              oneOf: [
                { type: 'number' },
                {
                  type: 'object',
                  properties: {
                    value: { type: 'number' },
                    unit: { type: 'string', enum: ['PIXELS', 'PERCENT'] }
                  },
                  required: ['value', 'unit']
                }
              ],
              description: 'Line height (number for auto-detection or object with value and unit)'
            },
            paragraphSpacing: {
              type: 'number',
              description: 'Paragraph spacing in pixels'
            },
            paragraphIndent: {
              type: 'number',
              description: 'Paragraph indent in pixels'
            },
            textAutoResize: {
              type: 'string',
              enum: ['NONE', 'WIDTH_AND_HEIGHT', 'HEIGHT', 'TRUNCATE'],
              description: 'Text auto-resize behavior'
            },
            textListOptions: {
              type: 'object',
              properties: {
                type: { type: 'string', enum: ['ORDERED', 'UNORDERED'] }
              },
              required: ['type'],
              description: 'Text list configuration'
            },
            characterRanges: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  start: { type: 'number', minimum: 0 },
                  end: { type: 'number', minimum: 0 },
                  fontSize: { type: 'number', minimum: 1, maximum: 1000 },
                  fontFamily: { type: 'string' },
                  fontStyle: { type: 'string' },
                  fontWeight: { type: 'number', minimum: 100, maximum: 900 },
                  textCase: { type: 'string', enum: ['ORIGINAL', 'UPPER', 'LOWER', 'TITLE'] },
                  textDecoration: { type: 'string', enum: ['NONE', 'UNDERLINE', 'STRIKETHROUGH'] },
                  letterSpacing: {
                    oneOf: [
                      { type: 'number' },
                      {
                        type: 'object',
                        properties: {
                          value: { type: 'number' },
                          unit: { type: 'string', enum: ['PIXELS', 'PERCENT'] }
                        },
                        required: ['value', 'unit']
                      }
                    ]
                  },
                  fills: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        type: { type: 'string', enum: ['SOLID', 'GRADIENT_LINEAR', 'GRADIENT_RADIAL'] },
                        color: { type: 'string' },
                        visible: { type: 'boolean' },
                        opacity: { type: 'number', minimum: 0, maximum: 1 }
                      },
                      required: ['type']
                    }
                  }
                },
                required: ['start', 'end']
              },
              description: 'Character-level styling ranges (V2 feature)'
            },
            fills: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type: { type: 'string', enum: ['SOLID', 'GRADIENT_LINEAR', 'GRADIENT_RADIAL'] },
                  color: { type: 'string' },
                  visible: { type: 'boolean' },
                  opacity: { type: 'number', minimum: 0, maximum: 1 }
                },
                required: ['type']
              },
              description: 'Text fill colors'
            },
            textStyleId: {
              type: 'string',
              description: 'Apply existing text style by ID'
            },
            styleName: {
              type: 'string',
              description: 'Name for new text style (used with create_text_style operation)'
            },
            styleDescription: {
              type: 'string', 
              description: 'Description for new text style (optional)'
            },
            hyperlink: {
              type: 'object',
              properties: {
                type: { type: 'string', enum: ['URL', 'NODE'] },
                url: { type: 'string' },
                nodeId: { type: 'string' }
              },
              required: ['type'],
              description: 'Hyperlink configuration'
            },
            openTypeFeatures: {
              type: 'object',
              additionalProperties: { type: 'boolean' },
              description: 'OpenType features configuration'
            }
          },
          required: ['operation']
        },
        examples: [
          '{"operation": "create", "characters": "Hello World", "fontFamily": "Inter", "fontSize": 32, "x": 100, "y": 100}',
          '{"operation": "update", "nodeId": "123:456", "characters": "Updated text", "fontSize": 24}',
          '{"operation": "character_styling", "nodeId": "123:456", "characterRanges": [{"start": 0, "end": 5, "fontSize": 36, "fills": [{"type": "SOLID", "color": "#ff0000"}]}]}',
          '{"operation": "apply_text_style", "nodeId": "123:456", "textStyleId": "S:abc123"}',
          '{"operation": "create_text_style", "nodeId": "123:456", "styleName": "Body Large", "styleDescription": "Large body text"}'
        ]
      }
    ];
  }

  async handle(name: string, args: any): Promise<ToolResult> {
    switch (name) {
      case 'figma_text':
        return this.handleManageText(args);
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  private async handleManageText(args: any): Promise<ToolResult> {
    const validatedArgs = ManageTextSchema.parse(args);
    
    const result = await this.sendToPlugin({
      type: 'MANAGE_TEXT',
      payload: validatedArgs
    });

    if (!result.success) {
      throw new Error(result.error || 'Text operation failed');
    }

    return {
      content: [{
        type: 'text',
        text: yaml.dump(result.data, { 
          noRefs: true,
          sortKeys: false
        })
      }]
    };
  }
}