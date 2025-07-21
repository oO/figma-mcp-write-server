import { describe, it, expect, beforeEach, vi } from 'vitest';
import { handleVectorOperation } from '../../../figma-plugin/src/operations/vector-operation.js';

// Mock BaseOperation
vi.mock('../../../figma-plugin/src/operations/base-operation.js', () => ({
  BaseOperation: {
    executeOperation: vi.fn().mockImplementation((name, params, fn) => fn()),
    validateParams: vi.fn(),
    validateStringParam: vi.fn().mockImplementation((value, name, validValues) => {
      if (!validValues.includes(value)) {
        throw new Error(`Invalid ${name}: ${value}`);
      }
      return value;
    })
  }
}));

// Mock node utilities
vi.mock('../../../figma-plugin/src/utils/node-utils.js', () => ({
  findNodeById: vi.fn(),
  formatNodeResponse: vi.fn().mockImplementation((node, message) => ({
    success: true,
    data: { nodeId: node.id, message }
  })),
  selectAndFocus: vi.fn()
}));

// Mock Figma API
const mockFigma = {
  flatten: vi.fn(),
  createVector: vi.fn(),
  currentPage: {
    appendChild: vi.fn()
  }
};

// @ts-ignore
global.figma = mockFigma;

describe('handleVectorOperation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('parameter validation', () => {
    it('should validate operation parameter', async () => {
      const { BaseOperation } = await import('../../../figma-plugin/src/operations/base-operation.js');
      
      const mockNode = {
        id: 'vector1',
        name: 'Vector Node',
        vectorPaths: [{ windingRule: 'NONZERO', data: 'M 0 0 L 100 0 L 100 100 L 0 100 Z' }],
        clone: vi.fn()
      };
      
      const { findNodeById } = await import('../../../figma-plugin/src/utils/node-utils.js');
      (findNodeById as any).mockReturnValue(mockNode);
      
      mockFigma.flatten.mockReturnValue(mockNode);
      
      await handleVectorOperation({
        operation: 'flatten',
        nodeId: 'vector1'
      });
      
      expect(BaseOperation.validateStringParam).toHaveBeenCalledWith(
        'flatten',
        'operation',
        ['flatten', 'outline_stroke', 'create_vector', 'get_vector_paths']
      );
    });

    it('should reject invalid operations', async () => {
      const { BaseOperation } = await import('../../../figma-plugin/src/operations/base-operation.js');
      (BaseOperation.validateStringParam as any).mockImplementationOnce(() => {
        throw new Error('Invalid operation: invalid');
      });
      
      await expect(handleVectorOperation({ operation: 'invalid' }))
        .rejects.toThrow('Invalid operation: invalid');
    });
  });

  describe('flatten operation', () => {
    it('should flatten vector node', async () => {
      const mockNode = {
        id: 'vector1',
        name: 'Vector Node',
        vectorPaths: [{ windingRule: 'NONZERO', data: 'M 0 0 L 100 0 L 100 100 L 0 100 Z' }],
        clone: vi.fn()
      };
      
      const mockFlattened = {
        id: 'flattened1',
        name: 'Vector Node Flattened'
      };
      
      const { findNodeById } = await import('../../../figma-plugin/src/utils/node-utils.js');
      (findNodeById as any).mockReturnValue(mockNode);
      
      mockFigma.flatten.mockReturnValue(mockFlattened);
      
      const result = await handleVectorOperation({
        operation: 'flatten',
        nodeId: 'vector1'
      });
      
      expect(mockFigma.flatten).toHaveBeenCalledWith([mockNode], mockFigma.currentPage);
      expect(mockFlattened.name).toBe('Vector Node Flattened');
    });

    it('should handle custom name', async () => {
      const mockNode = {
        id: 'vector1',
        name: 'Vector Node',
        vectorPaths: [{ windingRule: 'NONZERO', data: 'M 0 0 L 100 0 L 100 100 L 0 100 Z' }],
        clone: vi.fn()
      };
      
      const mockFlattened = {
        id: 'flattened1',
        name: 'Custom Name'
      };
      
      const { findNodeById } = await import('../../../figma-plugin/src/utils/node-utils.js');
      (findNodeById as any).mockReturnValue(mockNode);
      
      mockFigma.flatten.mockReturnValue(mockFlattened);
      
      await handleVectorOperation({
        operation: 'flatten',
        nodeId: 'vector1',
        name: 'Custom Name'
      });
      
      expect(mockFlattened.name).toBe('Custom Name');
    });

    it('should handle preserveOriginal parameter', async () => {
      const mockNode = {
        id: 'vector1',
        name: 'Vector Node',
        vectorPaths: [{ windingRule: 'NONZERO', data: 'M 0 0 L 100 0 L 100 100 L 0 100 Z' }],
        clone: vi.fn().mockReturnValue({ id: 'vector1-clone', name: 'Vector Node' })
      };
      
      const mockFlattened = {
        id: 'flattened1',
        name: 'Vector Node Flattened'
      };
      
      const { findNodeById } = await import('../../../figma-plugin/src/utils/node-utils.js');
      (findNodeById as any).mockReturnValue(mockNode);
      
      mockFigma.flatten.mockReturnValue(mockFlattened);
      
      await handleVectorOperation({
        operation: 'flatten',
        nodeId: 'vector1',
        preserveOriginal: true
      });
      
      expect(mockNode.clone).toHaveBeenCalled();
    });

    it('should throw error for missing node', async () => {
      const { findNodeById } = await import('../../../figma-plugin/src/utils/node-utils.js');
      (findNodeById as any).mockReturnValue(null);
      
      await expect(handleVectorOperation({
        operation: 'flatten',
        nodeId: 'missing'
      })).rejects.toThrow('Node with ID missing not found');
    });

    it('should throw error for non-flattable node', async () => {
      const mockNode = {
        id: 'text1',
        name: 'Text Node'
        // No vectorPaths or fills
      };
      
      const { findNodeById } = await import('../../../figma-plugin/src/utils/node-utils.js');
      (findNodeById as any).mockReturnValue(mockNode);
      
      await expect(handleVectorOperation({
        operation: 'flatten',
        nodeId: 'text1'
      })).rejects.toThrow('Node text1 cannot be flattened');
    });
  });

  describe('outline_stroke operation', () => {
    it('should outline stroke', async () => {
      const mockNode = {
        id: 'vector1',
        name: 'Vector Node',
        strokes: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }],
        clone: vi.fn()
      };
      
      const mockOutlined = {
        id: 'outlined1',
        name: 'Vector Node Outlined'
      };
      
      const { findNodeById } = await import('../../../figma-plugin/src/utils/node-utils.js');
      (findNodeById as any).mockReturnValue(mockNode);
      
      mockFigma.flatten.mockReturnValue(mockOutlined);
      
      const result = await handleVectorOperation({
        operation: 'outline_stroke',
        nodeId: 'vector1'
      });
      
      expect(mockFigma.flatten).toHaveBeenCalledWith([mockNode], mockFigma.currentPage);
      expect(mockOutlined.name).toBe('Vector Node Outlined');
    });

    it('should handle stroke width parameter', async () => {
      const mockNode = {
        id: 'vector1',
        name: 'Vector Node',
        strokes: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }],
        strokeWeight: 1,
        clone: vi.fn()
      };
      
      const mockOutlined = {
        id: 'outlined1',
        name: 'Vector Node Outlined'
      };
      
      const { findNodeById } = await import('../../../figma-plugin/src/utils/node-utils.js');
      (findNodeById as any).mockReturnValue(mockNode);
      
      mockFigma.flatten.mockReturnValue(mockOutlined);
      
      await handleVectorOperation({
        operation: 'outline_stroke',
        nodeId: 'vector1',
        strokeWidth: 5
      });
      
      expect(mockNode.strokeWeight).toBe(5);
    });

    it('should throw error for node without strokes', async () => {
      const mockNode = {
        id: 'vector1',
        name: 'Vector Node',
        strokes: []
      };
      
      const { findNodeById } = await import('../../../figma-plugin/src/utils/node-utils.js');
      (findNodeById as any).mockReturnValue(mockNode);
      
      await expect(handleVectorOperation({
        operation: 'outline_stroke',
        nodeId: 'vector1'
      })).rejects.toThrow('Node vector1 has no strokes to outline');
    });
  });

  describe('create_vector operation', () => {
    it('should create vector with paths', async () => {
      const mockVector = {
        id: 'newvector1',
        name: 'Custom Vector',
        vectorPaths: [],
        x: 0,
        y: 0
      };
      
      mockFigma.createVector.mockReturnValue(mockVector);
      
      const result = await handleVectorOperation({
        operation: 'create_vector',
        vectorPaths: [
          { windingRule: 'EVENODD', data: 'M 0 0 L 100 0 L 100 100 L 0 100 Z' }
        ],
        name: 'Custom Vector',
        x: 100,
        y: 50
      });
      
      expect(mockFigma.createVector).toHaveBeenCalled();
      expect(mockVector.name).toBe('Custom Vector');
      expect(mockVector.x).toBe(100);
      expect(mockVector.y).toBe(50);
      expect(mockVector.vectorPaths).toEqual([
        { windingRule: 'EVENODD', data: 'M 0 0 L 100 0 L 100 100 L 0 100 Z' }
      ]);
      expect(mockFigma.currentPage.appendChild).toHaveBeenCalledWith(mockVector);
    });

    it('should handle default values', async () => {
      const mockVector = {
        id: 'newvector1',
        name: 'Custom Vector',
        vectorPaths: [],
        x: 0,
        y: 0
      };
      
      mockFigma.createVector.mockReturnValue(mockVector);
      
      await handleVectorOperation({
        operation: 'create_vector',
        vectorPaths: [
          { data: 'M 0 0 L 100 0 L 100 100 L 0 100 Z' }
        ]
      });
      
      expect(mockVector.name).toBe('Custom Vector');
      expect(mockVector.vectorPaths).toEqual([
        { windingRule: 'NONZERO', data: 'M 0 0 L 100 0 L 100 100 L 0 100 Z' }
      ]);
    });

    it('should throw error for missing vectorPaths', async () => {
      await expect(handleVectorOperation({
        operation: 'create_vector'
      })).rejects.toThrow('vectorPaths must be an array of path objects');
    });

    it('should throw error for invalid vectorPaths', async () => {
      await expect(handleVectorOperation({
        operation: 'create_vector',
        vectorPaths: 'not an array'
      })).rejects.toThrow('vectorPaths must be an array of path objects');
    });
  });

  describe('get_vector_paths operation', () => {
    it('should get vector paths', async () => {
      const mockVector = {
        id: 'vector1',
        name: 'Vector Node',
        vectorPaths: [
          { windingRule: 'EVENODD', data: 'M 0 0 L 100 0 L 100 100 L 0 100 Z' },
          { windingRule: 'NONZERO', data: 'M 20 20 L 80 20 L 80 80 L 20 80 Z' }
        ]
      };
      
      const { findNodeById } = await import('../../../figma-plugin/src/utils/node-utils.js');
      (findNodeById as any).mockReturnValue(mockVector);
      
      const result = await handleVectorOperation({
        operation: 'get_vector_paths',
        nodeId: 'vector1'
      });
      
      expect(result.nodeId).toBe('vector1');
      expect(result.name).toBe('Vector Node');
      expect(result.vectorPaths).toEqual([
        { windingRule: 'EVENODD', data: 'M 0 0 L 100 0 L 100 100 L 0 100 Z' },
        { windingRule: 'NONZERO', data: 'M 20 20 L 80 20 L 80 80 L 20 80 Z' }
      ]);
      expect(result.pathCount).toBe(2);
    });

    it('should throw error for non-vector node', async () => {
      const mockNode = {
        id: 'text1',
        name: 'Text Node'
        // No vectorPaths
      };
      
      const { findNodeById } = await import('../../../figma-plugin/src/utils/node-utils.js');
      (findNodeById as any).mockReturnValue(mockNode);
      
      await expect(handleVectorOperation({
        operation: 'get_vector_paths',
        nodeId: 'text1'
      })).rejects.toThrow('Node text1 is not a vector node');
    });
  });
});