import { SetSelectionSchema, GetPageNodesSchema, ToolHandler, ToolResult, Tool, validateAndParse, SelectionPayload, SelectionData } from '../types/index.js';
import * as yaml from 'js-yaml';

export class SelectionHandlers implements ToolHandler {
  private sendToPlugin: (request: any) => Promise<any>;

  constructor(sendToPluginFn: (request: any) => Promise<any>) {
    this.sendToPlugin = sendToPluginFn;
  }

  getTools(): Tool[] {
    return [
      {
        name: 'figma_selection',
        description: 'Get current selection, set selection to specific nodes, or get all page nodes with hierarchy',
        inputSchema: {
          type: 'object',
          properties: {
            operation: {
              type: 'string',
              enum: ['get_current', 'set_nodes', 'get_page_hierarchy'],
              description: 'Selection operation to perform'
            },
            // For set_nodes operation
            nodeIds: { 
              type: 'array', 
              items: { type: 'string' }, 
              description: 'Array of node IDs to select (required for set_nodes operation)' 
            },
            // For get_page_hierarchy operation
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
          },
          required: ['operation']
        },
        examples: [
          '{"operation": "get_current"}',
          '{"operation": "set_nodes", "nodeIds": ["123:456", "789:012"]}',
          '{"operation": "get_page_hierarchy", "detail": "standard", "includeHidden": false}',
          '{"operation": "get_page_hierarchy", "detail": "simple", "nodeTypes": ["FRAME", "TEXT"]}'
        ]
      }
    ];
  }

  async handle(toolName: string, args: any): Promise<any> {
    if (toolName !== 'figma_selection') {
      throw new Error(`Unknown tool: ${toolName}`);
    }
    
    const operation = args.operation;
    switch (operation) {
      case 'get_current':
        return this.getSelection();
      case 'set_nodes':
        return this.setSelection(args);
      case 'get_page_hierarchy':
        return this.getPageNodes(args);
      default:
        throw new Error(`Unknown operation: ${operation}`);
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
    // Use enhanced validation for parameter checking
    const validation = validateAndParse(GetPageNodesSchema, args, 'getPageNodes');
    
    if (!validation.success) {
      throw new Error(`Validation failed: ${validation.error}`);
    }
    
    const params = validation.data;
    
    const response = await this.sendToPlugin({
      type: 'GET_PAGE_NODES',
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

}