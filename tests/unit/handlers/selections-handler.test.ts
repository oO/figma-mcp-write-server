import { describe, test, expect, vi, beforeEach } from 'vitest';
import { SelectionHandler } from '@/handlers/selections-handler';

describe('SelectionHandlers', () => {
  let selectionHandler: SelectionHandler;
  let mockSendToPlugin: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockSendToPlugin = vi.fn();
    selectionHandler = new SelectionHandler(mockSendToPlugin);
  });

  describe('getTools', () => {
    test('should return selection-related tools', () => {
      const tools = selectionHandler.getTools();
      const toolNames = tools.map(tool => tool.name);
      
      expect(toolNames).toContain('get_selection');
      expect(toolNames).toContain('set_selection');
    });

    test('should have correct tool schemas', () => {
      const tools = selectionHandler.getTools();
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

      const result = await selectionHandler.handle('get_selection', {});

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

      const result = await selectionHandler.handle('get_selection', {});

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

      const result = await selectionHandler.handle('set_selection', {
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

      const result = await selectionHandler.handle('set_selection', {
        nodeIds: []
      });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('selectionCount: 0');
    });

    test('should validate nodeIds parameter', async () => {
      await expect(selectionHandler.handle('set_selection', {}))
        .rejects.toThrow('nodeIds');
    });

    test('should validate nodeIds is array', async () => {
      await expect(selectionHandler.handle('set_selection', {
        nodeIds: 'not-an-array'
      })).rejects.toThrow('array');
    });
  });

  describe('Error Handling', () => {
    test('should handle plugin connection errors', async () => {
      mockSendToPlugin.mockRejectedValue(new Error('Plugin not connected'));

      await expect(selectionHandler.handle('get_selection', {}))
        .rejects.toThrow('Plugin not connected');
    });

    test('should handle invalid node IDs', async () => {
      mockSendToPlugin.mockResolvedValue({
        success: false,
        error: 'Node not found: invalid-id'
      });

      await expect(selectionHandler.handle('set_selection', {
        nodeIds: ['invalid-id']
      })).rejects.toThrow('Node not found: invalid-id');
    });

    test('should handle unknown tool names', async () => {
      await expect(selectionHandler.handle('unknown_tool', {}))
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

      const result = await selectionHandler.handle('get_selection', {});

      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('selection:');
      expect(result.content[0].text).toContain('- id: node-1');
    });
  });
});