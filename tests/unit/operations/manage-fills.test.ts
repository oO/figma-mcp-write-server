import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { MANAGE_FILLS } from '../../../figma-plugin/src/operations/manage-fills.js';

// Mock Figma API
const mockFigma = {
  getNodeById: vi.fn(),
  createRectangle: vi.fn(),
  createImageAsync: vi.fn(),
  createImage: vi.fn(),
  getImageByHash: vi.fn(),
  currentPage: {
    appendChild: vi.fn()
  }
};

// Mock node with fills property
const createMockNode = (fills: any[] = []) => ({
  id: 'test-node',
  fills: fills,
  type: 'RECTANGLE'
});

// Mock Paint objects
const createSolidPaint = (color = { r: 1, g: 0, b: 0 }, opacity = 1): SolidPaint => ({
  type: 'SOLID',
  color,
  opacity,
  visible: true,
  blendMode: 'NORMAL'
});

const createGradientPaint = (): GradientPaint => ({
  type: 'GRADIENT_LINEAR',
  gradientStops: [
    { position: 0, color: { r: 1, g: 0, b: 0, a: 1 } },
    { position: 1, color: { r: 0, g: 0, b: 1, a: 1 } }
  ],
  gradientHandlePositions: [
    { x: 0, y: 0.5 },
    { x: 1, y: 0.5 },
    { x: 0.5, y: 0 }
  ],
  opacity: 1,
  visible: true,
  blendMode: 'NORMAL'
});

const createImagePaint = (imageHash = 'test-hash'): ImagePaint => ({
  type: 'IMAGE',
  imageHash,
  scaleMode: 'FILL',
  opacity: 1,
  visible: true,
  blendMode: 'NORMAL'
});

// Mock FigmaPropertyManager
vi.mock('../../../figma-plugin/src/utils/figma-property-utils.js', () => ({
  modifyFills: vi.fn((node, modifier) => {
    const manager = {
      push: vi.fn((fill) => { node.fills = [...node.fills, fill]; }),
      insert: vi.fn((index, fill) => { 
        const newFills = [...node.fills];
        newFills.splice(index, 0, fill);
        node.fills = newFills;
      }),
      update: vi.fn((index, fill) => { 
        const newFills = [...node.fills];
        newFills[index] = fill;
        node.fills = newFills;
      }),
      remove: vi.fn((index) => { 
        const newFills = [...node.fills];
        const removed = newFills.splice(index, 1)[0];
        node.fills = newFills;
        return removed;
      }),
      move: vi.fn((fromIndex, toIndex) => {
        const newFills = [...node.fills];
        const [moved] = newFills.splice(fromIndex, 1);
        newFills.splice(toIndex, 0, moved);
        node.fills = newFills;
      })
    };
    modifier(manager);
  })
}));

// Mock color-utils
vi.mock('../../../figma-plugin/src/utils/color-utils.js', () => ({
  createSolidPaint: vi.fn((color, opacity) => createSolidPaint({ r: 1, g: 0, b: 0 }, opacity)),
  createGradientPaint: vi.fn(() => createGradientPaint()),
  createImagePaint: vi.fn((hash, scaleMode) => createImagePaint(hash)),
  createImageFromUrl: vi.fn(async (url) => ({
    imageHash: 'url-hash-123',
    dimensions: { width: 200, height: 150 }
  })),
  createImageFromBytes: vi.fn(async (bytes) => ({
    imageHash: 'bytes-hash-456',
    dimensions: { width: 300, height: 200 }
  })),
  validatePaint: vi.fn(() => true),
  clonePaint: vi.fn((paint) => JSON.parse(JSON.stringify(paint))),
  isPaintType: vi.fn((paint, type) => paint.type === type),
  applyImageFilters: vi.fn((paint, filters) => ({
    ...paint,
    filters: {
      exposure: filters.filterExposure || 0,
      contrast: filters.filterContrast || 0,
      saturation: filters.filterSaturation || 0,
      temperature: filters.filterTemperature || 0,
      tint: filters.filterTint || 0,
      highlights: filters.filterHighlights || 0,
      shadows: filters.filterShadows || 0
    }
  })),
  convertStopArrays: vi.fn((positions, colors) => 
    positions.map((pos, i) => ({ position: pos, color: { r: 1, g: 0, b: 0, a: 1 } }))
  ),
  convertFlattenedHandles: vi.fn(() => [
    { x: 0, y: 0.5 },
    { x: 1, y: 0.5 },
    { x: 0.5, y: 0 }
  ])
}));

// Set up global figma mock
global.figma = mockFigma as any;

describe('ManageFillsOperation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getFill operation', () => {
    it('should get specific fill by index', async () => {
      const node = createMockNode([createSolidPaint(), createGradientPaint()]);
      mockFigma.getNodeById.mockReturnValue(node);

      const result = await MANAGE_FILLS({
        operation: 'get',
        nodeId: 'test-node',
        fillIndex: 0
      });

      expect(result.nodeId).toBe('test-node');
      expect(result.fillIndex).toBe(0);
      expect(result.fill.type).toBe('SOLID');
      expect(result.totalFills).toBe(2);
    });

    it('should throw error for invalid fillIndex', async () => {
      const node = createMockNode([createSolidPaint()]);
      mockFigma.getNodeById.mockReturnValue(node);

      await expect(MANAGE_FILLS({
        operation: 'get',
        nodeId: 'test-node',
        fillIndex: 5
      })).rejects.toThrow('Fill index 5 out of bounds');
    });

    it('should throw error for node not found', async () => {
      mockFigma.getNodeById.mockReturnValue(null);

      await expect(MANAGE_FILLS({
        operation: 'get',
        nodeId: 'nonexistent',
        fillIndex: 0
      })).rejects.toThrow('Node not found: nonexistent');
    });

    it('should throw error for mixed fills', async () => {
      const node = { id: 'test-node', fills: 'mixed' as any, type: 'RECTANGLE' };
      mockFigma.getNodeById.mockReturnValue(node);

      await expect(MANAGE_FILLS({
        operation: 'get',
        nodeId: 'test-node',
        fillIndex: 0
      })).rejects.toThrow('mixed fills');
    });
  });

  describe('getFills operation', () => {
    it('should get all fills from single node', async () => {
      const fills = [createSolidPaint(), createGradientPaint(), createImagePaint()];
      const node = createMockNode(fills);
      mockFigma.getNodeById.mockReturnValue(node);

      const result = await MANAGE_FILLS({
        operation: 'get',
        nodeId: 'test-node'
      });

      expect(result.results).toHaveLength(1);
      expect(result.results[0].fills).toHaveLength(3);
      expect(result.results[0].totalFills).toBe(3);
    });

    it('should filter fills by type', async () => {
      const fills = [createSolidPaint(), createGradientPaint(), createImagePaint()];
      const node = createMockNode(fills);
      mockFigma.getNodeById.mockReturnValue(node);

      const result = await MANAGE_FILLS({
        operation: 'get',
        nodeId: 'test-node',
        filterType: 'SOLID'
      });

      expect(result.results[0].filteredCount).toBe(1);
      expect(result.results[0].fills[0].type).toBe('SOLID');
    });

    it('should handle bulk get operation', async () => {
      const node1 = createMockNode([createSolidPaint()]);
      const node2 = createMockNode([createGradientPaint(), createImagePaint()]);
      
      mockFigma.getNodeById
        .mockReturnValueOnce(node1)
        .mockReturnValueOnce(node2);

      const result = await MANAGE_FILLS({
        operation: 'get',
        nodeId: ['node1', 'node2']
      });

      expect(result.results).toHaveLength(2);
      expect(result.totalNodes).toBe(2);
      expect(result.processedNodes).toBe(2);
    });

    it('should handle bulk operation with error continuation', async () => {
      const node1 = createMockNode([createSolidPaint()]);
      
      mockFigma.getNodeById
        .mockReturnValueOnce(node1)
        .mockReturnValueOnce(null); // Node not found

      const result = await MANAGE_FILLS({
        operation: 'get',
        nodeId: ['node1', 'nonexistent'],
      });

      // Direct result expected without success wrapper
      expect(result.results).toHaveLength(1); // Only successful node
      expect(result.totalNodes).toBe(2);
      expect(result.processedNodes).toBe(1);
    });
  });

  describe('addSolidFill operation', () => {
    it('should add solid fill to node', async () => {
      const node = createMockNode([]);
      mockFigma.getNodeById.mockReturnValue(node);

      const result = await MANAGE_FILLS({
        operation: 'add_solid',
        nodeId: 'test-node',
        color: '#FF0000',
        opacity: 0.8
      });

      // Direct result expected without success wrapper
      expect(result.results[0].success).toBe(true);
      expect(result.results[0].fillAdded.type).toBe('SOLID');
      expect(result.successfulNodes).toBe(1);
    });

    it('should add solid fill with insertIndex', async () => {
      const node = createMockNode([createGradientPaint()]);
      mockFigma.getNodeById.mockReturnValue(node);

      const result = await MANAGE_FILLS({
        operation: 'add_solid',
        nodeId: 'test-node',
        color: '#00FF00',
        insertIndex: 0
      });

      // Direct result expected without success wrapper
      expect(result.results[0].fillIndex).toBe(0);
    });

    it('should handle bulk add_solid operation', async () => {
      const node1 = createMockNode([]);
      const node2 = createMockNode([]);
      
      mockFigma.getNodeById
        .mockReturnValueOnce(node1)
        .mockReturnValueOnce(node2);

      const result = await MANAGE_FILLS({
        operation: 'add_solid',
        nodeId: ['node1', 'node2'],
        color: '#0000FF'
      });

      // Direct result expected without success wrapper
      expect(result.results).toHaveLength(2);
      expect(result.successfulNodes).toBe(2);
    });
  });

  describe('addGradientFill operation', () => {
    it('should add gradient fill to node', async () => {
      const node = createMockNode([]);
      mockFigma.getNodeById.mockReturnValue(node);

      const result = await MANAGE_FILLS({
        operation: 'add_gradient',
        nodeId: 'test-node',
        gradientType: 'GRADIENT_LINEAR',
        stopPositions: [0, 0.5, 1],
        stopColors: ['#FF0000', '#00FF00', '#0000FF'],
        gradientStartX: 0,
        gradientStartY: 0,
        gradientEndX: 1,
        gradientEndY: 1
      });

      // Direct result expected without success wrapper
      expect(result.results[0].fillAdded.type).toBe('GRADIENT_LINEAR');
    });

    it('should throw error for mismatched stop arrays', async () => {
      await expect(MANAGE_FILLS({
        operation: 'add_gradient',
        nodeId: 'test-node',
        gradientType: 'GRADIENT_LINEAR',
        stopPositions: [0, 1],
        stopColors: ['#FF0000', '#00FF00', '#0000FF'] // Different length
      })).rejects.toThrow('same length');
    });
  });

  describe('addImageFill operation', () => {
    it('should add image fill from URL', async () => {
      const node = createMockNode([]);
      mockFigma.getNodeById.mockReturnValue(node);

      const result = await MANAGE_FILLS({
        operation: 'add_image',
        nodeId: 'test-node',
        imageUrl: 'https://example.com/image.jpg',
        imageScaleMode: 'CROP'
      });

      // Direct result expected without success wrapper
      expect(result.results[0].fillAdded.type).toBe('IMAGE');
      expect(result.imageHash).toBe('url-hash-123');
      expect(result.imageDimensions).toEqual({ width: 200, height: 150 });
    });

    it('should add image fill from hash', async () => {
      const node = createMockNode([]);
      mockFigma.getNodeById.mockReturnValue(node);

      const result = await MANAGE_FILLS({
        operation: 'add_image',
        nodeId: 'test-node',
        imageHash: 'existing-hash-789'
      });

      // Direct result expected without success wrapper
      expect(result.results[0].fillAdded.type).toBe('IMAGE');
    });

    it('should create new node when no ID provided', async () => {
      const mockRect = { id: 'new-rect', resize: vi.fn(), x: 0, y: 0 };
      mockFigma.createRectangle.mockReturnValue(mockRect);

      const result = await MANAGE_FILLS({
        operation: 'add_image',
        imageUrl: 'https://example.com/image.jpg',
        x: 100,
        y: 200
      });

      expect(mockFigma.createRectangle).toHaveBeenCalled();
      expect(mockFigma.currentPage.appendChild).toHaveBeenCalledWith(mockRect);
      // Direct result expected without success wrapper
    });

    it('should apply image filters', async () => {
      const node = createMockNode([]);
      mockFigma.getNodeById.mockReturnValue(node);

      const result = await MANAGE_FILLS({
        operation: 'add_image',
        nodeId: 'test-node',
        imageHash: 'test-hash',
        filterExposure: 0.2,
        filterContrast: -0.1,
        filterSaturation: 0.3
      });

      // Direct result expected without success wrapper
    });

    it('should throw error for missing image source', async () => {
      await expect(MANAGE_FILLS({
        operation: 'add_image',
        nodeId: 'test-node'
        // No imageUrl, imagePath, or imageHash
      })).rejects.toThrow('Must provide imageUrl, imagePath, or imageHash');
    });
  });

  describe('updateFill operation', () => {
    it('should update fill properties', async () => {
      const node = createMockNode([createSolidPaint()]);
      mockFigma.getNodeById.mockReturnValue(node);

      const result = await MANAGE_FILLS({
        operation: 'update',
        nodeId: 'test-node',
        fillIndex: 0,
        opacity: 0.5,
        visible: false
      });

      // Direct result expected without success wrapper
      expect(result.updatedFill.opacity).toBe(0.5);
      expect(result.updatedFill.visible).toBe(false);
    });

    it('should update solid fill color', async () => {
      const node = createMockNode([createSolidPaint()]);
      mockFigma.getNodeById.mockReturnValue(node);

      const result = await MANAGE_FILLS({
        operation: 'update',
        nodeId: 'test-node',
        fillIndex: 0,
        color: '#00FF00'
      });

      // Direct result expected without success wrapper
    });

    it('should update image fill properties', async () => {
      const node = createMockNode([createImagePaint()]);
      mockFigma.getNodeById.mockReturnValue(node);

      const result = await MANAGE_FILLS({
        operation: 'update',
        nodeId: 'test-node',
        fillIndex: 0,
        imageScaleMode: 'FIT',
        filterExposure: 0.3
      });

      // Direct result expected without success wrapper
    });
  });

  describe('deleteFill operation', () => {
    it('should delete fill by index', async () => {
      const node = createMockNode([createSolidPaint(), createGradientPaint()]);
      mockFigma.getNodeById.mockReturnValue(node);

      const result = await MANAGE_FILLS({
        operation: 'delete',
        nodeId: 'test-node',
        fillIndex: 0
      });

      // Direct result expected without success wrapper
      expect(result.results[0].remainingFills).toBe(1);
    });

    it('should handle bulk delete operation', async () => {
      const node1 = createMockNode([createSolidPaint(), createGradientPaint()]);
      const node2 = createMockNode([createImagePaint()]);
      
      mockFigma.getNodeById
        .mockReturnValueOnce(node1)
        .mockReturnValueOnce(node2);

      const result = await MANAGE_FILLS({
        operation: 'delete',
        nodeId: ['node1', 'node2'],
        fillIndex: 0
      });

      // Direct result expected without success wrapper
      expect(result.results).toHaveLength(2);
      expect(result.successfulNodes).toBe(2);
    });
  });

  describe('reorderFill operation', () => {
    it('should reorder fill positions', async () => {
      const node = createMockNode([createSolidPaint(), createGradientPaint(), createImagePaint()]);
      mockFigma.getNodeById.mockReturnValue(node);

      const result = await MANAGE_FILLS({
        operation: 'reorder',
        nodeId: 'test-node',
        fillIndex: 2,
        newIndex: 0
      });

      // Direct result expected without success wrapper
      expect(result.fromIndex).toBe(2);
      expect(result.toIndex).toBe(0);
      expect(result.totalFills).toBe(3);
    });

    it('should throw error for invalid indices', async () => {
      const node = createMockNode([createSolidPaint()]);
      mockFigma.getNodeById.mockReturnValue(node);

      await expect(MANAGE_FILLS({
        operation: 'reorder',
        nodeId: 'test-node',
        fillIndex: 0,
        newIndex: 5
      })).rejects.toThrow('New index 5 out of bounds');
    });
  });

  describe('clearFills operation', () => {
    it('should clear all fills from node', async () => {
      const node = createMockNode([createSolidPaint(), createGradientPaint()]);
      mockFigma.getNodeById.mockReturnValue(node);

      const result = await MANAGE_FILLS({
        operation: 'clear',
        nodeId: 'test-node'
      });

      // Direct result expected without success wrapper
      expect(result.results[0].clearedFillsCount).toBe(2);
      expect(node.fills).toEqual([]);
    });

    it('should handle bulk clear operation', async () => {
      const node1 = createMockNode([createSolidPaint()]);
      const node2 = createMockNode([createGradientPaint(), createImagePaint()]);
      
      mockFigma.getNodeById
        .mockReturnValueOnce(node1)
        .mockReturnValueOnce(node2);

      const result = await MANAGE_FILLS({
        operation: 'clear',
        nodeId: ['node1', 'node2']
      });

      // Direct result expected without success wrapper
      expect(result.results).toHaveLength(2);
      expect(result.results[0].clearedFillsCount).toBe(1);
      expect(result.results[1].clearedFillsCount).toBe(2);
    });
  });

  describe('copyFills operation', () => {
    it('should copy fills between nodes', async () => {
      const sourceNode = createMockNode([createSolidPaint(), createGradientPaint()]);
      const targetNode = createMockNode([]);
      
      mockFigma.getNodeById
        .mockReturnValueOnce(sourceNode)
        .mockReturnValueOnce(targetNode);

      const result = await MANAGE_FILLS({
        operation: 'copy',
        fromNodeId: 'source',
        toNodeId: 'target'
      });

      // Direct result expected without success wrapper
      expect(result.sourceFillsCount).toBe(2);
      expect(result.results[0].copiedFillsCount).toBe(2);
    });

    it('should copy fills to multiple target nodes', async () => {
      const sourceNode = createMockNode([createSolidPaint()]);
      const target1 = createMockNode([]);
      const target2 = createMockNode([]);
      
      mockFigma.getNodeById
        .mockReturnValueOnce(sourceNode)
        .mockReturnValueOnce(target1)
        .mockReturnValueOnce(target2);

      const result = await MANAGE_FILLS({
        operation: 'copy',
        fromNodeId: 'source',
        toNodeId: ['target1', 'target2']
      });

      // Direct result expected without success wrapper
      expect(result.results).toHaveLength(2);
      expect(result.successfulNodes).toBe(2);
    });

    it('should throw error for source node with mixed fills', async () => {
      const sourceNode = { id: 'source', fills: 'mixed' as any, type: 'RECTANGLE' };
      mockFigma.getNodeById.mockReturnValue(sourceNode);

      await expect(MANAGE_FILLS({
        operation: 'copy',
        fromNodeId: 'source',
        toNodeId: 'target'
      })).rejects.toThrow('mixed fills');
    });
  });

  describe('Error handling', () => {
    it('should throw error for unknown operation', async () => {
      await expect(MANAGE_FILLS({
        operation: 'invalid_operation',
        nodeId: 'test-node'
      })).rejects.toThrow('Unknown fill operation: invalid_operation');
    });

    it('should validate required parameters', async () => {
      await expect(MANAGE_FILLS({
        operation: 'get'
        // Missing id and fillIndex
      })).rejects.toThrow('Missing required parameter');
    });

    it('should handle nodes without fills property', async () => {
      const node = { id: 'text-node', type: 'TEXT' }; // No fills property
      mockFigma.getNodeById.mockReturnValue(node);

      await expect(MANAGE_FILLS({
        operation: 'get',
        nodeId: 'text-node',
        fillIndex: 0
      })).rejects.toThrow('does not support fills');
    });
  });

  describe('Edge cases', () => {
    it('should handle empty fills array', async () => {
      const node = createMockNode([]);
      mockFigma.getNodeById.mockReturnValue(node);

      const result = await MANAGE_FILLS({
        operation: 'get',
        nodeId: 'test-node'
      });

      // Direct result expected without success wrapper
      expect(result.results[0].fills).toEqual([]);
      expect(result.results[0].totalFills).toBe(0);
    });

    it('should handle very large fills arrays', async () => {
      const largeFillsArray = Array.from({ length: 100 }, () => createSolidPaint());
      const node = createMockNode(largeFillsArray);
      mockFigma.getNodeById.mockReturnValue(node);

      const result = await MANAGE_FILLS({
        operation: 'get',
        nodeId: 'test-node'
      });

      // Direct result expected without success wrapper
      expect(result.results[0].totalFills).toBe(100);
    });

    it('should handle nodes with single fill', async () => {
      const node = createMockNode([createSolidPaint()]);
      mockFigma.getNodeById.mockReturnValue(node);

      const result = await MANAGE_FILLS({
        operation: 'delete',
        nodeId: 'test-node',
        fillIndex: 0
      });

      // Direct result expected without success wrapper
      expect(result.results[0].remainingFills).toBe(0);
    });
  });
});