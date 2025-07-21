import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { handleManageFills } from '../../../figma-plugin/src/operations/manage-fills.js';

// Mock Figma API with edge case scenarios
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

// Mock node types that don't support fills
const createUnsupportedNode = (type: string) => ({
  id: 'unsupported-node',
  type,
  // No fills property
});

// Mock node with mixed fills
const createMixedFillsNode = () => ({
  id: 'mixed-node',
  fills: 'mixed' as any,
  type: 'RECTANGLE'
});

// Mock node with very large fills array
const createLargeFillsNode = (fillCount: number) => ({
  id: 'large-fills-node',
  fills: Array.from({ length: fillCount }, (_, i) => ({
    type: 'SOLID',
    color: { r: i / fillCount, g: 0.5, b: 1 - (i / fillCount) },
    opacity: 1,
    visible: true
  })),
  type: 'RECTANGLE'
});

// Mock PaintUtils with edge case handling
vi.mock('../../../figma-plugin/src/utils/color-utils.js', () => ({
  createSolidPaint: vi.fn((color, opacity) => ({
    type: 'SOLID',
    color: { r: 1, g: 0, b: 0 },
    opacity: opacity ?? 1
  })),
  createGradientPaint: vi.fn(() => ({
    type: 'GRADIENT_LINEAR',
    gradientStops: [
      { position: 0, color: { r: 1, g: 0, b: 0, a: 1 } },
      { position: 1, color: { r: 0, g: 0, b: 1, a: 1 } }
    ],
    gradientHandlePositions: [
      { x: 0, y: 0.5 },
      { x: 1, y: 0.5 },
      { x: 0.5, y: 0 }
    ]
  })),
  createImagePaint: vi.fn((hash, scaleMode) => ({
    type: 'IMAGE',
    imageHash: hash,
    scaleMode: scaleMode || 'FILL'
  })),
  createImageFromUrl: vi.fn().mockImplementation(async (url) => {
    if (url.includes('invalid')) {
      throw new Error('Invalid URL');
    }
    if (url.includes('timeout')) {
      throw new Error('Network timeout');
    }
    if (url.includes('large')) {
      throw new Error('Image too large');
    }
    return {
      imageHash: `hash-${Date.now()}`,
      dimensions: { width: 200, height: 150 }
    };
  }),
  createGradientTransform: vi.fn(() => ({})), // Add this line
  applyImageFilters: vi.fn(paint => paint), // Add this line
  validatePaint: vi.fn((paint) => {
    if (!paint || !paint.type) return false;
    return ['SOLID', 'GRADIENT_LINEAR', 'GRADIENT_RADIAL', 'GRADIENT_ANGULAR', 'GRADIENT_DIAMOND', 'IMAGE'].includes(paint.type);
  }),
  clonePaint: vi.fn((paint) => JSON.parse(JSON.stringify(paint))),
  isPaintType: vi.fn((paint, type) => paint.type === type.toUpperCase()),
  convertStopArrays: vi.fn((positions, colors) => {
    if (positions.length !== colors.length) {
      throw new Error('Position and color arrays must have the same length');
    }
    return positions.map((pos, i) => ({ position: pos, color: { r: 1, g: 0, b: 0, a: 1 } }));
  }),
  convertFlattenedHandles: vi.fn(() => [
    { x: 0, y: 0.5 },
    { x: 1, y: 0.5 },
    { x: 0.5, y: 0 }
  ])
}));

// Mock FigmaPropertyManager with edge case handling
vi.mock('../../../figma-plugin/src/utils/figma-property-utils.js', () => ({
  modifyFills: vi.fn((node, modifier) => {
    if (!('fills' in node)) {
      throw new Error('Node does not support fills');
    }
    if (node.fills === 'mixed') {
      throw new Error('Cannot modify mixed fills');
    }
    
    const manager = {
      push: vi.fn((fill) => { 
        if (node.fills.length >= 100) {
          throw new Error('Maximum fills limit reached');
        }
        node.fills = [...node.fills, fill]; 
      }),
      insert: vi.fn((index, fill) => { 
        if (index < 0 || index > node.fills.length) {
          throw new Error('Insert index out of bounds');
        }
        const newFills = [...node.fills];
        newFills.splice(index, 0, fill);
        node.fills = newFills;
      }),
      update: vi.fn((index, fill) => { 
        if (index < 0 || index >= node.fills.length) {
          throw new Error('Update index out of bounds');
        }
        const newFills = [...node.fills];
        newFills[index] = fill;
        node.fills = newFills;
      }),
      remove: vi.fn((index) => { 
        if (index < 0 || index >= node.fills.length) {
          throw new Error('Remove index out of bounds');
        }
        const newFills = [...node.fills];
        const removed = newFills.splice(index, 1)[0];
        node.fills = newFills;
        return removed;
      }),
      move: vi.fn((fromIndex, toIndex) => {
        if (fromIndex < 0 || fromIndex >= node.fills.length || 
            toIndex < 0 || toIndex >= node.fills.length) {
          throw new Error('Move index out of bounds');
        }
        const newFills = [...node.fills];
        const [moved] = newFills.splice(fromIndex, 1);
        newFills.splice(toIndex, 0, moved);
        node.fills = newFills;
      })
    };
    modifier(manager);
  })
}));

global.figma = mockFigma as any;

describe('Figma Fills Edge Cases and Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Node Type Edge Cases', () => {
    it('should handle nodes that do not support fills', async () => {
      const textNode = createUnsupportedNode('TEXT');
      mockFigma.getNodeById.mockReturnValue(textNode);

      await expect(handleManageFills({
        operation: 'get',
        nodeId: 'unsupported-node',
        fillIndex: 0
      })).rejects.toThrow('does not support fills');
    });

    it('should handle component nodes', async () => {
      const componentNode = createUnsupportedNode('COMPONENT');
      mockFigma.getNodeById.mockReturnValue(componentNode);

      await expect(handleManageFills({
        operation: 'list',
        nodeId: 'unsupported-node'
      })).rejects.toThrow('does not support fills');
    });

    it('should handle group nodes', async () => {
      const groupNode = createUnsupportedNode('GROUP');
      mockFigma.getNodeById.mockReturnValue(groupNode);

      await expect(handleManageFills({
        operation: 'add_solid',
        nodeId: 'unsupported-node',
        color: '#FF0000'
      })).rejects.toThrow('does not support fills');
    });
  });

  describe('Mixed Fills Edge Cases', () => {
    it('should handle nodes with mixed fills property', async () => {
      const mixedNode = createMixedFillsNode();
      mockFigma.getNodeById.mockReturnValue(mixedNode);

      await expect(handleManageFills({
        operation: 'get',
        nodeId: 'mixed-node',
        fillIndex: 0
      })).rejects.toThrow('mixed fills');
    });

    it('should handle mixed fills in list operation gracefully', async () => {
      const mixedNode = createMixedFillsNode();
      mockFigma.getNodeById.mockReturnValue(mixedNode);

      const result = await handleManageFills({
        operation: 'list',
        nodeId: 'mixed-node',
        failFast: false
      });

      expect(result.results[0].fills).toBe('mixed');
      expect(result.results[0].error).toBe('Node has mixed fills');
    });

    it('should handle mixed fills in copy operation', async () => {
      const mixedNode = createMixedFillsNode();
      mockFigma.getNodeById.mockReturnValue(mixedNode);

      await expect(handleManageFills({
        operation: 'duplicate',
        fromNodeId: 'mixed-node',
        toNodeId: 'target-node'
      })).rejects.toThrow('mixed fills');
    });
  });

  describe('Index Boundary Edge Cases', () => {
    it('should handle negative fill indices', async () => {
      const node = { id: 'test-node', fills: [{ type: 'SOLID' }], type: 'RECTANGLE' };
      mockFigma.getNodeById.mockReturnValue(node);

      await expect(handleManageFills({
        operation: 'get',
        nodeId: 'test-node',
        fillIndex: -1
      })).rejects.toThrow('out of bounds');
    });

    it('should handle fill index beyond array length', async () => {
      const node = { id: 'test-node', fills: [{ type: 'SOLID' }], type: 'RECTANGLE' };
      mockFigma.getNodeById.mockReturnValue(node);

      await expect(handleManageFills({
        operation: 'update',
        nodeId: 'test-node',
        fillIndex: 999
      })).rejects.toThrow('out of bounds');
    });

    it('should handle reorder with invalid indices', async () => {
      const node = { id: 'test-node', fills: [{ type: 'SOLID' }], type: 'RECTANGLE' };
      mockFigma.getNodeById.mockReturnValue(node);

      await expect(handleManageFills({
        operation: 'reorder',
        nodeId: 'test-node',
        fillIndex: 0,
        newIndex: -1
      })).rejects.toThrow('out of bounds');
    });

    it('should handle insert with invalid index', async () => {
      const node = { id: 'test-node', fills: [], type: 'RECTANGLE' };
      mockFigma.getNodeById.mockReturnValue(node);

      await expect(handleManageFills({
        operation: 'add_solid',
        nodeId: 'test-node',
        color: '#FF0000',
        insertIndex: 999
      })).rejects.toThrow('out of bounds');
    });
  });

  describe('Large Scale Edge Cases', () => {
    it('should handle nodes with maximum fills', async () => {
      const largeNode = createLargeFillsNode(100);
      mockFigma.getNodeById.mockReturnValue(largeNode);

      const result = await handleManageFills({
        operation: 'list',
        nodeId: 'large-fills-node'
      });

      expect(result.results[0].totalFills).toBe(100);
    });

    it('should handle adding fill when at maximum capacity', async () => {
      const maxNode = createLargeFillsNode(100);
      mockFigma.getNodeById.mockReturnValue(maxNode);

      await expect(handleManageFills({
        operation: 'add_solid',
        nodeId: 'large-fills-node',
        color: '#FF0000'
      })).rejects.toThrow('Maximum fills limit reached');
    });

    it('should handle very large bulk operations', async () => {
      const manyNodeIds = Array.from({ length: 1000 }, (_, i) => `node-${i}`);
      
      // Mock successful response for first node, then fail
      mockFigma.getNodeById
        .mockReturnValueOnce({ id: 'node-0', fills: [], type: 'RECTANGLE' })
        .mockReturnValue(null);

      const result = await handleManageFills({
        operation: 'add_solid',
        nodeId: manyNodeIds,
        color: '#FF0000',
        failFast: false
      });

      expect(result.successfulNodes).toBe(1);
      expect(result.totalNodes).toBe(1000);
    });
  });

  describe('Gradient Edge Cases', () => {
    it('should handle empty gradient stop arrays', async () => {
      await expect(handleManageFills({
        operation: 'add_gradient',
        nodeId: 'test-node',
        gradientType: 'GRADIENT_LINEAR',
        stopPositions: [],
        stopColors: []
      })).rejects.toThrow('Gradient fills must have at least 2 color stops');
    });

    it('should handle single gradient stop', async () => {
      await expect(handleManageFills({
        operation: 'add_gradient',
        nodeId: 'test-node',
        gradientType: 'GRADIENT_LINEAR',
        stopPositions: [0.5],
        stopColors: ['#FF0000']
      })).rejects.toThrow('Gradient fills must have at least 2 color stops');
    });

    it('should handle mismatched stop array lengths', async () => {
      await expect(handleManageFills({
        operation: 'add_gradient',
        nodeId: 'test-node',
        gradientType: 'GRADIENT_LINEAR',
        stopPositions: [0, 0.5, 1],
        stopColors: ['#FF0000', '#00FF00'] // Different length
      })).rejects.toThrow('stopPositions and stopColors arrays must have the same length');
    });

    it('should handle gradient stops out of order', async () => {
      const node = { id: 'test-node', fills: [], type: 'RECTANGLE' };
      mockFigma.getNodeById.mockReturnValue(node);

      // Should accept out-of-order stops (design decision)
      const result = await handleManageFills({
        operation: 'add_gradient',
        nodeId: 'test-node',
        gradientType: 'GRADIENT_LINEAR',
        stopPositions: [0.5, 0, 1], // Out of order
        stopColors: ['#FFFF00', '#FF0000', '#0000FF']
      });

      expect(result.results[0].fillAdded).toBeDefined();
    });

    it('should handle gradient positions outside 0-1 range', async () => {
      const node = { id: 'test-node', fills: [], type: 'RECTANGLE' };
      mockFigma.getNodeById.mockReturnValue(node);

      // Should accept values outside 0-1 (Figma allows this)
      const result = await handleManageFills({
        operation: 'add_gradient',
        nodeId: 'test-node',
        gradientType: 'GRADIENT_LINEAR',
        stopPositions: [-0.5, 1.5],
        stopColors: ['#FF0000', '#0000FF']
      });

      expect(result.results[0].fillAdded).toBeDefined();
    });

    it('should handle extremely large number of gradient stops', async () => {
      const node = { id: 'test-node', fills: [], type: 'RECTANGLE' };
      mockFigma.getNodeById.mockReturnValue(node);

      const manyStops = Array.from({ length: 1000 }, (_, i) => i / 999);
      const manyColors = Array.from({ length: 1000 }, () => '#FF0000');

      const result = await handleManageFills({
        operation: 'add_gradient',
        nodeId: 'test-node',
        gradientType: 'GRADIENT_LINEAR',
        stopPositions: manyStops,
        stopColors: manyColors
      });

      expect(result.results[0].fillAdded).toBeDefined();
    });
  });

  describe('Image Edge Cases', () => {
    it('should handle invalid image URLs', async () => {
      await expect(handleManageFills({
        operation: 'add_image',
        nodeId: 'test-node',
        imageUrl: 'invalid-url-format'
      })).rejects.toThrow('Invalid URL');
    });

    it('should handle network timeouts for image loading', async () => {
      await expect(handleManageFills({
        operation: 'add_image',
        nodeId: 'test-node',
        imageUrl: 'https://timeout.example.com/image.jpg'
      })).rejects.toThrow('Network timeout');
    });

    it('should handle oversized images', async () => {
      await expect(handleManageFills({
        operation: 'add_image',
        nodeId: 'test-node',
        imageUrl: 'https://large.example.com/image.jpg'
      })).rejects.toThrow('Image too large');
    });

    it('should handle missing image sources', async () => {
      await expect(handleManageFills({
        operation: 'add_image',
        nodeId: 'test-node'
        // No imageUrl, imagePath, or imageHash
      })).rejects.toThrow('Must provide imageUrl, imagePath, or imageHash');
    });

    it('should handle corrupted image hash', async () => {
      const node = { id: 'test-node', fills: [], type: 'RECTANGLE' };
      mockFigma.getNodeById.mockReturnValue(node);

      // Should accept invalid hash (Figma will handle)
      const result = await handleManageFills({
        operation: 'add_image',
        nodeId: 'test-node',
        imageHash: 'corrupted-hash-12345'
      });

      expect(result.results[0].fillAdded).toBeDefined();
    });

    it('should handle image filter values outside valid range', async () => {
      const node = { id: 'test-node', fills: [], type: 'RECTANGLE' };
      mockFigma.getNodeById.mockReturnValue(node);

      // Should accept out-of-range values (Figma will clamp)
      const result = await handleManageFills({
        operation: 'add_image',
        nodeId: 'test-node',
        imageHash: 'test-hash',
        filterExposure: 5.0,  // Beyond +1
        filterContrast: -5.0  // Beyond -1
      });

      expect(result.results[0].fillAdded).toBeDefined();
    });

    it('should handle creating new node without position', async () => {
      const mockRect = { id: 'new-rect', resize: vi.fn(), x: 0, y: 0 };
      mockFigma.createRectangle.mockReturnValue(mockRect);

      const result = await handleManageFills({
        operation: 'add_image',
        imageHash: 'test-hash'
        // No x, y, or id provided
      });

      expect(result.results[0].fillAdded).toBeDefined();
      expect(mockRect.x).toBe(0); // Default position
      expect(mockRect.y).toBe(0);
    });
  });

  describe('Color and Validation Edge Cases', () => {
    it('should handle invalid hex color formats', async () => {
      const node = { id: 'test-node', fills: [], type: 'RECTANGLE' };
      mockFigma.getNodeById.mockReturnValue(node);

      // Color validation should be handled by color-utils
      const result = await handleManageFills({
        operation: 'add_solid',
        nodeId: 'test-node',
        color: 'invalid-color'
      });

      expect(result.results[0].fillAdded).toBeDefined(); // color-utils mock handles this
    });

    it('should handle malformed parameter combinations', async () => {
      await expect(handleManageFills({
        operation: 'update',
        nodeId: 'test-node',
        fillIndex: 0,
        // No update parameters provided
      })).rejects.toThrow('Missing required parameter');
    });

    it('should handle extremely long node ID strings', async () => {
      const veryLongId = 'node-' + 'x'.repeat(10000);
      mockFigma.getNodeById.mockReturnValue(null);

      await expect(handleManageFills({
        operation: 'get',
        nodeId: veryLongId,
        fillIndex: 0
      })).rejects.toThrow(`Node not found: ${veryLongId}`);
    });

    it('should handle special characters in node IDs', async () => {
      const specialId = 'node-with-特殊字符-and-🎨-emoji';
      mockFigma.getNodeById.mockReturnValue(null);

      await expect(handleManageFills({
        operation: 'get',
        nodeId: specialId,
        fillIndex: 0
      })).rejects.toThrow(`Node not found: ${specialId}`);
    });
  });

  describe('Memory and Performance Edge Cases', () => {
    it('should handle deeply nested paint objects', async () => {
      const deepPaint = {
        type: 'IMAGE',
        imageHash: 'test',
        nested: {
          level1: {
            level2: {
              level3: Array.from({ length: 100 }, (_, i) => ({ index: i, data: 'x'.repeat(1000) }))
            }
          }
        }
      };

      const node = { id: 'test-node', fills: [deepPaint], type: 'RECTANGLE' };
      mockFigma.getNodeById.mockReturnValue(node);

      const result = await handleManageFills({
        operation: 'list',
        nodeId: 'test-node'
      });

      expect(result.results[0].fills.length).toBeGreaterThan(0);
    });

    it('should handle rapid sequential operations', async () => {
      const node = { id: 'test-node', fills: [], type: 'RECTANGLE' };
      mockFigma.getNodeById.mockReturnValue(node);

      // Simulate rapid sequential calls
      const promises = Array.from({ length: 100 }, () => 
        handleManageFills({
          operation: 'add_solid',
          nodeId: 'test-node',
          color: '#FF0000'
        })
      );

      const results = await Promise.allSettled(promises);
      const successful = results.filter(r => r.status === 'fulfilled').length;
      
      expect(successful).toBeGreaterThan(0); // At least some should succeed
    });
  });

  describe('Cleanup and Resource Management', () => {
    it('should handle cleanup when operations fail midway', async () => {
      const node = { id: 'test-node', fills: [], type: 'RECTANGLE' };
      mockFigma.getNodeById.mockReturnValue(node);

      // Mock a failure during fill addition
      vi.mocked(operation['validateParams']).mockImplementation(() => {
        throw new Error('Validation failed midway');
      });

      await expect(handleManageFills({
        operation: 'add_solid',
        nodeId: 'test-node',
        color: '#FF0000'
      })).rejects.toThrow('Validation failed midway');

      // Node should remain unchanged
      expect(node.fills).toHaveLength(0);
    });

    it('should handle circular references in paint objects', async () => {
      const circularPaint: any = { type: 'SOLID', color: { r: 1, g: 0, b: 0 } };
      circularPaint.self = circularPaint; // Create circular reference

      const node = { id: 'test-node', fills: [circularPaint], type: 'RECTANGLE' };
      mockFigma.getNodeById.mockReturnValue(node);

      // Should handle circular references gracefully
      const result = await handleManageFills({
        operation: 'list',
        nodeId: 'test-node'
      });

      expect(result.results[0].fills.length).toBeGreaterThan(0);
    });
  });

  describe('Concurrency Edge Cases', () => {
    it('should handle concurrent modifications to the same node', async () => {
      const node = { id: 'concurrent-node', fills: [], type: 'RECTANGLE' };
      mockFigma.getNodeById.mockReturnValue(node);

      // Simulate concurrent operations on the same node
      const operation1 = handleManageFills({
        operation: 'add_solid',
        nodeId: 'concurrent-node',
        color: '#FF0000'
      });

      const operation2 = handleManageFills({
        operation: 'add_solid',
        nodeId: 'concurrent-node',
        color: '#00FF00'
      });

      const [result1, result2] = await Promise.allSettled([operation1, operation2]);

      // Both operations should complete (though final state may vary)
      expect(result1.status).toBe('fulfilled');
      expect(result2.status).toBe('fulfilled');
    });

    it('should handle mixed successful and failed bulk operations', async () => {
      mockFigma.getNodeById
        .mockReturnValueOnce({ id: 'valid-1', fills: [], type: 'RECTANGLE' })
        .mockReturnValueOnce(null) // Node not found
        .mockReturnValueOnce({ id: 'valid-2', fills: [], type: 'RECTANGLE' })
        .mockReturnValueOnce(createUnsupportedNode('TEXT')); // Unsupported type

      const result = await handleManageFills({
        operation: 'add_solid',
        nodeId: ['valid-1', 'missing', 'valid-2', 'unsupported'],
        color: '#FF0000',
        failFast: false
      });

      expect(result.totalNodes).toBe(4);
      expect(result.successfulNodes).toBe(2);
      expect(result.results.filter(r => r.fillAdded)).toHaveLength(2);
      expect(result.results.filter(r => r.error)).toHaveLength(2);
    });
  });
});