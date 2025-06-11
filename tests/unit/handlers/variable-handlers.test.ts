import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { VariableHandlers } from '../../../src/handlers/variable-handlers.js';
import * as yaml from 'js-yaml';

describe('VariableHandlers', () => {
  let variableHandlers: VariableHandlers;
  let mockSendToPlugin: jest.MockedFunction<(request: any) => Promise<any>>;

  beforeEach(() => {
    mockSendToPlugin = jest.fn();
    variableHandlers = new VariableHandlers(mockSendToPlugin);
  });

  describe('getTools', () => {
    test('should return manage_collections and manage_variables tools', () => {
      const tools = variableHandlers.getTools();
      
      expect(tools).toHaveLength(2);
      expect(tools.map(t => t.name)).toEqual(['manage_collections', 'manage_variables']);
    });

    test('should have correct tool schemas', () => {
      const tools = variableHandlers.getTools();
      const collectionsSchema = tools.find(t => t.name === 'manage_collections')?.inputSchema;
      const variablesSchema = tools.find(t => t.name === 'manage_variables')?.inputSchema;

      expect(collectionsSchema?.properties?.operation).toBeDefined();
      expect(variablesSchema?.properties?.operation).toBeDefined();
    });
  });

  describe('manageCollections', () => {
    test('should validate required operation parameter', async () => {
      await expect(variableHandlers.manageCollections({}))
        .rejects.toThrow('Required');
    });

    test('should validate create operation requires collectionName', async () => {
      await expect(variableHandlers.manageCollections({ operation: 'create' }))
        .rejects.toThrow('collectionName is required for create operation');
    });

    test('should validate modify operations require collectionId', async () => {
      await expect(variableHandlers.manageCollections({ operation: 'update' }))
        .rejects.toThrow('collectionId is required for modify operations');
        
      await expect(variableHandlers.manageCollections({ operation: 'delete' }))
        .rejects.toThrow('collectionId is required for modify operations');
        
      await expect(variableHandlers.manageCollections({ operation: 'get' }))
        .rejects.toThrow('collectionId is required for modify operations');
    });

    test('should validate mode operations require specific parameters', async () => {
      await expect(variableHandlers.manageCollections({ 
        operation: 'remove_mode', 
        collectionId: 'test-id' 
      })).rejects.toThrow('modeId is required for remove_mode operation');

      await expect(variableHandlers.manageCollections({ 
        operation: 'rename_mode', 
        collectionId: 'test-id',
        modeId: 'mode-1'
      })).rejects.toThrow('modeId and newModeName are required for rename_mode operation');

      await expect(variableHandlers.manageCollections({ 
        operation: 'add_mode', 
        collectionId: 'test-id'
      })).rejects.toThrow('newModeName is required for add_mode operation');
    });

    test('should send correct payload to plugin for create operation', async () => {
      const mockResponse = { success: true, data: { id: 'collection-1', name: 'Test Colors' } };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      const result = await variableHandlers.manageCollections({
        operation: 'create',
        collectionName: 'Test Colors',
        description: 'Color tokens'
      });

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_COLLECTIONS',
        payload: {
          operation: 'create',
          collectionId: undefined,
          collectionName: 'Test Colors',
          modes: undefined,
          modeId: undefined,
          newModeName: undefined,
          description: 'Color tokens',
          hiddenFromPublishing: undefined
        }
      });

      expect(result.content[0].text).toContain('Test Colors');
    });

    test('should handle plugin errors gracefully', async () => {
      mockSendToPlugin.mockResolvedValue({ success: false, error: 'Collection not found' });

      await expect(variableHandlers.manageCollections({
        operation: 'get',
        collectionId: 'invalid-id'
      })).rejects.toThrow('Collection not found');
    });
  });

  describe('manageVariables', () => {
    test('should validate create operation parameters', async () => {
      await expect(variableHandlers.manageVariables({ operation: 'create' }))
        .rejects.toThrow('collectionId, variableName, and variableType are required for create operation');
    });

    test('should validate variable-specific operations require variableId', async () => {
      await expect(variableHandlers.manageVariables({ operation: 'update' }))
        .rejects.toThrow('variableId is required for variable-specific operations');
        
      await expect(variableHandlers.manageVariables({ operation: 'delete' }))
        .rejects.toThrow('variableId is required for variable-specific operations');
        
      await expect(variableHandlers.manageVariables({ operation: 'get' }))
        .rejects.toThrow('variableId is required for variable-specific operations');
    });

    test('should validate list operation requires collectionId', async () => {
      await expect(variableHandlers.manageVariables({ operation: 'list' }))
        .rejects.toThrow('collectionId is required for list operation');
    });

    test('should validate bind operation parameters', async () => {
      await expect(variableHandlers.manageVariables({ operation: 'bind' }))
        .rejects.toThrow('variableId and property are required for bind operation');

      await expect(variableHandlers.manageVariables({ 
        operation: 'bind',
        variableId: 'var-1',
        property: 'fills'
      })).rejects.toThrow('Either nodeId or styleId is required for bind operation');
    });

    test('should validate unbind operation parameters', async () => {
      await expect(variableHandlers.manageVariables({ operation: 'unbind' }))
        .rejects.toThrow('property is required for unbind operation');

      await expect(variableHandlers.manageVariables({ 
        operation: 'unbind',
        property: 'width'
      })).rejects.toThrow('Either nodeId or styleId is required for unbind operation');
    });

    test('should validate get_bindings accepts nodeId or variableId', async () => {
      // Should accept nodeId
      const mockResponse = { success: true, data: { bindings: [] } };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      await expect(variableHandlers.manageVariables({ 
        operation: 'get_bindings',
        nodeId: 'node-1'
      })).resolves.toBeDefined();

      // Should accept variableId
      await expect(variableHandlers.manageVariables({ 
        operation: 'get_bindings',
        variableId: 'var-1'
      })).resolves.toBeDefined();

      // Should reject when both are missing
      await expect(variableHandlers.manageVariables({ operation: 'get_bindings' }))
        .rejects.toThrow('Either nodeId or variableId is required for get_bindings operation');
    });

    test('should send correct payload for variable creation', async () => {
      const mockResponse = { success: true, data: { id: 'var-1', name: 'Primary Blue' } };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      await variableHandlers.manageVariables({
        operation: 'create',
        collectionId: 'collection-1',
        variableName: 'Primary Blue',
        variableType: 'COLOR',
        modeValues: { light: '#0066CC', dark: '#4A9EFF' }
      });

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_VARIABLES',
        payload: expect.objectContaining({
          operation: 'create',
          collectionId: 'collection-1',
          variableName: 'Primary Blue',
          variableType: 'COLOR',
          modeValues: { light: '#0066CC', dark: '#4A9EFF' }
        })
      });
    });

    test('should return YAML formatted data', async () => {
      const mockData = { variableId: 'var-1', name: 'Test Variable', type: 'COLOR' };
      mockSendToPlugin.mockResolvedValue({ success: true, data: mockData });

      const result = await variableHandlers.manageVariables({
        operation: 'get',
        variableId: 'var-1'
      });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      
      const parsedYaml = yaml.load(result.content[0].text) as any;
      expect(parsedYaml.variableId).toBe('var-1');
      expect(parsedYaml.name).toBe('Test Variable');
    });
  });

  describe('handle method', () => {
    test('should route to correct handler method', async () => {
      const mockResponse = { success: true, data: {} };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      await variableHandlers.handle('manage_collections', { operation: 'list' });
      expect(mockSendToPlugin).toHaveBeenCalledWith(expect.objectContaining({
        type: 'MANAGE_COLLECTIONS'
      }));

      await variableHandlers.handle('manage_variables', { 
        operation: 'list', 
        collectionId: 'test-id' 
      });
      expect(mockSendToPlugin).toHaveBeenCalledWith(expect.objectContaining({
        type: 'MANAGE_VARIABLES'
      }));
    });

    test('should throw error for unknown tool', async () => {
      await expect(variableHandlers.handle('unknown_tool', {}))
        .rejects.toThrow('Unknown tool: unknown_tool');
    });
  });
});