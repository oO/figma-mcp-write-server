import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { v4 as uuidv4 } from 'uuid';
import { PluginBridge } from './plugin-bridge.js';
import { 
  CreateRectangleSchema,
  CreateEllipseSchema,
  CreateTextSchema,
  CreateFrameSchema,
  UpdateNodeSchema,
  MoveNodeSchema,
  DeleteNodeSchema,
  DuplicateNodeSchema,
  SetSelectionSchema,
  ExportNodeSchema,
  ServerConfig,
  DEFAULT_CONFIG
} from './types.js';

export class FigmaMCPServer {
  private server: Server;
  private pluginBridge: PluginBridge;
  private config: ServerConfig;

  constructor(config: Partial<ServerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.server = new Server(
      {
        name: 'figma-mcp-write-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.pluginBridge = new PluginBridge(this.config);
    this.setupHandlers();
    this.setupPluginBridge();
  }

  private setupPluginBridge(): void {
    this.pluginBridge.on('plugin-connected', () => {
      console.log('✅ Figma plugin connected - write operations now available');
    });

    this.pluginBridge.on('plugin-disconnected', () => {
      console.log('❌ Figma plugin disconnected - write operations unavailable');
    });

    this.pluginBridge.on('plugin-timeout', () => {
      console.log('⚠️  Figma plugin connection timeout');
    });
  }

  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools: Tool[] = [
        {
          name: 'create_rectangle',
          description: 'Create a rectangle shape in Figma',
          inputSchema: CreateRectangleSchema,
        },
        {
          name: 'create_ellipse',
          description: 'Create an ellipse/circle shape in Figma',
          inputSchema: CreateEllipseSchema,
        },
        {
          name: 'create_text',
          description: 'Create text in Figma',
          inputSchema: CreateTextSchema,
        },
        {
          name: 'create_frame',
          description: 'Create a frame container in Figma',
          inputSchema: CreateFrameSchema,
        },
        {
          name: 'update_node',
          description: 'Update properties of an existing Figma node',
          inputSchema: UpdateNodeSchema,
        },
        {
          name: 'move_node',
          description: 'Move a Figma node to new coordinates',
          inputSchema: MoveNodeSchema,
        },
        {
          name: 'delete_node',
          description: 'Delete a Figma node',
          inputSchema: DeleteNodeSchema,
        },
        {
          name: 'duplicate_node',
          description: 'Duplicate a Figma node',
          inputSchema: DuplicateNodeSchema,
        },
        {
          name: 'get_selection',
          description: 'Get currently selected nodes in Figma',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'set_selection',
          description: 'Set the selection in Figma',
          inputSchema: SetSelectionSchema,
        },
        {
          name: 'get_page_nodes',
          description: 'Get all nodes from the current page',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'export_node',
          description: 'Export a Figma node as an image',
          inputSchema: ExportNodeSchema,
        },
        {
          name: 'get_plugin_status',
          description: 'Check if the Figma plugin is connected and ready',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
      ];

      return { tools };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        // Check plugin connection for write operations
        const writeOperations = [
          'create_rectangle',
          'create_ellipse', 
          'create_text',
          'create_frame',
          'update_node',
          'move_node',
          'delete_node',
          'duplicate_node',
          'set_selection'
        ];

        if (writeOperations.includes(name) && !this.pluginBridge.isPluginConnected()) {
          return {
            content: [{
              type: 'text',
              text: `❌ Cannot perform write operation: Figma plugin not connected. Please open Figma and run the companion plugin.`
            }]
          };
        }

        switch (name) {
          case 'create_rectangle':
            return await this.createRectangle(args);
          
          case 'create_ellipse':
            return await this.createEllipse(args);
          
          case 'create_text':
            return await this.createText(args);
          
          case 'create_frame':
            return await this.createFrame(args);
          
          case 'update_node':
            return await this.updateNode(args);
          
          case 'move_node':
            return await this.moveNode(args);
          
          case 'delete_node':
            return await this.deleteNode(args);
          
          case 'duplicate_node':
            return await this.duplicateNode(args);
          
          case 'get_selection':
            return await this.getSelection();
          
          case 'set_selection':
            return await this.setSelection(args);
          
          case 'get_page_nodes':
            return await this.getPageNodes();
          
          case 'export_node':
            return await this.exportNode(args);
          
          case 'get_plugin_status':
            return await this.getPluginStatus();
          
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `❌ Error executing ${name}: ${error instanceof Error ? error.message : String(error)}`
          }]
        };
      }
    });
  }

  // Tool implementations

  private async createRectangle(args: any) {
    const params = CreateRectangleSchema.parse(args);
    const response = await this.pluginBridge.sendToPlugin({
      id: uuidv4(),
      type: 'CREATE_RECTANGLE',
      payload: params
    });

    return {
      content: [{
        type: 'text',
        text: `✅ Created rectangle "${params.name}" at (${params.x}, ${params.y}) with size ${params.width}x${params.height}`
      }]
    };
  }

  private async createEllipse(args: any) {
    const params = CreateEllipseSchema.parse(args);
    const response = await this.pluginBridge.sendToPlugin({
      id: uuidv4(),
      type: 'CREATE_ELLIPSE',
      payload: params
    });

    return {
      content: [{
        type: 'text',
        text: `✅ Created ellipse "${params.name}" at (${params.x}, ${params.y}) with size ${params.width}x${params.height}`
      }]
    };
  }

  private async createText(args: any) {
    const params = CreateTextSchema.parse(args);
    const response = await this.pluginBridge.sendToPlugin({
      id: uuidv4(),
      type: 'CREATE_TEXT',
      payload: params
    });

    return {
      content: [{
        type: 'text',
        text: `✅ Created text "${params.content}" at (${params.x}, ${params.y}) with font size ${params.fontSize}px`
      }]
    };
  }

  private async createFrame(args: any) {
    const params = CreateFrameSchema.parse(args);
    const response = await this.pluginBridge.sendToPlugin({
      id: uuidv4(),
      type: 'CREATE_FRAME',
      payload: params
    });

    return {
      content: [{
        type: 'text',
        text: `✅ Created frame "${params.name}" at (${params.x}, ${params.y}) with size ${params.width}x${params.height}`
      }]
    };
  }

  private async updateNode(args: any) {
    const params = UpdateNodeSchema.parse(args);
    const response = await this.pluginBridge.sendToPlugin({
      id: uuidv4(),
      type: 'UPDATE_NODE',
      payload: params
    });

    return {
      content: [{
        type: 'text',
        text: `✅ Updated node ${params.nodeId} with properties: ${JSON.stringify(params.properties, null, 2)}`
      }]
    };
  }

  private async moveNode(args: any) {
    const params = MoveNodeSchema.parse(args);
    const response = await this.pluginBridge.sendToPlugin({
      id: uuidv4(),
      type: 'MOVE_NODE',
      payload: params
    });

    return {
      content: [{
        type: 'text',
        text: `✅ Moved node ${params.nodeId} to (${params.x}, ${params.y})`
      }]
    };
  }

  private async deleteNode(args: any) {
    const params = DeleteNodeSchema.parse(args);
    const response = await this.pluginBridge.sendToPlugin({
      id: uuidv4(),
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

  private async duplicateNode(args: any) {
    const params = DuplicateNodeSchema.parse(args);
    const response = await this.pluginBridge.sendToPlugin({
      id: uuidv4(),
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

  private async getSelection() {
    const response = await this.pluginBridge.sendToPlugin({
      id: uuidv4(),
      type: 'GET_SELECTION'
    });

    return {
      content: [{
        type: 'text',
        text: `📋 Current selection: ${JSON.stringify(response.data, null, 2)}`
      }]
    };
  }

  private async setSelection(args: any) {
    const params = SetSelectionSchema.parse(args);
    const response = await this.pluginBridge.sendToPlugin({
      id: uuidv4(),
      type: 'SET_SELECTION',
      payload: params
    });

    return {
      content: [{
        type: 'text',
        text: `✅ Set selection to nodes: ${params.nodeIds.join(', ')}`
      }]
    };
  }

  private async getPageNodes() {
    const response = await this.pluginBridge.sendToPlugin({
      id: uuidv4(),
      type: 'GET_PAGE_NODES'
    });

    return {
      content: [{
        type: 'text',
        text: `📄 Page nodes: ${JSON.stringify(response.data, null, 2)}`
      }]
    };
  }

  private async exportNode(args: any) {
    const params = ExportNodeSchema.parse(args);
    const response = await this.pluginBridge.sendToPlugin({
      id: uuidv4(),
      type: 'EXPORT_NODE',
      payload: params
    });

    return {
      content: [{
        type: 'text',
        text: `📸 Exported node ${params.nodeId} as ${params.format} at ${params.scale}x scale`
      }]
    };
  }

  private async getPluginStatus() {
    const status = this.pluginBridge.getStatus();
    return {
      content: [{
        type: 'text',
        text: `🔌 Plugin Status:
- Connected: ${status.pluginConnected ? '✅' : '❌'}
- Last Heartbeat: ${status.lastHeartbeat?.toISOString() || 'Never'}
- Active Clients: ${status.activeClients}
${!status.pluginConnected ? '\n⚠️  To enable write operations, please open Figma and run the companion plugin.' : ''}`
      }]
    };
  }

  public async start(): Promise<void> {
    console.log('🚀 Starting Figma MCP Write Server...');
    console.log(`📡 WebSocket server listening on port ${this.config.port + 1}`);
    console.log('🔌 Waiting for Figma plugin connection...');
    
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    console.log('✅ MCP Server started successfully');
    console.log('💡 Available tools: create_rectangle, create_ellipse, create_text, create_frame, update_node, move_node, delete_node, duplicate_node, get_selection, set_selection, get_page_nodes, export_node, get_plugin_status');
  }

  public async stop(): Promise<void> {
    console.log('🛑 Stopping Figma MCP Write Server...');
    this.pluginBridge.close();
    await this.server.close();
    console.log('✅ Server stopped');
  }

  public getServer(): Server {
    return this.server;
  }

  public getPluginBridge(): PluginBridge {
    return this.pluginBridge;
  }
}
