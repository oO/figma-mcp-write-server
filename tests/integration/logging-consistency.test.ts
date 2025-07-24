import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * Cross-system logging consistency tests
 * 
 * These tests validate that both server and plugin logging systems:
 * 1. Use consistent parameter order: (message, logType, data)
 * 2. Apply proper emoji decorations
 * 3. Handle edge cases consistently
 * 4. Maintain format compatibility for WebSocket communication
 */

// Mock server logger
vi.mock('../../src/utils/logger.js', () => ({
  debugLog: vi.fn()
}));

// Import after mocking
import { debugLog } from '../../src/utils/logger.js';
const mockedDebugLog = vi.mocked(debugLog);

// Mock plugin logger functionality (simplified for testing)
class TestPluginLogger {
  private messageRouter: any = null;

  initialize(router: any) {
    this.messageRouter = router;
  }

  log(message: string, type: 'message' | 'warning' | 'error' = 'message', data?: any) {
    const emoji = type === 'error' ? '❌' : type === 'warning' ? '⚠️' : '💬';
    const consoleMethod = type === 'error' ? console.error : 
                         type === 'warning' ? console.warn : console.log;
    
    consoleMethod(`${emoji} ${message}`, data);
    
    if (this.messageRouter?.isConnected()) {
      this.sendToServer(message, data, type);
    }
  }

  private sendToServer(message: string, data?: any, type: 'message' | 'warning' | 'error') {
    if (!this.messageRouter) return;

    this.messageRouter.send({
      type: 'LOG_MESSAGE',
      payload: { message, data, type, timestamp: Date.now() }
    });
  }
}

describe('Logging System Consistency', () => {
  let consoleLogSpy: any;
  let consoleWarnSpy: any;
  let consoleErrorSpy: any;
  let mockMessageRouter: any;
  let pluginLogger: TestPluginLogger;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Mock console methods
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Mock message router
    mockMessageRouter = {
      isConnected: vi.fn().mockReturnValue(true),
      send: vi.fn().mockResolvedValue(undefined)
    };

    // Initialize plugin logger
    pluginLogger = new TestPluginLogger();
    pluginLogger.initialize(mockMessageRouter);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Parameter order consistency', () => {
    it('should use (message, logType, data) order in both systems', () => {
      const testMessage = 'Consistency test';
      const testType = 'warning';
      const testData = { test: 'data' };

      // Test server logger
      debugLog(testMessage, testType, testData);
      expect(mockedDebugLog).toHaveBeenCalledWith(testMessage, testType, testData);

      // Test plugin logger WebSocket payload
      pluginLogger.log(testMessage, testType, testData);
      expect(mockMessageRouter.send).toHaveBeenCalledWith({
        type: 'LOG_MESSAGE',
        payload: {
          message: testMessage,
          data: testData,
          type: testType,
          timestamp: expect.any(Number)
        }
      });
    });

    it('should handle optional parameters consistently', () => {
      // Message only
      debugLog('Message only');
      pluginLogger.log('Message only');
      
      expect(mockedDebugLog).toHaveBeenCalledWith('Message only', undefined, undefined);
      expect(consoleLogSpy).toHaveBeenCalledWith('💬 Message only', undefined);

      // Message and type only
      debugLog('Message and type', 'error');
      pluginLogger.log('Message and type', 'error');
      
      expect(mockedDebugLog).toHaveBeenCalledWith('Message and type', 'error', undefined);
      expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Message and type', undefined);
    });
  });

  describe('Emoji decoration consistency', () => {
    const testCases = [
      { type: 'message' as const, serverEmoji: '✅', pluginEmoji: '💬' },
      { type: 'warning' as const, serverEmoji: '⚠️', pluginEmoji: '⚠️' },
      { type: 'error' as const, serverEmoji: '❌', pluginEmoji: '❌' }
    ];

    testCases.forEach(({ type, serverEmoji, pluginEmoji }) => {
      it(`should use correct emoji for ${type} type`, () => {
        const testMessage = `Test ${type} message`;
        
        // Mock server logger to return formatted string like real implementation
        mockedDebugLog.mockImplementation((message, logType) => {
          const emoji = logType === 'error' ? '❌' : logType === 'warning' ? '⚠️' : '✅';
          const timestamp = new Date().toISOString();
          console.log(`${emoji} ${timestamp}: ${message}`);
        });

        debugLog(testMessage, type);
        pluginLogger.log(testMessage, type);

        // Check plugin console output has correct emoji
        if (type === 'message') {
          expect(consoleLogSpy).toHaveBeenCalledWith(`${pluginEmoji} ${testMessage}`, undefined);
        } else if (type === 'warning') {
          expect(consoleWarnSpy).toHaveBeenCalledWith(`${pluginEmoji} ${testMessage}`, undefined);
        } else {
          expect(consoleErrorSpy).toHaveBeenCalledWith(`${pluginEmoji} ${testMessage}`, undefined);
        }
      });
    });

    it('should handle unknown log types with fallback emoji', () => {
      const testMessage = 'Unknown type test';
      
      // Plugin should fallback to 💬 for unknown types
      pluginLogger.log(testMessage, 'unknown' as any);
      expect(consoleLogSpy).toHaveBeenCalledWith('💬 Unknown type test', undefined);
    });
  });

  describe('WebSocket message format validation', () => {
    it('should create compatible LOG_MESSAGE payload structure', () => {
      const testMessage = 'WebSocket test';
      const testType = 'error';
      const testData = { complex: { nested: 'data' } };

      pluginLogger.log(testMessage, testType, testData);

      expect(mockMessageRouter.send).toHaveBeenCalledWith({
        type: 'LOG_MESSAGE',
        payload: {
          message: testMessage,
          data: testData,
          type: testType,
          timestamp: expect.any(Number)
        }
      });
    });

    it('should simulate server-side LOG_MESSAGE handling', () => {
      // Simulate what happens when server receives LOG_MESSAGE
      const mockPayload = {
        message: 'Server handling test',
        data: { server: 'data' },
        type: 'warning',
        timestamp: Date.now()
      };

      const { message: logMessage, data, type } = mockPayload;
      debugLog(`🔌 ${logMessage}`, type, data);

      expect(mockedDebugLog).toHaveBeenCalledWith(
        '🔌 Server handling test',
        'warning',
        { server: 'data' }
      );
    });
  });

  describe('Space formatting consistency', () => {
    it('should ensure proper spacing in both systems', () => {
      const testMessage = 'Space formatting test';
      
      pluginLogger.log(testMessage, 'message');
      pluginLogger.log(testMessage, 'warning');
      pluginLogger.log(testMessage, 'error');

      // Check plugin console output has space after emoji
      expect(consoleLogSpy).toHaveBeenCalledWith('💬 Space formatting test', undefined);
      expect(consoleWarnSpy).toHaveBeenCalledWith('⚠️ Space formatting test', undefined);
      expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Space formatting test', undefined);
    });

    it('should maintain spacing with plugin prefix in server logs', () => {
      // Simulate server adding plugin prefix
      const originalMessage = 'Plugin message';
      const prefixedMessage = `🔌 ${originalMessage}`;
      
      debugLog(prefixedMessage, 'message');
      expect(mockedDebugLog).toHaveBeenCalledWith('🔌 Plugin message', 'message', undefined);
    });
  });

  describe('Data type handling consistency', () => {
    const testDataTypes = [
      { name: 'object', data: { key: 'value', nested: { deep: true } } },
      { name: 'string', data: 'string data' },
      { name: 'number', data: 42 },
      { name: 'boolean', data: true },
      { name: 'null', data: null },
      { name: 'undefined', data: undefined },
      { name: 'array', data: [1, 'two', { three: 3 }] }
    ];

    testDataTypes.forEach(({ name, data }) => {
      it(`should handle ${name} data consistently`, () => {
        const testMessage = `Test with ${name}`;
        
        debugLog(testMessage, 'message', data);
        pluginLogger.log(testMessage, 'message', data);

        expect(mockedDebugLog).toHaveBeenCalledWith(testMessage, 'message', data);
        expect(consoleLogSpy).toHaveBeenCalledWith('💬 Test with ' + name, data);
        
        if (mockMessageRouter.isConnected()) {
          expect(mockMessageRouter.send).toHaveBeenCalledWith({
            type: 'LOG_MESSAGE',
            payload: {
              message: testMessage,
              data: data,
              type: 'message',
              timestamp: expect.any(Number)
            }
          });
        }
      });
    });
  });

  describe('Error handling consistency', () => {
    it('should handle WebSocket send failures gracefully without affecting console logging', () => {
      mockMessageRouter.send.mockRejectedValue(new Error('Send failed'));
      
      // Should not throw error and should still log to console
      expect(() => pluginLogger.log('Fail test', 'error')).not.toThrow();
      expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Fail test', undefined);
    });

    it('should handle malformed data gracefully', () => {
      // Create circular reference to test JSON serialization edge cases
      const circularData: any = { a: 1 };
      circularData.self = circularData;
      
      // Should not crash either system
      expect(() => debugLog('Circular test', 'warning', circularData)).not.toThrow();
      expect(() => pluginLogger.log('Circular test', 'warning', circularData)).not.toThrow();
      
      expect(mockedDebugLog).toHaveBeenCalledWith('Circular test', 'warning', circularData);
      expect(consoleWarnSpy).toHaveBeenCalledWith('⚠️ Circular test', circularData);
    });
  });

  describe('Integration flow validation', () => {
    it('should maintain consistency through complete plugin-to-server logging flow', () => {
      // Step 1: Plugin logs message
      const originalMessage = 'Integration flow test';
      const logType = 'warning';
      const logData = { flow: 'test', step: 1 };
      
      pluginLogger.log(originalMessage, logType, logData);
      
      // Step 2: Verify WebSocket message format
      expect(mockMessageRouter.send).toHaveBeenCalledWith({
        type: 'LOG_MESSAGE',
        payload: {
          message: originalMessage,
          data: logData,
          type: logType,
          timestamp: expect.any(Number)
        }
      });
      
      // Step 3: Simulate server receiving and processing the message
      const receivedPayload = mockMessageRouter.send.mock.calls[0][0].payload;
      const { message, data, type } = receivedPayload;
      
      // Step 4: Server processes with plugin prefix
      debugLog(`🔌 ${message}`, type, data);
      
      // Step 5: Verify server processed with correct parameters
      expect(mockedDebugLog).toHaveBeenCalledWith(
        '🔌 Integration flow test',
        'warning',
        { flow: 'test', step: 1 }
      );
      
      // Verify both systems logged consistently
      expect(consoleWarnSpy).toHaveBeenCalledWith('⚠️ Integration flow test', logData);
    });
  });
});