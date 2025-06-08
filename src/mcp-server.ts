import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import * as yaml from 'js-yaml';

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
      (request: any) => this.wsServer.sendToPlugin(request),
      this.wsServer
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
      
      try {
        return await this.handlerRegistry.handleToolCall(name, args || {});
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        const errorData = {
          error: errorMessage,
          tool: name,
          timestamp: new Date().toISOString()
        };
        
        return {
          content: [
            {
              type: "text",
              text: yaml.dump(errorData, { indent: 2, lineWidth: 100 })
            }
          ],
          isError: true
        };
      }
    });
  }

  async start(): Promise<void> {
    // Start WebSocket server
    await this.wsServer.start();
    
    // Start MCP server
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
  }

  async stop(): Promise<void> {
    await this.wsServer.stop();
    await this.server.close();
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