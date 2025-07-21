import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StyleHandler } from '../../../src/handlers/style-handler';
import * as yaml from 'js-yaml';

describe('StyleHandler', () => {
  let handler: StyleHandler;
  let mockSendToPlugin: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockSendToPlugin = vi.fn();
    handler = new StyleHandler(mockSendToPlugin);
  });

  describe('getTools', () => {
    it('should return figma_styles tool', () => {
      const tools = handler.getTools();
      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe('figma_styles');
      expect(tools[0].description).toContain('style');
    });

    it('should support all style operations', () => {
      const tools = handler.getTools();
      const schema = tools[0].inputSchema;
      const operations = schema.properties.operation.enum;
      
      expect(operations).toContain('create');
      expect(operations).toContain('update');
      expect(operations).toContain('delete');
      expect(operations).toContain('apply');
      expect(operations).toContain('get');
      expect(operations).toContain('list');
      expect(operations).toContain('duplicate');
    });

    it('should support different style types', () => {
      const tools = handler.getTools();
      const schema = tools[0].inputSchema;
      const types = schema.properties.type.oneOf[0].enum;
      
      expect(types).toContain('paint');
      expect(types).toContain('text');
      expect(types).toContain('effect');
    });

    it('should support bulk operations with styleId', () => {
      const tools = handler.getTools();
      const schema = tools[0].inputSchema;
      
      expect(schema.properties.styleId.oneOf).toBeDefined();
      expect(schema.properties.nodeId.oneOf).toBeDefined();
      expect(schema.properties.name.oneOf).toBeDefined();
    });
  });

  describe('handle', () => {
    it('should handle create paint style operation', async () => {
      mockSendToPlugin.mockResolvedValue({
        success: true,
        data: { 
          id: 'S:abc123',
          name: 'Primary Blue',
          type: 'PAINT'
        }
      });

      const result = await handler.handle('figma_styles', {
        operation: 'create',
        type: 'paint',
        name: 'Primary Blue',
        nodeId: '123:456'
      });

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_STYLES',
        payload: expect.objectContaining({
          operation: 'create',
          type: 'paint',
          name: 'Primary Blue'
        })
      });
      
      // UnifiedHandler returns YAML wrapped results
      expect(result.content).toBeDefined();
      expect(result.content[0].text).toBeDefined();
      const parsedResult = yaml.load(result.content[0].text);
      expect(parsedResult.data?.name || parsedResult.name).toBe('Primary Blue');
    });

    it('should handle apply style operation', async () => {
      mockSendToPlugin.mockResolvedValue({
        success: true,
        data: { applied: ['123:456'] }
      });

      const result = await handler.handle('figma_styles', {
        operation: 'apply',
        nodeId: '123:456',
        styleId: 'S:abc123'
      });

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_STYLES',
        payload: expect.objectContaining({
          operation: 'apply',
          nodeId: '123:456',
          styleId: 'S:abc123'
        })
      });
    });

    it('should handle list styles operation', async () => {
      mockSendToPlugin.mockResolvedValue({
        success: true,
        data: {
          styles: [
            { styleId: 'S:abc123', name: 'Primary Blue', type: 'PAINT' },
            { styleId: 'S:def456', name: 'Heading 1', type: 'TEXT' }
          ]
        }
      });

      const result = await handler.handle('figma_styles', {
        operation: 'list',
        type: 'paint'
      });

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_STYLES',
        payload: expect.objectContaining({
          operation: 'list',
          type: 'paint'
        })
      });
    });

    it('should handle bulk style application', async () => {
      mockSendToPlugin.mockResolvedValue({
        success: true,
        data: {
          results: [
            { nodeId: '123:456', success: true },
            { nodeId: '123:789', success: true }
          ]
        }
      });

      const result = await handler.handle('figma_styles', {
        operation: 'apply',
        nodeId: ['123:456', '123:789'],
        styleId: 'S:abc123'
      });

      // UnifiedHandler returns YAML wrapped results
      expect(result.content).toBeDefined();
      expect(result.content[0].text).toBeDefined();
      const parsedResult = yaml.load(result.content[0].text);
      expect(Array.isArray(parsedResult) || parsedResult.results).toBeTruthy();
    });

    it('should handle delete style operation', async () => {
      mockSendToPlugin.mockResolvedValue({
        success: true,
        data: { deleted: 'S:abc123' }
      });

      const result = await handler.handle('figma_styles', {
        operation: 'delete',
        styleId: 'S:abc123'
      });

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_STYLES',
        payload: expect.objectContaining({
          operation: 'delete',
          styleId: 'S:abc123'
        })
      });
    });

    it('should handle get style operation', async () => {
      mockSendToPlugin.mockResolvedValue({
        success: true,
        data: { 
          styleId: 'S:abc123',
          name: 'Primary Blue',
          type: 'PAINT'
        }
      });

      const result = await handler.handle('figma_styles', {
        operation: 'get',
        styleId: 'S:abc123'
      });

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_STYLES',
        payload: expect.objectContaining({
          operation: 'get',
          styleId: 'S:abc123'
        })
      });
    });

    it('should handle update style operation', async () => {
      mockSendToPlugin.mockResolvedValue({
        success: true,
        data: { 
          styleId: 'S:abc123',
          name: 'Updated Blue',
          type: 'PAINT'
        }
      });

      const result = await handler.handle('figma_styles', {
        operation: 'update',
        styleId: 'S:abc123',
        name: 'Updated Blue',
        color: '#0066CC'
      });

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_STYLES',
        payload: expect.objectContaining({
          operation: 'update',
          styleId: 'S:abc123',
          name: 'Updated Blue',
          color: '#0066CC'
        })
      });
    });

    it('should handle duplicate style operation', async () => {
      mockSendToPlugin.mockResolvedValue({
        success: true,
        data: { 
          styleId: 'S:xyz789',
          name: 'Primary Blue Copy',
          type: 'PAINT'
        }
      });

      const result = await handler.handle('figma_styles', {
        operation: 'duplicate',
        styleId: 'S:abc123',
        name: 'Primary Blue Copy'
      });

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_STYLES',
        payload: expect.objectContaining({
          operation: 'duplicate',
          styleId: 'S:abc123',
          name: 'Primary Blue Copy'
        })
      });
    });

    it('should handle bulk style operations', async () => {
      // Bulk operations: each call returns individual result
      mockSendToPlugin
        .mockResolvedValueOnce({ styleId: 'S:abc123', success: true })
        .mockResolvedValueOnce({ styleId: 'S:def456', success: true });

      const result = await handler.handle('figma_styles', {
        operation: 'delete',
        styleId: ['S:abc123', 'S:def456']
      });

      expect(mockSendToPlugin).toHaveBeenCalledTimes(2);
      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_STYLES',
        payload: expect.objectContaining({
          operation: 'delete',
          styleId: 'S:abc123'
        })
      });
      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_STYLES',
        payload: expect.objectContaining({
          operation: 'delete',
          styleId: 'S:def456'
        })
      });
    });

    it('should handle lowercase operations and types', async () => {
      mockSendToPlugin.mockResolvedValue({ success: true });

      await handler.handle('figma_styles', {
        operation: 'create',
        type: 'paint',
        name: 'Test Style'
      });

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_STYLES',
        payload: expect.objectContaining({
          operation: 'create',
          type: 'paint'
        })
      });
    });

    it('should reject unknown tool names', async () => {
      await expect(
        handler.handle('unknown_tool', { operation: 'create' })
      ).rejects.toThrow('Unknown tool: unknown_tool');
    });
  });
});