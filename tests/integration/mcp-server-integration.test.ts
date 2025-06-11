import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { HandlerRegistry } from '../../src/handlers/index.js';
import { FigmaWebSocketServer } from '../../src/websocket/websocket-server.js';
import { DEFAULT_CONFIG } from '../../src/types/index.js';

// Mock the WebSocket server to avoid real network operations
jest.mock('../../src/websocket/websocket-server.js');

describe('MCP Server Integration', () => {
  let handlerRegistry: HandlerRegistry;
  let mockSendToPlugin: jest.Mock;
  let mockWebSocketServer: jest.Mocked<FigmaWebSocketServer>;

  beforeEach(() => {
    mockSendToPlugin = jest.fn();
    mockWebSocketServer = new FigmaWebSocketServer(DEFAULT_CONFIG) as jest.Mocked<FigmaWebSocketServer>;
    
    // Mock WebSocket server methods
    mockWebSocketServer.isPluginConnected = jest.fn().mockReturnValue(true);
    mockWebSocketServer.getConnectionStatus = jest.fn().mockReturnValue({
      pluginConnected: true,
      lastHeartbeat: new Date(),
      activeClients: 1,
      connectionHealth: 'healthy',
      reconnectAttempts: 0,
      averageResponseTime: 150,
      queuedRequests: 0
    });
    mockWebSocketServer.getHealthMetrics = jest.fn().mockReturnValue({
      responseTime: [100, 150, 200],
      errorCount: 0,
      successCount: 5,
      lastError: null,
      lastSuccess: new Date()
    });
    mockWebSocketServer.getConnectionCount = jest.fn().mockReturnValue(1);
    mockWebSocketServer.getQueueStatus = jest.fn().mockReturnValue({
      length: 0,
      requests: []
    });

    handlerRegistry = new HandlerRegistry(mockSendToPlugin, mockWebSocketServer);
  });

  describe('Tool Registration', () => {
    test('should register all handler tools', () => {
      const tools = handlerRegistry.getTools();
      const toolNames = tools.map(tool => tool.name);
      
      // Check that core tools are registered
      expect(toolNames).toContain('create_node');
      expect(toolNames).toContain('create_text');
      expect(toolNames).toContain('update_node');
      expect(toolNames).toContain('manage_nodes');
      expect(toolNames).toContain('get_selection');
      expect(toolNames).toContain('set_selection');
      expect(toolNames).toContain('manage_styles');
      expect(toolNames).toContain('manage_auto_layout');
      expect(toolNames).toContain('manage_variables');
      expect(toolNames).toContain('manage_collections');
      expect(toolNames).toContain('manage_components');
      
      // Check plugin status tools
      expect(toolNames).toContain('get_plugin_status');
      expect(toolNames).toContain('get_connection_health');
    });

    test('should have valid tool schemas', () => {
      const tools = handlerRegistry.getTools();
      
      tools.forEach(tool => {
        expect(tool.name).toBeDefined();
        expect(tool.description).toBeDefined();
        expect(tool.inputSchema).toBeDefined();
        expect(tool.inputSchema.type).toBe('object');
        expect(tool.inputSchema.properties).toBeDefined();
      });
    });
  });

  describe('Tool Call Routing', () => {
    test('should route node creation calls to NodeHandlers', async () => {
      const mockResponse = {
        success: true,
        data: { nodeId: 'node-123', nodeType: 'rectangle' }
      };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      const result = await handlerRegistry.handleToolCall('create_node', {
        nodeType: 'rectangle',
        width: 100,
        height: 100
      });

      expect(result.isError).toBe(false);
      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'CREATE_NODE',
        payload: expect.objectContaining({
          nodeType: 'rectangle',
          width: 100,
          height: 100
        })
      });
    });

    test('should route selection calls to SelectionHandlers', async () => {
      const mockResponse = {
        success: true,
        data: { selectedNodeIds: ['node-1', 'node-2'], selectionCount: 2 }
      };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      const result = await handlerRegistry.handleToolCall('set_selection', {
        nodeIds: ['node-1', 'node-2']
      });

      expect(result.isError).toBe(false);
      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'SET_SELECTION',
        payload: { nodeIds: ['node-1', 'node-2'] }
      });
    });

    test('should route style management calls to StyleHandlers', async () => {
      const mockResponse = {
        success: true,
        data: { operation: 'list', styleType: 'paint', styles: [] }
      };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      const result = await handlerRegistry.handleToolCall('manage_styles', {
        operation: 'list',
        styleType: 'paint'
      });

      expect(result.isError).toBe(false);
      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_STYLES',
        payload: { operation: 'list', styleType: 'paint' }
      });
    });

    test('should route variable calls to VariableHandlers', async () => {
      const mockResponse = {
        success: true,
        data: { variableId: 'var-123', name: 'Primary Color' }
      };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      const result = await handlerRegistry.handleToolCall('manage_variables', {
        operation: 'create',
        collectionId: 'collection-1',
        variableName: 'Primary Color',
        variableType: 'COLOR'
      });

      expect(result.isError).toBe(false);
      expect(mockSendToPlugin).toHaveBeenCalled();
    });
  });

  describe('Plugin Status Tools', () => {
    test('should handle get_plugin_status calls', async () => {
      const result = await handlerRegistry.handleToolCall('get_plugin_status', {});

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('status: active');
      expect(result.content[0].text).toContain('connected: true');
    });

    test('should handle get_connection_health calls', async () => {
      const result = await handlerRegistry.handleToolCall('get_connection_health', {});

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('connectionHealth: healthy');
      expect(result.content[0].text).toContain('successful: 5');
      expect(result.content[0].text).toContain('queueLength: 0');
    });
  });

  describe('Error Handling', () => {
    test('should handle unknown tool calls gracefully', async () => {
      await expect(handlerRegistry.handleToolCall('unknown_tool', {}))
        .rejects.toThrow('Unknown tool: unknown_tool');
    });

    test('should handle plugin communication errors', async () => {
      mockSendToPlugin.mockRejectedValue(new Error('Plugin not responding'));

      await expect(handlerRegistry.handleToolCall('create_node', {
        nodeType: 'rectangle'
      })).rejects.toThrow('Plugin not responding');
    });

    test('should handle validation errors', async () => {
      await expect(handlerRegistry.handleToolCall('create_node', {
        // Missing required nodeType
      })).rejects.toThrow('Required');
    });

    test('should handle plugin failure responses', async () => {
      mockSendToPlugin.mockResolvedValue({
        success: false,
        error: 'Invalid node parameters'
      });

      await expect(handlerRegistry.handleToolCall('create_node', {
        nodeType: 'rectangle',
        width: -100 // Invalid width
      })).rejects.toThrow('Invalid node parameters');
    });
  });

  describe('Multi-Tool Workflow', () => {
    test('should support sequential tool calls', async () => {
      // Step 1: Create a node
      mockSendToPlugin.mockResolvedValueOnce({
        success: true,
        data: { nodeId: 'node-123', nodeType: 'rectangle' }
      });

      const createResult = await handlerRegistry.handleToolCall('create_node', {
        nodeType: 'rectangle',
        width: 100,
        height: 100,
        fillColor: '#FF0000'
      });

      expect(createResult.isError).toBe(false);

      // Step 2: Select the created node
      mockSendToPlugin.mockResolvedValueOnce({
        success: true,
        data: { selectedNodeIds: ['node-123'], selectionCount: 1 }
      });

      const selectResult = await handlerRegistry.handleToolCall('set_selection', {
        nodeIds: ['node-123']
      });

      expect(selectResult.isError).toBe(false);

      // Step 3: Update the node
      mockSendToPlugin.mockResolvedValueOnce({
        success: true,
        data: { nodeId: 'node-123', updatedProperties: ['width', 'height'] }
      });

      const updateResult = await handlerRegistry.handleToolCall('update_node', {
        nodeId: 'node-123',
        width: 200,
        height: 150
      });

      expect(updateResult.isError).toBe(false);

      // Verify all calls were made
      expect(mockSendToPlugin).toHaveBeenCalledTimes(3);
    });

    test('should handle mixed success and failure in workflow', async () => {
      // Step 1: Successful node creation
      mockSendToPlugin.mockResolvedValueOnce({
        success: true,
        data: { nodeId: 'node-123' }
      });

      const createResult = await handlerRegistry.handleToolCall('create_node', {
        nodeType: 'rectangle'
      });

      expect(createResult.isError).toBe(false);

      // Step 2: Failed selection (node doesn't exist)
      mockSendToPlugin.mockResolvedValueOnce({
        success: false,
        error: 'Node not found'
      });

      await expect(handlerRegistry.handleToolCall('set_selection', {
        nodeIds: ['invalid-node-id']
      })).rejects.toThrow('Node not found');
    });
  });

  describe('Performance and Monitoring', () => {
    test('should track handler performance metrics', async () => {
      const startTime = Date.now();

      mockSendToPlugin.mockResolvedValue({
        success: true,
        data: { nodeId: 'node-123' }
      });

      await handlerRegistry.handleToolCall('create_node', {
        nodeType: 'rectangle'
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Verify the call completed in reasonable time
      expect(duration).toBeLessThan(1000);
    });
  });
});