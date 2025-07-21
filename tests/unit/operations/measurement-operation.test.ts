import { describe, it, expect, beforeEach, vi } from 'vitest';
import { handleMeasurementOperation } from '../../../figma-plugin/src/operations/measurement-operation.js';

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
  }))
}));

// Mock Figma API
const mockFigma = {
  currentPage: {
    id: 'page1',
    name: 'Page 1',
    findAll: vi.fn()
  },
  getNodeById: vi.fn()
};

// @ts-ignore
global.figma = mockFigma;

describe('handleMeasurementOperation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('parameter validation', () => {
    it('should validate required parameters', async () => {
      const { BaseOperation } = await import('../../../figma-plugin/src/operations/base-operation.js');
      
      // Mock nodes
      const mockNode1 = {
        id: 'node1',
        name: 'Node 1',
        x: 100,
        y: 100,
        setPluginData: vi.fn(),
        getPluginData: vi.fn()
      };
      
      const mockNode2 = {
        id: 'node2',
        name: 'Node 2',
        x: 200,
        y: 100,
        setPluginData: vi.fn(),
        getPluginData: vi.fn()
      };
      
      const { findNodeById } = await import('../../../figma-plugin/src/utils/node-utils.js');
      (findNodeById as any).mockImplementation((id: string) => {
        if (id === 'node1') return mockNode1;
        if (id === 'node2') return mockNode2;
        return null;
      });
      
      const params = {
        operation: 'add_measurement',
        fromNodeId: 'node1',
        toNodeId: 'node2',
        direction: 'horizontal'
      };
      
      await handleMeasurementOperation(params);
      
      expect(BaseOperation.validateParams).toHaveBeenCalledWith(params, ['operation']);
    });

    it('should validate operation value', async () => {
      const { BaseOperation } = await import('../../../figma-plugin/src/operations/base-operation.js');
      
      const mockNode1 = {
        id: 'node1',
        name: 'Node 1',
        x: 100,
        y: 100,
        setPluginData: vi.fn(),
        getPluginData: vi.fn()
      };
      
      const mockNode2 = {
        id: 'node2',
        name: 'Node 2',
        x: 200,
        y: 100,
        setPluginData: vi.fn(),
        getPluginData: vi.fn()
      };
      
      const { findNodeById } = await import('../../../figma-plugin/src/utils/node-utils.js');
      (findNodeById as any).mockImplementation((id: string) => {
        if (id === 'node1') return mockNode1;
        if (id === 'node2') return mockNode2;
        return null;
      });
      
      const params = {
        operation: 'add_measurement',
        fromNodeId: 'node1',
        toNodeId: 'node2',
        direction: 'horizontal'
      };
      
      await handleMeasurementOperation(params);
      
      expect(BaseOperation.validateStringParam).toHaveBeenCalledWith(
        'add_measurement',
        'operation',
        ['add_measurement', 'edit_measurement', 'remove_measurement', 'list_measurements']
      );
    });

    it('should reject invalid operations', async () => {
      const { BaseOperation } = await import('../../../figma-plugin/src/operations/base-operation.js');
      (BaseOperation.validateStringParam as any).mockImplementationOnce(() => {
        throw new Error('Invalid operation: invalid');
      });
      
      await expect(handleMeasurementOperation({ operation: 'invalid' }))
        .rejects.toThrow('Invalid operation: invalid');
    });
  });

  describe('add_measurement operation', () => {
    it('should add horizontal measurement', async () => {
      const mockNode1 = {
        id: 'node1',
        name: 'Node 1',
        x: 100,
        y: 100,
        setPluginData: vi.fn(),
        getPluginData: vi.fn()
      };
      
      const mockNode2 = {
        id: 'node2',
        name: 'Node 2',
        x: 200,
        y: 100,
        setPluginData: vi.fn(),
        getPluginData: vi.fn()
      };
      
      const { findNodeById } = await import('../../../figma-plugin/src/utils/node-utils.js');
      (findNodeById as any).mockImplementation((id: string) => {
        if (id === 'node1') return mockNode1;
        if (id === 'node2') return mockNode2;
        return null;
      });
      
      const result = await handleMeasurementOperation({
        operation: 'add_measurement',
        fromNodeId: 'node1',
        toNodeId: 'node2',
        direction: 'horizontal'
      });
      
      expect(result.measurementId).toBeDefined();
      expect(result.direction).toBe('horizontal');
      expect(result.value).toBe(100); // |200 - 100| = 100
      expect(result.unit).toBe('px');
      expect(mockNode1.setPluginData).toHaveBeenCalled();
      expect(mockNode2.setPluginData).toHaveBeenCalled();
    });

    it('should add vertical measurement', async () => {
      const mockNode1 = {
        id: 'node1',
        name: 'Node 1',
        x: 100,
        y: 100,
        setPluginData: vi.fn(),
        getPluginData: vi.fn()
      };
      
      const mockNode2 = {
        id: 'node2',
        name: 'Node 2',
        x: 100,
        y: 200,
        setPluginData: vi.fn(),
        getPluginData: vi.fn()
      };
      
      const { findNodeById } = await import('../../../figma-plugin/src/utils/node-utils.js');
      (findNodeById as any).mockImplementation((id: string) => {
        if (id === 'node1') return mockNode1;
        if (id === 'node2') return mockNode2;
        return null;
      });
      
      const result = await handleMeasurementOperation({
        operation: 'add_measurement',
        fromNodeId: 'node1',
        toNodeId: 'node2',
        direction: 'vertical'
      });
      
      expect(result.direction).toBe('vertical');
      expect(result.value).toBe(100); // |200 - 100| = 100
    });

    it('should add distance measurement', async () => {
      const mockNode1 = {
        id: 'node1',
        name: 'Node 1',
        x: 0,
        y: 0,
        setPluginData: vi.fn(),
        getPluginData: vi.fn()
      };
      
      const mockNode2 = {
        id: 'node2',
        name: 'Node 2',
        x: 3,
        y: 4,
        setPluginData: vi.fn(),
        getPluginData: vi.fn()
      };
      
      const { findNodeById } = await import('../../../figma-plugin/src/utils/node-utils.js');
      (findNodeById as any).mockImplementation((id: string) => {
        if (id === 'node1') return mockNode1;
        if (id === 'node2') return mockNode2;
        return null;
      });
      
      const result = await handleMeasurementOperation({
        operation: 'add_measurement',
        fromNodeId: 'node1',
        toNodeId: 'node2',
        direction: 'distance'
      });
      
      expect(result.direction).toBe('distance');
      expect(result.value).toBe(5); // sqrt(3² + 4²) = 5
    });

    it('should handle custom label and value', async () => {
      const mockNode1 = {
        id: 'node1',
        name: 'Node 1',
        x: 100,
        y: 100,
        setPluginData: vi.fn(),
        getPluginData: vi.fn()
      };
      
      const mockNode2 = {
        id: 'node2',
        name: 'Node 2',
        x: 200,
        y: 100,
        setPluginData: vi.fn(),
        getPluginData: vi.fn()
      };
      
      const { findNodeById } = await import('../../../figma-plugin/src/utils/node-utils.js');
      (findNodeById as any).mockImplementation((id: string) => {
        if (id === 'node1') return mockNode1;
        if (id === 'node2') return mockNode2;
        return null;
      });
      
      const result = await handleMeasurementOperation({
        operation: 'add_measurement',
        fromNodeId: 'node1',
        toNodeId: 'node2',
        direction: 'horizontal',
        label: 'Custom Label',
        customValue: '10rem'
      });
      
      expect(result.label).toBe('Custom Label');
      expect(result.customValue).toBe('10rem');
    });

    it('should throw error for missing nodes', async () => {
      const { findNodeById } = await import('../../../figma-plugin/src/utils/node-utils.js');
      (findNodeById as any).mockImplementation(() => null);
      
      await expect(handleMeasurementOperation({
        operation: 'add_measurement',
        fromNodeId: 'missing1',
        toNodeId: 'missing2',
        direction: 'horizontal'
      })).rejects.toThrow('One or both nodes not found');
    });
  });

  describe('edit_measurement operation', () => {
    it('should edit measurement label', async () => {
      const mockNode = {
        id: 'node1',
        name: 'Node 1',
        getPluginData: vi.fn().mockReturnValue(JSON.stringify({
          id: 'measurement123',
          fromNodeId: 'node1',
          toNodeId: 'node2',
          direction: 'horizontal',
          value: 100,
          unit: 'px',
          label: 'Original Label'
        })),
        setPluginData: vi.fn()
      };
      
      mockFigma.currentPage.findAll.mockReturnValue([mockNode]);
      
      const { findNodeById } = await import('../../../figma-plugin/src/utils/node-utils.js');
      (findNodeById as any).mockImplementation((id: string) => {
        if (id === 'node1' || id === 'node2') return mockNode;
        return null;
      });
      
      const result = await handleMeasurementOperation({
        operation: 'edit_measurement',
        measurementId: 'measurement123',
        label: 'New Label'
      });
      
      expect(result.label).toBe('New Label');
      expect(result.measurementId).toBe('measurement123');
    });

    it('should throw error for missing measurement', async () => {
      mockFigma.currentPage.findAll.mockReturnValue([]);
      
      await expect(handleMeasurementOperation({
        operation: 'edit_measurement',
        measurementId: 'missing123'
      })).rejects.toThrow('Measurement with ID missing123 not found');
    });
  });

  describe('remove_measurement operation', () => {
    it('should remove measurement', async () => {
      const mockNode = {
        id: 'node1',
        name: 'Node 1',
        getPluginData: vi.fn().mockReturnValue(JSON.stringify({
          id: 'measurement123',
          label: 'Test Measurement',
          direction: 'horizontal'
        })),
        setPluginData: vi.fn()
      };
      
      mockFigma.currentPage.findAll.mockReturnValue([mockNode]);
      
      const result = await handleMeasurementOperation({
        operation: 'remove_measurement',
        measurementId: 'measurement123'
      });
      
      expect(result.measurementId).toBe('measurement123');
      expect(result.removedFromNodes).toBe(1);
      expect(mockNode.setPluginData).toHaveBeenCalledWith('measurement_measurement123', '');
    });
  });

  describe('list_measurements operation', () => {
    it('should list all measurements in current page', async () => {
      const mockNode = {
        id: 'node1',
        name: 'Node 1',
        getPluginDataKeys: vi.fn().mockReturnValue(['measurement_measurement123']),
        getPluginData: vi.fn().mockReturnValue(JSON.stringify({
          id: 'measurement123',
          fromNodeId: 'node1',
          toNodeId: 'node2',
          direction: 'horizontal',
          value: 100,
          unit: 'px',
          label: 'Test Measurement'
        }))
      };
      
      mockFigma.currentPage.findAll.mockReturnValue([mockNode]);
      
      const result = await handleMeasurementOperation({
        operation: 'list_measurements'
      });
      
      expect(result.pageId).toBe('page1');
      expect(result.pageName).toBe('Page 1');
      expect(result.measurementCount).toBe(1);
      expect(result.measurements).toHaveLength(1);
      expect(result.measurements[0].id).toBe('measurement123');
    });

    it('should handle empty measurements list', async () => {
      mockFigma.currentPage.findAll.mockReturnValue([]);
      
      const result = await handleMeasurementOperation({
        operation: 'list_measurements'
      });
      
      expect(result.measurementCount).toBe(0);
      expect(result.measurements).toHaveLength(0);
    });
  });
});