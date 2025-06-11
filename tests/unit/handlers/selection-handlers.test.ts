import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { SelectionHandlers } from '../../../src/handlers/selection-handlers.js';

describe('SelectionHandlers', () => {
  let selectionHandlers: SelectionHandlers;
  let mockSendToPlugin: jest.Mock;

  beforeEach(() => {
    mockSendToPlugin = jest.fn();
    selectionHandlers = new SelectionHandlers(mockSendToPlugin);
  });

  describe('getTools', () => {
    test('should return selection-related tools', () => {
      const tools = selectionHandlers.getTools();
      const toolNames = tools.map(tool => tool.name);
      
      expect(toolNames).toContain('get_selection');
      expect(toolNames).toContain('set_selection');
    });

    test('should have correct tool schemas', () => {
      const tools = selectionHandlers.getTools();
      const getSelectionTool = tools.find(tool => tool.name === 'get_selection');
      const setSelectionTool = tools.find(tool => tool.name === 'set_selection');
      
      expect(getSelectionTool).toBeDefined();
      expect(setSelectionTool).toBeDefined();
      expect(setSelectionTool?.inputSchema.required).toContain('nodeIds');
    });
  });

  describe('getSelection', () => {
    test('should return current selection', async () => {
      const mockResponse = {
        success: true,
        data: {
          selection: [
            { id: 'node-1', name: 'Rectangle 1', type: 'RECTANGLE' },
            { id: 'node-2', name: 'Text 1', type: 'TEXT' }
          ],
          selectionCount: 2
        }
      };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      const result = await selectionHandlers.handle('get_selection', {});

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('Rectangle 1');
      expect(result.content[0].text).toContain('Text 1');
      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'GET_SELECTION',
        payload: {}
      });
    });

    test('should handle empty selection', async () => {
      const mockResponse = {
        success: true,
        data: {
          selection: [],
          selectionCount: 0
        }
      };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      const result = await selectionHandlers.handle('get_selection', {});

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('selectionCount: 0');
    });
  });

  describe('setSelection', () => {
    test('should set selection to specified nodes', async () => {
      const mockResponse = {
        success: true,
        data: {
          selectedNodeIds: ['node-1', 'node-2'],
          selectionCount: 2
        }
      };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      const result = await selectionHandlers.handle('set_selection', {
        nodeIds: ['node-1', 'node-2']
      });

      expect(result.isError).toBe(false);
      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'SET_SELECTION',
        payload: {
          nodeIds: ['node-1', 'node-2']
        }
      });
    });

    test('should clear selection when empty array provided', async () => {
      const mockResponse = {
        success: true,
        data: {
          selectedNodeIds: [],
          selectionCount: 0
        }
      };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      const result = await selectionHandlers.handle('set_selection', {
        nodeIds: []
      });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('selectionCount: 0');
    });

    test('should validate nodeIds parameter', async () => {
      await expect(selectionHandlers.handle('set_selection', {}))
        .rejects.toThrow('nodeIds');
    });

    test('should validate nodeIds is array', async () => {
      await expect(selectionHandlers.handle('set_selection', {
        nodeIds: 'not-an-array'
      })).rejects.toThrow('array');
    });
  });

  describe('Error Handling', () => {
    test('should handle plugin connection errors', async () => {
      mockSendToPlugin.mockRejectedValue(new Error('Plugin not connected'));

      await expect(selectionHandlers.handle('get_selection', {}))
        .rejects.toThrow('Plugin not connected');
    });

    test('should handle invalid node IDs', async () => {
      mockSendToPlugin.mockResolvedValue({
        success: false,
        error: 'Node not found: invalid-id'
      });

      await expect(selectionHandlers.handle('set_selection', {
        nodeIds: ['invalid-id']
      })).rejects.toThrow('Node not found: invalid-id');
    });

    test('should handle unknown tool names', async () => {
      await expect(selectionHandlers.handle('unknown_tool', {}))
        .rejects.toThrow('Unknown tool: unknown_tool');
    });
  });

  describe('Response Format', () => {
    test('should return YAML formatted response', async () => {
      const mockResponse = {
        success: true,
        data: {
          selection: [{ id: 'node-1', name: 'Test', type: 'RECTANGLE' }],
          selectionCount: 1
        }
      };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      const result = await selectionHandlers.handle('get_selection', {});

      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('selection:');
      expect(result.content[0].text).toContain('- id: node-1');
    });
  });
});