import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { LayoutHandlers } from '../../../src/handlers/layout-handlers.js';

describe('LayoutHandlers', () => {
  let layoutHandlers: LayoutHandlers;
  let mockSendToPlugin: jest.Mock;

  beforeEach(() => {
    mockSendToPlugin = jest.fn();
    layoutHandlers = new LayoutHandlers(mockSendToPlugin);
  });

  describe('getTools', () => {
    test('should return manage_auto_layout tool', () => {
      const tools = layoutHandlers.getTools();
      expect(tools.length).toBeGreaterThan(0);
      
      const autoLayoutTool = tools.find(tool => tool.name === 'manage_auto_layout');
      expect(autoLayoutTool).toBeDefined();
      expect(autoLayoutTool?.inputSchema.required).toContain('operation');
    });
  });

  describe('manageAutoLayout', () => {
    test('should enable auto layout on frame', async () => {
      const mockResponse = {
        success: true,
        data: {
          operation: 'enable',
          nodeId: 'frame-123',
          layoutMode: 'VERTICAL',
          primaryAxisSizingMode: 'AUTO',
          counterAxisSizingMode: 'AUTO'
        }
      };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      const result = await layoutHandlers.handle('manage_auto_layout', {
        operation: 'enable',
        nodeId: 'frame-123',
        direction: 'vertical',
        spacing: 10
      });

      expect(result.isError).toBe(false);
      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_AUTO_LAYOUT',
        payload: expect.objectContaining({
          operation: 'enable',
          nodeId: 'frame-123',
          direction: 'vertical',
          spacing: 10
        })
      });
    });

    test('should disable auto layout', async () => {
      const mockResponse = {
        success: true,
        data: {
          operation: 'disable',
          nodeId: 'frame-123',
          layoutMode: 'NONE'
        }
      };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      const result = await layoutHandlers.handle('manage_auto_layout', {
        operation: 'disable',
        nodeId: 'frame-123'
      });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('disable');
    });

    test('should update auto layout settings', async () => {
      const mockResponse = {
        success: true,
        data: {
          operation: 'update',
          nodeId: 'frame-123',
          direction: 'horizontal',
          spacing: 20,
          padding: { top: 10, right: 15, bottom: 10, left: 15 }
        }
      };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      const result = await layoutHandlers.handle('manage_auto_layout', {
        operation: 'update',
        nodeId: 'frame-123',
        direction: 'horizontal',
        spacing: 20,
        paddingHorizontal: 15,
        paddingVertical: 10
      });

      expect(result.isError).toBe(false);
      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_AUTO_LAYOUT',
        payload: expect.objectContaining({
          operation: 'update',
          nodeId: 'frame-123',
          direction: 'horizontal',
          spacing: 20
        })
      });
    });

    test('should get auto layout info', async () => {
      const mockResponse = {
        success: true,
        data: {
          operation: 'get',
          nodeId: 'frame-123',
          hasAutoLayout: true,
          layoutMode: 'VERTICAL',
          itemSpacing: 10,
          padding: { top: 5, right: 5, bottom: 5, left: 5 }
        }
      };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      const result = await layoutHandlers.handle('manage_auto_layout', {
        operation: 'get_properties',
        nodeId: 'frame-123'
      });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('hasAutoLayout');
    });
  });

  describe('Validation', () => {
    test('should validate required operation parameter', async () => {
      await expect(layoutHandlers.handle('manage_auto_layout', {}))
        .rejects.toThrow();
    });

    test('should validate required nodeId for most operations', async () => {
      await expect(layoutHandlers.handle('manage_auto_layout', {
        operation: 'enable'
      })).rejects.toThrow();
    });

    test('should validate direction enum values', async () => {
      await expect(layoutHandlers.handle('manage_auto_layout', {
        operation: 'enable',
        nodeId: 'frame-123',
        direction: 'invalid_direction'
      })).rejects.toThrow();
    });
  });

  describe('Error Handling', () => {
    test('should handle plugin connection errors', async () => {
      mockSendToPlugin.mockRejectedValue(new Error('Plugin not connected'));

      await expect(layoutHandlers.handle('manage_auto_layout', {
        operation: 'enable',
        nodeId: 'frame-123'
      })).rejects.toThrow('Plugin not connected');
    });

    test('should handle invalid node errors', async () => {
      mockSendToPlugin.mockResolvedValue({
        success: false,
        error: 'Node is not a frame'
      });

      await expect(layoutHandlers.handle('manage_auto_layout', {
        operation: 'enable',
        nodeId: 'text-node-123'
      })).rejects.toThrow('Node is not a frame');
    });

    test('should handle unknown tool names', async () => {
      await expect(layoutHandlers.handle('unknown_tool', {}))
        .rejects.toThrow('Unknown tool: unknown_tool');
    });
  });
});