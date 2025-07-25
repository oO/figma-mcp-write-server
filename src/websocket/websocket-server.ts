import { WebSocketServer } from 'ws';
import WebSocket from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { LegacyServerConfig, QueuedRequest, RequestBatch, RequestPriority, ConnectionStatus, HealthMetrics, validateAndParse, TypedPluginMessage, TypedPluginResponse } from '../types/index.js';
import { checkPortAvailable, findZombieProcesses, killZombieProcesses, findAvailablePort } from '../utils/port-utils.js';
import { EventEmitter } from 'events';
import { logger } from "../utils/logger.js"

export class FigmaWebSocketServer extends EventEmitter {
  private wsServer: WebSocketServer | null = null;
  private pluginConnection: WebSocket | null = null;
  private config: LegacyServerConfig;
  
  // Enhanced request management
  private requestQueue: QueuedRequest[] = [];
  private pendingRequests = new Map<string, QueuedRequest>();
  private pendingBatches = new Map<string, RequestBatch>();
  private batchTimer: NodeJS.Timeout | null = null;
  
  // Connection health monitoring
  private connectionStatus: ConnectionStatus;
  private healthMetrics: HealthMetrics;
  private healthCheckTimer: NodeJS.Timeout | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private startupTime: number;

  constructor(config: LegacyServerConfig) {
    super();
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
    
    // Track startup time to ignore early handshake failures
    this.startupTime = Date.now();
  }

  async start(): Promise<void> {
    let port = this.config.port;
    let zombieProcesses: string[] = [];
    
    // Check if default port is available
    const isPortAvailable = await checkPortAvailable(port);
    
    if (!isPortAvailable) {
      // Look for zombie processes
      zombieProcesses = await findZombieProcesses(port);
      
      if (zombieProcesses.length > 0) {
        await killZombieProcesses(zombieProcesses);
        
        // Check if port is now available
        if (!(await checkPortAvailable(port))) {
          // Find alternative port
          try {
            port = await findAvailablePort(port + 1);
            this.config.port = port; // Update config
          } catch (error) {
            throw new Error(`Cannot start WebSocket server: ${error}`);
          }
        }
      } else {
        // Port in use but no zombie processes found - find alternative
        try {
          port = await findAvailablePort(port + 1);
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
        throw new Error(`WebSocket server failed to start: Port ${port} is in use`);
      } else {
        throw error;
      }
    });
    
    this.wsServer.on('listening', () => {
      // Server ready
    });
    
    this.wsServer.on('connection', (ws, req) => {
      const clientIP = req?.socket?.remoteAddress;
      
      this.connectionStatus.activeClients++;
      
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          // Only log non-heartbeat messages
          if (message.type !== 'HEARTBEAT_ACK') {
            logger.debug('📥 WebSocket message received:', { type: message.type, hasId: !!message.id });
          }
          this.handleMessage(ws, message);
        } catch (error) {
          logger.error('📥 WebSocket message parsing error:', error);
        }
      });
      
      ws.on('close', (code, reason) => {
        this.connectionStatus.activeClients--;
        if (ws === this.pluginConnection) {
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
        // WebSocket error - ignore
      });
    });

    // Start health monitoring
    this.startHealthMonitoring();
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
            request.reject(new Error('Request timed out (stale)'));
        return false;
      }
      return true;
    });
  }

  private handleMessage(ws: WebSocket, message: any): void {
    if (message.type === 'PLUGIN_HELLO') {
      logger.log('🔌 Plugin connected via WebSocket');
      this.pluginConnection = ws;
      this.connectionStatus.pluginConnected = true;
      this.connectionStatus.connectionHealth = 'healthy';
      this.connectionStatus.reconnectAttempts = 0;
      
      const response = { type: 'CONNECTED', role: 'plugin' };
      ws.send(JSON.stringify(response));
      
      // Process any queued requests
      this.processRequestQueue();
      
      // Emit plugin connected event for initialization tasks
      this.emit('pluginConnected');
      
      return;
    }
    
    // Handle plugin log messages
    if (message.type === 'LOG_MESSAGE' && message.payload) {
      const { message: logMessage, data, type } = message.payload;
      const logType = type || 'message';
      if (logType === 'message') {
        logger.log(`🔌 ${logMessage}`, data);
      } else if (logType === 'warning') {
        logger.warn(`🔌 ${logMessage}`, data);
      } else if (logType === 'error') {
        logger.error(`🔌 ${logMessage}`, data);
      } else if (logType === 'debug') {
        logger.debug(`🔌 ${logMessage}`, data);
      } else {
        logger.log(`🔌 ${logMessage}`, data);
      }
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
    // Find request in pending requests
    const request = this.pendingRequests.get(message.id);
    if (!request) {
      return;
    }
    
    // Remove from pending
    this.pendingRequests.delete(message.id);
    
    // Record metrics
    const responseTime = Date.now() - request.timestamp;
    this.recordResponseTime(responseTime);
    
    
    // Log the response
    const operation = request.request.payload?.operation || 'unknown';
    const logData = {
      operation,
      requestId: request.id,
      responseTime: `${responseTime}ms`,
      success: !message.error
    };
    
    if (message.error) {
      // Don't count startup handshake failures in health metrics
      const timeSinceStartup = Date.now() - this.startupTime;
      const isStartupFailure = timeSinceStartup < 5000; // 5 second grace period
      
      if (!isStartupFailure) {
        this.healthMetrics.errorCount++;
        this.healthMetrics.lastError = message.error;
      }
      
      logger.error(`📥 Operation failed: ${operation}`, { ...logData, error: message.error });
      request.reject(new Error(message.error));
    } else {
      this.healthMetrics.successCount++;
      this.healthMetrics.lastSuccess = new Date();
      // Removed verbose operation logging
      request.resolve(message.result);
    }
  }
  
  private handleBatchResponse(message: any): void {
    const batch = this.pendingBatches.get(message.batchId);
    if (!batch) return;
    
    this.pendingBatches.delete(message.batchId);
    
    // Log batch completion
    const operations = batch.requests.map(req => req.request.payload?.operation || 'unknown');
    const successCount = message.responses.filter((r: any) => !r.error).length;
    const errorCount = message.responses.length - successCount;
    
    logger.debug(`📥 Batch operations completed: ${operations.join(', ')}`, {
      batchId: message.batchId,
      totalOperations: message.responses.length,
      successCount,
      errorCount
    });
    
    // Process each response in the batch
    message.responses.forEach((response: any, index: number) => {
      if (index < batch.requests.length) {
        const request = batch.requests[index]!;
        const responseTime = Date.now() - request.timestamp;
        this.recordResponseTime(responseTime);
        
        const operation = request.request.payload?.operation || 'unknown';
        const logData = {
          operation,
          requestId: request.id,
          responseTime: `${responseTime}ms`,
          batchIndex: index
        };
        
        if (response.error) {
          // Don't count startup handshake failures in health metrics
          const timeSinceStartup = Date.now() - this.startupTime;
          const isStartupFailure = timeSinceStartup < 5000; // 5 second grace period
          
          if (!isStartupFailure) {
            this.healthMetrics.errorCount++;
          }
          
          logger.error(`📥 Batch operation failed: ${operation}`, { ...logData, error: response.error });
          request.reject(new Error(response.error));
        } else {
          this.healthMetrics.successCount++;
          logger.debug(`📥 Batch operation completed: ${operation}`, logData);
          request.resolve(response.result);
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
    
    return new Promise((resolve, reject) => {
      const queuedRequest: QueuedRequest = {
        id,
        request: { ...request, id },
        resolve,
        reject,
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
      dropped.reject(new Error('Request dropped due to queue overflow'));
    }
  }
  
  private removeRequestFromQueue(id: string): void {
    const index = this.requestQueue.findIndex(req => req.id === id);
    if (index !== -1) {
      this.requestQueue.splice(index, 1);
    }
    
    // Also remove from pending if it exists there
    this.pendingRequests.delete(id);
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
      requests: batchRequests
    };
    
    this.pendingBatches.set(batchId, batch);
    
    // Log the batch operations
    const operations = batchRequests.map(req => req.request.payload?.operation || 'unknown');
    const logData = {
      batchSize: batchRequests.length,
      operations,
      batchId
    };
    logger.debug(`📤 Sending batch operations to plugin: ${operations.join(', ')}`, logData);
    
    const batchMessage = {
      type: 'BATCH_REQUEST',
      batchId,
      requests: batchRequests.map(req => req.request)
    };
    
    try {
      this.pluginConnection?.send(JSON.stringify(batchMessage));
    } catch (error) {
      this.pendingBatches.delete(batchId);
      batchRequests.forEach(req => {
        req.reject(new Error(`Failed to send batch request: ${error}`));
      });
    }
  }
  
  private processIndividualRequest(): void {
    const request = this.requestQueue.shift();
    if (!request || !this.pluginConnection) return;
    
    // Move request to pending state
    this.pendingRequests.set(request.id, request);
    
    // Log the outgoing operation
    const operation = request.request.payload?.operation || 'unknown';
    const nodeId = request.request.payload?.nodeId;
    const logData = {
      operation,
      type: request.request.type,
      requestId: request.id,
      ...(nodeId && { nodeId: Array.isArray(nodeId) ? `${nodeId.length} nodes` : nodeId })
    };
    // Removed verbose operation logging
    
    try {
      this.pluginConnection.send(JSON.stringify(request.request));
    } catch (error) {
      this.pendingRequests.delete(request.id);
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
        request.reject(new Error('Server shutting down'));
    });
    this.requestQueue = [];
    
    // Clear pending batches
    for (const [id, batch] of this.pendingBatches.entries()) {
        batch.requests.forEach(req => {
        req.reject(new Error('Server shutting down'));
      });
    }
    this.pendingBatches.clear();
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
      return;
    }
    
    this.connectionStatus.reconnectAttempts++;
    
    this.reconnectTimer = setTimeout(() => {
      // In a real reconnection scenario, we would attempt to re-establish the connection
      // For now, we just wait for the plugin to reconnect
    }, this.config.communication.reconnectDelay * this.connectionStatus.reconnectAttempts);
  }

  getConfig(): LegacyServerConfig {
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
  
  // Reset health metrics to clean state
  resetHealthMetrics(): void {
    this.healthMetrics = {
      responseTime: [],
      errorCount: 0,
      successCount: 0,
      lastError: null,
      lastSuccess: null
    };
    
    // Also reset connection status metrics
    this.connectionStatus = {
      ...this.connectionStatus,
      averageResponseTime: 0,
      queuedRequests: 0,
      reconnectAttempts: 0
    };
    
    // Reset startup time to give new grace period
    this.startupTime = Date.now();
  }
}