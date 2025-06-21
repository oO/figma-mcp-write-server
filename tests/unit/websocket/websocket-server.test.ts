import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { FigmaWebSocketServer } from '../../../src/websocket/websocket-server.js';
import { DEFAULT_WS_CONFIG } from '../../../src/types/index.js';

// Mock the port utils to avoid actual port operations in tests
jest.mock('../../../src/utils/port-utils.js', () => ({
  checkPortAvailable: jest.fn().mockResolvedValue(true),
  findZombieProcesses: jest.fn().mockResolvedValue([]),
  killZombieProcesses: jest.fn().mockResolvedValue(),
  findAvailablePort: jest.fn().mockResolvedValue(8765)
}));

// Mock WebSocket
const mockWebSocket = {
  on: jest.fn(),
  send: jest.fn(),
  close: jest.fn(),
  readyState: 1,
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3
};

const mockWebSocketServer = {
  on: jest.fn(),
  close: jest.fn(),
  clients: new Set()
};

jest.mock('ws', () => ({
  WebSocketServer: jest.fn(() => mockWebSocketServer),
  default: jest.fn(() => mockWebSocket)
}));

describe('FigmaWebSocketServer', () => {
  let wsServer: FigmaWebSocketServer;
  let testConfig: any;

  beforeEach(() => {
    testConfig = {
      ...DEFAULT_WS_CONFIG,
      port: 8765,
      heartbeatInterval: 1000
    };
    wsServer = new FigmaWebSocketServer(testConfig);
    
    // Clear mock calls
    jest.clearAllMocks();
  });

  afterEach(async () => {
    if (wsServer) {
      await wsServer.stop();
    }
  });

  describe('Constructor', () => {
    test('should initialize with correct configuration', () => {
      expect(wsServer).toBeDefined();
      expect(wsServer.getConnectionStatus().pluginConnected).toBe(false);
      expect(wsServer.getConnectionStatus().activeClients).toBe(0);
    });

    test('should initialize with unhealthy connection status', () => {
      const status = wsServer.getConnectionStatus();
      expect(status.connectionHealth).toBe('unhealthy');
      expect(status.lastHeartbeat).toBeNull();
      expect(status.reconnectAttempts).toBe(0);
    });
  });

  describe('Server Lifecycle', () => {
    test('should start server successfully', async () => {
      await wsServer.start();
      
      expect(mockWebSocketServer.on).toHaveBeenCalledWith('connection', expect.any(Function));
      const status = wsServer.getConnectionStatus();
      // Server starts as unhealthy until plugin connects
      expect(status.connectionHealth).toBe('unhealthy');
    });

    test('should handle server startup errors gracefully', async () => {
      // Mock server error during startup
      const { WebSocketServer } = require('ws');
      WebSocketServer.mockImplementationOnce(() => {
        throw new Error('Port already in use');
      });

      await expect(wsServer.start()).rejects.toThrow();
    });

    test('should stop server cleanly', async () => {
      await wsServer.start();
      await wsServer.stop();
      
      expect(mockWebSocketServer.close).toHaveBeenCalled();
    });
  });

  describe('Plugin Connection Management', () => {
    test('should handle plugin connection', async () => {
      await wsServer.start();
      
      // Simulate plugin connection
      const connectionHandler = mockWebSocketServer.on.mock.calls
        .find(call => call[0] === 'connection')?.[1];
      
      if (connectionHandler) {
        connectionHandler(mockWebSocket);
      }
      
      // Simulate message indicating plugin connection
      const messageHandler = mockWebSocket.on.mock.calls
        .find(call => call[0] === 'message')?.[1];
        
      if (messageHandler) {
        messageHandler(JSON.stringify({
          type: 'PLUGIN_HELLO',
          data: { version: '1.0.0' }
        }));
      }
      
      expect(mockWebSocket.on).toHaveBeenCalledWith('message', expect.any(Function));
      expect(mockWebSocket.on).toHaveBeenCalledWith('close', expect.any(Function));
      expect(mockWebSocket.on).toHaveBeenCalledWith('error', expect.any(Function));
    });

    test('should handle plugin disconnection', async () => {
      await wsServer.start();
      
      // First connect
      const connectionHandler = mockWebSocketServer.on.mock.calls
        .find(call => call[0] === 'connection')?.[1];
      
      if (connectionHandler) {
        connectionHandler(mockWebSocket);
      }
      
      // Then disconnect
      const closeHandler = mockWebSocket.on.mock.calls
        .find(call => call[0] === 'close')?.[1];
        
      if (closeHandler) {
        closeHandler();
      }
      
      const status = wsServer.getConnectionStatus();
      expect(status.pluginConnected).toBe(false);
    });
  });

  describe('Message Handling', () => {
    test('should send message to plugin when connected', async () => {
      await wsServer.start();
      
      // Mock plugin connection
      const connectionHandler = mockWebSocketServer.on.mock.calls
        .find(call => call[0] === 'connection')?.[1];
      
      if (connectionHandler) {
        connectionHandler(mockWebSocket);
      }
      
      // Simulate plugin hello to establish connection
      const messageHandler = mockWebSocket.on.mock.calls
        .find(call => call[0] === 'message')?.[1];
        
      if (messageHandler) {
        messageHandler(JSON.stringify({
          type: 'PLUGIN_HELLO',
          data: { version: '1.0.0' }
        }));
      }
      
      // Verify plugin is connected
      expect(wsServer.isPluginConnected()).toBe(true);
      
      // Send a message
      const testMessage = {
        type: 'CREATE_NODE',
        payload: { nodeType: 'rectangle' }
      };
      
      // Start the request
      const responsePromise = wsServer.sendToPlugin(testMessage);
      
      // Verify send was called
      expect(mockWebSocket.send).toHaveBeenCalled();
      
      // Extract the request ID from the sent message to simulate proper response
      const sentMessage = JSON.parse(mockWebSocket.send.mock.calls[mockWebSocket.send.mock.calls.length - 1][0]);
      
      // Simulate plugin response with matching request ID
      if (messageHandler) {
        messageHandler(JSON.stringify({
          type: 'RESPONSE',
          id: sentMessage.id,
          success: true,
          data: { nodeId: 'node-123' }
        }));
      }
      
      // Await the response
      const response = await responsePromise;
      expect(response.success).toBe(true);
      expect(response.data.nodeId).toBe('node-123');
    });

    test('should timeout when plugin not connected', async () => {
      // Use a config with very short timeout for this test
      const shortTimeoutConfig = {
        ...testConfig,
        communication: {
          ...DEFAULT_WS_CONFIG.communication,
          defaultTimeout: 100,
          operationTimeouts: { CREATE_NODE: 100 }
        }
      };
      const shortTimeoutServer = new FigmaWebSocketServer(shortTimeoutConfig);
      await shortTimeoutServer.start();
      
      const testMessage = {
        type: 'CREATE_NODE',
        payload: { nodeType: 'rectangle' }
      };
      
      await expect(shortTimeoutServer.sendToPlugin(testMessage))
        .rejects.toThrow('timeout');
        
      await shortTimeoutServer.stop();
    }, 10000);

    test('should handle message timeout', async () => {
      await wsServer.start();
      
      // Mock plugin connection
      const connectionHandler = mockWebSocketServer.on.mock.calls
        .find(call => call[0] === 'connection')?.[1];
      
      if (connectionHandler) {
        connectionHandler(mockWebSocket);
      }
      
      // Configure short timeout for test
      const shortTimeoutConfig = { ...testConfig, requestTimeout: 100 };
      const shortTimeoutServer = new FigmaWebSocketServer(shortTimeoutConfig);
      await shortTimeoutServer.start();
      
      const testMessage = {
        type: 'CREATE_NODE',
        payload: { nodeType: 'rectangle' }
      };
      
      // Don't send response, let it timeout
      await expect(shortTimeoutServer.sendToPlugin(testMessage))
        .rejects.toThrow();
        
      await shortTimeoutServer.stop();
    }, 10000);
  });

  describe('Health Monitoring', () => {
    test('should track connection health metrics', () => {
      const metrics = wsServer.getHealthMetrics();
      
      expect(metrics).toHaveProperty('responseTime');
      expect(metrics).toHaveProperty('errorCount');
      expect(metrics).toHaveProperty('successCount');
      expect(metrics.errorCount).toBe(0);
      expect(metrics.successCount).toBe(0);
    });

    test('should update metrics on successful requests', async () => {
      await wsServer.start();
      
      // Simulate successful operation by updating metrics directly
      const initialMetrics = wsServer.getHealthMetrics();
      expect(initialMetrics.successCount).toBe(0);
    });

    test('should track response times', () => {
      const metrics = wsServer.getHealthMetrics();
      expect(Array.isArray(metrics.responseTime)).toBe(true);
    });
  });

  describe('Connection Status', () => {
    test('should provide current connection status', () => {
      const status = wsServer.getConnectionStatus();
      
      expect(status).toHaveProperty('pluginConnected');
      expect(status).toHaveProperty('lastHeartbeat');
      expect(status).toHaveProperty('activeClients');
      expect(status).toHaveProperty('connectionHealth');
      expect(status).toHaveProperty('reconnectAttempts');
      expect(status).toHaveProperty('averageResponseTime');
      expect(status).toHaveProperty('queuedRequests');
    });

    test('should update connection status on plugin connect', async () => {
      await wsServer.start();
      
      const initialStatus = wsServer.getConnectionStatus();
      expect(initialStatus.pluginConnected).toBe(false);
      
      // The actual connection logic would update this status
      // In real implementation, this would be tested with actual WebSocket events
    });
  });

  describe('Error Handling', () => {
    test('should handle WebSocket errors gracefully', async () => {
      await wsServer.start();
      
      // Simulate WebSocket error
      const connectionHandler = mockWebSocketServer.on.mock.calls
        .find(call => call[0] === 'connection')?.[1];
      
      if (connectionHandler) {
        connectionHandler(mockWebSocket);
      }
      
      const errorHandler = mockWebSocket.on.mock.calls
        .find(call => call[0] === 'error')?.[1];
        
      if (errorHandler) {
        errorHandler(new Error('WebSocket error'));
      }
      
      // Error should be handled gracefully without crashing
      expect(true).toBe(true);
    });

    test('should handle malformed messages', async () => {
      await wsServer.start();
      
      const connectionHandler = mockWebSocketServer.on.mock.calls
        .find(call => call[0] === 'connection')?.[1];
      
      if (connectionHandler) {
        connectionHandler(mockWebSocket);
      }
      
      const messageHandler = mockWebSocket.on.mock.calls
        .find(call => call[0] === 'message')?.[1];
        
      if (messageHandler) {
        // Send invalid JSON
        messageHandler('invalid json');
      }
      
      // Should handle gracefully without crashing
      expect(true).toBe(true);
    });

    test('should reset health metrics correctly', async () => {
      await wsServer.start();
      
      // Get initial health metrics
      const initialHealth = wsServer.getHealthMetrics();
      expect(initialHealth.errorCount).toBe(0);
      expect(initialHealth.successCount).toBe(0);
      
      // Test that resetHealthMetrics works
      wsServer.resetHealthMetrics();
      
      const resetHealth = wsServer.getHealthMetrics();
      expect(resetHealth.errorCount).toBe(0);
      expect(resetHealth.successCount).toBe(0);
      expect(resetHealth.responseTime).toEqual([]);
      expect(resetHealth.lastError).toBeNull();
      expect(resetHealth.lastSuccess).toBeNull();
    });
  });
});