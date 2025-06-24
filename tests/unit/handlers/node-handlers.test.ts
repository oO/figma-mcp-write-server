import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { NodeHandlers } from '../../../src/handlers/node-handlers.js';

describe('NodeHandlers', () => {
  let nodeHandlers: NodeHandlers;
  let mockSendToPlugin: jest.Mock;

  beforeEach(() => {
    mockSendToPlugin = jest.fn();
    nodeHandlers = new NodeHandlers(mockSendToPlugin);
  });

  describe('getTools', () => {
    test('should return all node-related tools', () => {
      const tools = nodeHandlers.getTools();
      const toolNames = tools.map(tool => tool.name);
      
      expect(toolNames).toContain('create_node');
      expect(toolNames).toContain('update_node');
      expect(toolNames).toContain('manage_nodes');
    });

    test('should have correct tool schemas', () => {
      const tools = nodeHandlers.getTools();
      const createNodeTool = tools.find(tool => tool.name === 'create_node');
      
      expect(createNodeTool).toBeDefined();
      expect(createNodeTool?.inputSchema.properties.nodeType).toBeDefined();
      expect(createNodeTool?.inputSchema.required).toContain('nodeType');
    });
  });

  describe('createNode', () => {
    test('should validate required nodeType parameter', async () => {
      mockSendToPlugin.mockResolvedValue({ success: false, error: 'Invalid nodeType' });

      await expect(nodeHandlers.handle('create_node', {}))
        .rejects.toThrow();
    });

    test('should create rectangle with valid parameters', async () => {
      const mockResponse = {
        success: true,
        data: {
          nodeId: 'node-123',
          nodeType: 'rectangle',
          name: 'Test Rectangle',
          width: 100,
          height: 100
        }
      };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      const result = await nodeHandlers.handle('create_node', {
        nodeType: 'rectangle',
        name: 'Test Rectangle',
        width: 100,
        height: 100,
        fillColor: '#FF0000'
      });

      expect(result.isError).toBe(false);
      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'CREATE_NODE',
        payload: expect.objectContaining({
          nodeType: 'rectangle',
          name: 'Test Rectangle',
          width: 100,
          height: 100,
          fillColor: '#FF0000'
        })
      });
    });

    test('should reject text node creation through schema validation', async () => {
      await expect(nodeHandlers.handle('create_node', {
        nodeType: 'text',
        content: 'Hello World',
        fontSize: 16
      })).rejects.toThrow(); // Schema validation will reject 'text' as invalid nodeType
    });

    test('should handle color format conversion', async () => {
      const mockResponse = { success: true, data: { nodeId: 'node-789' } };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      await nodeHandlers.handle('create_node', {
        nodeType: 'rectangle',
        width: 100,
        height: 100,
        fillColor: '#FF0000'
      });

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'CREATE_NODE',
        payload: expect.objectContaining({
          fillColor: '#FF0000'
        })
      });
    });
  });


  describe('updateNode', () => {
    test('should update existing node properties', async () => {
      const mockResponse = {
        success: true,
        data: {
          nodeId: 'node-123',
          updatedProperties: ['width', 'height', 'fillColor']
        }
      };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      const result = await nodeHandlers.handle('update_node', {
        nodeId: 'node-123',
        width: 200,
        height: 150,
        fillColor: '#00FF00'
      });

      expect(result.isError).toBe(false);
      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'UPDATE_NODE',
        payload: expect.objectContaining({
          nodeId: 'node-123',
          width: 200,
          height: 150,
          fillColor: '#00FF00'
        })
      });
    });

    test('should validate nodeId parameter', async () => {
      await expect(nodeHandlers.handle('update_node', { width: 100 }))
        .rejects.toThrow();
    });
  });

  describe('manageNodes', () => {
    test('should handle node duplication', async () => {
      const mockResponse = {
        success: true,
        data: {
          operation: 'duplicate',
          originalNodeId: 'node-123',
          newNodeId: 'node-456'
        }
      };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      const result = await nodeHandlers.handle('manage_nodes', {
        operation: 'duplicate',
        nodeId: 'node-123'
      });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('duplicate');
    });

    test('should handle node deletion', async () => {
      const mockResponse = {
        success: true,
        data: {
          operation: 'delete',
          deletedNodeId: 'node-123'
        }
      };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      const result = await nodeHandlers.handle('manage_nodes', {
        operation: 'delete',
        nodeId: 'node-123'
      });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('delete');
    });

    test('should validate required operation parameter', async () => {
      await expect(nodeHandlers.handle('manage_nodes', { nodeId: 'node-123' }))
        .rejects.toThrow();
    });
  });

  describe('Error Handling', () => {
    test('should handle plugin connection errors', async () => {
      mockSendToPlugin.mockRejectedValue(new Error('Plugin not connected'));

      await expect(nodeHandlers.handle('create_node', {
        nodeType: 'rectangle',
        width: 100,
        height: 100
      })).rejects.toThrow('Plugin not connected');
    });

    test('should handle plugin operation failures', async () => {
      mockSendToPlugin.mockResolvedValue({
        success: false,
        error: 'Invalid node parameters'
      });

      await expect(nodeHandlers.handle('create_node', {
        nodeType: 'rectangle',
        width: -100, // Invalid width
        height: 100
      })).rejects.toThrow('Invalid node parameters');
    });
  });
});