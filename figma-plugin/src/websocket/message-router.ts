import { PluginMessage, OperationResult, HandlerRegistry } from '../types.js';
import { logMessage, logWarning, logError } from '../utils/plugin-logger.js';

export class MessageRouter {
  private handlers: HandlerRegistry = {};
  private connected = false;
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private heartbeatInterval: number | null = null;
  private lastHeartbeat = Date.now();

  constructor(handlers: HandlerRegistry) {
    this.handlers = handlers;
  }

  async initialize(): Promise<void> {
    await this.connectToServer();
    this.setupUIHandlers();
  }

  private async connectToServer(): Promise<void> {
    try {
      this.ws = new WebSocket('ws://localhost:8765');
      
      this.ws.onopen = () => {
        logMessage('🔗 Connected to MCP server');
        this.connected = true;
        this.reconnectAttempts = 0;
        this.sendHello();
        this.startHeartbeat();
        this.notifyUI('connected', 'Connected to MCP server');
      };

      this.ws.onmessage = async (event) => {
        try {
          const message = JSON.parse(event.data) as PluginMessage;
          await this.handleMessage(message);
        } catch (error) {
          logError('Failed to parse message:', error);
        }
      };

      this.ws.onclose = () => {
        logMessage('Disconnected from MCP server');
        this.connected = false;
        this.stopHeartbeat();
        this.notifyUI('disconnected', 'Disconnected from MCP server');
        this.attemptReconnect();
      };

      this.ws.onerror = (error) => {
        logError('WebSocket error:', error);
        this.notifyUI('error', 'Connection error');
      };

    } catch (error) {
      logError('Failed to connect to server:', error);
      this.attemptReconnect();
    }
  }

  private sendHello(): void {
    this.sendToServer({
      type: 'PLUGIN_HELLO',
      payload: {
        pluginId: 'figma-mcp-write-plugin',
        version: PLUGIN_VERSION,
        timestamp: Date.now()
      }
    });
  }

  private async handleMessage(message: PluginMessage): Promise<void> {

    // Handle heartbeat
    if (message.type === 'HEARTBEAT') {
      this.handleHeartbeat();
      return;
    }

    // Handle batch requests
    if (message.type === 'BATCH_REQUEST') {
      await this.handleBatchRequest(message);
      return;
    }

    // Handle connection acknowledgment
    if (message.type === 'CONNECTED') {
      return;
    }

    // Handle individual operations
    if (this.handlers[message.type]) {
      const result = await this.executeOperation(message.type, message.payload);
      this.sendResponse(message.id!, result);
      return;
    }

    // Unhandled message type
  }

  private async executeOperation(operation: string, payload: any): Promise<OperationResult> {
    const handler = this.handlers[operation];
    
    if (!handler) {
      return {
        success: false,
        error: `Unknown operation: ${operation}`
      };
    }

    try {
      return await handler(payload);
    } catch (error) {
      // Operation failed
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private sendResponse(id: string, result: OperationResult): void {
    this.sendToServer(Object.assign({
      type: 'OPERATION_RESPONSE',
      id
    }, result));
  }

  private sendToServer(message: any): void {
    if (this.ws && this.connected) {
      this.ws.send(JSON.stringify(message));
    }
  }

  // Public methods for plugin logger
  public isConnected(): boolean {
    return this.connected;
  }

  public async send(message: any): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws && this.connected) {
        try {
          this.ws.send(JSON.stringify(message));
          resolve();
        } catch (error) {
          reject(error);
        }
      } else {
        reject(new Error('WebSocket not connected'));
      }
    });
  }

  private setupUIHandlers(): void {
    figma.ui.onmessage = async (msg) => {
      switch (msg.type) {
        case 'PLUGIN_OPERATION':
          await this.handleMessage(msg);
          break;
        case 'CLOSE':
          figma.closePlugin();
          break;
        case 'RECONNECT':
          await this.connectToServer();
          break;
        default:
          // Unknown UI message
      }
    };
  }

  private notifyUI(status: string, message: string): void {
    figma.ui.postMessage({
      type: 'CONNECTION_STATUS',
      status,
      message,
      timestamp: Date.now()
    });
  }

  private async attemptReconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.notifyUI('failed', 'Connection failed after multiple attempts');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    this.notifyUI('reconnecting', `Reconnecting... (attempt ${this.reconnectAttempts})`);

    setTimeout(() => {
      this.connectToServer();
    }, delay);
  }

  getConnectionStatus(): { connected: boolean; attempts: number } {
    return {
      connected: this.connected,
      attempts: this.reconnectAttempts
    };
  }

  async close(): Promise<void> {
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.connected = false;
  }
  
  private startHeartbeat(): void {
    this.stopHeartbeat();
    // Send immediate heartbeat upon connection
    this.sendHeartbeat();
    // Then continue with regular 30-second intervals
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, 30000) as any; // Send heartbeat every 30 seconds
  }
  
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }
  
  private sendHeartbeat(): void {
    this.sendToServer({
      type: 'HEARTBEAT',
      timestamp: Date.now()
    });
  }
  
  private handleHeartbeat(): void {
    this.lastHeartbeat = Date.now();
    this.sendToServer({
      type: 'HEARTBEAT_ACK',
      timestamp: Date.now()
    });
  }
  
  private async handleBatchRequest(message: any): Promise<void> {
    const batchId = message.payload?.batchId || message.batchId;
    const requests = message.payload?.requests || message.requests;
    
    if (!batchId || !requests) {
      return;
    }
    
    const responses = [];
    
    for (const request of requests) {
      try {
        if (this.handlers[request.type]) {
          try {
            const result = await this.executeOperation(request.type, request.payload);
            responses.push({
              id: request.id,
              result
            });
          } catch (error) {
            responses.push({
              id: request.id,
              error: error instanceof Error ? error.toString() : 'Unknown error'
            });
          }
        } else {
          responses.push({
            id: request.id,
            error: `Unknown operation: ${request.type}`
          });
        }
      } catch (error) {
        responses.push({
          id: request.id,
          error: error instanceof Error ? error.toString() : 'Unknown error'
        });
      }
    }
    
    // Send batch response
    this.sendToServer({
      type: 'BATCH_RESPONSE',
      batchId,
      responses
    });
  }
}