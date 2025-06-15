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
import * as os from "os";
import * as path from "path";

export class HandlerRegistry {
  private handlers = new Map<string, ToolHandler>();
  private allTools: Tool[] = [];
  private wsServer: any; // Reference to WebSocket server for health monitoring

  constructor(sendToPluginFn: (request: any) => Promise<any>, wsServer?: any) {
    this.wsServer = wsServer;
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
      name: "get_plugin_status",
      description: "Get the current status of the Figma plugin connection",
      inputSchema: { type: "object", properties: {} },
    });

    this.allTools.push({
      name: "get_connection_health",
      description: "Get detailed connection health metrics and queue status",
      inputSchema: { type: "object", properties: {} },
    });
  }

  getTools(): Tool[] {
    return this.allTools;
  }

  async handleToolCall(name: string, args: any): Promise<any> {
    // Special case for plugin status
    if (name === "get_plugin_status") {
      return this.getPluginStatus();
    }

    // Special case for connection health
    if (name === "get_connection_health") {
      return this.getConnectionHealth();
    }

    // Use the handler registry with priority based on operation type
    const handler = this.handlers.get(name);
    if (!handler) {
      throw new Error(`Unknown tool: ${name}`);
    }

    return await handler.handle(name, args);
  }

  private async getPluginStatus(): Promise<any> {
    const platform = os.platform();
    const data = {
      status: "active",
      connected: true,
      message: "Plugin connection is active",
      system: {
        platform: platform,
        arch: os.arch(),
        nodeVersion: process.version,
        defaultExportPath: this.getDefaultExportPath(platform),
      },
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

  private async getConnectionHealth(): Promise<any> {
    if (!this.wsServer) {
      const data = {
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

    const data = {
      connectionHealth: status.connectionHealth,
      pluginConnected: status.pluginConnected,
      averageResponseTime: Math.round(status.averageResponseTime),
      queueLength: queue.length,
      successRate: {
        successful: metrics.successCount,
        total: metrics.successCount + metrics.errorCount,
        percentage: Math.round(
          (metrics.successCount /
            (metrics.successCount + metrics.errorCount || 1)) *
            100,
        ),
      },
      reconnectAttempts: status.reconnectAttempts,
      queue: {
        length: queue.requests.length,
        requests: queue.requests,
      },
      lastError: metrics.lastError || null,
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
