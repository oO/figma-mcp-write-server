import { describe, test, expect, vi, beforeEach } from 'vitest';
import { SelectionHandler } from '@/handlers/selections-handler';

describe('SelectionHandler', () => {
  let selectionHandler: SelectionHandler;
  let mockSendToPlugin: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockSendToPlugin = vi.fn();
    selectionHandler = new SelectionHandler(mockSendToPlugin);
  });

  describe('getTools', () => {
    test('should return figma_selection tool', () => {
      const tools = selectionHandler.getTools();
      const toolNames = tools.map(tool => tool.name);
      
      expect(toolNames).toContain('figma_selection');
      expect(tools).toHaveLength(1);
    });

    test('should have correct tool schema with pageId parameter', () => {
      const tools = selectionHandler.getTools();
      const selectionTool = tools.find(tool => tool.name === 'figma_selection');
      
      expect(selectionTool).toBeDefined();
      expect(selectionTool?.inputSchema.properties).toHaveProperty('pageId');
      expect(selectionTool?.inputSchema.properties).toHaveProperty('nodeId');
      expect(selectionTool?.inputSchema.properties).toHaveProperty('operation');
      expect(selectionTool?.inputSchema.required).toContain('operation');
    });
  });

  describe('get_selection operation', () => {
    test('should return current selection', async () => {
      const mockResponse = {
        selection: [
          { id: 'node-1', name: 'Rectangle 1', type: 'RECTANGLE' },
          { id: 'node-2', name: 'Text 1', type: 'TEXT' }
        ],
        count: 2,
        detail: 'standard',
        focus: true,
        message: '2 node(s) selected'
      };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      const result = await selectionHandler.handle('figma_selection', {
        operation: 'get_selection'
      });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('Rectangle 1');
      expect(result.content[0].text).toContain('Text 1');
      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_SELECTION',
        payload: {
          operation: 'get_selection'
        }
      });
    });

    test('should handle empty selection', async () => {
      const mockResponse = {
        selection: [],
        count: 0,
        detail: 'standard',
        focus: true,
        message: '0 node(s) selected'
      };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      const result = await selectionHandler.handle('figma_selection', {
        operation: 'get_selection'
      });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('count: 0');
    });
  });

  describe('set_selection operation', () => {
    test('should set selection to specified nodes', async () => {
      const mockResponse = {
        selectedNodes: [
          { id: 'node-1', name: 'Rectangle 1', type: 'RECTANGLE' },
          { id: 'node-2', name: 'Text 1', type: 'TEXT' }
        ],
        count: 2,
        totalFound: 2,
        message: 'Selected 2 of 2 found node(s)'
      };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      const result = await selectionHandler.handle('figma_selection', {
        operation: 'set_selection',
        nodeId: ['node-1', 'node-2']
      });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('count: 2');
      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_SELECTION',
        payload: {
          operation: 'set_selection',
          nodeId: ['node-1', 'node-2']
        }
      });
    });

    test('should set selection with pageId parameter', async () => {
      const mockResponse = {
        selectedNodes: [{ id: 'node-1', name: 'Rectangle 1', type: 'RECTANGLE' }],
        count: 1,
        totalFound: 1,
        message: 'Selected 1 of 1 found node(s)'
      };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      const result = await selectionHandler.handle('figma_selection', {
        operation: 'set_selection',
        pageId: '123:0',
        filterByType: 'RECTANGLE'
      });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('count: 1');
      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_SELECTION',
        payload: {
          operation: 'set_selection',
          pageId: '123:0',
          filterByType: ['RECTANGLE']
        }
      });
    });

    test('should validate required operation parameter', async () => {
      await expect(selectionHandler.handle('figma_selection', {}))
        .rejects.toThrow('operation');
    });
  });

  describe('list_nodes operation', () => {
    test('should list nodes with pageId parameter', async () => {
      const mockResponse = {
        nodes: [
          { id: 'node-1', name: 'Rectangle 1', type: 'RECTANGLE' },
          { id: 'node-2', name: 'Text 1', type: 'TEXT' }
        ],
        totalCount: 2,
        topLevelCount: 2,
        detail: 'minimal'
      };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      const result = await selectionHandler.handle('figma_selection', {
        operation: 'list_nodes',
        pageId: '123:0',
        filterByType: 'TEXT'
      });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('totalCount: 2');
      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_SELECTION',
        payload: {
          operation: 'list_nodes',
          pageId: '123:0',
          filterByType: ['TEXT']
        }
      });
    });

    test('should use minimal detail when no filters applied', async () => {
      const mockResponse = {
        nodes: [{ id: 'node-1', name: 'Rectangle 1', parentId: 'page-1', type: 'RECTANGLE', visible: true }],
        totalCount: 1,
        topLevelCount: 1,
        detail: 'minimal'
      };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      const result = await selectionHandler.handle('figma_selection', {
        operation: 'list_nodes'
      });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('detail: minimal');
    });
  });

  describe('Error Handling', () => {
    test('should handle plugin connection errors', async () => {
      mockSendToPlugin.mockRejectedValue(new Error('Plugin not connected'));

      await expect(selectionHandler.handle('figma_selection', {
        operation: 'get_selection'
      })).rejects.toThrow('Plugin not connected');
    });

    test('should handle page not found errors', async () => {
      mockSendToPlugin.mockRejectedValue(new Error('Page not found: 999:0. Available pages: Page 1 (123:0), Page 2 (456:0)'));

      await expect(selectionHandler.handle('figma_selection', {
        operation: 'list_nodes',
        pageId: '999:0'
      })).rejects.toThrow('Page not found: 999:0');
    });

    test('should handle node not found errors', async () => {
      mockSendToPlugin.mockRejectedValue(new Error('Node not found in page "Page 1" (123:0): invalid-id'));

      await expect(selectionHandler.handle('figma_selection', {
        operation: 'list_nodes',
        pageId: '123:0',
        nodeId: 'invalid-id'
      })).rejects.toThrow('Node not found in page');
    });

    test('should handle global node not found errors', async () => {
      mockSendToPlugin.mockRejectedValue(new Error('Node not found: invalid-id'));

      await expect(selectionHandler.handle('figma_selection', {
        operation: 'list_nodes',
        nodeId: 'invalid-id'
      })).rejects.toThrow('Node not found: invalid-id');
    });

    test('should handle unknown tool names', async () => {
      await expect(selectionHandler.handle('unknown_tool', {}))
        .rejects.toThrow('Unknown tool: unknown_tool');
    });
  });

  describe('PageId Parameter Validation', () => {
    test('should accept valid pageId parameter', async () => {
      const mockResponse = {
        nodes: [],
        totalCount: 0,
        topLevelCount: 0,
        detail: 'minimal'
      };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      const result = await selectionHandler.handle('figma_selection', {
        operation: 'list_nodes',
        pageId: '123:0'
      });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('totalCount: 0');
      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_SELECTION',
        payload: {
          operation: 'list_nodes',
          pageId: '123:0'
        }
      });
    });

    test('should work without pageId (uses current page)', async () => {
      const mockResponse = {
        nodes: [{ id: 'node-1', name: 'Test', parentId: 'current-page', type: 'RECTANGLE', visible: true }],
        totalCount: 1,
        topLevelCount: 1,
        detail: 'minimal'
      };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      const result = await selectionHandler.handle('figma_selection', {
        operation: 'list_nodes'
      });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('totalCount: 1');
      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_SELECTION',
        payload: {
          operation: 'list_nodes'
        }
      });
    });
  });

  describe('Response Format', () => {
    test('should return YAML formatted response', async () => {
      const mockResponse = {
        selection: [{ id: 'node-1', name: 'Test', type: 'RECTANGLE' }],
        count: 1,
        detail: 'standard',
        focus: true,
        message: '1 node(s) selected'
      };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      const result = await selectionHandler.handle('figma_selection', {
        operation: 'get_selection'
      });

      expect(result.isError).toBe(false);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('selection:');
      expect(result.content[0].text).toContain('- id: node-1');
    });
  });
});