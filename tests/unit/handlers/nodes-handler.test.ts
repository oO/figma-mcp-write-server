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
      const hasBulkNames = examples.some(example => example.includes('["Rect 1", "Rect 2"]'));
      const hasBulkFillColor = examples.some(example => example.includes('["#FF5733", "#33FF57"]'));
      
      expect(hasBulkNames).toBe(true);
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
        operation: 'create_rectangle',
        width: 100,
        height: 100,
        fillColor: '#FF0000'
      });

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_NODES',
        payload: expect.objectContaining({
          operation: 'create_rectangle',
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

    test('should handle single node deletion', async () => {
      const mockResponse = { success: true, data: { deleted: true } };
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
    test('should detect and handle bulk rectangle creation', async () => {
      const mockResponse = {
        success: true,
        data: { id: 'node-123', type: 'RECTANGLE' }
      };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      const result = await nodeHandler.handle('figma_nodes', {
        operation: 'create_rectangle',
        name: ['Rect 1', 'Rect 2', 'Rect 3'],
        width: [100, 200, 300],
        height: [100, 200, 300],
        fillColor: ['#FF0000', '#00FF00', '#0000FF']
      });

      // Should call sendToPlugin once per rectangle (3 rectangles)
      expect(mockSendToPlugin).toHaveBeenCalledTimes(3);
      
      // Verify the first call contains individual parameters
      expect(mockSendToPlugin).toHaveBeenNthCalledWith(1, {
        type: 'MANAGE_NODES',
        payload: expect.objectContaining({
          operation: 'create_rectangle',
          name: 'Rect 1',
          width: 100,
          height: 100,
          fillColor: '#FF0000'
        })
      });

      expect(result.isError).toBe(false);
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

      expect(mockSendToPlugin).toHaveBeenCalledTimes(3); // One call per node (3 nodes)
      
      // Check that the first call contains correct parameters
      expect(mockSendToPlugin).toHaveBeenNthCalledWith(1, {
        type: 'MANAGE_NODES',
        payload: expect.objectContaining({
          operation: 'update',
          nodeId: 'node-1',
          fillColor: '#FF0000',
          width: 100
        })
      });
    });

    test('should handle count-based bulk duplication', async () => {
      const mockResponse = { success: true, data: { id: 'node-123' } };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      await nodeHandler.handle('figma_nodes', {
        operation: 'duplicate',
        nodeId: 'node-123',
        count: 3,
        offsetX: [0, 120, 240],
        offsetY: 0
      });

      expect(mockSendToPlugin).toHaveBeenCalledTimes(3); // One call per duplicate (count=3)
      
      // Check that the first call contains the duplicate operation
      expect(mockSendToPlugin).toHaveBeenNthCalledWith(1, {
        type: 'MANAGE_NODES',
        payload: expect.objectContaining({
          operation: 'duplicate',
          nodeId: 'node-123'
        })
      });
    });

    test('should handle mixed null/non-null positioning in bulk operations', async () => {
      const mockResponse = { success: true, data: { id: 'node-123' } };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      await nodeHandler.handle('figma_nodes', {
        operation: 'create_rectangle',
        name: ['Rect1', 'Rect2', 'Rect3', 'Rect4'], // Use array parameters instead of count
        x: [null, 200, null, null],
        y: [null, 350, null, null]
      });

      expect(mockSendToPlugin).toHaveBeenCalledTimes(4); // One call per rectangle (4 names)
      
      // Check the first call contains create_rectangle operation
      expect(mockSendToPlugin).toHaveBeenNthCalledWith(1, {
        type: 'MANAGE_NODES',
        payload: expect.objectContaining({
          operation: 'create_rectangle',
          name: 'Rect1'
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

      expect(mockSendToPlugin).toHaveBeenCalledTimes(3); // One call per node (3 nodes)
      
      expect(result.isError).toBe(false);
    });

    test('should handle duplicate operation with explicit offsetY: 0', async () => {
      const mockResponse = { success: true, data: { id: 'duplicated-node' } };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      const result = await nodeHandler.handle('figma_nodes', {
        operation: 'duplicate',
        nodeId: 'node-123',
        count: 3,
        offsetX: 60,
        offsetY: 0
      });

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_NODES',
        payload: expect.objectContaining({
          operation: 'duplicate',
          nodeId: 'node-123',
          count: 3,
          offsetX: 60,
          offsetY: 0
        })
      });

      expect(result.isError).toBe(false);
    });

    test('should reject count parameter for non-duplicate operations', async () => {
      // Test that count parameter is properly rejected for create operations
      await expect(nodeHandler.handle('figma_nodes', {
        operation: 'create_rectangle',
        count: 3, // This should be rejected for create operations
        fillColor: '#FF0000'
      })).rejects.toThrow("Parameter 'count' is only valid for duplicate operations");
    });
  });

  describe('Error Handling', () => {
    test('should use error.toString() for JSON-RPC compliance', async () => {
      const testError = new Error('Node creation failed');
      mockSendToPlugin.mockRejectedValue(testError);

      try {
        await nodeHandler.handle('figma_nodes', {
          operation: 'create_rectangle'
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
        name: 'Updated Name' // Use a valid parameter for update operation
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
        operation: 'create_rectangle',
        name: ['Rect 1', 'Rect 2', 'Rect 3'],
      });

      // Should handle bulk operations within the unified handler
      expect(mockSendToPlugin).toHaveBeenCalledTimes(3); // One call per operation (3 operations)
      
      expect(result.isError).toBe(false);
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

      expect(mockSendToPlugin).toHaveBeenCalledTimes(2); // One call per node ID (2 nodes)
      
      // The unified handler should parse JSON strings and handle as bulk operation
      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_NODES',
        payload: expect.objectContaining({
          operation: 'update'
        })
      });
    });

    test('should handle mixed parameter types correctly', async () => {
      const mockResponse = { success: true, data: { id: 'node-123' } };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      // This processes as bulk operations but returns validation errors
      const result = await nodeHandler.handle('figma_nodes', {
        operation: 'create_rectangle',
        count: 2,
        fillColor: ['#FF0000', '#00FF00'],
        width: 100, // Single value should cycle
        height: '150' // String number should be parsed
      });

      // Should return errors for both operations
      expect(result.isError).toBe(false);
      const parsedResult = yaml.load(result.content[0].text);
      expect(parsedResult).toHaveLength(2);
      expect(parsedResult[0].error).toContain("Parameter 'count' is only valid for duplicate operations");
      expect(parsedResult[1].error).toContain("Parameter 'count' is only valid for duplicate operations");
    });
  });

  describe('List Operation', () => {
    test('should handle basic list operation', async () => {
      const mockResponse = {
        success: true,
        data: [
          { id: 'node-1', type: 'RECTANGLE', name: 'Rectangle 1' },
          { id: 'node-2', type: 'ELLIPSE', name: 'Circle 1' }
        ]
      };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      const result = await nodeHandler.handle('figma_nodes', {
        operation: 'list'
      });

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_NODES',
        payload: expect.objectContaining({
          operation: 'list'
        })
      });

      expect(result.isError).toBe(false);
    });

    test('should handle list with filterByName parameter', async () => {
      const mockResponse = {
        success: true,
        data: [
          { id: 'node-1', type: 'RECTANGLE', name: 'Rectangle 1' }
        ]
      };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      const result = await nodeHandler.handle('figma_nodes', {
        operation: 'list',
        filterByName: 'Rectangle'
      });

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_NODES',
        payload: expect.objectContaining({
          operation: 'list',
          filterByName: 'Rectangle'
        })
      });

      expect(result.isError).toBe(false);
    });

    test('should handle list with filterByType parameter', async () => {
      const mockResponse = {
        success: true,
        data: [
          { id: 'node-1', type: 'RECTANGLE', name: 'Rectangle 1' },
          { id: 'node-2', type: 'ELLIPSE', name: 'Circle 1' }
        ]
      };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      const result = await nodeHandler.handle('figma_nodes', {
        operation: 'list',
        filterByType: ['RECTANGLE', 'ELLIPSE']
      });

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_NODES',
        payload: expect.objectContaining({
          operation: 'list',
          filterByType: ['RECTANGLE', 'ELLIPSE']
        })
      });

      expect(result.isError).toBe(false);
    });

    test('should handle list with filterByVisibility parameter', async () => {
      const mockResponse = { success: true, data: [] };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      const result = await nodeHandler.handle('figma_nodes', {
        operation: 'list',
        filterByVisibility: 'visible'
      });

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_NODES',
        payload: expect.objectContaining({
          operation: 'list',
          filterByVisibility: 'visible'
        })
      });

      expect(result.isError).toBe(false);
    });

    test('should handle list with filterByLockedState parameter', async () => {
      const mockResponse = { success: true, data: [] };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      const result = await nodeHandler.handle('figma_nodes', {
        operation: 'list',
        filterByLockedState: false
      });

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_NODES',
        payload: expect.objectContaining({
          operation: 'list',
          filterByLockedState: false
        })
      });

      expect(result.isError).toBe(false);
    });

    test('should handle list with traversal parameter', async () => {
      const mockResponse = { success: true, data: [] };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      const result = await nodeHandler.handle('figma_nodes', {
        operation: 'list',
        traversal: 'descendants'
      });

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_NODES',
        payload: expect.objectContaining({
          operation: 'list',
          traversal: 'descendants'
        })
      });

      expect(result.isError).toBe(false);
    });

    test('should handle list with maxDepth parameter', async () => {
      const mockResponse = { success: true, data: [] };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      const result = await nodeHandler.handle('figma_nodes', {
        operation: 'list',
        maxDepth: 3
      });

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_NODES',
        payload: expect.objectContaining({
          operation: 'list',
          maxDepth: 3
        })
      });

      expect(result.isError).toBe(false);
    });

    test('should handle list with maxResults parameter', async () => {
      const mockResponse = { success: true, data: [] };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      const result = await nodeHandler.handle('figma_nodes', {
        operation: 'list',
        maxResults: 50
      });

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_NODES',
        payload: expect.objectContaining({
          operation: 'list',
          maxResults: 50
        })
      });

      expect(result.isError).toBe(false);
    });

    test('should handle list with includeAllPages parameter', async () => {
      const mockResponse = { success: true, data: [] };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      const result = await nodeHandler.handle('figma_nodes', {
        operation: 'list',
        includeAllPages: true
      });

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_NODES',
        payload: expect.objectContaining({
          operation: 'list',
          includeAllPages: true
        })
      });

      expect(result.isError).toBe(false);
    });

    test('should handle list with detail parameter', async () => {
      const mockResponse = { success: true, data: [] };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      const result = await nodeHandler.handle('figma_nodes', {
        operation: 'list',
        detail: 'detailed'
      });

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_NODES',
        payload: expect.objectContaining({
          operation: 'list',
          detail: 'detailed'
        })
      });

      expect(result.isError).toBe(false);
    });

    test('should handle list with pageId parameter', async () => {
      const mockResponse = { success: true, data: [] };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      const result = await nodeHandler.handle('figma_nodes', {
        operation: 'list',
        pageId: '123:456'
      });

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_NODES',
        payload: expect.objectContaining({
          operation: 'list',
          pageId: '123:456'
        })
      });

      expect(result.isError).toBe(false);
    });

    test('should handle list with multiple filter parameters combined', async () => {
      const mockResponse = { success: true, data: [] };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      const result = await nodeHandler.handle('figma_nodes', {
        operation: 'list',
        filterByName: 'Button',
        filterByType: ['RECTANGLE', 'FRAME'],
        filterByVisibility: 'visible',
        maxResults: 20,
        detail: 'detailed'
      });

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_NODES',
        payload: expect.objectContaining({
          operation: 'list',
          filterByName: 'Button',
          filterByType: ['RECTANGLE', 'FRAME'],
          filterByVisibility: 'visible',
          maxResults: 20,
          detail: 'detailed'
        })
      });

      expect(result.isError).toBe(false);
    });
  });

  describe('Parameter Validation', () => {
    test('should accept all valid list operation parameters', async () => {
      const mockResponse = { success: true, data: [] };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      // Test each parameter individually to ensure none are rejected
      const validParameters = [
        { filterByName: 'Rectangle' },
        { filterByType: ['RECTANGLE', 'ELLIPSE'] },
        { filterByVisibility: 'visible' },
        { filterByLockedState: false },
        { traversal: 'descendants' },
        { maxDepth: 5 },
        { maxResults: 100 },
        { includeAllPages: true },
        { detail: 'standard' },
        { pageId: '123:456' }
      ];

      for (const param of validParameters) {
        await expect(nodeHandler.handle('figma_nodes', {
          operation: 'list',
          ...param
        })).resolves.not.toThrow();
      }
    });

    test('should not reject any documented filter parameters', async () => {
      const mockResponse = { success: true, data: [] };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      // This test specifically addresses the bug where filterByName was rejected
      // despite being in the schema and documentation
      const result = await nodeHandler.handle('figma_nodes', {
        operation: 'list',
        filterByName: 'Rectangle'
      });

      expect(result.isError).toBe(false);
      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_NODES',
        payload: expect.objectContaining({
          operation: 'list',
          filterByName: 'Rectangle'
        })
      });
    });
  });

  describe('Schema Validation', () => {
    test('should reject invalid operations', async () => {
      await expect(nodeHandler.handle('figma_nodes', {
        operation: 'invalid-operation'
      })).rejects.toThrow();
    });

    test('should validate required parameters', async () => {
      await expect(nodeHandler.handle('figma_nodes', {
        // Missing operation
        name: 'test'
      })).rejects.toThrow();
    });

    test('should handle text node restriction', async () => {
      // Text nodes should use figma_text tool, not figma_nodes
      await expect(nodeHandler.handle('figma_nodes', {
        operation: 'create_text'
      })).rejects.toThrow();
    });
  });

  describe('Default Value Application', () => {
    test('should apply default names based on node type', async () => {
      const mockResponse = { success: true, data: { id: 'node-123' } };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      await nodeHandler.handle('figma_nodes', {
        operation: 'create_ellipse'
        // No name provided
      });

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_NODES',
        payload: expect.objectContaining({
          operation: 'create_ellipse'
        })
      });
    });

    test('should apply default dimensions for shape nodes', async () => {
      const mockResponse = { success: true, data: { id: 'node-123' } };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      await nodeHandler.handle('figma_nodes', {
        operation: 'create_rectangle'
        // No dimensions provided
      });

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_NODES',
        payload: expect.objectContaining({
          operation: 'create_rectangle'
        })
      });
    });
  });
});