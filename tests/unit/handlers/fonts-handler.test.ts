import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FontsHandler } from '../../../src/handlers/fonts-handler';
import * as yaml from 'js-yaml';

describe('FontsHandler', () => {
  let handler: FontsHandler;
  let mockSendToPlugin: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockSendToPlugin = vi.fn();
    handler = new FontsHandler(mockSendToPlugin);
  });

  describe('getTools', () => {
    it('should return figma_fonts tool', () => {
      const tools = handler.getTools();
      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe('figma_fonts');
      expect(tools[0].description).toContain('font');
    });

    it('should support font operations', () => {
      const tools = handler.getTools();
      const schema = tools[0].inputSchema;
      const operations = schema.properties.operation.enum;
      
      expect(operations).toContain('search_fonts');
      expect(operations).toContain('check_availability');
      expect(operations).toContain('get_missing');
      expect(operations).toContain('get_font_styles');
      expect(operations).toContain('validate_font');
      expect(operations).toContain('get_font_info');
      expect(operations).toContain('preload_fonts');
      expect(operations).toContain('get_project_fonts');
      expect(operations).toContain('get_font_count');
    });

    it('should support font search parameters', () => {
      const tools = handler.getTools();
      const schema = tools[0].inputSchema;
      
      expect(schema.properties.query).toBeDefined();
      expect(schema.properties.source).toBeDefined();
      expect(schema.properties.includeGoogle).toBeDefined();
      expect(schema.properties.includeSystem).toBeDefined();
      expect(schema.properties.includeCustom).toBeDefined();
    });

    it('should support font family parameter', () => {
      const tools = handler.getTools();
      const schema = tools[0].inputSchema;
      
      expect(schema.properties.fontFamily).toBeDefined();
      expect(schema.properties.fontFamily.oneOf).toBeDefined();
    });
  });

  describe('handle', () => {
    it('should handle search_fonts operation', async () => {
      mockSendToPlugin.mockResolvedValue({
        success: true,
        data: {
          fonts: [
            { family: 'Arial', styles: ['Regular', 'Bold'] },
            { family: 'Helvetica', styles: ['Regular', 'Bold', 'Italic'] }
          ]
        }
      });

      const result = await handler.handle('figma_fonts', {
        operation: 'search_fonts',
        query: 'Arial'
      });

      expect(result.isError).toBe(false);
      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_FONTS',
        payload: {
          operation: 'search_fonts',
          query: 'Arial'
        }
      });
    });

    it('should handle check_availability operation', async () => {
      mockSendToPlugin.mockResolvedValue({
        success: true,
        data: {
          available: true,
          source: 'google'
        }
      });

      const result = await handler.handle('figma_fonts', {
        operation: 'check_availability',
        fontFamily: 'Roboto',
        fontStyle: 'Regular'
      });

      expect(result.isError).toBe(false);
      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_FONTS',
        payload: {
          operation: 'check_availability',
          fontFamily: 'Roboto',
          fontStyle: 'Regular'
        }
      });
    });

    it('should handle get_missing operation', async () => {
      mockSendToPlugin.mockResolvedValue({
        success: true,
        data: {
          missingFonts: [
            { family: 'CustomFont', style: 'Bold' }
          ]
        }
      });

      const result = await handler.handle('figma_fonts', {
        operation: 'get_missing'
      });

      expect(result.isError).toBe(false);
      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_FONTS',
        payload: {
          operation: 'get_missing'
        }
      });
    });

    it('should handle get_font_styles operation', async () => {
      mockSendToPlugin.mockResolvedValue({
        success: true,
        data: {
          styles: ['Regular', 'Bold', 'Italic', 'Bold Italic']
        }
      });

      const result = await handler.handle('figma_fonts', {
        operation: 'get_font_styles',
        fontFamily: 'Helvetica'
      });

      expect(result.isError).toBe(false);
      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_FONTS',
        payload: {
          operation: 'get_font_styles',
          fontFamily: 'Helvetica'
        }
      });
    });

    it('should handle validate_font operation', async () => {
      mockSendToPlugin.mockResolvedValue({
        success: true,
        data: {
          valid: true,
          available: true,
          source: 'system'
        }
      });

      const result = await handler.handle('figma_fonts', {
        operation: 'validate_font',
        fontFamily: 'Arial',
        fontStyle: 'Bold'
      });

      expect(result.isError).toBe(false);
      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_FONTS',
        payload: {
          operation: 'validate_font',
          fontFamily: 'Arial',
          fontStyle: 'Bold'
        }
      });
    });

    it('should handle get_font_info operation', async () => {
      mockSendToPlugin.mockResolvedValue({
        success: true,
        data: {
          family: 'Roboto',
          styles: ['Regular', 'Bold', 'Italic'],
          source: 'google',
          category: 'sans-serif'
        }
      });

      const result = await handler.handle('figma_fonts', {
        operation: 'get_font_info',
        fontFamily: 'Roboto',
        fontStyle: 'Regular'
      });

      expect(result.isError).toBe(false);
      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_FONTS',
        payload: {
          operation: 'get_font_info',
          fontFamily: 'Roboto',
          fontStyle: 'Regular'
        }
      });
    });

    it('should handle preload_fonts operation', async () => {
      mockSendToPlugin.mockResolvedValue({
        success: true,
        data: {
          preloaded: ['Roboto:Regular', 'Roboto:Bold']
        }
      });

      const result = await handler.handle('figma_fonts', {
        operation: 'preload_fonts',
        fontFamily: ['Roboto', 'Open Sans'],
        fontStyle: ['Regular', 'Bold']
      });

      expect(result.isError).toBe(false);
      expect(mockSendToPlugin).toHaveBeenCalledTimes(2);
      
      // Should call with individual font families and styles
      expect(mockSendToPlugin).toHaveBeenNthCalledWith(1, {
        type: 'MANAGE_FONTS',
        payload: {
          operation: 'preload_fonts',
          fontFamily: 'Roboto',
          fontStyle: 'Regular'
        }
      });
      
      expect(mockSendToPlugin).toHaveBeenNthCalledWith(2, {
        type: 'MANAGE_FONTS',
        payload: {
          operation: 'preload_fonts',
          fontFamily: 'Open Sans',
          fontStyle: 'Bold'
        }
      });
    });

    it('should handle get_project_fonts operation', async () => {
      mockSendToPlugin.mockResolvedValue({
        success: true,
        data: {
          usedFonts: [
            { family: 'Inter', style: 'Regular' },
            { family: 'Inter', style: 'Bold' }
          ]
        }
      });

      const result = await handler.handle('figma_fonts', {
        operation: 'get_project_fonts'
      });

      expect(result.isError).toBe(false);
      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_FONTS',
        payload: {
          operation: 'get_project_fonts'
        }
      });
    });

    it('should handle get_font_count operation', async () => {
      mockSendToPlugin.mockResolvedValue({
        success: true,
        data: {
          totalFonts: 42,
          uniqueFamilies: 15
        }
      });

      const result = await handler.handle('figma_fonts', {
        operation: 'get_font_count'
      });

      expect(result.isError).toBe(false);
      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_FONTS',
        payload: {
          operation: 'get_font_count'
        }
      });
    });

    it('should handle search with filters', async () => {
      mockSendToPlugin.mockResolvedValue({
        success: true,
        data: {
          fonts: [
            { family: 'Roboto', styles: ['Regular', 'Bold'] }
          ]
        }
      });

      const result = await handler.handle('figma_fonts', {
        operation: 'search_fonts',
        query: 'Roboto',
        source: 'google',
        includeGoogle: true,
        includeSystem: false,
        hasStyle: 'Bold',
        limit: 10
      });

      expect(result.isError).toBe(false);
      expect(mockSendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_FONTS',
        payload: {
          operation: 'search_fonts',
          query: 'Roboto',
          source: 'google',
          includeGoogle: true,
          includeSystem: false,
          hasStyle: 'Bold',
          limit: 10
        }
      });
    });

    it('should handle bulk font families', async () => {
      mockSendToPlugin.mockResolvedValue({
        success: true,
        data: {
          results: [
            { family: 'Arial', available: true },
            { family: 'Helvetica', available: true }
          ]
        }
      });

      const result = await handler.handle('figma_fonts', {
        operation: 'check_availability',
        fontFamily: ['Arial', 'Helvetica'],
        fontStyle: ['Regular', 'Bold']
      });

      expect(result.isError).toBe(false);
      expect(mockSendToPlugin).toHaveBeenCalledTimes(2);
      
      // Should call with individual font families and styles
      expect(mockSendToPlugin).toHaveBeenNthCalledWith(1, {
        type: 'MANAGE_FONTS',
        payload: {
          operation: 'check_availability',
          fontFamily: 'Arial',
          fontStyle: 'Regular'
        }
      });
      
      expect(mockSendToPlugin).toHaveBeenNthCalledWith(2, {
        type: 'MANAGE_FONTS',
        payload: {
          operation: 'check_availability',
          fontFamily: 'Helvetica',
          fontStyle: 'Bold'
        }
      });
    });

    it('should reject unknown tool names', async () => {
      await expect(
        handler.handle('unknown_tool', { operation: 'search_fonts' })
      ).rejects.toThrow('Unknown tool: unknown_tool');
    });

    it('should validate required parameters', async () => {
      await expect(
        handler.handle('figma_fonts', {})
      ).rejects.toThrow();
    });

    it('should validate operation enum values', async () => {
      await expect(
        handler.handle('figma_fonts', { operation: 'invalid_operation' })
      ).rejects.toThrow();
    });
  });

  describe('Result formatting', () => {
    it('should return YAML formatted results', async () => {
      const mockResponse = {
        success: true,
        data: {
          fonts: [
            { family: 'Arial', styles: ['Regular', 'Bold'] }
          ]
        }
      };
      mockSendToPlugin.mockResolvedValue(mockResponse);

      const result = await handler.handle('figma_fonts', {
        operation: 'search_fonts',
        query: 'Arial'
      });

      expect(result.isError).toBe(false);
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      
      // Should be valid YAML
      const parsedResult = yaml.load(result.content[0].text);
      expect(parsedResult).toHaveProperty('fonts');
    });
  });
});