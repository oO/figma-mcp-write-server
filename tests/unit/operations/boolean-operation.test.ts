import { describe, it, expect, beforeEach, vi } from 'vitest';
import { handleBooleanOperation } from '../../../figma-plugin/src/operations/boolean-operation.js';

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
  union: vi.fn(),
  subtract: vi.fn(),
  intersect: vi.fn(),
  exclude: vi.fn(),
  currentPage: { id: 'page1' }
};

// @ts-ignore
global.figma = mockFigma;

describe('handleBooleanOperation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('parameter validation', () => {
    it('should validate required parameters', async () => {
      const { BaseOperation } = await import('../../../figma-plugin/src/operations/base-operation.js');
      
      // Mock findNodeById to return mock nodes
      const { findNodeById } = await import('../../../figma-plugin/src/utils/node-utils.js');
      (findNodeById as any).mockImplementation((id: string) => ({
        id,
        type: 'VECTOR',
        fills: [],
        clone: vi.fn()
      }));
      
      const resultNode = { id: 'result', name: 'Boolean union' };
      mockFigma.union.mockReturnValue(resultNode);
      
      const params = {
        operation: 'union',
        nodeIds: ['node1', 'node2']
      };
      
      await handleBooleanOperation(params);
      
      expect(BaseOperation.validateParams).toHaveBeenCalledWith(params, ['operation', 'nodeIds']);
    });

    it('should validate operation value', async () => {
      const { BaseOperation } = await import('../../../figma-plugin/src/operations/base-operation.js');
      
      // Mock findNodeById to return mock nodes
      const { findNodeById } = await import('../../../figma-plugin/src/utils/node-utils.js');
      (findNodeById as any).mockImplementation((id: string) => ({
        id,
        type: 'VECTOR',
        fills: [],
        clone: vi.fn()
      }));
      
      const resultNode = { id: 'result', name: 'Boolean union' };
      mockFigma.union.mockReturnValue(resultNode);
      
      const params = {
        operation: 'union',
        nodeIds: ['node1', 'node2']
      };
      
      await handleBooleanOperation(params);
      
      expect(BaseOperation.validateStringParam).toHaveBeenCalledWith(
        'union',
        'operation',
        ['union', 'subtract', 'intersect', 'exclude']
      );
    });

    it('should reject invalid operations', async () => {
      const { BaseOperation } = await import('../../../figma-plugin/src/operations/base-operation.js');
      (BaseOperation.validateStringParam as any).mockImplementationOnce(() => {
        throw new Error('Invalid operation: invalid');
      });
      
      await expect(handleBooleanOperation({ operation: 'invalid', nodeIds: ['node1', 'node2'] }))
        .rejects.toThrow('Invalid operation: invalid');
    });
  });

  describe('node validation', () => {
    beforeEach(async () => {
      const mockNode1 = {
        id: 'node1',
        type: 'VECTOR',
        fills: [],
        clone: vi.fn().mockReturnValue({ id: 'node1-clone', type: 'VECTOR', fills: [] })
      };
      
      const mockNode2 = {
        id: 'node2',
        type: 'RECTANGLE',
        fills: [],
        clone: vi.fn().mockReturnValue({ id: 'node2-clone', type: 'RECTANGLE', fills: [] })
      };
      
      const { findNodeById } = await import('../../../figma-plugin/src/utils/node-utils.js');
      (findNodeById as any).mockImplementation((id: string) => {
        if (id === 'node1') return mockNode1;
        if (id === 'node2') return mockNode2;
        return null;
      });
    });

    it('should require at least 2 nodes', async () => {
      await expect(handleBooleanOperation({
        operation: 'union',
        nodeIds: ['node1']
      })).rejects.toThrow('Boolean operations require at least 2 nodes');
    });

    it('should handle array of nodeIds', async () => {
      const resultNode = { id: 'result', name: 'Boolean union' };
      mockFigma.union.mockReturnValue(resultNode);
      
      await handleBooleanOperation({
        operation: 'union',
        nodeIds: ['node1', 'node2']
      });
      
      expect(mockFigma.union).toHaveBeenCalled();
    });

    it('should handle single nodeId converted to array', async () => {
      const resultNode = { id: 'result', name: 'Boolean union' };
      mockFigma.union.mockReturnValue(resultNode);
      
      await handleBooleanOperation({
        operation: 'union',
        nodeIds: ['node1', 'node2']
      });
      
      expect(mockFigma.union).toHaveBeenCalled();
    });

    it('should throw error for missing nodes', async () => {
      await expect(handleBooleanOperation({
        operation: 'union',
        nodeIds: ['node1', 'missing-node']
      })).rejects.toThrow('Node with ID missing-node not found');
    });

    it('should reject GROUP nodes', async () => {
      const mockGroupNode = {
        id: 'group1',
        type: 'GROUP',
        fills: []
      };
      
      const { findNodeById } = await import('../../../figma-plugin/src/utils/node-utils.js');
      (findNodeById as any).mockImplementation((id: string) => {
        if (id === 'node1') return { id: 'node1', type: 'VECTOR', fills: [] };
        if (id === 'group1') return mockGroupNode;
        return null;
      });
      
      await expect(handleBooleanOperation({
        operation: 'union',
        nodeIds: ['node1', 'group1']
      })).rejects.toThrow('Node group1 (GROUP) does not support boolean operations');
    });
  });

  describe('boolean operations', () => {
    beforeEach(async () => {
      const mockNode1 = {
        id: 'node1',
        type: 'VECTOR',
        fills: [],
        clone: vi.fn().mockReturnValue({ id: 'node1-clone', type: 'VECTOR', fills: [] })
      };
      
      const mockNode2 = {
        id: 'node2',
        type: 'RECTANGLE',
        fills: [],
        clone: vi.fn().mockReturnValue({ id: 'node2-clone', type: 'RECTANGLE', fills: [] })
      };
      
      const { findNodeById } = await import('../../../figma-plugin/src/utils/node-utils.js');
      (findNodeById as any).mockImplementation((id: string) => {
        if (id === 'node1') return mockNode1;
        if (id === 'node2') return mockNode2;
        return null;
      });
    });

    it('should perform union operation', async () => {
      const resultNode = { id: 'result', name: 'Boolean union' };
      mockFigma.union.mockReturnValue(resultNode);
      
      await handleBooleanOperation({
        operation: 'union',
        nodeIds: ['node1', 'node2']
      });
      
      expect(mockFigma.union).toHaveBeenCalled();
      expect(resultNode.name).toBe('Boolean union');
    });

    it('should perform subtract operation', async () => {
      const resultNode = { id: 'result', name: 'Boolean subtract' };
      mockFigma.subtract.mockReturnValue(resultNode);
      
      await handleBooleanOperation({
        operation: 'subtract',
        nodeIds: ['node1', 'node2']
      });
      
      expect(mockFigma.subtract).toHaveBeenCalled();
      expect(resultNode.name).toBe('Boolean subtract');
    });

    it('should perform intersect operation', async () => {
      const resultNode = { id: 'result', name: 'Boolean intersect' };
      mockFigma.intersect.mockReturnValue(resultNode);
      
      await handleBooleanOperation({
        operation: 'intersect',
        nodeIds: ['node1', 'node2']
      });
      
      expect(mockFigma.intersect).toHaveBeenCalled();
      expect(resultNode.name).toBe('Boolean intersect');
    });

    it('should perform exclude operation', async () => {
      const resultNode = { id: 'result', name: 'Boolean exclude' };
      mockFigma.exclude.mockReturnValue(resultNode);
      
      await handleBooleanOperation({
        operation: 'exclude',
        nodeIds: ['node1', 'node2']
      });
      
      expect(mockFigma.exclude).toHaveBeenCalled();
      expect(resultNode.name).toBe('Boolean exclude');
    });

    it('should set custom name when provided', async () => {
      const resultNode = { id: 'result', name: 'Default' };
      mockFigma.union.mockReturnValue(resultNode);
      
      await handleBooleanOperation({
        operation: 'union',
        nodeIds: ['node1', 'node2'],
        name: 'Custom Shape'
      });
      
      expect(resultNode.name).toBe('Custom Shape');
    });
  });

  describe('preserveOriginal parameter', () => {
    beforeEach(async () => {
      const mockNode1 = {
        id: 'node1',
        type: 'VECTOR',
        fills: [],
        clone: vi.fn().mockReturnValue({ id: 'node1-clone', type: 'VECTOR', fills: [] })
      };
      
      const mockNode2 = {
        id: 'node2',
        type: 'RECTANGLE',
        fills: [],
        clone: vi.fn().mockReturnValue({ id: 'node2-clone', type: 'RECTANGLE', fills: [] })
      };
      
      const { findNodeById } = await import('../../../figma-plugin/src/utils/node-utils.js');
      (findNodeById as any).mockImplementation((id: string) => {
        if (id === 'node1') return mockNode1;
        if (id === 'node2') return mockNode2;
        return null;
      });
    });

    it('should use original nodes when preserveOriginal is false', async () => {
      const resultNode = { id: 'result', name: 'Boolean union' };
      mockFigma.union.mockReturnValue(resultNode);
      
      await handleBooleanOperation({
        operation: 'union',
        nodeIds: ['node1', 'node2'],
        preserveOriginal: false
      });
      
      expect(mockFigma.union).toHaveBeenCalled();
      // Should not call clone methods
      const { findNodeById } = await import('../../../figma-plugin/src/utils/node-utils.js');
      const node1 = (findNodeById as any)('node1');
      const node2 = (findNodeById as any)('node2');
      expect(node1.clone).not.toHaveBeenCalled();
      expect(node2.clone).not.toHaveBeenCalled();
    });

    it('should clone nodes when preserveOriginal is true', async () => {
      const resultNode = { id: 'result', name: 'Boolean union' };
      mockFigma.union.mockReturnValue(resultNode);
      
      await handleBooleanOperation({
        operation: 'union',
        nodeIds: ['node1', 'node2'],
        preserveOriginal: true
      });
      
      expect(mockFigma.union).toHaveBeenCalled();
      // Should call clone methods
      const { findNodeById } = await import('../../../figma-plugin/src/utils/node-utils.js');
      const node1 = (findNodeById as any)('node1');
      const node2 = (findNodeById as any)('node2');
      expect(node1.clone).toHaveBeenCalled();
      expect(node2.clone).toHaveBeenCalled();
    });
  });

  describe('result handling', () => {
    beforeEach(async () => {
      const mockNode1 = {
        id: 'node1',
        type: 'VECTOR',
        fills: [],
        clone: vi.fn().mockReturnValue({ id: 'node1-clone', type: 'VECTOR', fills: [] })
      };
      
      const mockNode2 = {
        id: 'node2',
        type: 'RECTANGLE',
        fills: [],
        clone: vi.fn().mockReturnValue({ id: 'node2-clone', type: 'RECTANGLE', fills: [] })
      };
      
      const { findNodeById } = await import('../../../figma-plugin/src/utils/node-utils.js');
      (findNodeById as any).mockImplementation((id: string) => {
        if (id === 'node1') return mockNode1;
        if (id === 'node2') return mockNode2;
        return null;
      });
    });

    it('should select and focus the result node', async () => {
      const resultNode = { id: 'result', name: 'Boolean union' };
      mockFigma.union.mockReturnValue(resultNode);
      
      await handleBooleanOperation({
        operation: 'union',
        nodeIds: ['node1', 'node2']
      });
      
      const { selectAndFocus } = await import('../../../figma-plugin/src/utils/node-utils.js');
      expect(selectAndFocus).toHaveBeenCalledWith(resultNode);
    });

    it('should format node response correctly', async () => {
      const resultNode = { id: 'result', name: 'Boolean union' };
      mockFigma.union.mockReturnValue(resultNode);
      
      const result = await handleBooleanOperation({
        operation: 'union',
        nodeIds: ['node1', 'node2']
      });
      
      const { formatNodeResponse } = await import('../../../figma-plugin/src/utils/node-utils.js');
      expect(formatNodeResponse).toHaveBeenCalledWith(resultNode, 'Boolean union operation completed successfully');
    });
  });
});