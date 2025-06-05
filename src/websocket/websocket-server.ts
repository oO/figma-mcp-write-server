import { WebSocketServer } from 'ws';
import WebSocket from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { ServerConfig, QueuedRequest, RequestBatch, RequestPriority, ConnectionStatus, HealthMetrics, validateAndParse, TypedPluginMessage, TypedPluginResponse } from '../types.js';
import { checkPortAvailable, findZombieProcesses, killZombieProcesses, findAvailablePort } from '../utils/port-utils.js';

export class FigmaWebSocketServer {
  private wsServer: WebSocketServer | null = null;
  private pluginConnection: WebSocket | null = null;
  private config: ServerConfig;
  
  // Enhanced request management
  private requestQueue: QueuedRequest[] = [];
  private pendingBatches = new Map<string, RequestBatch>();
  private batchTimer: NodeJS.Timeout | null = null;
  
  // Connection health monitoring
  private connectionStatus: ConnectionStatus;
  private healthMetrics: HealthMetrics;
  private healthCheckTimer: NodeJS.Timeout | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;

  constructor(config: ServerConfig) {
    this.config = config;
    
    // Initialize connection status
    this.connectionStatus = {
      pluginConnected: false,
      lastHeartbeat: null,
      activeClients: 0,
      connectionHealth: 'unhealthy',
      reconnectAttempts: 0,
      averageResponseTime: 0,
      queuedRequests: 0
    };
    
    // Initialize health metrics
    this.healthMetrics = {
      responseTime: [],
      errorCount: 0,
      successCount: 0,
      lastError: null,
      lastSuccess: null
    };
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
          this.connectionStatus.pluginConnected = false;
          this.connectionStatus.connectionHealth = 'unhealthy';
          
          // Attempt reconnection if configured
          this.attemptReconnection();
        }
      });
      
      // Start heartbeat for this connection
      this.startHeartbeat(ws);
      
      // Update connection count
      this.connectionStatus.activeClients = this.wsServer?.clients.size || 0;
      
      ws.on('error', (error) => {
        console.error('💥 WebSocket error:', error);
      });
    });

    console.error(`🚀 WebSocket server started on port ${port}`);
    
    // Start health monitoring
    this.startHealthMonitoring();
    console.error('🟡 Health monitoring started');
  }
  
  private startHealthMonitoring(): void {
    this.healthCheckTimer = setInterval(() => {
      this.updateConnectionHealth();
      this.cleanupStaleRequests();
    }, this.config.communication.healthCheckInterval);
  }
  
  private updateConnectionHealth(): void {
    const now = Date.now();
    
    // Calculate average response time
    if (this.healthMetrics.responseTime.length > 0) {
      this.connectionStatus.averageResponseTime = 
        this.healthMetrics.responseTime.reduce((a, b) => a + b, 0) / this.healthMetrics.responseTime.length;
    }
    
    // Update queue count
    this.connectionStatus.queuedRequests = this.requestQueue.length;
    
    // Determine health status
    if (!this.pluginConnection) {
      this.connectionStatus.connectionHealth = 'unhealthy';
    } else if (this.connectionStatus.averageResponseTime > 10000 || this.requestQueue.length > 20) {
      this.connectionStatus.connectionHealth = 'degraded';
    } else {
      this.connectionStatus.connectionHealth = 'healthy';
    }
  }
  
  private cleanupStaleRequests(): void {
    const now = Date.now();
    const staleThreshold = 60000; // 60 seconds
    
    this.requestQueue = this.requestQueue.filter(request => {
      if (now - request.timestamp > staleThreshold) {
        clearTimeout(request.timeout);
        request.reject(new Error('Request timed out (stale)'));
        return false;
      }
      return true;
    });
  }

  private handleMessage(ws: WebSocket, message: any): void {
    if (message.type === 'PLUGIN_HELLO') {
      console.error('✅ Figma plugin connected');
      this.pluginConnection = ws;
      this.connectionStatus.pluginConnected = true;
      this.connectionStatus.connectionHealth = 'healthy';
      this.connectionStatus.reconnectAttempts = 0;
      ws.send(JSON.stringify({ type: 'CONNECTED', role: 'plugin' }));
      
      // Process any queued requests
      this.processRequestQueue();
      return;
    }
    
    // Handle heartbeat
    if (message.type === 'HEARTBEAT') {
      this.connectionStatus.lastHeartbeat = new Date();
      ws.send(JSON.stringify({ type: 'HEARTBEAT_ACK' }));
      return;
    }
    
    // Handle batch responses
    if (message.type === 'BATCH_RESPONSE' && message.batchId) {
      this.handleBatchResponse(message);
      return;
    }
    
    // Handle individual responses
    if (message.id) {
      this.handleIndividualResponse(message);
    }
  }
  
  private handleIndividualResponse(message: any): void {
    // Find request in queue
    const requestIndex = this.requestQueue.findIndex(req => req.id === message.id);
    if (requestIndex === -1) return;
    
    const request = this.requestQueue[requestIndex]!;
    this.requestQueue.splice(requestIndex, 1);
    
    // Record metrics
    const responseTime = Date.now() - request.timestamp;
    this.recordResponseTime(responseTime);
    
    clearTimeout(request.timeout);
    
    if (message.success) {
      this.healthMetrics.successCount++;
      this.healthMetrics.lastSuccess = new Date();
      request.resolve(message);
    } else {
      this.healthMetrics.errorCount++;
      this.healthMetrics.lastError = message.error || 'Plugin operation failed';
      request.reject(new Error(message.error || 'Plugin operation failed'));
    }
  }
  
  private handleBatchResponse(message: any): void {
    const batch = this.pendingBatches.get(message.batchId);
    if (!batch) return;
    
    clearTimeout(batch.timeout);
    this.pendingBatches.delete(message.batchId);
    
    // Process each response in the batch
    message.responses.forEach((response: any, index: number) => {
      if (index < batch.requests.length) {
        const request = batch.requests[index]!;
        const responseTime = Date.now() - request.timestamp;
        this.recordResponseTime(responseTime);
        
        if (response.success) {
          this.healthMetrics.successCount++;
          request.resolve(response);
        } else {
          this.healthMetrics.errorCount++;
          request.reject(new Error(response.error || 'Batch operation failed'));
        }
      }
    });
  }
  
  private recordResponseTime(time: number): void {
    this.healthMetrics.responseTime.push(time);
    
    // Keep only last 100 measurements
    if (this.healthMetrics.responseTime.length > 100) {
      this.healthMetrics.responseTime.shift();
    }
  }

  async sendToPlugin(request: any, priority: 'low' | 'normal' | 'high' = 'normal'): Promise<any> {
    const id = uuidv4();
    const timeoutMs = this.getTimeoutForOperation(request.type);
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.removeRequestFromQueue(id);
        reject(new Error(`Plugin request timeout after ${timeoutMs}ms for operation: ${request.type}`));
      }, timeoutMs);

      const queuedRequest: QueuedRequest = {
        id,
        request: { ...request, id },
        resolve,
        reject,
        timeout,
        timestamp: Date.now(),
        priority,
        retries: 0
      };

      // Add to queue with priority sorting
      this.addToQueue(queuedRequest);
      
      // Process queue if plugin is connected
      if (this.pluginConnection) {
        this.processRequestQueue();
      }
    });
  }
  
  private getTimeoutForOperation(operationType: string): number {
    return this.config.communication.operationTimeouts[operationType] || 
           this.config.communication.defaultTimeout;
  }
  
  private addToQueue(request: QueuedRequest): void {
    // Insert request based on priority
    const priorityValue = RequestPriority[request.priority.toUpperCase() as keyof typeof RequestPriority];
    
    let insertIndex = this.requestQueue.length;
    for (let i = 0; i < this.requestQueue.length; i++) {
      const existingPriority = RequestPriority[this.requestQueue[i]!.priority.toUpperCase() as keyof typeof RequestPriority];
      if (priorityValue > existingPriority) {
        insertIndex = i;
        break;
      }
    }
    
    this.requestQueue.splice(insertIndex, 0, request);
    
    // Enforce queue size limit
    if (this.requestQueue.length > this.config.communication.requestQueueSize) {
      const dropped = this.requestQueue.pop()!;
      clearTimeout(dropped.timeout);
      dropped.reject(new Error('Request dropped due to queue overflow'));
    }
  }
  
  private removeRequestFromQueue(id: string): void {
    const index = this.requestQueue.findIndex(req => req.id === id);
    if (index !== -1) {
      this.requestQueue.splice(index, 1);
    }
  }
  
  private processRequestQueue(): void {
    if (!this.pluginConnection || this.requestQueue.length === 0) {
      return;
    }
    
    // Check if we should batch requests
    if (this.shouldBatchRequests()) {
      this.processBatchedRequests();
    } else {
      this.processIndividualRequest();
    }
  }
  
  private shouldBatchRequests(): boolean {
    return this.requestQueue.length >= 2 && 
           this.requestQueue.length <= this.config.communication.maxBatchSize;
  }
  
  private processBatchedRequests(): void {
    const batchSize = Math.min(this.requestQueue.length, this.config.communication.maxBatchSize);
    const batchRequests = this.requestQueue.splice(0, batchSize);
    
    if (batchRequests.length === 0) return;
    
    const batchId = uuidv4();
    const batch: RequestBatch = {
      id: batchId,
      requests: batchRequests,
      timeout: setTimeout(() => {
        this.pendingBatches.delete(batchId);
        batchRequests.forEach(req => {
          req.reject(new Error('Batch request timeout'));
        });
      }, this.config.communication.defaultTimeout)
    };
    
    this.pendingBatches.set(batchId, batch);
    
    const batchMessage = {
      type: 'BATCH_REQUEST',
      batchId,
      requests: batchRequests.map(req => req.request)
    };
    
    try {
      this.pluginConnection?.send(JSON.stringify(batchMessage));
      console.error(`📦 Sent batch to plugin: ${batchRequests.length} requests`);
    } catch (error) {
      this.pendingBatches.delete(batchId);
      clearTimeout(batch.timeout);
      batchRequests.forEach(req => {
        req.reject(new Error(`Failed to send batch request: ${error}`));
      });
    }
  }
  
  private processIndividualRequest(): void {
    const request = this.requestQueue.shift();
    if (!request || !this.pluginConnection) return;
    
    try {
      this.pluginConnection.send(JSON.stringify(request.request));
      console.error('📤 Sent to plugin:', request.request.type);
    } catch (error) {
      clearTimeout(request.timeout);
      request.reject(new Error(`Failed to send request: ${error}`));
    }
  }

  isPluginConnected(): boolean {
    return this.pluginConnection !== null;
  }

  getConnectionCount(): number {
    return this.wsServer?.clients.size || 0;
  }

  async stop(): Promise<void> {
    console.error('🛁 Stopping WebSocket server...');
    
    // Clear timers
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
    
    // Close WebSocket server
    if (this.wsServer) {
      this.wsServer.close();
      this.wsServer = null;
    }
    this.pluginConnection = null;
    
    // Clear all pending requests
    this.requestQueue.forEach(request => {
      clearTimeout(request.timeout);
      request.reject(new Error('Server shutting down'));
    });
    this.requestQueue = [];
    
    // Clear pending batches
    for (const [id, batch] of this.pendingBatches.entries()) {
      clearTimeout(batch.timeout);
      batch.requests.forEach(req => {
        req.reject(new Error('Server shutting down'));
      });
    }
    this.pendingBatches.clear();
    
    console.error('✅ WebSocket server stopped');
  }
  
  private startHeartbeat(ws: WebSocket): void {
    const heartbeatInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'HEARTBEAT' }));
      } else {
        clearInterval(heartbeatInterval);
      }
    }, this.config.heartbeatInterval);
  }
  
  private attemptReconnection(): void {
    if (this.connectionStatus.reconnectAttempts >= this.config.communication.reconnectAttempts) {
      console.error('❌ Max reconnection attempts reached');
      return;
    }
    
    this.connectionStatus.reconnectAttempts++;
    console.error(`🔄 Attempting reconnection ${this.connectionStatus.reconnectAttempts}/${this.config.communication.reconnectAttempts}`);
    
    this.reconnectTimer = setTimeout(() => {
      // In a real reconnection scenario, we would attempt to re-establish the connection
      // For now, we just log and wait for the plugin to reconnect
      console.error('⏳ Waiting for plugin reconnection...');
    }, this.config.communication.reconnectDelay * this.connectionStatus.reconnectAttempts);
  }

  getConfig(): ServerConfig {
    return this.config;
  }
  
  getConnectionStatus(): ConnectionStatus {
    return { ...this.connectionStatus };
  }
  
  getHealthMetrics(): HealthMetrics {
    return { ...this.healthMetrics };
  }
  
  getQueueStatus(): { length: number; requests: string[] } {
    return {
      length: this.requestQueue.length,
      requests: this.requestQueue.map(req => `${req.request.type} (${req.priority})`)
    };
  }
  
  // Method to send high priority requests (for critical operations)
  async sendHighPriorityToPlugin(request: any): Promise<any> {
    return this.sendToPlugin(request, 'high');
  }
  
  // Method to send low priority requests (for background operations)
  async sendLowPriorityToPlugin(request: any): Promise<any> {
    return this.sendToPlugin(request, 'low');
  }
}