// ================================================================================
// Server Configuration & Connection Types
// ================================================================================

export interface OperationTimeouts {
  [operationType: string]: number;
}

export interface CommunicationConfig {
  defaultTimeout: number;
  operationTimeouts: OperationTimeouts;
  batchTimeout: number;
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
  defaultTimeout: 30000, // 30 seconds
  operationTimeouts: {
    'CREATE_NODE': 5000,
    'UPDATE_NODE': 3000,
    'MOVE_NODE': 2000,
    'DELETE_NODE': 2000,
    'DUPLICATE_NODE': 5000,
    'GET_SELECTION': 1000,
    'SET_SELECTION': 1000,
    'GET_PAGE_NODES': 10000, // Can be slow for large documents
    'EXPORT_NODE': 15000, // Export operations can take time
    'MANAGE_STYLES': 5000,
    'MANAGE_AUTO_LAYOUT': 3000,
    'MANAGE_CONSTRAINTS': 2000,
    'CREATE_TEXT': 4000,
    'MANAGE_COMPONENTS': 5000, // Component management operations can take time
    'MANAGE_INSTANCES': 3000, // Instance operations
    'MANAGE_COLLECTIONS': 4000, // Variable collection operations
    'MANAGE_VARIABLES': 5000 // Variable operations and binding can take time
  },
  batchTimeout: 100, // 100ms window for batching
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
  timeout: NodeJS.Timeout;
  timestamp: number;
  priority: 'low' | 'normal' | 'high';
  retries: number;
}

export interface RequestBatch {
  id: string;
  requests: QueuedRequest[];
  timeout: NodeJS.Timeout;
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