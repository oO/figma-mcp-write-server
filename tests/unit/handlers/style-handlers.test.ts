import { describe, test, expect, beforeEach, vi } from 'vitest';
import { StyleHandler } from '@/handlers/style-handler';

describe('StyleHandler', () => {
  let styleHandler: StyleHandler;
  let mockSendToPlugin: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockSendToPlugin = vi.fn();
    styleHandler = new StyleHandler(mockSendToPlugin);
  });

  describe('getTools', () => {
    test('should return manage_styles tool', () => {
      const tools = styleHandler.getTools();
      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe('manage_styles');
      expect(tools[0].inputSchema.required).toContain('operation');
    });

    test('should support all style types', () => {
      const tools = styleHandler.getTools();
      const manageStylesTool = tools[0];
      const styleTypeEnum = manageStylesTool.inputSchema.properties.styleType.enum;
      
      expect(styleTypeEnum).toContain('paint');
      expect(styleTypeEnum).toContain('text');
      expect(styleTypeEnum).toContain('effect');
      expect(styleTypeEnum).toContain('grid');
    });
  });

  describe('manageStyles', () => {
    test('should create a paint style', async () => {
      const mockResponse = {
        success: true,
        data: {
          styleId: 'style-123',
          styleType: 'paint',
          styleName: 'Primary Color',
          operation: 'create'
        }
      };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      const result = await styleHandler.handle('manage_styles', {
        operation: 'create',
        styleType: 'paint',
        styleName: 'Primary Color'
      });

      expect(result.isError).toBe(false);
      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_STYLES',
        payload: {
          operation: 'create',
          styleType: 'paint',
          styleName: 'Primary Color'
        }
      });
    });

    test('should list styles by type', async () => {
      const mockResponse = {
        success: true,
        data: {
          operation: 'list',
          styleType: 'text',
          styles: [
            { id: 'text-1', name: 'Heading 1' },
            { id: 'text-2', name: 'Body Text' }
          ]
        }
      };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      const result = await styleHandler.handle('manage_styles', {
        operation: 'list',
        styleType: 'text'
      });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('Heading 1');
      expect(result.content[0].text).toContain('Body Text');
    });

    test('should apply style to node', async () => {
      const mockResponse = {
        success: true,
        data: {
          operation: 'apply',
          styleId: 'style-123',
          nodeId: 'node-456',
          applied: true
        }
      };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      const result = await styleHandler.handle('manage_styles', {
        operation: 'apply',
        styleId: 'style-123',
        nodeId: 'node-456'
      });

      expect(result.isError).toBe(false);
      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_STYLES',
        payload: {
          operation: 'apply',
          styleId: 'style-123',
          nodeId: 'node-456'
        }
      });
    });

    test('should delete a style', async () => {
      const mockResponse = {
        success: true,
        data: {
          operation: 'delete',
          styleId: 'style-123',
          styleName: 'Old Style',
          deleted: true
        }
      };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      const result = await styleHandler.handle('manage_styles', {
        operation: 'delete',
        styleId: 'style-123'
      });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('delete');
    });

    test('should get style details', async () => {
      const mockResponse = {
        success: true,
        data: {
          operation: 'get',
          styleId: 'style-123',
          styleType: 'paint',
          styleName: 'Primary Color',
          properties: {
            color: '#0066CC',
            opacity: 1
          }
        }
      };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      const result = await styleHandler.handle('manage_styles', {
        operation: 'get',
        styleId: 'style-123'
      });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('Primary Color');
    });
  });

  describe('Validation', () => {
    test('should validate required operation parameter', async () => {
      await expect(styleHandler.handle('manage_styles', {}))
        .rejects.toThrow();
    });

    test('should validate operation enum values', async () => {
      await expect(styleHandler.handle('manage_styles', {
        operation: 'invalid_operation'
      })).rejects.toThrow();
    });

    test('should validate styleType enum values', async () => {
      await expect(styleHandler.handle('manage_styles', {
        operation: 'create',
        styleType: 'invalid_type'
      })).rejects.toThrow();
    });
  });

  describe('Error Handling', () => {
    test('should handle plugin connection errors', async () => {
      mockSendToPlugin.mockRejectedValue(new Error('Plugin not connected'));

      await expect(styleHandler.handle('manage_styles', {
        operation: 'list',
        styleType: 'paint'
      })).rejects.toThrow('Plugin not connected');
    });

    test('should handle plugin operation failures', async () => {
      mockSendToPlugin.mockRejectedValue(new Error('Style not found'));

      await expect(styleHandler.handle('manage_styles', {
        operation: 'get',
        styleId: 'invalid-id'
      })).rejects.toThrow('Style not found');
    });

    test('should handle unknown tool names', async () => {
      await expect(styleHandler.handle('unknown_tool', {}))
        .rejects.toThrow('Unknown tool: unknown_tool');
    });
  });
});