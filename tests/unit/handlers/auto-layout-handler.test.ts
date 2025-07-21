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
      
      expect(operations).toContain('enable');
      expect(operations).toContain('disable');
      expect(operations).toContain('update');
      expect(operations).toContain('get_properties');
    });

    it('should support bulk operations', () => {
      const tools = handler.getTools();
      const schema = tools[0].inputSchema;
      
      expect(schema.properties.nodeId.oneOf).toBeDefined();
      expect(schema.properties.direction.oneOf).toBeDefined();
      expect(schema.properties.spacing.oneOf).toBeDefined();
      expect(schema.properties.paddingTop.oneOf).toBeDefined();
    });

    it('should include examples', () => {
      const tools = handler.getTools();
      expect(tools[0].examples).toBeDefined();
      expect(tools[0].examples.length).toBeGreaterThan(0);
    });
  });

  describe('handle', () => {
    it('should handle enable operation', async () => {
      mockSendToPlugin.mockResolvedValue({
        success: true,
        data: { 
          operation: 'enable',
          nodeId: 'frame-123',
          name: 'Auto Layout Frame',
          direction: 'horizontal',
          spacing: 10
        }
      });

      const result = await handler.handle('figma_auto_layout', {
        operation: 'enable',
        nodeId: 'frame-123',
        direction: 'horizontal',
        spacing: 10,
        paddingTop: 15,
        paddingLeft: 15
      });

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_AUTO_LAYOUT',
        payload: expect.objectContaining({
          operation: 'enable',
          nodeId: 'frame-123',
          direction: 'horizontal',
          spacing: 10,
          paddingTop: 15,
          paddingLeft: 15
        })
      });
      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
    });

    it('should handle disable operation', async () => {
      mockSendToPlugin.mockResolvedValue({
        success: true,
        data: { 
          operation: 'disable',
          nodeId: 'frame-123',
          name: 'Frame'
        }
      });

      const result = await handler.handle('figma_auto_layout', {
        operation: 'disable',
        nodeId: 'frame-123'
      });

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_AUTO_LAYOUT',
        payload: expect.objectContaining({
          operation: 'disable',
          nodeId: 'frame-123'
        })
      });
      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
    });

    it('should handle update operation', async () => {
      mockSendToPlugin.mockResolvedValue({
        success: true,
        data: { 
          operation: 'update',
          nodeId: 'frame-123',
          name: 'Updated Frame',
          direction: 'vertical',
          spacing: 20
        }
      });

      const result = await handler.handle('figma_auto_layout', {
        operation: 'update',
        nodeId: 'frame-123',
        direction: 'vertical',
        spacing: 20,
        primaryAlignment: 'center'
      });

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_AUTO_LAYOUT',
        payload: expect.objectContaining({
          operation: 'update',
          nodeId: 'frame-123',
          direction: 'vertical',
          spacing: 20,
          primaryAlignment: 'center'
        })
      });
      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
    });

    it('should handle get_properties operation', async () => {
      mockSendToPlugin.mockResolvedValue({
        success: true,
        data: { 
          operation: 'get_properties',
          nodeId: 'frame-123',
          name: 'Frame',
          autoLayout: {
            direction: 'horizontal',
            spacing: 10,
            paddingTop: 15,
            paddingRight: 15,
            paddingBottom: 15,
            paddingLeft: 15
          }
        }
      });

      const result = await handler.handle('figma_auto_layout', {
        operation: 'get_properties',
        nodeId: 'frame-123'
      });

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_AUTO_LAYOUT',
        payload: expect.objectContaining({
          operation: 'get_properties',
          nodeId: 'frame-123'
        })
      });
      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
    });

    it('should handle bulk operations', async () => {
      mockSendToPlugin.mockResolvedValue({
        success: true,
        data: { operation: 'enable', nodeId: 'frame-123' }
      });

      const result = await handler.handle('figma_auto_layout', {
        operation: 'enable',
        nodeId: ['frame-123', 'frame-456'],
        direction: ['horizontal', 'vertical'],
        spacing: [10, 15]
      });

      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
      expect(mockSendToPlugin).toHaveBeenCalledTimes(2);
    });

    it('should support case-insensitive operations', async () => {
      mockSendToPlugin.mockResolvedValue({
        success: true,
        data: { operation: 'enable', nodeId: 'frame-123' }
      });

      const result = await handler.handle('figma_auto_layout', {
        operation: 'ENABLE', // Uppercase
        nodeId: 'frame-123',
        direction: 'HORIZONTAL' // Uppercase
      });

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_AUTO_LAYOUT',
        payload: expect.objectContaining({
          operation: 'enable', // Normalized to lowercase
          direction: 'horizontal' // Normalized to lowercase
        })
      });
      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
    });

    it('should handle failFast parameter', async () => {
      mockSendToPlugin.mockResolvedValue({
        success: true,
        data: { operation: 'enable', nodeId: 'frame-123' }
      });

      const result = await handler.handle('figma_auto_layout', {
        operation: 'enable',
        nodeId: ['frame-123', 'frame-456'],
        direction: 'horizontal',
        failFast: true
      });

      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
    });

    it('should reject unknown tool names', async () => {
      await expect(
        handler.handle('unknown_tool', { operation: 'enable', nodeId: 'frame-123' })
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
          operation: 'enable',
          nodeId: 'frame-123',
          name: 'Auto Layout Frame',
          direction: 'horizontal'
        }
      };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      const result = await handler.handle('figma_auto_layout', {
        operation: 'enable',
        nodeId: 'frame-123',
        direction: 'horizontal'
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