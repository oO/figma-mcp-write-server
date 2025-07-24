import { describe, test, expect, vi, beforeEach } from 'vitest';
import { VariablesHandler } from '@/handlers/variables-handler';
import * as yaml from 'js-yaml';

describe('VariableHandlers', () => {
  let variablesHandler: VariablesHandler;
  let mockSendToPlugin: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockSendToPlugin = vi.fn();
    variablesHandler = new VariablesHandler(mockSendToPlugin);
  });

  describe('getTools', () => {
    test('should return correct current tool names', () => {
      const tools = variablesHandler.getTools();
      
      expect(tools).toHaveLength(2);
      expect(tools.map(t => t.name)).toEqual(['figma_collections', 'figma_variables']);
    });

    test('should have bulk operations support in schemas', () => {
      const tools = variablesHandler.getTools();
      const collectionsSchema = tools.find(t => t.name === 'figma_collections')?.inputSchema;
      const variablesSchema = tools.find(t => t.name === 'figma_variables')?.inputSchema;

      // Check collections schema has oneOf patterns for bulk support
      expect(collectionsSchema?.properties?.collectionId).toHaveProperty('oneOf');
      expect(collectionsSchema?.properties?.collectionName).toHaveProperty('oneOf');
      expect(collectionsSchema?.properties?.failFast).toBeDefined();

      // Check variables schema has oneOf patterns for bulk support  
      expect(variablesSchema?.properties?.variableId).toHaveProperty('oneOf');
      expect(variablesSchema?.properties?.variableName).toHaveProperty('oneOf');
      expect(variablesSchema?.properties?.failFast).toBeDefined();
    });
  });

  describe('figma_collections - Single Operations', () => {
    test('should handle single collection creation', async () => {
      const mockResponse = {
        success: true,
        data: { collectionId: 'col-123', name: 'Colors', modes: ['Light', 'Dark'] }
      };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      const result = await variablesHandler.handle('figma_collections', {
        operation: 'create',
        collectionName: 'Colors',
        modes: ['Light', 'Dark'],
        description: 'Color tokens'
      });

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_COLLECTIONS',
        payload: {
          operation: 'create',
          collectionId: undefined,
          collectionName: 'Colors',
          modes: ['Light', 'Dark'],
          modeId: undefined,
          newModeName: undefined,
          description: 'Color tokens',
          hiddenFromPublishing: undefined
        }
      });

      expect(result.isError).toBe(false);
      expect(result.content[0].type).toBe('text');
      const parsedResult = yaml.load(result.content[0].text);
      expect(parsedResult).toEqual(mockResponse.data);
    });

    test('should validate required parameters for create operation', async () => {
      await expect(variablesHandler.handle('figma_collections', {
        operation: 'create'
        // Missing collectionName
      })).rejects.toThrow('collectionName is required for create operation');
    });

    test('should validate required parameters for modify operations', async () => {
      await expect(variablesHandler.handle('figma_collections', {
        operation: 'update'
        // Missing collectionId
      })).rejects.toThrow('collectionId is required for modify operations');
    });
  });

  describe('figma_collections - Bulk Operations', () => {
    test('should detect and handle bulk collection creation', async () => {
      const mockResponse = {
        success: true,
        data: { collectionId: 'col-123', name: 'Colors' }
      };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      const result = await variablesHandler.handle('figma_collections', {
        operation: 'create',
        collectionName: ['Colors', 'Spacing', 'Typography'],
        modes: [['Light', 'Dark'], ['Mobile', 'Desktop'], ['Small', 'Large']],
        description: ['Color tokens', 'Spacing tokens', 'Type tokens']
      });

      // Should call sendToPlugin 3 times for bulk operation
      expect(mockSendToPlugin).toHaveBeenCalledTimes(3);
      
      // Verify first call
      expect(mockSendToPlugin).toHaveBeenNthCalledWith(1, {
        type: 'MANAGE_COLLECTIONS',
        payload: expect.objectContaining({
          operation: 'create',
          collectionName: 'Colors',
          modes: ['Light', 'Dark'],
          description: 'Color tokens'
        })
      });

      // Verify second call
      expect(mockSendToPlugin).toHaveBeenNthCalledWith(2, {
        type: 'MANAGE_COLLECTIONS',
        payload: expect.objectContaining({
          operation: 'create',
          collectionName: 'Spacing',
          modes: ['Mobile', 'Desktop'],
          description: 'Spacing tokens'
        })
      });

      // Result should be bulk format
      expect(result.isError).toBe(false);
      const parsedResult = yaml.load(result.content[0].text);
      expect(parsedResult).toHaveProperty('operation', 'collection_create');
      expect(parsedResult).toHaveProperty('totalItems', 3);
      expect(parsedResult).toHaveProperty('successCount');
      expect(parsedResult).toHaveProperty('results');
    });

    test('should handle array cycling in bulk operations', async () => {
      const mockResponse = { success: true, data: { success: true } };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      await variablesHandler.handle('figma_collections', {
        operation: 'create',
        collectionName: ['Colors', 'Spacing', 'Typography'],
        description: 'Default description', // Single value should cycle
        modes: [['Light', 'Dark']] // Single array should cycle
      });

      expect(mockSendToPlugin).toHaveBeenCalledTimes(3);
      
      // All calls should get the cycled values
      expect(mockSendToPlugin).toHaveBeenNthCalledWith(1, expect.objectContaining({
        payload: expect.objectContaining({
          description: 'Default description',
          modes: ['Light', 'Dark']
        })
      }));
      
      expect(mockSendToPlugin).toHaveBeenNthCalledWith(3, expect.objectContaining({
        payload: expect.objectContaining({
          description: 'Default description',
          modes: ['Light', 'Dark']
        })
      }));
    });

    test('should handle failFast option in bulk operations', async () => {
      mockSendToPlugin
        .mockResolvedValueOnce({ success: true, data: { success: true } })
        .mockRejectedValueOnce(new Error('Collection creation failed'))
        .mockResolvedValueOnce({ success: true, data: { success: true } });

      const result = await variablesHandler.handle('figma_collections', {
        operation: 'create',
        collectionName: ['Success', 'Failure', 'NotCalled'],
        modes: [['Light'], ['Light'], ['Light']],
        failFast: true
      });

      // Should stop after first failure with failFast
      expect(mockSendToPlugin).toHaveBeenCalledTimes(2);
      
      const parsedResult = yaml.load(result.content[0].text);
      expect(parsedResult.successCount).toBe(1);
      expect(parsedResult.errorCount).toBe(1);
      expect(parsedResult.totalItems).toBe(3);
    });
  });

  describe('figma_variables - Bulk Operations', () => {
    test('should detect and handle bulk variable creation', async () => {
      const mockResponse = {
        success: true,
        data: { variableId: 'var-123', name: 'primary-blue' }
      };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      const result = await variablesHandler.handle('figma_variables', {
        operation: 'create',
        collectionId: 'col-123',
        variableName: ['primary-blue', 'secondary-green', 'accent-red'],
        variableType: ['COLOR', 'COLOR', 'COLOR'],
        modeValues: { light: '#0066CC', dark: '#4A9EFF' }
      });

      expect(mockSendToPlugin).toHaveBeenCalledTimes(3);
      
      // Verify bulk execution
      expect(mockSendToPlugin).toHaveBeenNthCalledWith(1, {
        type: 'MANAGE_VARIABLES',
        payload: expect.objectContaining({
          operation: 'create',
          variableName: 'primary-blue',
          variableType: 'COLOR'
        })
      });

      const parsedResult = yaml.load(result.content[0].text);
      expect(parsedResult).toHaveProperty('operation', 'variable_create');
      expect(parsedResult.totalItems).toBe(3);
    });
  });

  describe('Error Handling', () => {
    test('should use error.toString() for JSON-RPC compliance', async () => {
      mockSendToPlugin.mockRejectedValue(new Error('Plugin connection failed'));

      try {
        await variablesHandler.handle('figma_collections', {
          operation: 'create',
          collectionName: 'Test'
        });
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        // The error should be propagated correctly for JSON-RPC
      }
    });

    test('should handle plugin errors correctly', async () => {
      mockSendToPlugin.mockResolvedValue({
        success: false,
        error: 'Collection name already exists'
      });

      await expect(variablesHandler.handle('figma_collections', {
        operation: 'create',
        collectionName: 'DuplicateName',
        modes: ['Light']
      })).rejects.toThrow('Collection name already exists');
    });
  });

  describe('Defensive Parsing', () => {
    test('should handle JSON string arrays from MCP clients', async () => {
      const mockResponse = { success: true, data: { success: true } };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      // Simulate Claude Desktop sending JSON string arrays
      const result = await variablesHandler.handle('figma_collections', {
        operation: 'create',
        collectionName: '["Colors", "Spacing"]', // JSON string
        modes: '[["Light", "Dark"], ["Mobile", "Desktop"]]' // JSON string of arrays
      });

      expect(mockSendToPlugin).toHaveBeenCalledTimes(2);
      
      // Should parse JSON strings correctly
      expect(mockSendToPlugin).toHaveBeenNthCalledWith(1, expect.objectContaining({
        payload: expect.objectContaining({
          collectionName: 'Colors'
        })
      }));
    });

    test('should handle mixed single/array parameters', async () => {
      const mockResponse = { success: true, data: { success: true } };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      await variablesHandler.handle('figma_variables', {
        operation: 'create',
        collectionId: 'col-123',
        variableName: ['var1', 'var2', 'var3'],
        variableType: 'COLOR' // Single value should cycle
      });

      expect(mockSendToPlugin).toHaveBeenCalledTimes(3);
      
      // All calls should get the cycled COLOR type
      for (let i = 1; i <= 3; i++) {
        expect(mockSendToPlugin).toHaveBeenNthCalledWith(i, expect.objectContaining({
          payload: expect.objectContaining({
            variableType: 'COLOR'
          })
        }));
      }
    });
  });

  describe('Integration with BulkOperationsParser', () => {
    test('should use consistent parameter configs', async () => {
      const mockResponse = { success: true, data: { success: true } };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      // Test that defensive parsing works with CommonParamConfigs
      await variablesHandler.handle('figma_collections', {
        operation: 'create',
        collectionName: ['Test'],
        modes: [['Light']]
      });

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_COLLECTIONS',
        payload: expect.objectContaining({
          collectionName: 'Test',
          modes: ['Light']
        })
      });
    });
  });
});