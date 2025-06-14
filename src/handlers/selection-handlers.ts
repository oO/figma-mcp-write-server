import { SetSelectionSchema, ToolHandler, ToolResult, Tool, validateAndParse, SelectionPayload, SelectionData } from '../types/index.js';
import * as yaml from 'js-yaml';

export class SelectionHandlers implements ToolHandler {
  private sendToPlugin: (request: any) => Promise<any>;

  constructor(sendToPluginFn: (request: any) => Promise<any>) {
    this.sendToPlugin = sendToPluginFn;
  }

  getTools(): Tool[] {
    return [
      {
        name: 'get_selection',
        description: 'Get the currently selected nodes',
        inputSchema: { type: 'object', properties: {} }
      },
      {
        name: 'set_selection',
        description: 'Set the selection to specific nodes',
        inputSchema: {
          type: 'object',
          properties: {
            nodeIds: { type: 'array', items: { type: 'string' }, description: 'Array of node IDs to select' }
          },
          required: ['nodeIds']
        }
      },
      {
        name: 'get_page_nodes',
        description: 'Get all nodes in the current page with hierarchy information',
        inputSchema: {
          type: 'object',
          properties: {
            detail: {
              type: 'string',
              enum: ['simple', 'standard', 'detailed'],
              default: 'standard',
              description: 'Level of detail: simple (id, name, type), standard (includes position/size), detailed (all properties)'
            },
            includeHidden: {
              type: 'boolean',
              default: false,
              description: 'Include hidden/invisible nodes'
            },
            includePages: {
              type: 'boolean',
              default: false,
              description: 'Include the page node itself in results'
            },
            nodeTypes: {
              type: 'array',
              items: { type: 'string' },
              description: 'Filter by specific node types (e.g., ["FRAME", "TEXT"])'
            },
            maxDepth: {
              type: 'number',
              description: 'Maximum traversal depth (null for unlimited)'
            }
          }
        }
      },
    ];
  }

  async handle(toolName: string, args: any): Promise<any> {
    switch (toolName) {
      case 'get_selection':
        return this.getSelection();
      case 'set_selection':
        return this.setSelection(args);
      case 'get_page_nodes':
        return this.getPageNodes(args);
      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  }

  async setSelection(args: any): Promise<any> {
    // Use enhanced validation with better error reporting
    const validation = validateAndParse(SetSelectionSchema, args, 'setSelection');
    
    if (!validation.success) {
      throw new Error(`Validation failed: ${validation.error}`);
    }
    
    const params = validation.data;
    
    const response = await this.sendToPlugin({
      type: 'SET_SELECTION',
      payload: params
    });
    
    if (!response.success) {
      throw new Error(response.error || 'Plugin operation failed');
    }

    return {
      content: [{
        type: 'text',
        text: yaml.dump(response.data, { indent: 2, lineWidth: 100 })
      }],
      isError: false
    };
  }

  async getSelection(): Promise<any> {
    const response = await this.sendToPlugin({
      type: 'GET_SELECTION',
      payload: {}
    });

    return {
      content: [{
        type: 'text',
        text: yaml.dump(response.data, { indent: 2, lineWidth: 100 })
      }],
      isError: false
    };
  }

  async getPageNodes(args: any = {}): Promise<any> {
    const response = await this.sendToPlugin({
      type: 'GET_PAGE_NODES',
      payload: args
    });

    return {
      content: [{
        type: 'text',
        text: yaml.dump(response.data, { indent: 2, lineWidth: 100 })
      }],
      isError: false
    };
  }

}