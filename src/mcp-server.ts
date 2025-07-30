import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import * as yaml from 'js-yaml';

import { ServerConfig, LegacyServerConfig, DEFAULT_WS_CONFIG, loadConfig } from './types/index.js';
import { FigmaWebSocketServer } from './websocket/websocket-server.js';
import { HandlerRegistry } from './handlers/index.js';
import { ResourceRegistry } from './resources/index.js';
import { FontService } from './services/font-service.js';
import { logger } from './utils/logger.js';

// Get package version dynamically
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf8'));
const VERSION = packageJson.version;

export class FigmaMCPServer {
  private server: Server;
  private wsServer: FigmaWebSocketServer;
  private handlerRegistry: HandlerRegistry;
  private resourceRegistry: ResourceRegistry;
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
          resources: {},
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
      this.wsServer,
      () => this.fontService // Provide FontService accessor
    );

    // Initialize resource registry
    this.resourceRegistry = new ResourceRegistry(
      (request: any) => this.wsServer.sendToPlugin(request)
    );

    // Listen for plugin connection to trigger sync if needed
    this.wsServer.on('pluginConnected', () => {
      this.onPluginConnected();
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

    // List available resources
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      return {
        resources: await this.resourceRegistry.getResources(),
      };
    });

    // Handle resource requests
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;
      
      logger.log(`📄 MCP resource request: ${uri}`);
      
      try {
        return await this.resourceRegistry.getResourceContent(uri);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.toString() : String(error);
        
        return {
          uri: uri,
          contents: [
            {
              uri: uri,
              text: JSON.stringify({
                error: errorMessage,
                uri: uri,
                timestamp: new Date().toISOString()
              }, null, 2)
            }
          ]
        };
      }
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      logger.log(`🔧 MCP tool call received: ${name}`, args);
      
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
    
    // Initialize font database immediately (check state first)
    await this.initializeFontDatabase();
    
    logger.log('🚀 MCP server started, waiting for plugin connection...', {
      version: VERSION,
      pid: process.pid,
      parentPid: process.ppid
    });
    
    // Reset health metrics after MCP server starts
    await this.resetHealthMetrics();
  }
  
  private async initializeFontDatabase(): Promise<void> {
    // Prevent multiple initializations
    if (this.fontService) {
      return;
    }

    try {
      if (this.config.fontDatabase?.enabled !== false) {
        // Create FontService which will handle database initialization
        this.fontService = new FontService(
          (request: any) => this.wsServer.sendToPlugin(request),
          {
            databasePath: this.config.fontDatabase?.databasePath,
            enableDatabase: true
          }
        );
      }
    } catch (error) {
      logger.warn('Failed to initialize font database:', error);
    }
  }

  private async onPluginConnected(): Promise<void> {
    logger.log('🔤 Checking font database status...');
    if (this.fontService) {
      // Check if sync is needed now that plugin is connected
      await this.fontService.checkAndSyncIfNeeded();
    } else {
      logger.log('🔤 Font Service not available');
    }
  }

  private async resetHealthMetrics(): Promise<void> {
    try {
      // Wait a moment for potential plugin connection, then reset metrics
      setTimeout(() => {
        this.wsServer.resetHealthMetrics();
      }, 500); // Short delay to allow any pending operations to complete
    } catch (error) {
      logger.error('Failed to reset health metrics:', error);
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