import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TextHandler } from '../../../src/handlers/text-handler';

describe('TextHandler', () => {
  let handler: TextHandler;
  let mockSendToPlugin: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockSendToPlugin = vi.fn();
    handler = new TextHandler(mockSendToPlugin);
  });

  describe('getTools', () => {
    it('should return figma_text tool', () => {
      const tools = handler.getTools();
      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe('figma_text');
      expect(tools[0].description).toContain('text nodes with advanced typography');
    });

    it('should support text operations', () => {
      const tools = handler.getTools();
      const schema = tools[0].inputSchema;
      const operations = schema.properties.operation.enum;
      
      expect(operations).toContain('create');
      expect(operations).toContain('update');
      expect(operations).toContain('get_content');
      expect(operations).toContain('set_formatting');
      expect(operations).toContain('character_styling');
    });

    it('should support bulk operations for text parameters', () => {
      const tools = handler.getTools();
      const schema = tools[0].inputSchema;
      
      expect(schema.properties.characters.oneOf).toBeDefined();
      expect(schema.properties.fontSize.oneOf).toBeDefined();
      expect(schema.properties.fontFamily.oneOf).toBeDefined();
    });
  });

  describe('handle', () => {
    it('should handle create text operation', async () => {
      mockSendToPlugin.mockResolvedValue({
        success: true,
        data: { 
          id: '123:456',
          characters: 'Hello World',
          type: 'TEXT'
        }
      });

      const result = await handler.handle('figma_text', {
        operation: 'create',
        characters: 'Hello World',
        fontSize: 24,
        fontFamily: 'Inter',
        fontStyle: 'Bold'
      });

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_TEXT',
        payload: expect.objectContaining({
          operation: 'create',
          characters: 'Hello World',
          fontSize: 24
        })
      });
      expect(result.isError).toBe(false);
    });

    it('should handle update text operation', async () => {
      mockSendToPlugin.mockResolvedValue({
        success: true,
        data: { id: '123:456' }
      });

      const result = await handler.handle('figma_text', {
        operation: 'update',
        nodeId: '123:456',
        characters: 'Updated text',
        fillColor: '#FF0000'
      });

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_TEXT',
        payload: expect.objectContaining({
          operation: 'update',
          nodeId: '123:456',
          characters: 'Updated text'
        })
      });
    });

    it('should handle character styling operation', async () => {
      mockSendToPlugin.mockResolvedValue({
        success: true,
        data: { styled: true }
      });

      const result = await handler.handle('figma_text', {
        operation: 'character_styling',
        nodeId: '123:456',
        rangeStart: 0,
        rangeEnd: 5,
        rangeFontSize: 20,
        rangeTextDecoration: 'UNDERLINE'
      });

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_TEXT',
        payload: expect.objectContaining({
          operation: 'character_styling',
          nodeId: '123:456',
          rangeStart: 0,
          rangeEnd: 5
        })
      });
    });

    it('should handle text formatting operation', async () => {
      mockSendToPlugin.mockResolvedValue({
        success: true,
        data: { formatted: true }
      });

      const result = await handler.handle('figma_text', {
        operation: 'set_formatting',
        nodeId: '123:456',
        textAlignHorizontal: 'CENTER',
        letterSpacing: 2,
        lineHeight: 24
      });

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_TEXT',
        payload: expect.objectContaining({
          operation: 'set_formatting',
          textAlignHorizontal: 'CENTER'
        })
      });
    });

    it('should handle get content operation', async () => {
      mockSendToPlugin.mockResolvedValue({
        success: true,
        data: { 
          characters: 'Hello World',
          fontSize: 16,
          fontFamily: 'Inter'
        }
      });

      const result = await handler.handle('figma_text', {
        operation: 'get_content',
        nodeId: '123:456'
      });

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_TEXT',
        payload: expect.objectContaining({
          operation: 'get_content',
          nodeId: '123:456'
        })
      });
    });

    it('should handle bulk text creation', async () => {
      mockSendToPlugin.mockResolvedValue({
        success: true,
        data: {
          results: [
            { characters: 'Text 1', success: true },
            { characters: 'Text 2', success: true }
          ]
        }
      });

      const result = await handler.handle('figma_text', {
        operation: 'create',
        characters: ['Text 1', 'Text 2'],
        fontSize: [24, 18],
        fillColor: ['#FF0000', '#00FF00']
      });

      expect(result.isError).toBe(false);
    });

    it('should handle text auto-resize and truncation', async () => {
      mockSendToPlugin.mockResolvedValue({
        success: true,
        data: { id: '123:456' }
      });

      const result = await handler.handle('figma_text', {
        operation: 'create',
        characters: 'Long text that needs truncation',
        width: 150,
        textAutoResize: 'NONE',
        textTruncation: 'ENDING',
        maxLines: 3
      });

      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_TEXT',
        payload: expect.objectContaining({
          textTruncation: 'ENDING',
          maxLines: 3
        })
      });
    });

    it('should reject unknown tool names', async () => {
      await expect(
        handler.handle('unknown_tool', { operation: 'create' })
      ).rejects.toThrow('Unknown tool: unknown_tool');
    });
  });
});