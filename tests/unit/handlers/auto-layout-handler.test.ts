import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AutoLayoutHandler } from '../../../src/handlers/auto-layout-handler';
import * as yaml from 'js-yaml';

describe('AutoLayoutHandler', () => {
  let handler: AutoLayoutHandler;
  let mockSendToPlugin: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockSendToPlugin = vi.fn();
    handler = new AutoLayoutHandler(mockSendToPlugin);
  });

  describe('getTools', () => {
    it('should return figma_auto_layout tool', () => {
      const tools = handler.getTools();
      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe('figma_auto_layout');
      expect(tools[0].description).toContain('auto layout');
    });

    it('should support auto layout operations', () => {
      const tools = handler.getTools();
      const schema = tools[0].inputSchema;
      const operations = schema.properties.operation.enum;
      
      expect(operations).toContain('get');
      expect(operations).toContain('set_horizontal');
      expect(operations).toContain('set_vertical');
      expect(operations).toContain('set_grid');
      expect(operations).toContain('set_freeform');
      expect(operations).toContain('set_child');
      expect(operations).toContain('reorder_children');
    });

    it('should support bulk operations', () => {
      const tools = handler.getTools();
      const schema = tools[0].inputSchema;
      
      expect(schema.properties.nodeId.oneOf).toBeDefined();
      expect(schema.properties.horizontalSpacing.oneOf).toBeDefined();
      expect(schema.properties.verticalSpacing.oneOf).toBeDefined();
      expect(schema.properties.paddingTop.oneOf).toBeDefined();
    });

    it('should include examples', () => {
      const tools = handler.getTools();
      expect(tools[0].examples).toBeDefined();
      expect(tools[0].examples.length).toBeGreaterThan(0);
    });
  });

  describe('handle', () => {
    it('should handle set_horizontal operation', async () => {
      mockSendToPlugin.mockResolvedValue({
        success: true,
        data: { 
          operation: 'set_horizontal',
          nodeId: 'frame-123',
          name: 'Auto Layout Frame',
          layoutMode: 'horizontal',
          properties: { spacing: 10 }
        }
      });

      const result = await handler.handle('figma_auto_layout', {
        operation: 'set_horizontal',
        nodeId: 'frame-123',
        horizontalSpacing: 10,
        paddingTop: 15,
        paddingLeft: 15
      });

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_AUTO_LAYOUT',
        payload: expect.objectContaining({
          operation: 'set_horizontal',
          nodeId: 'frame-123',
          horizontalSpacing: 10,
          paddingTop: 15,
          paddingLeft: 15
        })
      });
      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
    });

    it('should handle set_freeform operation', async () => {
      mockSendToPlugin.mockResolvedValue({
        success: true,
        data: { 
          operation: 'set_freeform',
          nodeId: 'frame-123',
          name: 'Frame',
          layoutMode: 'none'
        }
      });

      const result = await handler.handle('figma_auto_layout', {
        operation: 'set_freeform',
        nodeId: 'frame-123'
      });

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_AUTO_LAYOUT',
        payload: expect.objectContaining({
          operation: 'set_freeform',
          nodeId: 'frame-123'
        })
      });
      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
    });

    it('should handle set_vertical operation', async () => {
      mockSendToPlugin.mockResolvedValue({
        success: true,
        data: { 
          operation: 'set_vertical',
          nodeId: 'frame-123',
          name: 'Updated Frame',
          layoutMode: 'vertical',
          properties: { spacing: 20 }
        }
      });

      const result = await handler.handle('figma_auto_layout', {
        operation: 'set_vertical',
        nodeId: 'frame-123',
        verticalSpacing: 20,
        horizontalAlignment: 'CENTER'
      });

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_AUTO_LAYOUT',
        payload: expect.objectContaining({
          operation: 'set_vertical',
          nodeId: 'frame-123',
          verticalSpacing: 20,
          horizontalAlignment: 'CENTER'
        })
      });
      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
    });

    it('should handle get operation', async () => {
      mockSendToPlugin.mockResolvedValue({
        success: true,
        data: { 
          operation: 'get',
          nodeId: 'frame-123',
          name: 'Frame',
          layoutMode: 'horizontal',
          properties: {
            spacing: 10,
            paddingTop: 15,
            paddingRight: 15,
            paddingBottom: 15,
            paddingLeft: 15
          },
          children: []
        }
      });

      const result = await handler.handle('figma_auto_layout', {
        operation: 'get',
        nodeId: 'frame-123'
      });

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_AUTO_LAYOUT',
        payload: expect.objectContaining({
          operation: 'get',
          nodeId: 'frame-123'
        })
      });
      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
    });

    it('should handle bulk operations', async () => {
      mockSendToPlugin.mockResolvedValue({
        success: true,
        data: { operation: 'set_horizontal', nodeId: 'frame-123' }
      });

      const result = await handler.handle('figma_auto_layout', {
        operation: 'set_horizontal',
        nodeId: ['frame-123', 'frame-456'],
        horizontalSpacing: [10, 15]
      });

      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
      expect(mockSendToPlugin).toHaveBeenCalledTimes(2);
    });

    it('should support case-insensitive operations', async () => {
      mockSendToPlugin.mockResolvedValue({
        success: true,
        data: { operation: 'set_horizontal', nodeId: 'frame-123' }
      });

      const result = await handler.handle('figma_auto_layout', {
        operation: 'SET_HORIZONTAL', // Uppercase
        nodeId: 'frame-123',
        horizontalAlignment: 'CENTER' // Uppercase
      });

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_AUTO_LAYOUT',
        payload: expect.objectContaining({
          operation: 'set_horizontal', // Normalized to lowercase
          horizontalAlignment: 'CENTER' // Kept as uppercase for API
        })
      });
      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
    });

    it('should handle bulk operations with multiple nodes', async () => {
      mockSendToPlugin.mockResolvedValue({
        success: true,
        data: { operation: 'set_horizontal', nodeId: 'frame-123' }
      });

      const result = await handler.handle('figma_auto_layout', {
        operation: 'set_horizontal',
        nodeId: ['frame-123', 'frame-456'],
        horizontalSpacing: 10
      });

      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
    });

    it('should handle set_child operation with childIndex', async () => {
      mockSendToPlugin.mockResolvedValue({
        success: true,
        data: { 
          operation: 'set_child',
          containerId: 'frame-123',
          containerName: 'Container Frame',
          childIndex: 0,
          childId: 'child-456',
          childName: 'Child Node',
          targetedBy: 'childIndex'
        }
      });

      const result = await handler.handle('figma_auto_layout', {
        operation: 'set_child',
        containerId: 'frame-123',
        childIndex: 0,
        layoutGrow: 1,
        horizontalSizing: 'fill'
      });

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_AUTO_LAYOUT',
        payload: expect.objectContaining({
          operation: 'set_child',
          containerId: 'frame-123',
          childIndex: [0],
          layoutGrow: [1],
          horizontalSizing: ['fill']
        })
      });
      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
    });

    it('should handle set_child operation with nodeId (auto-lookup)', async () => {
      mockSendToPlugin.mockResolvedValue({
        success: true,
        data: { 
          operation: 'set_child',
          containerId: 'frame-123',
          containerName: 'Container Frame',
          childIndex: 1,
          childId: 'child-789',
          childName: 'Target Child',
          targetedBy: 'nodeId'
        }
      });

      const result = await handler.handle('figma_auto_layout', {
        operation: 'set_child',
        containerId: 'frame-123',
        nodeId: 'child-789',
        layoutGrow: 1,
        horizontalSizing: 'fill'
      });

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_AUTO_LAYOUT',
        payload: expect.objectContaining({
          operation: 'set_child',
          containerId: 'frame-123',
          nodeId: 'child-789',
          layoutGrow: [1],
          horizontalSizing: ['fill']
        })
      });
      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
    });

    it('should handle set_child operation across different parents', async () => {
      // Mock response for cross-parent operation (handled in plugin)
      mockSendToPlugin.mockResolvedValue({
        success: true,
        data: [
          { 
            operation: 'set_child',
            containerId: 'parent-123',
            containerName: 'First Parent',
            childIndex: 0,
            childId: 'child-456',
            childName: 'First Child',
            targetedBy: 'nodeId'
          },
          { 
            operation: 'set_child',
            containerId: 'parent-789',
            containerName: 'Second Parent',
            childIndex: 1,
            childId: 'child-101',
            childName: 'Second Child',
            targetedBy: 'nodeId'
          }
        ]
      });

      const result = await handler.handle('figma_auto_layout', {
        operation: 'set_child',
        nodeId: ['child-456', 'child-101'],
        layoutGrow: [1, 0],
        horizontalSizing: ['fill', 'hug']
      });

      // Should be called once with the full cross-parent payload
      expect(mockSendToPlugin).toHaveBeenCalledTimes(1);
      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_AUTO_LAYOUT',
        payload: expect.objectContaining({
          operation: 'set_child',
          nodeId: ['child-456', 'child-101'],
          layoutGrow: [1, 0],
          horizontalSizing: ['fill', 'hug']
        })
      });
      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
    });

    it('should handle reorder_children operation', async () => {
      mockSendToPlugin.mockResolvedValue({
        success: true,
        data: { 
          operation: 'reorder_children',
          containerId: 'frame-123',
          containerName: 'Container Frame',
          fromIndex: 2,
          toIndex: 0,
          childId: 'child-456',
          childName: 'Child Node'
        }
      });

      const result = await handler.handle('figma_auto_layout', {
        operation: 'reorder_children',
        containerId: 'frame-123',
        fromIndex: 2,
        toIndex: 0
      });

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_AUTO_LAYOUT',
        payload: expect.objectContaining({
          operation: 'reorder_children',
          containerId: 'frame-123',
          fromIndex: 2,
          toIndex: 0
        })
      });
      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
    });

    it('should reject unknown tool names', async () => {
      await expect(
        handler.handle('unknown_tool', { operation: 'get', nodeId: 'frame-123' })
      ).rejects.toThrow('Unknown tool: unknown_tool');
    });

    it('should validate required parameters', async () => {
      await expect(
        handler.handle('figma_auto_layout', {})
      ).rejects.toThrow();
    });
  });

  describe('Result formatting', () => {
    it('should return YAML formatted results', async () => {
      const mockResponse = {
        success: true,
        data: { 
          operation: 'set_horizontal',
          nodeId: 'frame-123',
          name: 'Auto Layout Frame',
          layoutMode: 'horizontal'
        }
      };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      const result = await handler.handle('figma_auto_layout', {
        operation: 'set_horizontal',
        nodeId: 'frame-123',
        horizontalSpacing: 10
      });

      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      
      const parsedResult = yaml.load(result.content[0].text);
      expect(parsedResult).toHaveProperty('success');
      expect(parsedResult).toHaveProperty('data');
      expect(parsedResult.data).toHaveProperty('operation');
    });
  });
});