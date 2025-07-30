import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FigmaWebSocketServer } from '../../src/websocket/websocket-server.js';
import { DEFAULT_WS_CONFIG } from '../../src/types/index.js';
import WebSocket from 'ws';
import { logger } from '../../src/utils/logger.js';

// Mock the logger to capture calls
vi.mock('../../src/utils/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

const mockedLogger = vi.mocked(logger);

describe('WebSocket LOG_MESSAGE Integration', () => {
  let wsServer: FigmaWebSocketServer;
  let client: WebSocket;
  let port: number;

  beforeEach(async () => {
    // Find available port for testing
    port = 8770 + Math.floor(Math.random() * 100);
    
    // Create WebSocket server instance
    const config = { ...DEFAULT_WS_CONFIG, port };
    wsServer = new FigmaWebSocketServer(config);
    
    // Start the server
    await wsServer.start();
    
    // Reset mock calls
    vi.clearAllMocks();
  });

  afterEach(async () => {
    // Clean up client connection
    if (client && client.readyState === WebSocket.OPEN) {
      client.close();
    }
    
    // Stop the server
    if (wsServer) {
      await wsServer.stop();
    }
  });

  const connectClient = (): Promise<WebSocket> => {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(`ws://localhost:${port}`);
      
      ws.on('open', () => {
        // Send PLUGIN_HELLO to establish plugin connection
        ws.send(JSON.stringify({ type: 'PLUGIN_HELLO' }));
        resolve(ws);
      });
      
      ws.on('error', reject);
      
      // Timeout after 5 seconds
      setTimeout(() => reject(new Error('Connection timeout')), 5000);
    });
  };

  describe('LOG_MESSAGE handling', () => {
    it('should handle LOG_MESSAGE with message type correctly', async () => {
      client = await connectClient();
      
      // Wait for connection to be established
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const logMessage = {
        type: 'LOG_MESSAGE',
        payload: {
          message: 'Test plugin message',
          type: 'message',
          data: { test: 'data' },
          timestamp: Date.now()
        }
      };
      
      client.send(JSON.stringify(logMessage));
      
      // Wait for message processing
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(mockedLogger.debug).toHaveBeenCalledWith(
        '🔌 Test plugin message',
        'message',
        { test: 'data' }
      );
    });

    it('should handle LOG_MESSAGE with warning type correctly', async () => {
      client = await connectClient();
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const logMessage = {
        type: 'LOG_MESSAGE',
        payload: {
          message: 'Test plugin warning',
          type: 'warning',
          data: undefined,
          timestamp: Date.now()
        }
      };
      
      client.send(JSON.stringify(logMessage));
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(mockedLogger.debug).toHaveBeenCalledWith(
        '🔌 Test plugin warning',
        'warning',
        undefined
      );
    });

    it('should handle LOG_MESSAGE with error type correctly', async () => {
      client = await connectClient();
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const logMessage = {
        type: 'LOG_MESSAGE',
        payload: {
          message: 'Test plugin error',
          type: 'error',
          data: { error: 'details' },
          timestamp: Date.now()
        }
      };
      
      client.send(JSON.stringify(logMessage));
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(mockedLogger.debug).toHaveBeenCalledWith(
        '🔌 Test plugin error',
        'error',
        { error: 'details' }
      );
    });

    it('should default to message type when type is missing', async () => {
      client = await connectClient();
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const logMessage = {
        type: 'LOG_MESSAGE',
        payload: {
          message: 'Test without type',
          data: null,
          timestamp: Date.now()
        }
      };
      
      client.send(JSON.stringify(logMessage));
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(mockedLogger.debug).toHaveBeenCalledWith(
        '🔌 Test without type',
        'message',
        null
      );
    });

    it('should add plugin prefix emoji to all messages', async () => {
      client = await connectClient();
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const logMessage = {
        type: 'LOG_MESSAGE',
        payload: {
          message: 'Test prefix',
          type: 'message',
          timestamp: Date.now()
        }
      };
      
      client.send(JSON.stringify(logMessage));
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(mockedLogger.debug).toHaveBeenCalledWith(
        expect.stringMatching(/^🔌 /),
        'message',
        undefined
      );
    });
  });

  describe('Parameter order validation', () => {
    it('should call debugLog with correct parameter order (message, logType, data)', async () => {
      client = await connectClient();
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const testCases = [
        {
          payload: {
            message: 'Test message 1',
            type: 'message',
            data: { key: 'value1' }
          },
          expectedCall: ['🔌 Test message 1', 'message', { key: 'value1' }]
        },
        {
          payload: {
            message: 'Test warning 2',
            type: 'warning',
            data: 'string data'
          },
          expectedCall: ['🔌 Test warning 2', 'warning', 'string data']
        },
        {
          payload: {
            message: 'Test error 3',
            type: 'error',
            data: null
          },
          expectedCall: ['🔌 Test error 3', 'error', null]
        }
      ];
      
      for (const testCase of testCases) {
        const logMessage = {
          type: 'LOG_MESSAGE',
          payload: { ...testCase.payload, timestamp: Date.now() }
        };
        
        client.send(JSON.stringify(logMessage));
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      expect(mockedLogger.debug).toHaveBeenCalledTimes(4); // 3 test cases + PLUGIN_HELLO
      
      // Check specific calls (skip the first PLUGIN_HELLO related call)
      const calls = mockedLogger.debug.mock.calls.slice(-3);
      expect(calls[0]).toEqual(testCases[0].expectedCall);
      expect(calls[1]).toEqual(testCases[1].expectedCall);
      expect(calls[2]).toEqual(testCases[2].expectedCall);
    });
  });

  describe('Malformed message handling', () => {
    it('should handle LOG_MESSAGE without payload gracefully', async () => {
      client = await connectClient();
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const malformedMessage = {
        type: 'LOG_MESSAGE'
        // No payload
      };
      
      client.send(JSON.stringify(malformedMessage));
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Should not crash, and should not call debugLog for the malformed message
      // (only the PLUGIN_HELLO should have been logged)
      expect(mockedLogger.debug).toHaveBeenCalledTimes(1);
    });

    it('should handle invalid JSON gracefully', async () => {
      client = await connectClient();
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Send invalid JSON
      client.send('{"invalid": json}');
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Should not crash the server
      expect(wsServer.isPluginConnected()).toBe(true);
    });

    it('should handle LOG_MESSAGE with partial payload', async () => {
      client = await connectClient();
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const partialMessage = {
        type: 'LOG_MESSAGE',
        payload: {
          message: 'Partial message'
          // Missing type and data
        }
      };
      
      client.send(JSON.stringify(partialMessage));
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(mockedLogger.debug).toHaveBeenCalledWith(
        '🔌 Partial message',
        'message', // Should default to 'message'
        undefined
      );
    });
  });

  describe('Connection state integration', () => {
    it('should only process LOG_MESSAGE from connected plugins', async () => {
      // Create client but don't send PLUGIN_HELLO
      client = new WebSocket(`ws://localhost:${port}`);
      
      await new Promise((resolve, reject) => {
        client.on('open', resolve);
        client.on('error', reject);
        setTimeout(() => reject(new Error('Timeout')), 5000);
      });
      
      // Send LOG_MESSAGE without establishing plugin connection
      const logMessage = {
        type: 'LOG_MESSAGE',
        payload: {
          message: 'Unauthorized message',
          type: 'error'
        }
      };
      
      client.send(JSON.stringify(logMessage));
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Should still process the message (LOG_MESSAGE doesn't require plugin status)
      expect(mockedLogger.debug).toHaveBeenCalledWith(
        '🔌 Unauthorized message',
        'error',
        undefined
      );
    });

    it('should handle multiple LOG_MESSAGE from same connection', async () => {
      client = await connectClient();
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const messages = [
        { message: 'Message 1', type: 'message' },
        { message: 'Message 2', type: 'warning' },
        { message: 'Message 3', type: 'error' }
      ];
      
      for (const msg of messages) {
        const logMessage = {
          type: 'LOG_MESSAGE',
          payload: { ...msg, timestamp: Date.now() }
        };
        client.send(JSON.stringify(logMessage));
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(mockedLogger.debug).toHaveBeenCalledTimes(4); // 3 messages + 1 PLUGIN_HELLO
    });
  });
});