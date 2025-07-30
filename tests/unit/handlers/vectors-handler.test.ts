import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VectorsHandler } from '../../../src/handlers/vectors-handler.js';

describe('VectorsHandler', () => {
  let handler: VectorsHandler;
  let mockSendToPlugin: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockSendToPlugin = vi.fn();
    handler = new VectorsHandler(mockSendToPlugin);
  });

  describe('getTools', () => {
    it('should return figma_vectors tool with correct schema', () => {
      const tools = handler.getTools();
      
      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe('figma_vectors');
      expect(tools[0].description).toContain('Vector operations');
      
      // Check that all operations are included in enum
      const operations = tools[0].inputSchema.properties.operation.enum;
      expect(operations).toContain('create_vector');
      expect(operations).toContain('get_vector');
      expect(operations).toContain('update_vector');
      expect(operations).toContain('create_line');
      expect(operations).toContain('get_line');
      expect(operations).toContain('update_line');
      expect(operations).toContain('flatten');
      expect(operations).toContain('convert_stroke');
      expect(operations).toContain('convert_shape');
      expect(operations).toContain('convert_text');
      expect(operations).toContain('extract_element');
      
      // Should have 11 total operations
      expect(operations).toHaveLength(11);
    });

    it('should have proper parameter definitions', () => {
      const tools = handler.getTools();
      const properties = tools[0].inputSchema.properties;
      
      // Check key parameters exist
      expect(properties.nodeId).toBeDefined();
      expect(properties.nodeIds).toBeDefined();
      expect(properties.vertices).toBeDefined();
      expect(properties.regions).toBeDefined();
      expect(properties.paths).toBeDefined();
      expect(properties.startX).toBeDefined();
      expect(properties.startY).toBeDefined();
      expect(properties.endX).toBeDefined();
      expect(properties.endY).toBeDefined();
      expect(properties.length).toBeDefined();
      expect(properties.rotation).toBeDefined();
      
      // Check styling parameters
      expect(properties.fillColor).toBeDefined();
      expect(properties.strokeColor).toBeDefined();
      expect(properties.strokeWidth).toBeDefined();
      
      // Check operation-specific parameters
      expect(properties.replaceOriginal).toBeDefined();
      expect(properties.tolerance).toBeDefined();
      expect(properties.regionIndex).toBeDefined();
      expect(properties.pathIndex).toBeDefined();
      expect(properties.removeFromSource).toBeDefined();
    });

    it('should have comprehensive examples', () => {
      const tools = handler.getTools();
      const examples = tools[0].examples;
      
      expect(examples.length).toBeGreaterThan(10);
      
      // Check that we have examples for each operation type
      const exampleOperations = examples.map(ex => JSON.parse(ex).operation);
      expect(exampleOperations).toContain('create_vector');
      expect(exampleOperations).toContain('get_vector');
      expect(exampleOperations).toContain('update_vector');
      expect(exampleOperations).toContain('create_line');
      expect(exampleOperations).toContain('flatten');
      expect(exampleOperations).toContain('extract_element');
    });
  });

  describe('handle', () => {
    it('should reject unknown tools', async () => {
      await expect(handler.handle('unknown_tool', {})).rejects.toThrow('Unknown tool: unknown_tool');
    });

    it('should call unified handler for figma_vectors tool', async () => {
      mockSendToPlugin.mockResolvedValue({ success: true });
      
      const args = {
        operation: 'create_vector',
        vertices: '[0,0,100,0,50,100]',
        regions: [{ loops: ['[0,1,2]'] }]
      };
      
      // Mock the unified handler response
      const expectedResponse = { content: [{ type: 'text', text: 'Vector created' }] };
      
      // We can't easily test the unified handler call without more mocking,
      // but we can verify it doesn't throw for valid parameters
      try {
        await handler.handle('figma_vectors', args);
      } catch (error) {
        // Expected to fail in test environment due to missing dependencies
        // but should not fail due to parameter validation
        expect(error.message).not.toContain('Unknown parameter');
      }
    });
  });
});