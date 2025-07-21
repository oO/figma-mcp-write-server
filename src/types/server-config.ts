// ================================================================================
// Server Configuration & Connection Types
// ================================================================================


export interface CommunicationConfig {
  maxBatchSize: number;
  requestQueueSize: number;
  reconnectAttempts: number;
  reconnectDelay: number;
  healthCheckInterval: number;
}

// Legacy WebSocket server config (still used by WebSocket server)
export interface LegacyServerConfig {
  port: number;
  corsOrigin: string;
  pluginId: string;
  maxMessageSize: number;
  heartbeatInterval: number;
  communication: CommunicationConfig;
}

// Re-export new config system
export type { ServerConfig, FontDatabaseConfig } from '../config/config.js';
export { loadConfig, saveConfig, getDefaultPaths } from '../config/config.js';

export const DEFAULT_COMMUNICATION_CONFIG: CommunicationConfig = {
  maxBatchSize: 10,
  requestQueueSize: 50,
  reconnectAttempts: 3,
  reconnectDelay: 1000,
  healthCheckInterval: 5000 // 5 seconds
};

export const DEFAULT_WS_CONFIG: LegacyServerConfig = {
  port: 8765,
  corsOrigin: '*',
  pluginId: 'figma-mcp-write-plugin',
  maxMessageSize: 1024 * 1024, // 1MB
  heartbeatInterval: 30000, // 30 seconds
  communication: DEFAULT_COMMUNICATION_CONFIG
};

// Connection status and health types
export interface ConnectionStatus {
  pluginConnected: boolean;
  lastHeartbeat: Date | null;
  activeClients: number;
  connectionHealth: 'healthy' | 'degraded' | 'unhealthy';
  reconnectAttempts: number;
  averageResponseTime: number;
  queuedRequests: number;
}

export interface QueuedRequest {
  id: string;
  request: any;
  resolve: (value: any) => void;
  reject: (error: Error) => void;
  timestamp: number;
  priority: 'low' | 'normal' | 'high';
  retries: number;
}

export interface RequestBatch {
  id: string;
  requests: QueuedRequest[];
}

export enum RequestPriority {
  LOW = 0,
  NORMAL = 1,
  HIGH = 2
}

// Communication layer health metrics
export interface HealthMetrics {
  responseTime: number[];
  errorCount: number;
  successCount: number;
  lastError: string | null;
  lastSuccess: Date | null;
}