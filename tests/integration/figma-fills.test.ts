import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { FillsHandler } from '../../src/handlers/fills-handler.js';
import { ManageFillsOperation } from '../../figma-plugin/src/operations/manage-fills.js';

// Mock WebSocket server for handler tests
const mockWsServer = {
  getConnectionStatus: vi.fn().mockReturnValue({ lastHeartbeat: new Date().toISOString() }),
  isPluginConnected: vi.fn().mockReturnValue(true)
};

// Mock successful plugin response generator
const createMockPluginResponse = (data: any) => ({
  ...data,
  timestamp: new Date().toISOString()
});

describe('Figma Fills Integration Tests', () => {
  let handler: FillsHandler;
  let mockSendToPlugin: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockSendToPlugin = vi.fn();
    handler = new FillsHandler(mockSendToPlugin);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('End-to-End Fill Management Workflow', () => {
    it('should complete a full fill management workflow', async () => {
      const nodeId = 'workflow-node-123';
      
      // Step 1: Get initial fills (should be empty)
      mockSendToPlugin.mockResolvedValueOnce(createMockPluginResponse({
        results: [{
          nodeId,
          fills: [],
          totalFills: 0,
          filteredCount: 0
        }],
        totalNodes: 1,
        processedNodes: 1
      }));

      const listResult1 = await handler.handle('figma_fills', {
        operation: 'get',
        nodeId: nodeId
      });

      expect(listResult1.results[0].totalFills).toBe(0);

      // Step 2: Add solid fill
      mockSendToPlugin.mockResolvedValueOnce(createMockPluginResponse({
        results: [{
          nodeId,
          success: true,
          fillAdded: {
            type: 'SOLID',
            color: { r: 1, g: 0, b: 0 },
            opacity: 1,
            visible: true,
            blendMode: 'NORMAL'
          },
          fillIndex: 0
        }],
        totalNodes: 1,
        successfulNodes: 1
      }));

      const addSolidResult = await handler.handle('figma_fills', {
        operation: 'add_solid',
        nodeId: nodeId,
        color: '#FF0000',
        opacity: 1
      });

      expect(addSolidResult.results[0].fillAdded.type).toBe('SOLID');

      // Step 3: Add gradient fill
      mockSendToPlugin.mockResolvedValueOnce(createMockPluginResponse({
        results: [{
          nodeId,
          success: true,
          fillAdded: {
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
            opacity: 0.8,
            visible: true,
            blendMode: 'NORMAL'
          },
          fillIndex: 1
        }],
        totalNodes: 1,
        successfulNodes: 1
      }));

      const addGradientResult = await handler.handle('figma_fills', {
        operation: 'add_gradient',
        nodeId: nodeId,
        gradientType: 'GRADIENT_LINEAR',
        stopPositions: [0, 1],
        stopColors: ['#FF0000', '#0000FF'],
        opacity: 0.8
      });

      expect(addGradientResult.results[0].fillAdded.type).toBe('GRADIENT_LINEAR');

      // Step 4: Add image fill
      mockSendToPlugin.mockResolvedValueOnce(createMockPluginResponse({
        results: [{
          nodeId,
          success: true,
          fillAdded: {
            type: 'IMAGE',
            imageHash: 'test-image-hash',
            scaleMode: 'FILL',
            opacity: 1,
            visible: true,
            blendMode: 'NORMAL'
          },
          fillIndex: 2,
          imageHash: 'test-image-hash',
          imageDimensions: { width: 200, height: 150 }
        }],
        totalNodes: 1,
        successfulNodes: 1,
        imageHash: 'test-image-hash',
        imageDimensions: { width: 200, height: 150 }
      }));

      const addImageResult = await handler.handle('figma_fills', {
        operation: 'add_image',
        nodeId: nodeId,
        imageUrl: 'https://example.com/test.jpg'
      });

      expect(addImageResult.results[0].fillAdded.type).toBe('IMAGE');

      // Step 5: Get all fills (should now have 3)
      mockSendToPlugin.mockResolvedValueOnce(createMockPluginResponse({
        results: [{
          nodeId,
          fills: [
            { type: 'SOLID', color: { r: 1, g: 0, b: 0 }, opacity: 1 },
            { type: 'GRADIENT_LINEAR', opacity: 0.8 },
            { type: 'IMAGE', imageHash: 'test-image-hash', scaleMode: 'FILL' }
          ],
          totalFills: 3,
          filteredCount: 3
        }],
        totalNodes: 1,
        processedNodes: 1
      }));

      const listResult2 = await handler.handle('figma_fills', {
        operation: 'get',
        nodeId: nodeId
      });

      expect(listResult2.results[0].totalFills).toBe(3);

      // Step 6: Update fill opacity
      mockSendToPlugin.mockResolvedValueOnce(createMockPluginResponse({
        nodeId,
        fillIndex: 0,
        updatedFill: {
          type: 'SOLID',
          color: { r: 1, g: 0, b: 0 },
          opacity: 0.5,
          visible: true,
          blendMode: 'NORMAL'
        },
        totalFills: 3
      }));

      const updateResult = await handler.handle('figma_fills', {
        operation: 'update',
        nodeId: nodeId,
        fillIndex: 0,
        opacity: 0.5
      });

      expect(updateResult.updatedFill.opacity).toBe(0.5);

      // Step 7: Reorder fills (move last to first)
      mockSendToPlugin.mockResolvedValueOnce(createMockPluginResponse({
        nodeId,
        fromIndex: 2,
        toIndex: 0,
        reorderedFill: { type: 'IMAGE', imageHash: 'test-image-hash' },
        totalFills: 3
      }));

      const reorderResult = await handler.handle('figma_fills', {
        operation: 'reorder',
        nodeId: nodeId,
        fillIndex: 2,
        newIndex: 0
      });

      expect(reorderResult.fromIndex).toBe(2);
      expect(reorderResult.toIndex).toBe(0);

      // Step 8: Delete middle fill
      mockSendToPlugin.mockResolvedValueOnce(createMockPluginResponse({
        results: [{
          nodeId,
          success: true,
          deletedFill: { type: 'SOLID', color: { r: 1, g: 0, b: 0 } },
          fillIndex: 1,
          remainingFills: 2
        }],
        totalNodes: 1,
        successfulNodes: 1
      }));

      const deleteResult = await handler.handle('figma_fills', {
        operation: 'delete',
        nodeId: nodeId,
        fillIndex: 1
      });

      expect(deleteResult.results[0].remainingFills).toBe(2);

      // Verify all plugin calls were made with correct message types
      expect(mockSendToPlugin).toHaveBeenCalledTimes(8);
      mockSendToPlugin.mock.calls.forEach(call => {
        expect(call[0].type).toBe('MANAGE_FILLS');
      });
    });

    it('should handle bulk operations across multiple nodes', async () => {
      const nodeIds = ['bulk-node-1', 'bulk-node-2', 'bulk-node-3'];

      // Bulk add solid fills to multiple nodes
      mockSendToPlugin.mockResolvedValueOnce(createMockPluginResponse({
        results: [
          { nodeId: 'bulk-node-1', success: true, fillAdded: { type: 'SOLID' }, fillIndex: 0 },
          { nodeId: 'bulk-node-2', success: true, fillAdded: { type: 'SOLID' }, fillIndex: 0 },
          { nodeId: 'bulk-node-3', success: true, fillAdded: { type: 'SOLID' }, fillIndex: 0 }
        ],
        totalNodes: 3,
        successfulNodes: 3
      }));

      const bulkAddResult = await handler.handle('figma_fills', {
        operation: 'add_solid',
        nodeId: nodeIds,
        color: '#00FF00',
      });

      expect(bulkAddResult.results).toHaveLength(3);
      expect(bulkAddResult.successfulNodes).toBe(3);

      // Bulk list fills from multiple nodes
      mockSendToPlugin.mockResolvedValueOnce(createMockPluginResponse({
        results: [
          { nodeId: 'bulk-node-1', fills: [{ type: 'SOLID' }], totalFills: 1 },
          { nodeId: 'bulk-node-2', fills: [{ type: 'SOLID' }], totalFills: 1 },
          { nodeId: 'bulk-node-3', fills: [{ type: 'SOLID' }], totalFills: 1 }
        ],
        totalNodes: 3,
        processedNodes: 3
      }));

      const bulkListResult = await handler.handle('figma_fills', {
        operation: 'get',
        nodeId: nodeIds
      });

      expect(bulkListResult.results).toHaveLength(3);
      expect(bulkListResult.totalNodes).toBe(3);

      // Bulk clear all fills
      mockSendToPlugin.mockResolvedValueOnce(createMockPluginResponse({
        results: [
          { nodeId: 'bulk-node-1', success: true, clearedFillsCount: 1 },
          { nodeId: 'bulk-node-2', success: true, clearedFillsCount: 1 },
          { nodeId: 'bulk-node-3', success: true, clearedFillsCount: 1 }
        ],
        totalNodes: 3,
        successfulNodes: 3
      }));

      const bulkClearResult = await handler.handle('figma_fills', {
        operation: 'clear',
        nodeId: nodeIds
      });

      expect(bulkClearResult.results).toHaveLength(3);
      expect(bulkClearResult.successfulNodes).toBe(3);
    });

    it('should handle duplicate operations between nodes', async () => {
      const sourceNodeId = 'source-node';
      const targetNodeIds = ['target-1', 'target-2'];

      mockSendToPlugin.mockResolvedValueOnce(createMockPluginResponse({
        sourceNodeId,
        sourceFillsCount: 2,
        results: [
          {
            targetNodeId: 'target-1',
            success: true,
            copiedFillsCount: 2,
            copiedFills: [
              { type: 'SOLID', color: { r: 1, g: 0, b: 0 } },
              { type: 'GRADIENT_LINEAR' }
            ]
          },
          {
            targetNodeId: 'target-2',
            success: true,
            copiedFillsCount: 2,
            copiedFills: [
              { type: 'SOLID', color: { r: 1, g: 0, b: 0 } },
              { type: 'GRADIENT_LINEAR' }
            ]
          }
        ],
        totalTargetNodes: 2,
        successfulNodes: 2
      }));

      const copyResult = await handler.handle('figma_fills', {
        operation: 'duplicate',
        fromNodeId: sourceNodeId,
        toNodeId: targetNodeIds
      });

      expect(copyResult.sourceFillsCount).toBe(2);
      expect(copyResult.results).toHaveLength(2);
      expect(copyResult.successfulNodes).toBe(2);
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle partial failures in bulk operations', async () => {
      const nodeIds = ['valid-node', 'invalid-node', 'another-valid-node'];

      mockSendToPlugin.mockResolvedValueOnce(createMockPluginResponse({
        results: [
          { nodeId: 'valid-node', success: true, fillAdded: { type: 'SOLID' }, fillIndex: 0 },
          { nodeId: 'invalid-node', success: false, error: 'Node not found: invalid-node' },
          { nodeId: 'another-valid-node', success: true, fillAdded: { type: 'SOLID' }, fillIndex: 0 }
        ],
        totalNodes: 3,
        successfulNodes: 2
      }));

      const result = await handler.handle('figma_fills', {
        operation: 'add_solid',
        nodeId: nodeIds,
        color: '#FF0000',
      });

      expect(result.totalNodes).toBe(3);
      expect(result.successfulNodes).toBe(2);
      expect(result.results[1].success).toBe(false);
      expect(result.results[1].error).toContain('Node not found');
    });

    it('should handle plugin errors gracefully', async () => {
      mockSendToPlugin.mockRejectedValue(new Error('Plugin communication error'));

      await expect(handler.handle('figma_fills', {
        operation: 'get',
        nodeId: 'test-node',
        fillIndex: 0
      })).rejects.toThrow('Plugin communication error');
    });

    it('should validate required parameters', async () => {
      // Missing required parameters should fail validation before reaching plugin
      await expect(handler.handle('figma_fills', {
        operation: 'get'
        // Missing id and fillIndex
      })).rejects.toThrow();
    });
  });

  describe('Filter and Search Operations', () => {
    it('should filter fills by type across multiple nodes', async () => {
      const nodeIds = ['node-1', 'node-2', 'node-3'];

      mockSendToPlugin.mockResolvedValueOnce(createMockPluginResponse({
        results: [
          {
            nodeId: 'node-1',
            fills: [{ type: 'SOLID', color: { r: 1, g: 0, b: 0 } }],
            totalFills: 3,
            filteredCount: 1
          },
          {
            nodeId: 'node-2',
            fills: [{ type: 'SOLID', color: { r: 0, g: 1, b: 0 } }],
            totalFills: 2,
            filteredCount: 1
          },
          {
            nodeId: 'node-3',
            fills: [],
            totalFills: 4,
            filteredCount: 0
          }
        ],
        totalNodes: 3,
        processedNodes: 3
      }));

      const result = await handler.handle('figma_fills', {
        operation: 'get',
        nodeId: nodeIds,
        filterType: 'SOLID'
      });

      expect(result.results).toHaveLength(3);
      expect(result.results[0].filteredCount).toBe(1);
      expect(result.results[2].filteredCount).toBe(0);
    });

    it('should handle image fill operations with filters', async () => {
      mockSendToPlugin.mockResolvedValueOnce(createMockPluginResponse({
        results: [{
          nodeId: 'image-node',
          success: true,
          fillAdded: {
            type: 'IMAGE',
            imageHash: 'filtered-image-hash',
            scaleMode: 'CROP',
            filters: {
              exposure: 0.3,
              contrast: -0.2,
              saturation: 0.5,
              temperature: 0.1,
              tint: -0.1,
              highlights: 0.2,
              shadows: -0.3
            },
            opacity: 0.9,
            visible: true,
            blendMode: 'MULTIPLY'
          },
          fillIndex: 0,
          imageHash: 'filtered-image-hash',
          imageDimensions: { width: 400, height: 300 }
        }],
        totalNodes: 1,
        successfulNodes: 1,
        imageHash: 'filtered-image-hash',
        imageDimensions: { width: 400, height: 300 }
      }));

      const result = await handler.handle('figma_fills', {
        operation: 'add_image',
        nodeId: 'image-node',
        imageUrl: 'https://example.com/filtered-image.jpg',
        imageScaleMode: 'CROP',
        filterExposure: 0.3,
        filterContrast: -0.2,
        filterSaturation: 0.5,
        filterTemperature: 0.1,
        filterTint: -0.1,
        filterHighlights: 0.2,
        filterShadows: -0.3,
        opacity: 0.9,
        blendMode: 'MULTIPLY'
      });

      expect(result.results[0].fillAdded.filterExposure).toBe(0.3);
      expect(result.results[0].fillAdded.filterContrast).toBe(-0.2);
      expect(result.results[0].fillAdded.scaleMode).toBe('CROP');
      expect(result.results[0].fillAdded.blendMode).toBe('MULTIPLY');
    });
  });

  describe('Complex Gradient Operations', () => {
    it('should handle complex gradient with multiple stops and custom handles', async () => {
      mockSendToPlugin.mockResolvedValueOnce(createMockPluginResponse({
        results: [{
          nodeId: 'gradient-node',
          success: true,
          fillAdded: {
            type: 'GRADIENT_RADIAL',
            gradientStops: [
              { position: 0, color: { r: 1, g: 0, b: 0, a: 1 } },
              { position: 0.3, color: { r: 1, g: 1, b: 0, a: 0.8 } },
              { position: 0.7, color: { r: 0, g: 1, b: 0, a: 0.6 } },
              { position: 1, color: { r: 0, g: 0, b: 1, a: 1 } }
            ],
            gradientHandlePositions: [
              { x: 0.2, y: 0.3 },
              { x: 0.8, y: 0.7 },
              { x: 0.6, y: 0.1 }
            ],
            opacity: 0.85,
            visible: true,
            blendMode: 'SCREEN'
          },
          fillIndex: 0
        }],
        totalNodes: 1,
        successfulNodes: 1
      }));

      const result = await handler.handle('figma_fills', {
        operation: 'add_gradient',
        nodeId: 'gradient-node',
        gradientType: 'GRADIENT_RADIAL',
        stopPositions: [0, 0.3, 0.7, 1],
        stopColors: ['#FF0000', '#FFFF00CC', '#00FF0099', '#0000FF'],
        gradientStartX: 0.2,
        gradientStartY: 0.3,
        gradientEndX: 0.8,
        gradientEndY: 0.7,
        opacity: 0.85,
        blendMode: 'SCREEN'
      });

      expect(result.results[0].fillAdded.type).toBe('GRADIENT_RADIAL');
      expect(result.results[0].fillAdded.gradientStops).toHaveLength(4);
      expect(result.results[0].fillAdded.gradientHandlePositions).toHaveLength(3);
      expect(result.results[0].fillAdded.opacity).toBe(0.85);
    });
  });

  describe('Performance and Scale Testing', () => {
    it('should handle operations on many nodes efficiently', async () => {
      const manyNodeIds = Array.from({ length: 50 }, (_, i) => `node-${i}`);
      
      mockSendToPlugin.mockResolvedValueOnce(createMockPluginResponse({
        results: manyNodeIds.map(nodeId => ({
          nodeId,
          success: true,
          fillAdded: { type: 'SOLID', color: { r: 0, g: 1, b: 0 } },
          fillIndex: 0
        })),
        totalNodes: 50,
        successfulNodes: 50
      }));

      const startTime = Date.now();
      
      const result = await handler.handle('figma_fills', {
        operation: 'add_solid',
        nodeId: manyNodeIds,
        color: '#00FF00',
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(result.totalNodes).toBe(50);
      expect(result.successfulNodes).toBe(50);
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle nodes with many fills', async () => {
      const manyFills = Array.from({ length: 20 }, (_, i) => ({
        type: i % 3 === 0 ? 'SOLID' : i % 3 === 1 ? 'GRADIENT_LINEAR' : 'IMAGE',
        opacity: 0.1 + (i * 0.04),
        visible: true
      }));

      mockSendToPlugin.mockResolvedValueOnce(createMockPluginResponse({
        results: [{
          nodeId: 'dense-node',
          fills: manyFills,
          totalFills: 20,
          filteredCount: 20
        }],
        totalNodes: 1,
        processedNodes: 1
      }));

      const result = await handler.handle('figma_fills', {
        operation: 'get',
        nodeId: 'dense-node'
      });

      expect(result.results[0].totalFills).toBe(20);
      expect(result.results[0].fills).toHaveLength(20);
    });
  });
});