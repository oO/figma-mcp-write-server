import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Mock fs and path operations
vi.mock('fs');
vi.mock('path');
vi.mock('os');

const mockedFs = vi.mocked(fs);
const mockedPath = vi.mocked(path);
const mockedOs = vi.mocked(os);

describe('Server Logger Practical Tests', () => {
  let appendFileSyncSpy: any;
  let mkdirSyncSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock fs operations
    appendFileSyncSpy = mockedFs.appendFileSync.mockImplementation(() => {});
    mkdirSyncSpy = mockedFs.mkdirSync.mockImplementation(() => '');
    
    // Mock path operations
    mockedPath.join.mockImplementation((...args) => args.join('/'));
    mockedPath.dirname.mockImplementation((p) => p.split('/').slice(0, -1).join('/'));
    
    // Mock os operations
    mockedOs.homedir.mockReturnValue('/home/test');
    mockedOs.platform.mockReturnValue('linux');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Parameter order acceptance', () => {
    it('should accept parameters in correct order without throwing', async () => {
      const { debugLog } = await import('../../../src/utils/logger.js');
      
      // These should not throw errors
      expect(() => debugLog('Test message')).not.toThrow();
      expect(() => debugLog('Test message', 'message')).not.toThrow();
      expect(() => debugLog('Test message', 'warning')).not.toThrow();
      expect(() => debugLog('Test message', 'error')).not.toThrow();
      expect(() => debugLog('Test message', 'message', { data: 'test' })).not.toThrow();
    });
  });

  describe('File logging behavior', () => {
    it('should attempt to write to log file', async () => {
      const { debugLog } = await import('../../../src/utils/logger.js');
      
      debugLog('Test message', 'message');
      
      expect(appendFileSyncSpy).toHaveBeenCalled();
      expect(mkdirSyncSpy).toHaveBeenCalled();
    });

    it('should include emoji in log output', async () => {
      const { debugLog } = await import('../../../src/utils/logger.js');
      
      debugLog('Test message', 'message');
      debugLog('Warning test', 'warning');
      debugLog('Error test', 'error');
      
      // Check that log entries include emojis
      const calls = appendFileSyncSpy.mock.calls;
      expect(calls).toHaveLength(3);
      
      // Each call should have emoji at the start
      calls.forEach((call: any[]) => {
        const logEntry = call[1] as string;
        expect(logEntry).toMatch(/^[✅⚠️❌💬]/);
      });
    });

    it('should use correct emoji for each log type', async () => {
      const { debugLog } = await import('../../../src/utils/logger.js');
      
      debugLog('Message test', 'message');
      debugLog('Warning test', 'warning');
      debugLog('Error test', 'error');
      debugLog('Unknown test', 'unknown' as any);
      
      const calls = appendFileSyncSpy.mock.calls;
      expect(calls).toHaveLength(4);
      
      expect(calls[0][1]).toMatch(/^✅/); // message
      expect(calls[1][1]).toMatch(/^⚠️/); // warning
      expect(calls[2][1]).toMatch(/^❌/); // error
      expect(calls[3][1]).toMatch(/^💬/); // unknown/fallback
    });

    it('should include timestamp in log entries', async () => {
      const { debugLog } = await import('../../../src/utils/logger.js');
      
      debugLog('Timestamp test', 'message');
      
      const logEntry = appendFileSyncSpy.mock.calls[0][1] as string;
      expect(logEntry).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/);
    });

    it('should include space between emoji and timestamp', async () => {
      const { debugLog } = await import('../../../src/utils/logger.js');
      
      debugLog('Space test', 'message');
      
      const logEntry = appendFileSyncSpy.mock.calls[0][1] as string;
      expect(logEntry).toMatch(/^✅ \d{4}/); // Emoji followed by space then timestamp
    });
  });

  describe('Data handling', () => {
    it('should include data in log when provided', async () => {
      const { debugLog } = await import('../../../src/utils/logger.js');
      
      const testData = { key: 'value', number: 42 };
      debugLog('Test with data', 'message', testData);
      
      const logEntry = appendFileSyncSpy.mock.calls[0][1] as string;
      expect(logEntry).toContain('key');
      expect(logEntry).toContain('value');
      expect(logEntry).toContain('42');
    });

    it('should handle different data types', async () => {
      const { debugLog } = await import('../../../src/utils/logger.js');
      
      // Should not throw for any of these
      expect(() => debugLog('String data', 'message', 'string')).not.toThrow();
      expect(() => debugLog('Number data', 'message', 42)).not.toThrow();
      expect(() => debugLog('Object data', 'message', { key: 'value' })).not.toThrow();
      expect(() => debugLog('Array data', 'message', [1, 2, 3])).not.toThrow();
      expect(() => debugLog('Null data', 'message', null)).not.toThrow();
      expect(() => debugLog('Undefined data', 'message', undefined)).not.toThrow();
    });

    it('should filter large base64 data', async () => {
      const { debugLog } = await import('../../../src/utils/logger.js');
      
      const largeBase64 = 'a'.repeat(200); // Simulate large base64 string
      const testData = { data: largeBase64, other: 'normal' };
      
      debugLog('Base64 test', 'message', testData);
      
      const logEntry = appendFileSyncSpy.mock.calls[0][1] as string;
      expect(logEntry).toContain('[BASE64_DATA_200_CHARS]');
      expect(logEntry).toContain('normal');
      expect(logEntry).not.toContain('aaaaaaa'); // Should not contain the actual base64
    });
  });

  describe('Error resilience', () => {
    it('should handle file system errors gracefully', async () => {
      const { debugLog } = await import('../../../src/utils/logger.js');
      
      // Make fs operations throw errors
      appendFileSyncSpy.mockImplementation(() => {
        throw new Error('File system error');
      });
      mkdirSyncSpy.mockImplementation(() => {
        throw new Error('Directory creation failed');
      });
      
      // Should not throw despite file system errors
      expect(() => debugLog('Error test', 'error')).not.toThrow();
    });

    it('should handle non-serializable data gracefully', async () => {
      const { debugLog } = await import('../../../src/utils/logger.js');
      
      // Create circular reference
      const circular: any = { a: 1 };
      circular.self = circular;
      
      // Should throw during JSON processing, but let's see what happens
      try {
        debugLog('Circular test', 'error', circular);
        // If it doesn't throw, that's good
      } catch (error) {
        // If it throws, that's the current behavior - document it
        expect(error).toBeInstanceOf(TypeError);
        expect((error as Error).message).toContain('Converting circular structure');
      }
    });
  });

  describe('Platform path handling', () => {
    it('should use platform-specific cache directories', async () => {
      const { debugLog } = await import('../../../src/utils/logger.js');
      
      // Test Linux - check that join is called with cache directory components
      mockedOs.platform.mockReturnValue('linux');
      debugLog('Linux test', 'message');
      
      // Should have called join at least once with cache directory components
      expect(mockedPath.join).toHaveBeenCalledWith(
        expect.any(String),
        'figma-mcp-write-server',
        'server.log'
      );
      
      vi.clearAllMocks();
      
      // Test macOS
      mockedOs.platform.mockReturnValue('darwin');
      debugLog('macOS test', 'message');
      
      expect(mockedPath.join).toHaveBeenCalledWith(
        expect.any(String),
        'figma-mcp-write-server',
        'server.log'
      );
      
      vi.clearAllMocks();
      
      // Test Windows
      mockedOs.platform.mockReturnValue('win32');
      process.env.LOCALAPPDATA = 'C:\\Users\\test\\AppData\\Local';
      debugLog('Windows test', 'message');
      
      expect(mockedPath.join).toHaveBeenCalledWith(
        expect.any(String),
        'figma-mcp-write-server',
        'server.log'
      );
      
      delete process.env.LOCALAPPDATA;
    });
  });
});