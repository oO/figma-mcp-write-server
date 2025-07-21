import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TextHandler } from '../../../src/handlers/text-handler.js';
import * as yaml from 'js-yaml';

describe('TextHandler - New Operations', () => {
  let handler: TextHandler;
  let mockSendToPlugin: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockSendToPlugin = vi.fn();
    handler = new TextHandler(mockSendToPlugin);
  });

  describe('Schema Validation', () => {
    it('should include all new operations in enum', () => {
      const tools = handler.getTools();
      const schema = tools[0].inputSchema as any;
      const operations = schema.properties.operation.enum;
      
      expect(operations).toContain('create');
      expect(operations).toContain('update');
      expect(operations).toContain('get');
      expect(operations).toContain('delete');
      expect(operations).toContain('set_range');
      expect(operations).toContain('get_range');
      expect(operations).toContain('delete_range');
      expect(operations).toContain('insert_text');
      expect(operations).toContain('delete_text');
      expect(operations).toContain('search_text');
    });

    it('should have search parameters defined', () => {
      const tools = handler.getTools();
      const schema = tools[0].inputSchema as any;
      
      expect(schema.properties.searchQuery).toBeDefined();
      expect(schema.properties.searchCaseSensitive).toBeDefined();
      expect(schema.properties.searchWholeWord).toBeDefined();
      expect(schema.properties.searchMaxResults).toBeDefined();
    });

    it('should have text editing parameters defined', () => {
      const tools = handler.getTools();
      const schema = tools[0].inputSchema as any;
      
      expect(schema.properties.insertPosition).toBeDefined();
      expect(schema.properties.insertText).toBeDefined();
      expect(schema.properties.insertUseStyle).toBeDefined();
      expect(schema.properties.deleteStart).toBeDefined();
      expect(schema.properties.deleteEnd).toBeDefined();
    });

    it('should have advanced text decoration parameters defined', () => {
      const tools = handler.getTools();
      const schema = tools[0].inputSchema as any;
      
      expect(schema.properties.textDecorationStyle).toBeDefined();
      expect(schema.properties.textDecorationOffset).toBeDefined();
      expect(schema.properties.textDecorationThickness).toBeDefined();
      expect(schema.properties.textDecorationColor).toBeDefined();
      expect(schema.properties.textDecorationSkipInk).toBeDefined();
    });
  });

  describe('Range Operations', () => {
    it('should handle get_range operation', async () => {
      const params = {
        operation: 'get_range',
        nodeId: '123:456',
        rangeStart: 0,
        rangeEnd: 5
      };

      mockSendToPlugin.mockResolvedValue({
        nodeId: '123:456',
        rangeStart: 0,
        rangeEnd: 5,
        characters: 'Hello',
        fontSize: 16,
        fontName: { family: 'Arial', style: 'Regular' },
        hyperlink: { type: 'URL', value: 'https://example.com' }
      });

      const result = await handler.handle('figma_text', params);
      
      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_TEXT',
        payload: params
      });
      
      expect(result.rangeStart).toBe(0);
      expect(result.rangeEnd).toBe(5);
      expect(result.characters).toBe('Hello');
      expect(result.hyperlink).toEqual({ type: 'URL', value: 'https://example.com' });
    });

    it('should handle set_range operation with advanced text decoration', async () => {
      const params = {
        operation: 'set_range',
        nodeId: '123:456',
        rangeStart: 0,
        rangeEnd: 5,
        textDecorationStyle: 'WAVY',
        textDecorationOffset: 2,
        textDecorationThickness: 1.5,
        textDecorationColor: '#FF0000',
        textDecorationSkipInk: true
      };

      mockSendToPlugin.mockResolvedValue({
        nodeId: '123:456',
        rangeStart: 0,
        rangeEnd: 5,
        success: true
      });

      const result = await handler.handle('figma_text', params);
      
      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_TEXT',
        payload: params
      });
      
      expect(result.success).toBe(true);
    });

    it('should handle delete_range operation', async () => {
      const params = {
        operation: 'delete_range',
        nodeId: '123:456',
        rangeStart: 5,
        rangeEnd: 10
      };

      mockSendToPlugin.mockResolvedValue({
        nodeId: '123:456',
        rangeStart: 5,
        rangeEnd: 10,
        deletedText: 'world',
        newLength: 5,
        success: true
      });

      const result = await handler.handle('figma_text', params);
      
      expect(result.deletedText).toBe('world');
      expect(result.newLength).toBe(5);
    });
  });

  describe('Text Editing Operations', () => {
    it('should handle insert_text operation', async () => {
      const params = {
        operation: 'insert_text',
        nodeId: '123:456',
        insertPosition: 5,
        insertText: ' inserted',
        insertUseStyle: 'BEFORE'
      };

      mockSendToPlugin.mockResolvedValue({
        results: [{
          nodeId: '123:456',
          insertPosition: 5,
          insertText: ' inserted',
          insertUseStyle: 'BEFORE',
          newLength: 15,
          success: true
        }],
        totalNodes: 1,
        successfulNodes: 1
      });

      const result = await handler.handle('figma_text', params);
      
      expect(result.results[0].insertPosition).toBe(5);
      expect(result.results[0].insertText).toBe(' inserted');
      expect(result.results[0].newLength).toBe(15);
    });

    it('should handle delete_text operation', async () => {
      const params = {
        operation: 'delete_text',
        nodeId: '123:456',
        deleteStart: 5,
        deleteEnd: 10
      };

      mockSendToPlugin.mockResolvedValue({
        results: [{
          nodeId: '123:456',
          deleteStart: 5,
          deleteEnd: 10,
          deletedText: 'world',
          newLength: 5,
          success: true
        }],
        totalNodes: 1,
        successfulNodes: 1
      });

      const result = await handler.handle('figma_text', params);
      
      expect(result.results[0].deleteStart).toBe(5);
      expect(result.results[0].deleteEnd).toBe(10);
      expect(result.results[0].deletedText).toBe('world');
    });

    it('should handle bulk insert_text operations', async () => {
      const params = {
        operation: 'insert_text',
        nodeId: ['123:456', '123:789'],
        insertPosition: [0, 5],
        insertText: ['Hello ', 'World'],
        insertUseStyle: ['AFTER', 'BEFORE']
      };

      mockSendToPlugin.mockResolvedValue({
        results: [
          {
            nodeId: '123:456',
            insertPosition: 0,
            insertText: 'Hello ',
            newLength: 12,
            success: true
          },
          {
            nodeId: '123:789',
            insertPosition: 5,
            insertText: 'World',
            newLength: 10,
            success: true
          }
        ],
        totalNodes: 2,
        successfulNodes: 2
      });

      const result = await handler.handle('figma_text', params);
      
      expect(result.results).toHaveLength(2);
      expect(result.totalNodes).toBe(2);
      expect(result.successfulNodes).toBe(2);
    });
  });

  describe('Search Operations', () => {
    it('should handle search_text operation with nodeId', async () => {
      const params = {
        operation: 'search_text',
        nodeId: '123:456',
        searchQuery: 'hello',
        searchCaseSensitive: false,
        searchWholeWord: false,
        searchMaxResults: 10
      };

      mockSendToPlugin.mockResolvedValue({
        results: [{
          nodeId: '123:456',
          searchQuery: 'hello',
          textLength: 20,
          matches: [
            { rangeStart: 0, rangeEnd: 5, match: 'hello' },
            { rangeStart: 10, rangeEnd: 15, match: 'hello' }
          ],
          matchCount: 2,
          caseSensitive: false,
          wholeWord: false,
          success: true
        }],
        totalNodes: 1,
        successfulNodes: 1
      });

      const result = await handler.handle('figma_text', params);
      
      expect(result.results[0].matches).toHaveLength(2);
      expect(result.results[0].matches[0].rangeStart).toBe(0);
      expect(result.results[0].matches[0].rangeEnd).toBe(5);
      expect(result.results[0].matchCount).toBe(2);
    });

    it('should handle global search_text operation without nodeId', async () => {
      const params = {
        operation: 'search_text',
        searchQuery: 'hello',
        searchCaseSensitive: true,
        searchMaxResults: 50
      };

      mockSendToPlugin.mockResolvedValue({
        operation: 'search_text',
        searchQuery: 'hello',
        results: [
          {
            nodeId: '123:456',
            nodeName: 'Button Text',
            textLength: 20,
            matches: [{ rangeStart: 0, rangeEnd: 5, match: 'hello' }],
            matchCount: 1,
            success: true
          },
          {
            nodeId: '123:789',
            nodeName: 'Header',
            textLength: 30,
            matches: [{ rangeStart: 10, rangeEnd: 15, match: 'hello' }],
            matchCount: 1,
            success: true
          }
        ],
        totalNodes: 25,
        successfulNodes: 2,
        totalMatches: 2,
        caseSensitive: true,
        wholeWord: false,
        maxResults: 50
      });

      const result = await handler.handle('figma_text', params);
      
      expect(result.totalNodes).toBe(25);
      expect(result.totalMatches).toBe(2);
      expect(result.results).toHaveLength(2);
      expect(result.results[0].nodeName).toBe('Button Text');
      expect(result.results[1].nodeName).toBe('Header');
    });

    it('should handle search_text with case sensitivity and whole word options', async () => {
      const params = {
        operation: 'search_text',
        nodeId: '123:456',
        searchQuery: 'Hello',
        searchCaseSensitive: true,
        searchWholeWord: true,
        searchMaxResults: 5
      };

      mockSendToPlugin.mockResolvedValue({
        results: [{
          nodeId: '123:456',
          searchQuery: 'Hello',
          matches: [{ rangeStart: 0, rangeEnd: 5, match: 'Hello' }],
          matchCount: 1,
          caseSensitive: true,
          wholeWord: true,
          success: true
        }],
        totalNodes: 1,
        successfulNodes: 1
      });

      const result = await handler.handle('figma_text', params);
      
      expect(result.results[0].caseSensitive).toBe(true);
      expect(result.results[0].wholeWord).toBe(true);
    });

    it('should handle bulk search_text operations', async () => {
      const params = {
        operation: 'search_text',
        nodeId: ['123:456', '123:789'],
        searchQuery: ['hello', 'world'],
        searchCaseSensitive: [false, true],
        searchMaxResults: [10, 5]
      };

      mockSendToPlugin.mockResolvedValue({
        results: [
          {
            nodeId: '123:456',
            searchQuery: 'hello',
            matches: [{ rangeStart: 0, rangeEnd: 5, match: 'hello' }],
            matchCount: 1,
            success: true
          },
          {
            nodeId: '123:789',
            searchQuery: 'world',
            matches: [{ rangeStart: 6, rangeEnd: 11, match: 'world' }],
            matchCount: 1,
            success: true
          }
        ],
        totalNodes: 2,
        successfulNodes: 2
      });

      const result = await handler.handle('figma_text', params);
      
      expect(result.results).toHaveLength(2);
      expect(result.results[0].searchQuery).toBe('hello');
      expect(result.results[1].searchQuery).toBe('world');
    });
  });

  describe('Error Handling', () => {
    it('should handle plugin errors gracefully', async () => {
      const params = {
        operation: 'search_text',
        nodeId: 'nonexistent',
        searchQuery: 'hello'
      };

      mockSendToPlugin.mockRejectedValue(new Error('Node not found: nonexistent'));

      await expect(handler.handle('figma_text', params)).rejects.toThrow('Node not found: nonexistent');
    });

    it('should handle invalid range parameters', async () => {
      const params = {
        operation: 'get_range',
        nodeId: '123:456',
        rangeStart: 10,
        rangeEnd: 5  // Invalid: end before start
      };

      mockSendToPlugin.mockRejectedValue(new Error('Invalid character range: 10-5'));

      await expect(handler.handle('figma_text', params)).rejects.toThrow('Invalid character range: 10-5');
    });

    it('should handle bulk operations with failFast=false', async () => {
      const params = {
        operation: 'insert_text',
        nodeId: ['123:456', 'invalid', '123:789'],
        insertPosition: [0, 0, 0],
        insertText: ['Hello', 'World', 'Test'],
        failFast: false
      };

      mockSendToPlugin.mockResolvedValue({
        results: [
          { nodeId: '123:456', success: true, newLength: 10 },
          { nodeId: 'invalid', success: false, error: 'Node not found: invalid' },
          { nodeId: '123:789', success: true, newLength: 8 }
        ],
        totalNodes: 3,
        successfulNodes: 2
      });

      const result = await handler.handle('figma_text', params);
      
      expect(result.totalNodes).toBe(3);
      expect(result.successfulNodes).toBe(2);
      expect(result.results[1].success).toBe(false);
    });
  });

  describe('Integration Tests', () => {
    it('should work with YAML response format', async () => {
      const params = {
        operation: 'search_text',
        searchQuery: 'hello'
      };

      const mockResponse = {
        operation: 'search_text',
        searchQuery: 'hello',
        results: [
          {
            nodeId: '123:456',
            matches: [{ rangeStart: 0, rangeEnd: 5, match: 'hello' }],
            matchCount: 1
          }
        ],
        totalNodes: 1,
        totalMatches: 1
      };

      mockSendToPlugin.mockResolvedValue(mockResponse);

      const result = await handler.handle('figma_text', params);
      
      // Verify the result can be serialized to YAML
      const yamlString = yaml.dump(result);
      expect(yamlString).toContain('operation: search_text');
      expect(yamlString).toContain('searchQuery: hello');
      expect(yamlString).toContain('rangeStart: 0');
      expect(yamlString).toContain('rangeEnd: 5');
    });
  });
});