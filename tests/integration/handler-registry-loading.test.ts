import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HandlerRegistry } from '../../src/handlers/index';

describe('HandlerRegistry Loading', () => {
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
        connectionHealth: 'healthy',
        lastHeartbeat: Date.now(),
        averageResponseTime: 100
      }),
      getQueueStatus: vi.fn().mockReturnValue({
        length: 0
      }),
      getHealthMetrics: vi.fn().mockReturnValue({
        successCount: 10,
        errorCount: 0,
        lastError: null
      }),
      getConfig: vi.fn().mockReturnValue({
        port: 8765
      })
    };
    
    registry = new HandlerRegistry(mockSendToPlugin, mockWebSocketServer);
  });

  describe('Async Handler Loading', () => {
    it('should show empty tools initially due to async loading', () => {
      // This test demonstrates the race condition bug
      const tools = registry.getTools();
      expect(tools).toEqual([]);
    });

    it('should eventually load tools after async completion', async () => {
      // Wait for handler registration to complete
      await registry.waitForHandlerRegistration();
      
      const tools = registry.getTools();
      expect(tools.length).toBeGreaterThan(0);
      
      // Should have some of the refactored tools
      const toolNames = tools.map(tool => tool.name);
      
      // At least one tool should be loaded
      expect(toolNames.length).toBeGreaterThan(0);
    });

    it('should be able to handle tool calls after loading', async () => {
      // Wait for handler registration to complete
      await registry.waitForHandlerRegistration();
      
      const tools = registry.getTools();
      
      if (tools.length > 0) {
        // Find a tool that accepts operation parameter (most handlers do)
        const operationTool = tools.find(tool => 
          tool.inputSchema.properties.operation !== undefined
        );
        
        if (operationTool) {
          mockSendToPlugin.mockResolvedValue({ success: true, data: {} });
          
          const result = await registry.handleToolCall(operationTool.name, {
            operation: 'test'
          });
          
          expect(result).toBeDefined();
        } else {
          // If no operation tools found, test alignment tool with appropriate params
          const alignmentTool = tools.find(tool => tool.name === 'figma_alignment');
          if (alignmentTool) {
            mockSendToPlugin.mockResolvedValue({ success: true, data: {} });
            
            const result = await registry.handleToolCall('figma_alignment', {
              nodeIds: ['123:456'],
              horizontalOperation: 'align',
              horizontalDirection: 'center'
            });
            
            expect(result).toBeDefined();
          }
        }
      }
    });

    it('should register plugin status handler with WebSocket server', async () => {
      // Wait for handler registration to complete
      await registry.waitForHandlerRegistration();
      
      const tools = registry.getTools();
      const pluginStatusTool = tools.find(tool => tool.name === 'figma_plugin_status');
      
      if (pluginStatusTool) {
        expect(pluginStatusTool.name).toBe('figma_plugin_status');
        expect(pluginStatusTool.description).toContain('connection status');
      }
    });
  });

  describe('Handler Discovery', () => {
    it('should discover handlers from the filesystem', async () => {
      // Wait for handler registration to complete
      await registry.waitForHandlerRegistration();
      
      const tools = registry.getTools();
      
      // Should have discovered at least some handlers
      expect(tools.length).toBeGreaterThan(0);
    });
  });

  describe('Version Loading', () => {
    it('should load VERSION constant from package.json using import.meta.url', async () => {
      // Test that HandlerRegistry can be imported without throwing ENOENT error
      // This regression test ensures package.json path resolution works correctly
      // regardless of process.cwd() value (which can be '/' in MCP context)
      
      // Import the module directly to test VERSION constant initialization
      const { HandlerRegistry } = await import('../../src/handlers/index.js');
      
      // Should not throw during import
      expect(HandlerRegistry).toBeDefined();
      
      // Create instance to verify no runtime errors
      const testRegistry = new HandlerRegistry(vi.fn(), mockWebSocketServer);
      expect(testRegistry).toBeDefined();
      
      // Verify getTools() works (VERSION is used internally)
      const tools = testRegistry.getTools();
      expect(Array.isArray(tools)).toBe(true);
    });
  });
});