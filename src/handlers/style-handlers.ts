import { ManageStylesSchema, ToolHandler, ToolResult, Tool } from '../types.js';

export class StyleHandlers implements ToolHandler {
  private sendToPlugin: (request: any) => Promise<any>;

  constructor(sendToPluginFn: (request: any) => Promise<any>) {
    this.sendToPlugin = sendToPluginFn;
  }

  getTools(): Tool[] {
    return [
      {
        name: 'manage_styles',
        description: 'Create, list, apply, or delete Figma styles (paint, text, effect, grid)',
        inputSchema: {
          type: 'object',
          properties: {
            operation: { type: 'string', enum: ['create', 'list', 'apply', 'delete', 'get'], description: 'Style operation to perform' },
            styleType: { type: 'string', enum: ['paint', 'text', 'effect', 'grid'], description: 'Type of style' },
            styleName: { type: 'string', description: 'Name of the style' },
            styleId: { type: 'string', description: 'ID of the style' },
            nodeId: { type: 'string', description: 'Node ID (for apply operation)' }
          },
          required: ['operation']
        }
      }
    ];
  }

  async handle(toolName: string, args: any): Promise<any> {
    switch (toolName) {
      case 'manage_styles':
        return this.manageStyles(args);
      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  }

  async manageStyles(args: any): Promise<any> {
    try {
      const validatedArgs = ManageStylesSchema.parse(args);
      
      const result = await this.sendToPlugin({
        type: 'MANAGE_STYLES',
        payload: validatedArgs
      });

      return {
        content: [
          {
            type: "text",
            text: `✅ Style operation ${validatedArgs.operation} completed successfully: ${JSON.stringify(result, null, 2)}`
          }
        ]
      };
    } catch (error) {
      console.error('❌ Error in manageStyles:', error);
      throw error;
    }
  }
}