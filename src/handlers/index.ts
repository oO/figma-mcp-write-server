import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { ToolHandler, ToolResult } from '../types.js';
import { NodeHandlers } from './node-handlers.js';
import { SelectionHandlers } from './selection-handlers.js';
import { StyleHandlers } from './style-handlers.js';
import { LayoutHandlers } from './layout-handlers.js';

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
    
    // Add plugin status tool
    this.addPluginStatusTool();
  }

  private registerHandler(handler: ToolHandler): void {
    const tools = handler.getTools();
    tools.forEach(tool => {
      this.handlers.set(tool.name, handler);
      this.allTools.push(tool);
    });
  }

  private addPluginStatusTool(): void {
    this.allTools.push({
      name: 'get_plugin_status',
      description: 'Get the current status of the Figma plugin connection',
      inputSchema: { type: 'object', properties: {} }
    });
    
    this.allTools.push({
      name: 'get_connection_health',
      description: 'Get detailed connection health metrics and queue status',
      inputSchema: { type: 'object', properties: {} }
    });
  }

  getTools(): Tool[] {
    return this.allTools;
  }

  async handleToolCall(name: string, args: any): Promise<any> {
    // Special case for plugin status
    if (name === 'get_plugin_status') {
      return this.getPluginStatus();
    }
    
    // Special case for connection health
    if (name === 'get_connection_health') {
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
    return {
      content: [{
        type: 'text',
        text: '🟢 Plugin connection status: Active'
      }]
    };
  }
  
  private async getConnectionHealth(): Promise<any> {
    if (!this.wsServer) {
      return {
        content: [{
          type: 'text',
          text: '⚠️ Connection health monitoring not available'
        }]
      };
    }
    
    const status = this.wsServer.getConnectionStatus();
    const metrics = this.wsServer.getHealthMetrics();
    const queue = this.wsServer.getQueueStatus();
    
    const healthIcons = {
      'healthy': '🟢',
      'degraded': '🟡',
      'unhealthy': '🔴'
    } as const;
    const healthIcon = healthIcons[status.connectionHealth as keyof typeof healthIcons] || '⚪';
    
    const report = [
      `${healthIcon} Connection Health: ${status.connectionHealth.toUpperCase()}`,
      `🔌 Plugin Connected: ${status.pluginConnected ? 'Yes' : 'No'}`,
      `⏱️ Average Response Time: ${Math.round(status.averageResponseTime)}ms`,
      `📋 Queue Length: ${queue.length} requests`,
      `✅ Success Rate: ${metrics.successCount}/${metrics.successCount + metrics.errorCount} (${Math.round((metrics.successCount / (metrics.successCount + metrics.errorCount || 1)) * 100)}%)`,
      `🔄 Reconnect Attempts: ${status.reconnectAttempts}`,
      '',
      'Queue Details:',
      queue.requests.length > 0 ? queue.requests.map((req: string) => `  • ${req}`).join('\n') : '  (empty)'
    ];
    
    if (metrics.lastError) {
      report.push(`\n❌ Last Error: ${metrics.lastError}`);
    }
    
    return {
      content: [{
        type: 'text',
        text: report.join('\n')
      }]
    };
  }
}