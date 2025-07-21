import { ToolHandler, Tool } from '../types/index.js';
import { PluginStatusSchema } from '../types/plugin-status-operations.js';
import { UnifiedHandler, UnifiedHandlerConfig } from '../utils/unified-handler.js';
import * as os from 'os';
import * as path from 'path';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';

// Get version from package.json
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageJson = JSON.parse(readFileSync(path.join(__dirname, "../../package.json"), "utf8"));
const VERSION = packageJson.version;

export class PluginStatusHandler implements ToolHandler {
  private unifiedHandler: UnifiedHandler;
  private wsServer: any; // WebSocket server instance for status monitoring

  constructor(sendToPluginFn: (request: any) => Promise<any>, wsServer?: any) {
    this.unifiedHandler = new UnifiedHandler(sendToPluginFn);
    this.wsServer = wsServer;
  }

  getTools(): Tool[] {
    return [
      {
        name: 'figma_plugin_status',
        description: 'Plugin diagnostics, connection status, and user information',
        inputSchema: {
          type: 'object',
          properties: {
            operation: {
              type: 'string',
              enum: ['ping', 'status', 'health', 'system', 'figma'],
              description: 'Plugin diagnostic operation to perform (case-insensitive: ping, status, health, system, figma)'
            },
            timeout: {
              type: 'number',
              minimum: 100,
              maximum: 30000,
              description: 'Ping timeout in milliseconds (default: 5000, only applies to ping operation)'
            },
          },
          required: ['operation']
        },
        examples: [
          '{"operation": "ping"}',
          '{"operation": "ping", "timeout": 3000}',
          '{"operation": "status"}',
          '{"operation": "health"}',
          '{"operation": "system"}',
          '{"operation": "figma"}'
        ]
      }
    ];
  }

  async handle(toolName: string, args: any): Promise<any> {
    if (toolName !== 'figma_plugin_status') {
      throw new Error(`Unknown tool: ${toolName}`);
    }

    const config: UnifiedHandlerConfig = {
      toolName: 'figma_plugin_status',
      operation: 'plugin_status',
      bulkParams: [], // Bulk operations not supported: plugin diagnostics are singular by nature
      paramConfigs: {
        operation: { expectedType: 'string' as const },
        timeout: { expectedType: 'number' as const }
      },
      pluginMessageType: 'PLUGIN_STATUS',
      schema: PluginStatusSchema,
      operationParameters: {
        ping: ['timeout'],
        status: [],
        health: [],
        system: [],
        figma: []
      },
      customHandler: async (normalizedArgs) => {
        // Route to appropriate operation
        switch (normalizedArgs.operation) {
          case 'ping':
            return await this.handlePing(normalizedArgs);
          case 'status':
            return await this.handleStatus(normalizedArgs);
          case 'health':
            return await this.handleHealth(normalizedArgs);
          case 'system':
            return await this.handleSystem(normalizedArgs);
          case 'figma':
            return await this.handleFigma(normalizedArgs);
          default:
            throw new Error(`Unsupported operation: ${normalizedArgs.operation}`);
        }
      }
    };

    return this.unifiedHandler.handle(args, config);
  }

  private async handlePing(args: any): Promise<any> {
    const timeout = args.timeout || 5000; // Default 5 seconds, configurable
    const startTime = Date.now();

    const pingPromise = this.unifiedHandler.sendPluginRequest({
      type: 'PING_TEST',
      payload: { 
        operation: 'ping',
        requestType: 'ping', // Add context for plugin handler
        timestamp: startTime 
      }
    });

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Plugin ping timeout after ${timeout}ms - plugin may be unresponsive`)), timeout);
    });

    const response = await Promise.race([pingPromise, timeoutPromise]);
    const endTime = Date.now();
    const responseTime = endTime - startTime;

    // KISS: Return data directly (errors are thrown by WebSocket layer)
    return {
      responseTime: `${responseTime}ms`,
      timeout: `${timeout}ms`,
      timestamp: new Date().toISOString(),
      plugin: {
        pong: response?.pong || false,
        version: response?.pluginVersion || 'unknown',
        roundTripTime: response?.roundTripTime || responseTime
      }
    };
  }

  private async handleStatus(args: any): Promise<any> {
    if (this.wsServer) {
      const status = this.wsServer.getConnectionStatus();
      const queueStatus = this.wsServer.getQueueStatus();
      
      return {
        version: VERSION,
        connected: status.pluginConnected,
        status: this.mapConnectionStatus(status),
        lastResponse: status.lastHeartbeat ? new Date(status.lastHeartbeat).toISOString() : null,
        queueLength: queueStatus.length,
        port: this.wsServer.getConfig().port
      };
    } else {
      return {
        version: VERSION,
        connected: false,
        status: "disconnected",
        lastResponse: null,
        queueLength: 0
      };
    }
  }

  private async handleFigma(args: any): Promise<any> {
    const response = await this.unifiedHandler.sendPluginRequest({
      type: 'PLUGIN_STATUS',
      payload: { operation: 'figma_info' }
    });

    // Return all data from plugin response (errors are thrown by WebSocket layer)
    return response;
  }

  private async handleHealth(args: any): Promise<any> {
    const healthData = await this.getHealthMetrics();
    return {
      version: VERSION,
      ...healthData
    };
  }

  private async handleSystem(args: any): Promise<any> {
    const platform = os.platform();
    
    return {
      version: VERSION,
      platform: platform,
      arch: os.arch(),
      nodeVersion: process.version,
      defaultExportPath: this.getDefaultExportPath(platform),
      port: this.wsServer ? this.wsServer.getConfig().port : null
    };
  }

  private mapConnectionStatus(status: any): string {
    if (!status.pluginConnected) return "disconnected";
    if (status.connectionHealth === "healthy") return "ready";
    if (status.connectionHealth === "degraded") return "busy";
    return "error";
  }

  private getDefaultExportPath(platform: string): string {
    switch (platform) {
      case 'darwin':
        return `${os.homedir()}/Downloads`;
      case 'win32':
        return `${os.homedir()}\\Downloads`;
      default:
        return `${os.homedir()}/Downloads`;
    }
  }

  private async getHealthMetrics(): Promise<any> {
    if (!this.wsServer) {
      return {
        available: false,
        message: "Connection health monitoring not available"
      };
    }

    const status = this.wsServer.getConnectionStatus();
    const metrics = this.wsServer.getHealthMetrics();
    const queue = this.wsServer.getQueueStatus();
    
    // Calculate health score (0-100)
    let healthScore = 100;
    if (!status.pluginConnected) healthScore -= 50;
    if (status.connectionHealth === 'degraded') healthScore -= 20;
    if (status.connectionHealth === 'unhealthy') healthScore -= 40;
    if (status.averageResponseTime > 5000) healthScore -= 15;
    if (queue.length > 10) healthScore -= 10;
    if (metrics.errorCount > metrics.successCount) healthScore -= 15;

    healthScore = Math.max(0, Math.min(100, healthScore));

    return {
      available: true,
      connectionMetrics: {
        uptime: status.lastHeartbeat ? Date.now() - new Date(status.lastHeartbeat).getTime() : 0,
        totalRequests: metrics.successCount + metrics.errorCount,
        failedRequests: metrics.errorCount,
        averageResponseTime: Math.round(status.averageResponseTime),
        errorRate: metrics.successCount + metrics.errorCount > 0
          ? Math.round((metrics.errorCount / (metrics.successCount + metrics.errorCount)) * 100)
          : 0
      },
      queueStatus: {
        pending: queue.length,
        processing: 0, // This would need to be tracked separately
        failed: metrics.errorCount,
        maxQueueSize: 50 // From config or constant
      },
      recentErrors: metrics.lastError ? [{
        timestamp: new Date().toISOString(),
        error: metrics.lastError,
        operation: 'unknown'
      }] : [],
      healthScore
    };
  }


}