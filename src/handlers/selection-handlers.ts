import { SetSelectionSchema, ToolHandler, ToolResult, Tool, validateAndParse, SelectionPayload, SelectionData, isValidPluginResponse } from '../types.js';

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
      {
        name: 'export_node',
        description: 'Export a node as an image',
        inputSchema: {
          type: 'object',
          properties: {
            nodeId: { type: 'string', description: 'ID of the node to export' },
            format: { type: 'string', enum: ['PNG', 'JPG', 'SVG', 'PDF'], default: 'PNG', description: 'Export format' },
            scale: { type: 'number', default: 1, description: 'Export scale factor' }
          },
          required: ['nodeId']
        }
      }
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
      case 'export_node':
        return this.exportNode(args);
      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  }

  async setSelection(args: any): Promise<any> {
    // Use enhanced validation with better error reporting
    const validation = validateAndParse(SetSelectionSchema, args, 'setSelection');
    
    if (!validation.success) {
      return {
        content: [{
          type: 'text',
          text: `❌ ${validation.error}`
        }],
        isError: true
      };
    }
    
    const params = validation.data;
    
    try {
      const response = await this.sendToPlugin({
        type: 'SET_SELECTION',
        payload: params
      });
      
      // Validate response structure
      if (!isValidPluginResponse(response)) {
        throw new Error('Invalid response format from plugin');
      }
      
      if (!response.success) {
        throw new Error(response.error || 'Plugin operation failed');
      }

      return {
        content: [{
          type: 'text',
          text: `✅ Set selection to ${params.nodeIds.length} node(s): ${params.nodeIds.join(', ')}`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `❌ Failed to set selection: ${error instanceof Error ? error.message : String(error)}`
        }],
        isError: true
      };
    }
  }

  async getSelection(): Promise<any> {
    const response = await this.sendToPlugin({
      type: 'GET_SELECTION'
    });

    return {
      content: [{
        type: 'text',
        text: `📋 Current selection: ${JSON.stringify(response.data, null, 2)}`
      }]
    };
  }

  async getPageNodes(args: any = {}): Promise<any> {
    const response = await this.sendToPlugin({
      type: 'GET_PAGE_NODES',
      payload: args
    });

    const data = response.data;
    const detail = data?.detail || 'standard';
    
    let resultText = `📄 Page Hierarchy (${data?.totalCount || 0} total nodes, ${data?.topLevelCount || 0} top-level)\n`;
    resultText += `📊 Detail Level: ${detail}\n\n`;
    
    if (data?.nodes && Array.isArray(data.nodes)) {
      if (detail === 'simple') {
        // Simple format: just list all nodes with basic info
        resultText += '📋 Nodes:\n';
        data.nodes.forEach((node: any) => {
          resultText += `• ${node.name} (${node.type}) [${node.id}]\n`;
        });
      } else {
        // Standard/detailed format: group by depth for hierarchy visualization
        const nodesByDepth: { [key: number]: any[] } = {};
        data.nodes.forEach((node: any) => {
          const depth = node.depth || 0;
          if (!nodesByDepth[depth]) nodesByDepth[depth] = [];
          nodesByDepth[depth].push(node);
        });

        // Display nodes grouped by depth
        const maxDepth = Math.max(...Object.keys(nodesByDepth).map(Number));
        for (let depth = 0; depth <= maxDepth; depth++) {
          const nodesAtDepth = nodesByDepth[depth];
          if (nodesAtDepth) {
            resultText += `📊 Level ${depth} (${nodesAtDepth.length} nodes):\n`;
            nodesAtDepth.forEach((node: any) => {
              const indent = '  '.repeat(depth);
              const size = node.width && node.height ? ` [${Math.round(node.width)}×${Math.round(node.height)}]` : '';
              const pos = node.x !== undefined && node.y !== undefined ? ` at (${Math.round(node.x)}, ${Math.round(node.y)})` : '';
              const id = detail === 'detailed' ? ` {${node.id}}` : '';
              resultText += `${indent}• ${node.name} (${node.type})${size}${pos}${id}\n`;
            });
            resultText += '\n';
          }
        }
      }
    } else {
      resultText += 'No nodes found or invalid response format\n';
    }

    return {
      content: [{
        type: 'text',
        text: resultText
      }]
    };
  }

  async exportNode(args: any): Promise<any> {
    const response = await this.sendToPlugin({
      type: 'EXPORT_NODE',
      payload: args
    });

    if (!response.success) {
      throw new Error(response.error || 'Export failed');
    }

    return {
      content: [{
        type: 'text',
        text: `✅ Exported node ${args.nodeId} as ${args.format || 'PNG'} with scale ${args.scale || 1}x`
      }]
    };
  }
}