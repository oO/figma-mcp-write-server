import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import { ServerConfig, DEFAULT_CONFIG } from './types.js';
import { FigmaWebSocketServer } from './websocket/websocket-server.js';
import { HandlerRegistry } from './handlers/index.js';

// Get package version dynamically
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf8'));
const VERSION = packageJson.version;

export class FigmaMCPServer {
  private server: Server;
  private wsServer: FigmaWebSocketServer;
  private handlerRegistry: HandlerRegistry;
  private config: ServerConfig;

  constructor(config: Partial<ServerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    // Initialize MCP server
    this.server = new Server(
      {
        name: 'figma-mcp-write-server',
        version: VERSION,
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Initialize WebSocket server
    this.wsServer = new FigmaWebSocketServer(this.config);

    // Initialize handler registry with WebSocket communication
    this.handlerRegistry = new HandlerRegistry(
      (request: any) => this.wsServer.sendToPlugin(request)
    );

    this.setupHandlers();
  }

  private setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: this.handlerRegistry.getTools(),
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      console.error(`🔧 Executing tool: ${name}`);
      
      try {
        return await this.handlerRegistry.handleToolCall(name, args || {});
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`❌ Tool execution error [${name}]:`, errorMessage);
        
        return {
          content: [
            {
              type: "text",
              text: `❌ Error: ${errorMessage}`
            }
          ],
          isError: true
        };
      }
    });
  }

  async start(): Promise<void> {
    console.error('🚀 Starting Figma MCP Write Server...');
    
    // Start WebSocket server
    await this.wsServer.start();
    
    // Start MCP server
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    console.error(`✅ MCP Server started with WebSocket on port ${this.config.port}`);
    console.error('🎨 Figma plugin can connect to ws://localhost:' + this.config.port);
    console.error('💡 MCP clients should connect via stdio transport');
  }

  async stop(): Promise<void> {
    console.error('🛑 Stopping servers...');
    await this.wsServer.stop();
    await this.server.close();
    console.error('✅ Servers stopped');
  }

  getConnectionStatus() {
    return {
      pluginConnected: this.wsServer.isPluginConnected(),
      connectionCount: this.wsServer.getConnectionCount(),
      port: this.config.port
    };
  }

  getConfig(): ServerConfig {
    return this.config;
  }
}