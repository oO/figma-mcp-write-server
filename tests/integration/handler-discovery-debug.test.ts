import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HandlerRegistry } from '../../src/handlers/index';
import { readFileSync, readdirSync } from 'fs';
import path from 'path';

describe('Handler Discovery Debug', () => {
  let registry: HandlerRegistry;
  let mockSendToPlugin: ReturnType<typeof vi.fn>;
  let mockWebSocketServer: any;

  beforeEach(() => {
    mockSendToPlugin = vi.fn();
    mockWebSocketServer = {
      on: vi.fn(),
      emit: vi.fn(),
      isPluginConnected: vi.fn().mockReturnValue(true),
      getConnectionStatus: vi.fn().mockReturnValue({
        pluginConnected: true,
        connectionHealth: 'healthy'
      }),
      getQueueStatus: vi.fn().mockReturnValue({ length: 0 }),
      getHealthMetrics: vi.fn().mockReturnValue({
        successCount: 10,
        errorCount: 0,
        lastError: null
      }),
      getConfig: vi.fn().mockReturnValue({ port: 8765 })
    };
  });

  describe('File Discovery', () => {
    it('should find handler files in source directory', () => {
      const currentDir = process.cwd();
      const sourceDir = path.join(currentDir, 'src', 'handlers');
      
      const files = readdirSync(sourceDir).filter(file => 
        file.endsWith('-handler.ts') && !file.includes('index')
      );
      
      console.log('Found handler files:', files);
      expect(files.length).toBeGreaterThan(0);
      
      // Check specific refactored handlers
      const expectedHandlers = [
        'node-handler.ts',
        'plugin-status-handler.ts',
        'style-handler.ts',
        'text-handler.ts',
        'fonts-handler.ts',
        'components-handler.ts',
        'effects-handler.ts',
        'selection-handler.ts'
      ];
      
      expectedHandlers.forEach(handler => {
        expect(files).toContain(handler);
      });
    });

    it('should find compiled handler files in dist directory', () => {
      const currentDir = process.cwd();
      const distDir = path.join(currentDir, 'dist', 'handlers');
      
      try {
        const files = readdirSync(distDir).filter(file => 
          file.endsWith('-handler.js') && !file.includes('index')
        );
        
        console.log('Found compiled handler files:', files);
        expect(files.length).toBeGreaterThan(0);
      } catch (error) {
        console.log('Dist directory not found or no compiled files:', error);
      }
    });
  });

  describe('Direct Handler Import', () => {
    it('should be able to import a handler directly', async () => {
      try {
        // Try to import node-handler directly
        const nodeHandlerModule = await import('../../src/handlers/node-handler');
        console.log('Direct import successful, exports:', Object.keys(nodeHandlerModule));
        
        expect(nodeHandlerModule.NodeHandler).toBeDefined();
        expect(typeof nodeHandlerModule.NodeHandler).toBe('function');
        
        // Try to instantiate it
        const handler = new nodeHandlerModule.NodeHandler(mockSendToPlugin);
        expect(handler).toBeDefined();
        expect(typeof handler.getTools).toBe('function');
        
        const tools = handler.getTools();
        expect(tools.length).toBeGreaterThan(0);
        console.log('Handler tools:', tools.map(t => t.name));
      } catch (error) {
        console.error('Direct import failed:', error);
        throw error;
      }
    });

    it('should be able to import plugin status handler', async () => {
      try {
        const pluginStatusModule = await import('../../src/handlers/plugin-status-handler');
        console.log('Plugin status import successful, exports:', Object.keys(pluginStatusModule));
        
        expect(pluginStatusModule.PluginStatusHandler).toBeDefined();
        
        // Try to instantiate it
        const handler = new pluginStatusModule.PluginStatusHandler(mockSendToPlugin, mockWebSocketServer);
        expect(handler).toBeDefined();
        
        const tools = handler.getTools();
        expect(tools.length).toBeGreaterThan(0);
        console.log('Plugin status tools:', tools.map(t => t.name));
      } catch (error) {
        console.error('Plugin status import failed:', error);
        throw error;
      }
    });
  });

  describe('Dynamic Import Test', () => {
    it('should test the dynamic import pattern used by HandlerRegistry', async () => {
      const handlerPromises = [
        import('./../../src/handlers/node-handler.js').catch(err => {
          console.log('node-handler.js import failed:', err.message);
          return null;
        }),
        import('./../../src/handlers/plugin-status-handler.js').catch(err => {
          console.log('plugin-status-handler.js import failed:', err.message);
          return null;
        })
      ];

      const results = await Promise.allSettled(handlerPromises);
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          const handlerNames = ['node-handler', 'plugin-status-handler'];
          console.log(`${handlerNames[index]} import succeeded:`, Object.keys(result.value));
        } else {
          console.log(`Import ${index} failed:`, result.status === 'rejected' ? result.reason : 'null value');
        }
      });
    });
  });
});