import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SelectionHandler } from '../../../src/handlers/selection-handler';
import * as yaml from 'js-yaml';

describe('SelectionHandler', () => {
  let handler: SelectionHandler;
  let mockSendToPlugin: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockSendToPlugin = vi.fn();
    handler = new SelectionHandler(mockSendToPlugin);
  });

  describe('getTools', () => {
    it('should return figma_selection tool', () => {
      const tools = handler.getTools();
      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe('figma_selection');
      expect(tools[0].description).toContain('selection management');
    });

    it('should support selection operations', () => {
      const tools = handler.getTools();
      const schema = tools[0].inputSchema;
      const operations = schema.properties.operation.enum;
      
      expect(operations).toContain('get_selection');
      expect(operations).toContain('set_selection');
      expect(operations).toContain('list_nodes');
    });

    it('should support bulk node selection', () => {
      const tools = handler.getTools();
      const schema = tools[0].inputSchema;
      
      expect(schema.properties.nodeId.oneOf).toBeDefined();
      expect(schema.properties.nodeId.oneOf[1].items.type).toBe('string');
    });

    it('should support traversal options', () => {
      const tools = handler.getTools();
      const schema = tools[0].inputSchema;
      const traversalOptions = schema.properties.traversal.enum;
      
      expect(traversalOptions).toContain('children');
      expect(traversalOptions).toContain('ancestors');
      expect(traversalOptions).toContain('siblings');
      expect(traversalOptions).toContain('descendants');
    });

    it('should support filtering options', () => {
      const tools = handler.getTools();
      const schema = tools[0].inputSchema;
      
      expect(schema.properties.filterByType).toBeDefined();
      expect(schema.properties.filterByName).toBeDefined();
      expect(schema.properties.filterByVisibility).toBeDefined();
    });
  });

  describe('handle', () => {
    it('should handle get selection operation', async () => {
      mockSendToPlugin.mockResolvedValue({
        success: true,
        data: {
          selection: [
            { id: '123:456', name: 'Rectangle', type: 'RECTANGLE' },
            { id: '123:789', name: 'Text', type: 'TEXT' }
          ],
          count: 2
        }
      });

      const result = await handler.handle('figma_selection', {
        operation: 'get_selection'
      });

      expect(result.isError).toBe(false);
      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_SELECTION',
        payload: {
          operation: 'get_selection'
        }
      });
    });

    it('should handle set selection operation', async () => {
      mockSendToPlugin.mockResolvedValue({
        success: true,
        data: { 
          selected: ['123:456', '123:789'],
          count: 2
        }
      });

      const result = await handler.handle('figma_selection', {
        operation: 'set_selection',
        nodeId: ['123:456', '123:789']
      });

      expect(result.isError).toBe(false);
      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_SELECTION',
        payload: {
          operation: 'set_selection',
          nodeId: ['123:456', '123:789']
        }
      });
    });

    it('should handle list nodes operation', async () => {
      mockSendToPlugin.mockResolvedValue({
        success: true,
        data: {
          nodes: [
            { id: '123:456', name: 'Rectangle', type: 'RECTANGLE' },
            { id: '123:789', name: 'Text', type: 'TEXT' }
          ]
        }
      });

      const result = await handler.handle('figma_selection', {
        operation: 'list_nodes',
        nodeId: '123:000',
        traversal: 'children'
      });

      expect(result.isError).toBe(false);
      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_SELECTION',
        payload: {
          operation: 'list_nodes',
          nodeId: ['123:000'],
          traversal: 'children'
        }
      });
    });

    it('should handle list nodes with filters', async () => {
      mockSendToPlugin.mockResolvedValue({
        success: true,
        data: {
          nodes: [
            { id: '123:456', name: 'Primary Button', type: 'RECTANGLE' }
          ]
        }
      });

      const result = await handler.handle('figma_selection', {
        operation: 'list_nodes',
        filterByName: 'Primary',
        filterByType: 'RECTANGLE',
        detail: 'full'
      });

      expect(result.isError).toBe(false);
      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_SELECTION',
        payload: {
          operation: 'list_nodes',
          filterByName: 'Primary',
          filterByType: ['RECTANGLE'],
          detail: 'full'
        }
      });
    });

    it('should handle parent traversal', async () => {
      mockSendToPlugin.mockResolvedValue({
        success: true,
        data: {
          nodes: [
            { id: '123:000', name: 'Frame', type: 'FRAME' }
          ]
        }
      });

      const result = await handler.handle('figma_selection', {
        operation: 'list_nodes',
        nodeId: '123:456',
        traversal: 'ancestors',
        maxDepth: 1
      });

      expect(result.isError).toBe(false);
      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_SELECTION',
        payload: {
          operation: 'list_nodes',
          nodeId: ['123:456'],
          traversal: 'ancestors',
          maxDepth: 1
        }
      });
    });

    it('should handle children traversal', async () => {
      mockSendToPlugin.mockResolvedValue({
        success: true,
        data: {
          nodes: [
            { id: '123:456', name: 'Child 1', type: 'RECTANGLE' },
            { id: '123:789', name: 'Child 2', type: 'TEXT' }
          ]
        }
      });

      const result = await handler.handle('figma_selection', {
        operation: 'list_nodes',
        nodeId: '123:000',
        traversal: 'children',
        maxResults: 10
      });

      expect(result.isError).toBe(false);
      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_SELECTION',
        payload: {
          operation: 'list_nodes',
          nodeId: ['123:000'],
          traversal: 'children',
          maxResults: 10
        }
      });
    });

    it('should handle single node ID as string', async () => {
      mockSendToPlugin.mockResolvedValue({
        success: true,
        data: { selected: ['123:456'] }
      });

      const result = await handler.handle('figma_selection', {
        operation: 'set_selection',
        nodeId: '123:456'
      });

      expect(result.isError).toBe(false);
      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_SELECTION',
        payload: {
          operation: 'set_selection',
          nodeId: ['123:456']
        }
      });
    });

    it('should handle multiple values in arrays', async () => {
      mockSendToPlugin.mockResolvedValue({
        success: true,
        data: {
          nodes: [
            { id: '123:456', name: 'Node 1', type: 'RECTANGLE' },
            { id: '123:789', name: 'Node 2', type: 'TEXT' }
          ]
        }
      });

      const result = await handler.handle('figma_selection', {
        operation: 'list_nodes',
        nodeId: ['123:000', '123:111'],
        traversal: 'children',
        filterByType: ['RECTANGLE', 'TEXT']
      });

      expect(result.isError).toBe(false);
      expect(mockSendToPlugin).toHaveBeenCalledTimes(1);
      
      // Should call with array parameters
      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_SELECTION',
        payload: {
          operation: 'list_nodes',
          nodeId: ['123:000', '123:111'],
          traversal: 'children',
          filterByType: ['RECTANGLE', 'TEXT']
        }
      });
    });

    it('should reject unknown tool names', async () => {
      await expect(
        handler.handle('unknown_tool', { operation: 'get_selection' })
      ).rejects.toThrow('Unknown tool: unknown_tool');
    });

    it('should validate required parameters', async () => {
      await expect(
        handler.handle('figma_selection', {})
      ).rejects.toThrow();
    });

    it('should validate operation enum values', async () => {
      await expect(
        handler.handle('figma_selection', { operation: 'invalid_operation' })
      ).rejects.toThrow();
    });
  });

  describe('Result formatting', () => {
    it('should return YAML formatted results', async () => {
      const mockResponse = {
        success: true,
        data: {
          selection: [
            { id: '123:456', name: 'Rectangle', type: 'RECTANGLE' }
          ]
        }
      };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      const result = await handler.handle('figma_selection', {
        operation: 'get_selection'
      });

      expect(result.isError).toBe(false);
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      
      // Should be valid YAML
      const parsedResult = yaml.load(result.content[0].text);
      expect(parsedResult).toHaveProperty('selection');
    });
  });
});