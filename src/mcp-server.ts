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

import { ServerConfig, LegacyServerConfig, DEFAULT_WS_CONFIG, loadConfig } from './types/index.js';
import { FigmaWebSocketServer } from './websocket/websocket-server.js';
import { HandlerRegistry } from './handlers/index.js';
import { FontService } from './services/font-service.js';
import { debugLog } from './utils/logger.js';

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
  private fontService: FontService | null = null;

  constructor(configOverrides: Partial<ServerConfig> = {}) {
    // Load config from file system with overrides
    this.config = { ...loadConfig(), ...configOverrides };
    
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

    // Initialize WebSocket server with legacy config
    const wsConfig: LegacyServerConfig = {
      ...DEFAULT_WS_CONFIG,
      port: this.config.port
    };
    this.wsServer = new FigmaWebSocketServer(wsConfig);

    // Initialize handler registry with WebSocket communication
    this.handlerRegistry = new HandlerRegistry(
      (request: any) => this.wsServer.sendToPlugin(request),
      this.wsServer
    );

    // Listen for plugin connection to initialize font database
    this.wsServer.on('pluginConnected', () => {
      debugLog('🔌 Plugin connected, initializing font database...');
      this.initializeFontDatabase();
    });

    // Wait for handler registration before setting up request handlers
    this.handlerRegistry.waitForHandlerRegistration().then(() => {
      this.setupHandlers();
    });
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
        const errorMessage = error instanceof Error ? error.toString() : String(error);
        
        const errorData = {
          error: errorMessage,
          tool: name,
          timestamp: new Date().toISOString()
        };
        
        return {
          content: [
            {
              type: "text",
              text: yaml.dump(errorData, { 
                indent: 2,
                quotingType: '"',
                forceQuotes: false
              })
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
    
    // Font database will be initialized when plugin connects
    debugLog('🚀 MCP server started, waiting for plugin connection...');
    
    // Reset health metrics after MCP server starts
    await this.resetHealthMetrics();
  }
  
  private async initializeFontDatabase(): Promise<void> {
    // Prevent multiple initializations
    if (this.fontService) {
      debugLog('🗄️ Font database already initialized', 'warning', undefined);
      return;
    }

    try {
      if (this.config.fontDatabase?.enabled !== false) {
        debugLog('🔤 Checking font database status...');
        
        // Create FontService which will handle database initialization and sync
        this.fontService = new FontService(
          (request: any) => this.wsServer.sendToPlugin(request),
          {
            databasePath: this.config.fontDatabase?.databasePath,
            enableDatabase: true
          }
        );
        
        debugLog('Font database service ready');
      } else {
        debugLog('🗄️ Font database disabled in configuration', 'warning', undefined);
      }
    } catch (error) {
      debugLog('Failed to initialize font database:', 'error', error);
    }
  }

  private async resetHealthMetrics(): Promise<void> {
    try {
      // Wait a moment for potential plugin connection, then reset metrics
      setTimeout(() => {
        this.wsServer.resetHealthMetrics();
      }, 500); // Short delay to allow any pending operations to complete
    } catch (error) {
      debugLog('Failed to reset health metrics:', 'error', error);
    }
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