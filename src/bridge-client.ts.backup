// Client that connects to the WebSocket bridge
import WebSocket from 'ws';
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';

export class BridgeClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private isConnected = false;
  private pendingRequests = new Map<string, {
    resolve: (value: any) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }>();
  private reconnectTimer: NodeJS.Timeout | null = null;

  constructor(private url: string = 'ws://localhost:3002') {
    super();
  }

  public async connect(): Promise<void> {
    if (this.isConnected) return;

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);

        this.ws.on('open', () => {
          console.log('🔗 Connected to WebSocket bridge');
          this.isConnected = true;
          if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
          }
          this.emit('connected');
          resolve();
        });

        this.ws.on('message', (data) => {
          try {
            const message = JSON.parse(data.toString());
            this.handleMessage(message);
          } catch (error) {
            console.error('❌ Error parsing bridge message:', error);
          }
        });

        this.ws.on('close', () => {
          console.log('❌ Disconnected from WebSocket bridge');
          this.isConnected = false;
          this.emit('disconnected');
          this.scheduleReconnect();
        });

        this.ws.on('error', (error) => {
          console.error('💥 Bridge connection error:', error);
          this.isConnected = false;
          reject(error);
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  private handleMessage(message: any): void {
    // Handle responses to our requests
    if (message.id && this.pendingRequests.has(message.id)) {
      const request = this.pendingRequests.get(message.id)!;
      clearTimeout(request.timeout);
      this.pendingRequests.delete(message.id);
      
      if (message.success) {
        request.resolve(message);
      } else {
        request.reject(new Error(message.error || 'Bridge operation failed'));
      }
      return;
    }

    // Handle other message types
    console.log('📨 Received from bridge:', message.type || 'unknown');
  }

  public async sendToPlugin(message: any): Promise<any> {
    if (!this.isConnected || !this.ws) {
      throw new Error('Not connected to bridge');
    }

    return new Promise((resolve, reject) => {
      const messageId = uuidv4();
      const messageWithId = { ...message, id: messageId };

      // Set up timeout
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(messageId);
        reject(new Error('Plugin request timeout'));
      }, 30000); // 30 second timeout

      // Store pending request
      this.pendingRequests.set(messageId, { resolve, reject, timeout });

      // Send message
      try {
        this.ws!.send(JSON.stringify(messageWithId));
        console.log('📤 Sent to plugin via bridge:', message.type);
      } catch (error) {
        this.pendingRequests.delete(messageId);
        clearTimeout(timeout);
        reject(error);
      }
    });
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    
    this.reconnectTimer = setTimeout(async () => {
      console.log('🔄 Attempting to reconnect to bridge...');
      try {
        await this.connect();
      } catch (error) {
        console.error('❌ Reconnection failed:', error);
        this.scheduleReconnect();
      }
    }, 5000);
  }

  public isPluginConnected(): boolean {
    return this.isConnected;
  }

  public getStatus() {
    return {
      pluginConnected: this.isConnected,
      lastHeartbeat: new Date(),
      activeClients: this.isConnected ? 1 : 0
    };
  }

  public close(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.isConnected = false;
  }
}