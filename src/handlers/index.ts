import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { ToolHandler, ToolResult } from "../types/index.js";
import * as yaml from "js-yaml";
import { NodeHandlers } from "./node-handlers.js";
import { SelectionHandlers } from "./selection-handlers.js";
import { StyleHandlers } from "./style-handlers.js";
import { LayoutHandlers } from "./layout-handlers.js";
import { ComponentHandlers } from "./component-handlers.js";
import { VariableHandlers } from "./variable-handlers.js";
import { BooleanHandlers } from "./boolean-handlers.js";
import { DevModeHandlers } from "./dev-mode-handlers.js";
import { ExportHandlers } from "./export-handlers.js";
import { ImageHandlers } from "./image-handlers.js";
import { FontHandlers } from "./font-handlers.js";
import { TextHandlers } from "./text-handlers.js";
import { getDefaultPaths } from "../config/config.js";
import * as os from "os";
import * as path from "path";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";

// Get version from package.json
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageJson = JSON.parse(readFileSync(path.join(__dirname, "../../package.json"), "utf8"));
const VERSION = packageJson.version;

export class HandlerRegistry {
  private handlers = new Map<string, ToolHandler>();
  private allTools: Tool[] = [];
  private wsServer: any; // Reference to WebSocket server for health monitoring
  private sendToPlugin: (request: any) => Promise<any>;

  constructor(sendToPluginFn: (request: any) => Promise<any>, wsServer?: any) {
    this.wsServer = wsServer;
    this.sendToPlugin = sendToPluginFn;
    
    // Database configuration for font handlers
    const paths = getDefaultPaths();
    const fontDbConfig = {
      databasePath: paths.databasePath,
      enableDatabase: true
    };
    
    // Auto-register all handlers
    this.registerHandler(new NodeHandlers(sendToPluginFn));
    this.registerHandler(new SelectionHandlers(sendToPluginFn));
    this.registerHandler(new StyleHandlers(sendToPluginFn));
    this.registerHandler(new LayoutHandlers(sendToPluginFn));
    this.registerHandler(new ComponentHandlers(sendToPluginFn));
    this.registerHandler(new VariableHandlers(sendToPluginFn));
    this.registerHandler(new BooleanHandlers(sendToPluginFn));
    this.registerHandler(new DevModeHandlers(sendToPluginFn));
    this.registerHandler(new ExportHandlers(sendToPluginFn));
    this.registerHandler(new ImageHandlers(sendToPluginFn));
    this.registerHandler(new FontHandlers(sendToPluginFn, fontDbConfig));
    this.registerHandler(new TextHandlers(sendToPluginFn));

    // Add plugin status tool
    this.addPluginStatusTool();
  }

  private registerHandler(handler: ToolHandler): void {
    const tools = handler.getTools();
    tools.forEach((tool) => {
      this.handlers.set(tool.name, handler);
      this.allTools.push(tool);
    });
  }

  private addPluginStatusTool(): void {
    this.allTools.push({
      name: "figma_plugin_status",
      description: "Get connection status, health metrics, or test plugin connectivity with unified diagnostics",
      inputSchema: {
        type: "object",
        properties: {
          operation: {
            type: "string",
            enum: ["status", "health", "test"],
            default: "status",
            description: "Type of diagnostic: status (basic info), health (detailed metrics), test (active verification)"
          },
          testType: {
            type: "string",
            enum: ["ping", "create_test_node", "get_selection"],
            default: "ping",
            description: "Type of connection test (only for test operation)"
          },
          timeout: {
            type: "number",
            default: 5000,
            description: "Test timeout in milliseconds (only for test operation)"
          }
        }
      }
    });

  }

  getTools(): Tool[] {
    return this.allTools;
  }

  async handleToolCall(name: string, args: any): Promise<any> {
    // Unified plugin status with operation modes
    if (name === "figma_plugin_status") {
      return this.getPluginStatus(args);
    }


    // Use the handler registry with priority based on operation type
    const handler = this.handlers.get(name);
    if (!handler) {
      throw new Error(`Unknown tool: ${name}`);
    }

    return await handler.handle(name, args);
  }

  private async getPluginStatus(args: any = {}): Promise<any> {
    const operation = args.operation || 'status';
    
    switch (operation) {
      case 'status':
        return this.getBasicStatus();
      case 'health':
        return this.getHealthStatus();
      case 'test':
        return this.getTestStatus(args);
      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  }

  private async getBasicStatus(): Promise<any> {
    const platform = os.platform();
    
    let connectionData;
    if (this.wsServer) {
      const status = this.wsServer.getConnectionStatus();
      const queueStatus = this.wsServer.getQueueStatus();
      
      connectionData = {
        operation: "status",
        version: VERSION,
        connected: status.pluginConnected,
        status: this.mapConnectionStatus(status),
        lastResponse: status.lastHeartbeat ? new Date(status.lastHeartbeat).toISOString() : null,
        queueLength: queueStatus.length,
        port: this.wsServer.getConfig().port,
        system: {
          platform: platform,
          arch: os.arch(),
          nodeVersion: process.version,
          defaultExportPath: this.getDefaultExportPath(platform),
        }
      };
    } else {
      connectionData = {
        operation: "status",
        version: VERSION,
        connected: false,
        status: "disconnected",
        lastResponse: null,
        queueLength: 0,
        system: {
          platform: platform,
          arch: os.arch(),
          nodeVersion: process.version,
          defaultExportPath: this.getDefaultExportPath(platform),
        }
      };
    }

    return {
      content: [
        {
          type: "text",
          text: yaml.dump(connectionData, { indent: 2, lineWidth: 100 }),
        },
      ],
      isError: false,
    };
  }

  private mapConnectionStatus(status: any): string {
    if (!status.pluginConnected) return "disconnected";
    if (status.connectionHealth === "healthy") return "ready";
    if (status.connectionHealth === "degraded") return "busy";
    return "error";
  }

  private async getHealthStatus(): Promise<any> {
    if (!this.wsServer) {
      const data = {
        operation: "health",
        version: VERSION,
        available: false,
        message: "Connection health monitoring not available",
      };
      return {
        content: [
          {
            type: "text",
            text: yaml.dump(data, { indent: 2, lineWidth: 100 }),
          },
        ],
        isError: false,
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

    const data = {
      operation: "health",
      version: VERSION,
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

    return {
      content: [
        {
          type: "text",
          text: yaml.dump(data, { indent: 2, lineWidth: 100 }),
        },
      ],
      isError: false,
    };
  }

  private async getTestStatus(args: any): Promise<any> {
    const testType = args.testType || 'ping';
    const timeout = args.timeout || 5000;
    
    const startTime = Date.now();
    let testResult;
    
    try {
      testResult = await this.performConnectionTest(testType, timeout);
      testResult.responseTime = Date.now() - startTime;
    } catch (error) {
      testResult = {
        success: false,
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    const data = {
      operation: "test",
      version: VERSION,
      testType,
      timeout,
      testResult
    };

    return {
      content: [
        {
          type: "text",
          text: yaml.dump(data, { indent: 2, lineWidth: 100 }),
        },
      ],
      isError: !testResult.success,
    };
  }

  private async performConnectionTest(testType: string, timeout: number): Promise<any> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      let response;
      
      switch (testType) {
        case 'ping':
          response = await this.sendToPlugin({
            type: 'PING_TEST',
            payload: { timestamp: Date.now() }
          });
          break;
        case 'create_test_node':
          const testStartTime = Date.now();
          let nodeId: string | null = null;
          
          try {
            // Create test node (small and on-screen for faster performance)
            response = await this.sendToPlugin({
              type: 'CREATE_NODE',
              payload: {
                nodeType: 'rectangle',
                name: `connection_test_${Date.now()}`,
                x: 0,
                y: 0,
                width: 1,
                height: 1
              }
            });
            
            if (response && response.success && response.data?.id) {
              nodeId = response.data.id;
              
              // Delete the test node using direct deletion
              const deleteResponse = await this.sendToPlugin({
                type: 'DELETE_NODE',
                payload: { nodeId }
              });
              
              if (deleteResponse && deleteResponse.success) {
                // Clear selection to avoid leaving test state in UI
                try {
                  await this.sendToPlugin({
                    type: 'CLEAR_SELECTION',
                    payload: {}
                  });
                } catch (clearError) {
                  // Ignore selection clearing errors - not critical
                }
                
                response.data.cleanupPerformed = true;
                response.data.cleanupTime = Date.now() - testStartTime;
              } else {
                response.data.cleanupWarning = 'Failed to cleanup test node - deletion failed';
                response.data.cleanupError = deleteResponse?.error || 'Unknown deletion error';
              }
            }
          } catch (error) {
            // If something goes wrong, ensure we still try cleanup
            if (nodeId) {
              try {
                await this.sendToPlugin({
                  type: 'DELETE_NODE',
                  payload: { nodeId }
                });
              } catch (cleanupError) {
                // Ignore cleanup errors during error handling
              }
            }
            throw error;
          }
          break;
        case 'get_selection':
          response = await this.sendToPlugin({
            type: 'GET_SELECTION',
            payload: {}
          });
          break;
        default:
          throw new Error(`Unknown test type: ${testType}`);
      }
      
      clearTimeout(timeoutId);
      
      if (response && response.success) {
        return {
          success: true,
          details: response.data
        };
      } else {
        throw new Error('Plugin test failed');
      }
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }


  private getDefaultExportPath(platform: string): string {
    const homeDir = os.homedir();

    switch (platform) {
      case "win32":
        return path.join(homeDir, "Documents", "Figma Exports");
      case "darwin":
        return path.join(homeDir, "Downloads", "Figma Exports");
      default:
        throw new Error(
          `Unsupported platform: ${platform}. This export system only supports Windows (win32) and macOS (darwin).`,
        );
    }
  }
}
