import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComponentsHandler } from '../../../src/handlers/components-handler';
import * as yaml from 'js-yaml';

describe('ComponentsHandler', () => {
  let handler: ComponentsHandler;
  let mockSendToPlugin: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockSendToPlugin = vi.fn();
    handler = new ComponentsHandler(mockSendToPlugin);
  });

  describe('getTools', () => {
    it('should return figma_components tool', () => {
      const tools = handler.getTools();
      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe('figma_components');
      expect(tools[0].description).toContain('component');
    });

    it('should support component operations', () => {
      const tools = handler.getTools();
      const schema = tools[0].inputSchema;
      const operations = schema.properties.operation.enum;
      
      expect(operations).toContain('create');
      expect(operations).toContain('create_set');
      expect(operations).toContain('update');
      expect(operations).toContain('delete');
      expect(operations).toContain('publish');
      expect(operations).toContain('list');
      expect(operations).toContain('get');
    });
  });

  describe('handle', () => {
    it('should handle create operation', async () => {
      mockSendToPlugin.mockResolvedValue({
        operation: 'create',
        componentId: 'comp-123'
      });

      const result = await handler.handle('figma_components', {
        operation: 'create',
        componentId: '123:456',
        name: 'Button Component'
      });

      // UnifiedHandler returns YAML wrapped results
      expect(result.content).toBeDefined();
      expect(result.content[0].text).toBeDefined();
      const parsedResult = yaml.load(result.content[0].text);
      expect(parsedResult.operation).toBe('create');
      expect(parsedResult.componentId).toBe('comp-123');
      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_COMPONENTS',
        payload: {
          operation: 'create',
          componentId: '123:456',
          name: 'Button Component'
        }
      });
    });

    it('should handle create_set operation', async () => {
      mockSendToPlugin.mockResolvedValue({
        operation: 'create_set',
        componentSetId: 'set-123'
      });

      const result = await handler.handle('figma_components', {
        operation: 'create_set',
        componentIds: ['comp-1', 'comp-2'],
        name: 'Button Set'
      });

      // UnifiedHandler returns YAML wrapped results
      expect(result.content).toBeDefined();
      expect(result.content[0].text).toBeDefined();
      const parsedResult = yaml.load(result.content[0].text);
      expect(parsedResult.operation).toBe('create_set');
      expect(parsedResult.componentSetId).toBe('set-123');
      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_COMPONENTS',
        payload: {
          operation: 'create_set',
          componentIds: ['comp-1', 'comp-2'],
          name: 'Button Set'
        }
      });
    });

    it('should handle list operation', async () => {
      mockSendToPlugin.mockResolvedValue({
        operation: 'list',
        components: []
      });

      const result = await handler.handle('figma_components', {
        operation: 'list',
        filterType: 'components'
      });

      // UnifiedHandler returns YAML wrapped results
      expect(result.content).toBeDefined();
      expect(result.content[0].text).toBeDefined();
      const parsedResult = yaml.load(result.content[0].text);
      expect(parsedResult.operation).toBe('list');
      expect(parsedResult).toHaveProperty('components');
      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_COMPONENTS',
        payload: {
          operation: 'list',
          filterType: 'components'
        }
      });
    });

    it('should handle bulk component creation', async () => {
      mockSendToPlugin.mockResolvedValue({
        operation: 'create',
        componentId: 'comp-123'
      });

      const result = await handler.handle('figma_components', {
        operation: 'create',
        componentId: ['123:456', '123:789'],
        name: ['Button', 'Input']
      });

      // UnifiedHandler returns YAML wrapped results
      expect(result.content).toBeDefined();
      expect(result.content[0].text).toBeDefined();
      const parsedResult = yaml.load(result.content[0].text);
      expect(Array.isArray(parsedResult) || parsedResult.results).toBeTruthy();
      expect(mockSendToPlugin).toHaveBeenCalledTimes(2);
      
      expect(mockSendToPlugin).toHaveBeenNthCalledWith(1, {
        type: 'MANAGE_COMPONENTS',
        payload: {
          operation: 'create',
          componentId: '123:456',
          name: 'Button'
        }
      });

      expect(mockSendToPlugin).toHaveBeenNthCalledWith(2, {
        type: 'MANAGE_COMPONENTS',
        payload: {
          operation: 'create',
          componentId: '123:789',
          name: 'Input'
        }
      });
    });

    it('should reject unknown tool names', async () => {
      await expect(
        handler.handle('unknown_tool', { operation: 'create' })
      ).rejects.toThrow('Unknown tool: unknown_tool');
    });

    it('should validate required parameters', async () => {
      await expect(
        handler.handle('figma_components', {})
      ).rejects.toThrow();
    });

    it('should validate operation enum values', async () => {
      await expect(
        handler.handle('figma_components', { operation: 'invalid_operation' })
      ).rejects.toThrow();
    });
  });

  describe('Result formatting', () => {
    it('should return YAML formatted results', async () => {
      const mockResponse = {
        success: true,
        data: { componentId: 'comp-123' }
      };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      const result = await handler.handle('figma_components', {
        operation: 'create',
        componentId: '123:456',
        name: 'Button'
      });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      
      const parsedResult = yaml.load(result.content[0].text);
      expect(parsedResult).toHaveProperty('data');
      expect(parsedResult.data).toHaveProperty('componentId');
    });
  });
});