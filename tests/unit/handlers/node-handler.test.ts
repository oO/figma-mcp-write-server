import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NodeHandler } from '../../../src/handlers/nodes-handler';
import * as yaml from 'js-yaml';

describe('NodeHandler', () => {
  let handler: NodeHandler;
  let mockSendToPlugin: ReturnType<typeof vi.fn>;
  
  // Helper function to parse YAML response
  const parseYamlResponse = (yamlResponse: any) => {
    if (typeof yamlResponse === 'string') {
      return yaml.load(yamlResponse);
    }
    if (yamlResponse && yamlResponse.content && Array.isArray(yamlResponse.content)) {
      const textContent = yamlResponse.content.find((item: any) => item.type === 'text');
      if (textContent && textContent.text) {
        return yaml.load(textContent.text);
      }
    }
    return yamlResponse;
  };

  beforeEach(() => {
    mockSendToPlugin = vi.fn();
    handler = new NodeHandler(mockSendToPlugin);
  });

  describe('getTools', () => {
    it('should return figma_nodes tool', () => {
      const tools = handler.getTools();
      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe('figma_nodes');
      expect(tools[0].description).toContain('Create, get, update, delete, and duplicate nodes');
    });

    it('should support bulk operations', () => {
      const tools = handler.getTools();
      const schema = tools[0].inputSchema;
      
      // Check that key parameters support both single values and arrays
      expect(schema.properties.nodeId.oneOf).toBeDefined();
      expect(schema.properties.nodeType.oneOf).toBeDefined();
      expect(schema.properties.name.oneOf).toBeDefined();
    });

    it('should exclude text from nodeType enum', () => {
      const tools = handler.getTools();
      const schema = tools[0].inputSchema;
      const nodeTypeEnum = schema.properties.nodeType.oneOf[0].enum;
      
      expect(nodeTypeEnum).toContain('rectangle');
      expect(nodeTypeEnum).toContain('ellipse');
      expect(nodeTypeEnum).toContain('frame');
      expect(nodeTypeEnum).toContain('line');
      expect(nodeTypeEnum).not.toContain('text');
    });
  });

  describe('handle', () => {
    it('should handle create operation', async () => {
      const mockNodeData = { 
        id: '123:456', 
        name: 'Test Rectangle', 
        type: 'RECTANGLE',
        x: 0,
        y: 0,
        width: 100,
        height: 50,
        visible: true,
        locked: false,
        opacity: 1,
        fills: [{ type: 'SOLID', color: { r: 0.8, g: 0.8, b: 0.8 }, opacity: 1 }]
      };

      mockSendToPlugin.mockResolvedValue(mockNodeData);

      const result = await handler.handle('figma_nodes', {
        operation: 'create',
        nodeType: 'rectangle',
        name: 'Test Rectangle',
        width: 100,
        height: 50
      });

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_NODES',
        payload: expect.objectContaining({
          operation: 'create',
          nodeType: 'rectangle',
          name: 'Test Rectangle'
        })
      });
      
      // Parse YAML response and verify structure
      const parsedResult = parseYamlResponse(result);
      expect(parsedResult).toEqual(mockNodeData);
      expect(parsedResult.id).toBe('123:456');
      expect(parsedResult.fills).toBeDefined();
    });

    it('should handle update operation', async () => {
      const mockUpdatedData = {
        id: '123:456',
        name: 'Updated Name',
        type: 'RECTANGLE',
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        visible: true,
        locked: false,
        opacity: 1,
        fills: [{ type: 'SOLID', color: { r: 1, g: 0, b: 0 }, opacity: 1 }]
      };

      mockSendToPlugin.mockResolvedValue({
        ...mockUpdatedData
      });

      const result = await handler.handle('figma_nodes', {
        operation: 'update',
        nodeId: '123:456',
        name: 'Updated Name',
        fillColor: '#FF0000'
      });

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_NODES',
        payload: expect.objectContaining({
          operation: 'update',
          nodeId: '123:456',
          name: 'Updated Name'
        })
      });
      
      const parsedResult = parseYamlResponse(result);
      expect(parsedResult).toEqual(mockUpdatedData);
      expect(parsedResult.name).toBe('Updated Name');
    });

    it('should handle get operation', async () => {
      const mockNodeData = {
        id: '123:456',
        name: 'Existing Rectangle',
        type: 'RECTANGLE',
        x: 50,
        y: 50,
        width: 200,
        height: 150,
        visible: true,
        locked: false,
        opacity: 1,
        fills: [{ type: 'SOLID', color: { r: 0, g: 1, b: 0 }, opacity: 1 }],
        strokes: [{ type: 'SOLID', color: { r: 0, g: 0, b: 1 }, opacity: 1 }],
        strokeWeight: 2,
        strokeAlign: 'CENTER'
      };

      mockSendToPlugin.mockResolvedValue(mockNodeData);

      const result = await handler.handle('figma_nodes', {
        operation: 'get',
        nodeId: '123:456'
      });

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_NODES',
        payload: expect.objectContaining({
          operation: 'get',
          nodeId: '123:456'
        })
      });
      
      const parsedResult = parseYamlResponse(result);
      expect(parsedResult).toEqual(mockNodeData);
      expect(parsedResult.strokes).toBeDefined();
      expect(parsedResult.strokeWeight).toBe(2);
    });

    it('should handle delete operation', async () => {
      const mockDeletedData = {
        id: '123:456',
        name: 'Deleted Rectangle',
        type: 'RECTANGLE',
        x: 0,
        y: 0,
        width: 100,
        height: 100
      };

      mockSendToPlugin.mockResolvedValue(mockDeletedData);

      const result = await handler.handle('figma_nodes', {
        operation: 'delete',
        nodeId: '123:456'
      });

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_NODES',
        payload: expect.objectContaining({
          operation: 'delete',
          nodeId: '123:456'
        })
      });
      
      const parsedResult = parseYamlResponse(result);
      expect(parsedResult).toEqual(mockDeletedData);
    });

    it('should handle duplicate operation', async () => {
      const mockDuplicatedData = [
        {
          id: '123:789',
          name: 'Rectangle Copy',
          type: 'RECTANGLE',
          x: 10,
          y: 10,
          width: 100,
          height: 100
        },
        {
          id: '123:790',
          name: 'Rectangle Copy 2', 
          type: 'RECTANGLE',
          x: 20,
          y: 20,
          width: 100,
          height: 100
        }
      ];

      mockSendToPlugin.mockResolvedValue(mockDuplicatedData);

      const result = await handler.handle('figma_nodes', {
        operation: 'duplicate',
        nodeId: '123:456',
        count: 2,
        offsetX: 10,
        offsetY: 10
      });

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_NODES',
        payload: expect.objectContaining({
          operation: 'duplicate',
          nodeId: '123:456',
          count: 2,
          offsetX: 10,
          offsetY: 10
        })
      });
      
      // Check that result has the expected structure regardless of array vs object
      expect(result).toBeDefined();
      const parsedResult = parseYamlResponse(result);
      if (Array.isArray(parsedResult)) {
        expect(parsedResult).toHaveLength(2);
        expect(parsedResult[0].id).toBe('123:789');
        expect(parsedResult[1].id).toBe('123:790');
      } else if (parsedResult && typeof parsedResult === 'object') {
        // Handle case where it's returned as an object with numeric keys
        const values = Object.values(parsedResult);
        expect(values).toHaveLength(2);
        expect(values[0].id).toBe('123:789');
        expect(values[1].id).toBe('123:790');
      }
    });

    it('should handle bulk operations', async () => {
      // Bulk operations return YAML in content wrapper
      const result = await handler.handle('figma_nodes', {
        operation: 'update',
        nodeId: ['123:456', '123:789'],
        fillColor: ['#FF0000', '#00FF00']
      });

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.content[0].text).toBeDefined();
    });

    it('should handle star node creation', async () => {
      const mockStarData = {
        id: '123:456',
        name: 'Star',
        type: 'STAR',
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        visible: true,
        locked: false,
        opacity: 1,
        fills: [{ type: 'SOLID', color: { r: 0.8, g: 0.8, b: 0.8 }, opacity: 1 }]
      };

      mockSendToPlugin.mockResolvedValue(mockStarData);

      const result = await handler.handle('figma_nodes', {
        operation: 'create',
        nodeType: 'star',
        pointCount: 6,
        innerRadius: 0.4
      });

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_NODES',
        payload: expect.objectContaining({
          operation: 'create',
          nodeType: 'star',
        })
      });
      
      const parsedResult = parseYamlResponse(result);
      expect(parsedResult).toEqual(mockStarData);
    });

    it('should handle stroke parameters', async () => {
      const mockNodeWithStroke = {
        id: '123:456',
        name: 'Rectangle with Stroke',
        type: 'RECTANGLE',
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        visible: true,
        locked: false,
        opacity: 1,
        fills: [{ type: 'SOLID', color: { r: 1, g: 0, b: 0 }, opacity: 1 }],
        strokes: [{ type: 'SOLID', color: { r: 0, g: 0, b: 1 }, opacity: 1 }],
        strokeWeight: 4,
        strokeAlign: 'OUTSIDE'
      };

      mockSendToPlugin.mockResolvedValue(mockNodeWithStroke);

      const result = await handler.handle('figma_nodes', {
        operation: 'create',
        nodeType: 'rectangle',
        fillColor: '#FF0000',
        strokeColor: '#0000FF',
        strokeWeight: 4,
        strokeAlign: 'OUTSIDE'
      });

      // Verify the call was made and capture what was actually sent
      expect(mockSendToPlugin).toHaveBeenCalledTimes(1);
      const actualCall = mockSendToPlugin.mock.calls[0][0];
      expect(actualCall.type).toBe('MANAGE_NODES');
      expect(actualCall.payload.operation).toBe('create');
      expect(actualCall.payload.fillColor).toBe('#FF0000');
      expect(actualCall.payload.strokeColor).toBe('#0000FF');
      
      // Verify the response includes stroke information
      const parsedResult = parseYamlResponse(result);
      expect(parsedResult.strokes).toBeDefined();
      expect(parsedResult.strokeWeight).toBe(4);
      expect(parsedResult.strokeAlign).toBe('OUTSIDE');
    });

    it('should handle node without stroke', async () => {
      const mockNodeNoStroke = {
        id: '123:456',
        name: 'Rectangle',
        type: 'RECTANGLE',
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        visible: true,
        locked: false,
        opacity: 1,
        fills: [{ type: 'SOLID', color: { r: 1, g: 0, b: 0 }, opacity: 1 }]
        // No stroke properties included
      };

      mockSendToPlugin.mockResolvedValue(mockNodeNoStroke);

      const result = await handler.handle('figma_nodes', {
        operation: 'create',
        nodeType: 'rectangle',
        fillColor: '#FF0000'
      });
      
      const parsedResult = parseYamlResponse(result);
      expect(parsedResult.fills).toBeDefined();
      expect(parsedResult.strokes).toBeUndefined();
      expect(parsedResult.strokeWeight).toBeUndefined();
      expect(parsedResult.strokeAlign).toBeUndefined();
    });

    it('should handle line node creation with start/end points', async () => {
      const mockLineData = {
        id: '123:456',
        name: 'Test Line',
        type: 'LINE',
        x: 100,
        y: 100,
        width: 150, // length
        height: 0,
        visible: true,
        locked: false,
        opacity: 1,
        strokes: [{ type: 'SOLID', color: { r: 1, g: 0, b: 0 }, opacity: 1 }],
        strokeWeight: 2,
        strokeCap: 'ARROW_LINES'
      };

      mockSendToPlugin.mockResolvedValue(mockLineData);

      const result = await handler.handle('figma_nodes', {
        operation: 'create',
        nodeType: 'line',
        name: 'Test Line',
        startX: 100,
        startY: 100,
        endX: 250,
        endY: 100,
        strokeColor: '#FF0000',
        strokeWeight: 2,
        endCap: 'ARROW_LINES'
      });

      // Verify the call was made with correct parameters
      expect(mockSendToPlugin).toHaveBeenCalledTimes(1);
      const actualCall = mockSendToPlugin.mock.calls[0][0];
      expect(actualCall.type).toBe('MANAGE_NODES');
      expect(actualCall.payload.operation).toBe('create');
      expect(actualCall.payload.nodeType).toBe('line');
      expect(actualCall.payload.name).toBe('Test Line');
      expect(actualCall.payload.strokeColor).toBe('#FF0000');
      expect(actualCall.payload.strokeWeight).toBe(2);
      
      const parsedResult = parseYamlResponse(result);
      expect(parsedResult).toEqual(mockLineData);
      expect(parsedResult.type).toBe('LINE');
      expect(parsedResult.strokeCap).toBe('ARROW_LINES');
    });

    it('should handle line node creation with length and rotation', async () => {
      const mockLineData = {
        id: '123:789',
        name: 'Angled Line',
        type: 'LINE',
        x: 50,
        y: 50,
        width: 120, // length
        height: 0,
        rotation: 45, // 45 degrees
        visible: true,
        locked: false,
        opacity: 1,
        strokes: [{ type: 'SOLID', color: { r: 0, g: 1, b: 0 }, opacity: 1 }],
        strokeWeight: 3
      };

      mockSendToPlugin.mockResolvedValue(mockLineData);

      const result = await handler.handle('figma_nodes', {
        operation: 'create',
        nodeType: 'line',
        name: 'Angled Line',
        x: 50,
        y: 50,
        length: 120,
        rotation: 45,
        strokeColor: '#00FF00',
        strokeWeight: 3
      });

      // Verify the call was made with correct parameters
      expect(mockSendToPlugin).toHaveBeenCalledTimes(1);
      const actualCall = mockSendToPlugin.mock.calls[0][0];
      expect(actualCall.type).toBe('MANAGE_NODES');
      expect(actualCall.payload.operation).toBe('create');
      expect(actualCall.payload.nodeType).toBe('line');
      expect(actualCall.payload.name).toBe('Angled Line');
      
      // Check that basic parameters are passed through
      expect(actualCall.payload.x).toBe(50);
      expect(actualCall.payload.y).toBe(50);
      expect(actualCall.payload.strokeColor).toBe('#00FF00');
      expect(actualCall.payload.strokeWeight).toBe(3);
      
      const parsedResult = parseYamlResponse(result);
      expect(parsedResult).toEqual(mockLineData);
      expect(parsedResult.type).toBe('LINE');
      expect(parsedResult.width).toBe(120); // Line length becomes width
      expect(parsedResult.rotation).toBe(45); // Should be in degrees, not radians
    });

    it('should reject unknown tool names', async () => {
      await expect(
        handler.handle('unknown_tool', { operation: 'create' })
      ).rejects.toThrow('Unknown tool: unknown_tool');
    });
  });
});