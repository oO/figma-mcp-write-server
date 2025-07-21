import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PagesHandler } from '../../../src/handlers/pages-handler';
import * as yaml from 'js-yaml';

describe('PagesHandler', () => {
  let handler: PagesHandler;
  let mockSendToPlugin: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockSendToPlugin = vi.fn();
    handler = new PagesHandler(mockSendToPlugin);
  });

  describe('getTools', () => {
    it('should return figma_pages tool', () => {
      const tools = handler.getTools();
      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe('figma_pages');
      expect(tools[0].description).toContain('Manage document pages with CRUD operations');
    });

    it('should support all page operations', () => {
      const tools = handler.getTools();
      const schema = tools[0].inputSchema;
      const operations = schema.properties.operation.enum;
      
      expect(operations).toContain('list');
      expect(operations).toContain('get');
      expect(operations).toContain('create');
      expect(operations).toContain('update');
      expect(operations).toContain('delete');
      expect(operations).toContain('duplicate');
      expect(operations).toContain('switch');
      expect(operations).toContain('reorder');
      expect(operations).toContain('create_divider');
      expect(operations).toContain('get_current');
    });

    it('should support bulk operations', () => {
      const tools = handler.getTools();
      const schema = tools[0].inputSchema;
      
      expect(schema.properties.pageId.oneOf).toBeDefined();
      expect(schema.properties.name.oneOf).toBeDefined();
      expect(schema.properties.backgroundColor.oneOf).toBeDefined();
      expect(schema.properties.insertIndex.oneOf).toBeDefined();
    });

    it('should support flattened background properties', () => {
      const tools = handler.getTools();
      const schema = tools[0].inputSchema;
      
      expect(schema.properties.backgroundColor).toBeDefined();
      expect(schema.properties.backgroundOpacity).toBeDefined();
      expect(schema.properties.prototypeBackgroundColor).toBeDefined();
      expect(schema.properties.prototypeBackgroundOpacity).toBeDefined();
    });

    it('should support flattened guide properties', () => {
      const tools = handler.getTools();
      const schema = tools[0].inputSchema;
      
      expect(schema.properties.guideAxis).toBeDefined();
      expect(schema.properties.guideOffset).toBeDefined();
    });

    it('should include comprehensive examples', () => {
      const tools = handler.getTools();
      expect(tools[0].examples).toBeDefined();
      expect(tools[0].examples.length).toBeGreaterThan(10);
    });
  });

  describe('handle', () => {
    it('should handle list operation', async () => {
      mockSendToPlugin.mockResolvedValue({
        operation: 'list',
        document: {
          name: 'Test Document',
          id: 'doc-123',
          totalPages: 3
        },
        pages: [
          { id: 'page-1', name: 'Cover', type: 'PAGE', isPageDivider: false },
          { id: 'page-2', name: '--- Section ---', type: 'PAGE', isPageDivider: true },
          { id: 'page-3', name: 'Content', type: 'PAGE', isPageDivider: false }
        ]
      });

      const result = await handler.handle('figma_pages', {
        operation: 'list'
      });

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_PAGES',
        payload: expect.objectContaining({
          operation: 'list'
        })
      });
      // UnifiedHandler returns YAML wrapped results
      expect(result.content).toBeDefined();
      expect(result.content[0].text).toBeDefined();
      const parsedResult = yaml.load(result.content[0].text);
      expect(parsedResult.operation).toBe('list');
      expect(parsedResult).toHaveProperty('document');
      expect(parsedResult).toHaveProperty('pages');
    });

    it('should handle list operation with detail parameter', async () => {
      mockSendToPlugin.mockResolvedValue({
        operation: 'list',
        pages: []
      });

      const result = await handler.handle('figma_pages', {
        operation: 'list',
        detail: 'full'
      });

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_PAGES',
        payload: expect.objectContaining({
          operation: 'list',
          detail: 'full'
        })
      });
      // UnifiedHandler returns YAML wrapped results
      expect(result.content).toBeDefined();
      expect(result.content[0].text).toBeDefined();
      const parsedResult = yaml.load(result.content[0].text);
      expect(parsedResult.operation).toBe('list');
      expect(parsedResult).toHaveProperty('pages');
    });

    it('should handle get operation', async () => {
      mockSendToPlugin.mockResolvedValue({
        operation: 'get',
        pageId: 'page-123',
        name: 'Test Page',
        type: 'PAGE',
        isPageDivider: false,
        childrenCount: 5,
        backgrounds: [],
        current: false
      });

      const result = await handler.handle('figma_pages', {
        operation: 'get',
        pageId: 'page-123'
      });

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_PAGES',
        payload: expect.objectContaining({
          operation: 'get',
          pageId: 'page-123'
        })
      });
      // UnifiedHandler returns YAML wrapped results
      expect(result.content).toBeDefined();
      expect(result.content[0].text).toBeDefined();
      const parsedResult = yaml.load(result.content[0].text);
      expect(parsedResult.operation).toBe('get');
      expect(parsedResult.pageId).toBe('page-123');
    });

    it('should handle get_current operation', async () => {
      mockSendToPlugin.mockResolvedValue({
        operation: 'get_current',
        pageId: 'page-current',
        name: 'Current Page',
        current: true
      });

      const result = await handler.handle('figma_pages', {
        operation: 'get_current'
      });

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_PAGES',
        payload: expect.objectContaining({
          operation: 'get_current'
        })
      });
      // UnifiedHandler returns YAML wrapped results
      expect(result.content).toBeDefined();
      expect(result.content[0].text).toBeDefined();
      const parsedResult = yaml.load(result.content[0].text);
      expect(parsedResult.operation).toBe('get_current');
      expect(parsedResult.pageId).toBe('page-current');
    });

    it('should handle create operation with flattened properties', async () => {
      mockSendToPlugin.mockResolvedValue({
        operation: 'create',
        pageId: 'page-new',
        name: 'New Page',
        type: 'PAGE',
        isPageDivider: false,
        index: 2
      });

      const result = await handler.handle('figma_pages', {
        operation: 'create',
        name: 'New Page',
        backgroundColor: '#F5F5F5',
        backgroundOpacity: 0.95,
        insertIndex: 2
      });

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_PAGES',
        payload: expect.objectContaining({
          operation: 'create',
          name: 'New Page',
          backgroundColor: '#F5F5F5',
          backgroundOpacity: 0.95,
          insertIndex: 2
        })
      });
      // UnifiedHandler returns YAML wrapped results
      expect(result.content).toBeDefined();
      expect(result.content[0].text).toBeDefined();
      const parsedResult = yaml.load(result.content[0].text);
      expect(parsedResult.operation).toBe('create');
      expect(parsedResult.pageId).toBe('page-new');
    });

    it('should handle update operation', async () => {
      mockSendToPlugin.mockResolvedValue({
        operation: 'update',
        pageId: 'page-123',
        name: 'Updated Page'
      });

      const result = await handler.handle('figma_pages', {
        operation: 'update',
        pageId: 'page-123',
        name: 'Updated Page',
        backgroundColor: '#E8F4FD'
      });

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_PAGES',
        payload: expect.objectContaining({
          operation: 'update',
          pageId: 'page-123',
          name: 'Updated Page',
          backgroundColor: '#E8F4FD'
        })
      });
      // UnifiedHandler returns YAML wrapped results
      expect(result.content).toBeDefined();
      expect(result.content[0].text).toBeDefined();
      const parsedResult = yaml.load(result.content[0].text);
      expect(parsedResult.operation).toBe('update');
      expect(parsedResult.pageId).toBe('page-123');
    });

    it('should handle delete operation with required switchToPageId', async () => {
      mockSendToPlugin.mockResolvedValue({
        operation: 'delete',
        pageId: 'page-123',
        name: 'Deleted Page',
        switchedToPageId: 'page-456',
        switchedToPageName: 'Remaining Page'
      });

      const result = await handler.handle('figma_pages', {
        operation: 'delete',
        pageId: 'page-123',
        switchToPageId: 'page-456'
      });

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_PAGES',
        payload: expect.objectContaining({
          operation: 'delete',
          pageId: 'page-123',
          switchToPageId: 'page-456'
        })
      });
      // UnifiedHandler returns YAML wrapped results
      expect(result.content).toBeDefined();
      expect(result.content[0].text).toBeDefined();
      const parsedResult = yaml.load(result.content[0].text);
      expect(parsedResult.operation).toBe('delete');
      expect(parsedResult.pageId).toBe('page-123');
    });

    it('should handle duplicate operation', async () => {
      mockSendToPlugin.mockResolvedValue({
        operation: 'duplicate',
        pageId: 'page-new',
        name: 'Copy of Original',
        originalPageId: 'page-123',
        originalName: 'Original Page'
      });

      const result = await handler.handle('figma_pages', {
        operation: 'duplicate',
        pageId: 'page-123',
        name: 'Copy of Original'
      });

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_PAGES',
        payload: expect.objectContaining({
          operation: 'duplicate',
          pageId: 'page-123',
          name: 'Copy of Original'
        })
      });
      // UnifiedHandler returns YAML wrapped results
      expect(result.content).toBeDefined();
      expect(result.content[0].text).toBeDefined();
      const parsedResult = yaml.load(result.content[0].text);
      expect(parsedResult.operation).toBe('duplicate');
      expect(parsedResult.pageId).toBe('page-new');
    });

    it('should handle switch operation', async () => {
      mockSendToPlugin.mockResolvedValue({
        operation: 'switch',
        pageId: 'page-456',
        name: 'Target Page',
        previousPageId: 'page-123',
        previousPageName: 'Previous Page'
      });

      const result = await handler.handle('figma_pages', {
        operation: 'switch',
        pageId: 'page-456'
      });

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_PAGES',
        payload: expect.objectContaining({
          operation: 'switch',
          pageId: 'page-456'
        })
      });
      // UnifiedHandler returns YAML wrapped results
      expect(result.content).toBeDefined();
      expect(result.content[0].text).toBeDefined();
      const parsedResult = yaml.load(result.content[0].text);
      expect(parsedResult.operation).toBe('switch');
      expect(parsedResult.pageId).toBe('page-456');
    });

    it('should handle reorder operation', async () => {
      mockSendToPlugin.mockResolvedValue({
        operation: 'reorder',
        pageId: 'page-123',
        name: 'Reordered Page',
        currentIndex: 1,
        newIndex: 3
      });

      const result = await handler.handle('figma_pages', {
        operation: 'reorder',
        pageId: 'page-123',
        newIndex: 3
      });

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_PAGES',
        payload: expect.objectContaining({
          operation: 'reorder',
          pageId: 'page-123',
          newIndex: 3
        })
      });
      // UnifiedHandler returns YAML wrapped results
      expect(result.content).toBeDefined();
      expect(result.content[0].text).toBeDefined();
      const parsedResult = yaml.load(result.content[0].text);
      expect(parsedResult.operation).toBe('reorder');
      expect(parsedResult.pageId).toBe('page-123');
    });

    it('should handle create_divider operation', async () => {
      mockSendToPlugin.mockResolvedValue({
        operation: 'create_divider',
        pageId: 'divider-123',
        name: '--- Section ---',
        type: 'PAGE',
        isPageDivider: true,
        index: 1
      });

      const result = await handler.handle('figma_pages', {
        operation: 'create_divider',
        name: '--- Section ---',
        insertIndex: 1
      });

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_PAGES',
        payload: expect.objectContaining({
          operation: 'create_divider',
          name: '--- Section ---',
          insertIndex: 1
        })
      });
      // UnifiedHandler returns YAML wrapped results
      expect(result.content).toBeDefined();
      expect(result.content[0].text).toBeDefined();
      const parsedResult = yaml.load(result.content[0].text);
      expect(parsedResult.operation).toBe('create_divider');
      expect(parsedResult.pageId).toBe('divider-123');
    });

    it('should handle prototype background properties', async () => {
      mockSendToPlugin.mockResolvedValue({
        operation: 'create',
        pageId: 'page-123'
      });

      const result = await handler.handle('figma_pages', {
        operation: 'create',
        name: 'Prototype Page',
        prototypeBackgroundColor: '#1E1E1E',
        prototypeBackgroundOpacity: 1
      });

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_PAGES',
        payload: expect.objectContaining({
          prototypeBackgroundColor: '#1E1E1E',
          prototypeBackgroundOpacity: 1
        })
      });
      // UnifiedHandler returns YAML wrapped results
      expect(result.content).toBeDefined();
      expect(result.content[0].text).toBeDefined();
      const parsedResult = yaml.load(result.content[0].text);
      expect(parsedResult.operation).toBe('create');
      expect(parsedResult.pageId).toBe('page-123');
    });

    it('should handle guide properties', async () => {
      mockSendToPlugin.mockResolvedValue({
        operation: 'update',
        pageId: 'page-123'
      });

      const result = await handler.handle('figma_pages', {
        operation: 'update',
        pageId: 'page-123',
        guideAxis: ['x', 'y'],
        guideOffset: [100, 200]
      });

      // UnifiedHandler returns YAML wrapped results
      expect(result.content).toBeDefined();
      expect(result.content[0].text).toBeDefined();
      const parsedResult = yaml.load(result.content[0].text);
      expect(Array.isArray(parsedResult) || parsedResult.results).toBeTruthy();
      expect(mockSendToPlugin).toHaveBeenCalledTimes(2);
      expect(mockSendToPlugin).toHaveBeenNthCalledWith(1, {
        type: 'MANAGE_PAGES',
        payload: expect.objectContaining({
          operation: 'update',
          pageId: 'page-123',
          guideAxis: 'x',
          guideOffset: 100
        })
      });
      expect(mockSendToPlugin).toHaveBeenNthCalledWith(2, {
        type: 'MANAGE_PAGES',
        payload: expect.objectContaining({
          operation: 'update',
          pageId: 'page-123',
          guideAxis: 'y',
          guideOffset: 200
        })
      });
    });

    it('should handle bulk operations', async () => {
      mockSendToPlugin.mockResolvedValue({
        operation: 'update',
        pageId: 'page-123'
      });

      const result = await handler.handle('figma_pages', {
        operation: 'update',
        pageId: ['page-123', 'page-456'],
        backgroundColor: ['#F0F0F0', '#E0E0E0'],
        backgroundOpacity: [0.9, 0.8]
      });

      // UnifiedHandler returns YAML wrapped results
      expect(result.content).toBeDefined();
      expect(result.content[0].text).toBeDefined();
      const parsedResult = yaml.load(result.content[0].text);
      expect(Array.isArray(parsedResult) || parsedResult.results).toBeTruthy();
      expect(mockSendToPlugin).toHaveBeenCalledTimes(2);
    });

    it('should support case-insensitive operations', async () => {
      mockSendToPlugin.mockResolvedValue({
        operation: 'list',
        pages: []
      });

      const result = await handler.handle('figma_pages', {
        operation: 'LIST', // Uppercase
        detail: 'FULL'    // Uppercase
      });

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_PAGES',
        payload: expect.objectContaining({
          operation: 'list', // Normalized to lowercase
          detail: 'full'     // Normalized to lowercase
        })
      });
      // UnifiedHandler returns YAML wrapped results
      expect(result.content).toBeDefined();
      expect(result.content[0].text).toBeDefined();
      const parsedResult = yaml.load(result.content[0].text);
      expect(parsedResult.operation).toBe('list');
      expect(parsedResult).toHaveProperty('pages');
    });

    it('should handle failFast parameter', async () => {
      mockSendToPlugin.mockResolvedValue({
        operation: 'delete',
        pageId: 'page-123'
      });

      const result = await handler.handle('figma_pages', {
        operation: 'delete',
        pageId: ['page-123', 'page-456'],
        switchToPageId: 'page-789',
        failFast: true
      });

      // UnifiedHandler returns YAML wrapped results
      expect(result.content).toBeDefined();
      expect(result.content[0].text).toBeDefined();
      const parsedResult = yaml.load(result.content[0].text);
      expect(Array.isArray(parsedResult) || parsedResult.results).toBeTruthy();
    });

    it('should reject unknown tool names', async () => {
      await expect(
        handler.handle('unknown_tool', { operation: 'list' })
      ).rejects.toThrow('Unknown tool: unknown_tool');
    });

    it('should validate required parameters', async () => {
      await expect(
        handler.handle('figma_pages', {})
      ).rejects.toThrow();
    });
  });

  describe('Result formatting', () => {
    it('should return YAML formatted results', async () => {
      const mockResponse = {
        operation: 'list',
        document: {
          name: 'Test Document',
          totalPages: 2
        },
        pages: [
          { id: 'page-1', name: 'Page 1', type: 'PAGE' },
          { id: 'page-2', name: 'Page 2', type: 'PAGE' }
        ]
      };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      const result = await handler.handle('figma_pages', {
        operation: 'list'
      });

      // UnifiedHandler returns YAML wrapped results
      expect(result.content).toBeDefined();
      expect(result.content[0].text).toBeDefined();
      const parsedResult = yaml.load(result.content[0].text);
      expect(parsedResult.operation).toBe('list');
      expect(parsedResult).toHaveProperty('document');
      expect(parsedResult).toHaveProperty('pages');
    });
  });
});