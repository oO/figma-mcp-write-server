import { WebSocketServer } from 'ws';
import WebSocket from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { ServerConfig } from '../types.js';
import { checkPortAvailable, findZombieProcesses, killZombieProcesses, findAvailablePort } from '../utils/port-utils.js';

export class FigmaWebSocketServer {
  private wsServer: WebSocketServer | null = null;
  private pluginConnection: WebSocket | null = null;
  private config: ServerConfig;
  private pendingRequests = new Map<string, {
    resolve: (value: any) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }>();

  constructor(config: ServerConfig) {
    this.config = config;
  }

  async start(): Promise<void> {
    let port = this.config.port;
    let zombieProcesses: string[] = [];
    
    // Check if default port is available
    const isPortAvailable = await checkPortAvailable(port);
    
    if (!isPortAvailable) {
      console.error(`⚠️ Port ${port} is in use`);
      
      // Look for zombie processes
      zombieProcesses = await findZombieProcesses(port);
      
      if (zombieProcesses.length > 0) {
        console.error(`🧟 Found ${zombieProcesses.length} process(es) using port ${port}: ${zombieProcesses.join(', ')}`);
        console.error('🔪 Attempting to kill zombie processes...');
        
        await killZombieProcesses(zombieProcesses);
        
        // Check if port is now available
        if (await checkPortAvailable(port)) {
          console.error(`✅ Successfully freed port ${port}`);
        } else {
          console.error(`❌ Port ${port} still in use after cleanup`);
          
          // Find alternative port
          try {
            port = await findAvailablePort(port + 1);
            console.error(`🔄 Using alternative port ${port}`);
            this.config.port = port; // Update config
          } catch (error) {
            throw new Error(`Cannot start WebSocket server: ${error}`);
          }
        }
      } else {
        // Port in use but no zombie processes found - find alternative
        try {
          port = await findAvailablePort(port + 1);
          console.error(`🔄 Port ${this.config.port} in use, using alternative port ${port}`);
          this.config.port = port; // Update config
        } catch (error) {
          throw new Error(`Cannot start WebSocket server: ${error}`);
        }
      }
    }

    // Create WebSocket server
    this.wsServer = new WebSocketServer({ port });
    
    this.wsServer.on('error', (error: any) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${port} is still in use. Try a different port or kill existing processes.`);
        throw new Error(`WebSocket server failed to start: Port ${port} is in use`);
      } else {
        console.error('💥 WebSocket server error:', error);
        throw error;
      }
    });
    
    this.wsServer.on('connection', (ws) => {
      console.error('🔗 New WebSocket connection');
      
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(ws, message);
        } catch (error) {
          console.error('❌ Failed to parse WebSocket message:', error);
        }
      });
      
      ws.on('close', () => {
        if (ws === this.pluginConnection) {
          console.error('❌ Figma plugin disconnected');
          this.pluginConnection = null;
        }
      });
      
      ws.on('error', (error) => {
        console.error('💥 WebSocket error:', error);
      });
    });

    console.error(`🚀 WebSocket server started on port ${port}`);
  }

  private handleMessage(ws: WebSocket, message: any): void {
    if (message.type === 'PLUGIN_HELLO') {
      console.error('✅ Figma plugin connected');
      this.pluginConnection = ws;
      ws.send(JSON.stringify({ type: 'CONNECTED', role: 'plugin' }));
      return;
    }
    
    // Handle responses from plugin
    if (message.id && this.pendingRequests.has(message.id)) {
      const request = this.pendingRequests.get(message.id)!;
      clearTimeout(request.timeout);
      this.pendingRequests.delete(message.id);
      
      if (message.success) {
        request.resolve(message);
      } else {
        request.reject(new Error(message.error || 'Plugin operation failed'));
      }
    }
  }

  async sendToPlugin(request: any): Promise<any> {
    if (!this.pluginConnection) {
      throw new Error('Figma plugin not connected. Please run the plugin in Figma.');
    }

    const id = uuidv4();
    const fullRequest = { ...request, id };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error('Plugin request timeout after 30s'));
      }, 30000);

      this.pendingRequests.set(id, { resolve, reject, timeout });

      try {
        this.pluginConnection!.send(JSON.stringify(fullRequest));
        console.error('📤 Sent to plugin:', request.type);
      } catch (error) {
        this.pendingRequests.delete(id);
        clearTimeout(timeout);
        reject(error);
      }
    });
  }

  isPluginConnected(): boolean {
    return this.pluginConnection !== null;
  }

  getConnectionCount(): number {
    return this.wsServer?.clients.size || 0;
  }

  async stop(): Promise<void> {
    if (this.wsServer) {
      this.wsServer.close();
      this.wsServer = null;
    }
    this.pluginConnection = null;
    
    // Clear all pending requests
    for (const [id, request] of this.pendingRequests.entries()) {
      clearTimeout(request.timeout);
      request.reject(new Error('Server shutting down'));
    }
    this.pendingRequests.clear();
  }

  getConfig(): ServerConfig {
    return this.config;
  }
}