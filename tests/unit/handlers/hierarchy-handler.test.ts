import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HierarchyHandler } from '../../../src/handlers/hierarchy-handler';
import * as yaml from 'js-yaml';

describe('HierarchyHandler', () => {
  let handler: HierarchyHandler;
  let mockSendToPlugin: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockSendToPlugin = vi.fn();
    handler = new HierarchyHandler(mockSendToPlugin);
  });

  describe('getTools', () => {
    it('should return figma_hierarchy tool', () => {
      const tools = handler.getTools();
      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe('figma_hierarchy');
      expect(tools[0].description).toContain('Group, ungroup, parent, unparent, order by index/depth, or move nodes between pages');
    });

    it('should support hierarchy operations', () => {
      const tools = handler.getTools();
      const schema = tools[0].inputSchema;
      const operations = schema.properties.operation.enum;
      
      expect(operations).toContain('group');
      expect(operations).toContain('ungroup');
      expect(operations).toContain('parent');
      expect(operations).toContain('unparent');
      expect(operations).toContain('order_by_index');
      expect(operations).toContain('order_by_depth');
      expect(operations).toContain('move_to_page');
    });

    it('should support bulk operations', () => {
      const tools = handler.getTools();
      const schema = tools[0].inputSchema;
      
      expect(schema.properties.nodeId.oneOf).toBeDefined();
      expect(schema.properties.parentId.oneOf).toBeDefined();
      expect(schema.properties.index.oneOf).toBeDefined();
      expect(schema.properties.name.oneOf).toBeDefined();
      expect(schema.properties.position.oneOf).toBeDefined();
      expect(schema.properties.targetId.oneOf).toBeDefined();
    });

    it('should include examples', () => {
      const tools = handler.getTools();
      expect(tools[0].examples).toBeDefined();
      expect(tools[0].examples.length).toBeGreaterThan(0);
    });
  });

  describe('handle', () => {
    it('should handle group operation', async () => {
      mockSendToPlugin.mockResolvedValue({
        success: true,
        data: { 
          operation: 'group',
          nodeId: 'group-123',
          name: 'New Group',
          nodeIds: ['node-1', 'node-2', 'node-3']
        }
      });

      const result = await handler.handle('figma_hierarchy', {
        operation: 'group',
        nodeIds: ['node-1', 'node-2', 'node-3'],
        name: 'New Group'
      });

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_HIERARCHY',
        payload: expect.objectContaining({
          operation: 'group',
          nodeIds: ['node-1', 'node-2', 'node-3'],
          name: 'New Group'
        })
      });
      expect(result.isError).toBe(false);
    });

    it('should handle ungroup operation', async () => {
      mockSendToPlugin.mockResolvedValue({
        success: true,
        data: { 
          operation: 'ungroup',
          nodeId: 'group-123',
          name: 'Ungrouped',
          childIds: ['node-1', 'node-2']
        }
      });

      const result = await handler.handle('figma_hierarchy', {
        operation: 'ungroup',
        nodeId: 'group-123'
      });

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_HIERARCHY',
        payload: expect.objectContaining({
          operation: 'ungroup',
          nodeId: 'group-123'
        })
      });
      expect(result.isError).toBe(false);
    });

    it('should handle parent operation', async () => {
      mockSendToPlugin.mockResolvedValue({
        success: true,
        data: { 
          operation: 'parent',
          nodeId: 'node-123',
          name: 'Parented Node',
          oldParentId: 'parent-1',
          parentId: 'parent-2'
        }
      });

      const result = await handler.handle('figma_hierarchy', {
        operation: 'parent',
        nodeId: 'node-123',
        parentId: 'parent-2'
      });

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_HIERARCHY',
        payload: expect.objectContaining({
          operation: 'parent',
          nodeId: 'node-123',
          parentId: 'parent-2'
        })
      });
      expect(result.isError).toBe(false);
    });

    it('should handle unparent operation', async () => {
      mockSendToPlugin.mockResolvedValue({
        success: true,
        data: { 
          operation: 'unparent',
          nodeId: 'node-123',
          name: 'Unparented Node',
          oldParentId: 'parent-1',
          newParentId: 'page-1'
        }
      });

      const result = await handler.handle('figma_hierarchy', {
        operation: 'unparent',
        nodeId: 'node-123'
      });

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_HIERARCHY',
        payload: expect.objectContaining({
          operation: 'unparent',
          nodeId: 'node-123'
        })
      });
      expect(result.isError).toBe(false);
    });

    it('should handle order_by_index operation', async () => {
      mockSendToPlugin.mockResolvedValue({
        success: true,
        data: { 
          operation: 'order_by_index',
          nodeId: 'node-123',
          name: 'Reordered Node',
          currentIndex: 0,
          newIndex: 2,
          parentId: 'parent-1'
        }
      });

      const result = await handler.handle('figma_hierarchy', {
        operation: 'order_by_index',
        nodeId: 'node-123',
        index: 2
      });

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_HIERARCHY',
        payload: expect.objectContaining({
          operation: 'order_by_index',
          nodeId: 'node-123',
          index: 2
        })
      });
      expect(result.isError).toBe(false);
    });

    it('should handle order_by_depth operation', async () => {
      mockSendToPlugin.mockResolvedValue({
        success: true,
        data: { 
          operation: 'order_by_depth',
          nodeId: 'node-123',
          name: 'Depth Ordered Node',
          currentIndex: 1,
          newIndex: 3,
          position: 'front',
          parentId: 'parent-1'
        }
      });

      const result = await handler.handle('figma_hierarchy', {
        operation: 'order_by_depth',
        nodeId: 'node-123',
        position: 'front'
      });

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_HIERARCHY',
        payload: expect.objectContaining({
          operation: 'order_by_depth',
          nodeId: 'node-123',
          position: 'front'
        })
      });
      expect(result.isError).toBe(false);
    });

    it('should handle move_to_page operation', async () => {
      mockSendToPlugin.mockResolvedValue({
        success: true,
        data: { 
          operation: 'move_to_page',
          nodeId: 'node-123',
          name: 'Moved Node',
          oldPageId: 'page-1',
          oldPageName: 'Page 1',
          targetId: 'page-2',
          targetName: 'Page 2'
        }
      });

      const result = await handler.handle('figma_hierarchy', {
        operation: 'move_to_page',
        nodeId: 'node-123',
        targetId: 'page-2'
      });

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_HIERARCHY',
        payload: expect.objectContaining({
          operation: 'move_to_page',
          nodeId: 'node-123',
          targetId: 'page-2'
        })
      });
      expect(result.isError).toBe(false);
    });

    it('should handle bulk operations', async () => {
      mockSendToPlugin.mockResolvedValue({
        success: true,
        data: { operation: 'order_by_depth', nodeId: 'node-123' }
      });

      const result = await handler.handle('figma_hierarchy', {
        operation: 'order_by_depth',
        nodeId: ['node-123', 'node-456'],
        position: ['front', 'back']
      });

      expect(result.isError).toBe(false);
      expect(mockSendToPlugin).toHaveBeenCalledTimes(2);
    });

    it('should support case-insensitive operations', async () => {
      mockSendToPlugin.mockResolvedValue({
        success: true,
        data: { operation: 'order_by_depth', nodeId: 'node-123' }
      });

      const result = await handler.handle('figma_hierarchy', {
        operation: 'ORDER_BY_DEPTH', // Uppercase
        nodeId: 'node-123',
        position: 'FRONT'
      });

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_HIERARCHY',
        payload: expect.objectContaining({
          operation: 'order_by_depth', // Normalized to lowercase
          position: 'front' // Normalized to lowercase
        })
      });
      expect(result.isError).toBe(false);
    });

    it('should handle depth position variations', async () => {
      mockSendToPlugin.mockResolvedValue({
        success: true,
        data: { operation: 'order_by_depth', nodeId: 'node-123' }
      });

      const positions = ['forward', 'backward', 'front', 'back'];
      
      for (const position of positions) {
        await handler.handle('figma_hierarchy', {
          operation: 'order_by_depth',
          nodeId: 'node-123',
          position
        });
      }

      expect(mockSendToPlugin).toHaveBeenCalledTimes(4);
    });

    it('should handle move_to_page with index', async () => {
      mockSendToPlugin.mockResolvedValue({
        success: true,
        data: { operation: 'move_to_page', nodeId: 'node-123' }
      });

      const result = await handler.handle('figma_hierarchy', {
        operation: 'move_to_page',
        nodeId: 'node-123',
        targetId: 'page-2',
        index: 1
      });

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_HIERARCHY',
        payload: expect.objectContaining({
          operation: 'move_to_page',
          nodeId: 'node-123',
          targetId: 'page-2',
          index: 1
        })
      });
      expect(result.isError).toBe(false);
    });

    it('should handle failFast parameter', async () => {
      mockSendToPlugin.mockResolvedValue({
        success: true,
        data: { operation: 'parent', nodeId: 'node-123' }
      });

      const result = await handler.handle('figma_hierarchy', {
        operation: 'parent',
        nodeId: ['node-123', 'node-456'],
        parentId: 'parent-1',
        failFast: true
      });

      expect(result.isError).toBe(false);
    });

    it('should reject unknown tool names', async () => {
      await expect(
        handler.handle('unknown_tool', { operation: 'group', nodeIds: ['node-1'] })
      ).rejects.toThrow('Unknown tool: unknown_tool');
    });

    it('should validate required parameters', async () => {
      await expect(
        handler.handle('figma_hierarchy', {})
      ).rejects.toThrow();
    });
  });

  describe('Result formatting', () => {
    it('should return YAML formatted results', async () => {
      const mockResponse = {
        success: true,
        data: { 
          operation: 'group',
          nodeId: 'group-123',
          name: 'New Group',
          nodeIds: ['node-1', 'node-2']
        }
      };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      const result = await handler.handle('figma_hierarchy', {
        operation: 'group',
        nodeIds: ['node-1', 'node-2'],
        name: 'New Group'
      });

      expect(result.isError).toBe(false);
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      
      const parsedResult = yaml.load(result.content[0].text);
      expect(parsedResult).toHaveProperty('operation');
      expect(parsedResult).toHaveProperty('id');
      expect(parsedResult).toHaveProperty('name');
    });
  });
});