import { describe, test, expect, beforeEach, vi } from 'vitest';
import { DevResourcesHandler } from '../../../src/handlers/dev-resources-handler.js';

describe('DevResourcesHandler', () => {
  let devResourcesHandler: DevResourcesHandler;
  let mockSendToPlugin: any;

  beforeEach(() => {
    mockSendToPlugin = vi.fn();
    devResourcesHandler = new DevResourcesHandler(mockSendToPlugin);
  });

  describe('getTools', () => {
    test('should return dev resources tool', () => {
      const tools = devResourcesHandler.getTools();
      
      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe('figma_dev_resources');
    });

    test('should include required properties in dev resources tool', () => {
      const tools = devResourcesHandler.getTools();
      const devResourcesTool = tools[0];
      
      expect(devResourcesTool.description).toContain('development resources');
      expect(devResourcesTool.inputSchema.properties.operation.enum).toEqual([
        'generate_css', 'set_dev_status', 'add_dev_link', 'remove_dev_link', 'get_dev_resources'
      ]);
      expect(devResourcesTool.inputSchema.required).toEqual(['operation']);
    });
  });

  describe('figma_dev_resources', () => {
    test('should generate CSS successfully', async () => {
      const mockResponse = {
        success: true,
        data: {
          nodeId: 'node-123',
          css: '.rectangle { width: 100px; height: 100px; background: #FF0000; }',
          nodeName: 'Rectangle',
          operation: 'generate_css'
        }
      };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      const result = await devResourcesHandler.handle('figma_dev_resources', {
        operation: 'generate_css',
        nodeId: 'node-123',
        cssOptions: {
          includeChildren: false,
          includeComments: true
        }
      });

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'DEV_RESOURCE_OPERATION',
        payload: {
          operation: 'generate_css',
          nodeId: 'node-123',
          cssOptions: {
            includeChildren: false,
            includeComments: true,
            useFlexbox: true
          }
        }
      });

      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
    });

    test('should set dev status successfully', async () => {
      const mockResponse = {
        success: true,
        data: {
          nodeId: 'node-123',
          status: 'ready_for_dev',
          operation: 'set_dev_status'
        }
      };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      const result = await devResourcesHandler.handle('figma_dev_resources', {
        operation: 'set_dev_status',
        nodeId: 'node-123',
        status: 'ready_for_dev'
      });

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'DEV_RESOURCE_OPERATION',
        payload: {
          operation: 'set_dev_status',
          nodeId: 'node-123',
          status: 'ready_for_dev'
        }
      });

      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
    });

    test('should add dev link successfully', async () => {
      const mockResponse = {
        success: true,
        data: {
          linkId: 'link-123',
          nodeId: 'node-456',
          url: 'https://github.com/project/issues/123',
          title: 'Issue #123',
          operation: 'add_dev_link'
        }
      };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      const result = await devResourcesHandler.handle('figma_dev_resources', {
        operation: 'add_dev_link',
        nodeId: 'node-456',
        linkUrl: 'https://github.com/project/issues/123',
        linkTitle: 'Issue #123'
      });

      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
    });

    test('should remove dev link successfully', async () => {
      const mockResponse = {
        success: true,
        data: {
          linkId: 'link-123',
          nodeId: 'node-456',
          operation: 'remove_dev_link',
          removed: true
        }
      };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      const result = await devResourcesHandler.handle('figma_dev_resources', {
        operation: 'remove_dev_link',
        nodeId: 'node-456',
        linkId: 'link-123'
      });

      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
    });

    test('should get dev resources successfully', async () => {
      const mockResponse = {
        success: true,
        data: {
          nodeId: 'node-123',
          status: { status: 'ready_for_dev' },
          links: [{ id: 'link-1', url: 'https://example.com' }],
          operation: 'get_dev_resources'
        }
      };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      const result = await devResourcesHandler.handle('figma_dev_resources', {
        operation: 'get_dev_resources',
        nodeId: 'node-123'
      });

      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
    });

    test('should validate dev status values', async () => {
      await expect(devResourcesHandler.handle('figma_dev_resources', {
        operation: 'set_dev_status',
        nodeId: 'node-123',
        status: 'invalid_status'
      })).rejects.toThrow('Validation failed');
    });

    test('should handle plugin errors for dev resources', async () => {
      mockSendToPlugin.mockResolvedValue({
        success: false,
        error: 'CSS generation failed: Node type not supported'
      });

      const result = await devResourcesHandler.handle('figma_dev_resources', {
        operation: 'generate_css',
        nodeId: 'text-node'
      });

      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('CSS generation failed: Node type not supported');
    });
  });

  describe('handle', () => {
    test('should throw error for unknown tool', async () => {
      await expect(devResourcesHandler.handle('unknown_tool', {}))
        .rejects.toThrow('Unknown tool: unknown_tool');
    });
  });

  describe('edge cases and validation', () => {
    test('should handle missing required operation parameter', async () => {
      await expect(devResourcesHandler.handle('figma_dev_resources', {
        nodeId: 'node-123'
      })).rejects.toThrow('Required parameter \'operation\' is missing');
    });

    test('should validate CSS options structure', async () => {
      const mockResponse = {
        success: true,
        data: { nodeId: 'node-123', css: '.test {}', operation: 'generate_css' }
      };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      await devResourcesHandler.handle('figma_dev_resources', {
        operation: 'generate_css',
        nodeId: 'node-123',
        cssOptions: {
          includeChildren: true,
          includeComments: false,
          useFlexbox: true
        }
      });

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'DEV_RESOURCE_OPERATION',
        payload: {
          operation: 'generate_css',
          nodeId: 'node-123',
          cssOptions: {
            includeChildren: true,
            includeComments: false,
            useFlexbox: true
          }
        }
      });
    });

    test('should handle optional parameters correctly', async () => {
      const mockResponse = {
        success: true,
        data: { operation: 'get_dev_resources', resources: [] }
      };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      // Test with minimal required parameters
      const result = await devResourcesHandler.handle('figma_dev_resources', {
        operation: 'get_dev_resources'
      });

      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'DEV_RESOURCE_OPERATION',
        payload: {
          operation: 'get_dev_resources'
        }
      });
    });
  });
});