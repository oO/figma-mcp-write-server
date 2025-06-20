import { describe, it, expect, beforeAll } from '@jest/globals';
import { FontHandlers } from '../../src/handlers/font-handlers.js';

describe('Font Management Integration Tests', () => {
  let fontHandlers: FontHandlers;
  let sendToPlugin: jest.Mock;

  beforeAll(() => {
    // Create send function with mock responses
    sendToPlugin = jest.fn().mockImplementation(async (request) => {
      const { type, payload } = request;
      
      if (type === 'MANAGE_FONTS') {
        return mockFontResponses(payload);
      }
      
      throw new Error(`Unexpected request type: ${type}`);
    });

    fontHandlers = new FontHandlers(sendToPlugin);
  });

  function mockFontResponses(payload: any) {
    const { operation } = payload;
    
    switch (operation) {
      case 'search_fonts':
        return {
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
        
      case 'check_availability':
        return {
          results: payload.fontNames.map((font: any) => ({
            family: font.family,
            style: font.style,
            status: font.family === 'NonExistentFont' ? 'missing' : 'available',
            category: font.family === 'Inter' ? 'google' : 'system'
          }))
        };
        
      case 'get_project_fonts':
        return {
          fonts: [
            { family: 'Inter', source: 'google', styleCount: 2, availableStyles: ['Regular', 'Bold'], isLoaded: true },
            { family: 'Arial', source: 'system', styleCount: 2, availableStyles: ['Regular', 'Bold'], isLoaded: true }
          ],
          totalUsed: 2,
          summary: 'Using 2 font families in project'
        };
        
      case 'get_font_styles':
        return {
          styles: payload.fontFamily === 'Inter' ? ['Regular', 'Medium', 'Bold'] : ['Regular', 'Bold']
        };
        
      case 'get_font_count':
        return {
          count: payload.countSource === 'google' ? 50 : 25,
          source: payload.countSource,
          hasStyle: payload.countHasStyle,
          summary: `Found ${payload.countSource === 'google' ? 50 : 25} fonts`
        };
        
      case 'validate_font':
        return {
          isValid: payload.fontFamily !== 'InvalidFont',
          fontName: { family: payload.fontFamily, style: payload.fontStyle },
          status: payload.fontFamily !== 'InvalidFont' ? 'available' : 'missing'
        };
        
      case 'get_font_info':
        return {
          family: payload.fontFamily,
          style: payload.fontStyle,
          status: 'available',
          category: 'google',
          metadata: { fullName: `${payload.fontFamily} ${payload.fontStyle}` }
        };
        
      case 'preload_fonts':
        return {
          preloaded: payload.fontNames || [],
          failed: [],
          priority: payload.priority || 'normal'
        };
        
      default:
        throw new Error(`Unknown font operation: ${operation}`);
    }
  }

  describe('Font Operations', () => {
    it('should handle search_fonts operation', async () => {
      const result = await fontHandlers.manageFonts({ 
        operation: 'search_fonts',
        query: 'Inter'
      });
      
      expect(result.content).toBeDefined();
      expect(result.content[0].text).toContain('fonts:');
      expect(result.isError).toBe(false);
      
      expect(sendToPlugin).toHaveBeenCalledWith({
        type: 'MANAGE_FONTS',
        payload: { operation: 'search_fonts', query: 'Inter' }
      });
    });

    it('should handle check_availability operation', async () => {
      const result = await fontHandlers.manageFonts({ 
        operation: 'check_availability',
        fontNames: [
          { family: 'Inter', style: 'Regular' },
          { family: 'NonExistentFont', style: 'Regular' }
        ]
      });
      
      expect(result.content).toBeDefined();
      expect(result.isError).toBe(false);
    });

    it('should handle get_project_fonts operation', async () => {
      const result = await fontHandlers.manageFonts({ operation: 'get_project_fonts' });
      
      expect(result.content).toBeDefined();
      expect(result.isError).toBe(false);
    });

    it('should handle get_font_count operation', async () => {
      const result = await fontHandlers.manageFonts({ 
        operation: 'get_font_count',
        countSource: 'google'
      });
      
      expect(result.content).toBeDefined();
      expect(result.isError).toBe(false);
    });

    it('should handle get_font_styles operation', async () => {
      const result = await fontHandlers.manageFonts({ 
        operation: 'get_font_styles',
        fontFamily: 'Inter'
      });
      
      expect(result.content).toBeDefined();
      expect(result.isError).toBe(false);
    });

    it('should handle validate_font operation', async () => {
      const result = await fontHandlers.manageFonts({ 
        operation: 'validate_font',
        fontFamily: 'Inter',
        fontStyle: 'Bold'
      });
      
      expect(result.content).toBeDefined();
      expect(result.isError).toBe(false);
    });

    it('should handle get_font_info operation', async () => {
      const result = await fontHandlers.manageFonts({ 
        operation: 'get_font_info',
        fontFamily: 'Inter',
        fontStyle: 'Bold'
      });
      
      expect(result.content).toBeDefined();
      expect(result.isError).toBe(false);
    });

    it('should handle preload_fonts operation', async () => {
      const result = await fontHandlers.manageFonts({ 
        operation: 'preload_fonts',
        fontNames: [
          { family: 'Inter', style: 'Regular' },
          { family: 'Inter', style: 'Bold' }
        ]
      });
      
      expect(result.content).toBeDefined();
      expect(result.isError).toBe(false);
    });

    it('should handle get_missing operation', async () => {
      // Add missing operation to mock
      sendToPlugin.mockImplementationOnce(async (request) => {
        if (request.type === 'MANAGE_FONTS' && request.payload.operation === 'get_missing') {
          return { missingFonts: [] };
        }
        throw new Error(`Unexpected request`);
      });

      const result = await fontHandlers.manageFonts({ operation: 'get_missing' });
      
      expect(result.content).toBeDefined();
      expect(result.isError).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle plugin errors gracefully', async () => {
      sendToPlugin.mockRejectedValueOnce(new Error('Plugin communication failed'));

      await expect(fontHandlers.manageFonts({ operation: 'search_fonts', query: 'test' }))
        .rejects.toThrow('Font management failed: Plugin communication failed');
    });

    it('should handle validation errors', async () => {
      await expect(fontHandlers.manageFonts({ operation: 'invalid_operation' as any }))
        .rejects.toThrow();
    });
  });
});