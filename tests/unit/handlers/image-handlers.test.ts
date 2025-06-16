import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { ImageHandlers } from '../../../src/handlers/image-handlers.js';

describe('ImageHandlers', () => {
  let imageHandlers: ImageHandlers;
  let mockSendToPlugin: jest.Mock;

  beforeEach(() => {
    mockSendToPlugin = jest.fn();
    imageHandlers = new ImageHandlers(mockSendToPlugin);
  });

  describe('getTools', () => {
    test('should return manage_images tool', () => {
      const tools = imageHandlers.getTools();
      const toolNames = tools.map(tool => tool.name);
      
      expect(toolNames).toContain('manage_images');
      expect(tools).toHaveLength(1);
    });

    test('should have correct tool schema', () => {
      const tools = imageHandlers.getTools();
      const manageImagesTool = tools.find(tool => tool.name === 'manage_images');
      
      expect(manageImagesTool).toBeDefined();
      expect(manageImagesTool?.inputSchema.properties.operation).toBeDefined();
      expect(manageImagesTool?.inputSchema.required).toContain('operation');
      
      // Check that all operations are included in the enum
      const operationEnum = manageImagesTool?.inputSchema.properties.operation.enum;
      expect(operationEnum).toContain('create_from_url');
      expect(operationEnum).toContain('create_from_bytes');
      expect(operationEnum).toContain('smart_replace');
      expect(operationEnum).toContain('update_filters');
      expect(operationEnum).toContain('clone_image');
    });
  });

  describe('manage_images operations', () => {
    test('should validate required operation parameter', async () => {
      const result = await imageHandlers.handle('manage_images', {});
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Required');
    });

    test('should handle create_from_url operation', async () => {
      const mockResponse = {
        success: true,
        data: {
          nodeId: 'node-123',
          nodeName: 'Image Node',
          imageHash: 'abc123hash',
          imageDimensions: { width: 400, height: 300 },
          appliedAt: '2024-01-01T00:00:00.000Z'
        }
      };
      
      mockSendToPlugin.mockResolvedValue(mockResponse);

      const result = await imageHandlers.handle('manage_images', {
        operation: 'create_from_url',
        imageUrl: 'https://example.com/image.jpg',
        createNode: true,
        scaleMode: 'FILL'
      });

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_IMAGES',
        payload: expect.objectContaining({
          operation: 'create_from_url',
          imageUrl: 'https://example.com/image.jpg',
          createNode: true,
          scaleMode: 'FILL'
        })
      });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('nodeId: node-123');
    });

    test('should handle smart_replace operation with fit strategy', async () => {
      const mockResponse = {
        success: true,
        data: {
          nodeId: 'node-456',
          nodeName: 'Replaced Node',
          imageHash: 'def456hash',
          replacedAt: '2024-01-01T00:00:00.000Z'
        }
      };
      
      mockSendToPlugin.mockResolvedValue(mockResponse);

      const result = await imageHandlers.handle('manage_images', {
        operation: 'smart_replace',
        nodeId: 'node-456',
        replaceImageUrl: 'https://example.com/new-image.jpg',
        fitStrategy: 'smart_crop',
        alignmentX: 'center',
        alignmentY: 'top'
      });

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_IMAGES',
        payload: expect.objectContaining({
          operation: 'smart_replace',
          nodeId: 'node-456',
          replaceImageUrl: 'https://example.com/new-image.jpg',
          fitStrategy: 'smart_crop',
          alignmentX: 'center',
          alignmentY: 'top'
        })
      });

      expect(result.isError).toBe(false);
    });

    test('should handle update_filters operation', async () => {
      const mockResponse = {
        success: true,
        data: {
          nodeId: 'node-789',
          nodeName: 'Filtered Node',
          filtersApplied: {
            exposure: 0.2,
            contrast: 0.1,
            saturation: -0.3
          },
          updatedAt: '2024-01-01T00:00:00.000Z'
        }
      };
      
      mockSendToPlugin.mockResolvedValue(mockResponse);

      const result = await imageHandlers.handle('manage_images', {
        operation: 'update_filters',
        nodeId: 'node-789',
        filterExposure: 0.2,
        filterContrast: 0.1,
        filterSaturation: -0.3
      });

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_IMAGES',
        payload: expect.objectContaining({
          operation: 'update_filters',
          nodeId: 'node-789',
          filterExposure: 0.2,
          filterContrast: 0.1,
          filterSaturation: -0.3
        })
      });

      expect(result.isError).toBe(false);
    });

    test('should handle clone_image operation', async () => {
      const mockResponse = {
        success: true,
        data: {
          sourceNodeId: 'source-123',
          targetNodeId: 'target-456',
          targetNodeName: 'Cloned Image',
          imageHash: 'clone789hash',
          clonedAt: '2024-01-01T00:00:00.000Z'
        }
      };
      
      mockSendToPlugin.mockResolvedValue(mockResponse);

      const result = await imageHandlers.handle('manage_images', {
        operation: 'clone_image',
        sourceNodeId: 'source-123',
        targetNodeId: 'target-456',
        preserveFilters: true
      });

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_IMAGES',
        payload: expect.objectContaining({
          operation: 'clone_image',
          sourceNodeId: 'source-123',
          targetNodeId: 'target-456',
          preserveFilters: true
        })
      });

      expect(result.isError).toBe(false);
    });

    test('should handle plugin error responses', async () => {
      const mockErrorResponse = {
        success: false,
        error: 'Invalid image URL'
      };
      
      mockSendToPlugin.mockResolvedValue(mockErrorResponse);

      const result = await imageHandlers.handle('manage_images', {
        operation: 'create_from_url',
        imageUrl: 'invalid-url'
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Invalid url');
    });

    test('should validate operation parameters based on operation type', async () => {
      // Test create_from_url requires imageUrl
      const result1 = await imageHandlers.handle('manage_images', {
        operation: 'create_from_url'
      });
      expect(result1.isError).toBe(true);
      expect(result1.content[0].text).toContain('Invalid parameters for the specified operation');

      // Test replace_image requires nodeId and replacement source
      const result2 = await imageHandlers.handle('manage_images', {
        operation: 'replace_image',
        nodeId: 'test-node'
      });
      expect(result2.isError).toBe(true);

      // Test clone_image requires sourceNodeId
      const result3 = await imageHandlers.handle('manage_images', {
        operation: 'clone_image'
      });
      expect(result3.isError).toBe(true);
    });
  });

  describe('invalid tool names', () => {
    test('should reject unknown tool names', async () => {
      await expect(imageHandlers.handle('unknown_tool', {}))
        .rejects.toThrow('Unknown tool: unknown_tool');
    });
  });
});