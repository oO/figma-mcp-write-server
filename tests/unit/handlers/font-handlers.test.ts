import { FontsHandler } from '@/handlers/fonts-handler';
import { FontOperationsSchema } from '@/types/font-operations';
import { vi } from 'vitest';

describe('FontsHandler', () => {
  let fontsHandler: FontsHandler;
  let mockSendToPlugin: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockSendToPlugin = vi.fn();
    fontsHandler = new FontsHandler(mockSendToPlugin);
  });

  describe('getTools', () => {
    it('should return figma_fonts tool definition', () => {
      const tools = fontsHandler.getTools();
      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe('figma_fonts');
      expect(tools[0].description).toContain('Manage Figma fonts');
      expect(tools[0].inputSchema.properties.operation.enum).toEqual([
        'search_fonts',
        'check_availability',
        'get_missing',
        'get_font_styles',
        'validate_font',
        'get_font_info',
        'preload_fonts',
        'get_project_fonts',
        'get_font_count'
      ]);
    });
  });

  describe('manageFonts', () => {
    const mockFontResult = {
      fonts: [
        { family: 'Inter', source: 'google', styleCount: 2, availableStyles: ['Regular', 'Bold'], isLoaded: true },
        { family: 'Arial', source: 'system', styleCount: 1, availableStyles: ['Regular'], isLoaded: true }
      ],
      totalFound: 2,
      totalReturned: 2,
      hasMore: false,
      searchSummary: 'Found 2 fonts',
      searchCriteria: { appliedFilters: [], resultLimit: 20 }
    };

    beforeEach(() => {
      mockSendToPlugin.mockResolvedValue(mockFontResult);
    });

    describe('search_fonts operation', () => {
      it('should handle search_fonts with default parameters', async () => {
        const args = { operation: 'search_fonts', query: 'Inter' };
        const result = await fontsHandler.handle('figma_fonts', args);

        expect(mockSendToPlugin).toHaveBeenCalledWith({
          type: 'MANAGE_FONTS',
          payload: args
        });
        expect(result.content[0].text).toContain('fonts:');
        expect(result.isError).toBe(false);
      });

      it('should handle search_fonts with filters', async () => {
        const args = {
          operation: 'search_fonts',
          includeGoogle: true,
          includeSystem: false,
          includeCustom: false,
          query: 'Inter'
        };
        
        const result = await fontsHandler.handle('figma_fonts', args);

        expect(mockSendToPlugin).toHaveBeenCalledWith({
          type: 'MANAGE_FONTS',
          payload: args
        });
        expect(result.isError).toBe(false);
      });
    });

    describe('check_availability operation', () => {
      it('should handle check_availability with font names', async () => {
        const args = {
          operation: 'check_availability',
          fontNames: [
            { family: 'Inter', style: 'Regular' },
            { family: 'Arial', style: 'Bold' }
          ]
        };
        
        const result = await fontsHandler.handle('figma_fonts', args);

        expect(mockSendToPlugin).toHaveBeenCalledWith({
          type: 'MANAGE_FONTS',
          payload: args
        });
        expect(result.isError).toBe(false);
      });

      it('should handle check_availability with fallback suggestions', async () => {
        const args = {
          operation: 'check_availability',
          fontNames: [{ family: 'NonExistentFont', style: 'Regular' }],
          fallbackSuggestions: true
        };
        
        const result = await fontsHandler.handle('figma_fonts', args);

        expect(mockSendToPlugin).toHaveBeenCalledWith({
          type: 'MANAGE_FONTS',
          payload: args
        });
        expect(result.isError).toBe(false);
      });
    });

    describe('get_missing operation', () => {
      it('should handle get_missing operation', async () => {
        const args = { operation: 'get_missing' };
        const result = await fontsHandler.handle('figma_fonts', args);

        expect(mockSendToPlugin).toHaveBeenCalledWith({
          type: 'MANAGE_FONTS',
          payload: args
        });
        expect(result.isError).toBe(false);
      });

      it('should handle get_missing with fallback suggestions', async () => {
        const args = {
          operation: 'get_missing',
          fallbackSuggestions: true
        };
        
        const result = await fontsHandler.handle('figma_fonts', args);

        expect(mockSendToPlugin).toHaveBeenCalledWith({
          type: 'MANAGE_FONTS',
          payload: args
        });
        expect(result.isError).toBe(false);
      });
    });

    describe('get_project_fonts operation', () => {
      it('should handle get_project_fonts operation', async () => {
        const args = { operation: 'get_project_fonts' };
        const result = await fontsHandler.handle('figma_fonts', args);

        expect(mockSendToPlugin).toHaveBeenCalledWith({
          type: 'MANAGE_FONTS',
          payload: args
        });
        expect(result.isError).toBe(false);
      });
    });

    describe('get_font_count operation', () => {
      it('should handle get_font_count operation', async () => {
        const args = { operation: 'get_font_count' };
        const result = await fontsHandler.handle('figma_fonts', args);

        expect(mockSendToPlugin).toHaveBeenCalledWith({
          type: 'MANAGE_FONTS',
          payload: args
        });
        expect(result.isError).toBe(false);
      });

      it('should handle get_font_count with filters', async () => {
        const args = {
          operation: 'get_font_count',
          countSource: 'google',
          countHasStyle: 'Bold'
        };
        
        const result = await fontsHandler.handle('figma_fonts', args);

        expect(mockSendToPlugin).toHaveBeenCalledWith({
          type: 'MANAGE_FONTS',
          payload: args
        });
        expect(result.isError).toBe(false);
      });
    });

    describe('get_font_styles operation', () => {
      it('should handle get_font_styles operation', async () => {
        const args = {
          operation: 'get_font_styles',
          fontFamily: 'Inter'
        };
        
        const result = await fontsHandler.handle('figma_fonts', args);

        expect(mockSendToPlugin).toHaveBeenCalledWith({
          type: 'MANAGE_FONTS',
          payload: args
        });
        expect(result.isError).toBe(false);
      });
    });

    describe('validate_font operation', () => {
      it('should handle validate_font operation', async () => {
        const args = {
          operation: 'validate_font',
          fontFamily: 'Inter',
          fontStyle: 'Regular'
        };
        
        const result = await fontsHandler.handle('figma_fonts', args);

        expect(mockSendToPlugin).toHaveBeenCalledWith({
          type: 'MANAGE_FONTS',
          payload: args
        });
        expect(result.isError).toBe(false);
      });

      it('should handle validate_font with strict mode', async () => {
        const args = {
          operation: 'validate_font',
          fontFamily: 'Inter',
          fontStyle: 'bold',
          strict: true
        };
        
        const result = await fontsHandler.handle('figma_fonts', args);

        expect(mockSendToPlugin).toHaveBeenCalledWith({
          type: 'MANAGE_FONTS',
          payload: args
        });
        expect(result.isError).toBe(false);
      });
    });

    describe('get_font_info operation', () => {
      it('should handle get_font_info operation', async () => {
        const args = {
          operation: 'get_font_info',
          fontFamily: 'Inter',
          fontStyle: 'Bold'
        };
        
        const result = await fontsHandler.handle('figma_fonts', args);

        expect(mockSendToPlugin).toHaveBeenCalledWith({
          type: 'MANAGE_FONTS',
          payload: args
        });
        expect(result.isError).toBe(false);
      });
    });

    describe('preload_fonts operation', () => {
      it('should handle preload_fonts operation', async () => {
        const args = {
          operation: 'preload_fonts',
          fontNames: [
            { family: 'Inter', style: 'Regular' },
            { family: 'Inter', style: 'Bold' }
          ],
          priority: 'high'
        };
        
        const result = await fontsHandler.handle('figma_fonts', args);

        expect(mockSendToPlugin).toHaveBeenCalledWith({
          type: 'MANAGE_FONTS',
          payload: args
        });
        expect(result.isError).toBe(false);
      });

      it('should handle preload_fonts with count limit', async () => {
        const args = {
          operation: 'preload_fonts',
          fontNames: [
            { family: 'Inter', style: 'Regular' },
            { family: 'Inter', style: 'Bold' },
            { family: 'Inter', style: 'Medium' }
          ],
          preloadCount: 2
        };
        
        const result = await fontsHandler.handle('figma_fonts', args);

        expect(mockSendToPlugin).toHaveBeenCalledWith({
          type: 'MANAGE_FONTS',
          payload: args
        });
        expect(result.isError).toBe(false);
      });
    });

    describe('error handling', () => {
      it('should handle plugin errors gracefully', async () => {
        const error = new Error('Plugin communication failed');
        mockSendToPlugin.mockRejectedValue(error);

        const args = { operation: 'search_fonts', query: 'test' };
        
        await expect(fontsHandler.handle('figma_fonts', args)).rejects.toThrow('Font management failed: Plugin communication failed');
      });

      it('should handle validation errors', async () => {
        const args = { operation: 'invalid_operation' };
        
        await expect(fontsHandler.handle('figma_fonts', args)).rejects.toThrow();
      });
    });
  });

  describe('handle method', () => {
    it('should handle manage_fonts tool correctly', async () => {
      const mockResult = { fonts: [] };
      mockSendToPlugin.mockResolvedValue(mockResult);

      const args = { operation: 'search_fonts', query: 'Inter' };
      const result = await fontsHandler.handle('manage_fonts', args);

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain('fonts:');
    });

    it('should throw error for unknown tool', async () => {
      await expect(fontsHandler.handle('unknown_tool', {})).rejects.toThrow('Unknown tool: unknown_tool');
    });
  });

  describe('schema validation', () => {
    it('should validate correct font operations', () => {
      const validOperations = [
        { operation: 'search_fonts', query: 'Inter' },
        { operation: 'check_availability', fontNames: [{ family: 'Inter', style: 'Regular' }] },
        { operation: 'get_project_fonts' },
        { operation: 'get_font_count' },
        { operation: 'get_font_styles', fontFamily: 'Inter' },
        { operation: 'validate_font', fontFamily: 'Inter', fontStyle: 'Regular' },
        { operation: 'get_font_info', fontFamily: 'Inter', fontStyle: 'Bold' },
        { operation: 'preload_fonts', fontNames: [{ family: 'Inter', style: 'Regular' }] }
      ];

      validOperations.forEach(op => {
        expect(() => FontOperationsSchema.parse(op)).not.toThrow();
      });
    });

    it('should reject invalid operations', () => {
      const invalidOperations = [
        { operation: 'invalid_op' },
        { operation: 'get_font_styles' }, // missing fontFamily
        { operation: 'validate_font', fontFamily: 'Inter' }, // missing fontStyle
        { operation: 'check_availability' }, // missing fontNames
        { operation: 'get_font_info', fontFamily: 'Inter' }, // missing fontStyle
        { operation: 'search_fonts' } // missing search parameters
      ];

      invalidOperations.forEach(op => {
        expect(() => FontOperationsSchema.parse(op)).toThrow();
      });
    });
  });
});