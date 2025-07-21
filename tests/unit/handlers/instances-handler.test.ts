import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InstancesHandler } from '../../../src/handlers/instances-handler';
import * as yaml from 'js-yaml';

describe('InstancesHandler', () => {
  let handler: InstancesHandler;
  let mockSendToPlugin: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockSendToPlugin = vi.fn();
    handler = new InstancesHandler(mockSendToPlugin);
  });

  describe('getTools', () => {
    it('should return figma_instances tool', () => {
      const tools = handler.getTools();
      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe('figma_instances');
      expect(tools[0].description).toContain('component instances');
    });

    it('should support instance operations', () => {
      const tools = handler.getTools();
      const schema = tools[0].inputSchema;
      const operations = schema.properties.operation.enum;
      
      expect(operations).toContain('create');
      expect(operations).toContain('update');
      expect(operations).toContain('duplicate');
      expect(operations).toContain('detach');
      expect(operations).toContain('swap');
      expect(operations).toContain('reset_overrides');
      expect(operations).toContain('get');
      expect(operations).toContain('list');
    });

    it('should support bulk operations for instance parameters', () => {
      const tools = handler.getTools();
      const schema = tools[0].inputSchema;
      
      expect(schema.properties.componentId.oneOf).toBeDefined();
      expect(schema.properties.instanceId.oneOf).toBeDefined();
      expect(schema.properties.instanceId.oneOf).toBeDefined();
      expect(schema.properties.mainComponentId.oneOf).toBeDefined();
      expect(schema.properties.name.oneOf).toBeDefined();
    });
  });

  describe('handle', () => {
    it('should handle create operation', async () => {
      mockSendToPlugin.mockResolvedValue({
        success: true,
        data: { 
          id: 'instance-123',
          name: 'Button Instance',
          type: 'INSTANCE',
          sourceComponentId: 'component-456'
        }
      });

      const result = await handler.handle('figma_instances', {
        operation: 'create',
        componentId: 'component-456',
        x: 100,
        y: 200,
        name: 'Button Instance'
      });

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_INSTANCES',
        payload: expect.objectContaining({
          operation: 'create',
          componentId: 'component-456',
          x: 100,
          y: 200,
          name: 'Button Instance'
        })
      });
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
    });

    it('should handle update operation', async () => {
      mockSendToPlugin.mockResolvedValue({
        success: true,
        data: { 
          instanceId: 'instance-123',
          name: 'Updated Instance',
          updates: { name: 'Updated Instance' }
        }
      });

      const result = await handler.handle('figma_instances', {
        operation: 'update',
        instanceId: 'instance-123',
        name: 'Updated Instance',
        x: 150,
        y: 250,
        overrides: { variant: 'primary' }
      });

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_INSTANCES',
        payload: expect.objectContaining({
          operation: 'update',
          instanceId: 'instance-123',
          name: 'Updated Instance',
          x: 150,
          y: 250,
          overrides: { variant: 'primary' }
        })
      });
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
    });

    it('should handle duplicate operation', async () => {
      mockSendToPlugin.mockResolvedValue({
        success: true,
        data: { 
          id: 'instance-789',
          name: 'Button Instance Copy',
          originalInstanceId: 'instance-123'
        }
      });

      const result = await handler.handle('figma_instances', {
        operation: 'duplicate',
        instanceId: 'instance-123',
        name: 'Button Instance Copy',
        x: 200,
        y: 300
      });

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_INSTANCES',
        payload: expect.objectContaining({
          operation: 'duplicate',
          instanceId: 'instance-123',
          name: 'Button Instance Copy',
          x: 200,
          y: 300
        })
      });
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
    });

    it('should handle detach operation', async () => {
      mockSendToPlugin.mockResolvedValue({
        success: true,
        data: { 
          nodeId: 'instance-123',
          name: 'Detached Instance',
          type: 'FRAME',
          previousMainComponent: 'Button Component',
          previousType: 'INSTANCE'
        }
      });

      const result = await handler.handle('figma_instances', {
        operation: 'detach',
        instanceId: 'instance-123'
      });

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_INSTANCES',
        payload: expect.objectContaining({
          operation: 'detach',
          instanceId: 'instance-123'
        })
      });
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
    });

    it('should handle swap operation', async () => {
      mockSendToPlugin.mockResolvedValue({
        success: true,
        data: { 
          instanceId: 'instance-123',
          name: 'Button Instance',
          oldComponent: 'Button Primary',
          newComponent: 'Button Secondary',
          newComponentId: 'component-789'
        }
      });

      const result = await handler.handle('figma_instances', {
        operation: 'swap',
        instanceId: 'instance-123',
        mainComponentId: 'component-789'
      });

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_INSTANCES',
        payload: expect.objectContaining({
          operation: 'swap',
          instanceId: 'instance-123',
          mainComponentId: 'component-789'
        })
      });
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
    });

    it('should handle reset_overrides operation', async () => {
      mockSendToPlugin.mockResolvedValue({
        success: true,
        data: { 
          instanceId: 'instance-123',
          name: 'Button Instance',
          previousOverrides: { variant: 'primary', size: 'large' },
          currentOverrides: { variant: 'default', size: 'medium' },
          resetCount: 2
        }
      });

      const result = await handler.handle('figma_instances', {
        operation: 'reset_overrides',
        instanceId: 'instance-123'
      });

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_INSTANCES',
        payload: expect.objectContaining({
          operation: 'reset_overrides',
          instanceId: 'instance-123'
        })
      });
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
    });

    it('should handle get operation', async () => {
      mockSendToPlugin.mockResolvedValue({
        success: true,
        data: { 
          id: 'instance-123',
          name: 'Button Instance',
          type: 'INSTANCE',
          sourceComponentId: 'component-456',
          sourceComponentName: 'Button Component',
          overrides: { variant: 'primary' },
          position: { x: 100, y: 200 },
          dimensions: { width: 120, height: 40 }
        }
      });

      const result = await handler.handle('figma_instances', {
        operation: 'get',
        instanceId: 'instance-123'
      });

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_INSTANCES',
        payload: expect.objectContaining({
          operation: 'get',
          instanceId: 'instance-123'
        })
      });
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
    });

    it('should handle list operation', async () => {
      mockSendToPlugin.mockResolvedValue({
        success: true,
        data: { 
          instances: [
            { id: 'instance-123', name: 'Button Instance 1', sourceComponentId: 'component-456' },
            { id: 'instance-456', name: 'Button Instance 2', sourceComponentId: 'component-456' }
          ],
          totalCount: 2,
          pages: 1
        }
      });

      const result = await handler.handle('figma_instances', {
        operation: 'list'
      });

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_INSTANCES',
        payload: expect.objectContaining({
          operation: 'list'
        })
      });
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
    });

    it('should handle bulk create operation', async () => {
      mockSendToPlugin.mockResolvedValue({
        success: true,
        data: { 
          results: [
            { id: 'instance-123', name: 'Button Instance 1' },
            { id: 'instance-456', name: 'Button Instance 2' }
          ]
        }
      });

      const result = await handler.handle('figma_instances', {
        operation: 'create',
        componentId: ['component-456', 'component-789'],
        name: ['Button Instance 1', 'Button Instance 2'],
        x: [100, 200],
        y: [200, 300]
      });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(mockSendToPlugin).toHaveBeenCalledTimes(2);
      
      expect(mockSendToPlugin).toHaveBeenNthCalledWith(1, {
        type: 'MANAGE_INSTANCES',
        payload: expect.objectContaining({
          operation: 'create',
          componentId: 'component-456',
          name: 'Button Instance 1',
          x: 100,
          y: 200
        })
      });

      expect(mockSendToPlugin).toHaveBeenNthCalledWith(2, {
        type: 'MANAGE_INSTANCES',
        payload: expect.objectContaining({
          operation: 'create',
          componentId: 'component-789',
          name: 'Button Instance 2',
          x: 200,
          y: 300
        })
      });
    });

    it('should handle bulk update operation', async () => {
      mockSendToPlugin.mockResolvedValue({
        success: true,
        data: { instanceId: 'instance-123', name: 'Updated Instance' }
      });

      const result = await handler.handle('figma_instances', {
        operation: 'update',
        instanceId: ['instance-123', 'instance-456'],
        name: ['Updated Instance 1', 'Updated Instance 2'],
        x: [150, 250],
        y: [250, 350]
      });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(mockSendToPlugin).toHaveBeenCalledTimes(2);
    });

    it('should handle failFast parameter in bulk operations', async () => {
      mockSendToPlugin.mockResolvedValue({
        success: true,
        data: { id: 'instance-123', name: 'Updated Instance' }
      });

      const result = await handler.handle('figma_instances', {
        operation: 'update',
        instanceId: ['instance-123', 'instance-456'],
        name: ['Updated Instance 1', 'Updated Instance 2'],
        failFast: true
      });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
    });

    it('should handle instance creation with overrides', async () => {
      mockSendToPlugin.mockResolvedValue({
        success: true,
        data: { 
          id: 'instance-123',
          name: 'Button Instance',
          appliedOverrides: { variant: 'primary', size: 'large' }
        }
      });

      const result = await handler.handle('figma_instances', {
        operation: 'create',
        componentId: 'component-456',
        name: 'Button Instance',
        x: 100,
        y: 200,
        overrides: {
          variant: 'primary',
          size: 'large'
        }
      });

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_INSTANCES',
        payload: expect.objectContaining({
          operation: 'create',
          componentId: 'component-456',
          overrides: {
            variant: 'primary',
            size: 'large'
          }
        })
      });
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
    });

    it('should reject unknown tool names', async () => {
      await expect(
        handler.handle('unknown_tool', { operation: 'create' })
      ).rejects.toThrow('Unknown tool: unknown_tool');
    });

    it('should validate required parameters', async () => {
      await expect(
        handler.handle('figma_instances', {})
      ).rejects.toThrow();
    });

    it('should validate operation enum values', async () => {
      await expect(
        handler.handle('figma_instances', { operation: 'invalid_operation' })
      ).rejects.toThrow();
    });

    it('should support case-insensitive operations', async () => {
      mockSendToPlugin.mockResolvedValue({
        success: true,
        data: { 
          id: 'instance-123',
          name: 'Button Instance',
          type: 'INSTANCE',
          sourceComponentId: 'component-456'
        }
      });

      const result = await handler.handle('figma_instances', {
        operation: 'CREATE', // Uppercase
        componentId: 'component-456',
        name: 'Button Instance'
      });

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_INSTANCES',
        payload: expect.objectContaining({
          operation: 'create' // caseInsensitiveEnum normalizes to lowercase
        })
      });
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
    });
  });

  describe('Result formatting', () => {
    it('should return YAML formatted results', async () => {
      const mockResponse = {
        success: true,
        data: { 
          id: 'instance-123',
          name: 'Button Instance',
          sourceComponentId: 'component-456'
        }
      };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      const result = await handler.handle('figma_instances', {
        operation: 'create',
        componentId: 'component-456',
        name: 'Button Instance'
      });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      
      const parsedResult = yaml.load(result.content[0].text);
      expect(parsedResult).toHaveProperty('data');
      expect(parsedResult.data).toHaveProperty('id');
      expect(parsedResult.data).toHaveProperty('name');
      expect(parsedResult.data).toHaveProperty('sourceComponentId');
    });
  });
});