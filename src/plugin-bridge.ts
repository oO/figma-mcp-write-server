import WebSocket, { WebSocketServer } from 'ws';
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { 
  PluginMessage, 
  PluginResponse, 
  PluginMessageSchema, 
  PluginResponseSchema,
  ServerConfig,
  ConnectionStatus 
} from './types.js';

export class PluginBridge extends EventEmitter {
  private wss: WebSocketServer;
  private pluginSocket: WebSocket | null = null;
  private pendingRequests = new Map<string, {
    resolve: (value: PluginResponse) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }>();
  private config: ServerConfig;
  private status: ConnectionStatus = {
    pluginConnected: false,
    lastHeartbeat: null,
    activeClients: 0
  };

  constructor(config: ServerConfig) {
    super();
    this.config = config;
    this.wss = new WebSocketServer({ 
      port: config.port + 1, // Use a different port for WebSocket
      verifyClient: this.verifyClient.bind(this)
    });
    
    this.setupWebSocketServer();
    this.startHeartbeat();
  }

  private verifyClient(info: any): boolean {
    // In production, implement proper authentication
    // For now, we'll allow any connection
    return true;
  }

  private setupWebSocketServer(): void {
    this.wss.on('connection', (ws: WebSocket, request) => {
      console.log('🔌 New WebSocket connection established');
      console.log('📡 Connection from:', request.socket.remoteAddress);
      console.log('🔗 User-Agent:', request.headers['user-agent']);
      this.status.activeClients++;
      
      // Check if this is a plugin connection
      const userAgent = request.headers['user-agent'] || '';
      if (userAgent.includes('Figma') || request.url?.includes('plugin')) {
        this.handlePluginConnection(ws);
      }

      ws.on('message', (data: WebSocket.Data) => {
        this.handleMessage(ws, data);
      });

      ws.on('close', () => {
        console.log('WebSocket connection closed');
        this.status.activeClients--;
        if (ws === this.pluginSocket) {
          this.pluginSocket = null;
          this.status.pluginConnected = false;
          this.emit('plugin-disconnected');
        }
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
      });
    });
  }

  private handlePluginConnection(ws: WebSocket): void {
    console.log('Figma plugin connected');
    this.pluginSocket = ws;
    this.status.pluginConnected = true;
    this.status.lastHeartbeat = new Date();
    this.emit('plugin-connected');
  }

  private handleMessage(ws: WebSocket, data: WebSocket.Data): void {
    try {
      const message = JSON.parse(data.toString());
      
      // Handle plugin responses
      if (message.id && this.pendingRequests.has(message.id)) {
        const request = this.pendingRequests.get(message.id)!;
        clearTimeout(request.timeout);
        this.pendingRequests.delete(message.id);
        
        const response = PluginResponseSchema.parse(message);
        if (response.success) {
          request.resolve(response);
        } else {
          request.reject(new Error(response.error || 'Plugin operation failed'));
        }
        return;
      }
      
      // Handle plugin-initiated messages (like heartbeat)
      if (message.type === 'HEARTBEAT') {
        this.status.lastHeartbeat = new Date();
        this.sendToPlugin({ id: uuidv4(), type: 'HEARTBEAT', payload: { timestamp: Date.now() } });
        return;
      }
      
      // Emit other messages for external handling
      this.emit('message', message);
      
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  }

  private startHeartbeat(): void {
    setInterval(() => {
      if (this.status.pluginConnected && this.status.lastHeartbeat) {
        const timeSinceHeartbeat = Date.now() - this.status.lastHeartbeat.getTime();
        if (timeSinceHeartbeat > this.config.heartbeatInterval * 2) {
          console.warn('Plugin heartbeat timeout');
          this.status.pluginConnected = false;
          this.emit('plugin-timeout');
        }
      }
    }, this.config.heartbeatInterval);
  }

  public async sendToPlugin(message: PluginMessage): Promise<PluginResponse> {
    return new Promise((resolve, reject) => {
      if (!this.pluginSocket || !this.status.pluginConnected) {
        reject(new Error('Plugin not connected'));
        return;
      }

      // Validate message
      try {
        PluginMessageSchema.parse(message);
      } catch (error) {
        reject(new Error(`Invalid message format: ${error}`));
        return;
      }

      // Set up timeout
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(message.id);
        reject(new Error('Plugin request timeout'));
      }, 30000); // 30 second timeout

      // Store pending request
      this.pendingRequests.set(message.id, { resolve, reject, timeout });

      // Send message
      try {
        this.pluginSocket.send(JSON.stringify(message));
      } catch (error) {
        this.pendingRequests.delete(message.id);
        clearTimeout(timeout);
        reject(error);
      }
    });
  }

  public getStatus(): ConnectionStatus {
    return { ...this.status };
  }

  public isPluginConnected(): boolean {
    return this.status.pluginConnected;
  }

  public async waitForPlugin(timeout: number = 30000): Promise<void> {
    if (this.status.pluginConnected) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.off('plugin-connected', onConnected);
        reject(new Error('Timeout waiting for plugin connection'));
      }, timeout);

      const onConnected = () => {
        clearTimeout(timer);
        resolve();
      };

      this.once('plugin-connected', onConnected);
    });
  }

  public close(): void {
    // Clear all pending requests
    for (const [id, request] of this.pendingRequests) {
      clearTimeout(request.timeout);
      request.reject(new Error('Server shutting down'));
    }
    this.pendingRequests.clear();

    // Close WebSocket server
    this.wss.close();
  }
}
