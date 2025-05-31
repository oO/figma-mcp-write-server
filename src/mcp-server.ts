import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import WebSocket, { WebSocketServer } from 'ws';
import { v4 as uuidv4 } from 'uuid';
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
  private wsServer: WebSocketServer | null = null;
  private pluginConnection: WebSocket | null = null;
  private config: ServerConfig;
  private pendingRequests = new Map<string, {
    resolve: (value: any) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }>();

  constructor(config: Partial<ServerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.server = new Server(
      {
        name: 'figma-mcp-write-server',
        version: '1.0.2',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
    this.setupWebSocketServer();
  }

  private setupWebSocketServer(): void {
    this.wsServer = new WebSocketServer({ port: this.config.port });
    
    this.wsServer.on('connection', (ws) => {
      console.error('🔗 New WebSocket connection');
      
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleWebSocketMessage(ws, message);
        } catch (error) {
          console.error('❌ Failed to parse WebSocket message:', error);
        }
      });
      
      ws.on('close', () => {
        if (ws === this.pluginConnection) {
          console.error('❌ Figma plugin disconnected');
          this.pluginConnection = null;
        }
      });
      
      ws.on('error', (error) => {
        console.error('💥 WebSocket error:', error);
      });
    });
  }

  private handleWebSocketMessage(ws: WebSocket, message: any): void {
    if (message.type === 'PLUGIN_HELLO') {
      console.error('✅ Figma plugin connected');
      this.pluginConnection = ws;
      ws.send(JSON.stringify({ type: 'CONNECTED', role: 'plugin' }));
      return;
    }
    
    // Handle responses from plugin
    if (message.id && this.pendingRequests.has(message.id)) {
      const request = this.pendingRequests.get(message.id)!;
      clearTimeout(request.timeout);
      this.pendingRequests.delete(message.id);
      
      if (message.success) {
        request.resolve(message);
      } else {
        request.reject(new Error(message.error || 'Plugin operation failed'));
      }
    }
  }

  private async sendToPlugin(request: any): Promise<any> {
    if (!this.pluginConnection) {
      throw new Error('Figma plugin not connected. Please run the plugin in Figma.');
    }

    const id = uuidv4();
    const fullRequest = { ...request, id };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error('Plugin request timeout after 30s'));
      }, 30000);

      this.pendingRequests.set(id, { resolve, reject, timeout });

      try {
        this.pluginConnection!.send(JSON.stringify(fullRequest));
        console.error('📤 Sent to plugin:', request.type);
      } catch (error) {
        this.pendingRequests.delete(id);
        clearTimeout(timeout);
        reject(error);
      }
    });
  }

  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools: Tool[] = [
        {
          name: 'create_rectangle',
          description: 'Create a rectangle shape in Figma',
          inputSchema: {
            type: 'object',
            properties: {
              x: { type: 'number', default: 0, description: 'X position' },
              y: { type: 'number', default: 0, description: 'Y position' },
              width: { type: 'number', default: 100, description: 'Width' },
              height: { type: 'number', default: 100, description: 'Height' },
              name: { type: 'string', default: 'Rectangle', description: 'Shape name' },
              fillColor: { type: 'string', description: 'Fill color (hex)' },
              strokeColor: { type: 'string', description: 'Stroke color (hex)' },
              strokeWidth: { type: 'number', description: 'Stroke width' }
            }
          },
        },
        {
          name: 'create_ellipse',
          description: 'Create an ellipse/circle shape in Figma',
          inputSchema: {
            type: 'object',
            properties: {
              x: { type: 'number', default: 0 },
              y: { type: 'number', default: 0 },
              width: { type: 'number', default: 100 },
              height: { type: 'number', default: 100 },
              name: { type: 'string', default: 'Ellipse' },
              fillColor: { type: 'string' },
              strokeColor: { type: 'string' },
              strokeWidth: { type: 'number' }
            }
          },
        },
        {
          name: 'create_text',
          description: 'Create text in Figma',
          inputSchema: {
            type: 'object',
            properties: {
              x: { type: 'number', default: 0 },
              y: { type: 'number', default: 0 },
              content: { type: 'string', default: 'Text' },
              fontSize: { type: 'number', default: 16 },
              fontFamily: { type: 'string', default: 'Inter' },
              textColor: { type: 'string' },
              name: { type: 'string', default: 'Text' }
            }
          },
        },
        {
          name: 'create_frame',
          description: 'Create a frame container in Figma',
          inputSchema: {
            type: 'object',
            properties: {
              x: { type: 'number', default: 0 },
              y: { type: 'number', default: 0 },
              width: { type: 'number', default: 200 },
              height: { type: 'number', default: 200 },
              name: { type: 'string', default: 'Frame' },
              backgroundColor: { type: 'string' }
            }
          },
        },
        {
          name: 'update_node',
          description: 'Update properties of an existing node in Figma',
          inputSchema: {
            type: 'object',
            properties: {
              nodeId: { type: 'string', description: 'ID of the node to update' },
              properties: { 
                type: 'object', 
                description: 'Properties to update (e.g., {name: "New Name", x: 100})' 
              }
            },
            required: ['nodeId', 'properties']
          },
        },
        {
          name: 'move_node',
          description: 'Move a node to a new position in Figma',
          inputSchema: {
            type: 'object',
            properties: {
              nodeId: { type: 'string', description: 'ID of the node to move' },
              x: { type: 'number', description: 'New X position' },
              y: { type: 'number', description: 'New Y position' }
            },
            required: ['nodeId', 'x', 'y']
          },
        },
        {
          name: 'delete_node',
          description: 'Delete a node from Figma',
          inputSchema: {
            type: 'object',
            properties: {
              nodeId: { type: 'string', description: 'ID of the node to delete' }
            },
            required: ['nodeId']
          },
        },
        {
          name: 'duplicate_node',
          description: 'Duplicate a node in Figma',
          inputSchema: {
            type: 'object',
            properties: {
              nodeId: { type: 'string', description: 'ID of the node to duplicate' },
              offsetX: { type: 'number', default: 10, description: 'X offset for duplicate' },
              offsetY: { type: 'number', default: 10, description: 'Y offset for duplicate' }
            },
            required: ['nodeId']
          },
        },
        {
          name: 'set_selection',
          description: 'Set the selection to specific nodes in Figma',
          inputSchema: {
            type: 'object',
            properties: {
              nodeIds: { 
                type: 'array', 
                items: { type: 'string' },
                description: 'Array of node IDs to select' 
              }
            },
            required: ['nodeIds']
          },
        },
        {
          name: 'get_selection',
          description: 'Get currently selected nodes in Figma',
          inputSchema: {
            type: 'object',
            properties: {}
          },
        },
        {
          name: 'get_page_nodes',
          description: 'Get all nodes on the current page in Figma',
          inputSchema: {
            type: 'object',
            properties: {}
          },
        },
        {
          name: 'export_node',
          description: 'Export a node as an image from Figma',
          inputSchema: {
            type: 'object',
            properties: {
              nodeId: { type: 'string', description: 'ID of the node to export' },
              format: { 
                type: 'string', 
                enum: ['PNG', 'JPG', 'SVG', 'PDF'],
                default: 'PNG',
                description: 'Export format' 
              },
              scale: { type: 'number', default: 1, description: 'Export scale factor' }
            },
            required: ['nodeId']
          },
        },
        {
          name: 'get_plugin_status',
          description: 'Check if the Figma plugin is connected and ready',
          inputSchema: {
            type: 'object',
            properties: {}
          },
        }
      ];

      return { tools };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        // Check plugin connection for write operations
        const writeOperations = [
          'create_rectangle', 'create_ellipse', 'create_text', 'create_frame',
          'update_node', 'move_node', 'delete_node', 'duplicate_node', 'set_selection'
        ];

        if (writeOperations.includes(name) && !this.pluginConnection) {
          return {
            content: [{
              type: 'text',
              text: `❌ Error executing ${name}: Figma plugin not connected. Please run the plugin in Figma.`
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
          case 'set_selection':
            return await this.setSelection(args);
          case 'get_selection':
            return await this.getSelection();
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
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`❌ Tool execution error [${name}]:`, errorMessage);
        
        return {
          content: [{
            type: 'text',
            text: `❌ Error executing ${name}: ${errorMessage}`
          }]
        };
      }
    });
  }

  // Tool implementations

  private async createRectangle(args: any) {
    const params = CreateRectangleSchema.parse(args);
    
    try {
      const response = await this.sendToPlugin({
        type: 'CREATE_RECTANGLE',
        payload: params
      });

      return {
        content: [{
          type: 'text',
          text: `✅ Created rectangle "${params.name}" at (${params.x}, ${params.y}) with size ${params.width}x${params.height}${params.fillColor ? ` with color ${params.fillColor}` : ''}`
        }]
      };
    } catch (error) {
      throw new Error(`Failed to create rectangle: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async createEllipse(args: any) {
    const params = CreateEllipseSchema.parse(args);
    
    const response = await this.sendToPlugin({
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
    
    const response = await this.sendToPlugin({
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
    
    const response = await this.sendToPlugin({
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

  private async moveNode(args: any) {
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

  private async deleteNode(args: any) {
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

  private async duplicateNode(args: any) {
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

  private async setSelection(args: any) {
    const params = SetSelectionSchema.parse(args);
    
    const response = await this.sendToPlugin({
      type: 'SET_SELECTION',
      payload: params
    });

    return {
      content: [{
        type: 'text',
        text: `✅ Set selection to ${params.nodeIds.length} node(s): ${params.nodeIds.join(', ')}`
      }]
    };
  }

  private async getSelection() {
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

  private async getPageNodes() {
    const response = await this.sendToPlugin({
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
    
    const response = await this.sendToPlugin({
      type: 'EXPORT_NODE',
      payload: params
    });

    return {
      content: [{
        type: 'text',
        text: `✅ Exported node ${params.nodeId} as ${params.format} with scale ${params.scale}`
      }]
    };
  }

  private async getPluginStatus() {
    return {
      content: [{
        type: 'text',
        text: `🔌 Plugin Status:
- Connected: ${this.pluginConnection ? '✅' : '❌'}
- WebSocket Server: ${this.wsServer ? 'Running' : 'Stopped'} on port ${this.config.port}
- Pending Requests: ${this.pendingRequests.size}

${!this.pluginConnection ? 
  '⚠️ To enable write operations:\n1. Open Figma Desktop\n2. Go to Plugins → Development → Import plugin from manifest\n3. Select figma-plugin/manifest.json\n4. Run the plugin' : 
  '🎉 Ready for Figma operations!'}`
      }]
    };
  }

  public async start(): Promise<void> {
    console.error('🎨 Figma MCP Write Server');
    console.error('============================');
    console.error('🚀 Starting server...');
    
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    console.error('✅ MCP Server started successfully');
    console.error(`🔌 WebSocket server running on port ${this.config.port}`);
    console.error('💡 Available tools: 13 total - create/update/move/delete/duplicate elements, manage selection, export, status');
    console.error('📱 Run the Figma plugin to enable write operations');
  }

  public async stop(): Promise<void> {
    console.error('🛑 Stopping server...');
    
    // Clear pending requests
    for (const [id, request] of this.pendingRequests) {
      clearTimeout(request.timeout);
      request.reject(new Error('Server shutting down'));
    }
    this.pendingRequests.clear();
    
    // Close WebSocket server
    if (this.wsServer) {
      this.wsServer.close();
    }
    
    // Close MCP server
    await this.server.close();
    console.error('✅ Server stopped');
  }

  public isPluginConnected(): boolean {
    return this.pluginConnection !== null;
  }
}
