import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import WebSocket, { WebSocketServer } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { createServer } from 'http';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
import { 
  CreateNodeSchema,
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
        version: '0.9.3',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  private async checkPortAvailable(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const testServer = createServer();
      
      testServer.listen(port, () => {
        testServer.close(() => resolve(true));
      });
      
      testServer.on('error', () => resolve(false));
    });
  }

  private async findZombieProcesses(port: number): Promise<string[]> {
    try {
      const { stdout } = await execAsync(`lsof -ti :${port}`);
      return stdout.trim().split('\n').filter(pid => pid);
    } catch (error) {
      // No processes found on port (which is good)
      return [];
    }
  }

  private async killZombieProcesses(pids: string[]): Promise<void> {
    for (const pid of pids) {
      try {
        console.error(`🧟 Killing zombie process ${pid} on port ${this.config.port}`);
        await execAsync(`kill -9 ${pid}`);
        // Wait a bit for process to actually die
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`⚠️ Could not kill process ${pid}:`, error);
      }
    }
  }

  private async findAvailablePort(startPort: number, maxTries: number = 10): Promise<number> {
    for (let port = startPort; port < startPort + maxTries; port++) {
      if (await this.checkPortAvailable(port)) {
        return port;
      }
    }
    throw new Error(`No available ports found in range ${startPort}-${startPort + maxTries - 1}`);
  }

  private async setupWebSocketServer(): Promise<void> {
    let port = this.config.port;
    let zombieProcesses: string[] = [];
    
    // Check if default port is available
    const isPortAvailable = await this.checkPortAvailable(port);
    
    if (!isPortAvailable) {
      console.error(`⚠️ Port ${port} is in use`);
      
      // Look for zombie processes
      zombieProcesses = await this.findZombieProcesses(port);
      
      if (zombieProcesses.length > 0) {
        console.error(`🧟 Found ${zombieProcesses.length} process(es) using port ${port}: ${zombieProcesses.join(', ')}`);
        console.error('🔪 Attempting to kill zombie processes...');
        
        await this.killZombieProcesses(zombieProcesses);
        
        // Check if port is now available
        if (await this.checkPortAvailable(port)) {
          console.error(`✅ Successfully freed port ${port}`);
        } else {
          console.error(`❌ Port ${port} still in use after cleanup`);
          
          // Find alternative port
          try {
            port = await this.findAvailablePort(port + 1);
            console.error(`🔄 Using alternative port ${port}`);
            this.config.port = port; // Update config
          } catch (error) {
            throw new Error(`Cannot start WebSocket server: ${error}`);
          }
        }
      } else {
        // Port in use but no zombie processes found - find alternative
        try {
          port = await this.findAvailablePort(port + 1);
          console.error(`🔄 Port ${this.config.port} in use, using alternative port ${port}`);
          this.config.port = port; // Update config
        } catch (error) {
          throw new Error(`Cannot start WebSocket server: ${error}`);
        }
      }
    }

    // Create WebSocket server
    this.wsServer = new WebSocketServer({ port });
    
    this.wsServer.on('error', (error: any) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${port} is still in use. Try a different port or kill existing processes.`);
        throw new Error(`WebSocket server failed to start: Port ${port} is in use`);
      } else {
        console.error('💥 WebSocket server error:', error);
        throw error;
      }
    });
    
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
          name: 'create_node',
          description: 'Create a node in Figma (rectangle, ellipse, text, or frame)',
          inputSchema: {
            type: 'object',
            properties: {
              nodeType: { 
                type: 'string', 
                enum: ['rectangle', 'ellipse', 'text', 'frame'],
                description: 'Type of node to create' 
              },
              x: { type: 'number', default: 0, description: 'X position' },
              y: { type: 'number', default: 0, description: 'Y position' },
              name: { type: 'string', description: 'Node name' },
              width: { type: 'number', description: 'Width (required for rectangle, ellipse, frame)' },
              height: { type: 'number', description: 'Height (required for rectangle, ellipse, frame)' },
              fillColor: { type: 'string', description: 'Fill color (hex)' },
              strokeColor: { type: 'string', description: 'Stroke color (hex)' },
              strokeWidth: { type: 'number', description: 'Stroke width' },
              content: { type: 'string', description: 'Text content (required for text nodes)' },
              fontSize: { type: 'number', default: 16, description: 'Font size (for text nodes)' },
              fontFamily: { type: 'string', default: 'Inter', description: 'Font family (for text nodes)' },
              textColor: { type: 'string', description: 'Text color (hex, for text nodes)' },
              backgroundColor: { type: 'string', description: 'Background color (hex, for frame nodes)' }
            },
            required: ['nodeType']
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
          'create_node', 'update_node', 'move_node', 'delete_node', 'duplicate_node', 'set_selection'
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
          case 'create_node':
            return await this.createNode(args);
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

  private async createNode(args: any) {
    try {
      const params = CreateNodeSchema.parse(args);
      
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
          case 'text':
            nodeParams.name = 'Text';
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

      // Set default text properties if not provided
      if (nodeParams.nodeType === 'text') {
        if (nodeParams.fontSize === undefined) nodeParams.fontSize = 16;
        if (nodeParams.fontFamily === undefined) nodeParams.fontFamily = 'Inter';
      }

      const response = await this.sendToPlugin({
        type: 'CREATE_NODE',
        payload: nodeParams
      });

      // Generate appropriate success message based on node type
      let message = `✅ Created ${nodeParams.nodeType} "${nodeParams.name}" at (${nodeParams.x}, ${nodeParams.y})`;
      
      if (nodeParams.nodeType === 'text') {
        message += ` with content "${nodeParams.content}"`;
        if (nodeParams.fontSize) message += ` and font size ${nodeParams.fontSize}px`;
      } else if (nodeParams.width && nodeParams.height) {
        message += ` with size ${nodeParams.width}x${nodeParams.height}`;
      }
      
      if (nodeParams.fillColor || nodeParams.backgroundColor) {
        message += ` with color ${nodeParams.fillColor || nodeParams.backgroundColor}`;
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
- Server Address: ws://localhost:${this.config.port}

${!this.pluginConnection ? 
  '⚠️ To enable write operations:\n1. Open Figma Desktop\n2. Go to Plugins → Development → Import plugin from manifest\n3. Select figma-plugin/manifest.json\n4. Run the plugin\n\n💡 If plugin won\'t connect, try: node dist/index.js --check-port ' + this.config.port : 
  '🎉 Ready for Figma operations!'}`
      }]
    };
  }

  public async start(): Promise<void> {
    console.error('🎨 Figma MCP Write Server');
    console.error('============================');
    console.error('🚀 Starting server...');
    
    try {
      // Setup WebSocket server with port management
      await this.setupWebSocketServer();
      
      // Connect MCP transport
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      
      console.error('✅ MCP Server started successfully');
      console.error(`🔌 WebSocket server running on port ${this.config.port}`);
      console.error('💡 Available tools: 13 total - create/update/move/delete/duplicate elements, manage selection, export, status');
      console.error('📱 Run the Figma plugin to enable write operations');
    } catch (error) {
      console.error('❌ Failed to start server:', error);
      throw error;
    }
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
