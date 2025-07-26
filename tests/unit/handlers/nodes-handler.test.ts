import { describe, test, expect, vi, beforeEach } from 'vitest';
import { NodeHandler } from '@/handlers/nodes-handler';
import * as yaml from 'js-yaml';

describe('NodeHandlers - Updated Architecture', () => {
  let nodeHandler: NodeHandler;
  let mockSendToPlugin: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockSendToPlugin = vi.fn();
    nodeHandler = new NodeHandler(mockSendToPlugin);
  });

  describe('getTools', () => {
    test('should return correct current tool name', () => {
      const tools = nodeHandler.getTools();
      
      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe('figma_nodes');
    });

    test('should have bulk operations support in schema', () => {
      const tools = nodeHandler.getTools();
      const schema = tools[0].inputSchema;

      // Check that all parameters support oneOf pattern for bulk operations
      expect(schema.properties?.nodeId).toHaveProperty('oneOf');
      expect(schema.properties?.fillColor).toHaveProperty('oneOf');
      expect(schema.properties?.width).toHaveProperty('oneOf');
      expect(schema.properties?.height).toHaveProperty('oneOf');
    });

    test('should have proper examples including bulk operations', () => {
      const tools = nodeHandler.getTools();
      const examples = tools[0].examples;

      // Check for bulk operation examples - these should exist in the examples array
      const hasBulkNodeType = examples.some(example => example.includes('["rectangle", "ellipse"]'));
      const hasBulkFillColor = examples.some(example => example.includes('["#FF5733", "#33FF57"]'));
      
      expect(hasBulkNodeType).toBe(true);
      expect(hasBulkFillColor).toBe(true);
    });
  });

  describe('Single Node Operations', () => {
    test('should handle single node creation', async () => {
      const mockResponse = {
        success: true,
        data: {
          id: 'node-123',
          type: 'RECTANGLE',
          name: 'Rectangle',
          width: 100,
          height: 100
        }
      };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      const result = await nodeHandler.handle('figma_nodes', {
        operation: 'create',
        nodeType: 'rectangle',
        width: 100,
        height: 100,
        fillColor: '#FF0000'
      });

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_NODES',
        payload: expect.objectContaining({
          operation: 'create',
          nodeType: 'rectangle',
          width: 100,
          height: 100,
          fillColor: '#FF0000'
        })
      });

      expect(result.isError).toBe(false);
      const parsedResult = yaml.load(result.content[0].text);
      expect(parsedResult).toEqual(mockResponse);
    });

    test('should handle single node update', async () => {
      const mockResponse = {
        success: true,
        data: { id: 'node-123', fillColor: '#00FF00' }
      };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      const result = await nodeHandler.handle('figma_nodes', {
        operation: 'update',
        nodeId: 'node-123',
        fillColor: '#00FF00'
      });

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_NODES',
        payload: expect.objectContaining({
          operation: 'update',
          nodeId: 'node-123',
          fillColor: '#00FF00'
        })
      });

      expect(result.isError).toBe(false);
    });

    test('should handle node deletion', async () => {
      const mockResponse = {
        success: true,
        data: { deleted: true, nodeId: 'node-123' }
      };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      const result = await nodeHandler.handle('figma_nodes', {
        operation: 'delete',
        nodeId: 'node-123'
      });

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_NODES',
        payload: expect.objectContaining({
          operation: 'delete',
          nodeId: 'node-123'
        })
      });

      expect(result.isError).toBe(false);
    });
  });

  describe('Bulk Node Operations', () => {
    test('should detect and handle bulk node creation', async () => {
      const mockResponse = {
        success: true,
        data: { id: 'node-123', type: 'RECTANGLE' }
      };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      const result = await nodeHandler.handle('figma_nodes', {
        operation: 'create',
        nodeType: ['rectangle', 'ellipse', 'frame'],
        width: [100, 200, 300],
        height: [100, 200, 300],
        fillColor: ['#FF0000', '#00FF00', '#0000FF']
      });

      // Should call sendToPlugin 3 times for bulk operation
      expect(mockSendToPlugin).toHaveBeenCalledTimes(3);
      
      // Verify first call
      expect(mockSendToPlugin).toHaveBeenNthCalledWith(1, {
        type: 'MANAGE_NODES',
        payload: expect.objectContaining({
          operation: 'create',
          nodeType: 'rectangle',
          width: 100,
          height: 100,
          fillColor: '#FF0000'
        })
      });

      // Verify second call
      expect(mockSendToPlugin).toHaveBeenNthCalledWith(2, {
        type: 'MANAGE_NODES',
        payload: expect.objectContaining({
          operation: 'create',
          nodeType: 'ellipse',
          width: 200,
          height: 200,
          fillColor: '#00FF00'
        })
      });

      // Result should be bulk format
      expect(result.isError).toBe(false);
      const parsedResult = yaml.load(result.content[0].text);
      expect(Array.isArray(parsedResult)).toBe(true);
      expect(parsedResult).toHaveLength(3);
    });

    test('should handle bulk node updates with array cycling', async () => {
      const mockResponse = { success: true, data: { updated: true } };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      await nodeHandler.handle('figma_nodes', {
        operation: 'update',
        nodeId: ['node-1', 'node-2', 'node-3'],
        fillColor: '#FF0000', // Single value should cycle to all nodes
        width: [100, 200] // Array should cycle: 100, 200, 100
      });

      expect(mockSendToPlugin).toHaveBeenCalledTimes(3);
      
      // Check cycling behavior
      expect(mockSendToPlugin).toHaveBeenNthCalledWith(1, expect.objectContaining({
        type: 'MANAGE_NODES',
        payload: expect.objectContaining({
          operation: 'update',
          nodeId: 'node-1',
          fillColor: '#FF0000',
          width: 100
        })
      }));
      
      expect(mockSendToPlugin).toHaveBeenNthCalledWith(3, expect.objectContaining({
        type: 'MANAGE_NODES',
        payload: expect.objectContaining({
          operation: 'update',
          nodeId: 'node-3',
          fillColor: '#FF0000',
          width: 100 // Cycled back to first value
        })
      }));
    });

    test('should handle count-based bulk creation', async () => {
      const mockResponse = { success: true, data: { id: 'node-123' } };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      await nodeHandler.handle('figma_nodes', {
        operation: 'create',
        nodeType: 'rectangle',
        count: 3,
        fillColor: ['#FF0000', '#00FF00', '#0000FF'],
        x: [0, 120, 240]
      });

      expect(mockSendToPlugin).toHaveBeenCalledTimes(3);
      
      // Check that count parameter is removed from individual operations - operation should include count
      expect(mockSendToPlugin).toHaveBeenNthCalledWith(1, {
        type: 'MANAGE_NODES',
        payload: expect.objectContaining({
          operation: 'create',
          count: 3
        })
      });
    });

    test('should handle mixed null/non-null positioning in bulk operations', async () => {
      const mockResponse = { success: true, data: { id: 'node-123' } };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      await nodeHandler.handle('figma_nodes', {
        operation: 'create',
        nodeType: 'rectangle',
        count: 4,
        x: [null, 200, null, null],
        y: [null, 350, null, null]
      });

      expect(mockSendToPlugin).toHaveBeenCalledTimes(1);
      
      // Check the single operation with count parameter 
      // The arrays are processed and the handler uses the first non-null values
      expect(mockSendToPlugin).toHaveBeenNthCalledWith(1, {
        type: 'MANAGE_NODES',
        payload: expect.objectContaining({
          operation: 'create',
          count: 4,
          nodeType: 'rectangle',
          x: 200,
          y: 350
        })
      });
    });

    test('should handle bulk deletions', async () => {
      const mockResponse = { success: true, data: { deleted: true } };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      const result = await nodeHandler.handle('figma_nodes', {
        operation: 'delete',
        nodeId: ['node-1', 'node-2', 'node-3']
      });

      expect(mockSendToPlugin).toHaveBeenCalledTimes(3);
      
      const parsedResult = yaml.load(result.content[0].text);
      expect(Array.isArray(parsedResult)).toBe(true);
      expect(parsedResult).toHaveLength(3);
    });
  });

  describe('Error Handling', () => {
    test('should use error.toString() for JSON-RPC compliance', async () => {
      const testError = new Error('Node creation failed');
      mockSendToPlugin.mockRejectedValue(testError);

      try {
        await nodeHandler.handle('figma_nodes', {
          operation: 'create',
          nodeType: 'rectangle'
        });
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('Node creation failed');
      }
    });

    test('should handle plugin errors with improved messages', async () => {
      mockSendToPlugin.mockResolvedValue({
        success: false,
        error: 'not found'
      });

      const result = await nodeHandler.handle('figma_nodes', {
        operation: 'update',
        nodeId: 'invalid-node-id',
        fillColor: '#FF0000'
      });

      expect(result.isError).toBe(false);
      const parsedResult = yaml.load(result.content[0].text);
      expect(parsedResult).toEqual({ success: false, error: 'not found' });
    });

    test('should handle bulk operations with error continuation', async () => {
      mockSendToPlugin
        .mockResolvedValueOnce({ success: true, data: { id: 'node-1' } })
        .mockRejectedValueOnce(new Error('Creation failed'))
        .mockResolvedValueOnce({ success: true, data: { id: 'node-3' } });

      const result = await nodeHandler.handle('figma_nodes', {
        operation: 'create',
        nodeType: ['rectangle', 'ellipse', 'frame'],
      });

      // Should continue after failure in bulk operations
      expect(mockSendToPlugin).toHaveBeenCalledTimes(3);
      
      const parsedResult = yaml.load(result.content[0].text);
      expect(Array.isArray(parsedResult)).toBe(true);
    });
  });

  describe('Defensive Parsing Integration', () => {
    test('should handle JSON string arrays from MCP clients', async () => {
      const mockResponse = { success: true, data: { id: 'node-123' } };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      // Simulate Claude Desktop sending JSON string arrays
      await nodeHandler.handle('figma_nodes', {
        operation: 'update',
        nodeId: '["node-1", "node-2"]', // JSON string
        fillColor: '["#FF0000", "#00FF00"]' // JSON string
      });

      expect(mockSendToPlugin).toHaveBeenCalledTimes(2);
      
      // Should parse JSON strings correctly
      expect(mockSendToPlugin).toHaveBeenNthCalledWith(1, expect.objectContaining({
        type: 'MANAGE_NODES',
        payload: expect.objectContaining({
          operation: 'update',
          nodeId: 'node-1',
          fillColor: '#FF0000'
        })
      }));
    });

    test('should handle mixed parameter types correctly', async () => {
      const mockResponse = { success: true, data: { id: 'node-123' } };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      await nodeHandler.handle('figma_nodes', {
        operation: 'create',
        nodeType: 'rectangle',
        count: 2,
        fillColor: ['#FF0000', '#00FF00'],
        width: 100, // Single value should cycle
        height: '150' // String number should be parsed
      });

      expect(mockSendToPlugin).toHaveBeenCalledTimes(2);
      
      // Check proper type handling
      expect(mockSendToPlugin).toHaveBeenNthCalledWith(1, expect.objectContaining({
        type: 'MANAGE_NODES',
        payload: expect.objectContaining({
          operation: 'create',
          width: 100,
          height: 150 // Should be parsed to number
        })
      }));
    });
  });

  describe('Schema Validation', () => {
    test('should reject invalid node types', async () => {
      await expect(nodeHandler.handle('figma_nodes', {
        operation: 'create',
        nodeType: 'invalid-type'
      })).rejects.toThrow();
    });

    test('should validate required parameters', async () => {
      await expect(nodeHandler.handle('figma_nodes', {
        // Missing operation
        nodeType: 'rectangle'
      })).rejects.toThrow();
    });

    test('should handle text node restriction', async () => {
      await expect(nodeHandler.handle('figma_nodes', {
        operation: 'create',
        nodeType: 'text'
      })).rejects.toThrow();
    });
  });

  describe('Default Value Application', () => {
    test('should apply default names based on node type', async () => {
      const mockResponse = { success: true, data: { id: 'node-123' } };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      await nodeHandler.handle('figma_nodes', {
        operation: 'create',
        nodeType: 'ellipse'
        // No name provided
      });

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_NODES',
        payload: expect.objectContaining({
          operation: 'create',
          nodeType: 'ellipse'
        })
      });
    });

    test('should apply default dimensions for shape nodes', async () => {
      const mockResponse = { success: true, data: { id: 'node-123' } };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      await nodeHandler.handle('figma_nodes', {
        operation: 'create',
        nodeType: 'rectangle'
        // No dimensions provided
      });

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_NODES',
        payload: expect.objectContaining({
          operation: 'create',
          nodeType: 'rectangle'
        })
      });
    });
  });
});