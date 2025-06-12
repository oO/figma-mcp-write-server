import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { DevModeHandlers } from '../../../src/handlers/dev-mode-handlers.js';

describe('DevModeHandlers', () => {
  let devModeHandlers: DevModeHandlers;
  let mockSendToPlugin: jest.Mock;

  beforeEach(() => {
    mockSendToPlugin = jest.fn();
    devModeHandlers = new DevModeHandlers(mockSendToPlugin);
  });

  describe('getTools', () => {
    test('should return dev mode tools', () => {
      const tools = devModeHandlers.getTools();
      
      expect(tools).toHaveLength(3);
      expect(tools[0].name).toBe('manage_annotations');
      expect(tools[1].name).toBe('manage_measurements');
      expect(tools[2].name).toBe('manage_dev_resources');
    });

    test('should include required properties in annotations tool', () => {
      const tools = devModeHandlers.getTools();
      const annotationsTool = tools[0];
      
      expect(annotationsTool.description).toContain('annotations');
      expect(annotationsTool.inputSchema.properties.operation.enum).toEqual([
        'add_annotation', 'edit_annotation', 'remove_annotation', 'list_annotations'
      ]);
      expect(annotationsTool.inputSchema.required).toEqual(['operation']);
    });

    test('should include required properties in measurements tool', () => {
      const tools = devModeHandlers.getTools();
      const measurementsTool = tools[1];
      
      expect(measurementsTool.description).toContain('measurements');
      expect(measurementsTool.inputSchema.properties.operation.enum).toEqual([
        'add_measurement', 'edit_measurement', 'remove_measurement', 'list_measurements'
      ]);
      expect(measurementsTool.inputSchema.required).toEqual(['operation']);
    });

    test('should include required properties in dev resources tool', () => {
      const tools = devModeHandlers.getTools();
      const devResourcesTool = tools[2];
      
      expect(devResourcesTool.description).toContain('development resources');
      expect(devResourcesTool.inputSchema.properties.operation.enum).toEqual([
        'generate_css', 'set_dev_status', 'add_dev_link', 'remove_dev_link', 'get_dev_resources'
      ]);
      expect(devResourcesTool.inputSchema.required).toEqual(['operation']);
    });
  });

  describe('manage_annotations', () => {
    test('should add annotation successfully', async () => {
      const mockResponse = {
        success: true,
        data: {
          annotationId: 'annotation-123',
          nodeId: 'node-456',
          label: 'Design Note',
          operation: 'add_annotation'
        }
      };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      const result = await devModeHandlers.handle('manage_annotations', {
        operation: 'add_annotation',
        nodeId: 'node-456',
        label: 'Design Note'
      });

      expect(result.isError).toBe(false);
      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'ANNOTATION_OPERATION',
        payload: {
          operation: 'add_annotation',
          nodeId: 'node-456',
          label: 'Design Note'
        }
      });

      const yamlContent = result.content[0].text;
      expect(yamlContent).toContain('operation: annotation_operation');
      expect(yamlContent).toContain('annotationType: add_annotation');
    });

    test('should edit annotation successfully', async () => {
      const mockResponse = {
        success: true,
        data: {
          annotationId: 'annotation-123',
          label: 'Updated Note',
          operation: 'edit_annotation'
        }
      };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      const result = await devModeHandlers.handle('manage_annotations', {
        operation: 'edit_annotation',
        annotationId: 'annotation-123',
        label: 'Updated Note'
      });

      expect(result.isError).toBe(false);
      const yamlContent = result.content[0].text;
      expect(yamlContent).toContain('annotationType: edit_annotation');
    });

    test('should remove annotation successfully', async () => {
      const mockResponse = {
        success: true,
        data: {
          annotationId: 'annotation-123',
          operation: 'remove_annotation',
          removed: true
        }
      };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      const result = await devModeHandlers.handle('manage_annotations', {
        operation: 'remove_annotation',
        annotationId: 'annotation-123'
      });

      expect(result.isError).toBe(false);
      const yamlContent = result.content[0].text;
      expect(yamlContent).toContain('annotationType: remove_annotation');
    });

    test('should list annotations successfully', async () => {
      const mockResponse = {
        success: true,
        data: {
          annotations: [
            { id: 'annotation-1', label: 'Note 1' },
            { id: 'annotation-2', label: 'Note 2' }
          ],
          count: 2,
          operation: 'list_annotations'
        }
      };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      const result = await devModeHandlers.handle('manage_annotations', {
        operation: 'list_annotations',
        nodeId: 'node-456'
      });

      expect(result.isError).toBe(false);
      const yamlContent = result.content[0].text;
      expect(yamlContent).toContain('annotationType: list_annotations');
    });

    test('should validate operation type', async () => {
      await expect(devModeHandlers.handle('manage_annotations', {
        operation: 'invalid_annotation_operation'
      })).rejects.toThrow('Validation failed');
    });

    test('should handle plugin errors', async () => {
      mockSendToPlugin.mockResolvedValue({
        success: false,
        error: 'Annotation operation failed: Node not found'
      });

      await expect(devModeHandlers.handle('manage_annotations', {
        operation: 'add_annotation',
        nodeId: 'invalid-node'
      })).rejects.toThrow('Annotation operation failed: Node not found');
    });
  });

  describe('manage_measurements', () => {
    test('should add measurement successfully', async () => {
      const mockResponse = {
        success: true,
        data: {
          measurementId: 'measurement-123',
          fromNodeId: 'node-1',
          toNodeId: 'node-2',
          direction: 'horizontal',
          operation: 'add_measurement'
        }
      };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      const result = await devModeHandlers.handle('manage_measurements', {
        operation: 'add_measurement',
        fromNodeId: 'node-1',
        toNodeId: 'node-2',
        direction: 'horizontal'
      });

      expect(result.isError).toBe(false);
      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MEASUREMENT_OPERATION',
        payload: {
          operation: 'add_measurement',
          fromNodeId: 'node-1',
          toNodeId: 'node-2',
          direction: 'horizontal'
        }
      });

      const yamlContent = result.content[0].text;
      expect(yamlContent).toContain('operation: measurement_operation');
      expect(yamlContent).toContain('measurementType: add_measurement');
    });

    test('should edit measurement successfully', async () => {
      const mockResponse = {
        success: true,
        data: {
          measurementId: 'measurement-123',
          direction: 'vertical',
          operation: 'edit_measurement'
        }
      };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      const result = await devModeHandlers.handle('manage_measurements', {
        operation: 'edit_measurement',
        measurementId: 'measurement-123',
        direction: 'vertical'
      });

      expect(result.isError).toBe(false);
      const yamlContent = result.content[0].text;
      expect(yamlContent).toContain('measurementType: edit_measurement');
    });

    test('should remove measurement successfully', async () => {
      const mockResponse = {
        success: true,
        data: {
          measurementId: 'measurement-123',
          operation: 'remove_measurement',
          removed: true
        }
      };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      const result = await devModeHandlers.handle('manage_measurements', {
        operation: 'remove_measurement',
        measurementId: 'measurement-123'
      });

      expect(result.isError).toBe(false);
      const yamlContent = result.content[0].text;
      expect(yamlContent).toContain('measurementType: remove_measurement');
    });

    test('should list measurements successfully', async () => {
      const mockResponse = {
        success: true,
        data: {
          measurements: [
            { id: 'measurement-1', direction: 'horizontal' },
            { id: 'measurement-2', direction: 'vertical' }
          ],
          count: 2,
          operation: 'list_measurements'
        }
      };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      const result = await devModeHandlers.handle('manage_measurements', {
        operation: 'list_measurements',
        pageId: 'page-123'
      });

      expect(result.isError).toBe(false);
      const yamlContent = result.content[0].text;
      expect(yamlContent).toContain('measurementType: list_measurements');
    });

    test('should validate measurement direction', async () => {
      await expect(devModeHandlers.handle('manage_measurements', {
        operation: 'add_measurement',
        fromNodeId: 'node-1',
        direction: 'invalid_direction'
      })).rejects.toThrow('Validation failed');
    });

    test('should handle plugin errors for measurements', async () => {
      mockSendToPlugin.mockResolvedValue({
        success: false,
        error: 'Measurement operation failed: Invalid nodes'
      });

      await expect(devModeHandlers.handle('manage_measurements', {
        operation: 'add_measurement',
        fromNodeId: 'invalid-node'
      })).rejects.toThrow('Measurement operation failed: Invalid nodes');
    });
  });

  describe('manage_dev_resources', () => {
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

      const result = await devModeHandlers.handle('manage_dev_resources', {
        operation: 'generate_css',
        nodeId: 'node-123',
        cssOptions: {
          includeChildren: false,
          includeComments: true
        }
      });

      expect(result.isError).toBe(false);
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

      const yamlContent = result.content[0].text;
      expect(yamlContent).toContain('operation: dev_resource_operation');
      expect(yamlContent).toContain('resourceType: generate_css');
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

      const result = await devModeHandlers.handle('manage_dev_resources', {
        operation: 'set_dev_status',
        nodeId: 'node-123',
        status: 'ready_for_dev'
      });

      expect(result.isError).toBe(false);
      const yamlContent = result.content[0].text;
      expect(yamlContent).toContain('resourceType: set_dev_status');
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

      const result = await devModeHandlers.handle('manage_dev_resources', {
        operation: 'add_dev_link',
        nodeId: 'node-456',
        linkUrl: 'https://github.com/project/issues/123',
        linkTitle: 'Issue #123'
      });

      expect(result.isError).toBe(false);
      const yamlContent = result.content[0].text;
      expect(yamlContent).toContain('resourceType: add_dev_link');
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

      const result = await devModeHandlers.handle('manage_dev_resources', {
        operation: 'remove_dev_link',
        nodeId: 'node-456',
        linkId: 'link-123'
      });

      expect(result.isError).toBe(false);
      const yamlContent = result.content[0].text;
      expect(yamlContent).toContain('resourceType: remove_dev_link');
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

      const result = await devModeHandlers.handle('manage_dev_resources', {
        operation: 'get_dev_resources',
        nodeId: 'node-123'
      });

      expect(result.isError).toBe(false);
      const yamlContent = result.content[0].text;
      expect(yamlContent).toContain('resourceType: get_dev_resources');
    });

    test('should validate dev status values', async () => {
      await expect(devModeHandlers.handle('manage_dev_resources', {
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

      await expect(devModeHandlers.handle('manage_dev_resources', {
        operation: 'generate_css',
        nodeId: 'text-node'
      })).rejects.toThrow('CSS generation failed: Node type not supported');
    });
  });

  describe('handle', () => {
    test('should throw error for unknown tool', async () => {
      await expect(devModeHandlers.handle('unknown_tool', {}))
        .rejects.toThrow('Unknown tool: unknown_tool');
    });
  });

  describe('edge cases and validation', () => {
    test('should handle missing required operation parameter', async () => {
      await expect(devModeHandlers.handle('manage_annotations', {
        nodeId: 'node-123'
      })).rejects.toThrow('Validation failed');

      await expect(devModeHandlers.handle('manage_measurements', {
        fromNodeId: 'node-123'
      })).rejects.toThrow('Validation failed');

      await expect(devModeHandlers.handle('manage_dev_resources', {
        nodeId: 'node-123'
      })).rejects.toThrow('Validation failed');
    });

    test('should validate CSS options structure', async () => {
      const mockResponse = {
        success: true,
        data: { nodeId: 'node-123', css: '.test {}', operation: 'generate_css' }
      };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      await devModeHandlers.handle('manage_dev_resources', {
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
        data: { operation: 'list_annotations', annotations: [] }
      };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      // Test with minimal required parameters
      const result = await devModeHandlers.handle('manage_annotations', {
        operation: 'list_annotations'
      });

      expect(result.isError).toBe(false);
      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'ANNOTATION_OPERATION',
        payload: {
          operation: 'list_annotations'
        }
      });
    });
  });
});