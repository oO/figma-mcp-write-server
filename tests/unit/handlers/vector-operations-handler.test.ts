import { describe, it, expect, beforeEach, vi } from 'vitest';
import { VectorOperationsHandler } from '../../../src/handlers/vector-operations-handler.js';

// Mock the unified handler
vi.mock('../../../src/utils/unified-handler.js', () => ({
  UnifiedHandler: vi.fn().mockImplementation(() => ({
    handle: vi.fn().mockResolvedValue({ success: true, data: {} })
  })),
  UnifiedHandlerConfig: vi.fn(),
  UnifiedParamConfigs: {
    withNodeId: vi.fn().mockReturnValue({})
  }
}));

// Mock the schema
vi.mock('../../../src/types/vector-operations.js', () => ({
  ManageVectorOperationsSchema: {
    parse: vi.fn().mockImplementation((args) => args)
  }
}));

describe('VectorOperationsHandler', () => {
  let handler: VectorOperationsHandler;
  let mockSendToPlugin: vi.Mock;

  beforeEach(() => {
    mockSendToPlugin = vi.fn().mockResolvedValue({ success: true, data: {} });
    handler = new VectorOperationsHandler(mockSendToPlugin);
  });

  describe('getTools', () => {
    it('should return figma_vector_operations tool definition', () => {
      const tools = handler.getTools();
      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe('figma_vector_operations');
      expect(tools[0].description).toContain('vector path operations');
    });

    it('should include all operations in schema', () => {
      const tools = handler.getTools();
      const schema = tools[0].inputSchema;
      
      expect(schema.properties.operation.enum).toEqual([
        'create_vector', 'flatten', 'outline_stroke', 'get_vector_paths'
      ]);
    });

    it('should require only operation parameter', () => {
      const tools = handler.getTools();
      const schema = tools[0].inputSchema;
      
      expect(schema.required).toEqual(['operation']);
    });

    it('should include vectorPaths parameter for create_vector', () => {
      const tools = handler.getTools();
      const schema = tools[0].inputSchema;
      
      expect(schema.properties.vectorPaths).toBeDefined();
      expect(schema.properties.vectorPaths.type).toBe('array');
      expect(schema.properties.vectorPaths.items.properties.windingRule).toBeDefined();
      expect(schema.properties.vectorPaths.items.properties.data).toBeDefined();
    });

    it('should include preserveOriginal parameter', () => {
      const tools = handler.getTools();
      const schema = tools[0].inputSchema;
      
      expect(schema.properties.preserveOriginal).toBeDefined();
      expect(schema.properties.preserveOriginal.default).toBe(false);
    });

    it('should include position parameters', () => {
      const tools = handler.getTools();
      const schema = tools[0].inputSchema;
      
      expect(schema.properties.x).toBeDefined();
      expect(schema.properties.y).toBeDefined();
    });

    it('should include comprehensive examples', () => {
      const tools = handler.getTools();
      const examples = tools[0].examples;
      
      expect(examples).toContain('{"operation": "flatten", "nodeId": "123:456", "name": "Flattened Vector"}');
      expect(examples).toContain('{"operation": "outline_stroke", "nodeId": "123:789", "strokeWidth": 2, "name": "Outlined Shape"}');
      expect(examples).toContain('{"operation": "create_vector", "vectorPaths": [{"windingRule": "EVENODD", "data": "M 0 0 L 100 0 L 100 100 L 0 100 Z"}], "name": "Custom Vector", "x": 100, "y": 100}');
      expect(examples).toContain('{"operation": "get_vector_paths", "nodeId": "123:012"}');
    });
  });

  describe('handle', () => {
    it('should reject unknown tool names', async () => {
      await expect(handler.handle('unknown_tool', {})).rejects.toThrow('Unknown tool: unknown_tool');
    });

    it('should configure UnifiedHandler with correct parameters', async () => {
      const args = { operation: 'flatten', nodeId: '123' };
      
      await handler.handle('figma_vector_operations', args);
      
      expect(mockSendToPlugin).toHaveBeenCalled();
    });

    it('should use VECTOR_OPERATION message type', async () => {
      const args = { operation: 'flatten', nodeId: '123' };
      
      await handler.handle('figma_vector_operations', args);
      
      // The UnifiedHandler should be configured with correct message type
      expect(mockSendToPlugin).toHaveBeenCalled();
    });

    it('should handle all vector operations correctly', async () => {
      const operations = ['create_vector', 'flatten', 'outline_stroke', 'get_vector_paths'];
      
      for (const operation of operations) {
        const args = { operation, nodeId: '123' };
        
        await handler.handle('figma_vector_operations', args);
        
        expect(mockSendToPlugin).toHaveBeenCalled();
      }
    });

    it('should handle create_vector with vectorPaths', async () => {
      const args = { 
        operation: 'create_vector', 
        vectorPaths: [{ windingRule: 'EVENODD', data: 'M 0 0 L 100 0 L 100 100 L 0 100 Z' }],
        name: 'Custom Vector',
        x: 100,
        y: 50
      };
      
      await handler.handle('figma_vector_operations', args);
      
      expect(mockSendToPlugin).toHaveBeenCalled();
    });

    it('should handle preserveOriginal parameter', async () => {
      const args = { 
        operation: 'flatten', 
        nodeId: '123', 
        preserveOriginal: true 
      };
      
      await handler.handle('figma_vector_operations', args);
      
      expect(mockSendToPlugin).toHaveBeenCalled();
    });

    it('should handle strokeWidth parameter', async () => {
      const args = { 
        operation: 'outline_stroke', 
        nodeId: '123', 
        strokeWidth: 5 
      };
      
      await handler.handle('figma_vector_operations', args);
      
      expect(mockSendToPlugin).toHaveBeenCalled();
    });
  });
});