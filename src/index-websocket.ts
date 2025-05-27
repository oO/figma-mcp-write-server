#!/usr/bin/env node

// Standalone WebSocket bridge that doesn't interfere with MCP stdio transport
import { WebSocketServer } from 'ws';
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';

console.log('🎨 Figma WebSocket Bridge Server');
console.log('================================');

class FigmaWebSocketBridge extends EventEmitter {
  private wss: WebSocketServer;
  private pluginSocket: any = null;
  private isConnected = false;

  constructor(port: number = 3002) {
    super();
    
    this.wss = new WebSocketServer({ 
      port,
      verifyClient: () => true // Allow all connections for now
    });
    
    this.setupServer();
    console.log(`🚀 WebSocket server listening on port ${port}`);
  }

  private setupServer(): void {
    this.wss.on('connection', (ws, request) => {
      console.log('🔌 New WebSocket connection established');
      console.log('📡 Connection from:', request.socket.remoteAddress);
      console.log('🔗 User-Agent:', request.headers['user-agent'] || 'Unknown');
      
      // Assume this is our Figma plugin
      this.pluginSocket = ws;
      this.isConnected = true;
      
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          console.log('📨 Received from plugin:', message.type || 'unknown');
          
          // Handle different message types
          if (message.type === 'PLUGIN_READY') {
            console.log('✅ Figma plugin is ready');
            this.sendToPlugin({
              id: message.id,
              success: true,
              data: { status: 'Bridge connected' }
            });
          } else if (message.type === 'HEARTBEAT') {
            // Echo heartbeat
            this.sendToPlugin({
              id: uuidv4(),
              type: 'HEARTBEAT',
              payload: { timestamp: Date.now() }
            });
          } else {
            // Echo back for testing
            this.sendToPlugin({
              id: message.id || uuidv4(),
              success: true,
              data: { received: message.type, timestamp: Date.now() }
            });
          }
        } catch (error) {
          console.error('❌ Error parsing message:', error);
        }
      });

      ws.on('close', () => {
        console.log('❌ Plugin disconnected');
        this.pluginSocket = null;
        this.isConnected = false;
      });

      ws.on('error', (error) => {
        console.error('💥 WebSocket error:', error);
        this.isConnected = false;
      });

      // Send welcome message
      setTimeout(() => {
        this.sendToPlugin({
          id: uuidv4(),
          type: 'WELCOME',
          payload: { 
            message: 'Bridge server ready',
            timestamp: Date.now()
          }
        });
      }, 100);
    });

    this.wss.on('error', (error) => {
      console.error('🚨 Server error:', error);
    });
  }

  private sendToPlugin(message: any): void {
    if (this.pluginSocket && this.isConnected) {
      try {
        this.pluginSocket.send(JSON.stringify(message));
        console.log('📤 Sent to plugin:', message.type || 'response');
      } catch (error) {
        console.error('❌ Failed to send message:', error);
      }
    } else {
      console.warn('⚠️ No plugin connected to send message to');
    }
  }

  public close(): void {
    console.log('🛑 Shutting down WebSocket bridge...');
    this.wss.close();
  }

  public isPluginConnected(): boolean {
    return this.isConnected;
  }
}

// Start the bridge
const bridge = new FigmaWebSocketBridge(3002);

// Handle graceful shutdown
const shutdown = () => {
  console.log('\n🛑 Shutting down...');
  bridge.close();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

console.log('🔌 Waiting for Figma plugin connection...');
console.log('💡 Plugin should connect to: ws://localhost:3002');