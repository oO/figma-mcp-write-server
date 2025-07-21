import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConstraintsHandler } from '../../../src/handlers/constraints-handler.js';
import * as yaml from 'js-yaml';

describe('ConstraintsHandler', () => {
  let handler: ConstraintsHandler;
  let mockSendToPlugin: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockSendToPlugin = vi.fn();
    handler = new ConstraintsHandler(mockSendToPlugin);
  });

  describe('getTools', () => {
    it('should return figma_constraints tool', () => {
      const tools = handler.getTools();
      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe('figma_constraints');
      expect(tools[0].description).toContain('Set, get, or reset layout constraints for nodes');
    });

    it('should support constraint operations', () => {
      const tools = handler.getTools();
      const schema = tools[0].inputSchema;
      const operations = schema.properties.operation.enum;
      
      expect(operations).toContain('get');
      expect(operations).toContain('set');
      expect(operations).toContain('reset');
    });

    it('should support bulk operations', () => {
      const tools = handler.getTools();
      const schema = tools[0].inputSchema;
      
      expect(schema.properties.nodeId.oneOf).toBeDefined();
      expect(schema.properties.horizontalConstraint.oneOf).toBeDefined();
      expect(schema.properties.verticalConstraint.oneOf).toBeDefined();
    });

    it('should require operation and nodeId', () => {
      const tools = handler.getTools();
      const schema = tools[0].inputSchema;
      
      expect(schema.required).toEqual(['operation', 'nodeId']);
    });
  });

  describe('handle', () => {
    it('should handle get operation', async () => {
      mockSendToPlugin.mockResolvedValue({
        nodeId: 'node123',
        horizontalConstraint: 'MIN',
        verticalConstraint: 'MAX'
      });

      const result = await handler.handle('figma_constraints', {
        operation: 'get',
        nodeId: 'node123'
      });

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_CONSTRAINTS',
        payload: expect.objectContaining({
          operation: 'get',
          nodeId: 'node123'
        })
      });

      // UnifiedHandler returns YAML wrapped results
      expect(result.content).toBeDefined();
      expect(result.content[0].text).toBeDefined();
      const parsedResult = yaml.load(result.content[0].text);
      expect(parsedResult.horizontalConstraint).toBe('MIN');
      expect(parsedResult.verticalConstraint).toBe('MAX');
    });

    it('should handle set operation', async () => {
      mockSendToPlugin.mockResolvedValue({
        nodeId: 'node123',
        horizontalConstraint: 'STRETCH',
        verticalConstraint: 'CENTER'
      });

      const result = await handler.handle('figma_constraints', {
        operation: 'set',
        nodeId: 'node123',
        horizontalConstraint: 'STRETCH',
        verticalConstraint: 'CENTER'
      });

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_CONSTRAINTS',
        payload: expect.objectContaining({
          operation: 'set',
          nodeId: 'node123',
          horizontalConstraint: 'STRETCH',
          verticalConstraint: 'CENTER'
        })
      });

      // UnifiedHandler returns YAML wrapped results
      expect(result.content).toBeDefined();
      expect(result.content[0].text).toBeDefined();
      const parsedResult = yaml.load(result.content[0].text);
      expect(parsedResult.horizontalConstraint).toBe('STRETCH');
      expect(parsedResult.verticalConstraint).toBe('CENTER');
    });

    it('should handle reset operation', async () => {
      mockSendToPlugin.mockResolvedValue({
        nodeId: 'node123',
        horizontalConstraint: 'MIN',
        verticalConstraint: 'MIN'
      });

      const result = await handler.handle('figma_constraints', {
        operation: 'reset',
        nodeId: 'node123'
      });

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_CONSTRAINTS',
        payload: expect.objectContaining({
          operation: 'reset',
          nodeId: 'node123'
        })
      });

      // UnifiedHandler returns YAML wrapped results
      expect(result.content).toBeDefined();
      expect(result.content[0].text).toBeDefined();
      const parsedResult = yaml.load(result.content[0].text);
      expect(parsedResult.horizontalConstraint).toBe('MIN');
      expect(parsedResult.verticalConstraint).toBe('MIN');
    });

    it('should handle bulk operations', async () => {
      // Bulk operations: each call returns individual result
      mockSendToPlugin
        .mockResolvedValueOnce({ nodeId: 'node1', horizontalConstraint: 'MIN', verticalConstraint: 'MAX' })
        .mockResolvedValueOnce({ nodeId: 'node2', horizontalConstraint: 'STRETCH', verticalConstraint: 'CENTER' });

      const result = await handler.handle('figma_constraints', {
        operation: 'set',
        nodeId: ['node1', 'node2'],
        horizontalConstraint: ['MIN', 'STRETCH'],
        verticalConstraint: ['MAX', 'CENTER']
      });

      expect(mockSendToPlugin).toHaveBeenCalledTimes(2);
      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_CONSTRAINTS',
        payload: expect.objectContaining({
          operation: 'set',
          nodeId: 'node1',
          horizontalConstraint: 'MIN',
          verticalConstraint: 'MAX'
        })
      });
      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_CONSTRAINTS',
        payload: expect.objectContaining({
          operation: 'set',
          nodeId: 'node2',
          horizontalConstraint: 'STRETCH',
          verticalConstraint: 'CENTER'
        })
      });

      // Bulk operation should return YAML wrapped array result
      expect(result.content).toBeDefined();
      expect(result.content[0].text).toBeDefined();
      const parsedResult = yaml.load(result.content[0].text);
      expect(Array.isArray(parsedResult)).toBe(true);
      expect(parsedResult).toHaveLength(2);
      expect(parsedResult[0].nodeId).toBe('node1');
      expect(parsedResult[0].horizontalConstraint).toBe('MIN');
      expect(parsedResult[1].nodeId).toBe('node2');
      expect(parsedResult[1].horizontalConstraint).toBe('STRETCH');
    });

    it('should handle constraint values', async () => {
      const constraintValues = ['MIN', 'MAX', 'STRETCH', 'CENTER', 'SCALE'];
      
      for (const horizontal of constraintValues) {
        for (const vertical of constraintValues) {
          mockSendToPlugin.mockResolvedValue({
            nodeId: 'node123',
            horizontalConstraint: horizontal,
            verticalConstraint: vertical
          });

          const result = await handler.handle('figma_constraints', {
            operation: 'set',
            nodeId: 'node123',
            horizontalConstraint: horizontal,
            verticalConstraint: vertical
          });

          // UnifiedHandler returns YAML wrapped results
          expect(result.content).toBeDefined();
          expect(result.content[0].text).toBeDefined();
          const parsedResult = yaml.load(result.content[0].text);
          expect(parsedResult.horizontalConstraint).toBe(horizontal);
          expect(parsedResult.verticalConstraint).toBe(vertical);
        }
      }
    });

    it('should handle failFast parameter', async () => {
      mockSendToPlugin
        .mockResolvedValueOnce({ nodeId: 'node1', horizontalConstraint: 'MIN', verticalConstraint: 'MAX' })
        .mockRejectedValueOnce(new Error('Node not found: node2'));

      const result = await handler.handle('figma_constraints', {
        operation: 'set',
        nodeId: ['node1', 'node2'],
        horizontalConstraint: 'MIN',
        verticalConstraint: 'MAX',
        failFast: false
      });

      // Bulk operation should return YAML wrapped array result
      expect(result.content).toBeDefined();
      expect(result.content[0].text).toBeDefined();
      const parsedResult = yaml.load(result.content[0].text);
      expect(Array.isArray(parsedResult)).toBe(true);
      expect(parsedResult).toHaveLength(2);
      expect(parsedResult[0].nodeId).toBe('node1');
      expect(parsedResult[1].error).toContain('Node not found: node2');
    });

    it('should reject unknown tool names', async () => {
      await expect(
        handler.handle('unknown_tool', { operation: 'get', nodeId: 'node123' })
      ).rejects.toThrow('Unknown tool: unknown_tool');
    });

    it('should validate required parameters', async () => {
      await expect(
        handler.handle('figma_constraints', {})
      ).rejects.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle plugin errors', async () => {
      const params = {
        operation: 'get',
        nodeId: 'nonexistent'
      };

      mockSendToPlugin.mockRejectedValue(new Error('Node not found: nonexistent'));

      await expect(handler.handle('figma_constraints', params)).rejects.toThrow('Node not found: nonexistent');
    });

    it('should handle missing required parameters', async () => {
      const params = {
        operation: 'set',
        nodeId: 'node123'
        // missing constraint parameters
      };

      mockSendToPlugin.mockRejectedValue(new Error('Missing required constraint parameters'));

      await expect(handler.handle('figma_constraints', params)).rejects.toThrow('Missing required constraint parameters');
    });

    it('should handle invalid constraint values', async () => {
      const params = {
        operation: 'set',
        nodeId: 'node123',
        horizontalConstraint: 'INVALID',
        verticalConstraint: 'MAX'
      };

      // Schema validation catches invalid constraints before reaching plugin
      await expect(handler.handle('figma_constraints', params)).rejects.toThrow('Validation failed');
    });
  });
});