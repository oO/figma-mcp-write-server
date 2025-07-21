import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PluginStatusHandler } from '../../../src/handlers/plugin-status-handler';

describe('PluginStatusHandler', () => {
  let handler: PluginStatusHandler;
  let mockSendToPlugin: ReturnType<typeof vi.fn>;
  let mockWsServer: any;

  beforeEach(() => {
    mockSendToPlugin = vi.fn();
    mockWsServer = {
      getConnectionStatus: vi.fn(),
      getQueueStatus: vi.fn(),
      getHealthMetrics: vi.fn(),
      getConfig: vi.fn()
    };
    handler = new PluginStatusHandler(mockSendToPlugin);
  });

  describe('getTools', () => {
    it('should return figma_plugin_status tool', () => {
      const tools = handler.getTools();
      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe('figma_plugin_status');
      expect(tools[0].description).toContain('connection status');
    });

    it('should have required parameters in schema', () => {
      const tools = handler.getTools();
      const schema = tools[0].inputSchema;
      expect(schema.properties).toHaveProperty('operation');
      expect(schema.properties.operation.enum).toContain('status');
      expect(schema.properties.operation.enum).toContain('ping');
      expect(schema.properties.operation.enum).toContain('health');
      expect(schema.properties.operation.enum).toContain('system');
      expect(schema.properties.operation.enum).toContain('figma');
    });

    it('should have timeout parameter for ping operation', () => {
      const tools = handler.getTools();
      const schema = tools[0].inputSchema;
      expect(schema.properties).toHaveProperty('timeout');
      expect(schema.properties.timeout.description).toContain('ping operation');
    });
  });

  describe('handle', () => {
    it('should handle status operation without plugin calls', async () => {
      const result = await handler.handle('figma_plugin_status', {
        operation: 'status'
      });

      // Status operation doesn't call plugin - it returns local status
      expect(mockSendToPlugin).not.toHaveBeenCalled();
      expect(result.content[0].text).toContain('version:');
      expect(result.content[0].text).toContain('connected: false');
      expect(result.content[0].text).toContain('status: disconnected');
      expect(result.content[0].text).not.toContain('operation:'); // Removed operation field
    });

    it('should handle ping operation with correct message type', async () => {
      mockSendToPlugin.mockResolvedValue({
        success: true,
        data: { pong: true, pluginVersion: '1.0.0' }
      });

      const result = await handler.handle('figma_plugin_status', {
        operation: 'ping'
      });

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'PING_TEST',
        payload: expect.objectContaining({
          operation: 'ping',
          requestType: 'ping'
        })
      });
      expect(result.content[0].text).toContain('responseTime:');
      expect(result.content[0].text).toContain('timeout: 5000ms');
      expect(result.content[0].text).toContain('plugin:');
      expect(result.content[0].text).not.toContain('operation:'); // Removed operation field
    });

    it('should reject unknown tool names', async () => {
      await expect(
        handler.handle('unknown_tool', { operation: 'status' })
      ).rejects.toThrow('Unknown tool: unknown_tool');
    });

    it('should handle figma operation', async () => {
      mockSendToPlugin.mockResolvedValue({
        success: true,
        data: {
          pluginId: 'test-plugin-id',
          apiVersion: '1.0.0',
          editorType: 'figma',
          mode: 'dev',
          pluginVersion: '1.0.0',
          fileName: 'Test Document',
          currentPage: { name: 'Page 1', id: 'page-1' },
          currentUser: { id: 'user-1', name: 'Test User' }
        }
      });

      const result = await handler.handle('figma_plugin_status', {
        operation: 'figma'
      });

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'PLUGIN_STATUS',
        payload: { operation: 'figma_info' }
      });
      expect(result.content[0].text).toContain('pluginId: test-plugin-id');
      expect(result.content[0].text).toContain('apiVersion: 1.0.0');
      expect(result.content[0].text).toContain('fileName: Test Document');
      expect(result.content[0].text).toContain('currentPage:');
      expect(result.content[0].text).toContain('currentUser:');
    });

    it('should handle system operation', async () => {
      const result = await handler.handle('figma_plugin_status', {
        operation: 'system'
      });

      expect(result.content[0].text).toContain('version:');
      expect(result.content[0].text).toContain('platform:');
      expect(result.content[0].text).toContain('arch:');
      expect(result.content[0].text).toContain('nodeVersion:');
      expect(result.content[0].text).toContain('defaultExportPath:');
      expect(result.content[0].text).not.toContain('operation:'); // Removed operation field
    });

    it('should handle health operation without WebSocket server', async () => {
      const result = await handler.handle('figma_plugin_status', {
        operation: 'health'
      });

      expect(result.content[0].text).toContain('available: false');
      expect(result.content[0].text).toContain('Connection health monitoring not available');
      expect(result.content[0].text).not.toContain('operation:'); // Removed operation field
    });

    it('should handle health operation with WebSocket server', async () => {
      mockWsServer.getConnectionStatus.mockReturnValue({
        pluginConnected: true,
        connectionHealth: 'healthy',
        lastHeartbeat: Date.now() - 1000,
        averageResponseTime: 100
      });
      mockWsServer.getHealthMetrics.mockReturnValue({
        successCount: 10,
        errorCount: 2,
        lastError: null
      });
      mockWsServer.getQueueStatus.mockReturnValue({
        length: 5
      });

      const handlerWithWs = new PluginStatusHandler(mockSendToPlugin, mockWsServer);
      const result = await handlerWithWs.handle('figma_plugin_status', {
        operation: 'health'
      });

      expect(result.content[0].text).toContain('connectionMetrics:');
      expect(result.content[0].text).toContain('healthScore:');
      expect(result.content[0].text).not.toContain('operation:'); // Removed operation field
    });

    it('should handle status operation with WebSocket server', async () => {
      mockWsServer.getConnectionStatus.mockReturnValue({
        pluginConnected: true,
        connectionHealth: 'healthy',
        lastHeartbeat: Date.now() - 1000
      });
      mockWsServer.getQueueStatus.mockReturnValue({
        length: 3
      });
      mockWsServer.getConfig.mockReturnValue({
        port: 8080
      });

      const handlerWithWs = new PluginStatusHandler(mockSendToPlugin, mockWsServer);
      const result = await handlerWithWs.handle('figma_plugin_status', {
        operation: 'status'
      });

      expect(result.content[0].text).toContain('connected: true');
      expect(result.content[0].text).toContain('status: ready');
      expect(result.content[0].text).toContain('port: 8080');
      expect(result.content[0].text).not.toContain('operation:'); // Removed operation field
    });

    it('should handle ping operation timeout', async () => {
      mockSendToPlugin.mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Ping timeout')), 200)
        )
      );

      await expect(
        handler.handle('figma_plugin_status', {
          operation: 'ping',
          timeout: 150
        })
      ).rejects.toThrow('Ping timeout');
    });

    it('should handle figma operation failure', async () => {
      mockSendToPlugin.mockResolvedValue({
        success: false,
        error: 'Plugin not ready'
      });

      await expect(
        handler.handle('figma_plugin_status', {
          operation: 'figma'
        })
      ).rejects.toThrow('plugin_status failed: Error: Plugin not ready');
    });

    it('should handle ping operation with custom timeout', async () => {
      mockSendToPlugin.mockResolvedValue({
        success: true,
        data: { pong: true, pluginVersion: '1.0.0' }
      });

      const result = await handler.handle('figma_plugin_status', {
        operation: 'ping',
        timeout: 3000
      });

      expect(result.content[0].text).toContain('timeout: 3000ms');
      expect(result.content[0].text).toContain('responseTime:');
    });

    it('should validate required operation parameter', async () => {
      await expect(
        handler.handle('figma_plugin_status', {})
      ).rejects.toThrow();
    });

    it('should validate enum operation values', async () => {
      await expect(
        handler.handle('figma_plugin_status', { operation: 'invalid_operation' })
      ).rejects.toThrow();
    });

    it('should handle unsupported operation through validation', async () => {
      await expect(
        handler.handle('figma_plugin_status', { operation: 'unsupported' })
      ).rejects.toThrow('Validation failed: plugin_status: Parameter \'operation\' has invalid value \'unsupported\'');
    });

    it('should return default export path for unknown platform', async () => {
      // Mock os.platform to return unknown platform
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'unknown' });

      const result = await handler.handle('figma_plugin_status', {
        operation: 'system'
      });

      expect(result.content[0].text).toContain('defaultExportPath:');
      
      // Restore original platform
      Object.defineProperty(process, 'platform', { value: originalPlatform });
    });

    it('should handle health operation with error metrics', async () => {
      mockWsServer.getConnectionStatus.mockReturnValue({
        pluginConnected: true,
        connectionHealth: 'healthy',
        lastHeartbeat: Date.now() - 1000,
        averageResponseTime: 100
      });
      mockWsServer.getHealthMetrics.mockReturnValue({
        successCount: 5,
        errorCount: 3,
        lastError: 'Test error message'
      });
      mockWsServer.getQueueStatus.mockReturnValue({
        length: 2
      });

      const handlerWithWs = new PluginStatusHandler(mockSendToPlugin, mockWsServer);
      const result = await handlerWithWs.handle('figma_plugin_status', {
        operation: 'health'
      });

      expect(result.content[0].text).toContain('recentErrors:');
      expect(result.content[0].text).toContain('Test error message');
      expect(result.content[0].text).toContain('processing: 0');
    });

    it('should handle health operation with high error rate affecting health score', async () => {
      mockWsServer.getConnectionStatus.mockReturnValue({
        pluginConnected: false, // This affects health score
        connectionHealth: 'unhealthy',
        lastHeartbeat: Date.now() - 1000,
        averageResponseTime: 6000 // High response time affects score
      });
      mockWsServer.getHealthMetrics.mockReturnValue({
        successCount: 2,
        errorCount: 10, // High error count affects score
        lastError: null
      });
      mockWsServer.getQueueStatus.mockReturnValue({
        length: 15 // High queue length affects score
      });

      const handlerWithWs = new PluginStatusHandler(mockSendToPlugin, mockWsServer);
      const result = await handlerWithWs.handle('figma_plugin_status', {
        operation: 'health'
      });

      expect(result.content[0].text).toContain('healthScore:');
      expect(result.content[0].text).toContain('recentErrors: []'); // No lastError
    });
  });
});