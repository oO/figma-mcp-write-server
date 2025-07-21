import { AlignmentHandler } from '@/handlers/alignment-handler';
import { ManageAlignmentSchema } from '@/types/layout-operations';
import { describe, expect, test, beforeEach, vi } from 'vitest';

describe('AlignmentHandler', () => {
  let handler: AlignmentHandler;
  let mockSendToPlugin: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockSendToPlugin = vi.fn();
    handler = new AlignmentHandler(mockSendToPlugin);
  });

  describe('Tool Registration', () => {
    test('should register figma_alignment tool', () => {
      const tools = handler.getTools();
      const alignmentTool = tools.find(tool => tool.name === 'figma_alignment');
      
      expect(alignmentTool).toBeDefined();
      expect(alignmentTool?.description).toContain('Align, position, or distribute nodes');
    });

    test('should have correct tool schema', () => {
      const tools = handler.getTools();
      const alignmentTool = tools.find(tool => tool.name === 'figma_alignment');
      
      expect(alignmentTool?.inputSchema.required).toEqual(['nodeIds']);
      expect(alignmentTool?.inputSchema.properties.nodeIds.type).toBe('array');
    });
  });

  describe('Schema Validation', () => {
    test('should validate required nodeIds parameter', () => {
      expect(() => {
        ManageAlignmentSchema.parse({});
      }).toThrow();
    });

    test('should accept valid alignment parameters', () => {
      const validParams = {
        nodeIds: ['node1', 'node2'],
        horizontalOperation: 'align' as const,
        horizontalDirection: 'center' as const,
        verticalOperation: 'distribute' as const,
        verticalDirection: 'middle' as const,
        referenceMode: 'bounds' as const
      };

      expect(() => {
        ManageAlignmentSchema.parse(validParams);
      }).not.toThrow();
    });

    test('should reject invalid operation types', () => {
      const invalidParams = {
        nodeIds: ['node1'],
        horizontalOperation: 'invalid'
      };

      expect(() => {
        ManageAlignmentSchema.parse(invalidParams);
      }).toThrow();
    });

    test('should reject invalid direction types', () => {
      const invalidParams = {
        nodeIds: ['node1'],
        horizontalDirection: 'invalid'
      };

      expect(() => {
        ManageAlignmentSchema.parse(invalidParams);
      }).toThrow();
    });

    test('should set default reference mode to bounds', () => {
      const params = {
        nodeIds: ['node1', 'node2']
      };

      const parsed = ManageAlignmentSchema.parse(params);
      expect(parsed.referenceMode).toBe('bounds');
    });

    test('should accept valid reference points', () => {
      const validHorizontalPoints = ['left', 'center', 'right'];
      const validVerticalPoints = ['top', 'middle', 'bottom'];
      
      validHorizontalPoints.forEach(point => {
        const params = {
          nodeIds: ['node1'],
          horizontalReferencePoint: point as any
        };

        expect(() => {
          ManageAlignmentSchema.parse(params);
        }).not.toThrow();
      });

      validVerticalPoints.forEach(point => {
        const params = {
          nodeIds: ['node1'],
          verticalReferencePoint: point as any
        };

        expect(() => {
          ManageAlignmentSchema.parse(params);
        }).not.toThrow();
      });
    });

    test('should accept valid alignment points', () => {
      const validHorizontalPoints = ['left', 'center', 'right'];
      const validVerticalPoints = ['top', 'middle', 'bottom'];
      
      validHorizontalPoints.forEach(point => {
        const params = {
          nodeIds: ['node1'],
          horizontalAlignmentPoint: point as any
        };

        expect(() => {
          ManageAlignmentSchema.parse(params);
        }).not.toThrow();
      });

      validVerticalPoints.forEach(point => {
        const params = {
          nodeIds: ['node1'],
          verticalAlignmentPoint: point as any
        };

        expect(() => {
          ManageAlignmentSchema.parse(params);
        }).not.toThrow();
      });
    });

    test('should reject invalid reference points', () => {
      const params = {
        nodeIds: ['node1'],
        horizontalReferencePoint: 'invalid'
      };

      expect(() => {
        ManageAlignmentSchema.parse(params);
      }).toThrow();
    });
  });

  describe('Handler Execution', () => {
    test('should handle basic center alignment', async () => {
      const params = {
        nodeIds: ['node1', 'node2'],
        horizontalOperation: 'align' as const,
        horizontalDirection: 'center' as const,
        verticalOperation: 'align' as const,
        verticalDirection: 'middle' as const
      };

      mockSendToPlugin.mockResolvedValue({
        success: true,
        data: {
          operation: 'manage_alignment',
          results: [
            {
              nodeId: 'node1',
              name: 'Rectangle 1',
              operation: 'align/align',
              newPosition: { x: 100, y: 150 },
              originalPosition: { x: 50, y: 100 }
            },
            {
              nodeId: 'node2',
              name: 'Rectangle 2',
              operation: 'align/align',
              newPosition: { x: 100, y: 150 },
              originalPosition: { x: 200, y: 200 }
            }
          ],
          totalNodes: 2,
          message: 'Aligned 2 nodes'
        }
      });

      const result = await handler.handle('figma_alignment', params);

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_ALIGNMENT',
        payload: {
          horizontalOperation: 'align',
          horizontalDirection: 'center',
          horizontalReferencePoint: undefined,
          horizontalAlignmentPoint: undefined,
          horizontalSpacing: undefined,
          verticalOperation: 'align',
          verticalDirection: 'middle',
          verticalReferencePoint: undefined,
          verticalAlignmentPoint: undefined,
          verticalSpacing: undefined,
          nodeIds: ['node1', 'node2'],
          referenceMode: 'bounds',
          referenceNodeId: undefined,
          margin: undefined
        }
      });

      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
    });

    test('should handle position operation with spacing', async () => {
      const params = {
        nodeIds: ['circle1'],
        horizontalOperation: 'position' as const,
        horizontalDirection: 'right' as const,
        horizontalSpacing: 20,
        verticalOperation: 'align' as const,
        verticalDirection: 'middle' as const,
        referenceMode: 'relative' as const,
        referenceNodeId: 'rectangle1'
      };

      mockSendToPlugin.mockResolvedValue({
        success: true,
        data: {
          operation: 'manage_alignment',
          results: [{
            nodeId: 'circle1',
            name: 'Circle',
            operation: 'position/align',
            newPosition: { x: 220, y: 100 },
            originalPosition: { x: 50, y: 80 }
          }],
          totalNodes: 1,
          message: 'Aligned 1 node'
        }
      });

      const result = await handler.handle('figma_alignment', params);

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_ALIGNMENT',
        payload: {
          horizontalOperation: 'position',
          horizontalDirection: 'right',
          horizontalReferencePoint: undefined,
          horizontalAlignmentPoint: undefined,
          horizontalSpacing: 20,
          verticalOperation: 'align',
          verticalDirection: 'middle',
          verticalReferencePoint: undefined,
          verticalAlignmentPoint: undefined,
          verticalSpacing: undefined,
          nodeIds: ['circle1'],
          referenceMode: 'relative',
          referenceNodeId: 'rectangle1',
          margin: undefined
        }
      });

      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
    });

    test('should handle distribute operation', async () => {
      const params = {
        nodeIds: ['node1', 'node2', 'node3'],
        horizontalOperation: 'distribute' as const,
        horizontalDirection: 'center' as const,
        horizontalSpacing: 50
      };

      mockSendToPlugin.mockResolvedValue({
        success: true,
        data: {
          operation: 'manage_alignment',
          results: [
            {
              nodeId: 'node1',
              name: 'Shape 1',
              operation: 'distribute/none',
              newPosition: { x: 0, y: 100 },
              originalPosition: { x: 0, y: 100 }
            },
            {
              nodeId: 'node2',
              name: 'Shape 2',
              operation: 'distribute/none',
              newPosition: { x: 100, y: 100 },
              originalPosition: { x: 150, y: 100 }
            },
            {
              nodeId: 'node3',
              name: 'Shape 3',
              operation: 'distribute/none',
              newPosition: { x: 200, y: 100 },
              originalPosition: { x: 250, y: 100 }
            }
          ],
          totalNodes: 3,
          message: 'Aligned 3 nodes'
        }
      });

      const result = await handler.handle('figma_alignment', params);

      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_ALIGNMENT',
        payload: {
          horizontalOperation: 'distribute',
          horizontalDirection: 'center',
          horizontalReferencePoint: undefined,
          horizontalAlignmentPoint: undefined,
          horizontalSpacing: 50,
          verticalOperation: undefined,
          verticalDirection: undefined,
          verticalReferencePoint: undefined,
          verticalAlignmentPoint: undefined,
          verticalSpacing: undefined,
          nodeIds: ['node1', 'node2', 'node3'],
          referenceMode: 'bounds',
          referenceNodeId: undefined,
          margin: undefined
        }
      });
    });

    test('should handle plugin errors gracefully', async () => {
      const params = {
        nodeIds: ['invalid-node'],
        horizontalOperation: 'align' as const,
        horizontalDirection: 'center' as const
      };

      mockSendToPlugin.mockResolvedValue({
        success: false,
        error: 'Node invalid-node not found'
      });

      await expect(handler.handle('figma_alignment', params))
        .rejects.toThrow('Node invalid-node not found');
    });

    test('should handle plugin connection errors', async () => {
      const params = {
        nodeIds: ['node1'],
        horizontalOperation: 'align' as const,
        horizontalDirection: 'center' as const
      };

      mockSendToPlugin.mockRejectedValue(new Error('Connection failed'));

      await expect(handler.handle('figma_alignment', params))
        .rejects.toThrow('Connection failed');
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty nodeIds array', async () => {
      const params = {
        nodeIds: [],
        horizontalOperation: 'align' as const,
        horizontalDirection: 'center' as const
      };

      // Should validate but let plugin handle the empty array
      expect(() => {
        ManageAlignmentSchema.parse(params);
      }).not.toThrow();
    });

    test('should handle operations without direction', () => {
      const params = {
        nodeIds: ['node1'],
        horizontalOperation: 'align' as const
        // Missing horizontalDirection
      };

      expect(() => {
        ManageAlignmentSchema.parse(params);
      }).not.toThrow();
    });

    test('should handle key_object mode without reference node', () => {
      const params = {
        nodeIds: ['node1'],
        referenceMode: 'key_object' as const
        // Missing referenceNodeId - plugin should handle this error
      };

      expect(() => {
        ManageAlignmentSchema.parse(params);
      }).not.toThrow();
    });

    test('should validate nodes with different parents should error', async () => {
      const params = {
        nodeIds: ['node-in-frame-a', 'node-in-frame-b'],
        horizontalOperation: 'align' as const,
        horizontalDirection: 'center' as const
      };

      mockSendToPlugin.mockResolvedValue({
        success: false,
        error: 'All nodes must share the same parent for alignment operations. Node node-in-frame-b has a different parent.'
      });

      await expect(handler.handle('figma_alignment', params))
        .rejects.toThrow('All nodes must share the same parent for alignment operations');
    });
  });

  describe('Complex Scenarios', () => {
    test('should handle mixed horizontal and vertical operations', async () => {
      const params = {
        nodeIds: ['text1'],
        horizontalOperation: 'align' as const,
        horizontalDirection: 'center' as const,
        verticalOperation: 'align' as const,
        verticalDirection: 'middle' as const,
        referenceMode: 'bounds' as const
      };

      mockSendToPlugin.mockResolvedValue({
        success: true,
        data: {
          operation: 'manage_alignment',
          results: [{
            nodeId: 'text1',
            name: 'Text Node',
            operation: 'align/align',
            newPosition: { x: 160, y: 120 },
            originalPosition: { x: 100, y: 100 }
          }],
          totalNodes: 1,
          referenceBounds: {
            x: 100, y: 100, width: 200, height: 100,
            left: 100, right: 300, top: 100, bottom: 200,
            centerX: 200, centerY: 150
          },
          message: 'Aligned 1 node'
        }
      });

      const result = await handler.handle('figma_alignment', params);
      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
    });

    test('should handle single node alignment to parent frame', async () => {
      const params = {
        nodeIds: ['child-element'],
        horizontalOperation: 'align' as const,
        horizontalDirection: 'center' as const,
        verticalOperation: 'align' as const,
        verticalDirection: 'middle' as const,
        referenceMode: 'bounds' as const
      };

      mockSendToPlugin.mockResolvedValue({
        success: true,
        data: {
          operation: 'manage_alignment',
          results: [{
            nodeId: 'child-element',
            name: 'Child Element',
            operation: 'align/align',
            newPosition: { x: 300, y: 200 }, // Centered in parent frame
            originalPosition: { x: 50, y: 50 }
          }],
          totalNodes: 1,
          referenceBounds: {
            x: 0, y: 0, width: 600, height: 400, // Parent frame bounds
            left: 0, right: 600, top: 0, bottom: 400,
            centerX: 300, centerY: 200
          },
          message: 'Aligned 1 node'
        }
      });

      const result = await handler.handle('figma_alignment', params);
      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
    });

    test('should handle reference point and alignment point alignment', async () => {
      const params = {
        nodeIds: ['circle1'],
        horizontalOperation: 'align' as const,
        horizontalReferencePoint: 'left' as const,
        horizontalAlignmentPoint: 'center' as const,
        verticalOperation: 'align' as const,
        verticalReferencePoint: 'middle' as const,
        verticalAlignmentPoint: 'middle' as const,
        referenceMode: 'relative' as const,
        referenceNodeId: 'rectangle1'
      };

      mockSendToPlugin.mockResolvedValue({
        success: true,
        data: {
          operation: 'manage_alignment',
          results: [{
            nodeId: 'circle1',
            name: 'Circle',
            operation: 'align/align',
            newPosition: { x: 50, y: 100 }, // Circle's center aligned to rectangle's left edge
            originalPosition: { x: 100, y: 100 }
          }],
          totalNodes: 1,
          message: 'Aligned 1 node'
        }
      });

      const result = await handler.handle('figma_alignment', params);

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_ALIGNMENT',
        payload: {
          horizontalOperation: 'align',
          horizontalDirection: undefined,
          horizontalReferencePoint: 'left',
          horizontalAlignmentPoint: 'center',
          horizontalSpacing: undefined,
          verticalOperation: 'align',
          verticalDirection: undefined,
          verticalReferencePoint: 'middle',
          verticalAlignmentPoint: 'middle',
          verticalSpacing: undefined,
          nodeIds: ['circle1'],
          referenceMode: 'relative',
          referenceNodeId: 'rectangle1',
          margin: undefined
        }
      });

      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
    });

    test('should handle single-node parent alignment', async () => {
      const params = {
        nodeIds: ['textNode'],
        horizontalOperation: 'align' as const,
        horizontalDirection: 'center' as const,
        verticalOperation: 'align' as const,
        verticalDirection: 'middle' as const,
        referenceMode: 'bounds' as const
      };

      mockSendToPlugin.mockResolvedValue({
        success: true,
        data: {
          operation: 'manage_alignment',
          results: [{
            nodeId: 'textNode',
            name: 'Text',
            operation: 'align/align',
            newPosition: { x: 125, y: 90 }, // Centered within parent frame
            originalPosition: { x: 50, y: 50 }
          }],
          totalNodes: 1,
          referenceBounds: {
            x: 0, y: 0, width: 300, height: 200, // Parent frame bounds in relative coordinates
            left: 0, right: 300, top: 0, bottom: 200,
            centerX: 150, centerY: 100
          },
          message: 'Aligned 1 node'
        }
      });

      const result = await handler.handle('figma_alignment', params);

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_ALIGNMENT',
        payload: {
          horizontalOperation: 'align',
          horizontalDirection: 'center',
          horizontalReferencePoint: undefined,
          horizontalAlignmentPoint: undefined,
          horizontalSpacing: undefined,
          verticalOperation: 'align',
          verticalDirection: 'middle',
          verticalReferencePoint: undefined,
          verticalAlignmentPoint: undefined,
          verticalSpacing: undefined,
          nodeIds: ['textNode'],
          referenceMode: 'bounds',
          referenceNodeId: undefined,
          margin: undefined
        }
      });

      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
    });

    test('should handle all alignment directions', async () => {
      const directions = [
        { horizontal: 'left', vertical: 'top' },
        { horizontal: 'center', vertical: 'middle' },
        { horizontal: 'right', vertical: 'bottom' }
      ];

      for (const direction of directions) {
        const params = {
          nodeIds: ['testNode'],
          horizontalOperation: 'align' as const,
          horizontalDirection: direction.horizontal as any,
          verticalOperation: 'align' as const,
          verticalDirection: direction.vertical as any
        };

        mockSendToPlugin.mockResolvedValue({
          success: true,
          data: {
            operation: 'manage_alignment',
            results: [{
              nodeId: 'testNode',
              name: 'Test Node',
              operation: 'align/align',
              newPosition: { x: 100, y: 100 },
              originalPosition: { x: 50, y: 50 }
            }],
            totalNodes: 1,
            message: 'Aligned 1 node'
          }
        });

        const result = await handler.handle('figma_alignment', params);
        expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
      }
    });
  });
});