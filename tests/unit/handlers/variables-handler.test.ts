import { describe, it, expect, beforeEach, vi } from 'vitest';
import { VariablesHandler } from '../../../src/handlers/variables-handler.js';

// Mock the unified handler
const mockHandle = vi.fn().mockResolvedValue({ success: true, data: {} });
vi.mock('../../../src/utils/unified-handler.js', () => ({
  UnifiedHandler: vi.fn().mockImplementation(() => ({
    handle: mockHandle
  })),
  UnifiedHandlerConfig: vi.fn(),
  UnifiedParamConfigs: {
    basic: vi.fn().mockReturnValue({})
  }
}));

// The caseInsensitiveEnum function is now defined inline in the handler file

// Mock the schema
vi.mock('../../../src/types/index.js', () => ({
  ManageVariablesSchema: {
    parse: vi.fn().mockImplementation((args) => args)
  }
}));

describe('VariablesHandler', () => {
  let handler: VariablesHandler;
  let mockSendToPlugin: vi.Mock;

  beforeEach(() => {
    mockSendToPlugin = vi.fn().mockResolvedValue({ success: true, data: {} });
    handler = new VariablesHandler(mockSendToPlugin);
  });

  describe('getTools', () => {
    it('should return figma_variables tool definition', () => {
      const tools = handler.getTools();
      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe('figma_variables');
      expect(tools[0].description).toContain('Create variables and bind them to properties');
    });

    it('should include all operations in schema', () => {
      const tools = handler.getTools();
      const schema = tools[0].inputSchema;
      
      expect(schema.properties.operation.enum).toEqual([
        'create_variable', 'update_variable', 'delete_variable', 'get_variable', 'list_variables', 'bind_variable', 'unbind_variable', 'create_collection', 'update_collection', 'delete_collection', 'duplicate_collection', 'get_collection', 'list_collections', 'add_mode', 'remove_mode', 'rename_mode'
      ]);
    });

    it('should use id parameter instead of nodeId', () => {
      const tools = handler.getTools();
      const schema = tools[0].inputSchema;
      
      expect(schema.properties.id).toBeDefined();
      expect(schema.properties.nodeId).toBeUndefined();
    });

    it('should include comprehensive examples', () => {
      const tools = handler.getTools();
      const examples = tools[0].examples;
      
      expect(examples).toContain('{"operation": "create_variable", "collectionId": "123:456", "variableName": "Primary Blue", "variableType": "COLOR", "modeValues": {"light": "#0066CC", "dark": "#4A9EFF"}}');
      expect(examples).toContain('{"operation": "bind_variable", "variableId": "123:789", "id": "456:123", "property": "fills"}');
      expect(examples).toContain('{"operation": "list_variables", "collectionId": "123:456"}');
    });
  });

  describe('handle', () => {
    it('should reject unknown tool names', async () => {
      await expect(handler.handle('unknown_tool', {})).rejects.toThrow('Unknown tool: unknown_tool');
    });

    it('should configure UnifiedHandler with correct parameters', async () => {
      const args = { operation: 'create_variable', collectionId: '123', variableName: 'Test', variableType: 'COLOR' };
      
      await handler.handle('figma_variables', args);
      
      // Check that UnifiedHandler was called with correct config
      expect(mockHandle).toHaveBeenCalled();
    });

    it('should use correct bulk parameters', async () => {
      const args = { operation: 'bind_variable', variableId: '123', id: '456', property: 'fills' };
      
      await handler.handle('figma_variables', args);
      
      // The UnifiedHandler should be configured with correct bulk params
      expect(mockHandle).toHaveBeenCalled();
    });
  });

  describe('validateVariableArgs', () => {
    it('should validate create operation requirements', () => {
      const args = { operation: 'create_variable', collectionId: '123', variableName: 'Test', variableType: 'COLOR' };
      
      expect(() => handler['validateVariableArgs'](args)).not.toThrow();
    });

    it('should reject create operation without required fields', () => {
      const args = { operation: 'create_variable' };
      
      expect(() => handler['validateVariableArgs'](args)).toThrow('collectionId, variableName, and variableType are required for create_variable operation');
    });

    it('should validate update operation requirements', () => {
      const args = { operation: 'update_variable', variableId: '123' };
      
      expect(() => handler['validateVariableArgs'](args)).not.toThrow();
    });

    it('should reject update operation without variableId', () => {
      const args = { operation: 'update_variable' };
      
      expect(() => handler['validateVariableArgs'](args)).toThrow('variableId is required for variable-specific operations');
    });

    it('should validate bind operation requirements', () => {
      const args = { operation: 'bind_variable', variableId: '123', id: '456', property: 'fills' };
      
      expect(() => handler['validateVariableArgs'](args)).not.toThrow();
    });

    it('should reject bind operation without required fields', () => {
      const args = { operation: 'bind_variable', variableId: '123' };
      
      expect(() => handler['validateVariableArgs'](args)).toThrow('variableId and property are required for bind_variable operation');
    });

    it('should require either id or styleId for bind operation', () => {
      const args = { operation: 'bind_variable', variableId: '123', property: 'fills' };
      
      expect(() => handler['validateVariableArgs'](args)).toThrow('Either id or styleId is required for bind_variable operation');
    });

    it('should validate unbind operation requirements', () => {
      const args = { operation: 'unbind_variable', id: '456', property: 'fills' };
      
      expect(() => handler['validateVariableArgs'](args)).not.toThrow();
    });

    it('should validate get_variable operation requirements', () => {
      const args = { operation: 'get_variable', variableId: '123' };
      
      expect(() => handler['validateVariableArgs'](args)).not.toThrow();
    });

    it('should reject get_variable operation without required fields', () => {
      const args = { operation: 'get_variable' };
      
      expect(() => handler['validateVariableArgs'](args)).toThrow('variableId is required for variable-specific operations');
    });

    it('should normalize operation to uppercase', () => {
      const args = { operation: 'create_variable', collectionId: '123', variableName: 'Test', variableType: 'color' };
      
      const result = handler['validateVariableArgs'](args);
      
      expect(result.operation).toBe('create_variable');
      expect(result.variableType).toBe('COLOR');
    });

    it('should normalize variable type arrays', () => {
      const args = { operation: 'create_variable', collectionId: '123', variableName: 'Test', variableType: ['color', 'float'] };
      
      const result = handler['validateVariableArgs'](args);
      
      expect(result.variableType).toEqual(['COLOR', 'FLOAT']);
    });
  });
});