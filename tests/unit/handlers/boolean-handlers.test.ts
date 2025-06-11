import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { BooleanHandlers } from '../../../src/handlers/boolean-handlers.js';

describe('BooleanHandlers', () => {
  let booleanHandlers: BooleanHandlers;
  let mockSendToPlugin: jest.Mock;

  beforeEach(() => {
    mockSendToPlugin = jest.fn();
    booleanHandlers = new BooleanHandlers(mockSendToPlugin);
  });

  describe('getTools', () => {
    test('should return boolean and vector operation tools', () => {
      const tools = booleanHandlers.getTools();
      
      expect(tools).toHaveLength(2);
      expect(tools[0].name).toBe('manage_boolean_operations');
      expect(tools[1].name).toBe('manage_vector_operations');
    });

    test('should include required properties in boolean operations tool', () => {
      const tools = booleanHandlers.getTools();
      const booleanTool = tools[0];
      
      expect(booleanTool.description).toContain('boolean operations');
      expect(booleanTool.inputSchema.properties.operation.enum).toEqual([
        'union', 'subtract', 'intersect', 'exclude'
      ]);
      expect(booleanTool.inputSchema.properties.nodeIds.minItems).toBe(2);
      expect(booleanTool.inputSchema.required).toEqual(['operation', 'nodeIds']);
    });

    test('should include required properties in vector operations tool', () => {
      const tools = booleanHandlers.getTools();
      const vectorTool = tools[1];
      
      expect(vectorTool.description).toContain('vector nodes');
      expect(vectorTool.inputSchema.properties.operation.enum).toEqual([
        'create_vector', 'flatten', 'outline_stroke', 'get_vector_paths'
      ]);
      expect(vectorTool.inputSchema.required).toEqual(['operation']);
    });
  });

  describe('manage_boolean_operations', () => {
    test('should perform union operation successfully', async () => {
      const mockResponse = {
        success: true,
        data: {
          nodeId: 'union-result-123',
          processedNodes: ['node-1', 'node-2'],
          operation: 'union'
        }
      };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      const result = await booleanHandlers.handle('manage_boolean_operations', {
        operation: 'union',
        nodeIds: ['node-1', 'node-2'],
        name: 'Union Shape'
      });

      expect(result.isError).toBe(false);
      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'BOOLEAN_OPERATION',
        payload: {
          operation: 'union',
          nodeIds: ['node-1', 'node-2'],
          name: 'Union Shape',
          preserveOriginal: false
        }
      });

      const yamlContent = result.content[0].text;
      expect(yamlContent).toContain('operation: boolean_operation');
      expect(yamlContent).toContain('booleanType: union');
      expect(yamlContent).toContain('resultNodeId: union-result-123');
    });

    test('should perform subtract operation successfully', async () => {
      const mockResponse = {
        success: true,
        data: {
          nodeId: 'subtract-result-456',
          processedNodes: ['node-1', 'node-2', 'node-3'],
          operation: 'subtract'
        }
      };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      const result = await booleanHandlers.handle('manage_boolean_operations', {
        operation: 'subtract',
        nodeIds: ['node-1', 'node-2', 'node-3'],
        preserveOriginal: true
      });

      expect(result.isError).toBe(false);
      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'BOOLEAN_OPERATION',
        payload: {
          operation: 'subtract',
          nodeIds: ['node-1', 'node-2', 'node-3'],
          preserveOriginal: true
        }
      });

      const yamlContent = result.content[0].text;
      expect(yamlContent).toContain('booleanType: subtract');
      expect(yamlContent).toContain('preservedOriginals: true');
    });

    test('should handle intersect and exclude operations', async () => {
      const operations = ['intersect', 'exclude'];
      
      for (const operation of operations) {
        const mockResponse = {
          success: true,
          data: {
            nodeId: `${operation}-result-789`,
            processedNodes: ['node-1', 'node-2'],
            operation: operation
          }
        };
        mockSendToPlugin.mockResolvedValue(mockResponse);

        const result = await booleanHandlers.handle('manage_boolean_operations', {
          operation: operation,
          nodeIds: ['node-1', 'node-2']
        });

        expect(result.isError).toBe(false);
        const yamlContent = result.content[0].text;
        expect(yamlContent).toContain(`booleanType: ${operation}`);
      }
    });

    test('should validate minimum number of nodes', async () => {
      await expect(booleanHandlers.handle('manage_boolean_operations', {
        operation: 'union',
        nodeIds: ['single-node']
      })).rejects.toThrow('Validation failed');
    });

    test('should validate operation type', async () => {
      await expect(booleanHandlers.handle('manage_boolean_operations', {
        operation: 'invalid_operation',
        nodeIds: ['node-1', 'node-2']
      })).rejects.toThrow('Validation failed');
    });

    test('should handle plugin errors', async () => {
      mockSendToPlugin.mockResolvedValue({
        success: false,
        error: 'Boolean operation failed: Invalid nodes'
      });

      await expect(booleanHandlers.handle('manage_boolean_operations', {
        operation: 'union',
        nodeIds: ['invalid-node-1', 'invalid-node-2']
      })).rejects.toThrow('Boolean operation failed: Invalid nodes');
    });
  });

  describe('manage_vector_operations', () => {
    test('should create vector successfully', async () => {
      const mockResponse = {
        success: true,
        data: {
          nodeId: 'vector-123',
          operation: 'create_vector',
          name: 'Custom Vector',
          x: 100,
          y: 50
        }
      };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      const result = await booleanHandlers.handle('manage_vector_operations', {
        operation: 'create_vector',
        name: 'Custom Vector',
        x: 100,
        y: 50,
        vectorPaths: [
          { windingRule: 'EVENODD', data: 'M 0 0 L 100 0 L 100 100 L 0 100 Z' }
        ]
      });

      expect(result.isError).toBe(false);
      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'VECTOR_OPERATION',
        payload: {
          operation: 'create_vector',
          name: 'Custom Vector',
          x: 100,
          y: 50,
          vectorPaths: [
            { windingRule: 'EVENODD', data: 'M 0 0 L 100 0 L 100 100 L 0 100 Z' }
          ]
        }
      });

      const yamlContent = result.content[0].text;
      expect(yamlContent).toContain('operation: vector_operation');
      expect(yamlContent).toContain('vectorType: create_vector');
    });

    test('should flatten nodes successfully', async () => {
      const mockResponse = {
        success: true,
        data: {
          nodeId: 'flattened-456',
          operation: 'flatten',
          name: 'Flattened Shape'
        }
      };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      const result = await booleanHandlers.handle('manage_vector_operations', {
        operation: 'flatten',
        nodeId: 'complex-node-123'
      });

      expect(result.isError).toBe(false);
      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'VECTOR_OPERATION',
        payload: {
          operation: 'flatten',
          nodeId: 'complex-node-123'
        }
      });

      const yamlContent = result.content[0].text;
      expect(yamlContent).toContain('vectorType: flatten');
    });

    test('should outline stroke successfully', async () => {
      const mockResponse = {
        success: true,
        data: {
          nodeId: 'outlined-789',
          operation: 'outline_stroke',
          name: 'Outlined Shape'
        }
      };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      const result = await booleanHandlers.handle('manage_vector_operations', {
        operation: 'outline_stroke',
        nodeId: 'stroked-node-456',
        strokeWidth: 4
      });

      expect(result.isError).toBe(false);
      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'VECTOR_OPERATION',
        payload: {
          operation: 'outline_stroke',
          nodeId: 'stroked-node-456',
          strokeWidth: 4
        }
      });

      const yamlContent = result.content[0].text;
      expect(yamlContent).toContain('vectorType: outline_stroke');
    });

    test('should get vector paths successfully', async () => {
      const mockResponse = {
        success: true,
        data: {
          nodeId: 'vector-node-123',
          vectorPaths: [
            { windingRule: 'EVENODD', data: 'M 0 0 L 100 0 L 100 100 L 0 100 Z' },
            { windingRule: 'NONZERO', data: 'M 20 20 L 80 20 L 80 80 L 20 80 Z' }
          ],
          operation: 'get_vector_paths',
          name: 'Complex Vector'
        }
      };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      const result = await booleanHandlers.handle('manage_vector_operations', {
        operation: 'get_vector_paths',
        nodeId: 'vector-node-123'
      });

      expect(result.isError).toBe(false);
      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'VECTOR_OPERATION',
        payload: {
          operation: 'get_vector_paths',
          nodeId: 'vector-node-123'
        }
      });

      const yamlContent = result.content[0].text;
      expect(yamlContent).toContain('vectorType: get_vector_paths');
      expect(yamlContent).toContain('vectorPaths');
    });

    test('should validate operation type', async () => {
      await expect(booleanHandlers.handle('manage_vector_operations', {
        operation: 'invalid_vector_operation'
      })).rejects.toThrow('Validation failed');
    });

    test('should handle plugin errors for vector operations', async () => {
      mockSendToPlugin.mockResolvedValue({
        success: false,
        error: 'Vector operation failed: Node not found'
      });

      await expect(booleanHandlers.handle('manage_vector_operations', {
        operation: 'flatten',
        nodeId: 'non-existent-node'
      })).rejects.toThrow('Vector operation failed: Node not found');
    });
  });

  describe('handle', () => {
    test('should throw error for unknown tool', async () => {
      await expect(booleanHandlers.handle('unknown_tool', {}))
        .rejects.toThrow('Unknown tool: unknown_tool');
    });
  });

  describe('edge cases and validation', () => {
    test('should handle empty nodeIds array for boolean operations', async () => {
      await expect(booleanHandlers.handle('manage_boolean_operations', {
        operation: 'union',
        nodeIds: []
      })).rejects.toThrow('Validation failed');
    });

    test('should handle missing required operation parameter', async () => {
      await expect(booleanHandlers.handle('manage_boolean_operations', {
        nodeIds: ['node-1', 'node-2']
      })).rejects.toThrow('Validation failed');

      await expect(booleanHandlers.handle('manage_vector_operations', {
        nodeId: 'some-node'
      })).rejects.toThrow('Validation failed');
    });

    test('should set default preserveOriginal value', async () => {
      const mockResponse = {
        success: true,
        data: { nodeId: 'result-123', processedNodes: ['node-1', 'node-2'] }
      };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      await booleanHandlers.handle('manage_boolean_operations', {
        operation: 'union',
        nodeIds: ['node-1', 'node-2']
      });

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'BOOLEAN_OPERATION',
        payload: {
          operation: 'union',
          nodeIds: ['node-1', 'node-2'],
          preserveOriginal: false
        }
      });
    });

    test('should validate stroke width for vector operations', async () => {
      const mockResponse = {
        success: true,
        data: { nodeId: 'outlined-123', operation: 'outline_stroke' }
      };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      // Negative stroke width should fail validation
      await expect(booleanHandlers.handle('manage_vector_operations', {
        operation: 'outline_stroke',
        nodeId: 'some-node',
        strokeWidth: -5
      })).rejects.toThrow('Validation failed');
    });
  });
});