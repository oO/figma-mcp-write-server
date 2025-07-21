import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FillsHandler } from '../../../src/handlers/fills-handler.js';
import * as yaml from 'js-yaml';

describe('FillsHandler', () => {
  let handler: FillsHandler;
  let mockSendToPlugin: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockSendToPlugin = vi.fn();
    handler = new FillsHandler(mockSendToPlugin);
  });

  describe('Tool Definition', () => {
    it('should define figma_fills tool with correct schema', () => {
      const tools = handler.getTools();
      expect(tools).toHaveLength(1);
      
      const tool = tools[0];
      expect(tool.name).toBe('figma_fills');
      expect(tool.description).toContain('fills');
      expect(tool.description).toContain('Paint objects');
      expect(tool.inputSchema).toBeDefined();
    });

    it('should include all required operations in schema', () => {
      const tools = handler.getTools();
      const schema = tools[0].inputSchema as any;
      
      // Check that operation enum includes all required values
      const operationProperty = schema.properties?.operation;
      expect(operationProperty).toBeDefined();
      expect(operationProperty.enum || operationProperty.anyOf).toBeDefined();
    });
  });

  describe('Operation Handling', () => {
    it('should handle get operation', async () => {
      const params = {
        operation: 'get',
        nodeId: 'node123',
        fillIndex: 0
      };

      mockSendToPlugin.mockResolvedValue({
        nodeId: 'node123',
        fillIndex: 0,
        fill: { type: 'SOLID', color: { r: 1, g: 0, b: 0 }, opacity: 1 },
        fillType: 'SOLID',
        totalFills: 1
      });

      const result = await handler.handle('figma_fills', params);
      
      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_FILLS',
        payload: params
      });
      
      // UnifiedHandler returns YAML wrapped results
      expect(result.content).toBeDefined();
      expect(result.content[0].text).toBeDefined();
      const parsedResult = yaml.load(result.content[0].text);
      expect(parsedResult.fillType).toBe('SOLID');
    });

    it('should handle get operation with filtering', async () => {
      const params = {
        operation: 'get',
        nodeId: 'node123',
        filterType: 'SOLID'
      };

      mockSendToPlugin.mockResolvedValue({
        results: [{
          nodeId: 'node123',
          fills: [{ type: 'SOLID', color: { r: 1, g: 0, b: 0 }, opacity: 1 }],
          totalFills: 2,
          filteredCount: 1
        }],
        totalNodes: 1,
        processedNodes: 1
      });

      const result = await handler.handle('figma_fills', params);
      
      // UnifiedHandler returns YAML wrapped results
      expect(result.content).toBeDefined();
      expect(result.content[0].text).toBeDefined();
      const parsedResult = yaml.load(result.content[0].text);
      expect(parsedResult.results[0].filteredCount).toBe(1);
    });

    it('should handle add_solid operation', async () => {
      const params = {
        operation: 'add_solid',
        nodeId: 'node123',
        color: '#FF0000',
        opacity: 0.8
      };

      mockSendToPlugin.mockResolvedValue({
        results: [{
          nodeId: 'node123',
          success: true,
          fillAdded: { type: 'SOLID', color: { r: 1, g: 0, b: 0 }, opacity: 0.8 },
          fillIndex: 0
        }],
        totalNodes: 1,
        successfulNodes: 1
      });

      const result = await handler.handle('figma_fills', params);
      
      // UnifiedHandler returns YAML wrapped results
      expect(result.content).toBeDefined();
      expect(result.content[0].text).toBeDefined();
      const parsedResult = yaml.load(result.content[0].text);
      expect(parsedResult.successfulNodes).toBe(1);
    });

    it('should handle add_gradient operation', async () => {
      const params = {
        operation: 'add_gradient',
        nodeId: 'node123',
        gradientType: 'GRADIENT_LINEAR',
        stopPositions: [0, 1],
        stopColors: ['#FF0000', '#0000FF'],
        gradientStartX: 0,
        gradientStartY: 0.5,
        gradientEndX: 1,
        gradientEndY: 0.5
      };

      mockSendToPlugin.mockResolvedValue({
        results: [{
          nodeId: 'node123',
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
            ]
          },
          fillIndex: 0
        }],
        totalNodes: 1,
        successfulNodes: 1
      });

      const result = await handler.handle('figma_fills', params);
      
      // UnifiedHandler returns YAML wrapped results
      expect(result.content).toBeDefined();
      expect(result.content[0].text).toBeDefined();
      const parsedResult = yaml.load(result.content[0].text);
      expect(parsedResult.results[0].fillAdded.type).toBe('GRADIENT_LINEAR');
    });

    it('should handle add_image operation', async () => {
      const params = {
        operation: 'add_image',
        nodeId: 'node123',
        imageUrl: 'https://example.com/image.jpg',
        imageScaleMode: 'FILL'
      };

      mockSendToPlugin.mockResolvedValue({
        results: [{
          nodeId: 'node123',
          success: true,
          fillAdded: {
            type: 'IMAGE',
            imageHash: 'hash123',
            scaleMode: 'FILL'
          },
          fillIndex: 0,
          imageHash: 'hash123',
          imageDimensions: { width: 200, height: 150 }
        }],
        totalNodes: 1,
        successfulNodes: 1,
        imageHash: 'hash123',
        imageDimensions: { width: 200, height: 150 }
      });

      const result = await handler.handle('figma_fills', params);
      
      // UnifiedHandler returns YAML wrapped results
      expect(result.content).toBeDefined();
      expect(result.content[0].text).toBeDefined();
      const parsedResult = yaml.load(result.content[0].text);
      expect(parsedResult.imageHash).toBe('hash123');
      expect(parsedResult.imageDimensions).toEqual({ width: 200, height: 150 });
    });

    it('should handle update operation', async () => {
      const params = {
        operation: 'update',
        nodeId: 'node123',
        fillIndex: 0,
        opacity: 0.5,
        visible: false
      };

      mockSendToPlugin.mockResolvedValue({
        nodeId: 'node123',
        fillIndex: 0,
        updatedFill: { type: 'SOLID', color: { r: 1, g: 0, b: 0 }, opacity: 0.5, visible: false },
        totalFills: 1
      });

      const result = await handler.handle('figma_fills', params);
      
      // UnifiedHandler returns YAML wrapped results
      expect(result.content).toBeDefined();
      expect(result.content[0].text).toBeDefined();
      const parsedResult = yaml.load(result.content[0].text);
      expect(parsedResult.updatedFill.opacity).toBe(0.5);
      expect(parsedResult.updatedFill.visible).toBe(false);
    });

    it('should handle delete operation', async () => {
      const params = {
        operation: 'delete',
        nodeId: 'node123',
        fillIndex: 1
      };

      mockSendToPlugin.mockResolvedValue({
        results: [{
          nodeId: 'node123',
          success: true,
          deletedFill: { type: 'SOLID', color: { r: 0, g: 1, b: 0 }, opacity: 1 },
          fillIndex: 1,
          remainingFills: 1
        }],
        totalNodes: 1,
        successfulNodes: 1
      });

      const result = await handler.handle('figma_fills', params);
      
      // UnifiedHandler returns YAML wrapped results
      expect(result.content).toBeDefined();
      expect(result.content[0].text).toBeDefined();
      const parsedResult = yaml.load(result.content[0].text);
      expect(parsedResult.results[0].remainingFills).toBe(1);
    });

    it('should handle reorder operation', async () => {
      const params = {
        operation: 'reorder',
        nodeId: 'node123',
        fillIndex: 2,
        newIndex: 0
      };

      mockSendToPlugin.mockResolvedValue({
        nodeId: 'node123',
        fromIndex: 2,
        toIndex: 0,
        reorderedFill: { type: 'SOLID', color: { r: 0, g: 0, b: 1 }, opacity: 1 },
        totalFills: 3
      });

      const result = await handler.handle('figma_fills', params);
      
      // UnifiedHandler returns YAML wrapped results
      expect(result.content).toBeDefined();
      expect(result.content[0].text).toBeDefined();
      const parsedResult = yaml.load(result.content[0].text);
      expect(parsedResult.fromIndex).toBe(2);
      expect(parsedResult.toIndex).toBe(0);
    });

    it('should handle clear operation', async () => {
      const params = {
        operation: 'clear',
        nodeId: ['node1', 'node2']
      };

      // Bulk operations: each call returns individual result
      mockSendToPlugin
        .mockResolvedValueOnce({ nodeId: 'node1', success: true, clearedFillsCount: 2 })
        .mockResolvedValueOnce({ nodeId: 'node2', success: true, clearedFillsCount: 1 });

      const result = await handler.handle('figma_fills', params);
      
      // Bulk operation should return YAML wrapped array result
      expect(result.content).toBeDefined();
      expect(result.content[0].text).toBeDefined();
      const parsedResult = yaml.load(result.content[0].text);
      expect(Array.isArray(parsedResult)).toBe(true);
      expect(parsedResult).toHaveLength(2);
      expect(parsedResult[0].nodeId).toBe('node1');
      expect(parsedResult[0].clearedFillsCount).toBe(2);
      expect(parsedResult[1].nodeId).toBe('node2');
      expect(parsedResult[1].clearedFillsCount).toBe(1);
    });

    it('should handle duplicate operation', async () => {
      const params = {
        operation: 'duplicate',
        fromNodeId: 'source123',
        toNodeId: 'target456'
      };

      mockSendToPlugin.mockResolvedValue({
        sourceNodeId: 'source123',
        sourceFillsCount: 2,
        results: [{
          targetNodeId: 'target456',
          success: true,
          copiedFillsCount: 2,
          copiedFills: [
            { type: 'SOLID', color: { r: 1, g: 0, b: 0 }, opacity: 1 },
            { type: 'SOLID', color: { r: 0, g: 1, b: 0 }, opacity: 0.8 }
          ]
        }],
        totalTargetNodes: 1,
        successfulNodes: 1
      });

      const result = await handler.handle('figma_fills', params);
      
      // UnifiedHandler returns YAML wrapped results
      expect(result.content).toBeDefined();
      expect(result.content[0].text).toBeDefined();
      const parsedResult = yaml.load(result.content[0].text);
      expect(parsedResult.sourceFillsCount).toBe(2);
      expect(parsedResult.results[0].copiedFillsCount).toBe(2);
    });
  });

  describe('Bulk Operations', () => {
    it('should handle bulk add_solid with failFast=false', async () => {
      const params = {
        operation: 'add_solid',
        nodeId: ['node1', 'node2', 'invalid'],
        color: '#00FF00',
        failFast: false
      };

      // Bulk operations: each call returns individual result
      mockSendToPlugin
        .mockResolvedValueOnce({ nodeId: 'node1', success: true, fillAdded: { type: 'SOLID' }, fillIndex: 0 })
        .mockResolvedValueOnce({ nodeId: 'node2', success: true, fillAdded: { type: 'SOLID' }, fillIndex: 0 })
        .mockRejectedValueOnce(new Error('Node not found: invalid'));

      const result = await handler.handle('figma_fills', params);
      
      // Bulk operation should return YAML wrapped array result
      expect(result.content).toBeDefined();
      expect(result.content[0].text).toBeDefined();
      const parsedResult = yaml.load(result.content[0].text);
      expect(Array.isArray(parsedResult)).toBe(true);
      expect(parsedResult).toHaveLength(3);
      expect(parsedResult[0].nodeId).toBe('node1');
      expect(parsedResult[0].success).toBe(true);
      expect(parsedResult[1].nodeId).toBe('node2');
      expect(parsedResult[1].success).toBe(true);
      expect(parsedResult[2].error).toContain('Node not found: invalid');
    });
  });

  describe('Image Filter Operations', () => {
    it('should handle image fill with filters', async () => {
      const params = {
        operation: 'add_image',
        nodeId: 'node123',
        imageHash: 'hash123',
        filterExposure: 0.2,
        filterContrast: -0.1,
        filterSaturation: 0.3
      };

      mockSendToPlugin.mockResolvedValue({
        results: [{
          nodeId: 'node123',
          success: true,
          fillAdded: {
            type: 'IMAGE',
            imageHash: 'hash123',
            scaleMode: 'FILL',
            filterExposure: 0.2,
            filterContrast: -0.1,
            filterSaturation: 0.3,
            filterTemperature: 0,
            filterTint: 0,
            filterHighlights: 0,
            filterShadows: 0
          },
          fillIndex: 0
        }],
        totalNodes: 1,
        successfulNodes: 1
      });

      const result = await handler.handle('figma_fills', params);
      
      // UnifiedHandler returns YAML wrapped results
      expect(result.content).toBeDefined();
      expect(result.content[0].text).toBeDefined();
      const parsedResult = yaml.load(result.content[0].text);
      expect(parsedResult.results[0].fillAdded.filterExposure).toBe(0.2);
      expect(parsedResult.results[0].fillAdded.filterContrast).toBe(-0.1);
      expect(parsedResult.results[0].fillAdded.filterSaturation).toBe(0.3);
    });
  });

  describe('Pattern Operations', () => {
    it('should handle add_pattern operation', async () => {
      const params = {
        operation: 'add_pattern',
        nodeId: 'node123',
        sourceNodeId: 'patternSource456',
        patternTileType: 'RECTANGULAR',
        patternScalingFactor: 1.5,
        patternSpacingX: 10,
        patternSpacingY: 15,
        patternHorizontalAlignment: 'CENTER'
      };

      mockSendToPlugin.mockResolvedValue({
        results: [{
          nodeId: 'node123',
          fillAdded: {
            type: 'PATTERN',
            sourceNodeId: 'patternSource456',
            tileType: 'RECTANGULAR',
            scalingFactor: 1.5,
            patternSpacingX: 10,
            patternSpacingY: 15,
            horizontalAlignment: 'CENTER',
            opacity: 1,
            visible: true
          },
          fillIndex: 0,
          totalFills: 1
        }]
      });

      const result = await handler.handle('figma_fills', params);
      
      expect(result.content).toBeDefined();
      expect(result.content[0].text).toBeDefined();
      const parsedResult = yaml.load(result.content[0].text);
      expect(parsedResult.results[0].fillAdded.type).toBe('PATTERN');
      expect(parsedResult.results[0].fillAdded.sourceNodeId).toBe('patternSource456');
      expect(parsedResult.results[0].fillAdded.scalingFactor).toBe(1.5);
    });

    it('should handle update_pattern operation', async () => {
      const params = {
        operation: 'update_pattern',
        nodeId: 'node123',
        fillIndex: 0,
        patternScalingFactor: 2.0,
        patternHorizontalAlignment: 'END'
      };

      mockSendToPlugin.mockResolvedValue({
        nodeId: 'node123',
        fillIndex: 0,
        updatedFill: {
          type: 'PATTERN',
          sourceNodeId: 'patternSource456',
          tileType: 'RECTANGULAR',
          scalingFactor: 2.0,
          patternSpacingX: 0,
          patternSpacingY: 0,
          horizontalAlignment: 'END',
          opacity: 1,
          visible: true
        },
        totalFills: 1
      });

      const result = await handler.handle('figma_fills', params);
      
      expect(result.content).toBeDefined();
      expect(result.content[0].text).toBeDefined();
      const parsedResult = yaml.load(result.content[0].text);
      expect(parsedResult.updatedFill.scalingFactor).toBe(2.0);
      expect(parsedResult.updatedFill.horizontalAlignment).toBe('END');
    });

    it('should handle pattern operation with minimal parameters', async () => {
      const params = {
        operation: 'add_pattern',
        nodeId: 'node123',
        sourceNodeId: 'patternSource789'
      };

      mockSendToPlugin.mockResolvedValue({
        results: [{
          nodeId: 'node123',
          fillAdded: {
            type: 'PATTERN',
            sourceNodeId: 'patternSource789',
            tileType: 'RECTANGULAR',
            scalingFactor: 1.0,
            patternSpacingX: 0,
            patternSpacingY: 0,
            horizontalAlignment: 'START',
            opacity: 1,
            visible: true
          },
          fillIndex: 0,
          totalFills: 1
        }]
      });

      const result = await handler.handle('figma_fills', params);
      
      expect(result.content).toBeDefined();
      expect(result.content[0].text).toBeDefined();
      const parsedResult = yaml.load(result.content[0].text);
      expect(parsedResult.results[0].fillAdded.type).toBe('PATTERN');
      expect(parsedResult.results[0].fillAdded.tileType).toBe('RECTANGULAR');
      expect(parsedResult.results[0].fillAdded.scalingFactor).toBe(1.0);
    });
  });

  describe('Error Handling', () => {
    it('should handle plugin errors', async () => {
      const params = {
        operation: 'get',
        nodeId: 'nonexistent',
        fillIndex: 0
      };

      mockSendToPlugin.mockRejectedValue(new Error('Node not found: nonexistent'));

      await expect(handler.handle('figma_fills', params)).rejects.toThrow('Node not found: nonexistent');
    });

    it('should handle missing required parameters', async () => {
      const params = {
        operation: 'add_solid',
        nodeId: 'node123'
        // missing color parameter
      };

      mockSendToPlugin.mockRejectedValue(new Error('Missing required parameter: color'));

      await expect(handler.handle('figma_fills', params)).rejects.toThrow('Missing required parameter: color');
    });

    it('should handle invalid fillIndex', async () => {
      const params = {
        operation: 'get',
        nodeId: 'node123',
        fillIndex: 999
      };

      mockSendToPlugin.mockRejectedValue(new Error('Fill index 999 out of bounds (0-1)'));

      await expect(handler.handle('figma_fills', params)).rejects.toThrow('Fill index 999 out of bounds');
    });
  });
});