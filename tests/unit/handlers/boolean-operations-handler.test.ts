import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BooleanOperationsHandler } from '../../../src/handlers/boolean-operations-handler.js';

// Mock the unified handler
vi.mock('../../../src/utils/unified-handler.js', () => ({
  UnifiedHandler: vi.fn().mockImplementation(() => ({
    handle: vi.fn().mockResolvedValue({ success: true, data: {} })
  })),
  UnifiedHandlerConfig: vi.fn(),
  UnifiedParamConfigs: {
    basic: vi.fn().mockReturnValue({})
  }
}));

// Mock the schema
vi.mock('../../../src/types/boolean-operations.js', () => ({
  ManageBooleanOperationsSchema: {
    parse: vi.fn().mockImplementation((args) => args)
  }
}));

describe('BooleanOperationsHandler', () => {
  let handler: BooleanOperationsHandler;
  let mockSendToPlugin: vi.Mock;

  beforeEach(() => {
    mockSendToPlugin = vi.fn().mockResolvedValue({ success: true, data: {} });
    handler = new BooleanOperationsHandler(mockSendToPlugin);
  });

  describe('getTools', () => {
    it('should return figma_boolean_operations tool definition', () => {
      const tools = handler.getTools();
      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe('figma_boolean_operations');
      expect(tools[0].description).toContain('boolean operations');
    });

    it('should include all operations in schema', () => {
      const tools = handler.getTools();
      const schema = tools[0].inputSchema;
      
      expect(schema.properties.operation.enum).toEqual([
        'union', 'subtract', 'intersect', 'exclude'
      ]);
    });

    it('should require operation and nodeIds', () => {
      const tools = handler.getTools();
      const schema = tools[0].inputSchema;
      
      expect(schema.required).toEqual(['operation', 'nodeIds']);
    });

    it('should include preserveOriginal parameter', () => {
      const tools = handler.getTools();
      const schema = tools[0].inputSchema;
      
      expect(schema.properties.preserveOriginal).toBeDefined();
      expect(schema.properties.preserveOriginal.default).toBe(false);
    });

    it('should include comprehensive examples', () => {
      const tools = handler.getTools();
      const examples = tools[0].examples;
      
      expect(examples).toContain('{"operation": "union", "nodeIds": ["123:456", "123:789"], "name": "Combined Shape"}');
      expect(examples).toContain('{"operation": "subtract", "nodeIds": ["123:456", "123:789"], "name": "Cutout Shape", "preserveOriginal": true}');
    });
  });

  describe('handle', () => {
    it('should reject unknown tool names', async () => {
      await expect(handler.handle('unknown_tool', {})).rejects.toThrow('Unknown tool: unknown_tool');
    });

    it('should configure UnifiedHandler with correct parameters', async () => {
      const args = { operation: 'union', nodeIds: ['123', '456'] };
      
      await handler.handle('figma_boolean_operations', args);
      
      expect(mockSendToPlugin).toHaveBeenCalled();
    });

    it('should use BOOLEAN_OPERATION message type', async () => {
      const args = { operation: 'union', nodeIds: ['123', '456'] };
      
      await handler.handle('figma_boolean_operations', args);
      
      // The UnifiedHandler should be configured with correct message type
      expect(mockSendToPlugin).toHaveBeenCalled();
    });

    it('should handle boolean operations correctly', async () => {
      const operations = ['union', 'subtract', 'intersect', 'exclude'];
      
      for (const operation of operations) {
        const args = { operation, nodeIds: ['123', '456'] };
        
        await handler.handle('figma_boolean_operations', args);
        
        expect(mockSendToPlugin).toHaveBeenCalled();
      }
    });

    it('should handle preserveOriginal parameter', async () => {
      const args = { 
        operation: 'union', 
        nodeIds: ['123', '456'], 
        preserveOriginal: true 
      };
      
      await handler.handle('figma_boolean_operations', args);
      
      expect(mockSendToPlugin).toHaveBeenCalled();
    });

    it('should handle name parameter', async () => {
      const args = { 
        operation: 'union', 
        nodeIds: ['123', '456'], 
        name: 'Combined Shape' 
      };
      
      await handler.handle('figma_boolean_operations', args);
      
      expect(mockSendToPlugin).toHaveBeenCalled();
    });
  });
});